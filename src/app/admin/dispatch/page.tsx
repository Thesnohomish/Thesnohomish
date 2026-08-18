"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  PackageCheck,
  Plus,
  RefreshCw,
  Trash2,
  Truck,
} from "lucide-react";
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
type OrderItem = {
  id: string;
  order_id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  line_total: number;
};
type ProductImage = { id: string; image_url?: string | null };
const ACTIVE_STATUSES = [
  "pending",
  "pending_payment",
  "paid",
  "accepted",
  "confirmed",
  "processing",
];
const NEEDS_CONFIRMATION = ["pending", "pending_payment", "paid"];

export default function DispatchPage() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [orders, setOrders] = useState<DispatchOrder[]>([]),
    [items, setItems] = useState<OrderItem[]>([]),
    [images, setImages] = useState<Record<string, string>>({}),
    [riders, setRiders] = useState<Rider[]>([]);
  const [activeId, setActiveId] = useState(""),
    [selectedRider, setSelectedRider] = useState(""),
    [checked, setChecked] = useState<Record<string, boolean>>({});
  const [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(""),
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
        .in("status", ACTIVE_STATUSES)
        .order("created_at"),
      supabase
        .from("store_settings")
        .select("value")
        .eq("key", "dispatch_riders")
        .maybeSingle(),
    ]);
    const nextOrders = (orderRows || []) as DispatchOrder[];
    let nextItems: OrderItem[] = [],
      imageMap: Record<string, string> = {};
    if (nextOrders.length) {
      const { data: itemRows, error: itemError } = await supabase
        .from("order_items")
        .select("id,order_id,product_id,product_name,quantity,line_total")
        .in(
          "order_id",
          nextOrders.map((order) => order.id),
        )
        .order("created_at");
      if (itemError) setError(itemError.message);
      else nextItems = (itemRows || []) as OrderItem[];
      const productIds = [
        ...new Set(
          nextItems
            .map((item) => item.product_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      if (productIds.length) {
        const { data: productRows } = await supabase
          .from("products")
          .select("id,image_url")
          .in("id", productIds);
        imageMap = Object.fromEntries(
          ((productRows || []) as ProductImage[]).map((product) => [
            product.id,
            product.image_url || "",
          ]),
        );
      }
    }
    if (orderError || riderError)
      setError(
        orderError?.message ||
          riderError?.message ||
          "Unable to load dispatch information.",
      );
    const saved =
      setting?.value &&
      typeof setting.value === "object" &&
      Array.isArray((setting.value as { riders?: Rider[] }).riders)
        ? (setting.value as { riders: Rider[] }).riders
        : [];
    setOrders(nextOrders);
    setItems(nextItems);
    setImages(imageMap);
    setRiders(saved);
    setActiveId((current) =>
      nextOrders.some((order) => order.id === current)
        ? current
        : nextOrders[0]?.id || "",
    );
    setSelectedRider((current) =>
      saved.some((rider) => rider.id === current)
        ? current
        : saved[0]?.id || "",
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);
  const activeOrder = orders.find((order) => order.id === activeId);
  const activeItems = items.filter((item) => item.order_id === activeId);
  const rider = riders.find((item) => item.id === selectedRider);
  const confirmed = activeOrder
    ? !NEEDS_CONFIRMATION.includes(activeOrder.status)
    : false;
  const allPacked =
    activeItems.length > 0 && activeItems.every((item) => checked[item.id]);

  async function updateStatus(
    order: DispatchOrder,
    status: "confirmed" | "out_for_delivery",
    assigned?: Rider,
  ) {
    if (!supabase) return false;
    setBusy(status);
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
        status,
        riderName: assigned?.name,
        riderPhone: assigned?.phone,
      }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) {
      setError(result.error || "Unable to update order.");
      return false;
    }
    setOrders((current) =>
      current.map((item) =>
        item.id === order.id ? { ...item, status } : item,
      ),
    );
    return true;
  }

  async function confirmOrder() {
    if (activeOrder && (await updateStatus(activeOrder, "confirmed")))
      setMessage(
        `Order ${activeOrder.order_number || activeOrder.id} confirmed. Tick each product as you pack it.`,
      );
  }
  async function dispatchOrder() {
    if (!activeOrder || !rider) return setError("Choose a saved rider.");
    if (!allPacked)
      return setError("Tick every product before assigning the rider.");
    if (await updateStatus(activeOrder, "out_for_delivery", rider)) {
      setMessage(
        `Order ${activeOrder.order_number || activeOrder.id} assigned to ${rider.name}. The customer has been emailed.`,
      );
      setChecked((current) =>
        Object.fromEntries(
          Object.entries(current).filter(
            ([itemId]) => !activeItems.some((item) => item.id === itemId),
          ),
        ),
      );
      await load();
    }
  }

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
    if (!name.trim() || !phone.trim())
      return setError("Enter the rider name and phone number.");
    const next = {
      id: crypto.randomUUID(),
      name: name.trim(),
      phone: phone.trim(),
    };
    if (await saveRiders([...riders, next])) {
      setName("");
      setPhone("");
      setSelectedRider(next.id);
      setMessage(`${next.name} saved and selected.`);
    }
  }
  async function removeRider(id: string) {
    const target = riders.find((item) => item.id === id);
    if (!target || !confirm(`Remove ${target.name}?`)) return;
    if (await saveRiders(riders.filter((item) => item.id !== id)))
      setSelectedRider((current) => (current === id ? "" : current));
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
            Open an order, confirm it, tick the packed products, then assign a
            rider.
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
      <div className="mt-5 grid gap-5 lg:grid-cols-[330px_1fr]">
        <aside className="h-fit rounded-2xl bg-white p-4 shadow-card">
          <h2 className="text-xl font-black">Active orders</h2>
          <p className="text-sm text-neutral-600">
            Click an order to work on it here.
          </p>
          <div className="mt-3 space-y-2">
            {loading ? (
              <p>Loading…</p>
            ) : (
              orders.map((order) => (
                <button
                  key={order.id}
                  onClick={() => {
                    setActiveId(order.id);
                    setError("");
                    setMessage("");
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${activeId === order.id ? "border-brand-orange bg-orange-50" : "bg-white"}`}
                >
                  <span>
                    <b className="block text-brand-ink">
                      {order.order_number || order.id}
                    </b>
                    <small>
                      {order.customer_name || "Guest"} · {money(order.total)}
                    </small>
                    <span className="mt-1 block text-xs font-bold capitalize text-brand-orange">
                      {order.status.replaceAll("_", " ")}
                    </span>
                  </span>
                  <ChevronRight size={18} />
                </button>
              ))
            )}
            {!loading && !orders.length && (
              <p className="rounded-xl border border-dashed p-4 text-neutral-500">
                No active orders.
              </p>
            )}
          </div>
        </aside>
        <section>
          {!activeOrder ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-card">
              Choose an order from the list.
            </div>
          ) : (
            <div className="space-y-5">
              <article className="rounded-2xl bg-white p-5 shadow-card">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">
                      {activeOrder.order_number || activeOrder.id}
                    </h2>
                    <p>
                      {activeOrder.customer_name || "Guest"} ·{" "}
                      <a
                        className="text-brand-orange"
                        href={`tel:${activeOrder.customer_phone || ""}`}
                      >
                        {activeOrder.customer_phone || "No phone"}
                      </a>
                    </p>
                    <p className="mt-2 text-neutral-700">
                      {activeOrder.delivery_address || "No delivery address"}
                    </p>
                    {activeOrder.delivery_instructions && (
                      <p className="mt-1 font-bold">
                        Instructions: {activeOrder.delivery_instructions}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <b className="text-xl">{money(activeOrder.total)}</b>
                    <p className="capitalize text-brand-orange">
                      {activeOrder.status.replaceAll("_", " ")}
                    </p>
                  </div>
                </div>
                {!confirmed ? (
                  <button
                    onClick={() => void confirmOrder()}
                    disabled={busy === "confirmed"}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-deep px-5 py-3 font-black text-white disabled:opacity-50"
                  >
                    <Check size={18} />
                    {busy === "confirmed" ? "Confirming…" : "Confirm order"}
                  </button>
                ) : (
                  <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 font-black text-green-800">
                    <Check size={18} />
                    Order confirmed
                  </p>
                )}
              </article>
              <article
                className={`rounded-2xl bg-white p-5 shadow-card ${!confirmed ? "opacity-50" : ""}`}
              >
                <h2 className="flex items-center gap-2 text-xl font-black">
                  <PackageCheck />
                  Pack and tick products
                </h2>
                <p className="text-sm text-neutral-600">
                  Check the image and name, then tick each product after packing
                  it.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {activeItems.map((item) => (
                    <label
                      key={item.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 ${checked[item.id] ? "border-green-500 bg-green-50" : "border-neutral-200"}`}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(checked[item.id])}
                        disabled={!confirmed}
                        onChange={(event) =>
                          setChecked((current) => ({
                            ...current,
                            [item.id]: event.target.checked,
                          }))
                        }
                        className="h-5 w-5"
                      />
                      {item.product_id && images[item.product_id] ? (
                        <img
                          src={images[item.product_id]}
                          alt=""
                          className="h-20 w-20 rounded-lg bg-neutral-100 object-contain"
                        />
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-neutral-100 text-xs text-neutral-500">
                          No image
                        </div>
                      )}
                      <span>
                        <b className="block">{item.product_name}</b>
                        <span className="text-sm">
                          Quantity: {item.quantity}
                        </span>
                      </span>
                    </label>
                  ))}
                  {!activeItems.length && (
                    <p className="text-neutral-500">
                      No products found for this order.
                    </p>
                  )}
                </div>
                {confirmed && (
                  <p
                    className={`mt-4 font-bold ${allPacked ? "text-green-700" : "text-brand-orange"}`}
                  >
                    {allPacked
                      ? "All products packed. You can assign a rider."
                      : `${activeItems.filter((item) => !checked[item.id]).length} product line(s) still need checking.`}
                  </p>
                )}
              </article>
              <article
                className={`rounded-2xl bg-white p-5 shadow-card ${!allPacked ? "opacity-50" : ""}`}
              >
                <h2 className="flex items-center gap-2 text-xl font-black">
                  <Truck />
                  Finish: assign rider
                </h2>
                <div className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <label className="font-bold">
                    Saved rider
                    <select
                      value={selectedRider}
                      disabled={!allPacked}
                      onChange={(event) => setSelectedRider(event.target.value)}
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
                    Phone
                    <input
                      value={rider?.phone || ""}
                      readOnly
                      className="mt-1 w-full rounded-xl border bg-neutral-50 p-3 font-normal"
                      placeholder="Filled automatically"
                    />
                  </label>
                  <button
                    onClick={() => void dispatchOrder()}
                    disabled={
                      !allPacked || !rider || busy === "out_for_delivery"
                    }
                    className="rounded-xl bg-brand-orange px-5 py-3 font-black text-white disabled:opacity-50"
                  >
                    {busy === "out_for_delivery"
                      ? "Dispatching…"
                      : "Assign & dispatch"}
                  </button>
                </div>
                <details className="mt-5 rounded-xl border p-3">
                  <summary className="cursor-pointer font-black">
                    Manage saved riders
                  </summary>
                  <form
                    onSubmit={addRider}
                    className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                  >
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="rounded-xl border p-3"
                      placeholder="Rider name"
                    />
                    <input
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      className="rounded-xl border p-3"
                      placeholder="Phone number"
                      inputMode="tel"
                    />
                    <button className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-3 font-black text-white">
                      <Plus size={17} />
                      Save
                    </button>
                  </form>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {riders.map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-2"
                      >
                        <b>{item.name}</b> {item.phone}
                        <button
                          onClick={() => void removeRider(item.id)}
                          aria-label={`Remove ${item.name}`}
                          className="text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </span>
                    ))}
                  </div>
                </details>
              </article>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
