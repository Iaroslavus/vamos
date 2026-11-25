/** The path consumes this once and walks Botas to the next topic. */
let pendingTopicId: string | null = null;

export function queueTopicCelebration(topicId: string): void {
  pendingTopicId = topicId;
}

export function takeTopicCelebration(): string | null {
  const topicId = pendingTopicId;
  pendingTopicId = null;
  return topicId;
}
