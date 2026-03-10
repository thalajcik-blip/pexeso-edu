import { useState } from 'react'
import type { useAuth } from './useAuth'

type Props = {
  signIn: ReturnType<typeof useAuth>['signIn']
  signUp: ReturnType<typeof useAuth>['signUp']
  resetPassword: ReturnType<typeof useAuth>['resetPassword']
}

type View = 'login' | 'register' | 'forgot'

export default function LoginScreen({ signIn, signUp, resetPassword }: Props) {
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
