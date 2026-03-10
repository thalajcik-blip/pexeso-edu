import { useState } from 'react'
import type { useAuth } from './useAuth'

type Props = {
  signIn: ReturnType<typeof useAuth>['signIn']
  signUp: ReturnType<typeof useAuth>['signUp']
  resetPassword: ReturnType<typeof useAuth>['resetPassword']
  signInWithGoogle: ReturnType<typeof useAuth>['signInWithGoogle']
}

type View = 'login' | 'register' | 'forgot'

export default function LoginScreen({ signIn, signUp, resetPassword, signInWithGoogle }: Props) {
  const [view, setView]         = useState<View>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)

  function switchView(v: View) {
    setView(v)
    setError('')
    setSuccess('')
    setPassword('')
    setPassword2('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (view === 'register' && password !== password2) {
      setError('Hesla se neshodují.')
      return
    }

    setLoading(true)

    if (view === 'login') {
      const err = await signIn(email, password)
      if (err) setError(err.message)
    } else if (view === 'register') {
      const err = await signUp(email, password)
      if (err) setError(err.message)
      else setSuccess('Registrace proběhla! Zkontrolujte svůj e-mail a potvrďte účet.')
    } else {
      const err = await resetPassword(email)
      if (err) setError(err.message)
      else setSuccess('Odkaz pro obnovu hesla byl odeslán na váš e-mail.')
    }

    setLoading(false)
  }

  const titles: Record<View, { heading: string; sub: string; btn: string; btnLoading: string }> = {
    login:    { heading: 'Pexedu Admin', sub: 'Přihlaste se pro správu sad', btn: 'Přihlásit se', btnLoading: 'Přihlašování…' },
    register: { heading: 'Nový účet',    sub: 'Vyplňte údaje pro registraci', btn: 'Registrovat se', btnLoading: 'Registrace…' },
    forgot:   { heading: 'Obnova hesla', sub: 'Zadejte e-mail a pošleme vám odkaz', btn: 'Odeslat odkaz', btnLoading: 'Odesílání…' },
  }

  const t = titles[view]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="text-2xl font-bold text-gray-800 mb-1">{t.heading}</div>
        <div className="text-sm text-gray-500 mb-6">{t.sub}</div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {view !== 'forgot' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Heslo</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={view === 'register' ? 8 : undefined}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          )}

          {view === 'register' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Heslo znovu</label>
              <input
                type="password"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          )}

          {error && (
            <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
          )}
          {success && (
            <div className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">{success}</div>
          )}

          {!success && (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {loading ? t.btnLoading : t.btn}
            </button>
          )}
        </form>

        {view === 'login' && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">nebo</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              onClick={() => signInWithGoogle()}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Přihlásit se přes Google
            </button>
          </>
        )}

        <div className="mt-5 flex flex-col gap-1.5 text-center">
          {view === 'login' && (
            <>
              <button onClick={() => switchView('forgot')} className="text-xs text-indigo-500 hover:underline">
                Zapomněli jste heslo?
              </button>
              <button onClick={() => switchView('register')} className="text-xs text-gray-500 hover:underline">
                Nemáte účet? Zaregistrujte se
              </button>
            </>
          )}
          {view !== 'login' && (
            <button onClick={() => switchView('login')} className="text-xs text-gray-500 hover:underline">
              ← Zpět na přihlášení
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
