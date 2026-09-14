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

async function deliverAndLog(order: SmsOrder, event: OrderSmsEvent, recipient: string, attemptsBefore = 0) {
  const result = await deliverSms(recipient, orderSmsText(order, event));
  const details = {
    orderId: order.id,
    event,
    status: result.status,
    attempts: attemptsBefore + result.attempts,
    providerReference: result.reference || null,
    error: result.error || null,
  };
  if (result.status === 'sent') console.info('[Order SMS] delivered', details);
  else console.error('[Order SMS] failed', details);
  return { result, details };
}

export async function sendOrderSms(db: SupabaseClient, order: SmsOrder, event: OrderSmsEvent) {
  const recipient = order.customerPhone?.trim();
  if (!recipient) {
    console.warn('[Order SMS] skipped: customer phone missing', { orderId: order.id, event });
    return { status: 'skipped' as const, reason: 'No recipient' };
  }

  const eventKey = `order_${event}`;
  const { data: existing, error: lookupError } = await db.from('notification_deliveries').select('id,status,attempts').eq('order_id', order.id).eq('channel', 'sms').eq('recipient', recipient).eq('event_key', eventKey).maybeSingle();
  if (lookupError) {
    console.warn('[Order SMS] delivery log lookup unavailable; sending directly', { orderId: order.id, event, code: lookupError.code, message: lookupError.message });
    return (await deliverAndLog(order, event, recipient)).result;
  }
  if (existing?.status === 'sent' || existing?.status === 'pending') {
    console.info('[Order SMS] duplicate skipped', { orderId: order.id, event, status: existing.status });
    return { status: 'skipped' as const, reason: `Already ${existing.status}` };
  }
  if (existing && Number(existing.attempts) >= MAX_ATTEMPTS)
    return { status: 'skipped' as const, reason: 'Retry limit reached' };

  let deliveryId = existing?.id as string | undefined;
  if (deliveryId) {
    const { error } = await db.from('notification_deliveries').update({ status: 'pending', error_message: null }).eq('id', deliveryId);
    if (error) {
      console.warn('[Order SMS] delivery log update unavailable; sending directly', { orderId: order.id, event, code: error.code, message: error.message });
      return (await deliverAndLog(order, event, recipient, Number(existing?.attempts || 0))).result;
    }
  } else {
    const { data: claimed, error } = await db.from('notification_deliveries').insert({ order_id: order.id, channel: 'sms', recipient, event_key: eventKey, status: 'pending', attempts: 0 }).select('id').single();
    if (error?.code === '23505') return { status: 'skipped' as const, reason: 'Another request claimed this SMS' };
    if (error || !claimed) {
      console.warn('[Order SMS] delivery log claim unavailable; sending directly', { orderId: order.id, event, code: error?.code || null, message: error?.message || 'No delivery row returned' });
      return (await deliverAndLog(order, event, recipient)).result;
    }
    deliveryId = claimed.id;
  }

  const { result, details } = await deliverAndLog(order, event, recipient, Number(existing?.attempts || 0));
  await db.from('notification_deliveries').update({ status: result.status, attempts: details.attempts, provider_message_id: result.reference || null, error_message: result.error || null, sent_at: result.status === 'sent' ? new Date().toISOString() : null }).eq('id', deliveryId);
  return result;
}
