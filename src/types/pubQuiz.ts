import type { LightningQuestion } from './game'

export type SessionStatus =
  | 'lobby'
  | 'round_intro'
  | 'question_active'
  | 'question_paused'
  | 'round_results'
  | 'finished'

export interface PubQuizRound {
  id?: string
  roundNumber: number
  gameMode: 'pexequiz' | 'bleskovy_kviz'
  setSlug?: string          // built-in deck id
  customDeckId?: string
  questionCount: number
  doublePoints: boolean
  status: 'pending' | 'active' | 'completed'
}

export interface PubQuizTeam {
  id: string
  name: string
  avatar: string
  color: string
  totalScore: number
}

export interface RoundScore {
  teamId: string
  teamName: string
  avatar: string
  color: string
  score: number
  position: number
}

// Events sent over Supabase Broadcast channel `pub-quiz-${sessionCode}`
export type PubQuizEvent =
  | { type: 'session_status_changed'; status: SessionStatus; currentRound?: number }
  | { type: 'question_started'; roundNumber: number; questionIndex: number; question: LightningQuestion; timerSeconds?: number; questionStartTime: number }
  | { type: 'question_paused' }
  | { type: 'question_resumed'; questionStartTime: number; timerRemaining: number }
  | { type: 'round_results_reveal'; roundNumber: number; scores: RoundScore[]; revealedCount: number }
  | { type: 'next_team_revealed'; revealedCount: number }
  | { type: 'session_finished'; finalScores: RoundScore[] }
  | { type: 'answer_submitted'; teamId: string; questionIndex: number }
  | { type: 'team_joined'; team: PubQuizTeam }
  | { type: 'team_scores_updated'; teams: { id: string; totalScore: number }[] }
  | { type: 'timer_tick'; remaining: number }

export const TEAM_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7', '#f97316', '#06b6d4', '#ec4899']
export const TEAM_AVATARS = ['🎯', '🚀', '⚡', '🌟', '🔥', '🎸', '🏆', '🦁', '🐉', '🌈', '💎', '🎭']
