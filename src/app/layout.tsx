import type { Metadata } from 'next';
import './globals.css';
import { Footer, Header } from '@/components/Site';
import { CartFeedback } from '@/components/CartFeedback';
import { AgeGate } from '@/components/AgeGate';
import { OrderSuccessPopup } from '@/components/OrderSuccessPopup';
import { getCategories, getSiteContent } from '@/lib/supabase';
import { businessGraph, DEFAULT_DESCRIPTION, JsonLd, SITE_NAME, SITE_URL } from '@/lib/seo';
import { getSupabaseConfig, serializeSupabaseConfig } from '@/lib/supabase-config';

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'The Snohomish | Wines, Spirits, Retail & Wholesale Nairobi',
    template: '%s | The Snohomish',
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'Alcohol Delivery Nairobi',
    'Online Alcohol Delivery',
    'Drinks Delivery Kenya',
    'Liquor Delivery Nairobi',
    'Wine Delivery Nairobi',
    'Whisky Delivery Nairobi',
    'Gin Delivery Nairobi',
    'Beer Delivery Nairobi',
    'Wholesale Drinks Nairobi',
    'Trade Beverage Supplier',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: 'The Snohomish | Wines, Spirits, Retail & Wholesale Nairobi',
    description: DEFAULT_DESCRIPTION,
    type: 'website', url: SITE_URL, siteName: SITE_NAME, locale: 'en_KE',
  },
  twitter: { card: 'summary_large_image', title: 'The Snohomish | Wines, Spirits, Retail & Wholesale Nairobi', description: DEFAULT_DESCRIPTION },
  icons: {
    icon: [{ url: '/the-snohomish-logo.svg', type: 'image/svg+xml', sizes: 'any' }],
    shortcut: '/the-snohomish-logo.svg',
    apple: [{ url: '/the-snohomish-logo.svg', type: 'image/svg+xml', sizes: 'any' }],
  },
  manifest: '/site.webmanifest',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
};

export function generateMetadata(): Metadata {
  return {
    ...baseMetadata,
    openGraph: { ...baseMetadata.openGraph, images: [{ url: '/the-snohomish-logo.svg', alt: 'The Snohomish logo' }] },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Keep the global shell light: categories are enough for navigation. Shipping
  // the full catalogue here made every page download and hydrate every product.
  const [content, categories] = await Promise.all([getSiteContent(), getCategories()]);
  const publicSupabaseConfig = serializeSupabaseConfig(getSupabaseConfig());
  return (
    <html lang="en">
      <head><script dangerouslySetInnerHTML={{ __html: `window.__SNOHOMISH_SUPABASE__=${publicSupabaseConfig}` }} /></head>
      <body className="app-shell min-h-screen">
        <AgeGate />
        <Header content={content} categories={categories} />
        <CartFeedback />
        <OrderSuccessPopup />
        <JsonLd data={businessGraph([content.instagram_url || '', content.facebook_url || '', content.tiktok_url || ''])} />
        {children}
        <Footer content={content} />
      </body>
    </html>
  );
}
