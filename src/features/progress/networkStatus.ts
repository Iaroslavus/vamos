export function isReachable(state: {
  isConnected?: boolean | null;
  isInternetReachable?: boolean | null;
}): boolean {
  return state.isConnected === true && state.isInternetReachable !== false;
}
