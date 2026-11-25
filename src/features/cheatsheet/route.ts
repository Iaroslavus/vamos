export type PhrasebookSource = 'path' | 'search';

export type PhrasebookTarget = {
  pathname: '/vocab';
  params: {
    tab: 'phrasebook';
    source: PhrasebookSource;
    topicId?: string;
    focus?: '1';
  };
};

/** Old `/cheatsheet` links: a path topic stays on that topic; search opens the field. */
export function cheatsheetRedirectTarget(params: {
  topicId?: string | null;
  source?: string | null;
  focus?: string | null;
}): PhrasebookTarget {
  const source = params.source === 'path' ? 'path' : 'search';
  const focus = params.focus === '1' || source === 'search';
  return phrasebookTarget({
    topicId: params.topicId ?? null,
    focus,
    source,
  });
}

/** Vocab «Розмовник» for a topic, or the phrase search with the field focused. */
export function phrasebookTarget(input: {
  topicId?: string | null;
  focus?: boolean;
  source?: PhrasebookSource;
}): PhrasebookTarget {
  return {
    pathname: '/vocab',
    params: {
      tab: 'phrasebook',
      source: input.source ?? (input.topicId ? 'path' : 'search'),
      ...(input.topicId ? { topicId: input.topicId } : {}),
      ...(input.focus ? { focus: '1' as const } : {}),
    },
  };
}
