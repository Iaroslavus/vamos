import {
  Bus,
  Carrot,
  Clock,
  Coffee,
  Hand,
  Hash,
  MapPin,
  MessageCircle,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';

const TOPIC_ICONS: Record<string, LucideIcon> = {
  wave: Hand,
  hash: Hash,
  cup: Coffee,
  bag: ShoppingBag,
  pin: MapPin,
  utensils: UtensilsCrossed,
  messages: MessageCircle,
  clock: Clock,
  carrot: Carrot,
  cart: ShoppingCart,
  shirt: Shirt,
  bus: Bus,
};

/** Topic `icon` slug → line icon. Unknown slugs fall back to a spark. */
export function resolveTopicIcon(slug: string | undefined): LucideIcon {
  if (!slug) return Sparkles;
  return TOPIC_ICONS[slug] ?? Sparkles;
}
