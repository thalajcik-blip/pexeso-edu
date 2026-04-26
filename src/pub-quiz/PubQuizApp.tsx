import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import CreateSession from './CreateSession'
import HostView from './HostView'
import TeamView from './TeamView'
import DisplayView from './DisplayView'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../services/supabase'

export default function PubQuizApp() {
  const { loadProfile, _setUser } = useAuthStore()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      _setUser(session?.user ?? null)
      if (session?.user) loadProfile()
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      _setUser(session?.user ?? null)
      if (session?.user) loadProfile()
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <Routes>
      <Route path="/create" element={<CreateSession />} />
      <Route path="/host/:sessionCode" element={<HostView />} />
      <Route path="/play/:sessionCode" element={<TeamView />} />
      <Route path="/display/:sessionCode" element={<DisplayView />} />
      <Route path="*" element={<Navigate to="/create" replace />} />
    </Routes>
  )
}
