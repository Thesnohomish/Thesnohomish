type MpesaConfig = {
  key: string; secret: string; shortcode: string; passkey: string;
  callback: string; environment: 'sandbox' | 'production';
  transactionType: 'CustomerPayBillOnline' | 'CustomerBuyGoodsOnline'; partyB: string;
};

export function getMpesaReadiness() {
  const missing = ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY']
    .filter(name => !process.env[name]?.trim());
  const environment = process.env.MPESA_ENVIRONMENT?.trim() || 'sandbox';
  const transactionType = process.env.MPESA_TRANSACTION_TYPE?.trim() || 'CustomerPayBillOnline';
  const callback = process.env.MPESA_CALLBACK_URL?.trim() || 'https://www.thesnohomish.com/api/mpesa/callback';
  const invalid: string[] = [];
  if (!['sandbox', 'production'].includes(environment)) invalid.push('MPESA_ENVIRONMENT');
  if (!['CustomerPayBillOnline', 'CustomerBuyGoodsOnline'].includes(transactionType)) invalid.push('MPESA_TRANSACTION_TYPE');
  if (process.env.MPESA_SHORTCODE && !/^\d{5,7}$/.test(process.env.MPESA_SHORTCODE.trim())) invalid.push('MPESA_SHORTCODE');
  const partyB = process.env.MPESA_PARTY_B?.trim() || process.env.MPESA_TILL_NUMBER?.trim() || process.env.MPESA_SHORTCODE?.trim();
  if (partyB && !/^\d{5,7}$/.test(partyB)) invalid.push('MPESA_PARTY_B');
  try { if (new URL(callback).protocol !== 'https:') invalid.push('MPESA_CALLBACK_URL'); }
  catch { invalid.push('MPESA_CALLBACK_URL'); }
  return { configured: !missing.length && !invalid.length, environment, transactionType, missing, invalid };
}

export function assertMpesaConfigured() {
  const readiness = getMpesaReadiness();
  if (!readiness.configured) {
    console.error('[M-Pesa configuration]', { missing: readiness.missing, invalid: readiness.invalid });
    throw new Error('M-Pesa is not available yet. Please contact the store or choose another payment method.');
  }
}

function config(): MpesaConfig {
  assertMpesaConfigured();
  const shortcode = process.env.MPESA_SHORTCODE!.trim();
  return {
    key: process.env.MPESA_CONSUMER_KEY!.trim(), secret: process.env.MPESA_CONSUMER_SECRET!.trim(),
    shortcode, passkey: process.env.MPESA_PASSKEY!.trim(),
    callback: process.env.MPESA_CALLBACK_URL?.trim() || 'https://www.thesnohomish.com/api/mpesa/callback',
    environment: (process.env.MPESA_ENVIRONMENT?.trim() || 'sandbox') as MpesaConfig['environment'],
    transactionType: (process.env.MPESA_TRANSACTION_TYPE?.trim() || 'CustomerPayBillOnline') as MpesaConfig['transactionType'],
    partyB: process.env.MPESA_PARTY_B?.trim() || process.env.MPESA_TILL_NUMBER?.trim() || shortcode,
  };
}

export function kenyaPhone(value: string) {
  const digits = String(value).replace(/\D/g, '');
  const local = digits.startsWith('0') ? digits.slice(1) : digits.startsWith('254') ? digits.slice(3) : digits;
  if (!/^[17]\d{8}$/.test(local)) throw new Error('Enter a valid Kenyan M-Pesa number, for example 0712345678 or 0112345678.');
  return `254${local}`;
}

function credentials(c: MpesaConfig) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const value = (type: string) => parts.find(part => part.type === type)!.value;
  const timestamp = ['year', 'month', 'day', 'hour', 'minute', 'second'].map(value).join('');
  return { BusinessShortCode: c.shortcode, Timestamp: timestamp, Password: Buffer.from(`${c.shortcode}${c.passkey}${timestamp}`).toString('base64') };
}

async function accessToken(c: MpesaConfig, root: string) {
  const response = await fetch(`${root}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${Buffer.from(`${c.key}:${c.secret}`).toString('base64')}` },
    cache: 'no-store', signal: AbortSignal.timeout(12000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.access_token !== 'string' || !result.access_token) {
    console.error('[M-Pesa authentication]', { status: response.status, code: result.errorCode });
    throw new Error('M-Pesa authentication failed. Please contact the store.');
  }
  return result.access_token as string;
}

async function darajaRequest(path: string, body: (c: MpesaConfig) => Record<string, unknown>) {
  const c = config(), root = c.environment === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
  const token = await accessToken(c, root);
  const response = await fetch(`${root}${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body(c)), cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || String(result.ResponseCode) !== '0') {
    console.error('[M-Pesa request]', { path, status: response.status, code: result.errorCode || result.ResponseCode });
    throw new Error('M-Pesa could not process this request. Please try again or contact the store.');
  }
  return result;
}

export async function requestStkPush({ amount, phone, accountReference, description }: { amount: number; phone: string; accountReference: string; description: string }) {
  if (!Number.isSafeInteger(amount) || amount < 1) throw new Error('M-Pesa payments require a positive whole-shilling order total.');
  const number = kenyaPhone(phone);
  const result = await darajaRequest('/mpesa/stkpush/v1/processrequest', c => ({
    ...credentials(c), TransactionType: c.transactionType, Amount: amount, PartyA: number,
    PartyB: c.partyB, PhoneNumber: number, CallBackURL: c.callback,
    AccountReference: accountReference.slice(0, 12), TransactionDesc: description.slice(0, 13),
  }));
  if (!result.MerchantRequestID || !result.CheckoutRequestID) throw new Error('M-Pesa returned an incomplete payment reference. Please contact the store before retrying.');
  return { merchantRequestId: String(result.MerchantRequestID), checkoutRequestId: String(result.CheckoutRequestID) };
}

export async function queryStkPush(checkoutRequestId: string) {
  const result = await darajaRequest('/mpesa/stkpushquery/v1/query', c => ({
    ...credentials(c), CheckoutRequestID: checkoutRequestId,
  }));
  if (result.ResultCode == null) throw new Error('M-Pesa has not confirmed the payment result yet.');
  return { resultCode: String(result.ResultCode), resultDescription: String(result.ResultDesc || '') };
}

export function mpesaTransactionDate(value: unknown): string | null {
  const date = String(value ?? '');
  if (!/^\d{14}$/.test(date)) return null;
  const iso = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T${date.slice(8,10)}:${date.slice(10,12)}:${date.slice(12,14)}+03:00`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
