import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import type { User } from '@supabase/supabase-js'

export type AdminRole = 'superadmin' | 'teacher' | null

export function useAuth() {
  const [user, setUser]           = useState<User | null>(null)
  const [role, setRole]           = useState<AdminRole>(null)
  const [loading, setLoading]     = useState(true)
  const [isRecovery, setIsRecovery] = useState(false)

  async function fetchRole(userId: string) {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()
    setRole((data?.role as AdminRole) ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchRole(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true)
        setUser(session?.user ?? null)
        setLoading(false)
        return
      }
      setUser(session?.user ?? null)
      if (session?.user) fetchRole(session.user.id)
      else { setRole(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/admin` },
    })
    if (error) return error
    if (data.user) {
      await supabase.from('user_roles').insert({ user_id: data.user.id, role: 'teacher' })
    }
    return null
  }

  async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/admin`,
    })
    return error
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (!error) setIsRecovery(false)
    return error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return { user, role, loading, isRecovery, signIn, signUp, resetPassword, updatePassword, signOut }
}
