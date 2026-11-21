import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { colors, hero } from '@/theme/tokens';

type BotasProps = {
  fur?: string;
  furDark?: string;
  boots?: string;
  bootsDark?: string;
  scarf?: string;
  /** Width in pt; height keeps the 64×78 proportions. */
  size?: number;
};

export const BOTAS_WIDTH = 64;
export const BOTAS_HEIGHT = 78;

/**
 * Botas — a grey cat in coral boots with a saffron scarf and a teal backpack.
 * Drawn from the «v3 · Путь» board; palette lives in `hero` tokens.
 */
export function Botas({
  fur = hero.fur,
  furDark = hero.furDark,
  boots = hero.boots,
  bootsDark = hero.bootsDark,
  scarf = hero.scarf,
  size = BOTAS_WIDTH,
}: BotasProps) {
  const height = (size * BOTAS_HEIGHT) / BOTAS_WIDTH;
  return (
    <Svg width={size} height={height} viewBox="0 0 64 78">
      <Path
        d="M46 56 C60 54 62 40 54 34"
        stroke={furDark}
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
      <Rect x={8} y={40} width={12} height={20} rx={4} fill={hero.backpack} />
      <Ellipse cx={32} cy={52} rx={16} ry={15} fill={fur} />
      <Ellipse cx={32} cy={55} rx={9} ry={10} fill={hero.belly} />
      <Path d="M20 42 L26 60" stroke={hero.strap} strokeWidth={2.5} strokeLinecap="round" />
      <Path d="M20 62 h10 v10 h4 a3 3 0 0 1 0 6 H20 z" fill={boots} />
      <Rect x={19} y={61} width={12} height={4} rx={2} fill={bootsDark} />
      <Path d="M34 62 h10 v10 h4 a3 3 0 0 1 0 6 H34 z" fill={boots} />
      <Rect x={33} y={61} width={12} height={4} rx={2} fill={bootsDark} />
      <Path d="M18 20 L17 5 L29 13 Z" fill={fur} />
      <Path d="M46 20 L47 5 L35 13 Z" fill={fur} />
      <Path d="M20 17 L19.5 9 L26 13 Z" fill={hero.ear} />
      <Path d="M44 17 L44.5 9 L38 13 Z" fill={hero.ear} />
      <Circle cx={32} cy={27} r={16} fill={fur} />
      <Ellipse cx={32} cy={33} rx={8} ry={6} fill={hero.belly} />
      <Ellipse cx={26} cy={26} rx={2.6} ry={3.4} fill={colors.ink} />
      <Ellipse cx={38} cy={26} rx={2.6} ry={3.4} fill={colors.ink} />
      <Circle cx={27} cy={25} r={0.9} fill={colors.surface} />
      <Circle cx={39} cy={25} r={0.9} fill={colors.surface} />
      <Path d="M30 30.5 h4 l-2 2.2 z" fill={colors.coral} />
      <Path
        d="M29.5 34 q2.5 2 2.5 0 q0 2 2.5 0"
        stroke={colors.ink}
        strokeWidth={1.2}
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M14 31 h7 M14 34 l7 -1 M50 31 h-7 M50 34 l-7 -1"
        stroke={colors.ink}
        strokeWidth={0.8}
        strokeLinecap="round"
        opacity={0.55}
      />
      <Path d="M19 39 Q32 45 45 39 L44 43 Q32 49 20 43 Z" fill={scarf} />
    </Svg>
  );
}
