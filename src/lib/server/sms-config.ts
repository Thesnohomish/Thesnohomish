const DEFAULT_ENDPOINT = 'https://isms.celcomafrica.com/api/services/sendsms';

export function getSmsConfig() {
  const apiKey = process.env.CELCOM_SMS_API_KEY?.trim();
  const partnerId = process.env.CELCOM_SMS_PARTNER_ID?.trim();
  const shortcode = process.env.CELCOM_SMS_SHORTCODE?.trim();
  const endpoint = process.env.CELCOM_SMS_ENDPOINT?.trim() || DEFAULT_ENDPOINT;
  const missing = [
    !apiKey ? 'CELCOM_SMS_API_KEY' : null,
    !partnerId ? 'CELCOM_SMS_PARTNER_ID' : null,
    !shortcode ? 'CELCOM_SMS_SHORTCODE' : null,
  ].filter((value): value is string => Boolean(value));

  return { apiKey, partnerId, shortcode, endpoint, configured: missing.length === 0, missing };
}

export function safeSmsStatus() {
  const config = getSmsConfig();
  return {
    configured: config.configured,
    provider: 'celcom-africa',
    shortcode: config.shortcode || null,
    missing: config.missing,
  };
}
