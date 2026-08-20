'use client';

import { useEffect, useState } from 'react';

type OrderState = {
  found: boolean;
  orderNumber?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  ready?: boolean;
  terminalFailure?: boolean;
};

export function OrderSuccessPopup() {
  const [orderNumber, setOrderNumber] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const clearTrackingCookie = () => {
      document.cookie = 'snohomish_order_token=; Max-Age=0; path=/; SameSite=Lax';
    };

    const check = async () => {
      if (stopped || attempts >= 90) return;
      attempts += 1;
      try {
        const response = await fetch('/api/checkout/status', { cache: 'no-store' });
        if (response.ok) {
          const state = await response.json() as OrderState;
          if (state.ready && state.orderNumber) {
            localStorage.removeItem('chupahub-cart');
            window.dispatchEvent(new Event('chupahub-cart-updated'));
            clearTrackingCookie();
            setOrderNumber(state.orderNumber);
            setOpen(true);
            return;
          }
          if (state.terminalFailure) {
            clearTrackingCookie();
            return;
          }
        } else if (response.status === 404) {
          return;
        }
      } catch {
        // A temporary network failure should not prevent a later payment callback check.
      }
      timer = setTimeout(check, 2000);
    };

    void check();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4" role="dialog" aria-modal="true" aria-labelledby="order-success-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl text-green-700">✓</div>
        <h2 id="order-success-title" className="mt-4 text-2xl font-black text-brand-ink">Order received</h2>
        <p className="mt-2 text-neutral-700">Your order <strong>{orderNumber}</strong> has gone through successfully and is now with our dispatch team.</p>
        <p className="mt-2 text-sm text-neutral-500">We will update you when your rider leaves with the order.</p>
        <button type="button" onClick={() => setOpen(false)} className="mt-6 w-full rounded-xl bg-brand-deep px-5 py-3 font-black text-white">Continue shopping</button>
      </div>
    </div>
  );
}
