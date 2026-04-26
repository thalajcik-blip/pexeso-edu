import { create } from 'zustand'
import type { LightningQuestion } from '../types/game'
import type { SessionStatus, PubQuizRound, PubQuizTeam, PubQuizEvent, RoundScore } from '../types/pubQuiz'
import * as svc from '../services/pubQuizService'
import { buildPubQuizQuestions } from '../utils/buildPubQuizQuestions'
import { fetchCustomDeckFull } from '../services/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PubQuizState {
  // Session
  sessionId: string
  sessionCode: string
  status: SessionStatus
  hostId: string | null

  // Config (set by host before starting)
  rounds: PubQuizRound[]

  // Live game state (synced for all roles)
  teams: PubQuizTeam[]
  currentRound: number         // 1-indexed, 0 = not started
  currentQuestion: number      // 1-indexed within round, 0 = not started
  currentQuestionData: LightningQuestion | null
  timerSeconds: number
  timerRemaining: number | null
  answeredTeamIds: Set<string>

  // Results (populated after each round)
  roundScores: RoundScore[]
  revealedCount: number

  // Host-only: pre-generated questions for current round
  roundQuestions: LightningQuestion[]

  // Team-only
  myTeamId: string
  myTeamName: string
  selectedAnswer: string | null
  hasSubmitted: boolean

  // Timer interval ref (host only)
  _timerInterval: ReturnType<typeof setInterval> | null
  _questionStartTime: number | null
}

interface PubQuizActions {
  // Setup
  initSession: (sessionId: string, sessionCode: string, hostId: string | null) => void
  setRounds: (rounds: PubQuizRound[]) => void
  applyEvent: (event: PubQuizEvent) => void

  // Host actions
  hostStartSession: () => Promise<void>
  hostStartRound: (roundIndex: number) => Promise<void>
  hostStartQuestion: (questionIndex: number) => Promise<void>
  hostPauseQuestion: () => void
  hostResumeQuestion: () => void
  hostEndQuestion: () => Promise<void>
  hostRevealNextTeam: () => void
  hostNextRound: () => Promise<void>
  hostFinishSession: () => Promise<void>

  // Team actions
  teamJoin: (name: string, avatar: string, color: string) => Promise<boolean>
  teamSelectAnswer: (answer: string) => void
  teamSubmitAnswer: () => Promise<void>
  teamChangeAnswer: () => void

  // Shared
  reset: () => void
  _stopTimer: () => void
}

const DEFAULT: PubQuizState = {
  sessionId: '',
  sessionCode: '',
  status: 'lobby',
  hostId: null,
  rounds: [],
  teams: [],
  currentRound: 0,
  currentQuestion: 0,
  currentQuestionData: null,
  timerSeconds: 0,
  timerRemaining: null,
  answeredTeamIds: new Set(),
  roundScores: [],
  revealedCount: 0,
  roundQuestions: [],
  myTeamId: '',
  myTeamName: '',
  selectedAnswer: null,
  hasSubmitted: false,
  _timerInterval: null,
  _questionStartTime: null,
}

