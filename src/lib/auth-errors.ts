export function customerAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/unsupported provider|provider is not enabled/i.test(message)) {
    return 'Google sign-in is temporarily unavailable. The store administrator needs to enable Google in Supabase Authentication.';
  }
  return message || 'Google sign-in could not be started.';
}
