const { Linter } = require('eslint');

const rule = require('./zustand-stable-selectors');

function lint(code) {
  const linter = new Linter({ configType: 'flat' });
  return linter.verify(code, [
    {
      plugins: { vamos: { rules: { 'zustand-stable-selectors': rule } } },
      rules: { 'vamos/zustand-stable-selectors': 'error' },
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
  ]);
}

describe('zustand stable selectors', () => {
  it('allows primitives, state fields, and useShallow objects', () => {
    const messages = lint(`
      useLessonStore((s) => s.status);
      useLessonStore((s) => s.queue);
      useLessonStore((s) => s.correctCount + s.almostCount);
      useLessonStore((s) => s.summary?.newItems ?? EMPTY);
      useLessonStore((s) => {
        const id = s.queue[0];
        return id ? s.exerciseById[id] ?? null : null;
      });
      useLessonStore(useShallow((s) => ({ status: s.status, xp: s.xpEarned })));
      usePathProgressStore((s) => s.totalXp);
    `);

    expect(messages).toEqual([]);
  });

  it('rejects selectors that allocate a new object or array', () => {
    const messages = lint(`
      useLessonStore((s) => s.getSummary());
      useLessonStore((s) => ({ status: s.status }));
      useLessonStore((s) => s.queue.filter((id) => id));
      useLessonStore((s) => s.queue.slice());
      useLessonStore((s) => {
        const items = s.newItems.map((item) => item.es);
        return items;
      });
      useLessonStore(useShallow((s) => s.queue.map((id) => id)));
    `);

    expect(messages).toHaveLength(6);
    expect(messages.every((message) => message.ruleId === 'vamos/zustand-stable-selectors')).toBe(
      true,
    );
  });
});
