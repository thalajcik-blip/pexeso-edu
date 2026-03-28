import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { useClassroomStore } from '../../store/classroomStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import { Avatar } from '../auth/Avatar'
import { Button } from '../ui/button'
import type { AssignmentWithDeck, ClassMemberWithProfile } from '../../types/classroom'

interface StudentResult {
  userId: string
  username: string | null
  avatarId: number
  quizCorrect: number | null
  quizTotal: number | null
  scorePercent: number | null
  durationSec: number | null
  playedAt: string | null
}

interface Props {
  classId: string
  assignment: AssignmentWithDeck
  className?: string
}

const TEXTS = {
  cs: {
    student: 'Žák',
    score: 'Skóre',
    duration: 'Doba',
    playedAt: 'Zahráno',
    classAvg: 'Průměr třídy',
    noResults: 'Zatím žádné výsledky.',
    exportCsv: 'Exportovat CSV',
    loading: 'Načítání výsledků...',
    na: '—',
  },
  sk: {
    student: 'Žiak',
    score: 'Skóre',
    duration: 'Čas',
    playedAt: 'Zahrané',
    classAvg: 'Priemer triedy',
    noResults: 'Zatiaľ žiadne výsledky.',
    exportCsv: 'Exportovať CSV',
    loading: 'Načítavanie výsledkov...',
    na: '—',
  },
  en: {
    student: 'Student',
    score: 'Score',
    duration: 'Duration',
    playedAt: 'Played',
    classAvg: 'Class average',
    noResults: 'No results yet.',
    exportCsv: 'Export CSV',
    loading: 'Loading results...',
    na: '—',
  },
}

