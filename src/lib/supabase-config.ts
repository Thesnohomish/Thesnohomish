export type SupabasePublicConfig = { url: string; publicKey: string };

declare global {
  interface Window { __SNOHOMISH_SUPABASE__?: SupabasePublicConfig }
}

/** Public Supabase configuration shared by server rendering, middleware and the browser. */
export function getSupabaseConfig(): SupabasePublicConfig {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
    publicKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      || process.env.SUPABASE_PUBLISHABLE_KEY
      || process.env.SUPABASE_ANON_KEY
      || '',
  };
}

export function getBrowserSupabaseConfig(): SupabasePublicConfig {
  if (typeof window !== 'undefined' && window.__SNOHOMISH_SUPABASE__) return window.__SNOHOMISH_SUPABASE__;
  return getSupabaseConfig();
}

export function serializeSupabaseConfig(config = getSupabaseConfig()) {
  return JSON.stringify(config).replace(/</g, '\\u003c');
}

