import type { LucideIcon } from 'lucide-react-native';

const ICON_STROKE = 2.2;

type TopicGlyphProps = {
  icon: LucideIcon;
  color: string;
  size?: number;
};

export function TopicGlyph({ icon: Icon, color, size = 24 }: TopicGlyphProps) {
  return <Icon color={color} size={size} strokeWidth={ICON_STROKE} />;
}
