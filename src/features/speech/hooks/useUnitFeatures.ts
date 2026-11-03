import { useEffect, useState } from 'react';

import { loadUnitFeatures } from '../acoustic/load';
import type { UnitFeatures } from '../acoustic/reference';

/** The unit's reference, or null while it is missing or still loading. */
export function useUnitFeatures(path: string | null | undefined): UnitFeatures | null {
  const [loaded, setLoaded] = useState<{ path: string; features: UnitFeatures } | null>(null);

  useEffect(() => {
    if (!path) return undefined;
    let cancelled = false;
    void loadUnitFeatures(path).then((next) => {
      if (!cancelled && next) setLoaded({ path, features: next });
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!path || loaded?.path !== path) return null;
  return loaded.features;
}
