import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors, hero } from '@/theme/tokens';

type PathDecorProps = {
  motif: number;
  left: number;
  top: number;
};

/** Small street pieces from the «v3 · Путь» board: café umbrella, market stall, signpost, house. */
export function PathDecor({ motif, left, top }: PathDecorProps) {
  const kind = motif % 4;
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.spot, { left, top }]}
    >
      <Svg width={64} height={64} viewBox="0 0 64 64">
        {kind === 0 ? <CafeUmbrella /> : null}
        {kind === 1 ? <MarketStall /> : null}
        {kind === 2 ? <Signpost /> : null}
        {kind === 3 ? <House /> : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  spot: {
    position: 'absolute',
    width: 64,
    height: 64,
  },
});

function CafeUmbrella() {
  return (
    <G transform="translate(20 8)">
      <Rect x={9} y={8} width={3} height={36} fill={colors.wood} />
      <Path d="M-12 12 Q10 -8 33 12 Z" fill={colors.coral} />
      <Path d="M2 12 Q10 -6 10 0 L10 12 Z M18 12 Q11 -6 11 0 L11 12 Z" fill={colors.surface} />
      <Rect x={-4} y={36} width={30} height={4} rx={2} fill={colors.inkMuted} />
      <Rect x={-1} y={40} width={3} height={10} fill={colors.inkMuted} />
      <Rect x={20} y={40} width={3} height={10} fill={colors.inkMuted} />
      <Rect
        x={2}
        y={30}
        width={6}
        height={6}
        rx={1}
        fill={colors.surface}
        stroke={colors.inkMuted}
        strokeWidth={1.2}
      />
    </G>
  );
}

function MarketStall() {
  return (
    <G transform="translate(6 12)">
      <Rect x={0} y={0} width={52} height={10} fill={colors.teal} />
      <Rect x={8} y={0} width={9} height={10} fill={colors.surface} />
      <Rect x={26} y={0} width={9} height={10} fill={colors.surface} />
      <Path d="M0 10 h52 l-4 6 h-44 z" fill={colors.tealDeep} />
      <Rect x={4} y={16} width={3} height={20} fill={colors.wood} />
      <Rect x={45} y={16} width={3} height={20} fill={colors.wood} />
      <Rect x={2} y={30} width={48} height={12} rx={2} fill={colors.saffronSoft} />
      <Circle cx={12} cy={27} r={4} fill={colors.coral} />
      <Circle cx={21} cy={27} r={4} fill={hero.scarf} />
      <Circle cx={30} cy={27} r={4} fill={colors.teal} />
      <Circle cx={39} cy={27} r={4} fill={colors.coral} />
    </G>
  );
}

function Signpost() {
  return (
    <G transform="translate(18 12)">
      <Rect x={9} y={0} width={4} height={42} fill={colors.wood} />
      <Path d="M13 4 h22 l6 5 l-6 5 h-22 z" fill={colors.blue} />
      <Path d="M9 18 h-14 l-5 5 l5 5 h14 z" fill={colors.coral} />
    </G>
  );
}

function House() {
  return (
    <G transform="translate(4 4)">
      <Path d="M0 22 L28 4 L56 22 Z" fill={colors.coralDeep} />
      <Rect
        x={4}
        y={22}
        width={48}
        height={36}
        fill={colors.surface}
        stroke={colors.borderStrong}
        strokeWidth={2}
      />
      <Rect x={21} y={36} width={14} height={22} rx={2} fill={colors.inkMuted} />
      <Rect x={9} y={30} width={9} height={9} fill={colors.windowGlass} />
      <Rect x={38} y={30} width={9} height={9} fill={colors.windowGlass} />
      <Path d="M2 22 h52 l-3 6 h-46 z" fill={colors.coral} />
    </G>
  );
}
