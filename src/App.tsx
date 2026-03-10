import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { THEMES } from './data/themes'
import { TRANSLATIONS } from './data/translations'
import SetupScreen from './components/setup/SetupScreen'
import LobbyScreen from './components/lobby/LobbyScreen'
import GameBoard from './components/game/GameBoard'
import QuizModal from './components/modals/QuizModal'
import WinModal from './components/modals/WinModal'
import RulesModal from './components/modals/RulesModal'

export default function App() {
  const phase              = useGameStore(s => s.phase)
  const theme              = useGameStore(s => s.theme)
  const language           = useGameStore(s => s.language)
  const debugEndGame       = useGameStore(s => s.debugEndGame)
  const isOnline           = useGameStore(s => s.isOnline)
  const lobbyPlayers       = useGameStore(s => s.lobbyPlayers)
  const disconnectedPlayer = useGameStore(s => s.disconnectedPlayer)
  const leaveRoom          = useGameStore(s => s.leaveRoom)
  const goToLobby          = useGameStore(s => s.goToLobby)
  const tc = THEMES[theme]
  const tr = TRANSLATIONS[language]

  const inGame  = phase === 'playing' || phase === 'quiz'
  const isAlone = isOnline && inGame && lobbyPlayers.length < 2

  // Auto-navigate to lobby if ?room= param is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('room')) goToLobby()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debug shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ':' && phase === 'playing') debugEndGame()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, debugEndGame])

  const isDev = import.meta.env.VITE_SUPABASE_URL?.includes('zmiwnqiocdolvnzabcrm')

  return (
    <div
      className="min-h-screen select-none transition-colors duration-300"
      style={{ fontFamily: "'Readex Pro', sans-serif", background: tc.bg, color: tc.text }}
    >
      {isDev && (
        <div className="fixed bottom-3 left-3 z-50 px-2 py-0.5 rounded text-xs font-bold tracking-widest" style={{ background: '#f59e0b', color: '#000' }}>
          DEV
        </div>
      )}
      {phase === 'setup' && <SetupScreen />}
      {phase === 'lobby' && <LobbyScreen />}
      {(inGame || phase === 'win') && <GameBoard />}
      {phase === 'quiz' && <QuizModal />}
      {phase === 'win' && <WinModal />}
      <RulesModal />

      {/* Player left — brief banner */}
      {isOnline && disconnectedPlayer && !isAlone && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg"
          style={{ background: tc.errorBg, color: tc.errorColor, border: `1px solid ${tc.errorColor}` }}
        >
          {tr.playerLeft.replace('{name}', disconnectedPlayer)}
        </div>
      )}

      {/* Alone overlay — persists until player leaves */}
      {isAlone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: tc.overlayBg }}>
          <div
            className="w-full max-w-sm rounded-2xl p-6 text-center space-y-4"
            style={{ background: tc.modalSurface, border: `1px solid ${tc.modalSurfaceBorder}` }}
          >
            <div className="text-4xl">👤</div>
            <div className="font-bold text-lg">{tr.youAreAlone}</div>
            {disconnectedPlayer && (
              <div className="text-sm" style={{ color: tc.textDim }}>
                {tr.playerLeft.replace('{name}', disconnectedPlayer)}
              </div>
            )}
            <button
              onClick={leaveRoom}
              className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90"
              style={{ background: tc.accentGradient, color: tc.accentText }}
            >
              {tr.leaveRoom}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
