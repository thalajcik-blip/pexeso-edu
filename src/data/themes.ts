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
  cardBackGradient: string
  cardBackSymbol: string
  cardGridBg: string
  successColor: string
  successBg: string
  errorColor: string
  errorBg: string
  // Accent (yellow in dark, blue in light)
  accent: string          // solid color — for text, border, icon
  accentGradient: string  // gradient — for button backgrounds
  accentText: string
  accentGlow: string
  accentBorderActive: string
  accentBgActive: string
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
    cardMatched:        'rgba(46,204,113,0.22)',
    cardBackGradient:   'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1a237e 100%)',
    cardBackSymbol:     'rgba(255,255,255,0.15)',
    cardGridBg:         'transparent',
    successColor:       '#2ecc71',
    successBg:          'rgba(46,204,113,0.25)',
    errorColor:         '#e74c3c',
    errorBg:            'rgba(231,76,60,0.25)',
    accent:             '#ffdd35',
    accentGradient:     'linear-gradient(135deg, #ffea83 0%, #ffdd35 15%, #ffa800 100%)',
    accentText:         '#0d1b2a',
    accentGlow:         'rgba(255,187,0,0.35)',
    accentBorderActive: 'rgba(255,187,0,0.7)',
    accentBgActive:     'rgba(255,187,0,0.1)',
  },
  light: {
    bg:                 '#eef1f9',
    surface:            'rgba(255,255,255,0.9)',
    surfaceBorder:      'rgba(13,27,42,0.1)',
    text:               '#0d1b2a',
    textMuted:          'rgba(13,27,42,0.75)',
    textDim:            'rgba(13,27,42,0.8)',
    textFaint:          'rgba(13,27,42,0.5)',
    btnInactiveBg:      'rgba(255,255,255,0.7)',
    btnInactiveBorder:  'rgba(13,27,42,0.25)',
    btnInactiveText:    'rgba(13,27,42,0.75)',
    scorePillBg:        'rgba(13,27,42,0.07)',
    inputBg:            'rgba(255,255,255,0.85)',
    inputBorder:        'rgba(13,27,42,0.25)',
    newGameBg:          'rgba(13,27,42,0.06)',
    newGameBorder:      'rgba(13,27,42,0.25)',
    newGameText:        'rgba(13,27,42,0.7)',
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
    cardMatched:        'rgba(22,163,74,0.18)',
    cardBackGradient:   'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)',
    cardBackSymbol:     'rgba(255,255,255,0.55)',
    cardGridBg:         'rgba(13,27,42,0.06)',
    successColor:       '#16a34a',
    successBg:          'rgba(22,163,74,0.15)',
    errorColor:         '#dc2626',
    errorBg:            'rgba(220,38,38,0.12)',
    accent:             '#2653eb',
    accentGradient:     'linear-gradient(135deg, #2653eb 0%, #ef8cfa 100%)',
    accentText:         '#ffffff',
    accentGlow:         'rgba(38,83,235,0.25)',
    accentBorderActive: 'rgba(38,83,235,0.7)',
    accentBgActive:     'rgba(38,83,235,0.1)',
  },
}
