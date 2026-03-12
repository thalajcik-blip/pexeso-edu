import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { useGameStore, getSavedSession } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import type { ThemeColors } from '../../data/themes'
import { TRANSLATIONS } from '../../data/translations'
import { PLAYER_COLORS, MAX_LIGHTNING_PLAYERS } from '../../types/game'

function TimePicker({ label, value, options, offLabel, onChange, tc }: {
  label: string
  value: number
  options: number[]
  offLabel?: string
  onChange: (v: number) => void
  tc: ThemeColors
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest mb-1.5" style={{ color: tc.textMuted }}>{label}</div>
      <div className="flex gap-1.5 flex-wrap">
        {options.map(opt => {
          const active = value === opt
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={active
                ? { background: tc.accentBgActive, border: `1.5px solid ${tc.accentBorderActive}`, color: tc.accent }
                : { background: tc.inputBg, border: `1.5px solid ${tc.inputBorder}`, color: tc.textDim }
              }
            >
              {opt === 0 && offLabel ? offLabel : `${opt}s`}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function LobbyScreen() {
  const theme           = useGameStore(s => s.theme)
  const language        = useGameStore(s => s.language)
  const roomId          = useGameStore(s => s.roomId)
  const isHost          = useGameStore(s => s.isHost)
  const lobbyPlayers    = useGameStore(s => s.lobbyPlayers)
  const myPlayerId      = useGameStore(s => s.myPlayerId)
  const playerNames     = useGameStore(s => s.playerNames)
  const turnTime        = useGameStore(s => s.turnTime)
  const quizTime        = useGameStore(s => s.quizTime)
  const setTurnTime     = useGameStore(s => s.setTurnTime)
  const setQuizTime     = useGameStore(s => s.setQuizTime)
  const openRules                 = useGameStore(s => s.openRules)
  const createRoom                = useGameStore(s => s.createRoom)
  const joinRoom                  = useGameStore(s => s.joinRoom)
  const leaveRoom                 = useGameStore(s => s.leaveRoom)
  const startOnlineGame           = useGameStore(s => s.startOnlineGame)
  const startOnlineLightningGame  = useGameStore(s => s.startOnlineLightningGame)
  const resetToSetup              = useGameStore(s => s.resetToSetup)
  const gameMode                  = useGameStore(s => s.gameMode)
  const lightningQuestionCount    = useGameStore(s => s.lightningQuestionCount)
  const lightningTimeLimit        = useGameStore(s => s.lightningTimeLimit)
  const openSettingsModal         = useGameStore(s => s.openSettingsModal)
  const changeMyLobbyName         = useGameStore(s => s.changeMyLobbyName)
  const hostOpeningSettings       = useGameStore(s => s.hostOpeningSettings)

  const tc = THEMES[theme]
  const tr = TRANSLATIONS[language]

  const [view, setView]       = useState<'choice' | 'join-code'>('choice')
  const [myName, setMyName]   = useState(() => {
    const base = (playerNames[0] || 'Hráč').replace(/\s*\d+$/, '')
    return `${base} ${Math.floor(Math.random() * 900) + 100}`
  })
  const [codeInput, setCodeInput] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied]   = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')

  // Pre-fill from URL param ?room=CODE or sessionStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlRoom = params.get('room')
    if (urlRoom) {
      setCodeInput(urlRoom.toUpperCase())
      setView('join-code')
    } else {
      const saved = getSavedSession()
      if (saved) {
        setCodeInput(saved.roomId)
        setMyName(saved.myName)
        setView('join-code')
      }
    }
  }, [])

  const inRoom   = roomId !== null
  const maxPlayers = gameMode === 'lightning' ? MAX_LIGHTNING_PLAYERS : 6
  const canStart = isHost && lobbyPlayers.length >= 2 && lobbyPlayers.length <= maxPlayers
  const shareUrl = roomId ? `${window.location.origin}${window.location.pathname}?room=${roomId}` : ''

  const inactiveBtn = { background: tc.btnInactiveBg, borderColor: tc.btnInactiveBorder, color: tc.btnInactiveText }

  const handleCreate = async () => {
    if (!myName.trim()) return
    setLoading(true); setError(null)
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
    setLoading(true); setError(null)
    try {
      await joinRoom(code, myName.trim())
    } catch {
      setError(tr.roomNotFound)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = async () => {
    if (!roomId) return
    await navigator.clipboard.writeText(roomId)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(shareUrl)
    setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2000)
  }

  // Sort: host first, then by joinedAt
  const sortedPlayers = [...lobbyPlayers].sort((a, b) => {
    if (a.isHost && !b.isHost) return -1
    if (!a.isHost && b.isHost) return 1
    return a.joinedAt - b.joinedAt
  })

  return (
    <div className="flex flex-col items-center justify-start min-h-screen px-4 pb-28 gap-4" style={{ paddingTop: 'max(5vh, 1.5rem)' }}>
      {/* Logo */}
      <div className="flex items-center gap-2">
        <img src={theme === 'light' ? '/logo-light.svg' : '/logo.svg'} alt="Pexedu logo" className="w-10 h-10" />
        <h1 className="text-3xl font-semibold tracking-tight lowercase relative -top-0.5" style={{ color: tc.textMuted }}>
          Pexedu
        </h1>
      </div>

      <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: tc.surface, border: `1px solid ${tc.surfaceBorder}` }}>

        {/* ── NAME INPUT ── */}
        {!inRoom && (
          <div>
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: tc.textMuted }}>{tr.yourName}</div>
            <input
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors"
              style={{ background: tc.inputBg, border: `1px solid ${tc.inputBorder}`, color: tc.text }}
              value={myName}
              placeholder={tr.defaultPlayerNames[0]}
              onChange={e => setMyName(e.target.value)}
              onFocus={e => e.target.style.borderColor = tc.accent}
              onBlur={e => e.target.style.borderColor = tc.inputBorder}
            />
          </div>
        )}

        {/* ── CHOICE ── */}
        {!inRoom && view === 'choice' && (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCreate}
              disabled={loading || !myName.trim()}
              className="w-full py-3.5 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: tc.accentGradient, color: tc.accentText, boxShadow: `0 4px 20px ${tc.accentGlow}` }}
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

        {/* ── JOIN CODE ── */}
        {!inRoom && view === 'join-code' && (
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-widest mb-2" style={{ color: tc.textMuted }}>{tr.roomCode}</div>
            <input
              className="w-full rounded-lg px-3 py-3 text-center text-2xl font-bold tracking-widest uppercase outline-none transition-colors"
              style={{ background: tc.inputBg, border: `1px solid ${tc.inputBorder}`, color: tc.text }}
              value={codeInput}
              placeholder="ABC123"
              maxLength={6}
              autoFocus
              onChange={e => setCodeInput(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              onFocus={e => e.target.style.borderColor = tc.accent}
              onBlur={e => e.target.style.borderColor = tc.inputBorder}
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
                style={{ background: tc.accentGradient, color: tc.accentText }}
              >
                {loading ? tr.connecting : tr.joinRoom}
              </button>
            </div>
          </div>
        )}

        {/* ── WAITING ROOM ── */}
        {inRoom && (
          <div className="space-y-4">
            {/* Room code + share */}
            {isHost && (
              <div>
                <div className="text-xs uppercase tracking-widest mb-2" style={{ color: tc.textMuted }}>{tr.roomCode}</div>
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="flex-1 rounded-lg px-4 py-2.5 text-center text-2xl font-bold tracking-widest"
                    style={{ background: tc.inputBg, border: `1px solid ${tc.inputBorder}`, color: tc.accent }}
                  >
                    {roomId}
                  </div>
                  <button onClick={handleCopyCode} className="px-3 py-2.5 rounded-lg border-2 text-sm transition-all" style={inactiveBtn}>
                    {copied ? tr.copied : '📋'}
                  </button>
                </div>
                {/* Share URL */}
                <button
                  onClick={handleCopyUrl}
                  className="w-full py-2 rounded-lg text-xs font-medium transition-all"
                  style={{ background: tc.accentBgActive, color: tc.accent, border: `1px solid ${tc.accentBorderActive}` }}
                >
                  {copiedUrl ? tr.copied : `🔗 ${shareUrl}`}
                </button>
                {/* QR Code */}
                <div className="flex justify-center mt-3">
                  <div className="p-3 rounded-xl bg-white">
                    <QRCode value={shareUrl} size={140} />
                  </div>
                </div>
              </div>
            )}

            {/* Players list */}
            <div>
              <div className="text-xs uppercase tracking-widest mb-3" style={{ color: tc.textMuted }}>
                {tr.connectedPlayers} ({sortedPlayers.length})
              </div>
              <div className="space-y-2">
                {sortedPlayers.map((p, displayIdx) => {
                  const isMe = p.id === myPlayerId
                  const rowStyle = isMe && editingName
                    ? { background: tc.inputBg, border: `1px solid ${tc.accent}` }
                    : { background: tc.inputBg, border: `1px solid ${tc.inputBorder}` }
                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                      style={rowStyle}
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PLAYER_COLORS[displayIdx] }} />
                      {isMe && editingName ? (
                        <input
                          autoFocus
                          className="flex-1 text-sm font-medium outline-none bg-transparent"
                          style={{ color: tc.text }}
                          value={editNameValue}
                          maxLength={20}
                          onChange={e => setEditNameValue(e.target.value)}
                          onBlur={() => {
                            const name = editNameValue.trim() || p.name
                            setEditingName(false)
                            if (name !== p.name) changeMyLobbyName(name)
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const name = editNameValue.trim() || p.name
                              setEditingName(false)
                              if (name !== p.name) changeMyLobbyName(name)
                            }
                            if (e.key === 'Escape') setEditingName(false)
                          }}
                        />
                      ) : (
                        <span
                          className="font-medium flex-1 min-w-0 truncate"
                          style={{ color: tc.text }}
                        >
                          {p.name}
                        </span>
                      )}
                      {p.isHost && (
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: tc.accentBgActive, color: tc.accent }}>
                          {tr.lobbyHost}
                        </span>
                      )}
                      {isMe && !editingName && (
                        <button
                          onClick={() => { setEditNameValue(p.name); setEditingName(true) }}
                          className="text-xs px-2 py-0.5 rounded-md flex-shrink-0 transition-all opacity-50 hover:opacity-100"
                          style={{ background: tc.accentBgActive, color: tc.accent, border: `1px solid ${tc.accentBorderActive}` }}
                        >
                          ✏️ {tr.you}
                        </button>
                      )}
                    </div>
                  )
                })}
                {/* Empty slot */}
                {sortedPlayers.length < (gameMode === 'lightning' ? MAX_LIGHTNING_PLAYERS : 6) && (
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: tc.inputBg, border: `1px dashed ${tc.inputBorder}`, opacity: 0.5 }}
                  >
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: tc.textFaint }} />
                    <span className="text-sm" style={{ color: tc.textFaint }}>...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Time settings */}
            {gameMode === 'lightning' ? (
              <div className="text-xs text-center py-1 px-3 rounded-xl" style={{ background: tc.accentBgActive, color: tc.accent }}>
                🔥 {tr.modeLightning} · {lightningQuestionCount === 0 ? tr.questionCountAll : lightningQuestionCount} {tr.questionCountLabel.toLowerCase()} · {lightningTimeLimit}s
              </div>
            ) : isHost ? (
              <div className="space-y-3">
                <TimePicker
                  label={tr.turnTimeLabel}
                  value={turnTime}
                  options={[0, 10, 20, 30, 60]}
                  offLabel={tr.turnTimeOff}
                  onChange={setTurnTime}
                  tc={tc}
                />
                <TimePicker
                  label={tr.quizTimeLabel}
                  value={quizTime}
                  options={[3, 5, 10, 15]}
                  onChange={setQuizTime}
                  tc={tc}
                />
              </div>
            ) : (
              <div className="flex gap-4 text-xs justify-center" style={{ color: tc.textFaint }}>
                <span>{tr.turnTimeLabel}: {turnTime === 0 ? tr.turnTimeOff : `${turnTime}s`}</span>
                <span>{tr.quizTimeLabel}: {quizTime}s</span>
              </div>
            )}

            {/* Status / waiting badge */}
            {!isHost && hostOpeningSettings ? (
              <div className="text-sm text-center py-2 px-3 rounded-xl" style={{ background: tc.accentBgActive, color: tc.accent }}>
                ⚙️ {tr.hostChangingSettings}
              </div>
            ) : (
              <div className="text-sm text-center" style={{ color: tc.textDim }}>
                {isHost ? (canStart ? '' : tr.waitingForPlayers) : tr.waitingForHost}
              </div>
            )}

            {/* Start (host only) */}
            {isHost && (
              <>
                <button
                  onClick={gameMode === 'lightning' ? startOnlineLightningGame : startOnlineGame}
                  disabled={!canStart}
                  className="w-full py-3.5 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: tc.accentGradient, color: tc.accentText, boxShadow: canStart ? `0 4px 20px ${tc.accentGlow}` : 'none' }}
                >
                  {tr.startOnlineGame} ▶
                </button>
                <button
                  onClick={openSettingsModal}
                  className="w-full py-2.5 rounded-xl border text-sm font-medium transition-all opacity-60 hover:opacity-100"
                  style={inactiveBtn}
                >
                  ⚙️ {tr.changeGameSettings}
                </button>
              </>
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

      <div className="flex gap-4">
        {!inRoom && view === 'choice' && (
          <button onClick={resetToSetup} className="text-sm opacity-35 hover:opacity-70 transition-opacity">
            ← {tr.backBtn}
          </button>
        )}
        <button onClick={openRules} className="text-sm opacity-35 hover:opacity-70 transition-opacity">
          {tr.rulesLink}
        </button>
      </div>
    </div>
  )
}
