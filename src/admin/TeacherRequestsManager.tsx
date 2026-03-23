import { useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type TeacherRequest = {
  id: string
  user_id: string
  school: string
  reason: string | null
  status: string
  created_at: string
  email: string
  username: string | null
}

export default function TeacherRequestsManager() {
  const [requests, setRequests] = useState<TeacherRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null)
  const [error, setError]       = useState('')

  async function fetchRequests() {
    setLoading(true)
    const { data, error } = await supabase
      .from('teacher_requests')
      .select(`id, user_id, school, reason, status, created_at, email, profiles!user_id(username)`)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else {
      setRequests((data ?? []).map((r: any) => ({
        ...r,
        username: r.profiles?.username ?? null,
        email: r.email ?? r.user_id,
      })))
    }
    setLoading(false)
  }

  useEffect(() => { fetchRequests() }, [])

  async function approve(req: TeacherRequest) {
    setSaving(req.id)
    const { data: { session } } = await supabase.auth.getSession()

    await supabase.from('profiles').update({
      roles: ['teacher', 'player'],
      teacher_request_status: 'approved',
    }).eq('id', req.user_id)

    await supabase.from('teacher_requests').update({
      status: 'approved',
      reviewed_by: session?.user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.id)

    // Email notification
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ type: 'teacher_approved', userId: req.user_id }),
      })
    } catch { /* email failure is non-critical */ }

    await fetchRequests()
    setSaving(null)
  }

  async function reject(req: TeacherRequest) {
    setSaving(req.id)
    const { data: { session } } = await supabase.auth.getSession()

    await supabase.from('profiles').update({
      teacher_request_status: 'rejected',
    }).eq('id', req.user_id)

    await supabase.from('teacher_requests').update({
      status: 'rejected',
      reviewed_by: session?.user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.id)

    await fetchRequests()
    setSaving(null)
  }

  const pending   = requests.filter(r => r.status === 'pending')
  const processed = requests.filter(r => r.status !== 'pending')

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Žádosti učitelů</h1>

      {error && <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</div>}

      {loading ? (
        <div className="text-sm text-gray-400">Načítání…</div>
      ) : (
        <>
          {pending.length === 0 && (
            <div className="text-sm text-gray-400 mb-6">Žádné čekající žádosti.</div>
          )}

          {pending.length > 0 && (
            <Card className="rounded-2xl p-0 gap-0 border-gray-100 shadow-none overflow-hidden mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Uživatel</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Škola</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Důvod</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pending.map(r => (
                    <tr key={r.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-4 py-3">
                        <div className="text-gray-800 font-medium">{r.username ?? '—'}</div>
                        <div className="text-gray-400 text-xs">{r.email}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.school}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-48">{r.reason || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                        {new Date(r.created_at).toLocaleDateString('cs-CZ')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="outline" className="text-green-700 border-green-200 hover:bg-green-50 text-xs" onClick={() => approve(r)} disabled={saving === r.id}>
                            {saving === r.id ? '…' : 'Schválit'}
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs" onClick={() => reject(r)} disabled={saving === r.id}>
                            Zamítnout
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {processed.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Vyřízené</h2>
              <Card className="rounded-2xl p-0 gap-0 border-gray-100 shadow-none overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {processed.map(r => (
                      <tr key={r.id} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-3">
                          <div className="text-gray-700">{r.username ?? '—'}</div>
                          <div className="text-gray-400 text-xs">{r.email}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{r.school}</td>
                        <td className="px-4 py-3">
                          <Badge className={r.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}>
                            {r.status === 'approved' ? 'Schváleno' : 'Zamítnuto'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs">
                          {new Date(r.created_at).toLocaleDateString('cs-CZ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
