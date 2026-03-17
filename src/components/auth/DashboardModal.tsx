import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import { supabase } from '../../services/supabase'

const LEVEL_XP = [0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000]

function xpForLevel(level: number) { return LEVEL_XP[Math.min(level - 1, LEVEL_XP.length - 1)] }
function xpForNextLevel(level: number) { return LEVEL_XP[Math.min(level, LEVEL_XP.length - 1)] }

type GameRow = {
  id: string
  set_title: string | null
  game_mode: string
  is_multiplayer: boolean
  score: number | null
  correct_quiz: number | null
  total_quiz: number | null
  total_pairs: number | null
  duration_sec: number | null
  played_at: string
}

const MODE_LABEL: Record<string, Record<string, string>> = {
  cs: { pexequiz: 'PexeQuiz', lightning: 'Bleskový kvíz' },
  sk: { pexequiz: 'PexeQuiz', lightning: 'Bleskový kvíz' },
  en: { pexequiz: 'MemQuiz', lightning: 'Lightning Quiz' },
}

const TEXTS = {
  cs: {
    title: 'Můj přehled',
    level: 'Level',
    xpToNext: 'XP do dalšího levelu',
    maxLevel: 'Maximální level',
    totalGames: 'Odehráno her',
    avgAccuracy: 'Průměrná přesnost',
    totalXp: 'Celkem XP',
    historyTitle: 'Historie her',
    noGames: 'Zatím žádné hry. Zahraj si!',
    solo: 'Solo',
    multi: 'Multiplayer',
    pairs: 'párů',
    accuracy: 'přesnost',
    close: '✕',
    loading: 'Načítám…',
  },
  sk: {
    title: 'Môj prehľad',
    level: 'Level',
    xpToNext: 'XP do ďalšieho levelu',
    maxLevel: 'Maximálny level',
    totalGames: 'Odohraných hier',
    avgAccuracy: 'Priemerná presnosť',
    totalXp: 'Celkom XP',
    historyTitle: 'História hier',
    noGames: 'Zatiaľ žiadne hry. Zahraj sa!',
    solo: 'Solo',
    multi: 'Multiplayer',
    pairs: 'párov',
    accuracy: 'presnosť',
    close: '✕',
    loading: 'Načítavam…',
  },
  en: {
    title: 'My overview',
    level: 'Level',
    xpToNext: 'XP to next level',
    maxLevel: 'Max level reached',
    totalGames: 'Games played',
    avgAccuracy: 'Avg. accuracy',
    totalXp: 'Total XP',
    historyTitle: 'Game history',
    noGames: 'No games yet. Play one!',
    solo: 'Solo',
    multi: 'Multiplayer',
    pairs: 'pairs',
    accuracy: 'accuracy',
    close: '✕',
    loading: 'Loading…',
  },
}

function formatDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'sk' ? 'sk-SK' : 'cs-CZ', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function DashboardModal() {
  const theme    = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t  = TEXTS[language]

  const { profile, closeDashboardModal } = useAuthStore()

  const [games, setGames]     = useState<GameRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('game_history')
      .select('*')
      .order('played_at', { ascending: false })
      .limit(50)
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

  const totalGames   = games.length
  const gamesWithQuiz = games.filter(g => (g.total_quiz ?? 0) > 0)
  const avgAccuracy  = gamesWithQuiz.length
    ? Math.round(gamesWithQuiz.reduce((sum, g) => sum + (g.correct_quiz ?? 0) / (g.total_quiz ?? 1), 0) / gamesWithQuiz.length * 100)
    : null

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
          {/* Profile + XP */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: tc.btnInactiveBg, border: `1px solid ${tc.btnInactiveBorder}` }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-base" style={{ color: tc.text }}>👤 {profile?.username}</div>
                <div className="text-xs mt-0.5" style={{ color: tc.textMuted }}>{t.level} {level}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold" style={{ color: tc.accent }}>{xp}</div>
                <div className="text-xs" style={{ color: tc.textMuted }}>XP</div>
              </div>
            </div>
            {/* XP bar */}
            <div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: tc.btnInactiveBorder }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${xpPct}%`, background: tc.accentGradient }}
                />
              </div>
              <div className="text-xs mt-1" style={{ color: tc.textMuted }}>
                {isMax ? t.maxLevel : `${xp - xpStart} / ${xpEnd - xpStart} XP — ${t.xpToNext}`}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: t.totalGames, value: totalGames },
              { label: t.avgAccuracy, value: avgAccuracy !== null ? `${avgAccuracy}%` : '—' },
              { label: t.totalXp, value: xp },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: tc.btnInactiveBg, border: `1px solid ${tc.btnInactiveBorder}` }}>
                <div className="font-bold text-lg" style={{ color: tc.text }}>{value}</div>
                <div className="text-xs mt-0.5" style={{ color: tc.textMuted }}>{label}</div>
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
                {games.map(g => {
                  const accuracy = (g.total_quiz ?? 0) > 0
                    ? Math.round((g.correct_quiz ?? 0) / (g.total_quiz ?? 1) * 100)
                    : null
                  return (
                    <div
                      key={g.id}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{ background: tc.btnInactiveBg, border: `1px solid ${tc.btnInactiveBorder}` }}
                    >
                      {/* Mode icon */}
                      <div className="text-lg flex-shrink-0">
                        {g.game_mode === 'lightning' ? '🔥' : '🃏'}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: tc.text }}>
                          {g.set_title ?? '—'}
                        </div>
                        <div className="text-xs flex items-center gap-2 mt-0.5" style={{ color: tc.textMuted }}>
                          <span>{MODE_LABEL[language]?.[g.game_mode] ?? g.game_mode}</span>
                          <span>·</span>
                          <span>{g.is_multiplayer ? t.multi : t.solo}</span>
                          {g.total_pairs && <><span>·</span><span>{g.total_pairs} {t.pairs}</span></>}
                        </div>
                      </div>
                      {/* Right: accuracy + date */}
                      <div className="text-right flex-shrink-0">
                        {accuracy !== null && (
                          <div className="text-sm font-semibold" style={{ color: tc.accent }}>{accuracy}%</div>
                        )}
                        <div className="text-xs" style={{ color: tc.textMuted }}>
                          {formatDate(g.played_at, language)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
