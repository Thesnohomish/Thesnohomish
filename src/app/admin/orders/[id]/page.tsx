"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { money } from "@/lib/supabase";

export default function OrderDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [id, setId] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [note, setNote] = useState("");
  const [rider, setRider] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    void params.then((value) => setId(value.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!supabase || !id) return;
    setError("");
    setHistoryError("");

    const { data: orderRow, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (orderError) {
      setError(orderError.message);
      return;
    }
    if (!orderRow) {
      setError("Order not found.");
      return;
    }

    const [itemsResult, paymentsResult, historyResult, notificationsResult] =
      await Promise.all([
        supabase
          .from("order_items")
          .select("*")
          .eq("order_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("payments")
          .select("*")
          .eq("order_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("order_status_history")
          .select("*")
          .eq("order_id", id)
          .order("created_at", { ascending: true }),
        supabase
          .from("notification_deliveries")
          .select("*")
          .eq("order_id", id)
          .order("created_at", { ascending: false }),
      ]);

    if (itemsResult.error) {
      setError(itemsResult.error.message);
      return;
    }

    const optionalErrors = [
      paymentsResult.error?.message,
      historyResult.error?.message,
      notificationsResult.error?.message,
    ].filter(Boolean);
    if (optionalErrors.length) setHistoryError(optionalErrors.join(" · "));

    const combined = {
      ...orderRow,
      order_items: itemsResult.data || [],
      payments: paymentsResult.data || [],
      order_status_history: historyResult.data || [],
      notification_deliveries: notificationsResult.data || [],
    };

    setOrder(combined);
    setRider((current) => current || combined.rider_name || "");
    setPhone((current) => current || combined.rider_phone || "");
  }, [supabase, id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!supabase || !id) return;
    const channel = supabase
      .channel(`admin-order-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${id}`,
        },
        () => void load(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `order_id=eq.${id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, id, load]);

  async function action(status: string) {
    setError("");
    if (status === "out_for_delivery" && (!rider.trim() || !phone.trim())) {
      setError("Add the rider name and phone number before dispatching the order.");
      return;
    }
    if (
      (status === "rejected" || status === "cancelled") &&
      !confirm(`${status === "rejected" ? "Reject" : "Cancel"} this order?`)
    )
      return;

    const {
      data: { session },
    } = await supabase!.auth.getSession();
    const response = await fetch(`/api/admin/orders/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({
        status,
        note,
        riderName: rider.trim(),
        riderPhone: phone.trim(),
      }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Unable to update order.");
    else void load();
  }

  if (!order) return <main className="p-8">{error || "Loading order…"}</main>;

  const transitions: Record<string, string[]> = {
    pending: ["confirmed", "rejected", "cancelled"],
    pending_payment: ["confirmed", "rejected", "cancelled"],
    paid: order.dispatched_at ? [] : ["confirmed", "rejected", "cancelled"],
    accepted: ["processing", "out_for_delivery", "rejected", "cancelled"],
    confirmed: ["processing", "out_for_delivery", "rejected", "cancelled"],
    processing: ["out_for_delivery", "rejected", "cancelled"],
    dispatched: ["paid", "cancelled"],
    out_for_delivery: ["paid", "cancelled"],
    delivered: [],
    rejected: [],
    cancelled: [],
  };
  const next = transitions[order.status] || [];

  return (
    <main className="mx-auto max-w-5xl p-5">
      <Link href="/admin/orders" className="font-bold text-brand-orange">
        ← Orders
      </Link>

      <div className="mt-4 rounded-2xl bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">
              {order.order_number || order.id}
            </h1>
            <p className="mt-1 capitalize text-neutral-600">
              {new Date(order.created_at).toLocaleString()} ·{" "}
              {String(order.status).replaceAll("_", " ")}
            </p>
          </div>
          <span className="rounded-full bg-brand-soft px-3 py-2 text-sm font-black capitalize text-brand-ink">
            {String(order.status).replaceAll("_", " ")}
          </span>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <section className="rounded-xl border p-4">
            <h2 className="font-black">Customer details</h2>
            <p className="mt-2">{order.customer_name || "Guest"}</p>
            {order.customer_phone ? (
              <a href={`tel:${order.customer_phone}`} className="block text-brand-orange">
                {order.customer_phone}
              </a>
            ) : (
              <p className="text-neutral-500">No phone number</p>
            )}
            {order.customer_email ? (
              <a
                href={`mailto:${order.customer_email}`}
                className="block break-all text-brand-orange"
              >
                {order.customer_email}
              </a>
            ) : (
              <p className="text-neutral-500">No email address</p>
            )}
          </section>

          <section className="rounded-xl border p-4">
            <h2 className="font-black">Delivery details</h2>
            <p className="mt-2">{order.delivery_address || "No delivery address"}</p>
            {order.delivery_instructions && (
              <p className="mt-2 text-sm text-neutral-600">
                Instructions: {order.delivery_instructions}
              </p>
            )}
            {order.delivery_location_verified === false && (
              <p className="mt-2 font-bold text-red-600">Location not verified</p>
            )}
            {order.gps_lat && order.gps_lng && (
              <a
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-brand-orange"
                href={`https://www.google.com/maps/search/?api=1&query=${order.gps_lat},${order.gps_lng}`}
              >
                Open in Google Maps
              </a>
            )}
          </section>
        </div>

        <section className="mt-6 border-t pt-5">
          <h2 className="text-xl font-black">Products</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Qty</th>
                  <th className="py-2 pr-3">Unit price</th>
                  <th className="py-2 text-right">Line total</th>
                </tr>
              </thead>
              <tbody>
                {order.order_items.map((item: any) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-3 pr-3 font-bold">{item.product_name}</td>
                    <td className="py-3 pr-3">{item.quantity}</td>
                    <td className="py-3 pr-3">{money(item.unit_price)}</td>
                    <td className="py-3 text-right font-bold">
                      {money(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto mt-4 max-w-sm space-y-1">
            <p className="flex justify-between">
              Subtotal <b>{money(order.subtotal)}</b>
            </p>
            {Number(order.discount_total || 0) > 0 && (
              <p className="flex justify-between">
                Discount <b>{money(order.discount_total)}</b>
              </p>
            )}
            <p className="flex justify-between">
              Delivery <b>{money(order.delivery_fee)}</b>
            </p>
            <p className="flex justify-between border-t pt-2 text-xl font-black">
              Total <b>{money(order.total)}</b>
            </p>
          </div>
        </section>

        <section className="mt-6 rounded-xl bg-neutral-50 p-4">
          <h2 className="font-black">Payment</h2>
          <p className="mt-1 capitalize">
            Method: <b>{order.payment_method || "—"}</b>
          </p>
          <p className="capitalize">
            Status: <b>{order.payment_status || "—"}</b>
          </p>
          {order.payments?.[0]?.receipt_number && (
            <p>Receipt: <b>{order.payments[0].receipt_number}</b></p>
          )}
        </section>

        {(order.dispatched_at || order.rider_name || order.rider_phone) && (
          <section className="mt-6 rounded-xl border border-orange-200 bg-orange-50 p-4">
            <h2 className="font-black">Dispatch details</h2>
            {order.dispatched_at && (
              <p className="mt-1">
                Dispatched: {new Date(order.dispatched_at).toLocaleString()}
              </p>
            )}
            <p>Rider: <b>{order.rider_name || "—"}</b></p>
            {order.rider_phone ? (
              <p>
                Rider phone:{" "}
                <a href={`tel:${order.rider_phone}`} className="text-brand-orange">
                  {order.rider_phone}
                </a>
              </p>
            ) : null}
            {order.delivery_note && <p>Delivery note: {order.delivery_note}</p>}
            {order.tracking_url && (
              <a
                href={order.tracking_url}
                target="_blank"
                rel="noreferrer"
                className="text-brand-orange"
              >
                Open tracking link
              </a>
            )}
          </section>
        )}

        {["accepted", "confirmed", "processing"].includes(order.status) && (
          <section className="mt-6 rounded-2xl border-2 border-brand-orange bg-orange-50 p-4">
            <h2 className="text-lg font-black text-brand-ink">Rider details</h2>
            <p className="mt-1 text-sm text-neutral-700">
              Add both details before clicking <strong>Dispatch order</strong>.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="font-bold">
                Rider name
                <input
                  value={rider}
                  onChange={(event) => setRider(event.target.value)}
                  className="mt-1 w-full rounded-xl border bg-white p-3 font-normal"
                  placeholder="Enter rider's full name"
                />
              </label>
              <label className="font-bold">
                Rider phone number
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="mt-1 w-full rounded-xl border bg-white p-3 font-normal"
                  placeholder="e.g. 0712 345 678"
                  inputMode="tel"
                />
              </label>
            </div>
          </section>
        )}

        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="mt-5 w-full rounded-xl border p-3"
          placeholder="Optional status note"
        />

        <div className="mt-5 flex flex-wrap gap-3">
          {next.map((status) => (
            <button
              key={status}
              onClick={() => void action(status)}
              className="rounded-xl bg-brand-orange px-4 py-3 font-black text-white"
            >
              {status === "confirmed"
                ? "Confirm order"
                : status === "processing"
                  ? "Start processing"
                  : status === "out_for_delivery"
                    ? "Dispatch order"
                    : status === "paid"
                      ? "Mark paid"
                      : status === "cancelled"
                        ? "Cancel order"
                        : "Reject order"}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 font-bold text-red-600">{error}</p>}
      </div>

      <section className="mt-5 rounded-2xl bg-white p-6 shadow-card">
        <h2 className="text-xl font-black">Status & notification history</h2>
        {historyError && (
          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Some history could not be loaded. The order details above are still available.
          </p>
        )}
        <div className="mt-3">
          {order.order_status_history?.map((entry: any) => (
            <p key={entry.id} className="border-b py-2">
              {entry.from_status || "New"} → {entry.to_status} ·{" "}
              {new Date(entry.created_at).toLocaleString()}
              {entry.note ? ` — ${entry.note}` : ""}
            </p>
          ))}
          {order.notification_deliveries?.map((entry: any) => (
            <p key={entry.id} className="border-b py-2">
              {entry.channel === "email" ? "Email" : entry.channel}: {entry.status}
              {entry.error_message ? ` — ${entry.error_message}` : ""}
            </p>
          ))}
          {!order.order_status_history?.length &&
            !order.notification_deliveries?.length && (
              <p className="text-neutral-500">No history recorded yet.</p>
            )}
        </div>
      </section>
    </main>
  );
}
