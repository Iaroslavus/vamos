import type { GatewayError } from './types';

export type AuthErrorCode =
  | 'invalid_email'
  | 'invalid_code'
  | 'email_taken'
  | 'email_not_found'
  | 'code_expired'
  | 'rate_limit'
  | 'anonymous_disabled'
  | 'network'
  | 'unknown';

export function mapAuthError(error: GatewayError | null | undefined): AuthErrorCode {
  if (!error) return 'unknown';

  switch (error.code) {
    case 'email_exists':
    case 'user_already_exists':
    case 'email_conflict_identity_not_deletable':
      return 'email_taken';
    case 'otp_expired':
    case 'flow_state_expired':
      return 'code_expired';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'rate_limit';
    case 'anonymous_provider_disabled':
      return 'anonymous_disabled';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'invalid_email';
    case 'user_not_found':
      return 'email_not_found';
    default:
      break;
  }

  const message = error.message.toLowerCase();
  if (message.includes('signups not allowed')) return 'email_not_found';
  if (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('timeout')
  ) {
    return 'network';
  }

  return 'unknown';
}
