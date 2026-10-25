import { mapAuthError } from './errors';

describe('mapAuthError', () => {
  it('maps known auth codes to stable UI codes', () => {
    expect(mapAuthError({ message: 'taken', code: 'email_exists' })).toBe('email_taken');
    expect(mapAuthError({ message: 'taken', code: 'user_already_exists' })).toBe('email_taken');
    expect(mapAuthError({ message: 'expired', code: 'otp_expired' })).toBe('code_expired');
    expect(mapAuthError({ message: 'slow', code: 'over_email_send_rate_limit' })).toBe(
      'rate_limit',
    );
    expect(mapAuthError({ message: 'off', code: 'anonymous_provider_disabled' })).toBe(
      'anonymous_disabled',
    );
    expect(mapAuthError({ message: 'bad', code: 'email_address_invalid' })).toBe('invalid_email');
    expect(mapAuthError({ message: 'missing', code: 'user_not_found' })).toBe('email_not_found');
    expect(mapAuthError({ message: 'Signups not allowed for otp' })).toBe('email_not_found');
  });

  it('treats fetch failures as a network error and everything else as unknown', () => {
    expect(mapAuthError({ message: 'Network request failed' })).toBe('network');
    expect(mapAuthError({ message: 'Failed to fetch' })).toBe('network');
    expect(mapAuthError(null)).toBe('unknown');
    expect(mapAuthError({ message: 'something else', code: 'bad_jwt' })).toBe('unknown');
  });
});
