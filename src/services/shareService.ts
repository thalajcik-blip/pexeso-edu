import type { Language } from '../data/translations'
import { toast } from 'sonner'

// Deck slug mapping
export const DECK_TO_SLUG: Record<string, string> = {
  flags:    'vlajky',
  animals:  'zviratka',
  fruits:   'ovoce-zelenina',
  jobs:     'povolani',
}

export const SLUG_TO_DECK: Record<string, string> = {
  vlajky:             'flags',
  zviratka:           'animals',
  'ovoce-zelenina':   'fruits',
  povolani:           'jobs',
}

export function getDeckSlug(deckId: string): string {
  return DECK_TO_SLUG[deckId] ?? deckId
}

export function getSlugDeckId(slug: string): string {
  return SLUG_TO_DECK[slug] ?? slug
}

// --- Share text builders ---

type ShareContext =
  | { kind: 'lightning_solo'; accuracy: number; avgTime?: number }
  | { kind: 'pexequiz_solo'; accuracy: number }
  | { kind: 'multiplayer'; result: 'winner' | 'champion' | 'tie' | 'close_loss' | 'loss' }

const SHARE_TEXTS: Record<string, Record<Language, string>> = {
  'bk.perfect': {
    cs: 'Získal jsem 100 % v Bleskovém kvízu! 🧠⚡ Porazíš mě?',
    sk: 'Získal som 100 % v Bleskovom kvíze! 🧠⚡ Porazíš ma?',
    en: 'I got 100% in Lightning Quiz! 🧠⚡ Can you beat me?',
  },
  'bk.great': {
    cs: 'Skoro perfektní výsledek v Bleskovém kvízu! 🔥 Zkus to taky',
    sk: 'Skoro perfektný výsledok v Bleskovom kvíze! 🔥 Vyskúšaj to',
    en: 'Almost perfect in Lightning Quiz! 🔥 Try it yourself',
  },
  'bk.good': {
    cs: 'Zahrál jsem Bleskový kvíz na pexedu.cz ⚡ Jak dopadneš ty?',
    sk: 'Zahral som Bleskový kvíz na pexedu.cz ⚡ Ako dopadneš ty?',
    en: 'I played Lightning Quiz on pexedu.cz ⚡ How will you do?',
  },
  'bk.default': {
    cs: 'Zahrál jsem Bleskový kvíz na pexedu.cz 🎯 Zvládneš to lépe?',
    sk: 'Zahral som Bleskový kvíz na pexedu.cz 🎯 Zvládneš to lepšie?',
    en: 'I played Lightning Quiz on pexedu.cz 🎯 Can you do better?',
  },
  'pq.perfect': {
    cs: 'Perfektní paměť! PexeQuiz na 100 % 🧠 Zkus to taky',
    sk: 'Perfektná pamäť! PexeQuiz na 100 % 🧠 Vyskúšaj to',
    en: 'Perfect memory! PexeQuiz 100% 🧠 Try it yourself',
  },
  'pq.great': {
    cs: 'Zahrál jsem PexeQuiz na pexedu.cz 🃏 Porazíš můj výsledek?',
    sk: 'Zahral som PexeQuiz na pexedu.cz 🃏 Porazíš môj výsledok?',
    en: 'I played PexeQuiz on pexedu.cz 🃏 Can you beat my score?',
  },
  'pq.default': {
    cs: 'Zahrál jsem PexeQuiz na pexedu.cz 🎮 Jak dopadneš ty?',
    sk: 'Zahral som PexeQuiz na pexedu.cz 🎮 Ako dopadneš ty?',
    en: 'I played PexeQuiz on pexedu.cz 🎮 How will you do?',
  },
  'mp.winner': {
    cs: 'Porazil jsem soupeře na pexedu! 🏆 Zkus to taky',
    sk: 'Porazil som súpera na pexedu! 🏆 Vyskúšaj to',
    en: 'I beat my opponent on pexedu! 🏆 Try it yourself',
  },
  'mp.tie': {
    cs: 'Remíza! Stejně dobří na pexedu 🤝 Zahraj si to taky',
    sk: 'Remíza! Rovnako dobrí na pexedu 🤝 Zahraj si to',
    en: "It's a draw! Equally matched on pexedu 🤝 Play too",
  },
  'mp.loss': {
    cs: 'Zahrál jsem pexedu 🎮 Zvládneš to lépe než já?',
    sk: 'Zahral som pexedu 🎮 Zvládneš to lepšie ako ja?',
    en: 'I played pexedu 🎮 Can you do better than me?',
  },
}

