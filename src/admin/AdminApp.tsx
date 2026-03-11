import { useState } from 'react'
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { useAuth } from './useAuth'
import type { AdminRole } from './useAuth'
import LoginScreen from './LoginScreen'
import DeckList from './DeckList'
import DeckEditor from './DeckEditor'
import UsersManager from './UsersManager'
import AdminSettings from './AdminSettings'
import type { useAuth as UseAuthType } from './useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function SetNewPasswordScreen({ updatePassword }: { updatePassword: ReturnType<typeof UseAuthType>['updatePassword'] }) {
  const [password, setPassword]   = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== password2) { setError('Hesla se neshodují.'); return }
    setLoading(true)
    const err = await updatePassword(password)
    if (err) setError(err.message)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-2xl font-bold text-gray-800 mb-1">Nové heslo</div>
        <div className="text-sm text-gray-500 mb-6">Zadejte své nové heslo</div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nové heslo</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Heslo znovu</label>
            <Input type="password" value={password2} onChange={e => setPassword2(e.target.value)} required />
          </div>
          {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Ukládání…' : 'Uložit heslo'}
          </Button>
        </form>
      </div>
    </div>
  )
}

function DeckEditorRoute({ isSuperadmin }: { isSuperadmin: boolean }) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  return (
    <DeckEditor
      deckId={id === 'new' ? null : (id ?? null)}
      isSuperadmin={isSuperadmin}
      onBack={() => navigate('/admin')}
    />
  )
}

function AdminLayout({ role, email, signOut }: { role: AdminRole; email: string; signOut: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isSuperadmin = role === 'superadmin'

  function navTo(path: string) {
    navigate(path)
    setDrawerOpen(false)
  }

  function navItem(path: string, label: string, exact = false) {
    const active = exact ? location.pathname === path : location.pathname.startsWith(path)
    return (
      <button
        onClick={() => navTo(path)}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            aria-label="Otevřít menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-bold text-gray-800">Pexedu Admin</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
            {isSuperadmin ? 'Superadmin' : 'Učitel'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:block">{email}</span>
          <Button variant="ghost" size="sm" onClick={signOut} className="text-xs text-gray-500">
            Odhlásit se
          </Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <nav className="relative z-50 w-64 bg-white h-full shadow-xl p-4 space-y-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-gray-800">Menu</span>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            {navItem('/admin', '🃏 Sady', true)}
            {isSuperadmin && navItem('/admin/users', '👥 Uživatelé')}
            {isSuperadmin && navItem('/admin/settings', '⚙️ Nastavení')}
            <div className="mt-auto pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-400 mb-2 truncate">{email}</div>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-xs text-gray-500 px-0">
                Odhlásit se
              </Button>
            </div>
          </nav>
        </div>
      )}

      {/* Sidebar + content */}
      <div className="flex">
        <nav className="hidden md:block w-52 shrink-0 p-4 space-y-1">
          {navItem('/admin', '🃏 Sady', true)}
          {isSuperadmin && navItem('/admin/users', '👥 Uživatelé')}
          {isSuperadmin && navItem('/admin/settings', '⚙️ Nastavení')}
        </nav>

        <main className="flex-1 p-4 md:p-8 max-w-4xl">
          <Routes>
            <Route path="/admin" element={
              <DeckList
                role={role}
                onNew={() => navigate('/admin/decks/new')}
                onEdit={deck => navigate(`/admin/decks/${deck.id}`)}
              />
            } />
            <Route path="/admin/decks/:id" element={<DeckEditorRoute isSuperadmin={isSuperadmin} />} />
            {isSuperadmin && <Route path="/admin/users" element={<UsersManager />} />}
            {isSuperadmin && <Route path="/admin/settings" element={<AdminSettings />} />}
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function AdminApp() {
  const { user, role, loading, isRecovery, signIn, signUp, resetPassword, updatePassword, signInWithGoogle, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Načítání…</div>
      </div>
    )
  }

  if (!user) return <LoginScreen signIn={signIn} signUp={signUp} resetPassword={resetPassword} signInWithGoogle={signInWithGoogle} />

  if (isRecovery) return <SetNewPasswordScreen updatePassword={updatePassword} />

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="text-lg font-bold text-gray-800 mb-2">Čekáme na schválení</div>
          <div className="text-sm text-gray-500 mb-1">Váš účet byl zaregistrován jako</div>
          <div className="text-sm font-medium text-gray-700 mb-4">{user.email}</div>
          <div className="text-sm text-gray-500 mb-6">Administrátor vám brzy přidělí přístup. Zkuste se přihlásit znovu za chvíli.</div>
          <Button variant="link" onClick={signOut} className="text-sm text-indigo-500 p-0 h-auto">Odhlásit se</Button>
        </div>
      </div>
    )
  }

  return <AdminLayout role={role} email={user.email ?? ''} signOut={signOut} />
}
