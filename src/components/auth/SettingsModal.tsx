import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import { supabase } from '../../services/supabase'

const TEXTS = {
  cs: {
    title: 'Nastavení účtu',
    sectionAccount: 'Účet',
    username: 'Uživatelské jméno',
    usernamePlaceholder: 'Zadej uživatelské jméno',
    usernameTaken: 'Toto jméno je již obsazeno',
    usernameOk: 'Jméno je dostupné',
    save: 'Uložit',
    saved: 'Uloženo ✓',
    sectionPassword: 'Změna hesla',
    newPassword: 'Nové heslo',
    newPasswordPlaceholder: 'Min. 6 znaků',
    changePassword: 'Změnit heslo',
    passwordChanged: 'Heslo změněno ✓',
    sectionPrivacy: 'Soukromí',
    showStats: 'Zobrazit statistiky na veřejném profilu',
    showFavorites: 'Zobrazit oblíbené sady',
    showActivity: 'Zobrazit historii aktivit',
    sectionDanger: 'Nebezpečná zóna',
    deleteAccount: 'Smazat účet',
    deleteConfirmTitle: 'Opravdu smazat účet?',
    deleteConfirmText: 'Tato akce je nevratná. Veškerá tvoje data budou trvale odstraněna.',
    deleteConfirmBtn: 'Ano, smazat',
    cancel: 'Zrušit',
    close: '✕',
    error: 'Nastala chyba, zkus to znovu.',
    googleUser: 'Přihlášen přes Google – heslo nelze změnit.',
  },
  sk: {
    title: 'Nastavenia účtu',
    sectionAccount: 'Účet',
    username: 'Používateľské meno',
    usernamePlaceholder: 'Zadaj používateľské meno',
    usernameTaken: 'Toto meno je už obsadené',
    usernameOk: 'Meno je dostupné',
    save: 'Uložiť',
    saved: 'Uložené ✓',
    sectionPassword: 'Zmena hesla',
    newPassword: 'Nové heslo',
    newPasswordPlaceholder: 'Min. 6 znakov',
    changePassword: 'Zmeniť heslo',
    passwordChanged: 'Heslo zmenené ✓',
    sectionPrivacy: 'Súkromie',
    showStats: 'Zobraziť štatistiky na verejnom profile',
    showFavorites: 'Zobraziť obľúbené sady',
    showActivity: 'Zobraziť históriu aktivít',
    sectionDanger: 'Nebezpečná zóna',
    deleteAccount: 'Zmazať účet',
    deleteConfirmTitle: 'Naozaj zmazať účet?',
    deleteConfirmText: 'Táto akcia je nevratná. Všetky tvoje dáta budú trvalo odstránené.',
    deleteConfirmBtn: 'Áno, zmazať',
    cancel: 'Zrušiť',
    close: '✕',
    error: 'Nastala chyba, skús to znova.',
    googleUser: 'Prihlásený cez Google – heslo nie je možné zmeniť.',
  },
  en: {
    title: 'Account settings',
    sectionAccount: 'Account',
    username: 'Username',
    usernamePlaceholder: 'Enter username',
    usernameTaken: 'This name is already taken',
    usernameOk: 'Name is available',
    save: 'Save',
    saved: 'Saved ✓',
    sectionPassword: 'Change password',
    newPassword: 'New password',
    newPasswordPlaceholder: 'Min. 6 characters',
    changePassword: 'Change password',
    passwordChanged: 'Password changed ✓',
    sectionPrivacy: 'Privacy',
    showStats: 'Show stats on public profile',
    showFavorites: 'Show favourite sets',
    showActivity: 'Show activity history',
    sectionDanger: 'Danger zone',
    deleteAccount: 'Delete account',
    deleteConfirmTitle: 'Really delete account?',
    deleteConfirmText: 'This action is irreversible. All your data will be permanently removed.',
    deleteConfirmBtn: 'Yes, delete',
    cancel: 'Cancel',
    close: '✕',
    error: 'Something went wrong, please try again.',
    googleUser: 'Signed in with Google – password cannot be changed.',
  },
}

