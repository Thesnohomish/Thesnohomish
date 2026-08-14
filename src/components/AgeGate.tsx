'use client';

import { useEffect, useState } from 'react';

const AGE_KEY = 'snohomish-age-confirmed';

export function AgeGate() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(localStorage.getItem(AGE_KEY) !== 'yes'), []);
  if (!visible) return null;
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="age-title"><div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl"><p className="text-sm font-black uppercase tracking-[.18em] text-brand-orange">The Snohomish</p><h2 id="age-title" className="mt-3 text-3xl font-black text-brand-ink">Are you 18 or older?</h2><p className="mt-3 text-base leading-6 text-neutral-600">You must be of legal drinking age to browse and order from this store.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={()=>{localStorage.setItem(AGE_KEY,'yes');setVisible(false)}} className="rounded-xl bg-brand-orange px-5 py-3 font-black text-brand-ink">Yes, I am 18+</button><a href="https://www.google.com" className="rounded-xl border border-neutral-300 px-5 py-3 font-bold text-neutral-700">No, leave site</a></div></div></div>;
}
