import { usePathProgressStore } from './progressStore';

describe('usePathProgressStore', () => {
  beforeEach(() => {
    usePathProgressStore.getState().resetProgress();
  });

  it('marks lessons complete and accumulates xp', () => {
    const store = usePathProgressStore.getState();
    store.markComplete('a1-u01-l01', 30);
    store.markComplete('a1-u01-l02', 20);

    const next = usePathProgressStore.getState();
    expect(next.completedIds).toEqual(['a1-u01-l01', 'a1-u01-l02']);
    expect(next.totalXp).toBe(50);
    expect(next.isComplete('a1-u01-l01')).toBe(true);
    expect(next.isComplete('a1-u01-l03')).toBe(false);
  });

  it('does not duplicate completed ids', () => {
    const store = usePathProgressStore.getState();
    store.markComplete('a1-u01-l01', 10);
    store.markComplete('a1-u01-l01', 5);

    const next = usePathProgressStore.getState();
    expect(next.completedIds).toEqual(['a1-u01-l01']);
    expect(next.totalXp).toBe(15);
  });
});
