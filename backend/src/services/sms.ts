// Sends text messages. Which provider is used comes from SMS_PROVIDER:
//   console  development only: prints the message in the backend terminal instead of sending it (free, no account).
//   twilio   real delivery. Needs TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM.
// In production there is no console fallback: without a real provider the API says SMS is not set up, so nobody is
// ever told a code was sent when it was not.
import { ApiError } from '../utils/http.js';
import { logger } from '../utils/logger.js';

export type SmsProvider = 'console' | 'twilio';

export function smsProvider(env: NodeJS.ProcessEnv = process.env): SmsProvider | null {
  const wanted = (env.SMS_PROVIDER || '').toLowerCase();
  if (wanted === 'twilio') return env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM ? 'twilio' : null;
  if (wanted === 'console' || (!wanted && env.NODE_ENV !== 'production')) return env.NODE_ENV === 'production' ? null : 'console';
  return null;
}

export const smsConfigured = () => smsProvider() !== null;

/** Sends one SMS. Throws an ApiError the caller can pass straight to the user when it cannot be sent. */
export async function sendSms(to: string, body: string): Promise<{ provider: SmsProvider }> {
  const provider = smsProvider();
  if (!provider) throw new ApiError(503, 'PAYMENTS_NOT_CONFIGURED', 'Text messages are not set up on this platform yet, so we cannot send a code.');

  if (provider === 'console') {
    logger.info(`[SMS to ${to}] ${body}`);
    return { provider };
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM!, Body: body }).toString(),
  });
  if (!response.ok) {
    logger.error('sms_send_failed', { status: response.status });
    throw new ApiError(502, 'INTERNAL_ERROR', 'We could not send the text message. Check the number and try again.');
  }
  return { provider };
}
