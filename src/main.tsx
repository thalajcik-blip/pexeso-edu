import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import './index.css'
import App from './App.tsx'
import AdminApp from './admin/AdminApp.tsx'

inject()

// If Supabase redirects with auth tokens to root (e.g. password recovery),
// forward to /admin so AdminApp can handle the auth event.
const hash = window.location.hash
if (!window.location.pathname.startsWith('/admin') && (hash.includes('type=recovery') || hash.includes('access_token'))) {
  window.location.replace('/admin' + hash)
}

const isAdmin = window.location.pathname.startsWith('/admin')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin ? <AdminApp /> : <App />}
  </StrictMode>,
)
