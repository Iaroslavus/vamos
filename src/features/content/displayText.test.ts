import { displayLine, displayText } from './displayText';

describe('displayText', () => {
  it('raises the first letter of a word or phrase', () => {
    expect(displayText('hola')).toBe('Hola');
    expect(displayText('buenos días')).toBe('Buenos días');
    expect(displayText('дякую')).toBe('Дякую');
    expect(displayText('привіт')).toBe('Привіт');
    expect(displayText('hello')).toBe('Hello');
  });

  it('raises the letter after Spanish opening marks', () => {
    expect(displayText('¿cómo te llamas?')).toBe('¿Cómo te llamas?');
    expect(displayText('¡hola!')).toBe('¡Hola!');
    expect(displayText('¿¡hola!')).toBe('¿¡Hola!');
    expect(displayText('¿ cómo estás?')).toBe('¿ Cómo estás?');
  });

  it('leaves a phrase that already starts with a capital', () => {
    expect(displayText('Hola')).toBe('Hola');
    expect(displayText('¿Cómo te llamas?')).toBe('¿Cómo te llamas?');
    expect(displayText('Un billete')).toBe('Un billete');
    expect(displayText('Дякую')).toBe('Дякую');
  });

  it('keeps letters that are not the first one', () => {
    expect(displayText('buenos días')).not.toBe('Buenos Días');
    expect(displayText('доброе утро')).toBe('Доброе утро');
  });

  it('raises Ukrainian and accented letters', () => {
    expect(displayText('іспанія')).toBe('Іспанія');
    expect(displayText('їжак')).toBe('Їжак');
    expect(displayText('ґанок')).toBe('Ґанок');
    expect(displayText('ávila')).toBe('Ávila');
    expect(displayText('ñandú')).toBe('Ñandú');
  });

  it('returns text with no letter unchanged', () => {
    expect(displayText('')).toBe('');
    expect(displayText('¿?')).toBe('¿?');
    expect(displayText('123')).toBe('123');
    expect(displayText('  ')).toBe('  ');
  });
});

describe('displayLine', () => {
  it('raises each phrase in a pair and keeps a miss mark', () => {
    expect(displayLine('buenas tardes — добрий день')).toBe('Buenas tardes — Добрий день');
    expect(displayLine('hola — привіт ✗')).toBe('Hola — Привіт ✗');
    expect(displayLine('hola')).toBe('Hola');
  });
});