function pickTextKey(ctx: ShareContext): string {
  if (ctx.kind === 'lightning_solo') {
    if (ctx.accuracy === 100) return 'bk.perfect'
    if (ctx.accuracy >= 90)   return 'bk.great'
    if (ctx.accuracy >= 75)   return 'bk.good'
    return 'bk.default'
  }
  if (ctx.kind === 'pexequiz_solo') {
    if (ctx.accuracy === 100) return 'pq.perfect'
    if (ctx.accuracy >= 75)   return 'pq.great'
    return 'pq.default'
  }
  // multiplayer
  if (ctx.result === 'winner' || ctx.result === 'champion') return 'mp.winner'
  if (ctx.result === 'tie') return 'mp.tie'
  return 'mp.loss'
}

function buildDeepLink(deckId: string, mode: 'pexequiz' | 'lightning', ctx: ShareContext): string {
  const slug = getDeckSlug(deckId)
  const modeParam = mode === 'lightning' ? 'bleskovy_kviz' : 'pexequiz'
  const params = new URLSearchParams({ set: slug, mode: modeParam })

  if (ctx.kind === 'lightning_solo') {
    params.set('challenge', String(ctx.accuracy))
    if (ctx.avgTime !== undefined) params.set('time', String(ctx.avgTime))
  } else if (ctx.kind === 'pexequiz_solo') {
    params.set('challenge', String(ctx.accuracy))
  }

  return `https://pexedu.cz/?${params.toString()}`
}

const COPIED_MSG: Record<Language, string> = {
  cs: 'Odkaz zkopírován!',
  sk: 'Odkaz skopírovaný!',
  en: 'Link copied!',
}

export async function shareResult(opts: {
  deckId: string
  mode: 'pexequiz' | 'lightning'
  ctx: ShareContext
  language: Language
}) {
  const { deckId, mode, ctx, language } = opts
  const url  = buildDeepLink(deckId, mode, ctx)
  const textKey = pickTextKey(ctx)
  const text = SHARE_TEXTS[textKey]?.[language] ?? SHARE_TEXTS[textKey]?.['cs'] ?? ''
  const full = `${text} ${url}`

  try {
    if (navigator.share) {
      await navigator.share({ title: 'pexedu', text, url })
    } else {
      await navigator.clipboard.writeText(full)
      toast.success(COPIED_MSG[language] ?? COPIED_MSG['cs'], { duration: 2000 })
    }
  } catch {
    // User cancelled or clipboard failed — ignore
  }
}

// Challenge banner text builders
const CHALLENGE_BANNER: Record<Language, (score: number, time?: number) => string> = {
  cs: (score, time) => time
    ? `🎯 Někdo tě vyzývá! Dokážeš překonat ${score} % za ${time}s?`
    : `🎯 Někdo tě vyzývá! Dokážeš překonat ${score} %?`,
  sk: (score, time) => time
    ? `🎯 Niekto ťa vyzýva! Dokážeš prekonať ${score} % za ${time}s?`
    : `🎯 Niekto ťa vyzýva! Dokážeš prekonať ${score} %?`,
  en: (score, time) => time
    ? `🎯 Someone challenged you! Can you beat ${score}% in ${time}s?`
    : `🎯 Someone challenged you! Can you beat ${score}%?`,
}

export function buildChallengeBanner(score: number, language: Language, time?: number): string {
  return (CHALLENGE_BANNER[language] ?? CHALLENGE_BANNER['cs'])(score, time)
}
