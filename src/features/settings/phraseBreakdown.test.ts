import {
  PHRASE_BREAKDOWN_OPENS,
  phraseBreakdownFromSwitch,
  rememberOpen,
  rememberSkip,
} from './phraseBreakdown';

const closed = { show: false, streak: 0 };

describe('phrase breakdown memory', () => {
  it('turns the setting on after three opens in a row', () => {
    const once = rememberOpen(closed);
    const twice = rememberOpen(once);
    const third = rememberOpen(twice);

    expect(PHRASE_BREAKDOWN_OPENS).toBe(3);
    expect(once).toEqual({ show: false, streak: 1 });
    expect(twice).toEqual({ show: false, streak: 2 });
    expect(third).toEqual({ show: true, streak: 0 });
    expect(rememberOpen(third)).toEqual({ show: true, streak: 0 });
  });

  it('starts the streak over when a card is left closed', () => {
    const once = rememberOpen(closed);
    expect(rememberSkip(once)).toEqual(closed);
    expect(rememberSkip(closed)).toEqual(closed);
    expect(rememberSkip({ show: true, streak: 0 })).toEqual({ show: true, streak: 0 });
  });

  it('clears the streak when the profile switch changes', () => {
    expect(phraseBreakdownFromSwitch(true)).toEqual({ show: true, streak: 0 });
    expect(phraseBreakdownFromSwitch(false)).toEqual(closed);
  });
});
