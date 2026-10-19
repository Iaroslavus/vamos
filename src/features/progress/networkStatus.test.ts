import { isReachable } from './networkStatus';

describe('isReachable', () => {
  it('treats a connected device with an unknown route as online', () => {
    expect(isReachable({ isConnected: true, isInternetReachable: null })).toBe(true);
  });

  it('stays offline without a connection or a route', () => {
    expect(isReachable({ isConnected: false, isInternetReachable: true })).toBe(false);
    expect(isReachable({ isConnected: true, isInternetReachable: false })).toBe(false);
  });
});
