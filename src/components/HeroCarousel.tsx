"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DbBanner } from "@/lib/supabase";
import { SmartImage } from "@/components/SmartImage";

const BANNERS_PER_PAGE = 3;

// Replace these existing campaigns only; later admin uploads take precedence.
const campaignReplacements: Record<string, Pick<DbBanner, 'title' | 'image_url' | 'mobile_image_url' | 'button_url'>> = {
  'c57e9519-258d-4549-923b-df5c5c78a21c-chatgpt-image-sep-30-2026-01-52-43-pm-1.webp': {
    title: 'Jack Daniel’s Old No. 7 — 1 litre at KSh 3,400',
    image_url: '/campaigns/jack-daniels-1l-3400-buy-now.webp',
    mobile_image_url: '/campaigns/jack-daniels-1l-3400-buy-now.webp',
    button_url: '/collections/jack-daniels',
  },
  '6a82ae14-012d-475f-9d41-ab17319f32c6-glenbrynth-exact-products-hero-1500x375.webp': {
    title: 'Home of Single Malts — Buy now',
    image_url: '/campaigns/home-of-single-malts-buy-now.webp',
    mobile_image_url: '/campaigns/home-of-single-malts-buy-now.webp',
    button_url: '/collections/single-malts',
  },
};

export function HeroCarousel({ banners }: { banners: DbBanner[] }) {
  const visibleBanners = banners.slice(0, BANNERS_PER_PAGE).map((banner) => {
    const filename = banner.image_url?.split('/').pop() || '';
    const replacement = campaignReplacements[filename];
    return replacement ? { ...banner, ...replacement } : banner;
  });
  if (visibleBanners.some(slide => slide.image_url.startsWith('/campaigns/')) && visibleBanners.length < BANNERS_PER_PAGE) {
    visibleBanners.push({ id: 'tequila-discounts-campaign', title: 'Discounts on all tequilas', image_url: '/campaigns/tequila-discounts-buy-now.webp', button_url: '/collections/tequilas', is_active: true });
  }
  const [activeSlide, setActiveSlide] = useState(0);
  useEffect(() => {
    if (visibleBanners.length < 2) return;
    const timer = setInterval(() => setActiveSlide(index => (index + 1) % visibleBanners.length), 6000);
    return () => clearInterval(timer);
  }, [visibleBanners.length]);
  const currentSlide = activeSlide % (visibleBanners.length || 1);
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
      <div className="relative aspect-[5/2] w-full overflow-hidden bg-[#07121e] sm:rounded-[inherit]">
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
              className={`hero-slide absolute inset-0 block cursor-pointer overflow-hidden rounded-[inherit] focus-ring transition-opacity duration-700 ${index === currentSlide ? "z-10 opacity-100" : "invisible pointer-events-none opacity-0"}`}
              aria-hidden={index !== currentSlide}
              tabIndex={index === currentSlide ? 0 : -1}
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
                  className="hero-image"
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
                  className="hero-image"
                />
              </span>
            </Link>
          );
        })}
        {visibleBanners.length > 1 && <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full bg-black/50 px-2 py-1">
          {visibleBanners.map((slide, index) => <button key={slide.id} type="button" aria-label={`Show ${slide.title}`} aria-pressed={index === currentSlide} onClick={() => setActiveSlide(index)} className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index === currentSlide ? 'bg-white text-black' : 'text-white hover:bg-white/20'}`}>{index + 1}</button>)}
        </div>}
      </div>
    </section>
  );
}
