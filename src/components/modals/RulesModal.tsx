import { useGameStore } from '../../store/gameStore'
import { TRANSLATIONS } from '../../data/translations'

export default function RulesModal() {
  const rulesOpen = useGameStore(s => s.rulesOpen)
  const closeRules = useGameStore(s => s.closeRules)
  const language = useGameStore(s => s.language)
  const tr = TRANSLATIONS[language]

  if (!rulesOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(13,27,42,0.95)' }}
      onClick={closeRules}
    >
      <div
        className="pop-in w-full max-w-md rounded-2xl p-8 space-y-4"
        style={{ background: '#111f2e', border: '1px solid rgba(255,255,255,0.15)' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold">{tr.rulesTitle}</h2>
        <ol className="space-y-2 text-sm list-decimal list-inside" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {tr.rules.map((rule, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: rule }} />
          ))}
        </ol>
        <button
          onClick={closeRules}
          className="w-full py-2.5 rounded-xl font-bold mt-2 transition-opacity hover:opacity-90"
          style={{ background: '#f9d74e', color: '#0d1b2a' }}
        >
          {tr.rulesClose}
        </button>
      </div>
    </div>
  )
}
