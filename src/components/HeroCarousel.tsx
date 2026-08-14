import Link from 'next/link';
import type { DbBanner } from '@/lib/supabase';
import { SmartImage } from '@/components/SmartImage';

const BANNERS_PER_PAGE = 2;

export function HeroCarousel({ banners }: { banners: DbBanner[] }) {
  const banner = banners[0];

  if (!banner) {
    return <section className="mx-auto mt-4 rounded-3xl border border-dashed border-orange-200 bg-white p-10 text-center shadow-card"><h1 className="text-2xl font-black text-brand-ink">No active homepage banner</h1><p className="mt-2 text-neutral-600">Upload and publish a banner in the admin to display it here.</p></section>;
  }

  // The desktop artwork must remain the desktop source. Previously preferring
  // the mobile asset at every breakpoint made narrow mobile compositions look
  // like a small rectangle inside the wide desktop frame.
  const image = banner.image_url || banner.mobile_image_url || '/premium-spirits-banner.svg';
  const title = banner.title || 'The Snohomish promotion';

  return (
    <section aria-label="The Snohomish promotion" className="hero-carousel relative mt-3 w-full overflow-hidden rounded-2xl bg-neutral-900 shadow-card sm:mt-5 sm:rounded-3xl">
      <Link href={banner.button_url || '/shop'} title={title} className="relative block aspect-[16/7] w-full max-h-[360px] cursor-pointer overflow-hidden rounded-[inherit] bg-[#171717] focus-ring sm:aspect-[4/1] lg:aspect-[11/2]">
        <SmartImage src={image} alt={title} sizes="100vw" position="right center" priority quality={100} fit="cover" className="hero-image" />
      </Link>
    </section>
  );
}
