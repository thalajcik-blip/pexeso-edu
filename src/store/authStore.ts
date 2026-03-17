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
}

const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000]

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
  authModalOpen: boolean
  settingsModalOpen: boolean

  _setUser: (user: User | null) => void

  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<string | null>
  signUpWithEmail: (email: string, password: string) => Promise<string | null>
  signInWithMagicLink: (email: string) => Promise<string | null>
  signOut: () => Promise<void>
  deleteAccount: () => Promise<string | null>

  loadProfile: () => Promise<void>
  updateProfile: (data: Partial<Profile>) => Promise<void>
  completeOnboarding: (username: string, avatarId: number) => Promise<string | null>

  addXP: (amount: number) => Promise<void>

  openAuthModal: () => void
  closeAuthModal: () => void
  openSettingsModal: () => void
  closeSettingsModal: () => void
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  profile: null,
  isLoading: true,
  isOnboarding: false,
  authModalOpen: false,
  settingsModalOpen: false,

  _setUser: (user) => set({ user, isLoading: false }),

  openAuthModal: () => set({ authModalOpen: true }),
  closeAuthModal: () => set({ authModalOpen: false }),
  openSettingsModal: () => set({ settingsModalOpen: true }),
  closeSettingsModal: () => set({ settingsModalOpen: false }),

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

  signUpWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return error?.message ?? null
  },

  signInWithMagicLink: async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
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
      set({ profile: data as Profile, isOnboarding: !data.username })
    } else {
      set({ isOnboarding: true })
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
    set(s => ({
      profile: s.profile ? { ...s.profile, username, avatar_id: avatarId } : null,
      isOnboarding: false,
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
