import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../services/supabase'
import CardModal, { type CardData } from './CardModal'
import { validateAnswers } from '../utils/quizValidation'
import BulkUploadModal from './BulkUploadModal'
import { Button } from '@/components/ui/button'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown } from 'lucide-react'

type TierConfig = { icon: string; title: string; messages: [string, string, string] }

const TIER_LABELS = ['100 %', '≥ 90 %', '≥ 75 %', '≥ 50 %', '≥ 25 %', '< 25 %']

const HARDCODED_DEFAULTS: Record<string, TierConfig[]> = {
  cs: [
    { icon: '🧠', title: 'Génius!',         messages: ['Perfektní paměť i znalosti — to je kombinace!', 'Na 100 % správně! Mozek pracuje naplno.', 'Bezchybný výkon. Tebe se nic nevyhne!'] },
    { icon: '🔥', title: 'Výborně!',         messages: ['Skoro dokonalý! Jen kousek od maxima.', 'Skvělá paměť i znalosti — gratulujeme!', 'Téměř perfektní. Příště to dotáhneš!'] },
    { icon: '⭐', title: 'Skvělé!',          messages: ['Dobrá práce! Mozek se zahřívá.', 'Tři čtvrtiny na výbornou — příště víc!', 'Solid výkon, paměť i kvíz šly dobře.'] },
    { icon: '💪', title: 'Dobrý pokus!',     messages: ['Půlka tam — procvič a příště to zlomíš!', 'Rozehřívačka se povedla, příště víc!', 'Mozek se zahřívá. Zkus to znovu!'] },
    { icon: '📚', title: 'Nevzdávej to!',    messages: ['Tohle téma chce trochu procvičit — dáš to!', 'Každý pokus tě posouvá blíž k cíli.', 'Zkus to znovu, mozek potřebuje čas!'] },
    { icon: '🚀', title: 'Výzva přijata!',   messages: ['Každý šampion začínal od nuly. Zkus to znovu!', 'Mozek se právě něco naučil. To se počítá!', 'Tuhle sadu ještě dobydneš, jen tak nevzdávej!'] },
  ],
  sk: [
    { icon: '🧠', title: 'Génius!',          messages: ['Perfektná pamäť aj znalosti — to je kombinácia!', 'Na 100 % správne! Mozog pracuje naplno.', 'Bezchybný výkon. Teba sa nič nevyhne!'] },
    { icon: '🔥', title: 'Výborne!',          messages: ['Skoro dokonalý! Len kúsok od maxima.', 'Skvelá pamäť aj znalosti — gratulujeme!', 'Takmer perfektný. Nabudúce to dotiahneš!'] },
    { icon: '⭐', title: 'Skvelé!',           messages: ['Dobrá práca! Mozog sa zahrieva.', 'Tri štvrtiny na výbornú — nabudúce viac!', 'Solid výkon, pamäť aj kvíz išli dobre.'] },
    { icon: '💪', title: 'Dobrý pokus!',      messages: ['Polovica tam — precvič a nabudúce to zlomíš!', 'Rozcvička sa podarila, nabudúce viac!', 'Mozog sa zahrieva. Skús to znovu!'] },
    { icon: '📚', title: 'Nevzdávaj to!',     messages: ['Táto téma chce trochu precvičiť — dáš to!', 'Každý pokus ťa posúva bližšie k cieľu.', 'Skús to znovu, mozog potrebuje čas!'] },
    { icon: '🚀', title: 'Výzva prijatá!',    messages: ['Každý šampión začínal od nuly. Skús to znovu!', 'Mozog sa práve niečo naučil. To sa počíta!', 'Túto sadu ešte dobydieš, tak nevzdávaj!'] },
  ],
  en: [
    { icon: '🧠', title: 'Genius!',           messages: ['Perfect memory and knowledge — what a combo!', '100% correct! Brain firing on all cylinders.', 'Flawless performance. Nothing gets past you!'] },
    { icon: '🔥', title: 'Excellent!',         messages: ['Almost perfect! Just a step from the top.', 'Great memory and knowledge — well done!', "Nearly perfect. You'll get there next time!"] },
    { icon: '⭐', title: 'Great!',             messages: ['Good work! Brain warming up.', 'Three quarters excellent — more next time!', 'Solid performance, memory and quiz both good.'] },
    { icon: '💪', title: 'Good try!',          messages: ["Halfway there — practice and break through next time!", 'Good warm-up, go for more next time!', 'Brain warming up. Try again!'] },
    { icon: '📚', title: "Don't give up!",     messages: ['This topic needs a bit more practice — you got this!', 'Every attempt gets you closer to the goal.', 'Try again, the brain needs time!'] },
    { icon: '🚀', title: 'Challenge accepted!', messages: ['Every champion started from zero. Try again!', 'Your brain just learned something. That counts!', "You'll conquer this deck yet — don't give up!"] },
  ],
}

