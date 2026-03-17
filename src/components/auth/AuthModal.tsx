import { useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'

type Tab = 'login' | 'register'
type Method = 'email' | 'magic'

const TEXTS = {
  cs: {
    login: 'Přihlásit se', register: 'Registrovat',
    google: 'Pokračovat přes Google', or: 'nebo',
    emailLabel: 'E-mail', passwordLabel: 'Heslo',
    submit_login: 'Přihlásit se', submit_register: 'Registrovat',
    magicBtn: 'Poslat magic link',
    magicHint: 'Pošleme ti odkaz na přihlášení na e-mail.',
    magicSent: '✓ Odkaz odeslán! Zkontroluj e-mail.',
    checkEmail: '✓ Zkontroluj e-mail pro potvrzení registrace.',
    switchToMagic: 'Přihlásit se bez hesla →',
    switchToEmail: '← Zpět na heslo',
  },
  sk: {
    login: 'Prihlásiť sa', register: 'Registrovať',
    google: 'Pokračovať cez Google', or: 'alebo',
    emailLabel: 'E-mail', passwordLabel: 'Heslo',
    submit_login: 'Prihlásiť sa', submit_register: 'Registrovať',
    magicBtn: 'Poslať magic link',
    magicHint: 'Pošleme ti odkaz na prihlásenie na e-mail.',
    magicSent: '✓ Odkaz odoslaný! Skontroluj e-mail.',
    checkEmail: '✓ Skontroluj e-mail pre potvrdenie registrácie.',
    switchToMagic: 'Prihlásiť sa bez hesla →',
    switchToEmail: '← Späť na heslo',
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
  },
}

export default function AuthModal() {
  const theme    = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t  = TEXTS[language] ?? TEXTS['cs']

  const { closeAuthModal, signInWithGoogle, signInWithEmail, signUpWithEmail, signInWithMagicLink } = useAuthStore()

  const [tab, setTab]         = useState<Tab>('login')
  const [method, setMethod]   = useState<Method>('email')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function reset() { setError(''); setSuccess('') }

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
      onClick={e => { if (e.target === e.currentTarget) closeAuthModal() }}
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
              onClick={() => { setTab(v); reset() }}
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

        {/* Google */}
        <button
          onClick={signInWithGoogle}
          className="w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mb-4 border transition-opacity hover:opacity-80"
          style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder, color: tc.text }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {t.google}
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-px" style={{ background: tc.btnInactiveBorder }} />
          <span className="text-xs" style={{ color: tc.textDim }}>{t.or}</span>
          <div className="flex-1 h-px" style={{ background: tc.btnInactiveBorder }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder={t.emailLabel}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2.5 rounded-xl text-sm border"
            style={inputStyle}
          />
          {method === 'email' && (
            <input
              type="password"
              placeholder={t.passwordLabel}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-xl text-sm border"
              style={inputStyle}
            />
          )}
          {method === 'magic' && (
            <p className="text-xs text-center" style={{ color: tc.textMuted }}>{t.magicHint}</p>
          )}

          {error   && <p className="text-xs text-center text-red-400">{error}</p>}
          {success && <p className="text-xs text-center text-green-400">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 mt-1"
            style={{ background: tc.accentGradient, color: tc.accentText }}
          >
            {loading
              ? '…'
              : method === 'magic'
              ? t.magicBtn
              : tab === 'login' ? t.submit_login : t.submit_register}
          </button>
        </form>

        {/* Magic link toggle — only for login tab */}
        {tab === 'login' && (
          <button
            onClick={() => { setMethod(m => m === 'email' ? 'magic' : 'email'); reset() }}
            className="mt-3 w-full text-xs text-center transition-opacity opacity-50 hover:opacity-80"
            style={{ color: tc.text }}
          >
            {method === 'email' ? t.switchToMagic : t.switchToEmail}
          </button>
        )}
      </div>
    </div>
  )
}
