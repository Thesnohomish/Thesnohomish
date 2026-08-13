import Link from 'next/link';
import type { DbBanner } from '@/lib/supabase';
import { SmartImage } from '@/components/SmartImage';

export function HeroCarousel({ banners }: { banners: DbBanner[] }) {
  // Banners are already returned in admin display order. Keep the established
  // responsive hero frame and place the first two promotions inside it.
  const visibleBanners = banners.slice(0, 2);

  if (!visibleBanners.length) {
    return <section className="mx-auto mt-4 rounded-3xl border border-dashed border-orange-200 bg-white p-10 text-center shadow-card"><h1 className="text-2xl font-black text-brand-ink">No active homepage banner</h1><p className="mt-2 text-neutral-600">Upload and publish a banner in the admin to display it here.</p></section>;
  }

  return (
    <section aria-label="The Snohomish promotions" className="hero-carousel relative mx-3 mt-3 max-w-7xl overflow-hidden rounded-2xl bg-neutral-900 shadow-card sm:mx-5 sm:mt-5 sm:rounded-3xl xl:mx-auto">
      <div className={`grid aspect-[16/9] w-full gap-2 p-2 sm:aspect-[3/1] sm:grid-cols-2 sm:p-2 lg:aspect-[24/5] ${visibleBanners.length === 1 ? 'grid-rows-1' : 'grid-rows-2 sm:grid-rows-1'}`}>
        {visibleBanners.map((banner, index) => {
          const image = banner.mobile_image_url || banner.image_url || '/premium-spirits-banner.svg';
          const title = banner.title || 'The Snohomish promotion';
          return (
            <Link
              key={banner.id}
              href={banner.button_url || '/shop'}
              title={title}
              className="group relative min-h-0 min-w-0 cursor-pointer overflow-hidden rounded-xl bg-neutral-900 focus-ring"
            >
              <SmartImage src={image} alt={title} sizes="(max-width: 639px) 100vw, 50vw" priority={index === 0} quality={100} fit="contain" className="hero-image" />
              <span className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/10 to-transparent" aria-hidden="true" />
              <span className="absolute inset-y-0 left-0 z-10 flex max-w-[70%] flex-col justify-center px-4 py-3 text-white sm:px-6">
                <strong className="text-sm font-black sm:text-lg lg:text-2xl">{title}</strong>
                {banner.subtitle && <span className="mt-1 line-clamp-2 text-[10px] leading-4 text-white/90 sm:text-xs">{banner.subtitle}</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
