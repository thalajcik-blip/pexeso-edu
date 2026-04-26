import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { PubQuizEvent, PubQuizRound, PubQuizTeam } from '../types/pubQuiz'

let channel: RealtimeChannel | null = null

export function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

// ── Session CRUD ──────────────────────────────────────────────────────────────

export async function createSession(hostId: string): Promise<{ id: string; code: string } | null> {
  const code = generateSessionCode()
  const { data, error } = await supabase
    .from('pub_quiz_sessions')
    .insert({ code, host_id: hostId, status: 'lobby' })
    .select('id, code')
    .single()
  if (error) { console.error(error); return null }
  return data
}

export async function loadSession(code: string): Promise<{ id: string; status: string; current_round: number; current_question: number } | null> {
  const { data, error } = await supabase
    .from('pub_quiz_sessions')
    .select('id, status, current_round, current_question')
    .eq('code', code)
    .single()
  if (error) { console.error(error); return null }
  return data
}

export async function updateSession(id: string, update: Record<string, unknown>): Promise<void> {
  await supabase.from('pub_quiz_sessions').update(update).eq('id', id)
}

// ── Rounds ────────────────────────────────────────────────────────────────────

export async function saveRounds(sessionId: string, rounds: PubQuizRound[]): Promise<void> {
  // Delete old and re-insert (simpler than diff)
  await supabase.from('pub_quiz_rounds').delete().eq('session_id', sessionId)
  if (rounds.length === 0) return
  const rows = rounds.map((r, i) => ({
    session_id: sessionId,
    round_number: i + 1,
    game_mode: r.gameMode,
    set_slug: r.setSlug ?? null,
    custom_deck_id: r.customDeckId ?? null,
    question_count: r.questionCount,
    double_points: r.doublePoints,
    status: 'pending',
  }))
  await supabase.from('pub_quiz_rounds').insert(rows)
}

export async function loadRounds(sessionId: string): Promise<PubQuizRound[]> {
  const { data } = await supabase
    .from('pub_quiz_rounds')
    .select('*')
    .eq('session_id', sessionId)
    .order('round_number')
  if (!data) return []
  return data.map(r => ({
    id: r.id,
    roundNumber: r.round_number,
    gameMode: r.game_mode,
    setSlug: r.set_slug ?? undefined,
    customDeckId: r.custom_deck_id ?? undefined,
    questionCount: r.question_count,
    doublePoints: r.double_points,
    status: r.status,
  }))
}

// ── Teams ─────────────────────────────────────────────────────────────────────

export async function joinTeam(sessionId: string, name: string, avatar: string, color: string): Promise<PubQuizTeam | null> {
  const { data, error } = await supabase
    .from('pub_quiz_teams')
    .insert({ session_id: sessionId, name, avatar, color, total_score: 0 })
    .select('id, name, avatar, color, total_score')
    .single()
  if (error) { console.error(error); return null }
  return { id: data.id, name: data.name, avatar: data.avatar, color: data.color, totalScore: data.total_score }
}

export async function loadTeams(sessionId: string): Promise<PubQuizTeam[]> {
  const { data } = await supabase
    .from('pub_quiz_teams')
    .select('id, name, avatar, color, total_score')
    .eq('session_id', sessionId)
    .order('joined_at')
  if (!data) return []
  return data.map(t => ({ id: t.id, name: t.name, avatar: t.avatar, color: t.color, totalScore: t.total_score }))
}

export async function updateTeamScores(updates: { id: string; totalScore: number }[]): Promise<void> {
  await Promise.all(updates.map(u =>
    supabase.from('pub_quiz_teams').update({ total_score: u.totalScore }).eq('id', u.id)
  ))
}

// ── Answers ───────────────────────────────────────────────────────────────────

export async function submitAnswer(
  sessionId: string,
  teamId: string,
  roundNumber: number,
  questionIndex: number,
  answer: string,
): Promise<void> {
  const { error } = await supabase.from('pub_quiz_answers').upsert(
    { session_id: sessionId, team_id: teamId, round_number: roundNumber, question_index: questionIndex, answer },
    { onConflict: 'team_id,round_number,question_index' },
  )
  if (error) console.error('[pub quiz] submitAnswer failed:', error)
}

export async function loadAnswersForQuestion(
  sessionId: string,
  roundNumber: number,
  questionIndex: number,
): Promise<{ teamId: string; answer: string; answeredAt: string }[]> {
  const { data, error } = await supabase
    .from('pub_quiz_answers')
    .select('team_id, answer, answered_at')
    .eq('session_id', sessionId)
    .eq('round_number', roundNumber)
    .eq('question_index', questionIndex)
  if (error) console.error('[pub quiz] loadAnswersForQuestion failed:', error)
  if (!data) return []
  console.log(`[pub quiz] loadAnswersForQuestion r${roundNumber}q${questionIndex}: ${data.length} answers`, data)
  return data.map(r => ({ teamId: r.team_id, answer: r.answer, answeredAt: r.answered_at }))
}

export async function scoreAnswers(
  sessionId: string,
  roundNumber: number,
  questionIndex: number,
  correct: string,
  gameMode: 'pexequiz' | 'bleskovy_kviz',
  doublePoints: boolean,
  timerSeconds?: number,
  questionStartTime?: number,
): Promise<Map<string, number>> {
  const answers = await loadAnswersForQuestion(sessionId, roundNumber, questionIndex)
  const scores = new Map<string, number>()

  for (const a of answers) {
    const isCorrect = a.answer === correct
    let score = 0
    if (isCorrect) {
      if (gameMode === 'bleskovy_kviz' && timerSeconds && questionStartTime) {
        const elapsed = (new Date(a.answeredAt).getTime() - questionStartTime) / 1000
        const remaining = Math.max(0, timerSeconds - elapsed)
        const ratio = remaining / timerSeconds
        score = Math.round(500 + ratio * 500)
      } else if (gameMode === 'bleskovy_kviz') {
        score = 500
      } else {
        score = 100
      }
      if (doublePoints) score *= 2
    }
    scores.set(a.teamId, score)
    await supabase.from('pub_quiz_answers').update({ is_correct: isCorrect, score_earned: score })
      .eq('session_id', sessionId)
      .eq('team_id', a.teamId)
      .eq('round_number', roundNumber)
      .eq('question_index', questionIndex)
  }
  return scores
}

// ── Realtime channel ──────────────────────────────────────────────────────────

export function joinChannel(
  sessionCode: string,
  onEvent: (event: PubQuizEvent) => void,
): RealtimeChannel {
  if (channel) { supabase.removeChannel(channel) }

  channel = supabase.channel(`pub-quiz-${sessionCode}`, {
    config: { broadcast: { self: false } },
  })

  channel.on('broadcast', { event: 'pub_quiz' }, ({ payload }) => {
    onEvent(payload as PubQuizEvent)
  })

  channel.subscribe()
  return channel
}

export function broadcast(event: PubQuizEvent): void {
  if (!channel) return
  channel.send({ type: 'broadcast', event: 'pub_quiz', payload: event })
}

export function leaveChannel(): void {
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
  }
}
