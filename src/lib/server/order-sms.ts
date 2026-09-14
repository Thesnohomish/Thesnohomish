import type { SupabaseClient } from '@supabase/supabase-js';
import { deliverSms } from '@/lib/server/celcom-sms';

const MAX_ATTEMPTS = 3;
export type OrderSmsEvent = 'placed' | 'dispatched';
export type SmsOrder = {
  id: string;
  orderNumber: string;
  customerPhone: string;
  total: number;
  riderName?: string | null;
  riderPhone?: string | null;
};

export function orderSmsText(order: SmsOrder, event: OrderSmsEvent) {
  if (event === 'dispatched')
    return `The Snohomish: Order ${order.orderNumber} is out for delivery. Rider: ${order.riderName || 'assigned rider'}, ${order.riderPhone || 'contact the store'}. Thank you.`;
  return `The Snohomish: We have received order ${order.orderNumber}. Total KES ${Number(order.total).toLocaleString('en-KE')}. We will update you when it is out for delivery.`;
}

export async function sendOrderSms(db: SupabaseClient, order: SmsOrder, event: OrderSmsEvent) {
  const recipient = order.customerPhone?.trim();
  if (!recipient) return { status: 'skipped' as const, reason: 'No recipient' };
  const eventKey = `order_${event}`;
  const { data: existing, error: lookupError } = await db.from('notification_deliveries').select('id,status,attempts').eq('order_id', order.id).eq('channel', 'sms').eq('recipient', recipient).eq('event_key', eventKey).maybeSingle();
  if (lookupError) {
    console.warn('[Order SMS] delivery log unavailable; sending without database claim', { orderId: order.id, event, code: lookupError.code });
    return deliverSms(recipient, orderSmsText(order, event));
  }
  if (existing?.status === 'sent' || existing?.status === 'pending')
    return { status: 'skipped' as const, reason: `Already ${existing.status}` };
  if (existing && Number(existing.attempts) >= MAX_ATTEMPTS)
    return { status: 'skipped' as const, reason: 'Retry limit reached' };

  let deliveryId = existing?.id as string | undefined;
  if (deliveryId) await db.from('notification_deliveries').update({ status: 'pending', error_message: null }).eq('id', deliveryId);
  else {
    const { data: claimed, error } = await db.from('notification_deliveries').insert({ order_id: order.id, channel: 'sms', recipient, event_key: eventKey, status: 'pending', attempts: 0 }).select('id').single();
    if (error || !claimed) return { status: 'skipped' as const, reason: 'Another request claimed this SMS' };
    deliveryId = claimed.id;
  }

  const result = await deliverSms(recipient, orderSmsText(order, event));
  const attempts = Number(existing?.attempts || 0) + result.attempts;
  await db.from('notification_deliveries').update({ status: result.status, attempts, provider_message_id: result.reference || null, error_message: result.error || null, sent_at: result.status === 'sent' ? new Date().toISOString() : null }).eq('id', deliveryId);
  const details = { orderId: order.id, event, status: result.status, attempts, providerReference: result.reference || null, error: result.error || null };
  if (result.status === 'sent') console.info('[Order SMS] delivered', details);
  else console.error('[Order SMS] failed', details);
  return result;
}
