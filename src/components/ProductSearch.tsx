'use client';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { money } from '@/lib/supabase';
type Suggestion = { id: string; name: string; slug: string; price: number; bottle_size?: string };
export function ProductSearch({ className = '', placeholder = 'Search wines, spirits, beers, mixers and brands...' }: { className?: string; placeholder?: string }) {
  const [query, setQuery] = useState(''), [results, setResults] = useState<Suggestion[]>([]), [open, setOpen] = useState(false), [active, setActive] = useState(-1), [status, setStatus] = useState('');
  const id = useId(), root = useRef<HTMLFormElement>(null), router = useRouter();
  useEffect(() => {
    function close(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener('pointerdown', close); return () => document.removeEventListener('pointerdown', close);
  }, []);
  useEffect(() => {
    setResults([]); setActive(-1);
    if (query.trim().length < 2) { setStatus(''); return; }
    const controller = new AbortController(); setStatus('Searching…');
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Search unavailable');
        const data = await response.json();
        if (!controller.signal.aborted) { setResults(data.products); setStatus(data.products.length ? '' : 'No close matches. Try another name.'); }
      } catch { if (!controller.signal.aborted) setStatus('Press Enter to search all products.'); }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);
  return <form ref={root} action="/search" className={`relative ${className}`} onSubmit={event => {
    setOpen(false);
    if (active >= 0 && results[active]) { event.preventDefault(); router.push(`/product/${results[active].slug}`); }
  }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <Search className="pointer-events-none absolute left-3 top-3 text-sno-yellow" size={18}/>
    <input name="q" value={query} onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={event => {
      if (event.key === 'Escape') { setOpen(false); setActive(-1); }
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && results.length) {
        event.preventDefault(); setOpen(true); setActive(index => event.key === 'ArrowDown' ? (index + 1) % results.length : index <= 0 ? results.length - 1 : index - 1);
      }
    }} className="header-search" placeholder={placeholder} aria-label="Search products" autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={open && query.trim().length >= 2} aria-controls={id} aria-activedescendant={active >= 0 && open ? `${id}-${active}` : undefined}/>
    {open && query.trim().length >= 2 && <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[60vh] overflow-y-auto rounded-xl border border-neutral-200 bg-white text-neutral-900 shadow-2xl">
      <ul id={id} role="listbox" aria-label="Suggested products">{results.map((p, index) => <li key={p.id} id={`${id}-${index}`} role="option" aria-selected={index === active}>
        <Link href={`/product/${p.slug}`} onClick={() => { setOpen(false); setQuery(''); }} className={`flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-yellow-50 ${index === active ? 'bg-yellow-50' : ''}`}><span className="min-w-0 font-semibold">{p.name}{p.bottle_size && <span className="block text-xs font-normal text-neutral-500">{p.bottle_size}</span>}</span><span className="shrink-0 text-xs font-bold">{money(p.price)}</span></Link>
      </li>)}</ul>
      {status && <p role="status" className="px-4 py-3 text-sm text-neutral-600">{status}</p>}
      <Link href={`/search?q=${encodeURIComponent(query.trim())}`} onClick={() => setOpen(false)} className="block border-t border-neutral-100 px-4 py-3 text-sm font-bold text-neutral-800 hover:bg-yellow-50">View all results →</Link>
    </div>}
  </form>;
}
