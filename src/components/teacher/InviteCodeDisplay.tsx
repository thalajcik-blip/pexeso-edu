import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '../ui/button'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'

interface InviteCodeDisplayProps {
  inviteCode: string
}

const TEXTS = {
  cs: {
    title: 'Přístupový kód třídy',
    joinLink: 'Odkaz pro přihlášení',
    copy: 'Kopírovat odkaz',
    copied: 'Odkaz zkopírován!',
  },
  sk: {
    title: 'Prístupový kód triedy',
    joinLink: 'Odkaz na prihlásenie',
    copy: 'Kopírovať odkaz',
    copied: 'Odkaz skopírovaný!',
  },
  en: {
    title: 'Class invite code',
    joinLink: 'Join link',
    copy: 'Copy link',
    copied: 'Link copied!',
  },
}

export default function InviteCodeDisplay({ inviteCode }: InviteCodeDisplayProps) {
  const theme = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t = TEXTS[language]
  const [copied, setCopied] = useState(false)

  const joinLink = `https://pexedu.com/join/${inviteCode}`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinLink)
      setCopied(true)
      toast.success(t.copied)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Copy failed')
    }
  }

  return (
    <div
      style={{
        background: tc.surface,
        border: `1px solid ${tc.surfaceBorder}`,
        borderRadius: 12,
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <p style={{ color: tc.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
        {t.title}
      </p>
      <p
        style={{
          fontFamily: 'monospace',
          fontSize: 32,
          fontWeight: 700,
          color: tc.accent,
          letterSpacing: 4,
          margin: 0,
        }}
      >
        {inviteCode}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ color: tc.textMuted, fontSize: 13 }}>{t.joinLink}:</span>
        <code style={{ color: tc.textDim, fontSize: 13, background: tc.inputBg, padding: '2px 8px', borderRadius: 6 }}>
          {joinLink}
        </code>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          style={{ gap: 6, borderColor: tc.surfaceBorder, color: tc.textMuted }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {t.copy}
        </Button>
      </div>
    </div>
  )
}
