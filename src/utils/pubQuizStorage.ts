const STORAGE_PREFIX = 'pubquiz-'
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000 // 2 hours

export interface StoredTeamIdentity {
  teamId: string
  teamName: string
  joinedAt: number
  sessionCode: string
}

export function saveTeamIdentity(data: StoredTeamIdentity): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${data.sessionCode}`, JSON.stringify(data))
  } catch { /* ignore quota errors */ }
}

export function loadTeamIdentity(sessionCode: string): StoredTeamIdentity | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${sessionCode}`)
    if (!raw) return null
    const data = JSON.parse(raw) as StoredTeamIdentity
    if (Date.now() - data.joinedAt > STALE_THRESHOLD_MS) {
      clearTeamIdentity(sessionCode)
      return null
    }
    return data
  } catch {
    return null
  }
}

export function clearTeamIdentity(sessionCode: string): void {
  localStorage.removeItem(`${STORAGE_PREFIX}${sessionCode}`)
}
