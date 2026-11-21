import { useLocalSearchParams } from 'expo-router';

import { CheatsheetScreen } from '@/features/cheatsheet/CheatsheetScreen';

export default function CheatsheetRoute() {
  const params = useLocalSearchParams<{ topicId?: string; source?: string; focus?: string }>();
  const topicId = first(params.topicId);
  const source = first(params.source) === 'path' ? 'path' : 'search';

  return (
    <CheatsheetScreen
      topicId={topicId}
      source={source}
      autoFocus={source === 'search' || first(params.focus) === '1'}
    />
  );
}

function first(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value)) return first(value[0]);
  return null;
}