export const usePubQuizStore = create<PubQuizState & PubQuizActions>((set, get) => ({
  ...DEFAULT,

  initSession(sessionId, sessionCode, hostId) {
    set({ sessionId, sessionCode, hostId })
  },

  setRounds(rounds) {
    set({ rounds })
  },

  // ── Host actions ──────────────────────────────────────────────────────────

  async hostStartSession() {
    const { sessionId, rounds } = get()
    await svc.saveRounds(sessionId, rounds)
    await svc.updateSession(sessionId, { status: 'round_intro', current_round: 1 })
    set({ status: 'round_intro', currentRound: 1 })
    svc.broadcast({ type: 'session_status_changed', status: 'round_intro', currentRound: 1 })
  },

  async hostStartRound(roundIndex) {
    const { sessionId, rounds } = get()
    const round = rounds[roundIndex]
    if (!round) return

    // Pre-generate questions for this round
    let questions: LightningQuestion[] = []
    if (round.customDeckId) {
      const customDeck = await fetchCustomDeckFull(round.customDeckId)
      questions = buildPubQuizQuestions(round.customDeckId, customDeck, 'cs', round.questionCount)
    } else if (round.setSlug) {
      questions = buildPubQuizQuestions(round.setSlug, null, 'cs', round.questionCount)
    }

    set({ roundQuestions: questions, currentRound: roundIndex + 1, currentQuestion: 0, status: 'round_intro' })
    await svc.updateSession(sessionId, { status: 'round_intro', current_round: roundIndex + 1 })
    svc.broadcast({ type: 'session_status_changed', status: 'round_intro', currentRound: roundIndex + 1 })
  },

  async hostStartQuestion(questionIndex) {
    const { sessionId, currentRound, rounds } = get()
    const round = rounds[currentRound - 1]
    if (!round) return

    // Generate questions for this round if not yet done
    let { roundQuestions } = get()
    if (roundQuestions.length === 0) {
      if (round.customDeckId) {
        const customDeck = await fetchCustomDeckFull(round.customDeckId)
        roundQuestions = buildPubQuizQuestions(round.customDeckId, customDeck, 'cs', round.questionCount)
      } else if (round.setSlug) {
        roundQuestions = buildPubQuizQuestions(round.setSlug, null, 'cs', round.questionCount)
      }
      set({ roundQuestions })
    }

    if (!roundQuestions[questionIndex]) return

    const question = roundQuestions[questionIndex]
    const timerSeconds = round.gameMode === 'bleskovy_kviz' ? 20 : 30
    const questionStartTime = Date.now()

    set({
      status: 'question_active',
      currentQuestion: questionIndex + 1,
      currentQuestionData: question,
      timerSeconds,
      timerRemaining: timerSeconds,
      answeredTeamIds: new Set(),
      _questionStartTime: questionStartTime,
    })

    await svc.updateSession(sessionId, {
      status: 'question_active',
      current_question: questionIndex + 1,
      timer_active: timerSeconds > 0,
      timer_seconds: timerSeconds,
      timer_started_at: new Date(questionStartTime).toISOString(),
    })

    svc.broadcast({
      type: 'question_started',
      roundNumber: currentRound,
      questionIndex,
      question,
      timerSeconds,
      questionStartTime,
    })

    // Start timer
    get()._stopTimer()
    if (timerSeconds > 0) {
      const interval = setInterval(() => {
        const remaining = get().timerRemaining
        if (remaining === null || remaining <= 0) {
          get()._stopTimer()
          return
        }
        const next = remaining - 1
        set({ timerRemaining: next })
        svc.broadcast({ type: 'timer_tick', remaining: next })
        if (next <= 0) {
          get()._stopTimer()
        }
      }, 1000)
      set({ _timerInterval: interval })
    }
  },

  hostPauseQuestion() {
    get()._stopTimer()
    set({ status: 'question_paused' })
    svc.broadcast({ type: 'question_paused' })
  },

  hostResumeQuestion() {
    const { timerRemaining, timerSeconds } = get()
    const resumeTime = Date.now()
    set({ status: 'question_active' })
    svc.broadcast({ type: 'question_resumed', questionStartTime: resumeTime, timerRemaining: timerRemaining ?? timerSeconds })

    // Resume timer from remaining
    if (timerRemaining && timerRemaining > 0) {
      const interval = setInterval(() => {
        const rem = get().timerRemaining
        if (rem === null || rem <= 0) { get()._stopTimer(); return }
        const next = rem - 1
        set({ timerRemaining: next })
        svc.broadcast({ type: 'timer_tick', remaining: next })
        if (next <= 0) get()._stopTimer()
      }, 1000)
      set({ _timerInterval: interval, _questionStartTime: resumeTime })
    }
  },

  async hostEndQuestion() {
    const { sessionId, currentRound, currentQuestion, rounds, teams, _questionStartTime, timerSeconds } = get()
    get()._stopTimer()
    const round = rounds[currentRound - 1]
    if (!round) return

    // Score all answers for this question
    const questionIndex = currentQuestion - 1
    const { currentQuestionData } = get()
    if (!currentQuestionData) return

    const scores = await svc.scoreAnswers(
      sessionId,
      currentRound,
      questionIndex,
      currentQuestionData.correct,
      round.gameMode,
      round.doublePoints,
      round.gameMode === 'bleskovy_kviz' ? timerSeconds : undefined,
      _questionStartTime ?? undefined,
    )

    // Update team total scores locally
    const updatedTeams = teams.map(t => ({
      ...t,
      totalScore: t.totalScore + (scores.get(t.id) ?? 0),
    }))
    set({ teams: updatedTeams })
    await svc.updateTeamScores(updatedTeams.map(t => ({ id: t.id, totalScore: t.totalScore })))
  },

  async hostFinishSession() {
    const { sessionId, teams } = get()
    const finalScores: RoundScore[] = [...teams]
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((t, i) => ({ teamId: t.id, teamName: t.name, avatar: t.avatar, color: t.color, score: t.totalScore, position: i + 1 }))

    await svc.updateSession(sessionId, { status: 'finished' })
    set({ status: 'finished', roundScores: finalScores })
    svc.broadcast({ type: 'session_finished', finalScores })
  },

  async hostNextRound() {
    const { currentRound, rounds } = get()
    if (currentRound >= rounds.length) {
      await get().hostFinishSession()
      return
    }
    await get().hostStartRound(currentRound) // currentRound is 1-indexed, next is currentRound
  },

  hostRevealNextTeam() {
    const { revealedCount, roundScores } = get()
    const next = revealedCount + 1
    set({ revealedCount: next })
    svc.broadcast({ type: 'next_team_revealed', revealedCount: next })
    if (next >= roundScores.length) {
      // All revealed — update session status
      svc.updateSession(get().sessionId, { status: 'round_results' })
    }
  },

  // ── Team actions ──────────────────────────────────────────────────────────

  async teamJoin(name, avatar, color) {
    const { sessionId } = get()
    if (!sessionId) return false
    const team = await svc.joinTeam(sessionId, name, avatar, color)
    if (!team) return false
    set({ myTeamId: team.id, myTeamName: name, teams: [...get().teams, team] })
    svc.broadcast({ type: 'team_joined', team })
    return true
  },

  teamSelectAnswer(answer) {
    if (get().hasSubmitted) return
    set({ selectedAnswer: answer })
  },

  async teamSubmitAnswer() {
    const { sessionId, myTeamId, currentRound, currentQuestion, selectedAnswer } = get()
    if (!selectedAnswer || !myTeamId) return
    set({ hasSubmitted: true })
    await svc.submitAnswer(sessionId, myTeamId, currentRound, currentQuestion - 1, selectedAnswer)
    svc.broadcast({ type: 'answer_submitted', teamId: myTeamId, questionIndex: currentQuestion - 1 })
  },

  teamChangeAnswer() {
    set({ hasSubmitted: false, selectedAnswer: null })
  },

  // ── Event handler (called for all roles on broadcast) ─────────────────────

  applyEvent(event) {
    switch (event.type) {
      case 'session_status_changed':
        set({ status: event.status, currentRound: event.currentRound ?? get().currentRound })
        break
      case 'question_started':
        set({
          status: 'question_active',
          currentRound: event.roundNumber,
          currentQuestion: event.questionIndex + 1,
          currentQuestionData: event.question,
          timerSeconds: event.timerSeconds ?? 0,
          timerRemaining: event.timerSeconds ?? null,
          answeredTeamIds: new Set(),
          selectedAnswer: null,
          hasSubmitted: false,
          _questionStartTime: event.questionStartTime,
        })
        break
      case 'question_paused':
        set({ status: 'question_paused' })
        break
      case 'question_resumed':
        set({ status: 'question_active', timerRemaining: event.timerRemaining })
        break
      case 'timer_tick':
        set({ timerRemaining: event.remaining })
        break
      case 'answer_submitted': {
        const ids = new Set(get().answeredTeamIds)
        ids.add(event.teamId)
        set({ answeredTeamIds: ids })
        break
      }
      case 'team_joined': {
        const existing = get().teams.find(t => t.id === event.team.id)
        if (!existing) set({ teams: [...get().teams, event.team] })
        break
      }
      case 'round_results_reveal':
        set({ status: 'round_results', roundScores: event.scores, revealedCount: event.revealedCount })
        break
      case 'next_team_revealed':
        set({ revealedCount: event.revealedCount })
        break
      case 'session_finished':
        set({ status: 'finished', roundScores: event.finalScores })
        break
    }
  },

  reset() {
    get()._stopTimer()
    svc.leaveChannel()
    set(DEFAULT)
  },

  // Internal helper — not part of public API but needs to be accessible
  _stopTimer() {
    const interval = get()._timerInterval
    if (interval) { clearInterval(interval); set({ _timerInterval: null }) }
  },
} as PubQuizState & PubQuizActions))
