import { track } from './analytics';

describe('analytics', () => {
  it('prints the event in dev and keeps the props', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    track('cheatsheet_search', { query_length: 8, results: 1 });
    expect(spy).toHaveBeenCalledWith('[analytics] cheatsheet_search', {
      query_length: 8,
      results: 1,
    });
    spy.mockRestore();
  });
});
