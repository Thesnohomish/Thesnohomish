import { NextRequest, NextResponse } from 'next/server';
import { mpesaTransactionDate, queryStkPush } from '@/lib/server/mpesa';
import { getAdminSupabase } from '@/lib/server/supabase-admin';
import { sendOrderEmail, type EmailOrder } from '@/lib/server/order-email';
import { sendOrderSms } from '@/lib/server/order-sms';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const callback = payload?.Body?.stkCallback;
    if (!callback?.CheckoutRequestID)
      return NextResponse.json(
        { ResultCode: 1, ResultDesc: 'Invalid callback' },
        { status: 400 },
      );

    const db = getAdminSupabase();
    const { data: payment, error: paymentError } = await db
      .from('payments')
      .select('id,order_id,status,amount,phone_number,merchant_request_id')
      .eq('checkout_request_id', callback.CheckoutRequestID)
      .maybeSingle();
    if (paymentError) throw paymentError;
    if (!payment) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment reference not recorded yet' }, { status: 503 });
    if (String(callback.MerchantRequestID) !== String(payment.merchant_request_id)) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment reference mismatch' }, { status: 400 });

    const metadata = Object.fromEntries(
      (callback.CallbackMetadata?.Item || []).map(
        (item: { Name: string; Value?: unknown }) => [item.Name, item.Value],
      ),
    );
    const success =
      Number(callback.ResultCode) === 0 &&
      Number(metadata.Amount) === Number(payment.amount) &&
      String(metadata.PhoneNumber) === String(payment.phone_number) &&
      Boolean(metadata.MpesaReceiptNumber);
    // Verify successful payment directly with Daraja before marking an order paid.
    if (Number(callback.ResultCode) === 0 && !success) return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment details mismatch' }, { status: 400 });
    if (success && payment.status !== 'paid') {
      const verified = await queryStkPush(String(callback.CheckoutRequestID));
      if (verified.resultCode !== '0') return NextResponse.json({ ResultCode: 1, ResultDesc: 'Payment not confirmed by Daraja' }, { status: 503 });
    }
    if (payment.status === 'paid' && !success) return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    const paymentStatus = success
      ? 'paid'
      : Number(callback.ResultCode) === 1032
        ? 'cancelled'
        : Number(callback.ResultCode) === 1037
          ? 'timed_out'
          : 'failed';

    const { error: paymentUpdateError } = await db
      .from('payments')
      .update({
        status: paymentStatus,
        receipt_number: String(metadata.MpesaReceiptNumber || '') || null,
        transaction_at: mpesaTransactionDate(metadata.TransactionDate),
        provider_result_code: String(callback.ResultCode),
        provider_result_desc: callback.ResultDesc,
        raw_callback: payload,
      })
      .eq('id', payment.id)
      .neq('status', 'paid');
    if (paymentUpdateError) throw paymentUpdateError;

    // Payment state and fulfilment state are intentionally separate.
    // A successful M-Pesa payment remains a new/pending fulfilment order until admin dispatches it.
    const { data: updatedOrders, error: orderUpdateError } = await db
      .from('orders')
      .update({
        payment_status: paymentStatus,
        status: success ? 'pending' : 'pending_payment',
      })
      .eq('id', payment.order_id)
      .in('payment_status', success ? ['pending_payment', 'failed', 'cancelled', 'timed_out'] : ['pending_payment'])
      .select('id');
    if (orderUpdateError) throw orderUpdateError;

    if (success && updatedOrders?.length) {
      const { data: order } = await db
        .from('orders')
        .select(
          'id,order_number,customer_name,customer_email,customer_phone,delivery_address,payment_method,subtotal,delivery_fee,total,order_items(product_name,quantity,unit_price,line_total)',
        )
        .eq('id', payment.order_id)
        .maybeSingle();
      if (order) {
        const emailOrder: EmailOrder = {
          id: order.id,
          orderNumber: order.order_number,
          customerName: order.customer_name || 'Customer',
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          deliveryAddress:
            order.delivery_address || 'Delivery address on order',
          paymentMethod: order.payment_method,
          subtotal: Number(order.subtotal),
          deliveryFee: Number(order.delivery_fee),
          total: Number(order.total),
          estimatedDelivery: 'Delivery estimate will follow',
          items: (order.order_items || []).map((item) => ({
            name: item.product_name,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            lineTotal: Number(item.line_total),
          })),
        };

        await db.from('admin_notifications').insert({
          order_id: order.id,
          kind: 'new_order',
          title: `New paid order ${order.order_number}`,
          body: `M-Pesa payment received for ${order.order_number}. The order is ready for dispatch processing.`,
        });

        const emailTasks: Array<Promise<unknown>> = [];
        if (emailOrder.customerEmail)
          emailTasks.push(
            sendOrderEmail(db, emailOrder, 'placed', emailOrder.customerEmail),
          );
        if (process.env.ADMIN_ORDER_EMAIL)
          emailTasks.push(
            sendOrderEmail(
              db,
              emailOrder,
              'new_order_admin',
              process.env.ADMIN_ORDER_EMAIL,
            ),
          );
        if (order.customer_phone)
          emailTasks.push(sendOrderSms(db, { id: order.id, orderNumber: order.order_number, customerPhone: order.customer_phone, customerName: order.customer_name || 'Customer', total: Number(order.total), subtotal: Number(order.subtotal) }, 'placed'));
        await Promise.all(emailTasks);
      }
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (error) {
    console.error('[M-Pesa callback]', error);
    return NextResponse.json(
      { ResultCode: 1, ResultDesc: 'Callback processing failed' },
      { status: 500 },
    );
  }
}
