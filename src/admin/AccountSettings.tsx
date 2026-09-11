import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useGameStore } from '../store/gameStore'
import { supabase } from '../services/supabase'
import { Avatar } from '../components/auth/Avatar'
import { AvatarPicker } from '../components/auth/AvatarPicker'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

const LANGS: Array<{ code: 'cs' | 'sk' | 'en'; flag: string; label: string }> = [
  { code: 'cs', flag: '🇨🇿', label: 'Čeština' },
  { code: 'sk', flag: '🇸🇰', label: 'Slovenčina' },
  { code: 'en', flag: '🇬🇧', label: 'English' },
]

export default function AccountSettings() {
  const language = useGameStore(s => s.language)
  const setLanguage = useGameStore(s => s.setLanguage)

  const { user, profile, _setUser, loadProfile, updateProfile, deleteAccount } = useAuthStore()

  // Bootstrap authStore — AdminApp doesn't mount the main app's auth listener.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { _setUser(session.user); loadProfile() }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'taken' | 'ok'>('idle')
  const [usernameSaved, setUsernameSaved] = useState(false)
  const [usernameChecking, setUsernameChecking] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)

  const [avatarId, setAvatarId] = useState(1)
  const [avatarSaved, setAvatarSaved] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) {
      setUsername(profile.username ?? '')
      setAvatarId(profile.avatar_id ?? 1)
    }
  }, [profile])

  const isGoogleUser = user?.app_metadata?.provider === 'google'

  useEffect(() => {
    if (!username || username === profile?.username) { setUsernameStatus('idle'); return }
    setUsernameChecking(true)
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle()
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

  async function saveAvatar() {
    await updateProfile({ avatar_id: avatarId } as never)
    setAvatarSaved(true)
    setTimeout(() => setAvatarSaved(false), 2000)
  }

  async function handleDelete() {
    setDeleting(true)
    const err = await deleteAccount()
    if (err) { setError(err); setDeleting(false); setConfirmDelete(false) }
  }

  if (!profile) return <div className="text-sm text-gray-400">Načítání…</div>

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Můj profil</h1>

      {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

      <Card className="rounded-2xl p-6 gap-0 space-y-3 shadow-none border-gray-100">
        <div className="text-sm font-semibold text-gray-700">Avatar</div>
        <div className="flex items-center gap-3 mb-1">
          <Avatar avatarId={avatarId} size={48} />
        </div>
        <AvatarPicker selected={avatarId} onChange={setAvatarId} accentColor="#4f46e5" />
        <Button size="sm" className="mt-2 w-fit" onClick={saveAvatar}>
          {avatarSaved ? 'Uloženo ✓' : 'Uložit avatar'}
        </Button>
      </Card>

      <Card className="rounded-2xl p-6 gap-0 space-y-2 shadow-none border-gray-100">
        <div className="text-sm font-semibold text-gray-700">Uživatelské jméno</div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              value={username}
              onChange={e => { setUsername(e.target.value); setUsernameSaved(false) }}
              placeholder="Zadej uživatelské jméno"
            />
            {!usernameChecking && usernameStatus !== 'idle' && (
              <div className={`text-xs mt-1 ${usernameStatus === 'taken' ? 'text-red-600' : 'text-green-600'}`}>
                {usernameStatus === 'taken' ? 'Toto jméno je již obsazeno' : 'Jméno je dostupné'}
              </div>
            )}
          </div>
          <Button
            onClick={saveUsername}
            disabled={!username || usernameStatus === 'taken' || username === profile?.username}
          >
            {usernameSaved ? 'Uloženo ✓' : 'Uložit'}
          </Button>
        </div>
      </Card>

      <Card className="rounded-2xl p-6 gap-0 space-y-2 shadow-none border-gray-100">
        <div className="text-sm font-semibold text-gray-700">Změna hesla</div>
        {isGoogleUser ? (
          <div className="text-xs text-gray-400">Přihlášen přes Google – heslo nelze změnit.</div>
        ) : (
          <div className="flex gap-2">
            <Input
              type="password"
              value={newPassword}
              onChange={e => { setNewPassword(e.target.value); setPasswordSaved(false) }}
              placeholder="Min. 6 znaků"
              onKeyDown={e => e.key === 'Enter' && savePassword()}
            />
            <Button onClick={savePassword} disabled={newPassword.length < 6}>
              {passwordSaved ? 'Změněno ✓' : 'Změnit heslo'}
            </Button>
          </div>
        )}
      </Card>

      <Card className="rounded-2xl p-6 gap-0 space-y-3 shadow-none border-gray-100">
        <div className="text-sm font-semibold text-gray-700">Soukromí</div>
        {([
          ['show_stats', profile.show_stats, 'Zobrazit statistiky na veřejném profilu'],
          ['show_favorites', profile.show_favorites, 'Zobrazit oblíbené sady'],
          ['show_activity', profile.show_activity, 'Zobrazit historii aktivit'],
        ] as const).map(([field, value, label]) => (
          <label key={field} className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-gray-600">{label}</span>
            <div
              onClick={() => savePrivacy(field, !value)}
              className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer shrink-0 ${value ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
            </div>
          </label>
        ))}
      </Card>

      <Card className="rounded-2xl p-6 gap-0 space-y-3 shadow-none border-gray-100">
        <div className="text-sm font-semibold text-gray-700">Jazyk</div>
        <div className="flex gap-2">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={async () => { setLanguage(l.code); await updateProfile({ locale: l.code } as never) }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                language === l.code ? 'border-indigo-300 bg-indigo-50 text-gray-800' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="rounded-2xl p-6 gap-0 space-y-3 shadow-none border-red-100">
        <div className="text-sm font-semibold text-red-600">Nebezpečná zóna</div>
        <Button variant="outline" className="w-fit text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
          Smazat účet
        </Button>
      </Card>

      <Dialog open={confirmDelete} onOpenChange={open => { if (!open && !deleting) setConfirmDelete(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Opravdu smazat účet?</DialogTitle>
            <DialogDescription>
              Tato akce je nevratná. Veškerá tvoje data budou trvale odstraněna, včetně přístupu do administrace.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Zrušit
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Mazání…' : 'Ano, smazat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
