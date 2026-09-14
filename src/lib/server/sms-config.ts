const DEFAULT_ENDPOINT = 'https://isms.celcomafrica.com/api/services/sendsms';

function firstEnvironmentValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function smsEndpoint(value?: string) {
  if (!value) return DEFAULT_ENDPOINT;
  const normalized = value.replace(/\/$/, '');
  return normalized.endsWith('/api/services/sendsms')
    ? normalized
    : `${normalized}/api/services/sendsms`;
}

export function getSmsConfig() {
  const apiKey = firstEnvironmentValue(
    'CELCOM_SMS_API_KEY',
    'CELCOM_API_KEY',
    'ApiKey',
    'APIKEY',
    'API_KEY',
    'API Key',
    'Api Key',
    'Api key',
    'apikey',
  );
  const partnerId = firstEnvironmentValue(
    'CELCOM_SMS_PARTNER_ID',
    'PartnerID',
    'PARTNER_ID',
  );
  const shortcode = firstEnvironmentValue(
    'CELCOM_SMS_SHORTCODE',
    'Shortcode',
    'SHORTCODE',
  );
  const endpoint = smsEndpoint(
    firstEnvironmentValue('CELCOM_SMS_ENDPOINT', 'Url', 'URL'),
  );
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
