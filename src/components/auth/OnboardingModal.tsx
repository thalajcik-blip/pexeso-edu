import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import { supabase } from '../../services/supabase'
import { Avatar } from './Avatar'
import { AvatarPicker } from './AvatarPicker'

const TEXTS = {
  cs: {
    titleUsername: 'Vítej! Zvol si přezdívku.',
    titleAvatar: 'Vyber si avatar.',
    placeholder: 'Přezdívka (3–20 znaků)',
    taken: 'Tato přezdívka je obsazená.',
    tooShort: 'Minimálně 3 znaky.',
    next: 'Dál →',
    save: 'Hotovo →',
    saving: 'Ukládání…',
  },
  sk: {
    titleUsername: 'Vitaj! Vyber si prezývku.',
    titleAvatar: 'Vyber si avatar.',
    placeholder: 'Prezývka (3–20 znakov)',
    taken: 'Táto prezývka je obsadená.',
    tooShort: 'Minimálne 3 znaky.',
    next: 'Ďalej →',
    save: 'Hotovo →',
    saving: 'Ukladanie…',
  },
  en: {
    titleUsername: 'Welcome! Choose a username.',
    titleAvatar: 'Pick your avatar.',
    placeholder: 'Username (3–20 characters)',
    taken: 'This username is already taken.',
    tooShort: 'At least 3 characters.',
    next: 'Next →',
    save: 'Done →',
    saving: 'Saving…',
  },
}

export default function OnboardingModal() {
  const theme    = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t  = TEXTS[language] ?? TEXTS['cs']

  const { user, completeOnboarding } = useAuthStore()

  const [step,     setStep]     = useState<'username' | 'avatar'>('username')
  const [username, setUsername] = useState('')
  const [avatarId, setAvatarId] = useState(1)
  const [checking, setChecking] = useState(false)
  const [taken,    setTaken]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  // Pre-fill from Google display name
  useEffect(() => {
    const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? ''
    if (name) setUsername((name as string).slice(0, 20).replace(/\s+/g, '_'))
  }, [user])

  // Debounced uniqueness check
  useEffect(() => {
    if (username.length < 3) { setTaken(false); return }
    setChecking(true)
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      setTaken(!!data)
      setChecking(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [username])

  async function handleSave() {
    if (saving) return
    setSaving(true)
    const err = await completeOnboarding(username.trim(), avatarId)
    setSaving(false)
    if (err) { setError(err); return }
    const { registrationType: regType, openTeacherPendingModal } = useAuthStore.getState()
    if (regType === 'player') {
      toast.success(`🎮 Vítej, ${username.trim()}! Účet je připraven.`, { duration: 4000 })
      useAuthStore.setState({ registrationType: null })
    } else if (regType === 'pending_teacher') {
      openTeacherPendingModal()
      useAuthStore.setState({ registrationType: null })
    }
  }

  const invalid = username.length < 3 || taken || checking
  const accentColor = theme === 'light' ? '#6d41a1' : '#f9d74e'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: tc.overlayBg }}>
      <div
        className="w-full max-w-xs rounded-lg p-7 text-center space-y-4"
        style={{ background: tc.modalSurface, border: `1px solid ${tc.modalSurfaceBorder}`, color: tc.text }}
      >
        {step === 'username' ? (
          <>
            <div className="text-4xl">👋</div>
            <p className="font-bold text-lg">{t.titleUsername}</p>

            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.slice(0, 20))}
                placeholder={t.placeholder}
                maxLength={20}
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg text-sm border outline-none text-center"
                style={{
                  background: tc.btnInactiveBg,
                  borderColor: taken ? '#ef4444' : !invalid && username.length >= 3 ? tc.accent : tc.btnInactiveBorder,
                  color: tc.text,
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !invalid) setStep('avatar') }}
              />
              {checking && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: tc.textDim }}>…</span>
              )}
            </div>

            {taken && <p className="text-xs text-red-400">{t.taken}</p>}
            {!taken && username.length > 0 && username.length < 3 && (
              <p className="text-xs" style={{ color: tc.textDim }}>{t.tooShort}</p>
            )}

            <button
              onClick={() => setStep('avatar')}
              disabled={invalid}
              className="w-full py-2.5 rounded-lg font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: tc.accentGradient, color: tc.accentText }}
            >
              {t.next}
            </button>
          </>
        ) : (
          <>
            <Avatar avatarId={avatarId} size={64} className="mx-auto" />
            <p className="font-bold text-lg">{t.titleAvatar}</p>

            <AvatarPicker selected={avatarId} onChange={setAvatarId} accentColor={accentColor} />

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 rounded-lg font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: tc.accentGradient, color: tc.accentText }}
            >
              {saving ? t.saving : t.save}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
