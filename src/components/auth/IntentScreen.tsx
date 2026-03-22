import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'

const TEXTS = {
  cs: {
    title: 'Kdo jsi?',
    playerBtn: '🎮 Chci hrát',
    playerDesc: 'Studenti, děti, kdokoliv kdo chce hrát a učit se',
    teacherBtn: '👨‍🏫 Jsem učitel/ka',
    teacherDesc: 'Vytvářej sady karet a spravuj svou třídu',
    alreadyHaveAccount: 'Už mám účet → Přihlásit se',
    schoolLabel: 'Název školy',
    schoolPlaceholder: 'ZŠ Brno, Masarykova 1',
    reasonLabel: 'Proč chceš pexedu používat? (volitelné)',
    reasonPlaceholder: 'Např. výuka angličtiny, přírodověda…',
    next: 'Pokračovat →',
    back: '← Zpět',
  },
  sk: {
    title: 'Kto si?',
    playerBtn: '🎮 Chcem hrať',
    playerDesc: 'Študenti, deti, každý kto chce hrať a učiť sa',
    teacherBtn: '👨‍🏫 Som učiteľ/ka',
    teacherDesc: 'Vytváraj sady kariet a spravuj svoju triedu',
    alreadyHaveAccount: 'Už mám účet → Prihlásiť sa',
    schoolLabel: 'Názov školy',
    schoolPlaceholder: 'ZŠ Bratislava, Hlavná 1',
    reasonLabel: 'Prečo chceš pexedu používať? (voliteľné)',
    reasonPlaceholder: 'Napr. výučba angličtiny, prírodoveda…',
    next: 'Pokračovať →',
    back: '← Späť',
  },
  en: {
    title: 'Who are you?',
    playerBtn: '🎮 I want to play',
    playerDesc: 'Students, kids, anyone who wants to learn through games',
    teacherBtn: '👨‍🏫 I\'m a teacher',
    teacherDesc: 'Create card sets and manage your class',
    alreadyHaveAccount: 'Already have an account? Sign in',
    schoolLabel: 'School name',
    schoolPlaceholder: 'Springfield Elementary School',
    reasonLabel: 'Why do you want to use pexedu? (optional)',
    reasonPlaceholder: 'e.g. English vocabulary, science…',
    next: 'Continue →',
    back: '← Back',
  },
}

type Step = 'choice' | 'teacher-form'

export default function IntentScreen() {
  const theme    = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t  = TEXTS[language] ?? TEXTS['cs']

  const { openAuthModalForLogin, openAuthModalForRegister } = useAuthStore()

  const [step, setStep]     = useState<Step>('choice')
  const [school, setSchool] = useState('')
  const [reason, setReason] = useState('')

  function handlePlayer() {
    localStorage.setItem('pexedu_intent', 'player')
    useAuthStore.setState({ registrationType: 'player', showIntentScreen: false })
    openAuthModalForRegister()
  }

  function handleTeacherContinue(e: React.FormEvent) {
    e.preventDefault()
    if (!school.trim()) return
    localStorage.setItem('pexedu_intent', 'pending_teacher')
    localStorage.setItem('pexedu_teacher_form', JSON.stringify({ school: school.trim(), reason: reason.trim() }))
    useAuthStore.setState({
      registrationType: 'pending_teacher',
      teacherFormData: { school: school.trim(), reason: reason.trim() },
      showIntentScreen: false,
    })
    openAuthModalForRegister()
  }

  function handleSignIn() {
    useAuthStore.setState({ showIntentScreen: false })
    openAuthModalForLogin()
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1rem',
    background: tc.overlayBg,
  }

  const cardStyle: React.CSSProperties = {
    width: '100%', maxWidth: '28rem',
    background: tc.modalSurface,
    border: `1px solid ${tc.modalSurfaceBorder}`,
    borderRadius: '1rem',
    padding: '2rem 1.5rem',
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.75rem',
    borderRadius: '0.75rem', fontSize: '0.875rem',
    border: `1px solid ${tc.btnInactiveBorder}`,
    background: tc.btnInactiveBg,
    color: tc.text,
    outline: 'none',
  }

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        {step === 'choice' ? (
          <>
            <h2 className="text-xl font-bold text-center mb-6" style={{ color: tc.text }}>
              {t.title}
            </h2>

            <div className="flex flex-col gap-3">
              <button
                onClick={handlePlayer}
                className="w-full text-left p-4 rounded-xl border transition-all hover:opacity-90"
                style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder }}
              >
                <div className="font-bold text-base mb-0.5" style={{ color: tc.text }}>{t.playerBtn}</div>
                <div className="text-sm" style={{ color: tc.textMuted }}>{t.playerDesc}</div>
              </button>

              <button
                onClick={() => setStep('teacher-form')}
                className="w-full text-left p-4 rounded-xl border transition-all hover:opacity-90"
                style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder }}
              >
                <div className="font-bold text-base mb-0.5" style={{ color: tc.text }}>{t.teacherBtn}</div>
                <div className="text-sm" style={{ color: tc.textMuted }}>{t.teacherDesc}</div>
              </button>
            </div>

            <button
              onClick={handleSignIn}
              className="mt-5 w-full text-xs text-center opacity-50 hover:opacity-80 transition-opacity"
              style={{ color: tc.text }}
            >
              {t.alreadyHaveAccount}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setStep('choice')}
              className="text-sm mb-4 opacity-50 hover:opacity-80 transition-opacity"
              style={{ color: tc.text }}
            >
              {t.back}
            </button>

            <h2 className="text-xl font-bold mb-5" style={{ color: tc.text }}>{t.teacherBtn}</h2>

            <form onSubmit={handleTeacherContinue} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: tc.textMuted }}>
                  {t.schoolLabel}
                </label>
                <input
                  type="text"
                  placeholder={t.schoolPlaceholder}
                  value={school}
                  onChange={e => setSchool(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: tc.textMuted }}>
                  {t.reasonLabel}
                </label>
                <textarea
                  placeholder={t.reasonPlaceholder}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              <button
                type="submit"
                disabled={!school.trim()}
                className="w-full py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 mt-1"
                style={{ background: tc.accentGradient, color: tc.accentText }}
              >
                {t.next}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
