import { isValidEmail, isValidOtp, normalizeEmail, normalizeOtp, OTP_LENGTH } from './email';

describe('email', () => {
  it('normalizes surrounding space and case', () => {
    expect(normalizeEmail('  Ada@Example.com ')).toBe('ada@example.com');
  });

  it('accepts a normal address and rejects empty or incomplete ones', () => {
    expect(isValidEmail('ada@example.com')).toBe(true);
    expect(isValidEmail('  ada@example.com  ')).toBe(true);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('ada')).toBe(false);
    expect(isValidEmail('ada@example')).toBe(false);
    expect(isValidEmail('ada example.com')).toBe(false);
  });

  it('accepts a 6-digit OTP and strips spaces', () => {
    expect(OTP_LENGTH).toBe(6);
    expect(normalizeOtp('12 34 56')).toBe('123456');
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('12 34 56')).toBe(true);
    expect(isValidOtp('12345')).toBe(false);
    expect(isValidOtp('1234567')).toBe(false);
    expect(isValidOtp('12345a')).toBe(false);
  });
});
