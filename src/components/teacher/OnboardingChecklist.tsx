import { useEffect, useState } from 'react'
import { CheckCircle, Circle } from 'lucide-react'
import { useClassroomStore } from '../../store/classroomStore'
import { useGameStore } from '../../store/gameStore'
import { THEMES } from '../../data/themes'

const STORAGE_KEY_DISMISSED = 'pexedu_onboarding_dismissed'
const STORAGE_KEY_SHARED = 'pexedu_onboarding_shared'

const TEXTS = {
  cs: {
    title: 'Začínáme',
    allDone: 'Vše hotovo! Dashboard je připraven.',
    dismiss: 'Zavřít',
    steps: [
      'Vytvořit třídu',
      'Přiřadit sadu',
      'Sdílet odkaz se žáky',
    ],
  },
  sk: {
    title: 'Začíname',
    allDone: 'Hotovo! Dashboard je pripravený.',
    dismiss: 'Zatvoriť',
    steps: [
      'Vytvoriť triedu',
      'Priradiť sadu',
      'Zdieľať odkaz so žiakmi',
    ],
  },
  en: {
    title: 'Getting started',
    allDone: 'All done! Your dashboard is ready.',
    dismiss: 'Dismiss',
    steps: [
      'Create a class',
      'Assign a deck',
      'Share the link with students',
    ],
  },
}

interface OnboardingChecklistProps {
  onDismiss?: () => void
}

export default function OnboardingChecklist({ onDismiss }: OnboardingChecklistProps) {
  const theme = useGameStore(s => s.theme)
  const language = useGameStore(s => s.language)
  const tc = THEMES[theme]
  const t = TEXTS[language]

  const { classes, assignments } = useClassroomStore()
  const [sharedLink, setSharedLink] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [allDoneTimer, setAllDoneTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  // Re-check localStorage on focus (in case user copied link in another tab)
  useEffect(() => {
    const check = () => setSharedLink(localStorage.getItem(STORAGE_KEY_SHARED) === 'true')
    check()
    window.addEventListener('focus', check)
    return () => window.removeEventListener('focus', check)
  }, [])

  // Step completion states
  const step1Done = classes.length > 0
  const step2Done = assignments.length > 0
  const step3Done = sharedLink

  const allDone = step1Done && step2Done && step3Done

  // Auto-dismiss after 5 seconds once all done
  useEffect(() => {
    if (allDone && !allDoneTimer) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, 5000)
      setAllDoneTimer(timer)
    }
    return () => {
      if (allDoneTimer) clearTimeout(allDoneTimer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone])

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY_DISMISSED, 'true')
    setDismissed(true)
    onDismiss?.()
  }

  if (dismissed) return null

  const steps = [
    { label: t.steps[0], done: step1Done },
    { label: t.steps[1], done: step2Done },
    { label: t.steps[2], done: step3Done },
  ]

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, color: tc.text, fontSize: 15, fontWeight: 700 }}>{t.title}</h3>
        <button
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: tc.textMuted,
            fontSize: 12,
            padding: '2px 6px',
          }}
        >
          {t.dismiss}
        </button>
      </div>

      {allDone ? (
        <p style={{ color: '#22c55e', fontSize: 14, fontWeight: 600, margin: 0 }}>
          {t.allDone}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((step, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {step.done ? (
                <CheckCircle size={18} color="#22c55e" />
              ) : (
                <Circle size={18} color={tc.textMuted} />
              )}
              <span
                style={{
                  color: step.done ? tc.textMuted : tc.text,
                  fontSize: 14,
                  textDecoration: step.done ? 'line-through' : 'none',
                }}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
