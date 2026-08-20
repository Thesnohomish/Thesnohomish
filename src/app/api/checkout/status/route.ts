import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/server/supabase-admin';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('snohomish_order_token')?.value;
  if (!token) return NextResponse.json({ found: false }, { status: 404 });

  const db = getAdminSupabase();
  const { data: order, error } = await db
    .from('orders')
    .select('order_number,status,payment_status,payment_method')
    .eq('checkout_token', token)
    .maybeSingle();

  if (error || !order) return NextResponse.json({ found: false }, { status: 404 });

  const terminalFailure = ['failed', 'cancelled', 'timed_out'].includes(String(order.payment_status));
  const ready = order.payment_method === 'mpesa'
    ? order.payment_status === 'paid' && order.status === 'paid'
    : !terminalFailure && order.status !== 'awaiting_payment';

  return NextResponse.json({
    found: true,
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
    ready,
    terminalFailure,
  });
}
