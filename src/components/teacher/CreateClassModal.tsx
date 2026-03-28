import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useClassroomStore } from '../../store/classroomStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'
import InviteCodeDisplay from './InviteCodeDisplay'

interface CreateClassModalProps {
  open: boolean
  onClose: () => void
}

const TEXTS = {
  cs: {
    title: 'Vytvořit třídu',
    nameLabel: 'Název třídy',
    namePlaceholder: 'Např. 5. A — Matematika',
    gdprText: 'Škola má souhlas rodičů žáků se zpracováním dat v Pexedu',
    submitBtn: 'Vytvořit třídu',
    creating: 'Vytváří se...',
    classCreated: 'Třída vytvořena!',
    close: 'Zavřít',
    errorName: 'Název třídy musí mít 3–50 znaků.',
    errorGdpr: 'Musíte potvrdit souhlas rodičů.',
  },
  sk: {
    title: 'Vytvoriť triedu',
    nameLabel: 'Názov triedy',
    namePlaceholder: 'Napr. 5. A — Matematika',
    gdprText: 'Škola má súhlas rodičov žiakov na spracovanie dát v Pexedu',
    submitBtn: 'Vytvoriť triedu',
    creating: 'Vytvára sa...',
    classCreated: 'Trieda vytvorená!',
    close: 'Zavrieť',
    errorName: 'Názov triedy musí mať 3–50 znakov.',
    errorGdpr: 'Musíte potvrdiť súhlas rodičov.',
  },
  en: {
    title: 'Create class',
    nameLabel: 'Class name',
    namePlaceholder: 'E.g. Year 5 — Math',
    gdprText: 'The school has parental consent for students to use Pexedu',
    submitBtn: 'Create class',
    creating: 'Creating...',
    classCreated: 'Class created!',
    close: 'Close',
    errorName: 'Class name must be 3–50 characters.',
    errorGdpr: 'You must confirm parental consent.',
  },
}

export default function CreateClassModal({ open, onClose }: CreateClassModalProps) {
  const theme = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t = TEXTS[language]

  const createClass = useClassroomStore(s => s.createClass)

  const [name, setName] = useState('')
  const [gdprChecked, setGdprChecked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  const handleClose = () => {
    setName('')
    setGdprChecked(false)
    setError(null)
    setCreatedCode(null)
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (name.trim().length < 3 || name.trim().length > 50) {
      setError(t.errorName)
      return
    }
    if (!gdprChecked) {
      setError(t.errorGdpr)
      return
    }

    setLoading(true)
    const result = await createClass(name.trim())
    setLoading(false)

    if ('error' in result) {
      setError(result.error)
      return
    }

    setCreatedCode(result.inviteCode)
  }

  return (
    <Dialog open={open} onOpenChange={open => { if (!open) handleClose() }}>
      <DialogContent style={{ background: tc.modalSurface, border: `1px solid ${tc.modalSurfaceBorder}`, color: tc.text, maxWidth: 480 }}>
        <DialogHeader>
          <DialogTitle style={{ color: tc.text }}>{t.title}</DialogTitle>
        </DialogHeader>

        {createdCode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <p style={{ color: tc.successColor, fontWeight: 600, margin: 0 }}>{t.classCreated}</p>
            <InviteCodeDisplay inviteCode={createdCode} />
            <Button
              onClick={handleClose}
              style={{
                background: tc.accentGradient,
                color: tc.accentText,
                border: 'none',
                fontWeight: 600,
              }}
            >
              {t.close}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ color: tc.textMuted, fontSize: 13, fontWeight: 600 }}>
                {t.nameLabel}
              </label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                maxLength={50}
                required
                style={{
                  background: tc.inputBg,
                  border: `1px solid ${tc.inputBorder}`,
                  color: tc.text,
                }}
              />
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                cursor: 'pointer',
                padding: '12px 14px',
                background: tc.surface,
                border: `1px solid ${gdprChecked ? tc.accentBorderActive : tc.surfaceBorder}`,
                borderRadius: 8,
              }}
            >
              <input
                type="checkbox"
                checked={gdprChecked}
                onChange={e => setGdprChecked(e.target.checked)}
                style={{ marginTop: 2, accentColor: tc.accent, width: 16, height: 16, flexShrink: 0 }}
              />
              <span style={{ color: tc.textDim, fontSize: 14, lineHeight: 1.5 }}>
                {t.gdprText}
              </span>
            </label>

            {error && (
              <p style={{ color: tc.errorColor, fontSize: 13, margin: 0 }}>{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !gdprChecked}
              style={{
                background: gdprChecked ? tc.accentGradient : tc.btnInactiveBg,
                color: gdprChecked ? tc.accentText : tc.btnInactiveText,
                border: gdprChecked ? 'none' : `1px solid ${tc.btnInactiveBorder}`,
                fontWeight: 600,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? t.creating : t.submitBtn}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
