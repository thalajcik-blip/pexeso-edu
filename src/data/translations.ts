import type { DeckId } from '../types/game'

export type Language = 'cs' | 'sk' | 'en'

export interface Translations {
  // Setup
  deckLabel: string
  sizeLabel: string
  playersLabel: string
  namesLabel: string
  startBtn: string
  rulesLink: string
  sizeLarge: string
  sizeMedium: string
  sizeSmall: string
  // Game
  newGame: string
  onTurn: string          // contains {name}
  // Quiz
  continueBtn: string
  correct: string         // contains {answer}
  wrong: string           // contains {answer}
  factQuestion: string    // EN: "Which fact is true?"
  // Win
  gameOver: string
  results: string
  tie: string
  winner: string          // contains {name}
  playAgain: string
  playerSettings: string
  pairOne: string; pairFew: string; pairMany: string
  quizOne: string; quizFew: string; quizMany: string
  // Rules
  rulesTitle: string
  rulesClose: string
  rules: string[]
  // Deck questions (used for CS + SK quiz mode)
  deckQuestions: Record<DeckId, string>
}

export const TRANSLATIONS: Record<Language, Translations> = {
  cs: {
    deckLabel: 'Sada karet',
    sizeLabel: 'Velikost hrací plochy',
    playersLabel: 'Počet hráčů',
    namesLabel: 'Jména hráčů',
    startBtn: 'Začít hru →',
    rulesLink: '📖 Pravidla hry',
    sizeLarge: 'Velké',
    sizeMedium: 'Střední',
    sizeSmall: 'Malé',
    newGame: '↺ Nová hra',
    onTurn: 'Na tahu: {name}',
    continueBtn: 'Pokračovat →',
    correct: '🎉 Správně! „{answer}" je správná odpověď.',
    wrong: '❌ Špatně. Správně je „{answer}".',
    factQuestion: 'Který z těchto faktů platí?',
    gameOver: 'Konec hry!',
    results: 'Výsledky',
    tie: '🤝 Remíza!',
    winner: '🏆 Vítěz: {name}',
    playAgain: 'Hrát znovu',
    playerSettings: 'Nastavení hráčů',
    pairOne: 'pár', pairFew: 'páry', pairMany: 'párů',
    quizOne: 'kvíz', quizFew: 'kvízy', quizMany: 'kvízů',
    rulesTitle: '📖 Pravidla hry',
    rulesClose: 'Zavřít',
    rules: [
      'Hráči se střídají. Na svém tahu hráč otočí <b>dvě kartičky</b>.',
      'Pokud se kartičky <b>shodují</b>, hráč získá <b>1 bod</b> za pár a zobrazí se kvízová otázka.',
      'Za <b>správnou odpověď</b> v kvízu hráč získá další <b>1 bod</b>.',
      'Po nalezeném páru (bez ohledu na kvíz) <b>hráč hraje znovu</b>.',
      'Pokud se kartičky <b>neshodují</b>, jsou otočeny zpět a přichází další hráč.',
      'Hra končí, když jsou nalezeny <b>všechny páry</b>. Vítězí hráč s nejvíce body.',
    ],
    deckQuestions: {
      animals: 'Jak se toto zvířátko řekne anglicky?',
      flags:   'Čí je to vlajka?',
      fruits:  'Jak se tato potravina řekne anglicky?',
      jobs:    'Jak se toto povolání řekne anglicky?',
    },
  },

  sk: {
    deckLabel: 'Sada kariet',
    sizeLabel: 'Veľkosť hracej plochy',
    playersLabel: 'Počet hráčov',
    namesLabel: 'Mená hráčov',
    startBtn: 'Začať hru →',
    rulesLink: '📖 Pravidlá hry',
    sizeLarge: 'Veľké',
    sizeMedium: 'Stredné',
    sizeSmall: 'Malé',
    newGame: '↺ Nová hra',
    onTurn: 'Na rade: {name}',
    continueBtn: 'Pokračovať →',
    correct: '🎉 Správne! „{answer}" je správna odpoveď.',
    wrong: '❌ Zle. Správne je „{answer}".',
    factQuestion: 'Ktorý fakt platí pre túto kartu?',
    gameOver: 'Koniec hry!',
    results: 'Výsledky',
    tie: '🤝 Remíza!',
    winner: '🏆 Víťaz: {name}',
    playAgain: 'Hrať znovu',
    playerSettings: 'Nastavenie hráčov',
    pairOne: 'pár', pairFew: 'páry', pairMany: 'párov',
    quizOne: 'kvíz', quizFew: 'kvízy', quizMany: 'kvízov',
    rulesTitle: '📖 Pravidlá hry',
    rulesClose: 'Zavrieť',
    rules: [
      'Hráči sa striedajú. Na svojom ťahu hráč otočí <b>dve kartičky</b>.',
      'Ak sa kartičky <b>zhodujú</b>, hráč získa <b>1 bod</b> za pár a zobrazí sa kvízová otázka.',
      'Za <b>správnu odpoveď</b> v kvíze hráč získa ďalší <b>1 bod</b>.',
      'Po nájdenom páre (bez ohľadu na kvíz) <b>hráč hrá znovu</b>.',
      'Ak sa kartičky <b>nezhodujú</b>, sú otočené späť a prichádza ďalší hráč.',
      'Hra končí, keď sú nájdené <b>všetky páry</b>. Víťazí hráč s najviac bodmi.',
    ],
    deckQuestions: {
      animals: 'Ako sa toto zvieratko povie po anglicky?',
      flags:   'Čia je to vlajka?',
      fruits:  'Ako sa táto potravina povie po anglicky?',
      jobs:    'Ako sa toto povolanie povie po anglicky?',
    },
  },

  en: {
    deckLabel: 'Card set',
    sizeLabel: 'Board size',
    playersLabel: 'Number of players',
    namesLabel: 'Player names',
    startBtn: 'Start game →',
    rulesLink: '📖 Rules',
    sizeLarge: 'Large',
    sizeMedium: 'Medium',
    sizeSmall: 'Small',
    newGame: '↺ New game',
    onTurn: 'Turn: {name}',
    continueBtn: 'Continue →',
    correct: '🎉 Correct! That\'s a true fact.',
    wrong: '❌ Wrong. The correct fact was the other one.',
    factQuestion: 'Which of these facts is true?',
    gameOver: 'Game over!',
    results: 'Results',
    tie: '🤝 It\'s a tie!',
    winner: '🏆 Winner: {name}',
    playAgain: 'Play again',
    playerSettings: 'Player settings',
    pairOne: 'pair', pairFew: 'pairs', pairMany: 'pairs',
    quizOne: 'quiz', quizFew: 'quizzes', quizMany: 'quizzes',
    rulesTitle: '📖 How to play',
    rulesClose: 'Close',
    rules: [
      'Players take turns. On your turn, flip <b>two cards</b>.',
      'If the cards <b>match</b>, you earn <b>1 point</b> and a quiz question appears.',
      'A <b>correct quiz answer</b> earns you another <b>1 point</b>.',
      'After finding a pair (regardless of the quiz) <b>you play again</b>.',
      'If the cards <b>don\'t match</b>, they are flipped back and the next player goes.',
      'The game ends when <b>all pairs</b> are found. The player with the most points wins.',
    ],
    deckQuestions: {
      animals: 'Which fact is true about this animal?',
      flags:   'Which fact is true about this country?',
      fruits:  'Which fact is true about this food?',
      jobs:    'Which fact is true about this profession?',
    },
  },
}

export function t(translations: Translations, key: keyof Translations, vars?: Record<string, string>): string {
  let str = translations[key] as string
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v) })
  }
  return str
}

export function pluralize(n: number, tr: Translations, one: keyof Translations, few: keyof Translations, many: keyof Translations): string {
  if (n === 1) return `${n} ${tr[one]}`
  if (n >= 2 && n <= 4) return `${n} ${tr[few]}`
  return `${n} ${tr[many]}`
}
