import { SmartImage } from '@/components/SmartImage';

type ProductImageProps = {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
};

/** Shared, crop-free product artwork used by cards and product details. */
export function ProductImage({
  src,
  alt,
  sizes = '(max-width: 639px) 33vw, (max-width: 767px) 19vw, (max-width: 1279px) 14vw, 12.5vw',
  priority = false,
  className = '',
}: ProductImageProps) {
  return (
    <div className={`product-image-container ${className}`}>
      <SmartImage
        src={src}
        alt={alt}
        sizes={sizes}
        priority={priority}
        quality={100}
        fit="contain"
        className="product-image"
      />
    </div>
  );
}
