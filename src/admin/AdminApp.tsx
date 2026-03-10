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
      <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-800">Pexedu Admin</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
            {role === 'superadmin' ? 'Superadmin' : 'Učitel'}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">{user.email}</span>
          <button onClick={signOut} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            Odhlásit se
          </button>
        </div>
      </div>

      {/* Sidebar + content */}
      <div className="flex">
        <nav className="w-52 shrink-0 p-4 space-y-1">
          <button
            onClick={() => setView({ type: 'decks' })}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              view.type === 'decks'
                ? 'bg-indigo-50 text-indigo-700 font-semibold'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            🃏 Sady
          </button>
        </nav>

        <main className="flex-1 p-8 max-w-4xl">
          {view.type === 'decks' && (
            <DeckList
              role={role}
              onNew={() => setView({ type: 'editor', deckId: null })}
              onEdit={deck => setView({ type: 'editor', deckId: deck.id })}
            />
          )}
          {view.type === 'editor' && (
            <DeckEditor
              deckId={view.deckId}
              isSuperadmin={role === 'superadmin'}
              onBack={() => setView({ type: 'decks' })}
            />
          )}
        </main>
      </div>
    </div>
  )
}
