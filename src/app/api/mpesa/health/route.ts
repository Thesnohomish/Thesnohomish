import { NextResponse } from 'next/server';
import { getMpesaReadiness } from '@/lib/server/mpesa';
import { getAdminSupabase } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const configuration = getMpesaReadiness();
  const missing = [...configuration.missing];
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  let databaseReady = false;
  if (!missing.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    try {
      const db = getAdminSupabase();
      const checks = await Promise.all([
        db.from('orders').select('id,checkout_token,order_number,payment_status,status').limit(0),
        db.from('payments').select('id,order_id,status,amount,phone_number,merchant_request_id,checkout_request_id,receipt_number,transaction_at,raw_callback').limit(0),
      ]);
      databaseReady = checks.every(check => !check.error);
      if (!databaseReady) console.error('[M-Pesa database readiness]', checks.map(check => check.error?.message).filter(Boolean));
    } catch (error) { console.error('[M-Pesa database readiness]', error); }
  }
  const ready = configuration.configured && !missing.length && databaseReady;
  return NextResponse.json({
    ready, environment: configuration.environment, transactionType: configuration.transactionType,
    missing, invalid: configuration.invalid, databaseReady,
    // Readiness does not initiate a payment or authenticate against Daraja.
    credentialsVerified: false,
  }, { status: ready ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
