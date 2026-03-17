import { useEffect, useRef, useState } from 'react'
import { supabase } from '../services/supabase'
import type { AdminRole } from './useAuth'
import type { AnswerOption } from '../types/game'
import { validateAnswers } from '../utils/quizValidation'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from '@/components/ui/pagination'
import { ChevronDown, Search } from 'lucide-react'

type Deck = {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  is_private: boolean
  private_code: string | null
  language: 'cs' | 'sk' | 'en'
  difficulty: 'easy' | 'medium' | 'hard'
  created_at: string
  results_config: Array<{ icon: string; title: string; messages: string[] }> | null
}

const LANG_FLAG: Record<Deck['language'], string> = { cs: '🇨🇿', sk: '🇸🇰', en: '🇬🇧' }
const LANG_LABEL: Record<Deck['language'], string> = { cs: 'CS', sk: 'SK', en: 'EN' }
const ALL_LANGS: Deck['language'][] = ['cs', 'sk', 'en']

type Props = {
  role: AdminRole
  onNew: () => void
  onEdit: (deck: Deck) => void
}

const STATUS_LABEL: Record<Deck['status'], string> = {
  draft:    'Koncept',
  pending:  'Čeká na schválení',
  approved: 'Schváleno',
  rejected: 'Zamítnuto',
}


type DeckJson = {
  version: number
  title: string
  description?: string | null
  language: Deck['language']
  difficulty: 'easy' | 'medium' | 'hard'
  is_private?: boolean
  cards: {
    image_url: string
    label: string
    quiz_question: string
    quiz_options: [string, string, string, string]
    quiz_correct: string
    fun_fact: string
    sort_order: number
  }[]
}

type TranslateState = {
  deckId: string
  targetLang: Deck['language'] | null
  progress: { done: number; total: number } | null
  error: string
}

type CardValidationRow = { deck_id: string; answers: AnswerOption[] | null; display_count: number }

type SortOption = 'newest' | 'oldest' | 'az' | 'za'
const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Nejnovější',
  oldest: 'Nejstarší',
  az:     'A → Z',
  za:     'Z → A',
}
const PAGE_SIZE = 10

