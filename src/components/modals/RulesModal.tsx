import { useGameStore } from '../../store/gameStore'
import { TRANSLATIONS } from '../../data/translations'
import { THEMES } from '../../data/themes'

export default function RulesModal() {
  const rulesOpen = useGameStore(s => s.rulesOpen)
  const closeRules = useGameStore(s => s.closeRules)
  const language = useGameStore(s => s.language)
  const theme = useGameStore(s => s.theme)
  const tr = TRANSLATIONS[language]
  const tc = THEMES[theme]

  if (!rulesOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: tc.overlayBg }}
      onClick={closeRules}
    >
      <div
        className="pop-in w-full max-w-md rounded-2xl p-8 space-y-4 max-h-[90vh] overflow-y-auto"
        style={{ background: tc.modalSurface, border: `1px solid ${tc.modalSurfaceBorder}`, color: tc.text }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold">{tr.rulesTitle}</h2>
        <ol className="space-y-2 text-sm list-decimal list-inside" style={{ color: tc.textDim }}>
          {tr.rules.map((rule, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: rule }} />
          ))}
        </ol>

        <div className="pt-2 border-t" style={{ borderColor: tc.modalSurfaceBorder }}>
          <h3 className="text-base font-bold mb-2">{tr.rulesOnlineTitle}</h3>
          <ol className="space-y-2 text-sm list-decimal list-inside" style={{ color: tc.textDim }}>
            {tr.rulesOnline.map((rule, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: rule }} />
            ))}
          </ol>
        </div>
        <button
          onClick={closeRules}
          className="w-full py-2.5 rounded-xl font-bold mt-2 transition-opacity hover:opacity-90"
          style={{ background: tc.accentGradient, color: tc.accentText }}
        >
          {tr.rulesClose}
        </button>
      </div>
    </div>
  )
}