export default function SettingsModal() {
  const theme    = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t  = TEXTS[language]

  const { user, profile, updateProfile, closeSettingsModal, deleteAccount } = useAuthStore()

  // Username
  const [username, setUsername]         = useState(profile?.username ?? '')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'taken' | 'ok'>('idle')
  const [usernameSaved, setUsernameSaved]   = useState(false)
  const [usernameChecking, setUsernameChecking] = useState(false)

  // Password
  const [newPassword, setNewPassword]   = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  // Privacy
  const [showStats, setShowStats]       = useState(profile?.show_stats ?? true)
  const [showFavorites, setShowFavorites] = useState(profile?.show_favorites ?? true)
  const [showActivity, setShowActivity] = useState(profile?.show_activity ?? false)

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)

  const [error, setError] = useState('')

  const isGoogleUser = user?.app_metadata?.provider === 'google'

  // Debounced username uniqueness check
  useEffect(() => {
    if (!username || username === profile?.username) { setUsernameStatus('idle'); return }
    setUsernameChecking(true)
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .maybeSingle()
      setUsernameStatus(data ? 'taken' : 'ok')
      setUsernameChecking(false)
    }, 400)
    return () => clearTimeout(t)
  }, [username, profile?.username])

  async function saveUsername() {
    if (!username || usernameStatus === 'taken') return
    setError('')
    await updateProfile({ username } as never)
    setUsernameSaved(true)
    setTimeout(() => setUsernameSaved(false), 2000)
  }

  async function savePassword() {
    if (newPassword.length < 6) return
    setError('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setError(error.message); return }
    setNewPassword('')
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 2000)
  }

  async function savePrivacy(field: 'show_stats' | 'show_favorites' | 'show_activity', value: boolean) {
    await updateProfile({ [field]: value } as never)
  }

  async function handleDelete() {
    setDeleting(true)
    const err = await deleteAccount()
    if (err) { setError(err); setDeleting(false); setConfirmDelete(false) }
  }

  const inputStyle = {
    background: tc.btnInactiveBg,
    borderColor: tc.btnInactiveBorder,
    color: tc.text,
  }

  const sectionLabel = { color: tc.textMuted, fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase' as const, fontWeight: 600, marginBottom: '0.5rem' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: tc.overlayBg }}
      onClick={closeSettingsModal}
    >
      <div
        className="w-full max-w-sm rounded-lg p-6 space-y-5 max-h-[90vh] overflow-y-auto"
        style={{ background: tc.modalSurface, border: `1px solid ${tc.modalSurfaceBorder}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="font-bold text-lg" style={{ color: tc.text }}>{t.title}</div>
          <button onClick={closeSettingsModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-sm opacity-50 hover:opacity-100" style={{ color: tc.text }}>
            {t.close}
          </button>
        </div>

        {error && <div className="text-xs rounded-lg px-3 py-2" style={{ background: tc.errorBg, color: tc.errorColor }}>{error}</div>}

        {/* Username */}
        <div>
          <div style={sectionLabel}>{t.sectionAccount}</div>
          <div className="text-xs mb-1" style={{ color: tc.textMuted }}>{t.username}</div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                value={username}
                onChange={e => { setUsername(e.target.value); setUsernameSaved(false) }}
                placeholder={t.usernamePlaceholder}
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{
                  ...inputStyle,
                  borderColor: usernameStatus === 'taken' ? tc.errorColor : usernameStatus === 'ok' ? tc.accent : tc.btnInactiveBorder,
                }}
                onKeyDown={e => e.key === 'Enter' && saveUsername()}
              />
              {!usernameChecking && usernameStatus !== 'idle' && (
                <div className="text-xs mt-1" style={{ color: usernameStatus === 'taken' ? tc.errorColor : tc.accent }}>
                  {usernameStatus === 'taken' ? t.usernameTaken : t.usernameOk}
                </div>
              )}
            </div>
            <button
              onClick={saveUsername}
              disabled={!username || usernameStatus === 'taken' || username === profile?.username}
              className="px-3 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40"
              style={{ background: tc.accentGradient, color: tc.accentText }}
            >
              {usernameSaved ? t.saved : t.save}
            </button>
          </div>
        </div>

        {/* Password */}
        <div>
          <div style={sectionLabel}>{t.sectionPassword}</div>
          {isGoogleUser ? (
            <div className="text-xs" style={{ color: tc.textMuted }}>{t.googleUser}</div>
          ) : (
            <div className="flex gap-2">
              <input
                type="password"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPasswordSaved(false) }}
                placeholder={t.newPasswordPlaceholder}
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
                style={inputStyle}
                onKeyDown={e => e.key === 'Enter' && savePassword()}
              />
              <button
                onClick={savePassword}
                disabled={newPassword.length < 6}
                className="px-3 py-2 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-40 whitespace-nowrap"
                style={{ background: tc.accentGradient, color: tc.accentText }}
              >
                {passwordSaved ? t.passwordChanged : t.changePassword}
              </button>
            </div>
          )}
        </div>

        {/* Privacy */}
        <div>
          <div style={sectionLabel}>{t.sectionPrivacy}</div>
          <div className="space-y-2">
            {([
              ['show_stats', showStats, setShowStats, t.showStats],
              ['show_favorites', showFavorites, setShowFavorites, t.showFavorites],
              ['show_activity', showActivity, setShowActivity, t.showActivity],
            ] as const).map(([field, value, setter, label]) => (
              <label key={field} className="flex items-center gap-3 cursor-pointer">
                <div
                  className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0"
                  style={{ background: value ? tc.accentGradient : tc.btnInactiveBg, border: `1px solid ${value ? tc.accent : tc.btnInactiveBorder}` }}
                  onClick={() => {
                    const next = !value
                    setter(next)
                    savePrivacy(field, next)
                  }}
                >
                  <div
                    className="absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all"
                    style={{ background: value ? tc.accentText : tc.textMuted, left: value ? 'calc(100% - 1rem)' : '2px' }}
                  />
                </div>
                <span className="text-sm" style={{ color: tc.text }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div>
          <div style={{ ...sectionLabel, color: tc.errorColor }}>{t.sectionDanger}</div>
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm px-3 py-2 rounded-lg border transition-opacity hover:opacity-80"
              style={{ color: tc.errorColor, borderColor: tc.errorColor, background: tc.errorBg }}
            >
              {t.deleteAccount}
            </button>
          ) : (
            <div className="rounded-lg p-4 space-y-3" style={{ background: tc.errorBg, border: `1px solid ${tc.errorColor}` }}>
              <div className="font-semibold text-sm" style={{ color: tc.errorColor }}>{t.deleteConfirmTitle}</div>
              <div className="text-xs" style={{ color: tc.errorColor }}>{t.deleteConfirmText}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 py-2 rounded-lg text-sm border"
                  style={{ borderColor: tc.btnInactiveBorder, color: tc.textMuted }}
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-lg text-sm font-bold disabled:opacity-50"
                  style={{ background: tc.errorColor, color: '#fff' }}
                >
                  {deleting ? '…' : t.deleteConfirmBtn}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
