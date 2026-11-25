import { cheatsheetRedirectTarget, phrasebookTarget } from './route';

describe('phrasebookTarget', () => {
  it('opens a topic in Розмовник', () => {
    expect(phrasebookTarget({ topicId: 'a1.hola', source: 'path' })).toEqual({
      pathname: '/vocab',
      params: { tab: 'phrasebook', source: 'path', topicId: 'a1.hola' },
    });
  });

  it('focuses phrase search when the map search is opened', () => {
    expect(phrasebookTarget({ focus: true, source: 'search' })).toEqual({
      pathname: '/vocab',
      params: { tab: 'phrasebook', source: 'search', focus: '1' },
    });
  });
});

describe('old cheatsheet route', () => {
  it('redirects a topic link to the same topic in Розмовник', () => {
    expect(cheatsheetRedirectTarget({ topicId: 'a1.cafe', source: 'path' })).toEqual({
      pathname: '/vocab',
      params: { tab: 'phrasebook', source: 'path', topicId: 'a1.cafe' },
    });
  });

  it('redirects the old search link into a focused phrase search', () => {
    expect(cheatsheetRedirectTarget({ source: 'search', focus: '1' })).toEqual({
      pathname: '/vocab',
      params: { tab: 'phrasebook', source: 'search', focus: '1' },
    });
  });

  it('still focuses search when an old link omitted the focus flag', () => {
    expect(cheatsheetRedirectTarget({ source: 'search' }).params.focus).toBe('1');
  });
});
