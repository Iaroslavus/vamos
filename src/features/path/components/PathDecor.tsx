import { StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

type PathDecorProps = {
  motif: number;
  left: number;
  top: number;
};

export function PathDecor({ motif, left, top }: PathDecorProps) {
  const kind = motif % 3;
  return (
    <View pointerEvents="none" accessibilityElementsHidden style={[styles.spot, { left, top }]}>
      <Svg width={64} height={64} viewBox="0 0 64 64">
        {kind === 0 ? <Umbrella /> : null}
        {kind === 1 ? <Signpost /> : null}
        {kind === 2 ? <House /> : null}
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

function Umbrella() {
  return (
    <>
      <Path d="M8 30c0-14 48-14 48 0H8z" fill={colors.coral} />
      <Path d="M32 30v22" stroke={colors.ink} strokeWidth={3} strokeLinecap="round" />
      <Path d="M32 52c6 0 8 6 2 6" stroke={colors.ink} strokeWidth={3} fill="none" />
    </>
  );
}

function Signpost() {
  return (
    <>
      <Path d="M30 16v40" stroke={colors.ink} strokeWidth={3} strokeLinecap="round" />
      <Rect x={8} y={18} width={36} height={16} rx={4} fill={colors.saffron} />
      <Path d="M44 26h10l-6 6-4-6z" fill={colors.saffronDeep} />
    </>
  );
}

function House() {
  return (
    <>
      <Path d="M8 32 L32 12 L56 32" fill={colors.coral} />
      <Rect x={14} y={32} width={36} height={24} rx={3} fill={colors.surface} />
      <Rect x={28} y={40} width={10} height={16} rx={2} fill={colors.teal} />
    </>
  );
}
