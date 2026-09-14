import { NextRequest, NextResponse } from 'next/server';
import { deliverSms } from '@/lib/server/celcom-sms';
import { safeSmsStatus } from '@/lib/server/sms-config';
import { getAdminSupabase } from '@/lib/server/supabase-admin';

async function isAdministrator(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return false;
  const db = getAdminSupabase();
  const { data } = await db.auth.getUser(token);
  if (!data.user) return false;
  const { data: admin } = await db.from('admin_users').select('user_id').eq('user_id', data.user.id).eq('is_active', true).maybeSingle();
  return Boolean(admin);
}

export async function GET(request: NextRequest) {
  if (!(await isAdministrator(request))) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  return NextResponse.json(safeSmsStatus());
}

export async function POST(request: NextRequest) {
  if (!(await isAdministrator(request))) return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
  const body = await request.json() as { phone?: string };
  if (!body.phone?.trim()) return NextResponse.json({ error: 'Enter the phone number that should receive the test.' }, { status: 400 });
  const result = await deliverSms(body.phone, 'The Snohomish SMS test is successful. Order notifications are ready.');
  return NextResponse.json(result, { status: result.status === 'sent' ? 200 : 502 });
}
