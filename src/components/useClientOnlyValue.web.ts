import { useSyncExternalStore } from 'react';

// `useSyncExternalStore` with a client snapshot avoids hydration mismatch
// without calling setState inside an effect.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return useSyncExternalStore(
    () => () => {},
    () => client as S | C,
    () => server as S | C,
  );
}
