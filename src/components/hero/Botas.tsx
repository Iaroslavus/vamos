import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

type BotasProps = {
  fur?: string;
  boots?: string;
  scarf?: string;
  width?: number;
  height?: number;
};

/** Boot-wearing mascot. Fur, boots, and scarf come from the caller so the palette stays in tokens. */
export function Botas({
  fur = colors.saffron,
  boots = colors.coral,
  scarf = colors.teal,
  width = 76,
  height = 92,
}: BotasProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 76 92">
      <Ellipse cx={16} cy={58} rx={8} ry={5} fill={fur} />
      <Ellipse cx={38} cy={58} rx={20} ry={18} fill={fur} />
      <Path d="M24 50c2 8 22 8 26 0" fill={scarf} />
      <Rect x={22} y={48} width={30} height={8} rx={4} fill={scarf} />
      <Path d="M48 52c8 2 12 8 8 12" stroke={scarf} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={38} cy={32} r={16} fill={fur} />
      <Ellipse cx={24} cy={20} rx={6} ry={8} fill={fur} />
      <Ellipse cx={52} cy={20} rx={6} ry={8} fill={fur} />
      <Ellipse cx={22} cy={22} rx={3} ry={4} fill={colors.surface} />
      <Ellipse cx={54} cy={22} rx={3} ry={4} fill={colors.surface} />
      <Circle cx={32} cy={32} r={2.4} fill={colors.ink} />
      <Circle cx={44} cy={32} r={2.4} fill={colors.ink} />
      <Ellipse cx={38} cy={38} rx={3} ry={2} fill={colors.ink} />
      <Path
        d="M33 41c2 2 8 2 10 0"
        stroke={colors.ink}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />
      <Rect x={20} y={72} width={14} height={14} rx={4} fill={boots} />
      <Rect x={42} y={72} width={14} height={14} rx={4} fill={boots} />
      <Rect x={18} y={82} width={18} height={5} rx={2} fill={colors.ink} />
      <Rect x={40} y={82} width={18} height={5} rx={2} fill={colors.ink} />
      <Rect x={22} y={74} width={10} height={3} rx={1} fill={colors.surface} />
      <Rect x={44} y={74} width={10} height={3} rx={1} fill={colors.surface} />
    </Svg>
  );
}
