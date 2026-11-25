import { gradeAnswer } from './grading';
import { assembledPhrase, isProperName, phraseTileLabels, tileLabel } from './tiles';

describe('phrase tiles', () => {
  it('drops case and punctuation, and keeps a proper name', () => {
    expect(phraseTileLabels(['¿Cómo', 'te', 'llamas?'])).toEqual(['cómo', 'te', 'llamas']);
    expect(phraseTileLabels(['Soy', 'Ana'])).toEqual(['soy', 'Ana']);
    expect(isProperName('Ana', 1)).toBe(true);
    expect(isProperName('Buenos', 0)).toBe(false);
    expect(tileLabel('Bien,', false)).toBe('bien');
  });

  it('restores capitals and inverted marks only on the assembled phrase', () => {
    expect(assembledPhrase(['cómo', 'te', 'llamas'], '¿Cómo te llamas?')).toBe('¿Cómo te llamas?');
    expect(assembledPhrase(['cómo'], '¿Cómo te llamas?')).toBe('¿Cómo');
    expect(assembledPhrase(['te', 'cómo'], '¿Cómo te llamas?')).toBe('te cómo');
  });

  it('grades the same with or without case and marks', () => {
    const built = phraseTileLabels(['¿Cómo', 'te', 'llamas?']).join(' ');
    expect(gradeAnswer({ userAnswer: built, answer: '¿Cómo te llamas?' }).status).toBe('correct');
    expect(gradeAnswer({ userAnswer: 'HOLA!', answer: '¡Hola!' }).status).toBe('correct');
  });
});
