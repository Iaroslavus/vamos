import { insertAtSelection } from './textInput';

describe('insertAtSelection', () => {
  it('inserts at the caret', () => {
    expect(insertAtSelection('caf', { start: 3, end: 3 }, 'é')).toEqual({
      value: 'café',
      selection: { start: 4, end: 4 },
    });
  });

  it('replaces a selection range', () => {
    expect(insertAtSelection('hola', { start: 1, end: 3 }, 'ñ')).toEqual({
      value: 'hña',
      selection: { start: 2, end: 2 },
    });
  });
});
