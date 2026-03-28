import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useGameStore } from '../../store/gameStore'
import { supabase, fetchCustomDeckFull } from '../../services/supabase'
import { DECKS } from '../../data/decks'
import { THEMES } from '../../data/themes'

interface AssignedDeck {
  set_slug: string | null
  custom_deck_id: string | null
  deck_title: string
  class_name: string
}

const BANNER_TEXT: Record<string, string> = {
  CZ: 'Tvůj učitel přiřadil',
  SK: 'Tvoj učiteľ priradil',
  EN: 'Your teacher assigned',
}

export function AssignedDecksBanner() {
  const { profile } = useAuthStore()
  const { selectDeck, language, theme } = useGameStore()
  const tc = THEMES[theme]
  const [assigned, setAssigned] = useState<AssignedDeck[]>([])

  useEffect(() => {
    if (!profile?.id) return
    let cancelled = false

    async function load() {
      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', profile!.id)

      if (!memberships?.length || cancelled) return

      const classIds = memberships.map((m: { class_id: string }) => m.class_id)

      const { data: assignments } = await supabase
        .from('class_assignments')
        .select('set_slug, custom_deck_id, classes(name)')
        .in('class_id', classIds)

      if (!assignments?.length || cancelled) return

      const resolved: AssignedDeck[] = []
      for (const a of assignments) {
        const className = (a.classes as unknown as { name: string } | null)?.name ?? ''
        if (a.set_slug) {
          const deck = DECKS.find(d => d.id === a.set_slug)
          if (deck) resolved.push({ set_slug: a.set_slug, custom_deck_id: null, deck_title: deck.name, class_name: className })
        } else if (a.custom_deck_id) {
          try {
            const customDeck = await fetchCustomDeckFull(a.custom_deck_id)
            if (customDeck) resolved.push({ set_slug: null, custom_deck_id: a.custom_deck_id, deck_title: customDeck.title, class_name: className })
          } catch {
            // skip unresolvable custom decks
          }
        }
      }

      if (!cancelled) setAssigned(resolved)
    }

    load()
    return () => { cancelled = true }
  }, [profile?.id])

  if (!profile || !assigned.length) return null

  const label = BANNER_TEXT[language] ?? BANNER_TEXT.CZ

  return (
    <div
      className="rounded-xl px-4 py-2.5 mb-3 flex flex-wrap gap-2 items-center text-sm"
      style={{ background: `color-mix(in srgb, ${tc.accent} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${tc.accent} 30%, transparent)` }}
    >
      <span style={{ color: tc.textMuted }}>{label}:</span>
      {assigned.map((a, i) => (
        <button
          key={i}
          onClick={() => {
            if (a.set_slug) selectDeck(a.set_slug)
            // custom deck selection requires full deck data — handled via fetchCustomDeckFull on click
          }}
          className="font-semibold underline underline-offset-2 cursor-pointer"
          style={{ color: tc.accent }}
        >
          {a.deck_title}
        </button>
      ))}
    </div>
  )
}
