import { useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import { TRANSLATIONS } from '../../data/translations'
import { PLAYER_COLORS } from '../../types/game'

export default function LobbyScreen() {
  const theme         = useGameStore(s => s.theme)
  const language      = useGameStore(s => s.language)
  const roomId        = useGameStore(s => s.roomId)
  const isHost        = useGameStore(s => s.isHost)
  const lobbyPlayers  = useGameStore(s => s.lobbyPlayers)
  const myPlayerIndex = useGameStore(s => s.myPlayerIndex)
  const playerNames   = useGameStore(s => s.playerNames)
  const createRoom    = useGameStore(s => s.createRoom)
  const joinRoom      = useGameStore(s => s.joinRoom)
  const leaveRoom     = useGameStore(s => s.leaveRoom)
  const startOnlineGame = useGameStore(s => s.startOnlineGame)
  const resetToSetup  = useGameStore(s => s.resetToSetup)

  const tc = THEMES[theme]
  const tr = TRANSLATIONS[language]

  const [view, setView]         = useState<'choice' | 'join-code'>('choice')
  const [myName, setMyName]     = useState(playerNames[0] || '')
  const [codeInput, setCodeInput] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [copied, setCopied]     = useState(false)

  const inRoom  = roomId !== null
  const canStart = isHost && lobbyPlayers.length >= 2

  const inactiveBtn = { background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder, color: tc.btnInactiveText }

  const handleCreate = async () => {
    if (!myName.trim()) return
    setLoading(true)
    setError(null)
    try {
      await createRoom(myName.trim())
    } catch {
      setError(tr.roomNotFound)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    const code = codeInput.trim().toUpperCase()
    if (code.length < 6 || !myName.trim()) return
    setLoading(true)
    setError(null)
    try {
      await joinRoom(code, myName.trim())
    } catch {
      setError(tr.roomNotFound)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!roomId) return
    await navigator.clipboard.writeText(roomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen px-4 pb-28 gap-4" style={{ paddingTop: 'max(5vh, 1.5rem)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3">
        <img src={theme === 'light' ? '/logo-light.svg' : '/logo.svg'} alt="QuizMatch" className="w-14 h-14 drop-shadow-lg" />
        <h1 className="text-5xl font-bold tracking-tight" style={{ color: tc.accent, textShadow: `0 0 40px ${tc.accentGlow}` }}>
          QuizMatch
        </h1>
      </div>

      <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: tc.surface, border: `1px solid ${tc.surfaceBorder}` }}>

        {/* ── NAME INPUT (pre-room views only) ── */}
        {!inRoom && (
          <div>
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: tc.textMuted }}>{tr.namesLabel}</div>
            <input
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none"
              style={{ background: tc.inputBg, border: `1px solid ${tc.inputBorder}`, color: tc.text }}
              value={myName}
              placeholder={tr.defaultPlayerNames[0]}
              onChange={e => setMyName(e.target.value)}
            />
          </div>
        )}

        {/* ── CHOICE: Create / Join ── */}
        {!inRoom && view === 'choice' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCreate}
              disabled={loading || !myName.trim()}
              className="w-full py-3.5 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: tc.accent, color: tc.accentText, boxShadow: `0 4px 20px ${tc.accentGlow}` }}
            >
              {loading ? tr.connecting : tr.createRoom}
            </button>
            <button
              onClick={() => { setView('join-code'); setError(null) }}
              disabled={loading}
              className="w-full py-3 rounded-xl border-2 text-base font-bold transition-all"
              style={inactiveBtn}
            >
              {tr.joinRoom}
            </button>
          </div>
        )}

        {/* ── JOIN: Code input ── */}
        {!inRoom && view === 'join-code' && (
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: tc.textMuted }}>{tr.roomCode}</div>
            <input
              className="w-full rounded-lg px-3 py-3 text-center text-2xl font-bold tracking-widest uppercase outline-none"
              style={{ background: tc.inputBg, border: `1px solid ${tc.inputBorder}`, color: tc.text }}
              value={codeInput}
              placeholder="ABC123"
              maxLength={6}
              autoFocus
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setView('choice'); setError(null) }}
                className="flex-1 py-3 rounded-xl border-2 font-bold transition-all"
                style={inactiveBtn}
              >
                ← {tr.backBtn}
              </button>
              <button
                onClick={handleJoin}
                disabled={loading || codeInput.length < 6 || !myName.trim()}
                className="flex-1 py-3 rounded-xl font-bold transition-all disabled:opacity-50"
                style={{ background: tc.accent, color: tc.accentText }}
              >
                {loading ? tr.connecting : tr.joinRoom}
              </button>
            </div>
          </div>
        )}

        {/* ── WAITING ROOM ── */}
        {inRoom && (
          <div className="space-y-4">
            {/* Room code (host sees, to share) */}
            {isHost && (
              <div>
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: tc.textMuted }}>{tr.roomCode}</div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex-1 rounded-lg px-4 py-2.5 text-center text-2xl font-bold tracking-widest"
                    style={{ background: tc.inputBg, border: `1px solid ${tc.inputBorder}`, color: tc.accent }}
                  >
                    {roomId}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all"
                    style={inactiveBtn}
                  >
                    {copied ? tr.copied : '📋'}
                  </button>
                </div>
              </div>
            )}

            {/* Player slots */}
            <div>
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>
                {tr.connectedPlayers} ({lobbyPlayers.length}/2)
              </div>
              <div className="space-y-2">
                {[0, 1].map(idx => {
                  const p = lobbyPlayers.find(pl => pl.index === idx)
                  const isMe = idx === myPlayerIndex
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: tc.inputBg, border: `1px solid ${tc.inputBorder}` }}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: p ? PLAYER_COLORS[idx] : tc.textFaint }}
                      />
                      <span className="font-medium flex-1" style={{ color: p ? tc.text : tc.textFaint }}>
                        {p ? p.name : '...'}
                      </span>
                      {p?.isHost && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: tc.accentBgActive, color: tc.accent }}>
                          {tr.lobbyHost}
                        </span>
                      )}
                      {isMe && p && (
                        <span className="text-xs" style={{ color: tc.textFaint }}>{tr.you}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Status */}
            <div className="text-sm text-center" style={{ color: tc.textDim }}>
              {isHost
                ? (canStart ? '' : tr.waitingForPlayers)
                : tr.waitingForHost}
            </div>

            {/* Start (host only) */}
            {isHost && (
              <button
                onClick={startOnlineGame}
                disabled={!canStart}
                className="w-full py-3.5 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: tc.accent, color: tc.accentText, boxShadow: canStart ? `0 4px 20px ${tc.accentGlow}` : 'none' }}
              >
                {tr.startOnlineGame} ▶
              </button>
            )}

            {/* Leave */}
            <button
              onClick={leaveRoom}
              className="w-full py-2.5 rounded-xl border text-sm font-medium transition-all opacity-40 hover:opacity-80"
              style={inactiveBtn}
            >
              {tr.leaveRoom}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-sm text-center px-4 py-2 rounded-xl" style={{ background: tc.errorBg, color: tc.errorColor }}>
            {error}
          </div>
        )}
      </div>

      {/* Back to setup (pre-room only) */}
      {!inRoom && (
        <button onClick={resetToSetup} className="text-sm opacity-35 hover:opacity-70 transition-opacity">
          ← {tr.backBtn}
        </button>
      )}
    </div>
  )
}
