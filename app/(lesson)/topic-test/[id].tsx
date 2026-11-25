import { useLocalSearchParams } from 'expo-router';

import { TopicTestScreen } from '@/features/topicTest/TopicTestScreen';

export default function TopicTestRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const topicId = firstParam(params.id);
  return <TopicTestScreen topicId={topicId ?? ''} />;
}

function firstParam(value: string | string[] | undefined): string | null {
  if (typeof value === 'string' && value !== '') return value;
  const first = Array.isArray(value) ? value[0] : undefined;
  return typeof first === 'string' && first !== '' ? first : null;
}
