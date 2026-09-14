import { getSmsConfig } from '@/lib/server/sms-config';

export type SmsDeliveryResult = {
  status: 'sent' | 'failed' | 'not_configured';
  attempts: number;
  reference?: string;
  error?: string;
};

export function kenyaSmsPhone(value: string) {
  const input = value.trim();
  const digits = input.replace(/\D/g, '');

  // Kenyan local mobile formats: 07XXXXXXXX and 01XXXXXXXX.
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  // Kenyan mobile without the local zero.
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  // International format beginning with 00.
  const international = digits.startsWith('00') ? digits.slice(2) : digits;
  // E.164 permits a country code followed by up to 14 more digits.
  if (/^[1-9]\d{7,14}$/.test(international)) return international;

  throw new Error('Enter a valid phone number beginning with +country code, 00country code, 07, or 01.');
}

function responseRecord(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};
  const root = payload as Record<string, unknown>;
  const responses = root.responses;
  if (Array.isArray(responses) && responses[0] && typeof responses[0] === 'object')
    return responses[0] as Record<string, unknown>;
  return root;
}

export async function deliverSms(recipient: string, message: string): Promise<SmsDeliveryResult> {
  const config = getSmsConfig();
  if (!config.configured || !config.apiKey || !config.partnerId || !config.shortcode) {
    return { status: 'not_configured', attempts: 0, error: `Missing ${config.missing.join(', ')}` };
  }

  let mobile: string;
  try {
    mobile = kenyaSmsPhone(recipient);
  } catch (error) {
    return { status: 'failed', attempts: 0, error: error instanceof Error ? error.message : 'Invalid phone number' };
  }

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        apikey: config.apiKey,
        partnerID: config.partnerId,
        message,
        shortcode: config.shortcode,
        mobile,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await response.text();
    let payload: unknown = raw;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { /* retain provider text */ }
    const item = responseRecord(payload);
    const providerCode = String(item['response-code'] ?? item.responseCode ?? item.code ?? '');
    const reference = String(item.messageid ?? item.messageId ?? item.id ?? '').trim() || undefined;
    const description = String(item['response-description'] ?? item.responseDescription ?? item.message ?? raw).trim();
    const accepted = response.ok && (!providerCode || providerCode === '200' || providerCode === '0');

    if (accepted) return { status: 'sent', attempts: 1, reference };
    return { status: 'failed', attempts: 1, reference, error: description || `Celcom returned HTTP ${response.status}` };
  } catch (error) {
    return { status: 'failed', attempts: 1, error: error instanceof Error ? error.message : 'Celcom SMS request failed' };
  }
}
