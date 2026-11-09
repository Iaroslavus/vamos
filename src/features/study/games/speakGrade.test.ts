import { gradeSpokenPass } from './speakGrade';

describe('spoken pass', () => {
  it('treats the first take as a clean pass and a later take as a miss along the way', () => {
    expect(gradeSpokenPass(1)).toBe('correct_first');
    expect(gradeSpokenPass(0)).toBe('correct_first');
    expect(gradeSpokenPass(2)).toBe('correct_after_error');
  });
});
