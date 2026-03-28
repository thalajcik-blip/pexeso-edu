import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { useClassroomStore } from '../../store/classroomStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import { DECKS } from '../../data/decks'
import { supabase } from '../../services/supabase'

interface AssignDeckModalProps {
  classId: string
  open: boolean
  onClose: () => void
}

interface CustomDeckRow {
  id: string
  title: string
  language: string
}

const TEXTS = {
  cs: {
    title: 'Přiřadit sadu',
    builtInSection: 'Zabudované sady',
    customSection: 'Vlastní sady',
    cards: 'karet',
    assign: 'Přiřadit',
    assigning: 'Přiřazuje se...',
    noCustom: 'Žádné schválené vlastní sady.',
    loadingCustom: 'Načítání...',
    close: 'Zavřít',
  },
  sk: {
    title: 'Priradiť sadu',
    builtInSection: 'Vbudované sady',
    customSection: 'Vlastné sady',
    cards: 'kariet',
    assign: 'Priradiť',
    assigning: 'Priraďuje sa...',
    noCustom: 'Žiadne schválené vlastné sady.',
    loadingCustom: 'Načítavanie...',
    close: 'Zavrieť',
  },
  en: {
    title: 'Assign deck',
    builtInSection: 'Built-in decks',
    customSection: 'Custom decks',
    cards: 'cards',
    assign: 'Assign',
    assigning: 'Assigning...',
    noCustom: 'No approved custom decks.',
    loadingCustom: 'Loading...',
    close: 'Close',
  },
}

export default function AssignDeckModal({ classId, open, onClose }: AssignDeckModalProps) {
  const theme = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t = TEXTS[language]

  const assignDeck = useClassroomStore(s => s.assignDeck)

  const [customDecks, setCustomDecks] = useState<CustomDeckRow[]>([])
  const [loadingCustom, setLoadingCustom] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoadingCustom(true)
    supabase
      .from('custom_decks')
      .select('id, title, language')
      .eq('status', 'approved')
      .order('title', { ascending: true })
      .then(({ data }) => {
        setCustomDecks(data ?? [])
        setLoadingCustom(false)
      })
  }, [open])

  const handleAssignBuiltIn = async (deckId: string) => {
    setAssigning(`builtin-${deckId}`)
    await assignDeck(classId, deckId, null)
    setAssigning(null)
    onClose()
  }

  const handleAssignCustom = async (customDeckId: string) => {
    setAssigning(`custom-${customDeckId}`)
    await assignDeck(classId, null, customDeckId)
    setAssigning(null)
    onClose()
  }

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  }

  const sectionHeadingStyle: React.CSSProperties = {
    color: tc.textMuted,
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
    margin: 0,
  }

  const deckRowStyle = (isAssigning: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    background: tc.surface,
    border: `1px solid ${tc.surfaceBorder}`,
    borderRadius: 8,
    opacity: isAssigning ? 0.6 : 1,
    gap: 12,
  })

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent
        style={{
          background: tc.modalSurface,
          border: `1px solid ${tc.modalSurfaceBorder}`,
          color: tc.text,
          maxWidth: 520,
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: tc.text }}>{t.title}</DialogTitle>
        </DialogHeader>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 8 }}>
          {/* Built-in decks */}
          <div style={sectionStyle}>
            <p style={sectionHeadingStyle}>{t.builtInSection}</p>
            {DECKS.map(deck => {
              const key = `builtin-${deck.id}`
              const isAssigning = assigning === key
              const cardCount = Object.keys(deck.pool).length
              return (
                <div key={deck.id} style={deckRowStyle(!!assigning)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{deck.icon}</span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, color: tc.text, fontSize: 14 }}>{deck.label}</p>
                      <p style={{ margin: 0, color: tc.textMuted, fontSize: 12 }}>{cardCount} {t.cards}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={!!assigning}
                    onClick={() => handleAssignBuiltIn(deck.id)}
                    style={{
                      background: tc.accentGradient,
                      color: tc.accentText,
                      border: 'none',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {isAssigning ? t.assigning : t.assign}
                  </Button>
                </div>
              )
            })}
          </div>

          {/* Custom decks */}
          <div style={sectionStyle}>
            <p style={sectionHeadingStyle}>{t.customSection}</p>
            {loadingCustom ? (
              <p style={{ color: tc.textMuted, fontSize: 13 }}>{t.loadingCustom}</p>
            ) : customDecks.length === 0 ? (
              <p style={{ color: tc.textMuted, fontSize: 13 }}>{t.noCustom}</p>
            ) : (
              customDecks.map(deck => {
                const key = `custom-${deck.id}`
                const isAssigning = assigning === key
                return (
                  <div key={deck.id} style={deckRowStyle(!!assigning)}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, color: tc.text, fontSize: 14 }}>{deck.title}</p>
                      <p style={{ margin: 0, color: tc.textMuted, fontSize: 12 }}>
                        {deck.language.toUpperCase()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={!!assigning}
                      onClick={() => handleAssignCustom(deck.id)}
                      style={{
                        background: tc.accentGradient,
                        color: tc.accentText,
                        border: 'none',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {isAssigning ? t.assigning : t.assign}
                    </Button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
