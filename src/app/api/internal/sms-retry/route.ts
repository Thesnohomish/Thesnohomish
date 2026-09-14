import { NextRequest, NextResponse } from 'next/server';
import { deliverSms } from '@/lib/server/celcom-sms';
import { getSmsConfig } from '@/lib/server/sms-config';
import { getAdminSupabase } from '@/lib/server/supabase-admin';

const RETRY_ORDER_ID = '5d8c8736-fb7e-4af4-aae7-a37455ec8e96';

export async function POST(request: NextRequest) {
  const config = getSmsConfig();
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!config.apiKey || supplied !== config.apiKey)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getAdminSupabase();
  const { data: order, error } = await db
    .from('orders')
    .select('id,order_number,customer_phone,total')
    .eq('id', RETRY_ORDER_ID)
    .single();
  if (error || !order?.customer_phone)
    return NextResponse.json({ error: error?.message || 'Order phone missing' }, { status: 404 });

  const result = await deliverSms(
    order.customer_phone,
    `The Snohomish: We have received order ${order.order_number}. Total KES ${Number(order.total).toLocaleString('en-KE')}. We will update you when it is out for delivery.`,
  );
  console.info('[Order SMS manual retry]', { orderId: order.id, status: result.status, reference: result.reference || null, error: result.error || null });
  return NextResponse.json(result, { status: result.status === 'sent' ? 200 : 502 });
}
