import NetInfo from '@react-native-community/netinfo';

import { isReachable } from './networkStatus';
import type { NetworkMonitor } from './types';

export function createNetInfoMonitor(
  netInfo: Pick<typeof NetInfo, 'fetch' | 'addEventListener'> = NetInfo,
): NetworkMonitor {
  return {
    async isOnline() {
      return isReachable(await netInfo.fetch());
    },
    subscribe(listener) {
      return netInfo.addEventListener((state) => {
        listener(isReachable(state));
      });
    },
  };
}
