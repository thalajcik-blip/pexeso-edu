import { useState } from 'react'
import { useAuth } from './useAuth'
import LoginScreen from './LoginScreen'
import DeckList from './DeckList'
import DeckEditor from './DeckEditor'

type AdminView =
  | { type: 'decks' }
  | { type: 'editor'; deckId: string | null }

export default function AdminApp() {
  const { user, role, loading, signIn, signOut } = useAuth()
  const [view, setView] = useState<AdminView>({ type: 'decks' })
  const [drawerOpen, setDrawerOpen] = useState(false)

  function navigate(v: AdminView) {
    setView(v)
    setDrawerOpen(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Načítání…</div>
      </div>
    )
  }

  if (!user) return <LoginScreen signIn={signIn} />

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-2xl mb-2">🚫</div>
          <div className="text-gray-600 mb-4">Nemáte přístup do administrace.</div>
          <button onClick={signOut} className="text-sm text-indigo-600 hover:underline">Odhlásit se</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
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
            {role === 'superadmin' ? 'Superadmin' : 'Učitel'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400 hidden sm:block">{user.email}</span>
          <button onClick={signOut} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            Odhlásit se
          </button>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
          <nav className="relative z-50 w-64 bg-white h-full shadow-xl p-4 space-y-1 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <span className="font-bold text-gray-800">Menu</span>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <button
              onClick={() => navigate({ type: 'decks' })}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${view.type === 'decks' ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              🃏 Sady
            </button>
            <div className="mt-auto pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-400 mb-2 truncate">{user.email}</div>
              <button onClick={signOut} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
                Odhlásit se
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Sidebar + content */}
      <div className="flex">
        {/* Sidebar — desktop only */}
        <nav className="hidden md:block w-52 shrink-0 p-4 space-y-1">
          <button
            onClick={() => navigate({ type: 'decks' })}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              view.type === 'decks'
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🃏 Sady
          </button>
        </nav>

        <main className="flex-1 p-4 md:p-8 max-w-4xl">
          {view.type === 'decks' && (
            <DeckList
              role={role}
              onNew={() => navigate({ type: 'editor', deckId: null })}
              onEdit={deck => navigate({ type: 'editor', deckId: deck.id })}
            />
          )}
          {view.type === 'editor' && (
            <DeckEditor
              deckId={view.deckId}
              isSuperadmin={role === 'superadmin'}
              onBack={() => navigate({ type: 'decks' })}
            />
          )}
        </main>
      </div>
    </div>
  )
}
