"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Trash2, Truck } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { money } from "@/lib/supabase";

type Rider = { id: string; name: string; phone: string };
type DispatchOrder = {
  id: string;
  order_number?: string;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: string;
  delivery_instructions?: string;
  total: number;
  status: string;
  created_at: string;
};
const READY_STATUSES = ["accepted", "confirmed", "processing"];

export default function DispatchPage() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [orders, setOrders] = useState<DispatchOrder[]>([]),
    [riders, setRiders] = useState<Rider[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({}),
    [name, setName] = useState(""),
    [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true),
    [busyOrder, setBusyOrder] = useState(""),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const [
      { data: orderRows, error: orderError },
      { data: setting, error: riderError },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id,order_number,customer_name,customer_phone,delivery_address,delivery_instructions,total,status,created_at",
        )
        .in("status", READY_STATUSES)
        .order("created_at"),
      supabase
        .from("store_settings")
        .select("value")
        .eq("key", "dispatch_riders")
        .maybeSingle(),
    ]);
    if (orderError || riderError)
      setError(
        orderError?.message ||
          riderError?.message ||
          "Unable to load dispatch information.",
      );
    setOrders((orderRows || []) as DispatchOrder[]);
    const saved =
      setting?.value &&
      typeof setting.value === "object" &&
      Array.isArray((setting.value as { riders?: Rider[] }).riders)
        ? (setting.value as { riders: Rider[] }).riders
        : [];
    setRiders(saved);
    setSelected((current) =>
      Object.fromEntries(
        (orderRows || []).map((order) => [
          order.id,
          current[order.id] || saved[0]?.id || "",
        ]),
      ),
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveRiders(next: Rider[]) {
    if (!supabase) return false;
    const { error: saveError } = await supabase
      .from("store_settings")
      .upsert({
        key: "dispatch_riders",
        value: { riders: next },
        description: "Saved riders for the admin dispatch screen",
        is_public: false,
      });
    if (saveError) {
      setError(saveError.message);
      return false;
    }
    setRiders(next);
    return true;
  }

  async function addRider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!name.trim() || !phone.trim())
      return setError("Enter the rider name and phone number.");
    const rider = {
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
    };
    if (await saveRiders([...riders, rider])) {
      setName("");
      setPhone("");
      setMessage(`${rider.name} saved and ready to assign.`);
    }
  }

  async function removeRider(id: string) {
    const rider = riders.find((item) => item.id === id);
    if (!rider || !confirm(`Remove ${rider.name} from saved riders?`)) return;
    if (await saveRiders(riders.filter((item) => item.id !== id)))
      setSelected((current) =>
        Object.fromEntries(
          Object.entries(current).map(([orderId, riderId]) => [
            orderId,
            riderId === id ? "" : riderId,
          ]),
        ),
      );
  }

  async function dispatch(order: DispatchOrder) {
    const rider = riders.find((item) => item.id === selected[order.id]);
    if (!rider) return setError("Choose a saved rider for this order.");
    if (!supabase) return;
    setBusyOrder(order.id);
    setError("");
    setMessage("");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({
        status: "out_for_delivery",
        riderName: rider.name,
        riderPhone: rider.phone,
      }),
    });
    const result = await response.json();
    if (!response.ok) setError(result.error || "Unable to dispatch order.");
    else {
      setMessage(
        `Order ${order.order_number || order.id} dispatched with ${rider.name}. Customer email sent.`,
      );
      await load();
    }
    setBusyOrder("");
  }

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin" className="font-bold text-brand-orange">
            ← Admin
          </Link>
          <h1 className="mt-2 flex items-center gap-2 text-3xl font-black text-brand-ink">
            <Truck />
            Dispatch centre
          </h1>
          <p className="text-neutral-600">
            Save riders once, assign them to confirmed orders, and send the
            out-for-delivery email.
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-3 font-bold"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>
      {message && (
        <p className="mt-4 rounded-xl bg-green-50 p-3 font-bold text-green-800">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-700">
          {error}
        </p>
      )}
      <div className="mt-5 grid gap-5 lg:grid-cols-[340px_1fr]">
        <aside className="h-fit rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-xl font-black">Saved riders</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Their phone number fills automatically when selected.
          </p>
          <form onSubmit={addRider} className="mt-4 space-y-3">
            <label className="block font-bold">
              Rider name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 w-full rounded-xl border p-3 font-normal"
                placeholder="Full name"
              />
            </label>
            <label className="block font-bold">
              Phone number
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="mt-1 w-full rounded-xl border p-3 font-normal"
                placeholder="0712 345 678"
                inputMode="tel"
              />
            </label>
            <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-3 font-black text-white">
              <Plus size={17} />
              Save rider
            </button>
          </form>
          <div className="mt-5 space-y-2">
            {riders.map((rider) => (
              <div
                key={rider.id}
                className="flex items-center justify-between rounded-xl bg-orange-50 p-3"
              >
                <span>
                  <b className="block">{rider.name}</b>
                  <a
                    href={`tel:${rider.phone}`}
                    className="text-sm text-brand-orange"
                  >
                    {rider.phone}
                  </a>
                </span>
                <button
                  onClick={() => void removeRider(rider.id)}
                  className="rounded-lg p-2 text-red-600"
                  aria-label={`Remove ${rider.name}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
            {!riders.length && (
              <p className="rounded-xl border border-dashed p-4 text-sm text-neutral-500">
                Add your first rider above.
              </p>
            )}
          </div>
        </aside>
        <section>
          <h2 className="text-xl font-black">Orders ready for dispatch</h2>
          {loading ? (
            <p className="mt-4">Loading…</p>
          ) : !orders.length ? (
            <p className="mt-4 rounded-2xl bg-white p-6 shadow-card">
              No confirmed orders are waiting for dispatch.
            </p>
          ) : (
            <div className="mt-3 grid gap-3">
              {orders.map((order) => {
                const rider = riders.find(
                  (item) => item.id === selected[order.id],
                );
                return (
                  <article
                    key={order.id}
                    className="rounded-2xl bg-white p-5 shadow-card"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="text-lg font-black text-brand-orange"
                        >
                          {order.order_number || order.id}
                        </Link>
                        <p>
                          {order.customer_name || "Guest"} ·{" "}
                          <a href={`tel:${order.customer_phone || ""}`}>
                            {order.customer_phone || "No phone"}
                          </a>
                        </p>
                        <p className="mt-1 text-sm text-neutral-600">
                          {order.delivery_address || "No address"}
                        </p>
                        {order.delivery_instructions && (
                          <p className="text-sm font-bold">
                            Instructions: {order.delivery_instructions}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <b>{money(order.total)}</b>
                        <p className="capitalize text-neutral-500">
                          {order.status.replaceAll("_", " ")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                      <label className="font-bold">
                        Assign rider
                        <select
                          value={selected[order.id] || ""}
                          onChange={(event) =>
                            setSelected((current) => ({
                              ...current,
                              [order.id]: event.target.value,
                            }))
                          }
                          className="mt-1 w-full rounded-xl border bg-white p-3 font-normal"
                        >
                          <option value="">Choose rider</option>
                          {riders.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="font-bold">
                        Rider phone
                        <input
                          value={rider?.phone || ""}
                          readOnly
                          className="mt-1 w-full rounded-xl border bg-neutral-50 p-3 font-normal"
                          placeholder="Filled from saved rider"
                        />
                      </label>
                      <button
                        onClick={() => void dispatch(order)}
                        disabled={!rider || busyOrder === order.id}
                        className="rounded-xl bg-brand-orange px-5 py-3 font-black text-white disabled:opacity-50"
                      >
                        {busyOrder === order.id
                          ? "Dispatching…"
                          : "Dispatch & email"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
