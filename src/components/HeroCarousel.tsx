import Link from 'next/link';
import type { DbBanner } from '@/lib/supabase';
import { SmartImage } from '@/components/SmartImage';

export function HeroCarousel({ banners }: { banners: DbBanner[] }) {
  const banner = banners[0];

  if (!banner) {
    return <section className="mx-auto mt-4 rounded-3xl border border-dashed border-orange-200 bg-white p-10 text-center shadow-card"><h1 className="text-2xl font-black text-brand-ink">No active homepage banner</h1><p className="mt-2 text-neutral-600">Upload and publish a banner in the admin to display it here.</p></section>;
  }

  const image = banner.mobile_image_url || banner.image_url || '/premium-spirits-banner.svg';
  const title = banner.title || 'The Snohomish promotion';

  return (
    <section aria-label="The Snohomish promotion" className="hero-carousel relative mx-4 mt-3 max-w-6xl overflow-hidden rounded-2xl bg-neutral-900 shadow-card sm:mx-8 sm:mt-5 sm:rounded-3xl xl:mx-auto">
      <Link href={banner.button_url || '/shop'} title={title} className="relative block aspect-[16/7] w-full cursor-pointer overflow-hidden rounded-[inherit] bg-[#171717] focus-ring sm:aspect-[4/1] lg:aspect-[24/5]">
        <SmartImage src={image} alt={title} sizes="(max-width: 1280px) 94vw, 1152px" priority quality={100} fit="contain" className="hero-image" />
      </Link>
    </section>
  );
}