function formatDuration(sec: number | null): string {
  if (sec === null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function formatDate(isoString: string | null, locale: string): string {
  if (!isoString) return '—'
  try {
    return new Date(isoString).toLocaleDateString(locale === 'en' ? 'en-GB' : 'cs-CZ', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function getScoreColor(percent: number | null): { bg: string; text: string } {
  if (percent === null) return { bg: 'transparent', text: 'inherit' }
  if (percent >= 70) return { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' }
  if (percent >= 40) return { bg: 'rgba(234,179,8,0.15)', text: '#eab308' }
  return { bg: 'rgba(239,68,68,0.15)', text: '#ef4444' }
}

export default function ClassResults({ classId, assignment, className }: Props) {
  const theme = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t = TEXTS[language]
  const { members } = useClassroomStore()
  const [results, setResults] = useState<StudentResult[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!classId || members.length === 0) return
    fetchResults(members)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, assignment.id, members.length])

  async function fetchResults(currentMembers: ClassMemberWithProfile[]) {
    setLoading(true)
    try {
      const memberIds = currentMembers.map(m => m.user_id)
      if (memberIds.length === 0) {
        setResults(currentMembers.map(m => ({
          userId: m.user_id,
          username: m.username,
          avatarId: m.avatar_id,
          quizCorrect: null,
          quizTotal: null,
          scorePercent: null,
          durationSec: null,
          playedAt: null,
        })))
        return
      }

      let query = supabase
        .from('game_history')
        .select('user_id, quiz_correct, quiz_total, duration_sec, played_at')
        .in('user_id', memberIds)
        .order('played_at', { ascending: false })

      if (assignment.set_slug) {
        query = query.eq('set_slug', assignment.set_slug)
      } else if (assignment.custom_deck_id) {
        query = query.eq('custom_deck_id', assignment.custom_deck_id)
      }

      const { data, error } = await query

      if (error) {
        console.error('ClassResults fetchResults error:', error)
      }

      type HistoryRow = {
        user_id: string
        quiz_correct: number | null
        quiz_total: number | null
        duration_sec: number | null
        played_at: string | null
      }

      // Group by user_id, pick best attempt (highest quiz_correct/quiz_total ratio)
      const byUser = new Map<string, HistoryRow>()
      for (const row of (data ?? []) as HistoryRow[]) {
        const existing = byUser.get(row.user_id)
        if (!existing) {
          byUser.set(row.user_id, row)
        } else {
          const existingRatio =
            existing.quiz_total && existing.quiz_total > 0
              ? (existing.quiz_correct ?? 0) / existing.quiz_total
              : 0
          const newRatio =
            row.quiz_total && row.quiz_total > 0
              ? (row.quiz_correct ?? 0) / row.quiz_total
              : 0
          if (newRatio > existingRatio) {
            byUser.set(row.user_id, row)
          }
        }
      }

      const studentResults: StudentResult[] = currentMembers.map(m => {
        const row = byUser.get(m.user_id) ?? null
        const quizCorrect = row?.quiz_correct ?? null
        const quizTotal = row?.quiz_total ?? null
        const scorePercent =
          quizTotal && quizTotal > 0
            ? Math.round(((quizCorrect ?? 0) / quizTotal) * 100)
            : null
        return {
          userId: m.user_id,
          username: m.username,
          avatarId: m.avatar_id,
          quizCorrect,
          quizTotal,
          scorePercent,
          durationSec: row?.duration_sec ?? null,
          playedAt: row?.played_at ?? null,
        }
      })

      setResults(studentResults)
    } finally {
      setLoading(false)
    }
  }

  // Class average (only students with results)
  const studentsWithResults = results.filter(r => r.scorePercent !== null)
  const classAvgPercent =
    studentsWithResults.length > 0
      ? Math.round(
          studentsWithResults.reduce((sum, r) => sum + (r.scorePercent ?? 0), 0) /
            studentsWithResults.length
        )
      : null

  const localeString = language === 'en' ? 'en-GB' : 'cs-CZ'

  function downloadCSV() {
    const deckTitle = assignment.deck_title ?? assignment.set_slug ?? assignment.custom_deck_id ?? 'deck'
    const today = new Date().toISOString().slice(0, 10)
    const safeName = (className ?? classId).replace(/[^a-zA-Z0-9_-]/g, '_')
    const safeDeck = deckTitle.replace(/[^a-zA-Z0-9_-]/g, '_')
    const filename = `${safeName}_${safeDeck}_${today}.csv`

    const headers = ['Student', 'Score_Percent', 'Quiz_Correct', 'Quiz_Total', 'Duration_Sec', 'Played_At']
    const rows = results.map(r => [
      r.username ?? r.userId,
      r.scorePercent !== null ? String(r.scorePercent) : '',
      r.quizCorrect !== null ? String(r.quizCorrect) : '',
      r.quizTotal !== null ? String(r.quizTotal) : '',
      r.durationSec !== null ? String(r.durationSec) : '',
      r.playedAt ?? '',
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const thStyle: React.CSSProperties = {
    color: tc.textMuted,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'left',
    padding: '6px 12px',
    borderBottom: `1px solid ${tc.surfaceBorder}`,
  }

  const tdStyle: React.CSSProperties = {
    padding: '10px 12px',
    color: tc.text,
    fontSize: 14,
    borderBottom: `1px solid ${tc.surfaceBorder}`,
  }

  const avgColors = getScoreColor(classAvgPercent)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: tc.textMuted, fontSize: 13 }}>
          {studentsWithResults.length}/{results.length} {language === 'sk' ? 'výsledkov' : language === 'en' ? 'results' : 'výsledků'}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadCSV}
          style={{ borderColor: tc.surfaceBorder, color: tc.textMuted, fontSize: 12, background: 'transparent' }}
        >
          {t.exportCsv}
        </Button>
      </div>

      {loading && <p style={{ color: tc.textMuted, fontSize: 13 }}>{t.loading}</p>}

      {!loading && results.length === 0 && (
        <p style={{ color: tc.textMuted, fontSize: 13 }}>{t.noResults}</p>
      )}

      {!loading && results.length > 0 && (
        <div style={{ background: tc.surface, border: `1px solid ${tc.surfaceBorder}`, borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>{t.student}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{t.score}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{t.duration}</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>{t.playedAt}</th>
              </tr>
            </thead>
            <tbody>
              {/* Class average row */}
              {classAvgPercent !== null && (
                <tr style={{ background: tc.surface }}>
                  <td style={{ ...tdStyle, fontWeight: 700, color: tc.text, fontSize: 13 }}>
                    {t.classAvg}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <span
                      style={{
                        background: avgColors.bg,
                        color: avgColors.text,
                        fontWeight: 700,
                        fontSize: 13,
                        padding: '2px 10px',
                        borderRadius: 6,
                        display: 'inline-block',
                      }}
                    >
                      {classAvgPercent}%
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: tc.textMuted }}>—</td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: tc.textMuted }}>—</td>
                </tr>
              )}
              {/* Student rows */}
              {results.map(r => {
                const colors = getScoreColor(r.scorePercent)
                return (
                  <tr key={r.userId}>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Avatar avatarId={r.avatarId} size={28} />
                        <span>{r.username ?? t.na}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {r.scorePercent !== null ? (
                        <span
                          style={{
                            background: colors.bg,
                            color: colors.text,
                            fontWeight: 700,
                            fontSize: 13,
                            padding: '2px 10px',
                            borderRadius: 6,
                            display: 'inline-block',
                          }}
                        >
                          {r.scorePercent}%{' '}
                          <span style={{ fontWeight: 400, fontSize: 11, opacity: 0.8 }}>
                            ({r.quizCorrect}/{r.quizTotal})
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: tc.textMuted }}>{t.na}</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: tc.textMuted }}>
                      {formatDuration(r.durationSec)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: tc.textMuted }}>
                      {formatDate(r.playedAt, localeString)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
