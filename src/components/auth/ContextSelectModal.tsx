import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'

const TEXTS = {
  cs: {
    title: 'Kam chceš jít?',
    gameBtn: '🎮 Hrát',
    gameDesc: 'Procházej sady a hraj hry',
    adminBtn: '⚙️ Administrace',
    adminDesc: 'Spravuj sady karet a třídy',
    remember: 'Zapamatovat volbu',
  },
  sk: {
    title: 'Kam chceš ísť?',
    gameBtn: '🎮 Hrať',
    gameDesc: 'Prechádzaj sady a hraj hry',
    adminBtn: '⚙️ Administrácia',
    adminDesc: 'Spravuj sady kariet a triedy',
    remember: 'Zapamätať voľbu',
  },
  en: {
    title: 'Where do you want to go?',
    gameBtn: '🎮 Play',
    gameDesc: 'Browse sets and play games',
    adminBtn: '⚙️ Administration',
    adminDesc: 'Manage card sets and classes',
    remember: 'Remember my choice',
  },
}

export default function ContextSelectModal() {
  const theme    = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t  = TEXTS[language] ?? TEXTS['cs']

  const { closeContextModal } = useAuthStore()

  function go(context: 'game' | 'admin') {
    localStorage.setItem('pexedu_last_context', context)
    closeContextModal()
    if (context === 'admin') {
      window.location.href = '/admin'
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: tc.overlayBg }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-7"
        style={{ background: tc.modalSurface, border: `1px solid ${tc.modalSurfaceBorder}` }}
      >
        <h2 className="text-xl font-bold text-center mb-6" style={{ color: tc.text }}>
          {t.title}
        </h2>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => go('game')}
            className="w-full text-left p-4 rounded-xl border transition-all hover:opacity-90"
            style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder }}
          >
            <div className="font-bold text-base mb-0.5" style={{ color: tc.text }}>{t.gameBtn}</div>
            <div className="text-sm" style={{ color: tc.textMuted }}>{t.gameDesc}</div>
          </button>

          <button
            onClick={() => go('admin')}
            className="w-full text-left p-4 rounded-xl border transition-all hover:opacity-90"
            style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder }}
          >
            <div className="font-bold text-base mb-0.5" style={{ color: tc.text }}>{t.adminBtn}</div>
            <div className="text-sm" style={{ color: tc.textMuted }}>{t.adminDesc}</div>
          </button>
        </div>
      </div>
    </div>
  )
}
