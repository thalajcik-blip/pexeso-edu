import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { THEMES } from '../../data/themes'

const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000]

const SET_NAMES: Record<string, string> = {
  flags:   'Vlajky',
  animals: 'Zvířátka',
  fruits:  'Ovoce & zelenina',
  jobs:    'Povolání',
}
function xpForLevel(level: number) { return LEVEL_XP[Math.min(level - 1, LEVEL_XP.length - 1)] }
function xpForNextLevel(level: number) { return LEVEL_XP[Math.min(level, LEVEL_XP.length - 1)] }

type Profile = {
  id: string
  username: string
  level: number
  xp: number
  created_at: string
  show_stats: boolean
  show_activity: boolean
}

type GameRow = {
  id: string
  set_title: string | null
  set_slug: string | null
  game_mode: string
  is_multiplayer: boolean
  quiz_correct: number | null
  quiz_total: number | null
  total_pairs: number | null
  played_at: string
}

// Read persisted theme from Zustand localStorage
function getTheme(): 'dark' | 'light' {
  try {
    const raw = localStorage.getItem('pexedu-storage')
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed?.state?.theme === 'light' ? 'light' : 'dark'
    }
  } catch { /* ignore */ }
  return 'dark'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ProfilePage() {
  const username = window.location.pathname.split('/profile/')[1]?.split('/')[0] ?? ''
  const theme = getTheme()
  const tc = THEMES[theme]

  const [profile, setProfile] = useState<Profile | null>(null)
  const [games, setGames]     = useState<GameRow[]>([])
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!username) { setNotFound(true); setLoading(false); return }
    supabase
      .from('profiles')
      .select('id, username, level, xp, created_at, show_stats, show_activity')
      .eq('username', username)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setNotFound(true); setLoading(false); return }
        setProfile(data as Profile)
        if (data.show_activity) {
          const { data: history } = await supabase
            .from('game_history')
            .select('id, set_title, set_slug, game_mode, is_multiplayer, quiz_correct, quiz_total, total_pairs, played_at')
            .eq('user_id', data.id)
            .order('played_at', { ascending: false })
            .limit(20)
          setGames((history as GameRow[]) ?? [])
        }
        setLoading(false)
      })
  }, [username])

  const level = profile?.level ?? 1
  const xp    = profile?.xp ?? 0
  const isMax = level >= LEVEL_XP.length
  const xpPct = isMax ? 100 : Math.round(((xp - xpForLevel(level)) / (xpForNextLevel(level) - xpForLevel(level))) * 100)

  const totalGames  = games.length
  const gamesWithQuiz = games.filter(g => (g.quiz_total ?? 0) > 0)
  const avgAccuracy = gamesWithQuiz.length
    ? Math.round(gamesWithQuiz.reduce((s, g) => s + (g.quiz_correct ?? 0) / (g.quiz_total ?? 1), 0) / gamesWithQuiz.length * 100)
    : null

  return (
    <div className="min-h-screen" style={{ background: tc.bg, color: tc.text, fontFamily: "'Readex Pro', sans-serif" }}>
      {/* Nav bar */}
      <div className="px-4 py-4 flex items-center gap-3 max-w-lg mx-auto">
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-1.5 text-sm rounded-lg border px-3 py-1.5 hover:opacity-80 transition-opacity"
          style={{ background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder, color: tc.textMuted }}
        >
          ← Hrát Pexedu
        </button>
      </div>

      <div className="px-4 pb-10 max-w-lg mx-auto">
        {loading ? (
          <div className="text-center py-20" style={{ color: tc.textMuted }}>…</div>
        ) : notFound ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <div className="font-bold text-lg mb-2">Profil nenalezen</div>
            <div className="text-sm" style={{ color: tc.textMuted }}>Hráč „{username}" neexistuje.</div>
          </div>
        ) : profile && (
          <div className="space-y-4">
            {/* Profile card */}
            <div
              className="rounded-2xl p-6 space-y-4"
              style={{ background: tc.surface, border: `1px solid ${tc.surfaceBorder}` }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl flex-shrink-0"
                  style={{ background: tc.btnInactiveBg, border: `2px solid ${tc.btnInactiveBorder}` }}
                >
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-xl truncate">{profile.username}</div>
                  <div className="text-sm mt-0.5" style={{ color: tc.textMuted }}>
                    Level {level} · hráč od {formatDate(profile.created_at)}
                  </div>
                </div>
              </div>

              {/* XP bar (only if show_stats) */}
              {profile.show_stats && (
                <div>
                  <div className="flex justify-between text-xs mb-1" style={{ color: tc.textMuted }}>
                    <span>{xp} XP</span>
                    <span>{isMax ? 'Max level' : `Level ${level + 1}: ${xpForNextLevel(level)} XP`}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: tc.btnInactiveBorder }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${xpPct}%`, background: tc.accentGradient }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Stats (only if show_stats) */}
            {profile.show_stats && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Odehráno her', value: totalGames },
                  { label: 'Přesnost kvízu', value: avgAccuracy !== null ? `${avgAccuracy}%` : '—' },
                  { label: 'Celkem XP', value: xp },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="rounded-xl p-3 text-center"
                    style={{ background: tc.surface, border: `1px solid ${tc.surfaceBorder}` }}
                  >
                    <div className="font-bold text-lg" style={{ color: tc.text }}>{value}</div>
                    <div className="text-xs mt-0.5" style={{ color: tc.textMuted }}>{label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Game history (only if show_activity) */}
            {profile.show_activity && (
              <div
                className="rounded-2xl p-5 space-y-3"
                style={{ background: tc.surface, border: `1px solid ${tc.surfaceBorder}` }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-widest mb-1"
                  style={{ color: tc.textMuted }}
                >
                  Nedávné hry
                </div>
                {games.length === 0 ? (
                  <div className="text-sm text-center py-4" style={{ color: tc.textMuted }}>Žádné hry zatím.</div>
                ) : (
                  <div className="space-y-2">
                    {games.map(g => {
                      const accuracy = (g.quiz_total ?? 0) > 0
                        ? Math.round((g.quiz_correct ?? 0) / (g.quiz_total ?? 1) * 100)
                        : null
                      return (
                        <div
                          key={g.id}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                          style={{ background: tc.btnInactiveBg, border: `1px solid ${tc.btnInactiveBorder}` }}
                        >
                          <div className="text-lg flex-shrink-0">
                            {g.game_mode === 'lightning' ? '🔥' : '🃏'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate" style={{ color: tc.text }}>
                              {g.set_title ?? (g.set_slug ? (SET_NAMES[g.set_slug] ?? g.set_slug) : '—')}
                            </div>
                            <div className="text-xs flex items-center gap-2 mt-0.5" style={{ color: tc.textMuted }}>
                              <span>{g.game_mode === 'lightning' ? 'Bleskový kvíz' : 'PexeQuiz'}</span>
                              <span>·</span>
                              <span>{g.is_multiplayer ? 'Multiplayer' : 'Solo'}</span>
                              {g.total_pairs && <><span>·</span><span>{g.total_pairs} párů</span></>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {accuracy !== null && (
                              <div className="text-sm font-semibold" style={{ color: tc.accent }}>{accuracy}%</div>
                            )}
                            <div className="text-xs" style={{ color: tc.textMuted }}>
                              {new Date(g.played_at).toLocaleDateString('cs-CZ', { day: 'numeric', month: 'short' })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Private message if both hidden */}
            {!profile.show_stats && !profile.show_activity && (
              <div className="text-center py-8" style={{ color: tc.textMuted }}>
                <div className="text-3xl mb-3">🔒</div>
                <div className="text-sm">Tento hráč má profil nastavený jako soukromý.</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
