import type { DeckId } from '../types/game'

export type Language = 'cs' | 'sk' | 'en'

export interface Translations {
  // Setup
  deckLabel: string
  sizeLabel: string
  playersLabel: string
  namesLabel: string
  yourName: string
  startBtn: string
  rulesLink: string
  sizeLarge: string
  sizeMedium: string
  sizeSmall: string
  // Game
  newGame: string
  lightMode: string
  darkMode: string
  soundOn: string
  soundOff: string
  onTurn: string          // contains {name}
  turnCorrect: string     // contains {name}
  turnWrong: string       // contains {name}
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
  rulesOnlineTitle: string
  rulesOnline: string[]
  // Deck questions (used for CS + SK quiz mode)
  deckQuestions: Record<DeckId, string>
  // Deck names (shown in setup)
  deckNames: Record<DeckId, string>
  // Default player names
  defaultPlayerNames: string[]
  // Solo mode win screen
  soloGameOver: string
  soloMovesLabel: string
  soloQuizLabel: string
  moveOne: string; moveFew: string; moveMany: string
  chooseDeck: string
  gameModeLabel: string
  modePexeQuiz: string
  modeLightning: string
  questionCountLabel: string
  timeLimitLabel: string
  questionCountAll: string
  soloQuizBtn: string
  createGameBtn: string
  lightningAvgTime: string
  lightningTimeUp: string
  // Lobby / online
  localBtn: string
  onlineBtn: string
  createRoom: string
  joinRoom: string
  roomCode: string
  copied: string
  waitingForPlayers: string
  startOnlineGame: string
  waitingForHost: string
  connectedPlayers: string
  roomNotFound: string
  connecting: string
  leaveRoom: string
  you: string
  lobbyHost: string
  backBtn: string
  waitingForTurn: string  // contains {name}
  playerLeft: string      // contains {name}
  youAreAlone: string
  turnTimeLabel: string
  quizTimeLabel: string
  turnTimeOff: string
  rematchRequest: string
  rematchWaiting: string
  yourTurn: string
}

