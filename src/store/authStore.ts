import { create } from 'zustand'
import { supabase } from '../services/supabase'
import type { User } from '@supabase/supabase-js'

export interface Profile {
  id: string
  username: string | null
  avatar_id: number
  xp: number
  level: number
  locale: string
  show_stats: boolean
  show_favorites: boolean
  show_activity: boolean
  created_at: string
  roles: string[]
  teacher_request_status: string | null
  is_minor: boolean
}

export const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000]

export function getLevel(xp: number): number {
  let level = 1
  for (let i = 0; i < LEVEL_XP.length; i++) {
    if (xp >= LEVEL_XP[i]) level = i + 1
  }
  return Math.min(level, LEVEL_XP.length)
}

interface AuthStore {
  user: User | null
  profile: Profile | null
  isLoading: boolean
  isOnboarding: boolean
  showIntentScreen: boolean
  registrationType: 'player' | 'pending_teacher' | null
  teacherFormData: { school: string; reason: string } | null
  showTeacherPendingModal: boolean
  showContextModal: boolean
  authModalOpen: boolean
  authModalTab: 'login' | 'register'
  settingsModalOpen: boolean
  dashboardModalOpen: boolean

  _setUser: (user: User | null) => void

  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<string | null>
  signUpWithEmail: (email: string, password: string, isMinor?: boolean) => Promise<string | null>
  signInWithMagicLink: (email: string) => Promise<string | null>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<string | null>

  loadProfile: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<void>
  completeOnboarding: (username: string, avatarId: number) => Promise<string | null>
  registerAsPlayer: () => Promise<string | null>
  registerAsTeacher: (school: string, reason: string) => Promise<string | null>

  addXP: (amount: number) => Promise<void>

  openAuthModal: () => void
  openAuthModalForLogin: () => void
  openAuthModalForRegister: () => void
  closeAuthModal: () => void
  openSettingsModal: () => void
  closeSettingsModal: () => void
  openDashboardModal: () => void
  closeDashboardModal: () => void
  openTeacherPendingModal: () => void
  closeTeacherPendingModal: () => void
  closeContextModal: () => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isOnboarding: false,
  showIntentScreen: false,
  registrationType: null,
  teacherFormData: null,
  showTeacherPendingModal: false,
  showContextModal: false,
  authModalOpen: false,
  authModalTab: 'login',
  settingsModalOpen: false,
  dashboardModalOpen: false,

  _setUser: (user) => set({ user, isLoading: false }),

  openAuthModal: () => set({ authModalOpen: true, authModalTab: 'login', showIntentScreen: false }),
  openAuthModalForLogin: () => set({ authModalOpen: true, authModalTab: 'login', showIntentScreen: false }),
  openAuthModalForRegister: () => set({ authModalOpen: true, authModalTab: 'register', showIntentScreen: false }),
  closeAuthModal: () => set({ authModalOpen: false }),
  openSettingsModal: () => set({ settingsModalOpen: true }),
  closeSettingsModal: () => set({ settingsModalOpen: false }),
  openDashboardModal: () => set({ dashboardModalOpen: true }),
  closeDashboardModal: () => set({ dashboardModalOpen: false }),
  openTeacherPendingModal: () => set({ showTeacherPendingModal: true }),
  closeTeacherPendingModal: () => set({ showTeacherPendingModal: false }),
  closeContextModal: () => set({ showContextModal: false }),

