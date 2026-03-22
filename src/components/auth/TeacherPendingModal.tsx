import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'

const TEXTS = {
  cs: {
    title: 'Vítejte!',
    body1: 'Vaše žádost o učitelský účet byla odeslána.',
    body2: 'Superadmin ji brzy zkontroluje — dostanete e-mail, jakmile bude schválena.',
    note: 'Mezitím můžete hrát všechny hry hned teď.',
    cta: 'Začít hrát →',
  },
  sk: {
    title: 'Vitajte!',
    body1: 'Vaša žiadosť o učiteľský účet bola odoslaná.',
    body2: 'Superadmin ju čoskoro skontroluje — dostanete e-mail, keď bude schválená.',
    note: 'Medzitým môžete hrať všetky hry hneď teraz.',
    cta: 'Začať hrať →',
  },
  en: {
    title: 'Welcome!',
    body1: 'Your teacher account request has been sent.',
    body2: 'A superadmin will review it shortly — you\'ll get an email once approved.',
    note: 'In the meantime, you can play all games right now.',
    cta: 'Start playing →',
  },
}

export default function TeacherPendingModal() {
  const theme    = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t  = TEXTS[language] ?? TEXTS['cs']

  const { closeTeacherPendingModal, profile } = useAuthStore()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: tc.overlayBg }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-7 text-center space-y-4"
        style={{ background: tc.modalSurface, border: `1px solid ${tc.modalSurfaceBorder}`, color: tc.text }}
      >
        <div className="text-5xl">👋</div>

        <h2 className="text-xl font-bold" style={{ color: tc.text }}>
          {t.title}{profile?.username ? ` ${profile.username}` : ''}
        </h2>

        <p className="text-sm" style={{ color: tc.textMuted }}>{t.body1}</p>
        <p className="text-sm" style={{ color: tc.textMuted }}>{t.body2}</p>

        <div
          className="rounded-xl px-4 py-3 text-sm font-medium"
          style={{ background: tc.btnInactiveBg, color: tc.text }}
        >
          ✓ {t.note}
        </div>

        <button
          onClick={closeTeacherPendingModal}
          className="w-full py-3 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 mt-2"
          style={{ background: tc.accentGradient, color: tc.accentText }}
        >
          {t.cta}
        </button>
      </div>
    </div>
  )
}
