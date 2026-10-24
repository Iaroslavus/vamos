import AsyncStorage from '@react-native-async-storage/async-storage';
import { waitFor } from '@testing-library/react-native';

import { useFavoritesStore } from './favoritesStore';

describe('useFavoritesStore', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useFavoritesStore.setState({ itemIds: [] });
  });

  it('saves an item into Избранное once', () => {
    const store = useFavoritesStore.getState();
    store.add('hola.buenos_dias');
    store.add('hola.buenos_dias');
    store.add('hola.gracias');

    const next = useFavoritesStore.getState();
    expect(next.itemIds).toEqual(['hola.buenos_dias', 'hola.gracias']);
    expect(next.has('hola.buenos_dias')).toBe(true);
    expect(next.has('hola.adios')).toBe(false);
  });

  it('saves every new id and skips the ones already kept', () => {
    useFavoritesStore.getState().add('hola.hola');
    useFavoritesStore.getState().addAll(['hola.hola', 'hola.gracias', 'hola.adios']);

    expect(useFavoritesStore.getState().itemIds).toEqual([
      'hola.hola',
      'hola.gracias',
      'hola.adios',
    ]);
  });

  it('persists saved ids locally', async () => {
    useFavoritesStore.getState().add('hola.hola');

    await waitFor(async () => {
      const raw = await AsyncStorage.getItem('vamos-favorites');
      expect(raw).toContain('hola.hola');
    });
  });
});
