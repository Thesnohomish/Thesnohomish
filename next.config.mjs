const categoryRedirects = ['beer', 'wine', 'whisky', 'gin', 'vodka', 'champagne', 'spirits', 'mixers', 'brandy', 'tequila', 'rum', 'liqueur', 'liqueurs', 'sparkling', 'snacks'];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    // Faster cold-start encoding and support for older Safari versions.
    formats: ['image/webp'],
    qualities: [64, 68, 72, 88, 95, 100],
    minimumCacheTTL: 86400,
  },
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: '(?:www\\.)?chupahub\\.com' }],
        destination: 'https://thesnohomish.com/:path*',
        permanent: true,
      },
      ...categoryRedirects.map((slug) => ({
        source: `/category/${slug}`,
        destination: `/${slug === 'liqueurs' ? 'liqueur' : slug}`,
        permanent: true,
      })),
    ];
  },
};
export default nextConfig;
