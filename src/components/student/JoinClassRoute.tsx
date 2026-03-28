import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { supabase } from '../../services/supabase'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'

const MESSAGES = {
  cs: {
    notFound: 'Třída nebyla nalezena.',
    pleaseLogin: 'Pro připojení k třídě se přihlaste.',
    joined: (name: string) => `Připojení k třídě ${name}!`,
    joining: 'Připojování...',
    redirecting: 'Přesměrování...',
    backHome: '← Zpět na hlavní stránku',
    title: 'Připojit se k třídě',
  },
  sk: {
    notFound: 'Trieda nebola nájdená.',
    pleaseLogin: 'Pre pripojenie k triede sa prihláste.',
    joined: (name: string) => `Pripojenie k triede ${name}!`,
    joining: 'Pripájanie...',
    redirecting: 'Presmerovanie...',
    backHome: '← Späť na hlavnú stránku',
    title: 'Pripojiť sa k triede',
  },
  en: {
    notFound: 'Class not found.',
    pleaseLogin: 'Please sign in to join the class.',
    joined: (name: string) => `Joined class ${name}!`,
    joining: 'Joining...',
    redirecting: 'Redirecting...',
    backHome: '← Back to home',
    title: 'Join a class',
  },
} as const

async function lookupAndJoin(code: string, userId: string) {
  const { data: cls } = await supabase
    .from('classes')
    .select('id, name')
    .eq('invite_code', code)
    .maybeSingle()
  if (!cls) return null
  await supabase
    .from('class_members')
    .upsert({ class_id: cls.id, user_id: userId }, { onConflict: 'class_id,user_id' })
  return cls
}

export default function JoinClassRoute() {
  const language = useGameStore(s => s.language)
  const theme = useGameStore(s => s.theme)
  const tc = THEMES[theme]
  const msg = MESSAGES[language] ?? MESSAGES.cs

  const { user, isLoading, openAuthModalForLogin } = useAuthStore()
  const [status, setStatus] = useState<'loading' | 'not_found' | 'needs_login' | 'joining' | 'joined' | 'error'>('loading')
  const [className, setClassName] = useState<string>('')

  // Extract invite code from path /join/PX-XXXX
  const code = window.location.pathname.split('/join/')[1]?.toUpperCase().trim()

  // Step 1: verify the code exists
  useEffect(() => {
    if (!code) { setStatus('not_found'); return }

    supabase
      .from('classes')
      .select('id, name')
      .eq('invite_code', code)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) { setStatus('not_found'); return }
        setClassName(data.name)
        if (!user && !isLoading) {
          sessionStorage.setItem('pexedu_pending_join', code)
          setStatus('needs_login')
        } else if (user) {
          setStatus('joining')
        }
        // If isLoading, wait for auth to resolve (handled by next effect)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  // Step 2: open auth modal when we know we need login
  useEffect(() => {
    if (status === 'needs_login') {
      openAuthModalForLogin()
    }
  }, [status, openAuthModalForLogin])

  // Step 3: when user resolves from null (post-login), run join
  useEffect(() => {
    if (!user || !code) return
    if (status === 'joining' || status === 'needs_login' || status === 'loading') {
      setStatus('joining')
      lookupAndJoin(code, user.id).then(cls => {
        if (!cls) { setStatus('not_found'); return }
        setClassName(cls.name)
        setStatus('joined')
        sessionStorage.removeItem('pexedu_pending_join')
        toast.success(msg.joined(cls.name))
        setTimeout(() => { window.location.href = '/' }, 2000)
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Handle auth loading resolution when not logged in
  useEffect(() => {
    if (!isLoading && !user && status === 'loading' && code) {
      supabase
        .from('classes')
        .select('id, name')
        .eq('invite_code', code)
        .maybeSingle()
        .then(({ data }) => {
          if (!data) { setStatus('not_found'); return }
          setClassName(data.name)
          sessionStorage.setItem('pexedu_pending_join', code)
          setStatus('needs_login')
        })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 gap-6"
      style={{ background: tc.bg, color: tc.text, fontFamily: "'Readex Pro', sans-serif" }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 flex flex-col items-center gap-5 text-center"
        style={{ background: tc.surface, border: `1px solid ${tc.surfaceBorder}` }}
      >
        {status === 'loading' && (
          <>
            <div className="text-4xl">⏳</div>
            <div className="text-lg font-semibold">{msg.title}</div>
            <div className="text-sm" style={{ color: tc.textMuted }}>...</div>
          </>
        )}

        {status === 'not_found' && (
          <>
            <div className="text-4xl">❌</div>
            <div className="text-lg font-semibold">{msg.notFound}</div>
            <a
              href="/"
              className="text-sm underline"
              style={{ color: tc.textMuted }}
            >
              {msg.backHome}
            </a>
          </>
        )}

        {status === 'needs_login' && (
          <>
            <div className="text-4xl">🔐</div>
            <div className="text-lg font-semibold">{msg.title}</div>
            {className && (
              <div className="font-bold text-xl" style={{ color: tc.accent }}>{className}</div>
            )}
            <div className="text-sm" style={{ color: tc.textMuted }}>{msg.pleaseLogin}</div>
            <button
              onClick={openAuthModalForLogin}
              className="w-full py-3 rounded-xl font-bold transition-all hover:opacity-90"
              style={{ background: tc.accentGradient, color: tc.accentText }}
            >
              {language === 'cs' ? 'Přihlásit se' : language === 'sk' ? 'Prihlásiť sa' : 'Sign in'}
            </button>
            <a href="/" className="text-sm underline" style={{ color: tc.textMuted }}>
              {msg.backHome}
            </a>
          </>
        )}

        {status === 'joining' && (
          <>
            <div className="text-4xl">⏳</div>
            <div className="text-lg font-semibold">{msg.title}</div>
            {className && (
              <div className="font-bold text-xl" style={{ color: tc.accent }}>{className}</div>
            )}
            <div className="text-sm" style={{ color: tc.textMuted }}>{msg.joining}</div>
          </>
        )}

        {status === 'joined' && (
          <>
            <div className="text-4xl">✅</div>
            <div className="text-lg font-semibold">{msg.joined(className)}</div>
            <div className="text-sm" style={{ color: tc.textMuted }}>{msg.redirecting}</div>
          </>
        )}
      </div>
    </div>
  )
}
