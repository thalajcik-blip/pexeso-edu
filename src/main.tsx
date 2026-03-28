import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { inject } from '@vercel/analytics'
import './index.css'
import App from './App.tsx'
import AdminApp from './admin/AdminApp.tsx'
import ProfilePage from './components/profile/ProfilePage.tsx'
import JoinClassRoute from './components/student/JoinClassRoute.tsx'
import TeacherDashboard from './components/teacher/TeacherDashboard.tsx'

inject()

// If Supabase redirects with auth tokens to root, forward to /admin only for
// admin flows (password recovery or admin OAuth). Player Google OAuth is flagged
// via localStorage so it stays on root.
const hash = window.location.hash
const isPlayerOAuth = localStorage.getItem('pexedu_oauth_player') === '1'
if (isPlayerOAuth && hash.includes('access_token')) {
  localStorage.removeItem('pexedu_oauth_player')
} else if (!window.location.pathname.startsWith('/admin') && (hash.includes('type=recovery') || (hash.includes('access_token') && !hash.includes('type=signup')))) {
  window.location.replace('/admin' + hash)
}

const isAdmin   = window.location.pathname.startsWith('/admin')
const isProfile = window.location.pathname.startsWith('/profile/')
const isJoin    = window.location.pathname.startsWith('/join/')
const isTeacher = window.location.pathname.startsWith('/teacher')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin
      ? <BrowserRouter><AdminApp /></BrowserRouter>
      : isTeacher
        ? <BrowserRouter><TeacherDashboard /></BrowserRouter>
        : isProfile
          ? <ProfilePage />
          : isJoin
            ? <JoinClassRoute />
            : <App />}
  </StrictMode>,
)
