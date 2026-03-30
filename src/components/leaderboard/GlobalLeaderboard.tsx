import { useState, useEffect, useCallback } from 'react'
import { Avatar } from '../auth/Avatar'
import { useAuthStore } from '../../store/authStore'
import { getGlobalLeaderboard, getPlayerRank, getAvailableSets } from '../../services/leaderboardService'
import type { LeaderboardEntry, TimeFilter } from '../../types/leaderboard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Skeleton } from '../ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  const rankColor =
    entry.rank === 1 ? '#F5C400' :
    entry.rank === 2 ? '#C0C0C0' :
    entry.rank === 3 ? '#CD7F32' :
    undefined

  return (
    <TableRow style={isCurrentUser ? { background: 'rgba(245, 196, 0, 0.08)' } : undefined}>
      <TableCell>
        <span style={{ fontWeight: 700, color: rankColor ?? 'inherit' }}>
          #{entry.rank}
        </span>
      </TableCell>
      <TableCell>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Avatar avatarId={entry.avatar_id} size={28} />
          <span style={{ fontWeight: isCurrentUser ? 700 : 400 }}>{entry.username}</span>
        </div>
      </TableCell>
      <TableCell style={{ textAlign: 'right', fontWeight: 700, color: '#F5C400' }}>
        {entry.total_score.toLocaleString('cs-CZ')}
      </TableCell>
      <TableCell style={{ textAlign: 'right' }} className="text-muted-foreground">
        {entry.games_played}
      </TableCell>
    </TableRow>
  )
}

export function GlobalLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [playerEntry, setPlayerEntry] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSet, setSelectedSet] = useState<string>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [availableSets, setAvailableSets] = useState<{ slug: string; name: string }[]>([])

  const { user } = useAuthStore()

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    const setSlug = selectedSet === 'all' ? undefined : selectedSet
    const [data, rank] = await Promise.all([
      getGlobalLeaderboard({ setSlug, timeFilter, limit: 50 }),
      user?.id ? getPlayerRank({ userId: user.id, setSlug, timeFilter }) : Promise.resolve(null),
    ])
    setEntries(data)
    setPlayerEntry(rank)
    setLoading(false)
  }, [selectedSet, timeFilter, user?.id])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  useEffect(() => {
    const interval = setInterval(() => { fetchLeaderboard() }, 3_600_000)
    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  useEffect(() => {
    getAvailableSets().then(setAvailableSets)
  }, [])

  const showOutOfTop50 = !loading && playerEntry !== null && playerEntry.rank > 50

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Per-sada dropdown */}
        <Select value={selectedSet} onValueChange={setSelectedSet}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Všetky sady" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Všetky sady</SelectItem>
            {availableSets.map(s => (
              <SelectItem key={s.slug} value={s.slug}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Time filter — only enabled when a set is selected */}
        <Select
          value={timeFilter}
          onValueChange={(v) => setTimeFilter(v as TimeFilter)}
          disabled={selectedSet === 'all'}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Celkovo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Celkovo</SelectItem>
            <SelectItem value="week">Tento týždeň</SelectItem>
            <SelectItem value="month">Tento mesiac</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead style={{ width: 60 }}>#</TableHead>
              <TableHead>Hráč</TableHead>
              <TableHead style={{ textAlign: 'right' }}>Skóre</TableHead>
              <TableHead style={{ textAlign: 'right' }}>Hier</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </TableCell>
                  <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255,255,255,0.5)' }}>
                  Zatiaľ žiadne výsledky
                </TableCell>
              </TableRow>
            ) : (
              entries.map(entry => (
                <LeaderboardRow
                  key={entry.user_id}
                  entry={entry}
                  isCurrentUser={entry.user_id === user?.id}
                />
              ))
            )}

            {/* Current user row if outside top 50 */}
            {showOutOfTop50 && (
              <>
                <TableRow>
                  <TableCell colSpan={4} style={{ padding: '2px 0' }}>
                    <hr style={{ border: 'none', borderTop: '1px dashed rgba(255,255,255,0.15)' }} />
                  </TableCell>
                </TableRow>
                <LeaderboardRow entry={playerEntry!} isCurrentUser={true} />
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
