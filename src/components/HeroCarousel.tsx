'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { DbBanner } from '@/lib/supabase';
import { SmartImage } from '@/components/SmartImage';

export function HeroCarousel({ banners }: { banners: DbBanner[] }) {
  const [current, setCurrent] = useState(0), [paused, setPaused] = useState(false);

  useEffect(() => { if (current >= banners.length) setCurrent(0); }, [current, banners.length]);
  useEffect(() => {
    if (banners.length < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setCurrent(index => (index + 1) % banners.length), 5000);
    return () => window.clearInterval(timer);
  }, [banners.length, paused]);

  if (!banners.length) {
    return <section className="mx-auto mt-4 rounded-3xl border border-dashed border-orange-200 bg-white p-10 text-center shadow-card"><h1 className="text-2xl font-black text-brand-ink">No active homepage banner</h1><p className="mt-2 text-neutral-600">Upload and publish a banner in the admin to display it here.</p></section>;
  }

  const banner = banners[current] || banners[0];
  const image = banner.mobile_image_url || banner.image_url || '/premium-spirits-banner.svg';
  const title = banner.title || 'The Snohomish promotion';
  const move = (direction: number) => setCurrent(index => (index + direction + banners.length) % banners.length);

  return (
    <section onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)} aria-roledescription="carousel" aria-label="The Snohomish promotions" className="hero-carousel relative mx-4 mt-3 max-w-6xl overflow-hidden rounded-2xl bg-neutral-900 shadow-card sm:mx-8 sm:mt-5 sm:rounded-3xl xl:mx-auto">
      <Link key={banner.id} href={banner.button_url || '/shop'} title={title} className="relative block aspect-[16/7] w-full cursor-pointer overflow-hidden rounded-[inherit] bg-[#171717] focus-ring sm:aspect-[4/1] lg:aspect-[24/5]">
        <SmartImage src={image} alt={title} sizes="(max-width: 1280px) 94vw, 1152px" priority={current === 0} quality={100} fit="contain" className="hero-image" />
      </Link>
      {banners.length > 1 && <>
        <button type="button" onClick={() => move(-1)} aria-label="Previous promotion" className="absolute left-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/60 text-white backdrop-blur transition hover:bg-black/80"><ChevronLeft size={20}/></button>
        <button type="button" onClick={() => move(1)} aria-label="Next promotion" className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/60 text-white backdrop-blur transition hover:bg-black/80"><ChevronRight size={20}/></button>
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/45 px-2.5 py-1.5 backdrop-blur" aria-label="Choose promotion">{banners.map((item, index) => <button key={item.id} type="button" onClick={() => setCurrent(index)} aria-label={`Show promotion ${index + 1}`} aria-current={index === current ? 'true' : undefined} className={`h-1.5 rounded-full transition-all ${index === current ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'}`}/>)}</div>
      </>}
    </section>
  );
}