function getInitialTiers(lang: string, globalDefaults: Record<string, TierConfig[]> | null): TierConfig[] {
  const langTiers = globalDefaults?.[lang]
  if (langTiers && langTiers.length === 6) return langTiers
  return HARDCODED_DEFAULTS[lang] ?? HARDCODED_DEFAULTS['cs']
}

type Deck = {
  id: string
  title: string
  description: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected'
  is_private: boolean
  private_code: string | null
  language: 'cs' | 'sk' | 'en'
  difficulty: 'easy' | 'medium' | 'hard'
}

type Props = {
  deckId: string | null  // null = new deck
  isSuperadmin: boolean
  onBack: () => void
}

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default function DeckEditor({ deckId, isSuperadmin, onBack }: Props) {
  const [deck, setDeck]         = useState<Deck | null>(null)
  const [title, setTitle]       = useState('')
  const [desc, setDesc]         = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [language, setLanguage]     = useState<Deck['language']>('cs')
  const [difficulty, setDifficulty] = useState<Deck['difficulty']>('medium')
  const [status, setStatus]         = useState<Deck['status']>('draft')
  const [cards, setCards]       = useState<CardData[]>([])
  const [editCard, setEditCard]   = useState<CardData | 'new' | null>(null)
  const [bulkOpen, setBulkOpen]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(!!deckId)
  const [saved, setSaved]       = useState(false)
  const [sort, setSort] = useState<'default' | 'newest' | 'oldest' | 'az' | 'za'>('default')
  const [showInvalid, setShowInvalid] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [translating, setTranslating]   = useState(false)
  const [translateProgress, setTranslateProgress] = useState<{ done: number; total: number } | null>(null)
  const [translateError, setTranslateError] = useState('')
  const [customizeResults, setCustomizeResults] = useState(false)
  const [resultsConfig, setResultsConfig] = useState<TierConfig[]>([])
  const [globalResultsDefaults, setGlobalResultsDefaults] = useState<Record<string, TierConfig[]> | null>(null)
  const [resultsOpen, setResultsOpen] = useState(false)

  useEffect(() => {
    // Fetch global defaults from admin_settings
    supabase.from('admin_settings').select('value').eq('key', 'results_config').maybeSingle()
      .then(({ data }) => {
        if (data?.value) setGlobalResultsDefaults(data.value as Record<string, TierConfig[]>)
      })
  }, [])

  useEffect(() => {
    if (!deckId) return
    Promise.all([
      supabase.from('custom_decks').select('*').eq('id', deckId).single(),
      supabase.from('custom_cards').select('*').eq('deck_id', deckId).order('sort_order'),
    ]).then(([{ data: d }, { data: c }]) => {
      if (d) {
        setDeck(d)
        setTitle(d.title)
        setDesc(d.description ?? '')
        setIsPrivate(d.is_private)
        setLanguage(d.language ?? 'cs')
        setDifficulty(d.difficulty ?? 'medium')
        setStatus(d.status)
        if (d.results_config && Array.isArray(d.results_config) && d.results_config.length === 6) {
          setCustomizeResults(true)
          setResultsConfig(d.results_config as TierConfig[])
        }
      }
      setCards(c ?? [])
      setLoading(false)
    })
  }, [deckId])

  async function saveDeck(): Promise<string | null> {
    setSaving(true)
    setSaved(false)
    const payload = {
      title: title.trim(),
      description: desc.trim() || null,
      is_private:  isPrivate,
      private_code: isPrivate ? (deck?.private_code ?? generateCode()) : null,
      language,
      difficulty,
      status,
      results_config: customizeResults && resultsConfig.length === 6 ? resultsConfig : null,
      updated_at: new Date().toISOString(),
    }

    if (deck) {
      await supabase.from('custom_decks').update(payload).eq('id', deck.id)
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return deck.id
    } else {
      const { data, error } = await supabase.from('custom_decks').insert(payload).select().single()
      setSaving(false)
      if (error || !data) return null
      setDeck(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return data.id
    }
  }

  async function translateAll() {
    if (!deck || cards.length === 0) return
    const ALL_LANGS = ['cs', 'sk', 'en']
    const targetLangs = ALL_LANGS.filter(l => l !== deck.language)
    const translatableCards = cards.filter(c => c.quiz_question && c.quiz_correct && c.quiz_options?.length)
    if (translatableCards.length === 0) return

    setTranslating(true)
    setTranslateError('')
    setTranslateProgress({ done: 0, total: translatableCards.length })

    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    for (let i = 0; i < translatableCards.length; i++) {
      const card = translatableCards[i]
      const existingTranslations: Record<string, unknown> = (card as CardData & { translations?: Record<string, unknown> }).translations ?? {}
      const newTranslations = { ...existingTranslations }

      for (const targetLang of targetLangs) {
        if (newTranslations[targetLang]) continue // already translated
        try {
          const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-quiz`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}`, 'apikey': anonKey },
              body: JSON.stringify({
                label: card.label,
                quiz_question: card.quiz_question,
                quiz_options: card.quiz_options,
                quiz_correct: card.quiz_correct,
                fun_fact: card.fun_fact,
                source_lang: deck.language,
                target_lang: targetLang,
              }),
            }
          )
          if (res.ok) {
            const translated = await res.json()
            if (!translated.error) newTranslations[targetLang] = translated
          }
        } catch (e) {
          console.error(`Translation failed for card ${card.id}, lang ${targetLang}:`, e)
        }
      }

      await supabase.from('custom_cards').update({ translations: newTranslations }).eq('id', card.id!)
      setTranslateProgress({ done: i + 1, total: translatableCards.length })
      // Avoid rate limiting (Gemini free tier: 15 req/min)
      await new Promise(r => setTimeout(r, 4200))
    }

    setTranslating(false)
    setTranslateProgress(null)
    reloadCards()
  }

  async function deleteCard(cardId: string) {
    await supabase.from('custom_cards').delete().eq('id', cardId)
    setCards(prev => prev.filter(c => c.id !== cardId))
    setConfirmDeleteId(null)
  }

  function reloadCards() {
    if (!deck) return
    supabase.from('custom_cards').select('*').eq('deck_id', deck.id).order('sort_order')
      .then(({ data }) => setCards(data ?? []))
  }

  const currentDeckId = deck?.id ?? null

  async function handleExport() {
    if (!deck) return
    const { data: allCards } = await supabase
      .from('custom_cards')
      .select('image_url, label, quiz_question, quiz_options, quiz_correct, fun_fact, sort_order')
      .eq('deck_id', deck.id)
      .order('sort_order')
    const payload = {
      version: 1,
      title: deck.title,
      description: deck.description,
      language: deck.language,
      difficulty: deck.difficulty,
      is_private: deck.is_private,
      cards: allCards ?? [],
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${deck.title.toLowerCase().replace(/\s+/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sortedCards = [...cards].sort((a, b) => {
    if (sort === 'newest') return (b.created_at ?? '') > (a.created_at ?? '') ? 1 : -1
    if (sort === 'oldest') return (a.created_at ?? '') > (b.created_at ?? '') ? 1 : -1
    if (sort === 'az') return (a.label ?? '').localeCompare(b.label ?? '', 'cs')
    if (sort === 'za') return (b.label ?? '').localeCompare(a.label ?? '', 'cs')
    return a.sort_order - b.sort_order  // default
  })

  const invalidCount = useMemo(() => cards.filter(c => {
    if (!c.answers || c.answers.length === 0) return true
    return validateAnswers(c.answers, c.display_count ?? 4).state !== 'valid'
  }).length, [cards])

  const displayedCards = showInvalid
    ? sortedCards.filter(c => {
        if (!c.answers || c.answers.length === 0) return true
        return validateAnswers(c.answers, c.display_count ?? 4).state !== 'valid'
      })
    : sortedCards

  if (loading) return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-6 w-48" />
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <div className="flex gap-4 flex-wrap">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-44" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {/* Cards grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-2 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={onBack} className="cursor-pointer">Sady</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{deck ? title || 'Sada' : 'Nová sada'}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-800 flex-1">
            {deck ? title || 'Sada' : 'Nová sada'}
          </h1>
        {isSuperadmin && deck && (
          <div className="ml-auto flex items-center gap-2">
            {translateProgress && (
              <span className="text-xs text-indigo-500">
                Překládám {translateProgress.done}/{translateProgress.total}…
              </span>
            )}
            {translateError && (
              <span className="text-xs text-red-500">{translateError}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={translateAll}
              disabled={translating || cards.filter(c => c.quiz_question).length === 0}
              className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              {translating ? '⏳ Překládám…' : '🌐 Přeložit vše'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="text-gray-500"
            >
              ↓ Export JSON
            </Button>
          </div>
        )}
        </div>
      </div>

      {/* Deck metadata */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Název *</label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="např. Dinosauři"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Popis <span className="text-gray-300">(volitelné)</span></label>
          <Textarea
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={2}
            placeholder="Krátký popis sady…"
            className="resize-none"
          />
        </div>

        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Jazyk sady</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-44 justify-between font-normal">
                  {({ cs: '🇨🇿 Čeština', sk: '🇸🇰 Slovenčina', en: '🇬🇧 English' } as Record<string, string>)[language]}
                  <ChevronDown className="size-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-44">
                <DropdownMenuItem onClick={() => setLanguage('cs')}>🇨🇿 Čeština</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('sk')}>🇸🇰 Slovenčina</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('en')}>🇬🇧 English</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Obtížnost kvízu</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-44 justify-between font-normal">
                  {({ easy: '🟢 Snadná', medium: '🟡 Střední', hard: '🔴 Těžká' } as Record<string, string>)[difficulty]}
                  <ChevronDown className="size-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-44">
                <DropdownMenuItem onClick={() => setDifficulty('easy')}>🟢 Snadná</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficulty('medium')}>🟡 Střední</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDifficulty('hard')}>🔴 Těžká</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {isSuperadmin && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-44 justify-between font-normal">
                    {({ draft: 'Koncept', pending: 'Čeká na schválení', approved: 'Schváleno', rejected: 'Zamítnuto' } as Record<string, string>)[status]}
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-44">
                  <DropdownMenuItem onClick={() => setStatus('draft')}>Koncept</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatus('pending')}>Čeká na schválení</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatus('approved')}>Schváleno</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatus('rejected')}>Zamítnuto</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div className="flex items-center gap-2 pb-0.5">
            <input
              id="private"
              type="checkbox"
              checked={isPrivate}
              onChange={e => setIsPrivate(e.target.checked)}
              className="accent-indigo-600"
            />
            <label htmlFor="private" className="text-sm text-gray-700">Soukromá sada</label>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button onClick={saveDeck} disabled={saving || !title.trim()}>
            {saving ? 'Ukládání…' : deck ? 'Uložit změny' : 'Vytvořit sadu'}
          </Button>
          {saved && <span className="text-xs text-green-600">✓ Uloženo</span>}
        </div>
      </div>

      {/* Results screen customization */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
        <button
          type="button"
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
          onClick={() => setResultsOpen(v => !v)}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">Výsledková obrazovka</span>
            {customizeResults
              ? <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium">Vlastní</span>
              : <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Výchozí</span>
            }
          </div>
          <ChevronDown className={`size-4 text-gray-400 transition-transform ${resultsOpen ? 'rotate-180' : ''}`} />
        </button>

        {resultsOpen && (
          <div className="px-6 pb-6 border-t border-gray-100">
            <div className="flex items-center justify-between py-4 mb-2">
              <p className="text-xs text-gray-400">Ikony, nadpisy a hlášky na výsledkové obrazovce. Platí pro Bleskový kvíz i PexeQuiz.</p>
              <label className="flex items-center gap-2 cursor-pointer shrink-0 ml-4">
                <div
                  onClick={() => {
                    if (!customizeResults) {
                      setResultsConfig(getInitialTiers(language, globalResultsDefaults) as TierConfig[])
                    }
                    setCustomizeResults(v => !v)
                  }}
                  className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${customizeResults ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${customizeResults ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="text-xs text-gray-600 whitespace-nowrap">Vlastní hlášky</span>
              </label>
            </div>

            {customizeResults && resultsConfig.length === 6 && (
              <div className="space-y-4">
                {resultsConfig.map((tier, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center gap-1 mb-2">
                      <span className="text-xs font-medium text-gray-400 w-14 shrink-0">{TIER_LABELS[i]}</span>
                      <input
                        type="text"
                        value={tier.icon}
                        onChange={e => setResultsConfig(prev => prev.map((t, j) => j === i ? { ...t, icon: e.target.value } : t))}
                        className="w-12 text-center border border-gray-200 rounded-md px-1 py-1 text-sm bg-white"
                        maxLength={4}
                      />
                      <Input
                        value={tier.title}
                        onChange={e => setResultsConfig(prev => prev.map((t, j) => j === i ? { ...t, title: e.target.value } : t))}
                        placeholder="Nadpis"
                        className="flex-1 h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1 pl-[60px]">
                      {tier.messages.map((msg, mi) => (
                        <Input
                          key={mi}
                          value={msg}
                          onChange={e => setResultsConfig(prev => prev.map((t, j) => {
                            if (j !== i) return t
                            const msgs = [...t.messages] as [string, string, string]
                            msgs[mi] = e.target.value
                            return { ...t, messages: msgs }
                          }))}
                          placeholder={`Hláška ${mi + 1}`}
                          className="h-8 text-sm"
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setResultsConfig(getInitialTiers(language, globalResultsDefaults) as TierConfig[])}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ↺ Obnovit výchozí hodnoty
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cards section */}
      {(deck || currentDeckId) && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-700">
                Kartičky <span className="text-gray-400 font-normal">({cards.length})</span>
              </h2>
              {invalidCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowInvalid(v => !v)}
                  className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${showInvalid ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'}`}
                >
                  {invalidCount} neúplných
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {cards.length > 1 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-44 justify-between font-normal text-xs text-gray-600">
                      {({ default: 'Pořadí (výchozí)', newest: 'Nejnovější první', oldest: 'Nejstarší první', az: 'Abecedně A–Z', za: 'Abecedně Z–A' } as Record<string, string>)[sort]}
                      <ChevronDown className="size-4 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-44">
                    <DropdownMenuItem onClick={() => setSort('default')}>Pořadí (výchozí)</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSort('newest')}>Nejnovější první</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSort('oldest')}>Nejstarší první</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSort('az')}>Abecedně A–Z</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSort('za')}>Abecedně Z–A</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button variant="outline" onClick={() => setBulkOpen(true)} className="text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                + Hromadně
              </Button>
              <Button onClick={() => setEditCard('new')}>
                + Kartičku
              </Button>
            </div>
          </div>

          {cards.length === 0 ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
              <div className="text-3xl mb-2">🃏</div>
              <div className="text-sm">Zatím žádné kartičky</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {displayedCards.map((card) => {
                const answers = card.answers ?? []
                const validation = answers.length > 0
                  ? validateAnswers(answers, card.display_count ?? 4)
                  : null
                const dotColor = !validation
                  ? 'bg-gray-200'
                  : validation.state === 'valid' ? 'bg-green-400'
                  : validation.state === 'incomplete' ? 'bg-amber-400'
                  : 'bg-red-400'
                return (
                <div key={card.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group">
                  <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden relative">
                    <img src={card.image_url} alt={card.label ?? ''} className="w-full h-full object-contain p-2" />
                    <div className={`absolute top-2 right-2 w-2.5 h-2.5 rounded-full ${dotColor}`} title={validation?.message ?? 'Bez kvízu'} />
                  </div>
                  <div className="p-2">
                    {card.label && <div className="text-xs font-medium text-gray-700 truncate">{card.label}</div>}
                    {card.quiz_question && <div className="text-xs text-gray-400 truncate mt-0.5">🧠 {card.quiz_question}</div>}
                    <div className="flex gap-1 mt-2">
                      {confirmDeleteId === card.id ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => deleteCard(card.id!)} className="flex-1 text-xs text-red-500 hover:bg-red-50">
                            Smazat
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)} className="text-xs px-2">
                            ✕
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setEditCard(card)} className="flex-1 text-xs">
                            Upravit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(card.id!)} className="text-red-400 hover:bg-red-50 px-2">
                            ×
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!deck && !currentDeckId && (
        <div className="text-sm text-gray-400 text-center py-8">
          Nejprve vytvořte sadu, pak budete moci přidávat kartičky.
        </div>
      )}

      {/* Bulk upload modal */}
      {bulkOpen && currentDeckId && (
        <BulkUploadModal
          deckId={currentDeckId}
          language={language}
          difficulty={difficulty}
          startIndex={cards.length}
          onDone={() => { setBulkOpen(false); reloadCards() }}
          onClose={() => setBulkOpen(false)}
        />
      )}

      {/* Card modal */}
      {editCard && currentDeckId && (
        <CardModal
          deckId={currentDeckId}
          language={language}
          difficulty={difficulty}
          card={editCard === 'new' ? undefined : editCard}
          sortOrder={cards.length}
          onSave={() => { setEditCard(null); reloadCards() }}
          onClose={() => setEditCard(null)}
        />
      )}
    </div>
  )
}
