import Image from 'next/image';

type SmartImageProps = { src: string; alt: string; sizes: string; className?: string; fit?: 'cover' | 'contain'; position?: string; priority?: boolean; quality?: number };

/** Consistent responsive rendering for every customer-facing merchandise image. */
export function SmartImage({ src, alt, sizes, className = '', fit = 'cover', position = '50% 50%', priority = false, quality = 72 }: SmartImageProps) {
  return <Image fill src={src} alt={alt} sizes={sizes} quality={quality} priority={priority} loading={priority ? 'eager' : 'lazy'} placeholder="blur" blurDataURL="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmNWY1ZjMiLz48L3N2Zz4=" className={`${fit === 'cover' ? 'object-cover' : 'object-contain'} ${className}`} style={{ objectPosition: position }} />;
}
