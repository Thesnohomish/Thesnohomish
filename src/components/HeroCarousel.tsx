import Link from "next/link";
import type { DbBanner } from "@/lib/supabase";
import { SmartImage } from "@/components/SmartImage";

const BANNERS_PER_PAGE = 2;

// Replace these existing campaigns only; later admin uploads take precedence.
const campaignReplacements: Record<string, Pick<DbBanner, 'title' | 'image_url' | 'mobile_image_url' | 'button_url'>> = {
  'c57e9519-258d-4549-923b-df5c5c78a21c-chatgpt-image-sep-30-2026-01-52-43-pm-1.webp': {
    title: 'Jack Daniel’s Old No. 7 — 1 litre at KSh 3,400',
    image_url: '/campaigns/jack-daniels-1l-3400.webp',
    mobile_image_url: '/campaigns/jack-daniels-1l-3400.webp',
    button_url: '/product/jack-daniel-s-1-litre',
  },
  '6a82ae14-012d-475f-9d41-ab17319f32c6-glenbrynth-exact-products-hero-1500x375.webp': {
    title: 'Single Malt Heaven',
    image_url: '/campaigns/home-of-single-malts.webp',
    mobile_image_url: '/campaigns/home-of-single-malts.webp',
    button_url: '/shop',
  },
};

export function HeroCarousel({ banners }: { banners: DbBanner[] }) {
  const visibleBanners = banners.slice(0, BANNERS_PER_PAGE).map((banner) => {
    const filename = banner.image_url?.split('/').pop() || '';
    const replacement = campaignReplacements[filename];
    return replacement ? { ...banner, ...replacement } : banner;
  });
  const banner = visibleBanners[0];

  if (!banner) {
    return (
      <section className="mx-auto mt-4 rounded-3xl border border-dashed border-orange-200 bg-white p-10 text-center shadow-card">
        <h1 className="text-2xl font-black text-brand-ink">
          No active homepage banner
        </h1>
        <p className="mt-2 text-neutral-600">
          Upload and publish a banner in the admin to display it here.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="The Snohomish promotion"
      className="hero-carousel relative mx-auto w-full max-w-[1500px] overflow-hidden bg-white shadow-card sm:mt-5 sm:w-[calc(100%-2rem)] sm:rounded-3xl"
    >
      <div className="relative aspect-[4/1] w-full overflow-hidden bg-white sm:rounded-[inherit]">
        {visibleBanners.map((slide, index) => {
          const desktopImage =
            slide.image_url ||
            slide.mobile_image_url ||
            "/premium-spirits-banner.svg";
          const mobileImage = slide.mobile_image_url || desktopImage;
          const title = slide.title || "The Snohomish promotion";
          return (
            <Link
              key={slide.id}
              href={slide.button_url || "/shop"}
              title={title}
              aria-label={title}
              className={`hero-slide absolute inset-0 block cursor-pointer overflow-hidden rounded-[inherit] focus-ring ${visibleBanners.length > 1 ? "hero-slide-animated" : ""}`}
              style={{ "--hero-slide-index": index } as React.CSSProperties}
            >
              <span className="relative hidden h-full w-full sm:block">
                <SmartImage
                  src={desktopImage}
                  alt={title}
                  sizes="(min-width: 1532px) 1500px, calc(100vw - 2rem)"
                  position="center"
                  priority={index === 0}
                  quality={72}
                  fit="contain"
                  className={`hero-image ${visibleBanners.length > 1 ? "hero-image-transition" : ""}`}
                />
              </span>
              <span className="relative block h-full w-full sm:hidden">
                <SmartImage
                  src={mobileImage}
                  alt={title}
                  sizes="100vw"
                  position="center"
                  priority={index === 0}
                  quality={72}
                  fit="contain"
                  className={`hero-image hero-image-mobile ${visibleBanners.length > 1 ? "hero-image-transition" : ""}`}
                />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
