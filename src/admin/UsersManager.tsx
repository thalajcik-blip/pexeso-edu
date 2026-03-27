import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDown, Trash2 } from 'lucide-react'

type UserRow = {
  id: string
  email: string
  roles: string[]
  created_at: string
  username: string | null
}


export default function UsersManager() {
  const [users, setUsers]             = useState<UserRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState<string | null>(null)
  const [error, setError]             = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]       = useState(false)

  const confirmDeleteUser = users.find(u => u.id === confirmDeleteId) ?? null

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_users_with_roles')
    if (error) setError(error.message)
    else setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  async function deleteUser(userId: string) {
    setDeleting(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ userId, callerToken: session?.access_token }),
        }
      )
      const text = await res.text()
      let json: Record<string, string> = {}
      try { json = JSON.parse(text) } catch { /* not JSON */ }
      setDeleting(false)
      setConfirmDeleteId(null)
      if (!res.ok) {
        setError(`[${res.status}] ${json.error ?? text ?? 'Chyba při mazání'}`)
        return
      }
      await fetchUsers()
    } catch (e) {
      setDeleting(false)
      setConfirmDeleteId(null)
      setError(String(e))
    }
  }

  async function setRole(userId: string, newRole: string | null) {
    setSaving(userId)
    const newRoles = newRole === null
      ? ['player']
      : newRole === 'superadmin'
        ? ['superadmin', 'teacher', 'player']
        : ['teacher', 'player']
    const { error } = await supabase
      .from('profiles')
      .update({ roles: newRoles })
      .eq('id', userId)
    if (error) setError(error.message)
    await fetchUsers()
    setSaving(null)
  }

  function displayRole(roles: string[]): string {
    if (roles.includes('superadmin')) return 'Superadmin'
    if (roles.includes('teacher')) return 'Učitel'
    return 'Hráč'
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Uživatelé</h1>

      {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400">Načítání…</div>
      ) : (
        <Card className="rounded-2xl p-0 gap-0 border-gray-100 shadow-none overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">E-mail</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Hráčské jméno</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Registrace</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-700">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500 text-sm">
                    {u.username ?? <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('cs-CZ')}
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-36 justify-between font-normal text-xs" disabled={saving === u.id}>
                          {displayRole(u.roles)}
                          <ChevronDown className="size-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-36">
                        <DropdownMenuItem onClick={() => setRole(u.id, null)}>Hráč</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRole(u.id, 'teacher')}>Učitel</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRole(u.id, 'superadmin')}>Superadmin</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(u.id)}
                      className="text-gray-300 hover:text-red-400 hover:bg-red-50 px-2"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <div className="text-center text-sm text-gray-400 py-8">Žádní uživatelé</div>
          )}
        </Card>
      )}

      <Dialog open={!!confirmDeleteId} onOpenChange={open => { if (!open) setConfirmDeleteId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Smazat uživatele?</DialogTitle>
            <DialogDescription>
              Tato akce je nevratná. Uživatel <span className="font-medium text-gray-800">{confirmDeleteUser?.email}</span> bude trvale odstraněn včetně všech jeho dat.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>
              Zrušit
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmDeleteId && deleteUser(confirmDeleteId)}
              disabled={deleting}
            >
              {deleting ? 'Mazání…' : 'Smazat uživatele'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
