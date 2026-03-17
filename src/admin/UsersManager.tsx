import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDown, Trash2 } from 'lucide-react'

type UserRow = {
  user_id: string
  email: string
  role: string | null
  created_at: string
}

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  teacher: 'Učitel',
}

export default function UsersManager() {
  const [users, setUsers]             = useState<UserRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState<string | null>(null)
  const [error, setError]             = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting]       = useState(false)

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
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ userId }),
      }
    )
    const json = await res.json()
    setDeleting(false)
    setConfirmDeleteId(null)
    if (!res.ok) { setError(json.error ?? 'Chyba při mazání'); return }
    await fetchUsers()
  }

  async function setRole(userId: string, newRole: string | null) {
    setSaving(userId)
    if (newRole === null) {
      await supabase.from('user_roles').delete().eq('user_id', userId)
    } else {
      await supabase.from('user_roles').upsert({ user_id: userId, role: newRole })
    }
    await fetchUsers()
    setSaving(null)
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
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Registrace</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="px-4 py-3" />
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.user_id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 text-gray-700">{u.email}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(u.created_at).toLocaleDateString('cs-CZ')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="w-44 justify-between font-normal text-xs" disabled={saving === u.user_id}>
                            {u.role === 'teacher' ? 'Učitel' : u.role === 'superadmin' ? 'Superadmin' : 'Čeká na schválení'}
                            <ChevronDown className="size-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-44">
                          <DropdownMenuItem onClick={() => setRole(u.user_id, null)}>Čeká na schválení</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRole(u.user_id, 'teacher')}>Učitel</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setRole(u.user_id, 'superadmin')}>Superadmin</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {u.role && (
                        <Badge className={u.role === 'superadmin' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-700'}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </Badge>
                      )}
                      {!u.role && (
                        <Badge className="bg-amber-50 text-amber-600">Čeká na schválení</Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {confirmDeleteId === u.user_id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => deleteUser(u.user_id)} disabled={deleting} className="text-xs text-red-500 hover:bg-red-50">
                          {deleting ? '…' : 'Smazat'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)} className="text-xs px-2">✕</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(u.user_id)} className="text-gray-300 hover:text-red-400 hover:bg-red-50 px-2">
                        <Trash2 className="size-4" />
                      </Button>
                    )}
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
    </div>
  )
}
