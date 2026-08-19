'use client';

import { useMemo, useState } from 'react';
import { DbProduct, DbVariant, effectivePrice, money } from '@/lib/supabase';
import { readCart, writeCart } from '@/lib/cart';

export function ProductPurchase({ product, initialVariantId }: { product: DbProduct; initialVariantId?: string }) {
  const variants = useMemo(() => (product.product_variants || []).filter((variant) => variant.is_active !== false), [product.product_variants]);
  const defaultVariantId = variants.find((variant) => Number(variant.stock) > 0)?.id || variants[0]?.id || '';
  const [selectedId, setSelectedId] = useState(variants.some((variant) => variant.id === initialVariantId) ? initialVariantId || '' : defaultVariantId);
  const [quantity, setQuantity] = useState(1);
  const selected = variants.find((variant) => variant.id === selectedId) as DbVariant | undefined;
  const pricing = effectivePrice(selected || product), price = pricing.price;
  const rewardPoints = Math.round((price * quantity) / 100);
  const available = selected ? Number(selected.stock) > 0 : Number(product.stock || 0) > 0;
  const image = selected?.image_url || product.image_url || product.gallery_urls?.[0];

  const maxQuantity = Math.max(0, Number(selected ? selected.stock : product.stock || 0));
  const canAddMore = available && quantity > 0 && maxQuantity > 0;
  function addToCart() {
    if (!canAddMore) return;
    const cart = readCart();
    const existing = cart.find((item) => item.productId === product.id && item.variantId === selected?.id);
    const previousQuantity = existing?.quantity || 0;
    const nextQuantity = Math.min(previousQuantity + quantity, maxQuantity);
    const quantityAdded = nextQuantity - previousQuantity;
    if (quantityAdded <= 0) return;
    if (existing) existing.quantity = nextQuantity;
    else cart.push({ productId: product.id, variantId: selected?.id, name: product.name, size: selected?.name, price, image, quantity: nextQuantity, stock: maxQuantity });
    const addedItem = existing || cart[cart.length - 1];
    writeCart(cart, { item: { ...addedItem }, quantityAdded });
  }

  const addToCartLabel = selected?.name ? `Add ${quantity} to cart · ${selected.name}` : `Add ${quantity} to cart`;

  return <div className="mt-4">
    {variants.length > 0 && <fieldset><legend className="text-xs font-black uppercase tracking-wide text-brand-ink">Bottle size</legend><div className="mt-1.5 flex flex-wrap gap-1.5">{variants.map((variant) => { const optionPrice = effectivePrice(variant); return <button key={variant.id} type="button" onClick={() => { setSelectedId(variant.id); setQuantity(1); }} disabled={variant.stock <= 0} title={`${variant.name} — ${money(optionPrice.price)}`} className={`rounded-md border px-2 py-1.5 text-xs font-bold leading-none transition ${selectedId === variant.id ? 'border-brand-orange bg-orange-50 text-brand-deep' : 'border-orange-100 bg-white text-neutral-700'} disabled:cursor-not-allowed disabled:opacity-45`}><span>{variant.name}</span><span className="ml-1 font-medium text-neutral-500">· {money(optionPrice.price)}</span>{variant.stock <= 0 && <span className="ml-1 text-[9px] text-red-600">Out</span>}</button>})}</div></fieldset>}
    <div className="mt-4 flex items-end justify-between gap-4"><div><p className="text-3xl font-black text-brand-deep">{money(price * quantity)}</p>{quantity > 1 && <p className="mt-1 text-sm text-neutral-500">{quantity} × {money(price)}</p>}{pricing.oldPrice && <p className="mt-1 text-sm text-neutral-500 line-through">{money(pricing.oldPrice * quantity)}</p>}</div><p className={`text-sm font-bold ${available ? 'text-green-700' : 'text-red-600'}`}>{available ? (maxQuantity <= (selected?.low_stock_threshold || product.low_stock_threshold || 5) ? 'Low stock' : 'Available now') : 'Currently unavailable'}</p></div>
    <div className="mt-3 rounded-xl border border-yellow-300 bg-yellow-50 px-3 py-2.5 text-sm text-brand-ink"><p className="font-black">Get your money back 😊 · Earn {rewardPoints.toLocaleString('en-KE')} points</p></div>
    <div className="mt-4 flex flex-wrap items-center gap-3"><span className="text-sm font-black text-brand-ink">Quantity</span><div className="flex items-center rounded-xl border border-orange-200 bg-white"><button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="px-4 py-3 font-black" aria-label="Decrease quantity">−</button><span className="min-w-10 text-center font-black">{quantity}</span><button type="button" onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))} className="px-4 py-3 font-black" aria-label="Increase quantity">+</button></div></div>
    <button type="button" onClick={addToCart} disabled={!canAddMore} className="orange-gradient mt-4 min-h-12 w-full touch-manipulation rounded-xl px-4 py-3 text-center text-sm font-black leading-snug text-white shadow-orange disabled:cursor-not-allowed disabled:opacity-50 sm:px-6 sm:text-base">{available ? addToCartLabel : 'Unavailable'}</button>
  </div>;
}
