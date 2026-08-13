import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { DbBanner } from '@/lib/supabase';
import { SmartImage } from '@/components/SmartImage';

const BANNERS_PER_PAGE = 2;

export function HeroCarousel({ banners }: { banners: DbBanner[] }) {
  const pages = useMemo(() => Array.from({ length: Math.ceil(banners.length / BANNERS_PER_PAGE) }, (_, index) => banners.slice(index * BANNERS_PER_PAGE, index * BANNERS_PER_PAGE + BANNERS_PER_PAGE)), [banners]);
  const [page, setPage] = useState(0), [paused, setPaused] = useState(false);

  useEffect(() => { if (page >= pages.length) setPage(0); }, [page, pages.length]);
  useEffect(() => {
    if (pages.length < 2 || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setPage(current => (current + 1) % pages.length), 5000);
    return () => window.clearInterval(timer);
  }, [pages.length, paused]);

  if (!banners.length) {
    return <section className="mx-auto mt-4 rounded-3xl border border-dashed border-orange-200 bg-white p-10 text-center shadow-card"><h1 className="text-2xl font-black text-brand-ink">No active homepage banner</h1><p className="mt-2 text-neutral-600">Upload and publish a banner in the admin to display it here.</p></section>;
  }

  const visibleBanners = pages[page] || pages[0];
  const move = (direction: number) => setPage(current => (current + direction + pages.length) % pages.length);

  return (
    <section onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)} onTouchStart={() => setPaused(true)} onTouchEnd={() => setPaused(false)} aria-roledescription="carousel" aria-label="The Snohomish promotions" className="hero-carousel relative mx-3 mt-3 max-w-7xl overflow-hidden rounded-2xl bg-neutral-900 shadow-card sm:mx-5 sm:mt-5 sm:rounded-3xl xl:mx-auto">
      <div key={page} className={`grid aspect-[16/9] w-full animate-[hero-pair-in_.45s_ease-out] gap-2 p-2 sm:aspect-[3/1] sm:grid-cols-2 lg:aspect-[24/5] ${visibleBanners.length === 1 ? 'grid-rows-1' : 'grid-rows-2 sm:grid-rows-1'}`}>
        {visibleBanners.map((banner, index) => {
          const image = banner.mobile_image_url || banner.image_url || '/premium-spirits-banner.svg';
          const title = banner.title || 'The Snohomish promotion';
          return <Link key={banner.id} href={banner.button_url || '/shop'} title={title} className="group relative min-h-0 min-w-0 cursor-pointer overflow-hidden rounded-xl border border-white/15 bg-[#171717] focus-ring">
            <SmartImage src={image} alt={title} sizes="(max-width: 639px) 100vw, 50vw" priority={page === 0 && index === 0} quality={100} fit="contain" className="hero-image" />
          </Link>;
        })}
      </div>
      {pages.length > 1 && <>
        <button type="button" onClick={() => move(-1)} aria-label="Previous promotions" className="absolute left-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/60 text-white backdrop-blur transition hover:bg-black/80"><ChevronLeft size={20}/></button>
        <button type="button" onClick={() => move(1)} aria-label="Next promotions" className="absolute right-3 top-1/2 z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-white/30 bg-black/60 text-white backdrop-blur transition hover:bg-black/80"><ChevronRight size={20}/></button>
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/45 px-2.5 py-1.5 backdrop-blur" aria-label="Choose promotion pair">{pages.map((_, index) => <button key={index} type="button" onClick={() => setPage(index)} aria-label={`Show promotion pair ${index + 1}`} aria-current={index === page ? 'true' : undefined} className={`h-1.5 rounded-full transition-all ${index === page ? 'w-5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'}`}/>)}</div>
      </>}
    </section>
  );
}
