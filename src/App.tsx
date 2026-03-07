import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import SetupScreen from './components/setup/SetupScreen'
import GameBoard from './components/game/GameBoard'
import QuizModal from './components/modals/QuizModal'
import WinModal from './components/modals/WinModal'
import RulesModal from './components/modals/RulesModal'

export default function App() {
  const phase = useGameStore(s => s.phase)
  const debugEndGame = useGameStore(s => s.debugEndGame)

  // Debug shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ':' && phase === 'playing') debugEndGame()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, debugEndGame])

  return (
    <div
      className="min-h-screen text-white select-none"
      style={{ fontFamily: "'Readex Pro', sans-serif", background: '#0d1b2a' }}
    >
      {phase === 'setup' && <SetupScreen />}
      {(phase === 'playing' || phase === 'quiz' || phase === 'win') && <GameBoard />}
      {phase === 'quiz' && <QuizModal />}
      {phase === 'win' && <WinModal />}
      <RulesModal />
    </div>
  )
}
