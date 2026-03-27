/**
 * Supabase Realtime multiplayer service.
 *
 * Required Supabase SQL (run once in Supabase SQL editor):
 *
 *   create table rooms (
 *     id       text primary key,
 *     host_id  text not null,
 *     settings jsonb not null default '{}',
 *     created_at timestamptz default now()
 *   );
 *   alter table rooms enable row level security;
 *   create policy "open" on rooms for all using (true) with check (true);
 */

import { supabase } from './supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { CardData, GamePhase, LightningQuestion } from '../types/game'
import type { Player } from '../types/game'

export type LobbyPlayer = {
  id: string
  name: string
  isHost: boolean
  joinedAt: number
  avatarId?: number
}

export type RoomSettings = {
  deckId: string
  size: string
  language: string
  turnTime: number
  quizTime: number
  gameMode: 'pexequiz' | 'lightning'
  lightningQuestionCount?: number
  lightningTimeLimit?: number
}

export type GameAction =
  | { type: 'flip_card'; index: number }
  | { type: 'turn_timeout' }
  | { type: 'quiz_vote'; playerId: string; answer: string }
  | { type: 'answer_quiz'; correct: boolean }
  | { type: 'emoji_react'; playerId: string; emoji: string }
  | { type: 'game_start'; cardSymbols: string[]; playerIds: string[]; playerNames: string[]; deckId: string; size: string; turnTime: number; quizTime: number; startingPlayer: number }
  | { type: 'state_snapshot'; phase: GamePhase; cards: CardData[]; players: Player[]; currentPlayer: number; quizSymbol: string | null; playerIds: string[] }
  | { type: 'rematch_request' }
  | { type: 'lightning_start'; questions: LightningQuestion[]; playerIds: string[]; playerNames: string[]; questionEndTime: number }
  | { type: 'lightning_answer'; playerId: string; answer: string; timeMs: number }
  | { type: 'host_opening_settings' }
  | { type: 'settings_updated'; deckId: string; gameMode: 'pexequiz' | 'lightning'; size: string; lightningQuestionCount: number; lightningTimeLimit: number; turnTime: number; quizTime: number }
  | { type: 'player_name_changed'; playerId: string; name: string }

let channel: RealtimeChannel | null = null
let myCurrentPresence: LobbyPlayer | null = null

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function getPlayerId(): string {
  let id = sessionStorage.getItem('qm_player_id')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('qm_player_id', id)
  }
  return id
}

export async function createRoomInDb(code: string, hostId: string, settings: RoomSettings): Promise<void> {
  const { error } = await supabase.from('rooms').insert({ id: code, host_id: hostId, settings })
  if (error) throw error
}

export async function fetchRoomFromDb(code: string): Promise<{ host_id: string; settings: RoomSettings }> {
  const { data, error } = await supabase
    .from('rooms')
    .select('host_id, settings')
    .eq('id', code)
    .single()
  if (error) throw error
  return data
}

export async function deleteRoomFromDb(code: string): Promise<void> {
  await supabase.from('rooms').delete().eq('id', code)
}

export async function updateRoomInDb(code: string, settings: RoomSettings): Promise<void> {
  await supabase.from('rooms').update({ settings }).eq('id', code)
}

export async function updateMyPresence(updates: Partial<LobbyPlayer>): Promise<void> {
  if (!channel || !myCurrentPresence) return
  myCurrentPresence = { ...myCurrentPresence, ...updates }
  await channel.track(myCurrentPresence)
}

export function joinRealtimeChannel(
  code: string,
  myPresence: LobbyPlayer,
  onAction: (action: GameAction) => void,
  onPresenceChange: (players: LobbyPlayer[]) => void,
  onPresenceJoin: () => void,
): Promise<void> {
  channel = supabase.channel(`room:${code}`, {
    config: { presence: { key: myPresence.id } },
  })

  channel
    .on('broadcast', { event: 'action' }, ({ payload }) => {
      onAction(payload as GameAction)
    })
    .on('presence', { event: 'sync' }, () => {
      if (!channel) return
      const state = channel.presenceState<LobbyPlayer>()
      const players = Object.values(state).flat() as LobbyPlayer[]
      onPresenceChange(players)
    })
    .on('presence', { event: 'join' }, () => {
      onPresenceJoin()
    })

  return new Promise((resolve, reject) => {
    channel!.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        myCurrentPresence = myPresence
        await channel!.track(myPresence)
        resolve()
      } else if (status === 'CHANNEL_ERROR') {
        reject(new Error('Channel error'))
      }
    })
  })
}

export function leaveRealtimeChannel(): void {
  if (channel) {
    supabase.removeChannel(channel)
    channel = null
    myCurrentPresence = null
  }
}

export function broadcastGameAction(action: GameAction): void {
  if (!channel) return
  channel.send({ type: 'broadcast', event: 'action', payload: action })
}
