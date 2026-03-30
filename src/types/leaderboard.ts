export type LeaderboardEntry = {
  rank: number
  user_id: string
  username: string
  avatar_id: number
  total_score: number
  games_played: number
}

export type TimeFilter = 'all' | 'week' | 'month'