export const TRANSLATIONS: Record<Language, Translations> = {
  cs: {
    deckLabel: 'Sada karet',
    sizeLabel: 'Velikost hrací plochy',
    playersLabel: 'Počet hráčů',
    namesLabel: 'Jména hráčů',
    yourName: 'Vaše jméno',
    startBtn: 'Začít hru',
    rulesLink: '📖 Pravidla hry',
    sizeLarge: 'Velké',
    sizeMedium: 'Střední',
    sizeSmall: 'Malé',
    newGame: 'Nová hra',
    lightMode: 'Světlý režim',
    darkMode: 'Tmavý režim',
    soundOn: 'Zapnout zvuk',
    soundOff: 'Vypnout zvuk',
    onTurn: 'Na tahu: {name}',
    turnCorrect: '✓ Správně! {name} hraje znovu.',
    turnWrong: '✗ Tentokrát ne. {name} hraje znovu.',
    continueBtn: 'Pokračovat',
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
    rulesOnlineTitle: '🌐 Online hra',
    rulesOnline: [
      'Hostitel vytvoří místnost a sdílí <b>kód</b> nebo <b>odkaz</b>. Ostatní se připojí a hostitel spustí hru.',
      'Pořadí hráčů: první hráč je vybrán <b>náhodně</b>.',
      'Na tahu je vždy <b>jen jeden hráč</b> — ostatní čekají. Pokud je nastaven časový limit tahu, musí hráč otočit pár do vypršení času, jinak přichází další.',
      'V kvízu <b>hlasují všichni hráči</b> — každý může získat bod za správnou odpověď. Hlasování se uzavře, jakmile odpoví všichni, nebo vyprší limit.',
      'Pokud hráč opustí hru, ostatní jsou <b>upozorněni</b>. Zůstaneš-li sám v místnosti, hra se pozastaví a můžeš odejít.',
    ],
    deckQuestions: {
      animals: 'Jak se toto zvířátko řekne anglicky?',
      flags:   'Čí je to vlajka?',
      fruits:  'Jak se tato potravina řekne anglicky?',
      jobs:    'Jak se toto povolání řekne anglicky?',
    },
    deckNames: {
      animals: 'Zvířátka',
      flags:   'Vlajky',
      fruits:  'Ovoce & zelenina',
      jobs:    'Povolání',
    },
    defaultPlayerNames: ['Hráč 1', 'Hráč 2', 'Hráč 3', 'Hráč 4', 'Hráč 5', 'Hráč 6'],
    localBtn: 'Lokální hra',
    onlineBtn: 'Online hra',
    createRoom: 'Vytvořit místnost',
    joinRoom: 'Připojit se ke hře',
    roomCode: 'Kód místnosti',
    copied: 'Zkopírováno!',
    waitingForPlayers: 'Čekání na dalšího hráče...',
    startOnlineGame: 'Spustit hru',
    waitingForHost: 'Čekání na spuštění hry...',
    connectedPlayers: 'Hráči v místnosti',
    roomNotFound: 'Místnost nenalezena. Zkontroluj kód.',
    connecting: 'Připojování...',
    leaveRoom: 'Opustit místnost',
    you: '(ty)',
    lobbyHost: 'Hostitel',
    backBtn: 'Zpět',
    waitingForTurn: 'Čekáš na tah hráče {name}...',
    playerLeft: '{name} opustil hru.',
    youAreAlone: 'Zůstal jsi sám v místnosti.',
    turnTimeLabel: 'Čas na tah',
    quizTimeLabel: 'Čas na kvíz',
    turnTimeOff: 'Bez limitu',
    rematchRequest: 'Hrát znovu?',
    rematchWaiting: 'Čekám na soupeře...',
    yourTurn: 'Jsi na tahu!',
    soloGameOver: 'Výborně!',
    soloMovesLabel: 'Počet tahů',
    soloQuizLabel: 'Úspěšnost v kvízu',
    moveOne: 'tah', moveFew: 'tahy', moveMany: 'tahů',
    chooseDeck: 'Vybrat jinou sadu',
    gameModeLabel: 'Herní mód',
    modePexeQuiz: 'PexeQuiz',
    modeLightning: 'Bleskový kvíz',
    questionCountLabel: 'Počet otázek',
    timeLimitLabel: 'Čas na otázku',
    questionCountAll: 'Vše',
    soloQuizBtn: 'Solo kvíz',
    createGameBtn: 'Vytvořit hru',
    lightningAvgTime: 'Průměrný čas',
    lightningTimeUp: 'Čas vypršel!',
  },

  sk: {
    deckLabel: 'Sada kariet',
    sizeLabel: 'Veľkosť hracej plochy',
    playersLabel: 'Počet hráčov',
    namesLabel: 'Mená hráčov',
    yourName: 'Vaše meno',
    startBtn: 'Začať hru',
    rulesLink: '📖 Pravidlá hry',
    sizeLarge: 'Veľké',
    sizeMedium: 'Stredné',
    sizeSmall: 'Malé',
    newGame: 'Nová hra',
    lightMode: 'Svetlý režim',
    darkMode: 'Tmavý režim',
    soundOn: 'Zapnúť zvuk',
    soundOff: 'Vypnúť zvuk',
    onTurn: 'Na rade: {name}',
    turnCorrect: '✓ Správne! {name} hrá znovu.',
    turnWrong: '✗ Tentokrát nie. {name} hrá znovu.',
    continueBtn: 'Pokračovať',
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
    rulesOnlineTitle: '🌐 Online hra',
    rulesOnline: [
      'Hostiteľ vytvorí miestnosť a zdieľa <b>kód</b> alebo <b>odkaz</b>. Ostatní sa pripoja a hostiteľ spustí hru.',
      'Poradie hráčov: prvý hráč je vybraný <b>náhodne</b>.',
      'Na rade je vždy <b>len jeden hráč</b> — ostatní čakajú. Ak je nastavený časový limit, musí hráč otočiť pár pred vypršaním, inak prichádza ďalší.',
      'V kvíze <b>hlasujú všetci hráči</b> — každý môže získať bod za správnu odpoveď. Hlasovanie sa uzavrie, keď odpovedajú všetci, alebo vyprší limit.',
      'Ak hráč opustí hru, ostatní sú <b>upozornení</b>. Ak zostaneš sám v miestnosti, hra sa pozastaví a môžeš odísť.',
    ],
    deckQuestions: {
      animals: 'Ako sa toto zvieratko povie po anglicky?',
      flags:   'Čia je to vlajka?',
      fruits:  'Ako sa táto potravina povie po anglicky?',
      jobs:    'Ako sa toto povolanie povie po anglicky?',
    },
    deckNames: {
      animals: 'Zvieratká',
      flags:   'Vlajky',
      fruits:  'Ovocie & zelenina',
      jobs:    'Povolania',
    },
    defaultPlayerNames: ['Hráč 1', 'Hráč 2', 'Hráč 3', 'Hráč 4', 'Hráč 5', 'Hráč 6'],
    localBtn: 'Lokálna hra',
    onlineBtn: 'Online hra',
    createRoom: 'Vytvoriť miestnosť',
    joinRoom: 'Pripojiť sa ku hre',
    roomCode: 'Kód miestnosti',
    copied: 'Skopírované!',
    waitingForPlayers: 'Čakanie na ďalšieho hráča...',
    startOnlineGame: 'Spustiť hru',
    waitingForHost: 'Čakanie na spustenie hry...',
    connectedPlayers: 'Hráči v miestnosti',
    roomNotFound: 'Miestnosť nenájdená. Skontroluj kód.',
    connecting: 'Pripájanie...',
    leaveRoom: 'Opustiť miestnosť',
    you: '(ty)',
    lobbyHost: 'Hostiteľ',
    backBtn: 'Späť',
    waitingForTurn: 'Čakáš na ťah hráča {name}...',
    playerLeft: '{name} opustil hru.',
    youAreAlone: 'Zostal si sám v miestnosti.',
    turnTimeLabel: 'Čas na ťah',
    quizTimeLabel: 'Čas na kvíz',
    turnTimeOff: 'Bez limitu',
    rematchRequest: 'Hrať znovu?',
    rematchWaiting: 'Čakám na súpera...',
    yourTurn: 'Si na ťahu!',
    soloGameOver: 'Výborne!',
    soloMovesLabel: 'Počet ťahov',
    soloQuizLabel: 'Úspešnosť v kvíze',
    moveOne: 'ťah', moveFew: 'ťahy', moveMany: 'ťahov',
    chooseDeck: 'Vybrať inú sadu',
    gameModeLabel: 'Herný mód',
    modePexeQuiz: 'PexeQuiz',
    modeLightning: 'Bleskový kvíz',
    questionCountLabel: 'Počet otázok',
    timeLimitLabel: 'Čas na otázku',
    questionCountAll: 'Všetky',
    soloQuizBtn: 'Solo kvíz',
    createGameBtn: 'Vytvoriť hru',
    lightningAvgTime: 'Priemerný čas',
    lightningTimeUp: 'Čas vypršal!',
  },

  en: {
    deckLabel: 'Card set',
    sizeLabel: 'Board size',
    playersLabel: 'Number of players',
    namesLabel: 'Player names',
    yourName: 'Your name',
    startBtn: 'Start game',
    rulesLink: '📖 Rules',
    sizeLarge: 'Large',
    sizeMedium: 'Medium',
    sizeSmall: 'Small',
    newGame: 'New game',
    lightMode: 'Light mode',
    darkMode: 'Dark mode',
    soundOn: 'Sound on',
    soundOff: 'Sound off',
    onTurn: 'Turn: {name}',
    turnCorrect: '✓ Correct! {name} plays again.',
    turnWrong: '✗ Not this time. {name} plays again.',
    continueBtn: 'Continue',
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
    rulesOnlineTitle: '🌐 Online game',
    rulesOnline: [
      'The host creates a room and shares the <b>code</b> or <b>link</b>. Others join, then the host starts the game.',
      'Turn order: the first player is chosen <b>randomly</b>.',
      'Only <b>one player is on turn</b> at a time — others wait. If a turn timer is set, the active player must find a pair before time runs out, or the turn passes.',
      'In the quiz, <b>all players vote</b> — everyone can earn a point for a correct answer. Voting closes when all have answered or the timer expires.',
      'If a player leaves, others are <b>notified</b>. If you\'re left alone in the room, the game pauses and you can leave.',
    ],
    deckQuestions: {
      animals: 'Which fact is true about this animal?',
      flags:   'Which country does this flag represent?',
      fruits:  'Which fact is true about this food?',
      jobs:    'Which fact is true about this profession?',
    },
    deckNames: {
      animals: 'Animals',
      flags:   'Flags',
      fruits:  'Fruits & Vegetables',
      jobs:    'Professions',
    },
    defaultPlayerNames: ['Player 1', 'Player 2', 'Player 3', 'Player 4', 'Player 5', 'Player 6'],
    localBtn: 'Local game',
    onlineBtn: 'Online game',
    createRoom: 'Create Room',
    joinRoom: 'Join a Game',
    roomCode: 'Room Code',
    copied: 'Copied!',
    waitingForPlayers: 'Waiting for another player...',
    startOnlineGame: 'Start Game',
    waitingForHost: 'Waiting for host to start...',
    connectedPlayers: 'Players in room',
    roomNotFound: 'Room not found. Check the code.',
    connecting: 'Connecting...',
    leaveRoom: 'Leave room',
    you: '(you)',
    lobbyHost: 'Host',
    backBtn: 'Back',
    waitingForTurn: 'Waiting for {name}...',
    playerLeft: '{name} left the game.',
    youAreAlone: 'You are alone in the room.',
    turnTimeLabel: 'Turn time',
    quizTimeLabel: 'Quiz time',
    turnTimeOff: 'Unlimited',
    rematchRequest: 'Rematch?',
    rematchWaiting: 'Waiting for opponent...',
    yourTurn: 'Your turn!',
    soloGameOver: 'Well done!',
    soloMovesLabel: 'Total moves',
    soloQuizLabel: 'Quiz accuracy',
    moveOne: 'move', moveFew: 'moves', moveMany: 'moves',
    chooseDeck: 'Choose a different deck',
    gameModeLabel: 'Game mode',
    modePexeQuiz: 'MemQuiz',
    modeLightning: 'Lightning Quiz',
    questionCountLabel: 'Questions',
    timeLimitLabel: 'Time per question',
    questionCountAll: 'All',
    soloQuizBtn: 'Solo quiz',
    createGameBtn: 'Create game',
    lightningAvgTime: 'Avg. time',
    lightningTimeUp: "Time's up!",
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
