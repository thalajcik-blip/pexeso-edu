import { supabase } from './supabase'
import { SET_NAMES } from './resultsService'
import type { LeaderboardEntry, TimeFilter } from '../types/leaderboard'

type RawRow = {
  user_id: string
  score: number
  set_slug: string | null
  played_at: string
  profiles: { username: string | null; avatar_id: number | null; age_group: string }
}

function buildTimeFilterDate(timeFilter: TimeFilter): string | null {
  if (timeFilter === 'all') return null
  const now = new Date()
  if (timeFilter === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d.toISOString()
  }
  // month
  const d = new Date(now)
  d.setMonth(d.getMonth() - 1)
  return d.toISOString()
}

async function fetchAndAggregate(opts: {
  setSlug?: string
  timeFilter?: TimeFilter
  limit?: number
}): Promise<{ entries: LeaderboardEntry[]; allEntries: LeaderboardEntry[] }> {
  const { setSlug, timeFilter = 'all', limit = 50 } = opts

  let query = supabase
    .from('game_history')
    .select('user_id, score, set_slug, played_at, profiles!inner(username, avatar_id, age_group)')

  // GDPR: exclude under-16 players (per D-15)
  query = query.neq('profiles.age_group', 'under_16')

  // Per-sada filter (per D-07, D-08)
  if (setSlug) {
    query = query.eq('set_slug', setSlug)
  }

  // Time filter only applies when setSlug is active (per D-02, D-06)
  if (setSlug && timeFilter !== 'all') {
    const since = buildTimeFilterDate(timeFilter)
    if (since) {
      query = query.gte('played_at', since)
    }
  }

  const { data, error } = await query

  if (error || !data) {
    console.error('[leaderboardService] fetchAndAggregate error:', error)
    return { entries: [], allEntries: [] }
  }

  const rows = data as unknown as RawRow[]
  const map = new Map<string, { username: string; avatar_id: number; total_score: number; games_played: number }>()

  for (const row of rows) {
    const existing = map.get(row.user_id)
    if (existing) {
      existing.total_score += row.score
      existing.games_played += 1
    } else {
      map.set(row.user_id, {
        username: row.profiles.username ?? 'Anonym',
        avatar_id: row.profiles.avatar_id ?? 0,
        total_score: row.score,
        games_played: 1,
      })
    }
  }

  // Sort by total_score descending, assign rank (per D-01)
  const allEntries = Array.from(map.entries())
    .sort((a, b) => b[1].total_score - a[1].total_score)
    .map(([user_id, d], index) => ({
      rank: index + 1,
      user_id,
      username: d.username,
      avatar_id: d.avatar_id,
      total_score: d.total_score,
      games_played: d.games_played,
    }))

  return { entries: allEntries.slice(0, limit), allEntries }
}

export async function getGlobalLeaderboard(opts: {
  setSlug?: string
  timeFilter?: TimeFilter
  limit?: number
}): Promise<LeaderboardEntry[]> {
  const { entries } = await fetchAndAggregate(opts)
  return entries
}

export async function getPlayerRank(opts: {
  userId: string
  setSlug?: string
  timeFilter?: TimeFilter
}): Promise<LeaderboardEntry | null> {
  const { allEntries } = await fetchAndAggregate({ setSlug: opts.setSlug, timeFilter: opts.timeFilter, limit: 9999 })
  return allEntries.find(e => e.user_id === opts.userId) ?? null
}

export async function getAvailableSets(): Promise<{ slug: string; name: string }[]> {
  const { data, error } = await supabase
    .from('game_history')
    .select('set_slug, set_title')

  if (error || !data) return []

  const setMap = new Map<string, string>()
  for (const row of data as { set_slug: string | null; set_title: string | null }[]) {
    if (row.set_slug && !setMap.has(row.set_slug)) {
      setMap.set(row.set_slug, row.set_title ?? SET_NAMES[row.set_slug] ?? row.set_slug)
    }
  }

  return Array.from(setMap.entries())
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name))
}
