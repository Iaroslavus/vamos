// Vamos design tokens — единственный источник цветов, шрифтов и размеров.

export const colors = {
  // фон и поверхности
  ground: '#FFF6EA', // тёплый кремовый фон
  surface: '#FFFFFF',
  surfaceSunken: '#EDE3D4', // пустые прогресс-бары, закрытые узлы
  border: '#F0E2CF',
  borderStrong: '#E3D6C3',

  // текст
  ink: '#1B1A2E', // основной текст и тёмные карточки
  inkMuted: '#5B5870',
  inkDisabled: '#8A806F',
  inkOnDark: '#FFFFFF',
  inkOnDarkMuted: '#C9C6DC',

  // акценты
  coral: '#E8553A', // главное действие
  coralDeep: '#B83A24', // «подошва» кнопки
  saffron: '#F5A524', // награды, XP, подписка
  saffronDeep: '#B87A0E',
  saffronSoft: '#FFE3B3',
  teal: '#0E6B64', // успех, пройдено
  tealDeep: '#0A4F4A',
  tealSoft: '#D7F2E6',
  blue: '#3D6FD6', // аудирование
  errorSoft: '#FFE1DA',
  errorInk: '#9E2F1B',
  hint: '#FFF0C9',
} as const;

export const fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  body: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
  bodyHeavy: 'Manrope_800ExtraBold',
} as const;

export const type = {
  h1: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  h2: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.4 },
  h3: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22 },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22 },
  button: { fontFamily: fonts.bodyHeavy, fontSize: 17 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 11, letterSpacing: 0.6 },
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;
export const radius = { sm: 12, md: 14, lg: 18, xl: 22, xxl: 24, pill: 999 } as const;

// Объёмная кнопка: цвет «подошвы» и её высота
export const depth = { button: 5, chip: 3, node: 5 } as const;

export const motion = {
  press: { duration: 80 },
  spring: { damping: 18, stiffness: 180, mass: 1 },
  stagger: 60,
  pop: { from: 0.6, overshoot: 1.08, duration: 280 },
  shake: { distance: 6, repeats: 2, duration: 150 },
  pulse: { period: 1800 },
  progress: { duration: 900 },
} as const;

export const theme = { colors, fonts, type, space, radius, depth, motion };
export type Theme = typeof theme;
