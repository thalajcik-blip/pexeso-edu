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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar'

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

type NavItem = { path: string; label: string; icon: string; exact: boolean; superadminOnly: boolean }

function AdminSidebarContents({ isSuperadmin, email, signOut, visibleItems, navigate, location }: {
  isSuperadmin: boolean
  email: string
  signOut: () => void
  visibleItems: NavItem[]
  navigate: (path: string) => void
  location: { pathname: string }
}) {
  const { state } = useSidebar()
  const collapsed = state === 'collapsed'

  return (
    <>
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border overflow-hidden">
        <div className="font-bold text-base text-sidebar-foreground truncate">
          {collapsed ? 'P' : 'Pexedu Admin'}
        </div>
        {!collapsed && (
          <Badge className="bg-indigo-50 text-indigo-600 mt-1">
            {isSuperadmin ? 'Superadmin' : 'Učitel'}
          </Badge>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map(item => {
                const active = item.exact
                  ? location.pathname === item.path
                  : location.pathname.startsWith(item.path)
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton isActive={active} onClick={() => navigate(item.path)} tooltip={item.label}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 py-3 border-t border-sidebar-border overflow-hidden">
        {!collapsed && (
          <div className="text-xs text-sidebar-foreground/50 truncate mb-2">{email}</div>
        )}
        <Button variant="ghost" size="sm" onClick={signOut} className="text-xs text-gray-500 px-0 h-auto w-full justify-start">
          {collapsed ? '→' : 'Odhlásit se'}
        </Button>
      </SidebarFooter>
    </>
  )
}

const NAV_ITEMS = [
  { path: '/admin', label: 'Sady', icon: '🃏', exact: true, superadminOnly: false },
  { path: '/admin/users', label: 'Uživatelé', icon: '👥', exact: false, superadminOnly: true },
  { path: '/admin/settings', label: 'Nastavení', icon: '⚙️', exact: false, superadminOnly: true },
]

function AdminLayout({ role, email, signOut }: { role: AdminRole; email: string; signOut: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isSuperadmin = role === 'superadmin'

  const visibleItems = NAV_ITEMS.filter(item => !item.superadminOnly || isSuperadmin)

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <AdminSidebarContents
          isSuperadmin={isSuperadmin}
          email={email}
          signOut={signOut}
          visibleItems={visibleItems}
          navigate={navigate}
          location={location}
        />
      </Sidebar>

      <SidebarInset>
        <header className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
          <SidebarTrigger />
        </header>
        <main className="p-4 md:p-8 max-w-4xl">
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
      </SidebarInset>
    </SidebarProvider>
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
