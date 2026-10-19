/** Supabase local config (`supabase/config.toml`) sends a 6-digit email OTP. */
export const OTP_LENGTH = 6;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(normalizeEmail(value));
}

export function normalizeOtp(value: string): string {
  return value.replace(/\s/g, '');
}

export function isValidOtp(value: string): boolean {
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(normalizeOtp(value));
}