  signInWithGoogle: async () => {
    localStorage.setItem('pexedu_oauth_player', '1')
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) await get().loadProfile()
    return error?.message ?? null
  },

  signUpWithEmail: async (email, password, isMinor = false) => {
    localStorage.setItem('pexedu_oauth_player', '1')
    const { registrationType, teacherFormData } = get()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          pexedu_intent: registrationType ?? 'player',
          pexedu_teacher_school: teacherFormData?.school ?? null,
          pexedu_teacher_reason: teacherFormData?.reason ?? null,
          pexedu_is_minor: isMinor ? '1' : '0',
        },
      },
    })
    if (error) localStorage.removeItem('pexedu_oauth_player')
    return error?.message ?? null
  },

  signInWithMagicLink: async (email) => {
    localStorage.setItem('pexedu_oauth_player', '1')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (error) localStorage.removeItem('pexedu_oauth_player')
    return error?.message ?? null
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, isOnboarding: false, settingsModalOpen: false })
  },

  deleteAccount: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return 'Nie si prihlásený'
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-account`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ callerToken: session.access_token }),
      }
    )
    const json = await res.json()
    if (!res.ok) return json.error ?? 'Chyba pri mazaní účtu'
    await supabase.auth.signOut()
    set({ user: null, profile: null, isOnboarding: false, settingsModalOpen: false })
    return null
  },

  loadProfile: async () => {
    const { user } = get()
    if (!user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (data) {
      const profile = data as Profile
      if (!profile.roles) profile.roles = ['player']
      const needsUsername = !profile.username
      if (needsUsername) {
        // Profile created by DB trigger but onboarding not done yet — restore intent
        let { registrationType, teacherFormData } = get()
        if (!registrationType) {
          const savedIntent = localStorage.getItem('pexedu_intent') as 'player' | 'pending_teacher' | null
          if (savedIntent) {
            registrationType = savedIntent
            if (savedIntent === 'pending_teacher') {
              const saved = localStorage.getItem('pexedu_teacher_form')
              teacherFormData = saved ? JSON.parse(saved) : null
            }
          } else {
            const meta = user.user_metadata
            if (meta?.pexedu_intent) {
              registrationType = meta.pexedu_intent as 'player' | 'pending_teacher'
              if (registrationType === 'pending_teacher' && meta.pexedu_teacher_school) {
                teacherFormData = { school: meta.pexedu_teacher_school, reason: meta.pexedu_teacher_reason ?? '' }
              }
            }
          }
        }
        set({ profile, isOnboarding: true, showIntentScreen: false, registrationType, teacherFormData })
      } else {
        const isAdmin = profile.roles.some(r => r === 'teacher' || r === 'superadmin')
        const lastContext = localStorage.getItem('pexedu_last_context')
        const showContextModal = isAdmin && !lastContext
        set({ profile, isOnboarding: false, showIntentScreen: false, showContextModal })
        const { setPlayerName } = (await import('./gameStore')).useGameStore.getState()
        setPlayerName(0, profile.username!)
      }
    } else {
      // No profile row — restore intent from store, localStorage, or user metadata (survives page reload + email confirmation)
      let { registrationType, teacherFormData } = get()
      if (!registrationType) {
        // 1. Try localStorage
        const savedIntent = localStorage.getItem('pexedu_intent') as 'player' | 'pending_teacher' | null
        if (savedIntent) {
          registrationType = savedIntent
          if (savedIntent === 'pending_teacher') {
            const saved = localStorage.getItem('pexedu_teacher_form')
            teacherFormData = saved ? JSON.parse(saved) : null
          }
        } else {
          // 2. Fall back to user metadata (set during signUpWithEmail)
          const meta = user.user_metadata
          if (meta?.pexedu_intent) {
            registrationType = meta.pexedu_intent as 'player' | 'pending_teacher'
            if (registrationType === 'pending_teacher' && meta.pexedu_teacher_school) {
              teacherFormData = { school: meta.pexedu_teacher_school, reason: meta.pexedu_teacher_reason ?? '' }
            }
          }
        }
      }
      // If joining a room via QR/link, always treat as player — skip intent screen
      const hasRoomParam = !!new URLSearchParams(window.location.search).get('room')
      if (hasRoomParam && !registrationType) {
        registrationType = 'player'
        localStorage.setItem('pexedu_intent', 'player')
      }
      set({ isOnboarding: true, showIntentScreen: !registrationType, registrationType, teacherFormData })
    }
  },

  updateProfile: async (data) => {
    const { user, profile } = get()
    if (!user) return
    await supabase.from('profiles').update(data).eq('id', user.id)
    set({ profile: profile ? { ...profile, ...data } : null })
  },

  completeOnboarding: async (username, avatarId) => {
    const { user } = get()
    if (!user) return 'Nie si prihlásený'
    const { error } = await supabase
      .from('profiles')
      .update({ username, avatar_id: avatarId })
      .eq('id', user.id)
    if (error) return error.message
    // GDPR-03: insert consent record for under-16 users
    if (user.user_metadata?.pexedu_is_minor === '1') {
      await supabase.from('child_consents').insert({
        child_user_id: user.id,
        consent_version: 'v1',
      })
    }
    set(s => ({
      profile: s.profile ? { ...s.profile, username, avatar_id: avatarId } : null,
      isOnboarding: false,
    }))
    return null
  },

  registerAsPlayer: async () => {
    const { user } = get()
    if (!user) return 'Nie si prihlásený'
    const isMinor = user.user_metadata?.pexedu_is_minor === '1'
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, roles: ['player'], is_minor: isMinor }, { onConflict: 'id' })
    if (error) return error.message
    set(s => ({
      profile: s.profile
        ? { ...s.profile, roles: ['player'], is_minor: isMinor }
        : { id: user.id, username: null, avatar_id: 0, xp: 0, level: 1, locale: 'cs', show_stats: true, show_favorites: true, show_activity: true, created_at: new Date().toISOString(), roles: ['player'], teacher_request_status: null, is_minor: isMinor },
      showIntentScreen: false,
      registrationType: 'player',
    }))
    return null
  },

  registerAsTeacher: async (school, reason) => {
    const { user } = get()
    if (!user) return 'Nie si prihlásený'
    const isMinor = user.user_metadata?.pexedu_is_minor === '1'
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, roles: ['player'], teacher_request_status: 'pending', is_minor: isMinor }, { onConflict: 'id' })
    if (profileError) return profileError.message
    const { error: reqError } = await supabase
      .from('teacher_requests')
      .insert({ user_id: user.id, school, reason: reason || null, email: user.email })
    if (reqError) return reqError.message
    set(s => ({
      profile: s.profile
        ? { ...s.profile, roles: ['player'], teacher_request_status: 'pending', is_minor: isMinor }
        : { id: user.id, username: null, avatar_id: 0, xp: 0, level: 1, locale: 'cs', show_stats: true, show_favorites: true, show_activity: true, created_at: new Date().toISOString(), roles: ['player'], teacher_request_status: 'pending', is_minor: isMinor },
      showIntentScreen: false,
      registrationType: 'pending_teacher',
    }))
    return null
  },

  addXP: async (amount) => {
    const { user, profile } = get()
    if (!user || !profile) return
    const newXp = profile.xp + amount
    const newLevel = getLevel(newXp)
    await supabase.from('profiles').update({ xp: newXp, level: newLevel }).eq('id', user.id)
    set(s => ({
      profile: s.profile ? { ...s.profile, xp: newXp, level: newLevel } : null,
    }))
  },
}))
