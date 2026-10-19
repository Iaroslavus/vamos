import NetInfo from '@react-native-community/netinfo';
import { QueryClient, onlineManager } from '@tanstack/react-query';

import { isReachable } from '@/features/progress/networkStatus';

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(isReachable(state));
  });
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});
