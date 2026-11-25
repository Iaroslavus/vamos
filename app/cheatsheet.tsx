import { Redirect, useLocalSearchParams } from 'expo-router';

import { cheatsheetRedirectTarget } from '@/features/cheatsheet/route';

/** Old шпаргалка links open the same topic in Словник → Розмовник. */
export default function CheatsheetRedirect() {
  const params = useLocalSearchParams<{ topicId?: string; source?: string; focus?: string }>();

  return (
    <Redirect
      href={cheatsheetRedirectTarget({
        topicId: first(params.topicId),
        source: first(params.source),
        focus: first(params.focus),
      })}
    />
  );
}

function first(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value)) return first(value[0]);
  return null;
}
