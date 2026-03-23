import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'

type Tab = 'login' | 'register'
type Method = 'email' | 'magic'
type SignUpStep = 'intent' | 'teacher-form' | 'credentials'

const TEXTS = {
  cs: {
    login: 'Přihlásit se', register: 'Registrovat',
    google: 'Pokračovat přes Google', or: 'nebo',
    emailLabel: 'E-mail', passwordLabel: 'Heslo',
    submit_login: 'Přihlásit se', submit_register: 'Registrovat',
    magicBtn: 'Poslat magic link',
    magicHint: 'Pošleme vám odkaz na přihlášení na e-mail.',
    magicSent: '✓ Odkaz odeslán! Zkontrolujte e-mail.',
    checkEmail: '✓ Zkontrolujte e-mail pro potvrzení registrace.',
    switchToMagic: 'Přihlásit se bez hesla →',
    switchToEmail: '← Zpět na heslo',
    // Intent
    whoAreYou: 'Kdo jsi?',
    playerBtn: '🎮 Chci hrát',
    playerDesc: 'Studenti, děti, kdokoliv kdo se chce učit hraním',
    teacherBtn: '👨‍🏫 Jsem učitel/ka',
    teacherDesc: 'Vytvářejte sady karet a spravujte svou třídu',
    alreadyHaveAccount: 'Už mám účet → Přihlásit se',
    // Teacher form
    schoolLabel: 'Název školy',
    schoolPlaceholder: 'ZŠ Brno, Masarykova 1',
    reasonLabel: 'Proč chcete pexedu používat? (volitelné)',
    reasonPlaceholder: 'Např. výuka angličtiny, přírodověda…',
    continueBtn: 'Pokračovat →',
    back: '← Zpět',
  },
  sk: {
    login: 'Prihlásiť sa', register: 'Registrovať',
    google: 'Pokračovať cez Google', or: 'alebo',
    emailLabel: 'E-mail', passwordLabel: 'Heslo',
    submit_login: 'Prihlásiť sa', submit_register: 'Registrovať',
    magicBtn: 'Poslať magic link',
    magicHint: 'Pošleme vám odkaz na prihlásenie na e-mail.',
    magicSent: '✓ Odkaz odoslaný! Skontrolujte e-mail.',
    checkEmail: '✓ Skontrolujte e-mail pre potvrdenie registrácie.',
    switchToMagic: 'Prihlásiť sa bez hesla →',
    switchToEmail: '← Späť na heslo',
    whoAreYou: 'Kto si?',
    playerBtn: '🎮 Chcem hrať',
    playerDesc: 'Študenti, deti, každý kto sa chce učiť hraním',
    teacherBtn: '👨‍🏫 Som učiteľ/ka',
    teacherDesc: 'Vytvárajte sady kariet a spravujte svoju triedu',
    alreadyHaveAccount: 'Už mám účet → Prihlásiť sa',
    schoolLabel: 'Názov školy',
    schoolPlaceholder: 'ZŠ Bratislava, Hlavná 1',
    reasonLabel: 'Prečo chcete pexedu používať? (voliteľné)',
    reasonPlaceholder: 'Napr. výučba angličtiny, prírodoveda…',
    continueBtn: 'Pokračovať →',
    back: '← Späť',
  },
  en: {
    login: 'Sign in', register: 'Sign up',
    google: 'Continue with Google', or: 'or',
    emailLabel: 'Email', passwordLabel: 'Password',
    submit_login: 'Sign in', submit_register: 'Sign up',
    magicBtn: 'Send magic link',
    magicHint: "We'll send you a sign-in link by email.",
    magicSent: '✓ Link sent! Check your email.',
    checkEmail: '✓ Check your email to confirm your account.',
    switchToMagic: 'Sign in without password →',
    switchToEmail: '← Back to password',
    whoAreYou: 'Who are you?',
    playerBtn: '🎮 I want to play',
    playerDesc: 'Students, kids, anyone who wants to learn through games',
    teacherBtn: '👨‍🏫 I\'m a teacher',
    teacherDesc: 'Create card sets and manage your class',
    alreadyHaveAccount: 'Already have an account? Sign in',
    schoolLabel: 'School name',
    schoolPlaceholder: 'Springfield Elementary School',
    reasonLabel: 'Why do you want to use pexedu? (optional)',
    reasonPlaceholder: 'e.g. English vocabulary, science…',
    continueBtn: 'Continue →',
    back: '← Back',
  },
}

