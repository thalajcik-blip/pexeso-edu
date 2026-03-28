import { create } from 'zustand'
import { supabase } from '../services/supabase'
import { useAuthStore } from './authStore'
import type {
  ClassWithStudentCount,
  ClassMemberWithProfile,
  AssignmentWithDeck,
} from '../types/classroom'

// Charset without 0/O/1/I to avoid confusion
const INVITE_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateInviteCode(): string {
  const arr = new Uint8Array(4)
  crypto.getRandomValues(arr)
  const chars = Array.from(arr).map(b => INVITE_CHARSET[b % INVITE_CHARSET.length]).join('')
  return `PX-${chars}`
}

interface ClassroomStore {
  classes: ClassWithStudentCount[]
  currentClassId: string | null
  members: ClassMemberWithProfile[]
  assignments: AssignmentWithDeck[]
  loading: boolean

  fetchClasses: () => Promise<void>
  createClass: (name: string) => Promise<{ error: string } | { inviteCode: string }>
  fetchClassDetail: (classId: string) => Promise<void>
  assignDeck: (classId: string, setSlug: string | null, customDeckId: string | null) => Promise<string | null>
  removeAssignment: (assignmentId: string) => Promise<string | null>
  clearCurrentClass: () => void
}

export const useClassroomStore = create<ClassroomStore>((set, get) => ({
  classes: [],
  currentClassId: null,
  members: [],
  assignments: [],
  loading: false,

  fetchClasses: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    set({ loading: true })
    try {
      // Fetch classes with student count and last activity
      const { data: classRows, error } = await supabase
        .from('classes')
        .select('*, class_members(last_active_at)')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('fetchClasses error:', error)
        return
      }

      const classes: ClassWithStudentCount[] = (classRows ?? []).map((row: Record<string, unknown>) => {
        const membersData = row.class_members as Array<{ last_active_at?: string | null }> | null
        const studentCount = Array.isArray(membersData) ? membersData.length : 0
        // Find the max last_active_at across all members
        let lastActivity: string | null = null
        if (Array.isArray(membersData)) {
          for (const m of membersData) {
            if (m.last_active_at) {
              if (!lastActivity || m.last_active_at > lastActivity) {
                lastActivity = m.last_active_at
              }
            }
          }
        }
        return {
          id: row.id as string,
          teacher_id: row.teacher_id as string,
          name: row.name as string,
          invite_code: row.invite_code as string,
          gdpr_confirmed_at: row.gdpr_confirmed_at as string,
          created_at: row.created_at as string,
          student_count: Number(studentCount),
          last_activity: lastActivity,
        }
      })
      set({ classes })
    } finally {
      set({ loading: false })
    }
  },

  createClass: async (name: string) => {
    const user = useAuthStore.getState().user
    if (!user) return { error: 'Nie si prihlásený' }

    const MAX_RETRIES = 3
    let lastError: string | null = null

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const invite_code = generateInviteCode()
      const { error } = await supabase.from('classes').insert({
        teacher_id: user.id,
        name: name.trim(),
        invite_code,
        gdpr_confirmed_at: new Date().toISOString(),
      })

      if (!error) {
        await get().fetchClasses()
        return { inviteCode: invite_code }
      }

      // 23505 = unique_violation — retry with a new code
      if (error.code === '23505') {
        lastError = 'Invite code conflict, retrying...'
        continue
      }

      return { error: error.message }
    }

    return { error: lastError ?? 'Failed to create class after multiple attempts' }
  },

  fetchClassDetail: async (classId: string) => {
    set({ loading: true, currentClassId: classId, members: [], assignments: [] })
    try {
      // Fetch members with profile data
      const { data: memberRows, error: membersError } = await supabase
        .from('class_members')
        .select('*, profiles(username, avatar_id)')
        .eq('class_id', classId)
        .order('joined_at', { ascending: true })

      if (membersError) {
        console.error('fetchClassDetail members error:', membersError)
      }

      type MemberRow = {
        id: string
        class_id: string
        user_id: string
        joined_at: string
        last_active_at: string | null
        profiles: { username: string | null; avatar_id: number } | null
      }

      const members: ClassMemberWithProfile[] = (memberRows ?? []).map((m: MemberRow) => ({
        id: m.id,
        class_id: m.class_id,
        user_id: m.user_id,
        joined_at: m.joined_at,
        last_active_at: m.last_active_at,
        username: m.profiles?.username ?? null,
        avatar_id: m.profiles?.avatar_id ?? 0,
      }))

      // Fetch assignments
      const { data: assignmentRows, error: assignmentsError } = await supabase
        .from('class_assignments')
        .select('*')
        .eq('class_id', classId)
        .order('assigned_at', { ascending: false })

      if (assignmentsError) {
        console.error('fetchClassDetail assignments error:', assignmentsError)
      }

      type AssignmentRow = {
        id: string
        class_id: string
        set_slug: string | null
        custom_deck_id: string | null
        assigned_at: string
      }

      // For custom decks, fetch titles separately if needed
      const assignments: AssignmentWithDeck[] = await Promise.all(
        (assignmentRows ?? []).map(async (a: AssignmentRow) => {
          let deck_title: string | null = null
          if (a.custom_deck_id) {
            const { data } = await supabase
              .from('custom_decks')
              .select('title')
              .eq('id', a.custom_deck_id)
              .single()
            deck_title = data?.title ?? null
          } else if (a.set_slug) {
            deck_title = a.set_slug
          }
          return {
            id: a.id,
            class_id: a.class_id,
            set_slug: a.set_slug,
            custom_deck_id: a.custom_deck_id,
            assigned_at: a.assigned_at,
            deck_title,
          }
        })
      )

      set({ members, assignments })
    } finally {
      set({ loading: false })
    }
  },

  assignDeck: async (classId: string, setSlug: string | null, customDeckId: string | null) => {
    const { error } = await supabase.from('class_assignments').insert({
      class_id: classId,
      set_slug: setSlug,
      custom_deck_id: customDeckId,
    })
    if (error) return error.message
    await get().fetchClassDetail(classId)
    return null
  },

  removeAssignment: async (assignmentId: string) => {
    const { currentClassId } = get()
    const { error } = await supabase
      .from('class_assignments')
      .delete()
      .eq('id', assignmentId)
    if (error) return error.message
    if (currentClassId) await get().fetchClassDetail(currentClassId)
    return null
  },

  clearCurrentClass: () => {
    set({ currentClassId: null, members: [], assignments: [] })
  },
}))
