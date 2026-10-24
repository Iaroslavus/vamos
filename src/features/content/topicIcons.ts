import { Coffee, Hand, Hash, Sparkles, type LucideIcon } from 'lucide-react-native';

const TOPIC_ICONS: Record<string, LucideIcon> = {
  wave: Hand,
  hash: Hash,
  cup: Coffee,
};

/** Topic `icon` slug → line icon. Unknown slugs fall back to a spark. */
export function resolveTopicIcon(slug: string | undefined): LucideIcon {
  if (!slug) return Sparkles;
  return TOPIC_ICONS[slug] ?? Sparkles;
}