export default function AuthModal() {
  const theme    = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t  = TEXTS[language] ?? TEXTS['cs']

  const { closeAuthModal, signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithMagicLink, authModalTab } = useAuthStore()

  const [tab, setTab]           = useState<Tab>(authModalTab)
  const [signUpStep, setSignUpStep] = useState<SignUpStep>('intent')
  const [method, setMethod]     = useState<Method>('email')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [school, setSchool]     = useState('')
  const [reason, setReason]     = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)

  function reset() { setError(''); setSuccess('') }

  function handleTabChange(newTab: Tab) {
    setTab(newTab)
    setSignUpStep('intent')
    reset()
  }

  function handlePlayerIntent() {
    localStorage.setItem('pexedu_intent', 'player')
    useAuthStore.setState({ registrationType: 'player' })
    setSignUpStep('credentials')
    reset()
  }

  function handleTeacherIntentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!school.trim()) return
    const formData = { school: school.trim(), reason: reason.trim() }
    localStorage.setItem('pexedu_intent', 'pending_teacher')
    localStorage.setItem('pexedu_teacher_form', JSON.stringify(formData))
    useAuthStore.setState({ registrationType: 'pending_teacher', teacherFormData: formData })
    setSignUpStep('credentials')
    reset()
  }

  async function handleGoogleSignUp() {
    // intent already stored — proceed with Google OAuth
    useAuthStore.getState().signInWithGoogle()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    reset()
    setLoading(true)

    if (method === 'magic') {
      const err = await signInWithMagicLink(email)
      setLoading(false)
      if (err) setError(err)
      else setSuccess(t.magicSent)
      return
    }

    if (tab === 'login') {
      const err = await signInWithEmail(email, password)
      setLoading(false)
      if (err) setError(err)
      else closeAuthModal()
    } else {
      const err = await signUpWithEmail(email, password)
      setLoading(false)
      if (err) setError(err)
      else setSuccess(t.checkEmail)
    }
  }

  const inputStyle: React.CSSProperties = {
    background: tc.btnInactiveBg,
    borderColor: tc.btnInactiveBorder,
    color: tc.text,
    outline: 'none',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: tc.overlayBg }}
      onMouseDown={e => { if (e.target === e.currentTarget) closeAuthModal() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 relative"
        style={{ background: tc.modalSurface, border: `1px solid ${tc.modalSurfaceBorder}` }}
      >
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 text-lg leading-none transition-opacity opacity-40 hover:opacity-80"
          style={{ color: tc.text }}
        >
          ✕
        </button>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden mb-5 p-0.5" style={{ background: tc.btnInactiveBg }}>
          {(['login', 'register'] as Tab[]).map(v => (
            <button
              key={v}
              onClick={() => handleTabChange(v)}
              className="flex-1 py-2 text-sm font-semibold transition-all rounded-xl"
              style={{
                background: tab === v ? tc.accentGradient : 'transparent',
                color: tab === v ? tc.accentText : tc.textMuted,
              }}
            >
              {v === 'login' ? t.login : t.register}
            </button>
          ))}
        </div>

        {/* ── SIGN IN ── */}
        {tab === 'login' && (
          <>
            <button
              onClick={signInWithGoogle}
              className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mb-4 border transition-opacity hover:opacity-80"
              style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder, color: tc.text }}
            >
              <GoogleIcon />
              {t.google}
            </button>

            <Divider tc={tc} label={t.or} />

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input type="email" placeholder={t.emailLabel} value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 rounded-xl text-sm border" style={inputStyle} />
              {method === 'email' && (
                <input type="password" placeholder={t.passwordLabel} value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-3 py-2.5 rounded-xl text-sm border" style={inputStyle} />
              )}
              {method === 'magic' && <p className="text-xs text-center" style={{ color: tc.textMuted }}>{t.magicHint}</p>}
              {error   && <p className="text-xs text-center text-red-400">{error}</p>}
              {success && <p className="text-xs text-center text-green-400">{success}</p>}
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 mt-1" style={{ background: tc.accentGradient, color: tc.accentText }}>
                {loading ? '…' : method === 'magic' ? t.magicBtn : t.submit_login}
              </button>
            </form>
            <button onClick={() => { setMethod(m => m === 'email' ? 'magic' : 'email'); reset() }} className="mt-3 w-full text-xs text-center transition-opacity opacity-50 hover:opacity-80" style={{ color: tc.text }}>
              {method === 'email' ? t.switchToMagic : t.switchToEmail}
            </button>
          </>
        )}

        {/* ── SIGN UP — INTENT ── */}
        {tab === 'register' && signUpStep === 'intent' && (
          <>
            <p className="text-base font-bold mb-4" style={{ color: tc.text }}>{t.whoAreYou}</p>
            <div className="flex flex-col gap-3">
              <button onClick={handlePlayerIntent} className="w-full text-left p-4 rounded-xl border transition-all hover:opacity-90" style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder }}>
                <div className="font-bold text-sm mb-0.5" style={{ color: tc.text }}>{t.playerBtn}</div>
                <div className="text-xs" style={{ color: tc.textMuted }}>{t.playerDesc}</div>
              </button>
              <button onClick={() => setSignUpStep('teacher-form')} className="w-full text-left p-4 rounded-xl border transition-all hover:opacity-90" style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder }}>
                <div className="font-bold text-sm mb-0.5" style={{ color: tc.text }}>{t.teacherBtn}</div>
                <div className="text-xs" style={{ color: tc.textMuted }}>{t.teacherDesc}</div>
              </button>
            </div>
            <button onClick={() => handleTabChange('login')} className="mt-5 w-full text-xs text-center opacity-50 hover:opacity-80 transition-opacity" style={{ color: tc.text }}>
              {t.alreadyHaveAccount}
            </button>
          </>
        )}

        {/* ── SIGN UP — TEACHER FORM ── */}
        {tab === 'register' && signUpStep === 'teacher-form' && (
          <>
            <button onClick={() => setSignUpStep('intent')} className="text-sm mb-4 opacity-50 hover:opacity-80 transition-opacity" style={{ color: tc.text }}>{t.back}</button>
            <p className="text-base font-bold mb-4" style={{ color: tc.text }}>{t.teacherBtn}</p>
            <form onSubmit={handleTeacherIntentSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: tc.textMuted }}>{t.schoolLabel}</label>
                <input type="text" placeholder={t.schoolPlaceholder} value={school} onChange={e => setSchool(e.target.value)} required className="w-full px-3 py-2.5 rounded-xl text-sm border" style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: tc.textMuted }}>{t.reasonLabel}</label>
                <textarea placeholder={t.reasonPlaceholder} value={reason} onChange={e => setReason(e.target.value)} rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm border" style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <button type="submit" disabled={!school.trim()} className="w-full py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 mt-1" style={{ background: tc.accentGradient, color: tc.accentText }}>
                {t.continueBtn}
              </button>
            </form>
          </>
        )}

        {/* ── SIGN UP — CREDENTIALS ── */}
        {tab === 'register' && signUpStep === 'credentials' && (
          <>
            <button onClick={() => setSignUpStep('intent')} className="text-sm mb-4 opacity-50 hover:opacity-80 transition-opacity" style={{ color: tc.text }}>{t.back}</button>

            <button onClick={handleGoogleSignUp} className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mb-4 border transition-opacity hover:opacity-80" style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder, color: tc.text }}>
              <GoogleIcon />
              {t.google}
            </button>

            <Divider tc={tc} label={t.or} />

            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <input type="email" placeholder={t.emailLabel} value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-3 py-2.5 rounded-xl text-sm border" style={inputStyle} />
              <input type="password" placeholder={t.passwordLabel} value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-3 py-2.5 rounded-xl text-sm border" style={inputStyle} />
              {error   && <p className="text-xs text-center text-red-400">{error}</p>}
              {success && <p className="text-xs text-center text-green-400">{success}</p>}
              <button type="submit" disabled={loading} className="w-full py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 mt-1" style={{ background: tc.accentGradient, color: tc.accentText }}>
                {loading ? '…' : t.submit_register}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function Divider({ tc, label }: { tc: any; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex-1 h-px" style={{ background: tc.btnInactiveBorder }} />
      <span className="text-xs" style={{ color: tc.textDim }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: tc.btnInactiveBorder }} />
    </div>
  )
}
