import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';

import { colors, type } from '@/theme/tokens';

export type TextVariant = keyof typeof type;

export type TextProps = RNTextProps & {
  variant?: TextVariant;
  color?: string;
};

export function Text({ variant = 'body', color = colors.ink, style, ...rest }: TextProps) {
  const variantStyle = type[variant] as TextStyle;

  return <RNText style={[{ color }, variantStyle, style]} {...rest} />;
}
