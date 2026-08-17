import { NextRequest, NextResponse } from 'next/server';
import { kenyaPhone, requestStkPush } from '@/lib/server/mpesa';
import { getAdminSupabase } from '@/lib/server/supabase-admin';
import { createServerSupabase } from '@/lib/supabase-server';
import { sendOrderEmail, type EmailOrder } from '@/lib/server/order-email';

type CartLine = { productId: string; variantId?: string; quantity: number; name?: string };
type LiveVariant = { id: string; name: string; price: number; stock: number | null; is_active: boolean | null };
type LiveProduct = { id: string; name: string; price: number; stock: number | null; is_active: boolean | null; track_inventory?: boolean | null; product_variants?: LiveVariant[] };
type CheckoutBody = { cart: CartLine[]; customer: { name: string; email?: string; phone: string; address: string; latitude?: number; longitude?: number; placeId?: string; placeName?: string; locationVerified?: boolean; deliveryInstructions?: string; apartment?: string; building?: string }; paymentMethod: 'mpesa'|'cash'|'pickup'; giftNote?: string };

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = toRadians(lat2 - lat1), longitudeDelta = toRadians(lng2 - lng1);
  const a = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function finiteCoordinate(value: unknown) { return typeof value === 'number' && Number.isFinite(value); }
function configuredCoordinate(setting: unknown, environmentValue: string | undefined) {
  const value = setting == null || setting === '' ? Number(environmentValue) : Number(setting);
  return Number.isFinite(value) ? value : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CheckoutBody;
    const isPickup = body.paymentMethod === 'pickup';
    const hasCoordinates = finiteCoordinate(body.customer?.latitude) && finiteCoordinate(body.customer?.longitude);
    if (!Array.isArray(body.cart) || !body.cart.length || !body.customer?.name || !body.customer?.phone || (!isPickup && !body.customer?.address)) return NextResponse.json({ error: 'Add your contact and delivery details before placing the order.' }, { status: 400 });
    if (!['mpesa','cash','pickup'].includes(body.paymentMethod)) return NextResponse.json({ error: 'Unsupported payment method.' }, { status: 400 });

    const db = getAdminSupabase();
    const auth = await createServerSupabase();
    const { data: authData } = auth ? await auth.auth.getUser() : { data: { user: null } };
    const productIds = [...new Set(body.cart.map(item => item.productId))];
    // These are the current copied-project fields. In particular, do not query
    // legacy stock_quantity/available/published or optional discount-date fields.
    const { data: liveProducts, error: productsError } = await db.from('products').select('id,name,price,stock,is_active,track_inventory,product_variants(id,name,price,stock,is_active)').in('id', productIds);
    if (productsError) throw productsError;
    const products = (liveProducts || []) as LiveProduct[];

    let subtotal = 0;
    const items: Array<Record<string, unknown>> = [];
    for (const line of body.cart) {
      const quantity = Number(line.quantity);
      if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Your cart contains an invalid quantity.');
      const product = products.find(entry => entry.id === line.productId);
      const cachedName = line.name?.trim() || `Product ${line.productId}`;
      if (!product) throw new Error(`${cachedName} is no longer available.`);
      if (product.is_active === false) throw new Error(`${product.name} is no longer available.`);
      const variant = line.variantId ? product.product_variants?.find(entry => entry.id === line.variantId) : undefined;
      if (line.variantId && (!variant || variant.is_active === false)) throw new Error(`${product.name} in the selected size is no longer available.`);
      const sellable = variant || product;
      const stock = sellable.stock;
      const tracksInventory = variant ? stock !== null : product.track_inventory === true;
      if (tracksInventory && typeof stock === 'number' && stock < quantity) throw new Error(`${variant ? `${product.name} — ${variant.name}` : product.name} only has ${stock} unit${stock === 1 ? '' : 's'} available.`);
      const unitPrice = Number(sellable.price);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error(`${product.name} does not have a valid current price.`);
      const productName = variant ? `${product.name} — ${variant.name}` : product.name;
      subtotal += unitPrice * quantity;
      items.push({ product_id: product.id, variant_id: variant?.id || null, product_name: productName, quantity, unit_price: unitPrice, line_total: unitPrice * quantity });
    }

    const { data: checkout, error: checkoutError } = await db.from('store_settings').select('value').eq('key', 'checkout').maybeSingle();
    if (checkoutError) throw checkoutError;
    const store = (checkout?.value || {}) as Record<string, unknown>;
    if (body.paymentMethod === 'mpesa' && store.allow_mpesa === false) throw new Error('M-Pesa is not available right now. Choose another payment method.');
    if (body.paymentMethod === 'cash' && store.allow_cash === false) throw new Error('Cash on delivery is not available right now. Choose another payment method.');
    const { data: bands, error: bandsError } = await db.from('delivery_settings').select('*').eq('is_active', true).order('sort_order');
    if (bandsError) throw bandsError;
    const storeLatitude = configuredCoordinate(store.store_latitude, process.env.NEXT_PUBLIC_STORE_LATITUDE);
    const storeLongitude = configuredCoordinate(store.store_longitude, process.env.NEXT_PUBLIC_STORE_LONGITUDE);
    let km: number | null = null;
    if (!isPickup && hasCoordinates) {
      if (storeLatitude == null || storeLongitude == null) throw new Error('Delivery distance is not configured yet. Please contact the store or choose pickup.');
      km = haversineKm(storeLatitude, storeLongitude, Number(body.customer.latitude), Number(body.customer.longitude));
    }
    const band = km == null ? (bands || []).at(-1) : (bands || []).find(entry => km! >= Number(entry.min_distance_km) && (entry.max_distance_km == null || km! <= Number(entry.max_distance_km))) || (bands || []).at(-1);
    if (!isPickup && !band) throw new Error(km == null ? 'No delivery fee is configured. Please contact the store.' : 'This delivery location is outside the configured delivery area.');
    const deliveryFee = isPickup || subtotal >= 10000 ? 0 : Number(band?.fee || 0);
    const total = subtotal + deliveryFee, orderNumber = `CH-${Date.now().toString(36).toUpperCase()}`;
    const paymentStatus = body.paymentMethod === 'mpesa' ? 'pending_payment' : body.paymentMethod === 'cash' ? 'cash_due' : 'pending';

    let customerId: string | null = null, deliveryLocationId: string | null = null;
    if (authData.user) {
      const { data: customer } = await db.from('customers').upsert({ user_id: authData.user.id, full_name: body.customer.name.trim(), email: body.customer.email?.trim() || authData.user.email || null, phone: body.customer.phone }, { onConflict: 'user_id' }).select('id').single();
      customerId = customer?.id || null;
      if (customerId && !isPickup) {
        const { data: existingLocation } = await db.from('delivery_locations').select('id').eq('customer_id', customerId).eq('address', body.customer.address.trim()).maybeSingle();
        if (existingLocation) deliveryLocationId = existingLocation.id;
        else {
          const { data: location } = await db.from('delivery_locations').insert({ customer_id: customerId, label: 'Saved from checkout', address: body.customer.address.trim(), apartment: body.customer.apartment?.trim() || null, building: body.customer.building?.trim() || null, delivery_instructions: body.customer.deliveryInstructions?.trim() || null, latitude: hasCoordinates ? body.customer.latitude : null, longitude: hasCoordinates ? body.customer.longitude : null, place_id: body.customer.placeId || null, place_name: body.customer.placeName || null, delivery_fee: deliveryFee, is_default: false }).select('id').single();
          deliveryLocationId = location?.id || null;
        }
      }
    }

    const { data: order, error: orderError } = await db.from('orders').insert({ customer_id: customerId, delivery_location_id: deliveryLocationId, order_number: orderNumber, customer_name: body.customer.name.trim(), customer_email: body.customer.email?.trim() || null, customer_phone: body.customer.phone, delivery_address: isPickup ? 'Store pickup' : body.customer.address.trim(), gps_lat: hasCoordinates ? body.customer.latitude : null, gps_lng: hasCoordinates ? body.customer.longitude : null, delivery_place_id: body.customer.placeId || null, delivery_place_name: body.customer.placeName || null, delivery_location_verified: Boolean(body.customer.locationVerified), delivery_instructions: body.customer.deliveryInstructions?.trim() || null, gift_note: body.giftNote?.trim() || null, payment_method: body.paymentMethod, payment_status: paymentStatus, status: body.paymentMethod === 'mpesa' ? 'pending_payment' : 'pending', subtotal, delivery_fee: deliveryFee, discount_total: 0, total }).select('id,order_number,checkout_token').single();
    if (orderError || !order) throw orderError || new Error('Could not create your order.');
    const { error: itemsError } = await db.from('order_items').insert(items.map(item => ({ ...item, order_id: order.id })));
    if (itemsError) { await db.from('orders').delete().eq('id', order.id); throw itemsError; }

    const orderLines = items.map(item => `${item.quantity} × ${item.product_name} — KES ${Number(item.line_total).toLocaleString('en-KE')}`).join('\n');
    const summary = `Order ${order.order_number}\nCustomer: ${body.customer.name}\nPhone: ${body.customer.phone}\nAddress: ${isPickup ? 'Store pickup' : body.customer.address}\n${km == null ? '' : `Distance: ${km.toFixed(1)} km\n`}Payment: ${body.paymentMethod}\nDelivery: KES ${deliveryFee.toLocaleString('en-KE')}\nTotal: KES ${total.toLocaleString('en-KE')}\n\nProducts:\n${orderLines}`;
    await db.from('admin_notifications').insert({ order_id: order.id, kind: 'new_order', title: `New order ${order.order_number}`, body: summary });
    const emailOrder: EmailOrder = { id: order.id, orderNumber: order.order_number, customerName: body.customer.name.trim(), customerEmail: body.customer.email?.trim() || null, customerPhone: body.customer.phone, deliveryAddress: isPickup ? 'Store pickup' : body.customer.address.trim(), paymentMethod: body.paymentMethod, subtotal, deliveryFee, total, estimatedDelivery: isPickup ? 'Ready-time confirmation will follow' : band ? `${band.estimated_minutes_min}–${band.estimated_minutes_max} minutes` : 'Delivery estimate will follow', items: items.map(item => ({ name: String(item.product_name), quantity: Number(item.quantity), unitPrice: Number(item.unit_price), lineTotal: Number(item.line_total) })) };
    const emailTasks: Array<Promise<unknown>> = [];
    if (emailOrder.customerEmail) emailTasks.push(sendOrderEmail(db, emailOrder, 'placed', emailOrder.customerEmail));
    if (process.env.ADMIN_ORDER_EMAIL) emailTasks.push(sendOrderEmail(db, emailOrder, 'new_order_admin', process.env.ADMIN_ORDER_EMAIL));
    await Promise.all(emailTasks);
    if (body.paymentMethod === 'mpesa') {
      const phone = kenyaPhone(body.customer.phone);
      try {
        const stk = await requestStkPush({ amount: total, phone, accountReference: order.order_number, description: 'The Snohomish order' });
        await db.from('payments').insert({ order_id: order.id, provider: 'mpesa', status: 'pending', amount: total, phone_number: phone, merchant_request_id: stk.merchantRequestId, checkout_request_id: stk.checkoutRequestId });
        return NextResponse.json({ orderNumber: order.order_number, checkoutToken: order.checkout_token, paymentStatus: 'pending_payment', subtotal, deliveryFee, distanceKm: km, total, message: 'Check your phone and enter your M-Pesa PIN to complete payment.' });
      } catch (error) {
        await db.from('orders').update({ payment_status: 'failed' }).eq('id', order.id);
        return NextResponse.json({ orderNumber: order.order_number, checkoutToken: order.checkout_token, paymentStatus: 'failed', error: error instanceof Error ? error.message : 'M-Pesa could not start.' }, { status: 502 });
      }
    }
    return NextResponse.json({ orderNumber: order.order_number, checkoutToken: order.checkout_token, paymentStatus, subtotal, deliveryFee, distanceKm: km, total });
  } catch (error) {
    console.error('[Checkout order]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to place your order.' }, { status: 400 });
  }
}
