import { NextRequest, NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/server/supabase-admin';
import { sendOrderEmail, type EmailOrder, type OrderEmailEvent } from '@/lib/server/order-email';

const allowed: Record<string, string[]> = {
  pending: ['confirmed', 'rejected', 'cancelled'],
  pending_payment: ['confirmed', 'rejected', 'cancelled'],
  paid: ['confirmed', 'rejected', 'cancelled'],
  accepted: ['processing', 'out_for_delivery', 'rejected', 'cancelled'],
  confirmed: ['processing', 'out_for_delivery', 'rejected', 'cancelled'],
  processing: ['out_for_delivery', 'rejected', 'cancelled'],
  dispatched: ['paid', 'cancelled'],
  out_for_delivery: ['paid', 'cancelled'],
  delivered: [],
  rejected: [],
  cancelled: [],
};

async function administrator(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const db = getAdminSupabase();
  const { data: user } = await db.auth.getUser(token);
  if (!user.user) return null;
  const { data: admin } = await db
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.user.id)
    .eq('is_active', true)
    .maybeSingle();
  return admin ? { db, userId: user.user.id } : null;
}

// Customers receive a status email only when the order actually leaves with a rider.
// Checkout separately sends the initial `placed` email. Marking an order paid sends no email.
const emailEventForStatus: Partial<Record<string, OrderEmailEvent>> = {
  out_for_delivery: 'dispatched',
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await administrator(request);
  if (!admin)
    return NextResponse.json(
      { error: 'Administrator access required.' },
      { status: 403 },
    );

  const { id } = await params;
  const body = (await request.json()) as {
    status: string;
    note?: string;
    riderName?: string;
    riderPhone?: string;
    deliveryNote?: string;
    trackingUrl?: string;
  };

  const { data: order } = await admin.db
    .from('orders')
    .select(
      'id,status,order_number,customer_name,customer_email,customer_phone,delivery_address,payment_method,payment_status,subtotal,delivery_fee,total,rider_name,rider_phone,dispatched_at,order_items(product_name,quantity,unit_price,line_total)',
    )
    .eq('id', id)
    .maybeSingle();

  if (!order)
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

  // `paid` can still represent an older M-Pesa-paid order that has not been dispatched yet.
  // Once a dispatch timestamp exists, paid is the final fulfilment state.
  const allowedNext =
    order.status === 'paid' && order.dispatched_at ? [] : allowed[order.status] || [];
  if (!allowedNext.includes(body.status))
    return NextResponse.json(
      { error: `Cannot move a ${order.status} order to ${body.status}.` },
      { status: 400 },
    );

  const riderName = body.riderName?.trim() || order.rider_name?.trim();
  const riderPhone = body.riderPhone?.trim() || order.rider_phone?.trim();
  if (body.status === 'out_for_delivery' && (!riderName || !riderPhone))
    return NextResponse.json(
      { error: 'Add the rider name and phone number before dispatching the order.' },
      { status: 400 },
    );

  const update: Record<string, unknown> = {
    status: body.status,
    updated_at: new Date().toISOString(),
  };
  if (body.status === 'out_for_delivery') {
    Object.assign(update, {
      dispatched_at: new Date().toISOString(),
      rider_name: riderName,
      rider_phone: riderPhone,
      delivery_note: body.deliveryNote || null,
      tracking_url: body.trackingUrl || null,
    });
  }
  if (body.status === 'paid') {
    update.payment_status = 'paid';
  }

  const { data: updated, error } = await admin.db
    .from('orders')
    .update(update)
    .eq('id', id)
    .select('id,status,payment_status,updated_at,dispatched_at')
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.db.from('order_status_history').insert({
    order_id: id,
    from_status: order.status,
    to_status: body.status,
    note: body.note || null,
    changed_by: admin.userId,
  });

  const emailEvent = emailEventForStatus[body.status];
  if (emailEvent && order.customer_email) {
    const emailOrder: EmailOrder = {
      id: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name || 'Customer',
      customerEmail: order.customer_email,
      customerPhone: order.customer_phone,
      deliveryAddress: order.delivery_address || 'Delivery address on order',
      paymentMethod: order.payment_method,
      subtotal: Number(order.subtotal),
      deliveryFee: Number(order.delivery_fee),
      total: Number(order.total),
      estimatedDelivery: 'Out for delivery',
      riderName,
      riderPhone,
      items: (order.order_items || []).map((item) => ({
        name: item.product_name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        lineTotal: Number(item.line_total),
      })),
    };
    await sendOrderEmail(admin.db, emailOrder, emailEvent, order.customer_email);
  }

  if (body.status === 'out_for_delivery') {
    const text = `Your The Snohomish order #${order.order_number} has been dispatched and is on its way. Order total: KES ${Number(order.total).toLocaleString('en-KE')}. Rider: ${riderName || 'The Snohomish rider'}. Contact: ${riderPhone || 'Contact The Snohomish'}. Thank you for shopping with The Snohomish.`;
    await admin.db.from('admin_notifications').insert({
      order_id: id,
      kind: 'dispatch',
      title: `Order ${order.order_number} dispatched`,
      body: text,
    });
  }

  return NextResponse.json({ ok: true, order: updated });
}
