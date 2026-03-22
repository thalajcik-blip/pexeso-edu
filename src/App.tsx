import { useEffect, useRef } from 'react'
import { Toaster } from 'sonner'
import { useGameStore } from './store/gameStore'
import { useAuthStore } from './store/authStore'
import { supabase } from './services/supabase'
import { THEMES } from './data/themes'
import { TRANSLATIONS } from './data/translations'
import SetupScreen from './components/setup/SetupScreen'
import LobbyScreen from './components/lobby/LobbyScreen'
import GameBoard from './components/game/GameBoard'
import QuizModal from './components/modals/QuizModal'
import WinModal from './components/modals/WinModal'
import RulesModal from './components/modals/RulesModal'
import LightningGame from './components/lightning/LightningGame'
import SettingsModal from './components/lobby/SettingsModal'
import AuthModal from './components/auth/AuthModal'
import OnboardingModal from './components/auth/OnboardingModal'
import IntentScreen from './components/auth/IntentScreen'
import TeacherPendingModal from './components/auth/TeacherPendingModal'
import PlayerSettingsModal from './components/auth/SettingsModal'
import DashboardModal from './components/auth/DashboardModal'

export default function App() {
  const phase              = useGameStore(s => s.phase)
  const theme              = useGameStore(s => s.theme)
  const language           = useGameStore(s => s.language)
  const debugEndGame       = useGameStore(s => s.debugEndGame)
  const isOnline           = useGameStore(s => s.isOnline)
  const isHost             = useGameStore(s => s.isHost)
  const hostOpeningSettings = useGameStore(s => s.hostOpeningSettings)
  const lobbyPlayers       = useGameStore(s => s.lobbyPlayers)
  const disconnectedPlayer = useGameStore(s => s.disconnectedPlayer)
  const leaveRoom          = useGameStore(s => s.leaveRoom)
  const goToLobby          = useGameStore(s => s.goToLobby)
  const resetToSetup       = useGameStore(s => s.resetToSetup)
  const tc = THEMES[theme]
  const tr = TRANSLATIONS[language]

  const { authModalOpen, isOnboarding, showIntentScreen, showTeacherPendingModal, settingsModalOpen, dashboardModalOpen, _setUser, loadProfile, closeAuthModal } = useAuthStore()

  const inGame        = phase === 'playing' || phase === 'quiz'
  const inLightning   = phase === 'lightning_playing' || phase === 'lightning_reveal'
  const isAlone = isOnline && (inGame || inLightning) && lobbyPlayers.length < 2

  // Supabase auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      _setUser(session?.user ?? null)
      if (session?.user) loadProfile()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      _setUser(session?.user ?? null)
      if (event === 'SIGNED_IN' && session?.user) {
        loadProfile()
        closeAuthModal()
      }
    })

    return () => subscription.unsubscribe()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Back button → return to setup instead of leaving the app
  const prevPhaseRef = useRef(phase)
  useEffect(() => {
    if (prevPhaseRef.current === 'setup' && phase !== 'setup') {
      history.pushState({ pexedu: true }, '')
    }
    prevPhaseRef.current = phase
  }, [phase])

  useEffect(() => {
    const handler = () => {
      if (phase !== 'setup') resetToSetup()
    }
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  }, [phase, resetToSetup])

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
    <main
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
      {(phase === 'lightning_playing' || phase === 'lightning_reveal' || phase === 'lightning_results') && <LightningGame />}
      <RulesModal />
      {isHost && hostOpeningSettings && <SettingsModal />}

      {/* Auth modals */}
      {showIntentScreen && !authModalOpen && <IntentScreen />}
      {authModalOpen && <AuthModal />}
      {isOnboarding && !authModalOpen && !showIntentScreen && <OnboardingModal />}
      {showTeacherPendingModal && <TeacherPendingModal />}
      {settingsModalOpen && <PlayerSettingsModal />}
      {dashboardModalOpen && <DashboardModal />}

      <Toaster theme={theme} richColors position="bottom-right" />

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
    </main>
  )
}
