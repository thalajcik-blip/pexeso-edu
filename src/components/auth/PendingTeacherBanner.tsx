import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { isPendingTeacher } from '../../utils/roles'

const TEXTS = {
  cs: '⏳ Vaše žádost o učitelský účet se prověřuje. Dostanete e-mail, jakmile bude schválena.',
  sk: '⏳ Vaša žiadosť o učiteľský účet sa preveruje. Dostanete e-mail, keď bude schválená.',
  en: '⏳ Your teacher account request is being reviewed. You\'ll get an email once approved.',
}

export default function PendingTeacherBanner() {
  const theme    = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const { profile } = useAuthStore()

  if (!isPendingTeacher(profile)) return null

  const text = TEXTS[language] ?? TEXTS['cs']

  return (
    <div
      className="w-full px-4 py-2.5 text-xs text-center font-medium"
      style={{
        background: theme === 'dark' ? 'rgba(215,176,116,0.12)' : 'rgba(215,176,116,0.25)',
        color: theme === 'dark' ? '#d7b074' : '#92600a',
        borderBottom: '1px solid rgba(215,176,116,0.3)',
      }}
    >
      {text}
    </div>
  )
}
