import Link from 'next/link';
import type { DbBanner } from '@/lib/supabase';
import { SmartImage } from '@/components/SmartImage';

const BANNERS_PER_PAGE = 2;

export function HeroCarousel({ banners }: { banners: DbBanner[] }) {
  const visibleBanners = banners.slice(0, BANNERS_PER_PAGE);
  const banner = visibleBanners[0];

  if (!banner) {
    return <section className="mx-auto mt-4 rounded-3xl border border-dashed border-orange-200 bg-white p-10 text-center shadow-card"><h1 className="text-2xl font-black text-brand-ink">No active homepage banner</h1><p className="mt-2 text-neutral-600">Upload and publish a banner in the admin to display it here.</p></section>;
  }

  return (
    <section aria-label="The Snohomish promotion" className="hero-carousel relative mx-4 mt-3 w-auto max-w-[1500px] overflow-hidden rounded-2xl bg-neutral-900 shadow-card sm:mx-6 sm:mt-5 sm:rounded-3xl xl:mx-auto">
      <div className="relative aspect-[16/7] w-full max-h-[375px] overflow-hidden rounded-[inherit] bg-[#171717] sm:aspect-[7/2] lg:aspect-[4/1]">
        {visibleBanners.map((slide, index) => {
          const image = slide.image_url || slide.mobile_image_url || '/premium-spirits-banner.svg';
          const title = slide.title || 'The Snohomish promotion';
          return <Link key={slide.id} href={slide.button_url || '/shop'} title={title} aria-label={title} className={`hero-slide absolute inset-0 block cursor-pointer overflow-hidden rounded-[inherit] focus-ring ${visibleBanners.length > 1 ? 'hero-slide-animated' : ''}`} style={{ '--hero-slide-index': index } as React.CSSProperties}>
            <SmartImage src={image} alt={title} sizes="100vw" position="right center" priority={index === 0} quality={100} fit="cover" className="hero-image" />
          </Link>;
        })}
      </div>
    </section>
  );
}
