import { colors } from '@/theme/tokens';

const tintColorLight = colors.coral;
const tintColorDark = colors.inkOnDark;

export default {
  light: {
    text: colors.ink,
    background: colors.ground,
    tint: tintColorLight,
    tabIconDefault: colors.inkDisabled,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: colors.inkOnDark,
    background: colors.ink,
    tint: tintColorDark,
    tabIconDefault: colors.inkOnDarkMuted,
    tabIconSelected: tintColorDark,
  },
};
