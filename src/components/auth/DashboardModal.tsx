import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import { supabase } from '../../services/supabase'

const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000]
function xpForLevel(level: number) { return LEVEL_XP[Math.min(level - 1, LEVEL_XP.length - 1)] }
function xpForNextLevel(level: number) { return LEVEL_XP[Math.min(level, LEVEL_XP.length - 1)] }

// slug → display name for built-in decks
const SET_NAMES: Record<string, string> = {
  flags:           'Vlajky',
  animals:         'Zvířátka',
  fruits:          'Ovoce & zelenina',
  jobs:            'Povolání',
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

const MODE_LABEL: Record<string, Record<string, string>> = {
  cs: { pexequiz: 'PexeQuiz', lightning: 'Bleskový kvíz' },
  sk: { pexequiz: 'PexeQuiz', lightning: 'Bleskový kvíz' },
  en: { pexequiz: 'MemQuiz',  lightning: 'Lightning Quiz' },
}

const TEXTS = {
  cs: {
    title: 'Můj přehled', level: 'Level', xpToNext: 'XP do dalšího levelu', totalXpLabel: 'celkem',
    maxLevel: 'Maximální level', totalGames: 'Odehráno her',
    avgAccuracy: 'Přesnost kvízu', totalXp: 'Celkem XP', streak: 'Série dní',
    historyTitle: 'Historie her', noGames: 'Zatím žádné hry. Zahraj si!',
    solo: 'Solo', multi: 'Multiplayer', pairs: 'párů',
    showMore: 'Zobrazit další', close: '✕', loading: 'Načítám…',
    memberSince: 'Hraje od',
  },
  sk: {
    title: 'Môj prehľad', level: 'Level', xpToNext: 'XP do ďalšieho levelu', totalXpLabel: 'celkom',
    maxLevel: 'Maximálny level', totalGames: 'Odohraných hier',
    avgAccuracy: 'Presnosť kvízu', totalXp: 'Celkom XP', streak: 'Séria dní',
    historyTitle: 'História hier', noGames: 'Zatiaľ žiadne hry. Zahraj sa!',
    solo: 'Solo', multi: 'Multiplayer', pairs: 'párov',
    showMore: 'Zobraziť ďalšie', close: '✕', loading: 'Načítavam…',
    memberSince: 'Hrá od',
  },
  en: {
    title: 'My overview', level: 'Level', xpToNext: 'XP to next level', totalXpLabel: 'total',
    maxLevel: 'Max level reached', totalGames: 'Games played',
    avgAccuracy: 'Quiz accuracy', totalXp: 'Total XP', streak: 'Day streak',
    historyTitle: 'Game history', noGames: 'No games yet. Play one!',
    solo: 'Solo', multi: 'Multiplayer', pairs: 'pairs',
    showMore: 'Show more', close: '✕', loading: 'Loading…',
    memberSince: 'Playing since',
  },
}

function calculateStreak(games: GameRow[]): number {
  if (!games.length) return 0
  const uniqueDays = [...new Set(games.map(g => new Date(g.played_at).toDateString()))]
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
  let streak = 0
  const today = new Date(); today.setHours(0, 0, 0, 0)
  for (const day of uniqueDays) {
    const d = new Date(day); d.setHours(0, 0, 0, 0)
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
    if (diff === streak) streak++
    else break
  }
  return streak
}

function getResultColor(accuracy: number | null) {
  if (accuracy === null) return '#4A5568'
  if (accuracy >= 90) return '#1D9E75'
  if (accuracy >= 60) return '#F5C400'
  return '#E24B4A'
}

function formatMemberSince(iso: string, lang: string) {
  return new Intl.DateTimeFormat(
    lang === 'en' ? 'en-GB' : lang === 'sk' ? 'sk-SK' : 'cs-CZ',
    { month: 'long', year: 'numeric' }
  ).format(new Date(iso))
}

function formatDay(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(
    lang === 'en' ? 'en-GB' : lang === 'sk' ? 'sk-SK' : 'cs-CZ',
    { day: 'numeric', month: 'short' }
  )
}

const ITEMS_PER_PAGE = 10

export default function DashboardModal() {
  const theme    = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t  = TEXTS[language]

  const { user, profile, closeDashboardModal } = useAuthStore()

  const [games, setGames]     = useState<GameRow[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [avatarError, setAvatarError] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('game_history')
      .select('id, set_title, set_slug, game_mode, is_multiplayer, quiz_correct, quiz_total, total_pairs, played_at')
      .eq('user_id', user.id)
      .order('played_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setGames((data as GameRow[]) ?? [])
        setLoading(false)
      })
  }, [])

  const level   = profile?.level ?? 1
  const xp      = profile?.xp ?? 0
  const isMax   = level >= LEVEL_XP.length
  const xpStart = xpForLevel(level)
  const xpEnd   = xpForNextLevel(level)
  const xpPct   = isMax ? 100 : Math.round(((xp - xpStart) / (xpEnd - xpStart)) * 100)

  const totalGames    = games.length
  const totalCorrect  = games.reduce((s, g) => s + (g.quiz_correct ?? 0), 0)
  const totalQs       = games.reduce((s, g) => s + (g.quiz_total ?? 0), 0)
  const avgAccuracy   = totalQs > 0 ? Math.round((totalCorrect / totalQs) * 100) : null
  const streak        = calculateStreak(games)

  const visibleGames = games.slice(0, page * ITEMS_PER_PAGE)

  const sectionLabel = {
    color: tc.textMuted,
    fontSize: '0.65rem',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    fontWeight: 600,
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: tc.overlayBg }}
      onClick={closeDashboardModal}
    >
      <div
        className="w-full max-w-md rounded-2xl flex flex-col max-h-[90vh]"
        style={{ background: tc.modalSurface, border: `1px solid ${tc.modalSurfaceBorder}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 flex-shrink-0">
          <div className="font-bold text-lg" style={{ color: tc.text }}>{t.title}</div>
          <button onClick={closeDashboardModal} className="w-8 h-8 flex items-center justify-center rounded-lg text-sm opacity-50 hover:opacity-100" style={{ color: tc.text }}>
            {t.close}
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-6 space-y-5">
          {/* Profile card */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: tc.btnInactiveBg, border: `1px solid ${tc.btnInactiveBorder}` }}>
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {!avatarError && profile?.avatar_id ? (
                <img
                  src={`/avatars/avatar_${profile.avatar_id}.svg`}
                  alt={profile.username ?? ''}
                  className="w-12 h-12 rounded-full flex-shrink-0"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0" style={{ background: tc.surface, border: `1px solid ${tc.btnInactiveBorder}` }}>
                  👤
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base truncate" style={{ color: tc.text }}>{profile?.username}</div>
                <div className="text-xs mt-0.5" style={{ color: tc.textMuted }}>
                  {t.level} {level}
                  {profile?.created_at && (
                    <> · {t.memberSince} {formatMemberSince(profile.created_at, language)}</>
                  )}
                </div>
              </div>
            </div>

            {/* XP bar */}
            <div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: tc.btnInactiveBorder }}>
                <div className="h-full rounded-full" style={{ width: `${xpPct}%`, background: tc.accentGradient }} />
              </div>
              <div className="text-xs mt-1 flex justify-between" style={{ color: tc.textMuted }}>
                <span>{isMax ? t.maxLevel : `${xp - xpStart} / ${xpEnd - xpStart} XP — ${t.xpToNext}`}</span>
                <span>{xp} XP {t.totalXpLabel}</span>
              </div>
            </div>
          </div>

          {/* Stats row — 4 cards */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: t.totalGames, value: totalGames },
              { label: t.avgAccuracy, value: avgAccuracy !== null ? `${avgAccuracy}%` : '—' },
              { label: t.totalXp, value: xp },
              { label: t.streak, value: streak > 0 ? `${streak} 🔥` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: tc.btnInactiveBg, border: `1px solid ${tc.btnInactiveBorder}` }}>
                <div className="font-bold text-base leading-tight" style={{ color: tc.text }}>{value}</div>
                <div className="text-xs mt-0.5 leading-tight" style={{ color: tc.textMuted }}>{label}</div>
              </div>
            ))}
          </div>

          {/* History */}
          <div>
            <div style={{ ...sectionLabel, marginBottom: '0.5rem' }}>{t.historyTitle}</div>
            {loading ? (
              <div className="text-sm text-center py-6" style={{ color: tc.textMuted }}>{t.loading}</div>
            ) : games.length === 0 ? (
              <div className="text-sm text-center py-6" style={{ color: tc.textMuted }}>{t.noGames}</div>
            ) : (
              <div className="space-y-2">
                {visibleGames.map(g => {
                  const accuracy = (g.quiz_total ?? 0) > 0
                    ? Math.round((g.quiz_correct ?? 0) / (g.quiz_total ?? 1) * 100)
                    : null
                  const displayName = g.set_title ?? (g.set_slug ? (SET_NAMES[g.set_slug] ?? g.set_slug) : '—')
                  const resultColor = getResultColor(accuracy)
                  return (
                    <div
                      key={g.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 overflow-hidden"
                      style={{
                        background: tc.btnInactiveBg,
                        border: `1px solid ${tc.btnInactiveBorder}`,
                        borderLeft: `3px solid ${resultColor}`,
                      }}
                    >
                      <div className="text-lg flex-shrink-0">
                        {g.game_mode === 'lightning' ? '🔥' : '🃏'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: tc.text }}>{displayName}</div>
                        <div className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: tc.textMuted }}>
                          <span>{MODE_LABEL[language]?.[g.game_mode] ?? g.game_mode}</span>
                          <span>·</span>
                          <span>{g.is_multiplayer ? t.multi : t.solo}</span>
                          {!!g.total_pairs && <><span>·</span><span>{g.total_pairs} {t.pairs}</span></>}
                        </div>
                        {accuracy !== null && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="w-10 h-1 rounded-full overflow-hidden" style={{ background: tc.btnInactiveBorder }}>
                              <div style={{ width: `${accuracy}%`, height: '100%', background: resultColor, borderRadius: 2 }} />
                            </div>
                            <span className="text-xs" style={{ color: tc.textMuted }}>{accuracy}%</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-xs" style={{ color: tc.textMuted }}>
                          {formatDay(g.played_at, language)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {visibleGames.length < games.length && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="w-full py-2 text-sm rounded-xl border transition-opacity hover:opacity-80"
                    style={{ borderColor: tc.btnInactiveBorder, color: tc.textMuted }}
                  >
                    {t.showMore} ({games.length - visibleGames.length})
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
