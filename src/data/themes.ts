export type Theme = 'dark' | 'light'

export interface ThemeColors {
  bg: string
  surface: string
  surfaceBorder: string
  text: string
  textMuted: string
  textDim: string
  textFaint: string
  btnInactiveBg: string
  btnInactiveBorder: string
  btnInactiveText: string
  scorePillBg: string
  inputBg: string
  inputBorder: string
  newGameBg: string
  newGameBorder: string
  newGameText: string
  footerGradient: string
  overlayBg: string
  winOverlayBg: string
  modalSurface: string
  modalSurfaceBorder: string
  quizOptionBg: string
  quizOptionBorder: string
  factBg: string
  factText: string
  cardFront: string
  cardMatched: string
}

export const THEMES: Record<Theme, ThemeColors> = {
  dark: {
    bg:                 '#0d1b2a',
    surface:            'rgba(255,255,255,0.05)',
    surfaceBorder:      'rgba(255,255,255,0.1)',
    text:               '#ffffff',
    textMuted:          'rgba(255,255,255,0.5)',
    textDim:            'rgba(255,255,255,0.6)',
    textFaint:          'rgba(255,255,255,0.25)',
    btnInactiveBg:      'transparent',
    btnInactiveBorder:  'rgba(255,255,255,0.15)',
    btnInactiveText:    'rgba(255,255,255,0.6)',
    scorePillBg:        'rgba(255,255,255,0.04)',
    inputBg:            'rgba(255,255,255,0.07)',
    inputBorder:        'rgba(255,255,255,0.13)',
    newGameBg:          'transparent',
    newGameBorder:      'rgba(255,255,255,0.2)',
    newGameText:        'rgba(255,255,255,0.45)',
    footerGradient:     'linear-gradient(to top, rgba(13,27,42,0.95) 60%, transparent)',
    overlayBg:          'rgba(13,27,42,0.96)',
    winOverlayBg:       'rgba(0,0,0,0.88)',
    modalSurface:       'linear-gradient(160deg, #111f2e 0%, #1a2f4a 100%)',
    modalSurfaceBorder: 'rgba(255,255,255,0.1)',
    quizOptionBg:       'rgba(255,255,255,0.07)',
    quizOptionBorder:   'rgba(255,255,255,0.12)',
    factBg:             'rgba(255,255,255,0.06)',
    factText:           'rgba(255,255,255,0.6)',
    cardFront:          '#f0f4ff',
    cardMatched:        '#e8f5e9',
  },
  light: {
    bg:                 '#eef1f9',
    surface:            'rgba(255,255,255,0.9)',
    surfaceBorder:      'rgba(13,27,42,0.1)',
    text:               '#0d1b2a',
    textMuted:          'rgba(13,27,42,0.5)',
    textDim:            'rgba(13,27,42,0.55)',
    textFaint:          'rgba(13,27,42,0.3)',
    btnInactiveBg:      'rgba(255,255,255,0.7)',
    btnInactiveBorder:  'rgba(13,27,42,0.15)',
    btnInactiveText:    'rgba(13,27,42,0.6)',
    scorePillBg:        'rgba(13,27,42,0.05)',
    inputBg:            'rgba(255,255,255,0.85)',
    inputBorder:        'rgba(13,27,42,0.15)',
    newGameBg:          'rgba(13,27,42,0.06)',
    newGameBorder:      'rgba(13,27,42,0.15)',
    newGameText:        'rgba(13,27,42,0.5)',
    footerGradient:     'linear-gradient(to top, rgba(238,241,249,0.97) 60%, transparent)',
    overlayBg:          'rgba(200,210,235,0.97)',
    winOverlayBg:       'rgba(13,27,42,0.6)',
    modalSurface:       'linear-gradient(160deg, #ffffff 0%, #dde4ff 100%)',
    modalSurfaceBorder: 'rgba(13,27,42,0.12)',
    quizOptionBg:       'rgba(13,27,42,0.05)',
    quizOptionBorder:   'rgba(13,27,42,0.12)',
    factBg:             'rgba(13,27,42,0.05)',
    factText:           'rgba(13,27,42,0.6)',
    cardFront:          '#ffffff',
    cardMatched:        '#d4f0d8',
  },
}
