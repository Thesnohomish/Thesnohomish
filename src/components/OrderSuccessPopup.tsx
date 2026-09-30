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
  const [failure, setFailure] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const hasTrackingCookie = () => document.cookie.split(';').some(part => part.trim().startsWith('snohomish_order_token='));
    const clearTrackingCookie = () => {
      document.cookie = 'snohomish_order_token=; Max-Age=0; path=/; SameSite=Lax';
    };

    const check = async () => {
      if (stopped) return;
      if (!hasTrackingCookie()) {
        timer = setTimeout(check, 1500);
        return;
      }

      try {
        const response = await fetch('/api/checkout/status', { cache: 'no-store' });
        if (response.ok) {
          const state = await response.json() as OrderState;
          if (state.ready && state.orderNumber) {
            localStorage.removeItem('chupahub-cart');
            window.dispatchEvent(new Event('chupahub-cart-updated'));
            clearTrackingCookie();
            window.dispatchEvent(new Event('snohomish-payment-paid'));
            setFailure('');
            setOrderNumber(state.orderNumber);
            setOpen(true);
            return;
          }
          if (state.terminalFailure) {
            clearTrackingCookie();
            window.dispatchEvent(new CustomEvent('snohomish-payment-failed', { detail: state }));
            setOrderNumber(state.orderNumber || '');
            setFailure(state.paymentStatus === 'cancelled' ? 'You cancelled the M-Pesa payment.' : state.paymentStatus === 'timed_out' ? 'The M-Pesa payment prompt timed out.' : 'The M-Pesa payment was not completed.');
            setOpen(true);
            return;
          }
        }
      } catch {
        // Temporary network errors are retried below.
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
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl ${failure ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{failure ? '!' : '✓'}</div>
        <h2 id="order-success-title" className="mt-4 text-2xl font-black text-brand-ink">{failure ? 'Payment not completed' : 'Order received'}</h2>
        <p className="mt-2 text-neutral-700">{failure ? <>{failure} Your cart is saved so you can try again.</> : <>Your order <strong>{orderNumber}</strong> has gone through successfully and is now with our dispatch team.</>}</p>
        {!failure && <p className="mt-2 text-sm text-neutral-500">We will update you when your rider leaves with the order.</p>}
        <button type="button" onClick={() => setOpen(false)} className="mt-6 w-full rounded-xl bg-brand-deep px-5 py-3 font-black text-white">{failure ? 'Back to checkout' : 'Continue shopping'}</button>
      </div>
    </div>
  );
}