export default function DeckList({ role, onNew, onEdit }: Props) {
  const [decks, setDecks]         = useState<Deck[]>([])
  const [loading, setLoading]     = useState(true)
  const [importing, setImporting] = useState(false)
  const [translate, setTranslate] = useState<TranslateState | null>(null)
  const [cardStats, setCardStats] = useState<CardValidationRow[]>([])
  const [sort, setSort]           = useState<SortOption>('newest')
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const importRef                 = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('custom_decks')
      .select('*')
      .order('created_at', { ascending: false })
    const decksData = data ?? []
    setDecks(decksData)
    if (decksData.length > 0) {
      const { data: stats } = await supabase
        .from('custom_cards')
        .select('deck_id, answers, display_count')
        .in('deck_id', decksData.map((d: Deck) => d.id))
      setCardStats((stats ?? []) as CardValidationRow[])
    }
    setLoading(false)
  }

  function getDeckInvalidCount(deckId: string): number {
    const cards = cardStats.filter(c => c.deck_id === deckId)
    return cards.filter(c => {
      if (!c.answers || c.answers.length === 0) return true
      return validateAnswers(c.answers, c.display_count ?? 4).state !== 'valid'
    }).length
  }

  async function updateStatus(id: string, status: Deck['status']) {
    await supabase.from('custom_decks').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  async function deleteDeck(id: string) {
    if (!confirm('Opravdu smazat tuto sadu?')) return
    await supabase.from('custom_decks').delete().eq('id', id)
    load()
  }

  async function runTranslate(deck: Deck, targetLang: Deck['language']) {
    setTranslate({ deckId: deck.id, targetLang, progress: { done: 0, total: 0 }, error: '' })

    const { data: cards } = await supabase
      .from('custom_cards')
      .select('*')
      .eq('deck_id', deck.id)
      .order('sort_order')

    if (!cards || cards.length === 0) { setTranslate(null); return }

    const translatableCards = cards.filter((c: { quiz_question: string }) => c.quiz_question)
    setTranslate(t => t ? { ...t, progress: { done: 0, total: translatableCards.length } } : null)

    const { data: newDeck, error: deckErr } = await supabase
      .from('custom_decks')
      .insert({
        title: `${deck.title} (${LANG_LABEL[targetLang]})`,
        description: deck.description,
        language: targetLang,
        difficulty: deck.difficulty,
        is_private: deck.is_private,
        private_code: deck.private_code,
        status: 'draft',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (deckErr || !newDeck) {
      setTranslate(t => t ? { ...t, error: 'Nepodařilo se vytvořit sadu.' } : null)
      return
    }

    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-quiz`
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey }

    let translatedTitle = `${deck.title} (${LANG_LABEL[targetLang]})`
    try {
      const res = await fetch(fnUrl, { method: 'POST', headers, body: JSON.stringify({ mode: 'text', text: deck.title, source_lang: deck.language, target_lang: targetLang }) })
      if (res.ok) { const data = await res.json(); if (data.text && !data.error) translatedTitle = data.text }
    } catch (e) { console.error('Title translation failed:', e) }

    await supabase.from('custom_decks').update({ title: translatedTitle }).eq('id', newDeck.id)

    const errors: string[] = []
    const translatedCards = []
    let doneCount = 0

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      let translatedCard: Record<string, unknown> = {
        deck_id: newDeck.id,
        image_url: card.image_url,
        label: card.label,
        quiz_question: card.quiz_question,
        answers: card.answers,
        quiz_options: card.quiz_options,
        quiz_correct: card.quiz_correct,
        fun_fact: card.fun_fact,
        display_count: card.display_count,
        sort_order: card.sort_order,
      }

      const hasQuiz = card.quiz_question && (card.answers?.length || card.quiz_options?.length)
      if (hasQuiz) {
        try {
          const res = await fetch(fnUrl, { method: 'POST', headers, body: JSON.stringify({
            label: card.label,
            quiz_question: card.quiz_question,
            answers: card.answers ?? null,
            quiz_options: card.quiz_options ?? null,
            quiz_correct: card.quiz_correct ?? null,
            fun_fact: card.fun_fact,
            source_lang: deck.language,
            target_lang: targetLang,
          }) })
          const translated = await res.json()
          if (!res.ok || translated.error) {
            errors.push(`Karta "${card.label}": ${translated.error ?? res.status}`)
          } else {
            translatedCard = {
              ...translatedCard,
              label: translated.label ?? translatedCard.label,
              quiz_question: translated.quiz_question,
              answers: translated.answers ?? null,
              fun_fact: translated.fun_fact,
            }
          }
        } catch (e) { errors.push(`Karta "${card.label}": ${String(e)}`) }
        doneCount++
        setTranslate(t => t ? { ...t, progress: { done: doneCount, total: translatableCards.length } } : null)
        await new Promise(r => setTimeout(r, 6500))
      }

      translatedCards.push(translatedCard)
    }

    await supabase.from('custom_cards').insert(translatedCards)

    // Translate results_config if present
    if (deck.results_config) {
      try {
        const res = await fetch(fnUrl, {
          method: 'POST', headers,
          body: JSON.stringify({ mode: 'results_config', tiers: deck.results_config, source_lang: deck.language, target_lang: targetLang }),
        })
        if (res.ok) {
          const data = await res.json()
          const translatedTiers = data.tiers
          if (Array.isArray(translatedTiers) && translatedTiers.length === 6) {
            // Preserve icons from source
            const merged = translatedTiers.map((t: { title: string; messages: string[] }, i: number) => ({
              icon: deck.results_config![i].icon,
              title: t.title,
              messages: t.messages,
            }))
            await supabase.from('custom_decks').update({ results_config: merged }).eq('id', newDeck.id)
          }
        }
      } catch (e) { console.error('Results config translation failed:', e) }
    }

    if (errors.length > 0) {
      setTranslate(t => t ? { ...t, progress: null, error: `${errors.length} karet se nepodařilo přeložit. První chyba: ${errors[0]}` } : null)
    } else {
      setTranslate(null)
    }
    load()
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    try {
      const text = await file.text()
      const json: DeckJson = JSON.parse(text)
      if (!json.title || !Array.isArray(json.cards)) throw new Error('Neplatný formát souboru')
      const { data: newDeck, error } = await supabase.from('custom_decks').insert({ title: json.title, description: json.description ?? null, language: json.language ?? 'cs', difficulty: json.difficulty ?? 'medium', is_private: json.is_private ?? false, private_code: null, status: 'draft', updated_at: new Date().toISOString() }).select().single()
      if (error || !newDeck) throw error ?? new Error('Nepodařilo se vytvořit sadu')
      if (json.cards.length > 0) {
        const cardRows = json.cards.map((c, i) => ({ deck_id: newDeck.id, image_url: c.image_url, label: c.label, quiz_question: c.quiz_question, quiz_options: c.quiz_options, quiz_correct: c.quiz_correct, fun_fact: c.fun_fact, sort_order: c.sort_order ?? i }))
        const { error: cardsErr } = await supabase.from('custom_cards').insert(cardRows)
        if (cardsErr) throw cardsErr
      }
      load()
    } catch (err) {
      alert(`Import selhal: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredDecks = decks.filter(d => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return d.title.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q)
  })
  const sortedDecks = [...filteredDecks].sort((a, b) => {
    if (sort === 'az') return a.title.localeCompare(b.title, 'cs')
    if (sort === 'za') return b.title.localeCompare(a.title, 'cs')
    if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime() // newest
  })
  const totalPages = Math.max(1, Math.ceil(sortedDecks.length / PAGE_SIZE))
  const pagedDecks = sortedDecks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSort(s: SortOption) { setSort(s); setPage(1) }
  function handleSearch(q: string) { setSearch(q); setPage(1) }

  if (loading) return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-7 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 gap-0 border-gray-100">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-14" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-800">
          Vlastní sady
          {search.trim() && <span className="text-sm font-normal text-gray-400 ml-2">({sortedDecks.length}/{decks.length})</span>}
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
            <Input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Hledat sady…"
              className="h-9 w-48 pl-7 pr-7 text-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => handleSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-gray-600 gap-1.5 min-w-32 justify-between font-normal">
                {SORT_LABELS[sort]} <ChevronDown className="size-3.5 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([val, label]) => (
                <DropdownMenuItem key={val} onClick={() => handleSort(val)}>{label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {role === 'superadmin' && (
            <>
              <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
              <Button variant="outline" onClick={() => importRef.current?.click()} disabled={importing} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                {importing ? 'Importuji…' : '↑ Import JSON'}
              </Button>
            </>
          )}
          <Button onClick={onNew}>+ Nová sada</Button>
        </div>
      </div>

      {decks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🃏</div>
          <div>Zatím žádné sady</div>
        </div>
      ) : (
        <div className="space-y-3">
          {pagedDecks.map(deck => {
            const isTranslating = translate?.deckId === deck.id && !!translate.progress
            const isPickingLang = translate?.deckId === deck.id && !translate.progress
            const targetLangs   = ALL_LANGS.filter(l => l !== deck.language)

            const invalidCount = getDeckInvalidCount(deck.id)
            return (
              <Card key={deck.id} className="p-4 gap-0 border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base leading-none shrink-0">{LANG_FLAG[deck.language]}</span>
                      <span className="font-semibold text-gray-800 truncate">{deck.title}</span>
                      {invalidCount > 0 && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
                          ⚠️ {invalidCount} neúplných
                        </Badge>
                      )}
                    </div>
                    {deck.description && (
                      <div className="text-xs text-gray-400 truncate mt-0.5">{deck.description}</div>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="shrink-0 justify-between font-normal gap-2 min-w-32">
                        {STATUS_LABEL[deck.status]}
                        <ChevronDown className="size-3.5 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {(Object.entries(STATUS_LABEL) as [Deck['status'], string][]).map(([val, label]) => (
                        <DropdownMenuItem key={val} onClick={() => updateStatus(deck.id, val)}>{label}</DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {deck.is_private && (
                    <span className="text-xs text-indigo-500 font-mono shrink-0">🔒 {deck.private_code}</span>
                  )}

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => onEdit(deck)}>Upravit</Button>

                    {role === 'superadmin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTranslate(isPickingLang ? null : { deckId: deck.id, targetLang: null, progress: null, error: '' })}
                        disabled={isTranslating}
                        title="Přeložit sadu do jiného jazyka"
                        className={isPickingLang ? 'border-indigo-400 bg-indigo-50 text-indigo-600' : 'text-gray-500'}
                      >
                        🌐
                      </Button>
                    )}

                    <Button variant="ghost" size="sm" onClick={() => deleteDeck(deck.id)} className="text-red-500 hover:bg-red-50">Smazat</Button>
                  </div>
                </div>

                {isPickingLang && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">Přeložit do:</span>
                    {targetLangs.map(lang => (
                      <Button key={lang} variant="outline" size="sm" onClick={() => runTranslate(deck, lang)} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                        {LANG_FLAG[lang]} {LANG_LABEL[lang]}
                      </Button>
                    ))}
                  </div>
                )}

                {isTranslating && translate.progress && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                      <span>Překládám do {LANG_FLAG[translate.targetLang!]} {LANG_LABEL[translate.targetLang!]}…</span>
                      <span>{translate.progress.done}/{translate.progress.total}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: translate.progress.total > 0 ? `${(translate.progress.done / translate.progress.total) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                )}

                {translate?.deckId === deck.id && translate.error && (
                  <div className="mt-2 text-xs text-red-600">{translate.error}</div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  aria-disabled={page === 1}
                  className={page === 1 ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1
                const showEllipsisBefore = p === page - 2 && page - 2 > 1
                const showEllipsisAfter  = p === page + 2 && page + 2 < totalPages
                if (showEllipsisBefore || showEllipsisAfter) {
                  return <PaginationItem key={`ellipsis-${p}`}><PaginationEllipsis /></PaginationItem>
                }
                if (!show) return null
                return (
                  <PaginationItem key={p}>
                    <PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  aria-disabled={page === totalPages}
                  className={page === totalPages ? 'pointer-events-none opacity-40' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <div className="text-center text-xs text-gray-400 mt-2">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sortedDecks.length)} z {sortedDecks.length} sád
          </div>
        </div>
      )}
    </div>
  )
}
