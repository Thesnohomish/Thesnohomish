'use client';

import { useState } from 'react';
import { SmartImage } from '@/components/SmartImage';
import { ProductImage } from '@/components/ProductImage';

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] || '/placeholder-product.png';
  return <div className="min-w-0">
    <div className="product-detail-image group relative mx-auto w-full overflow-hidden rounded-2xl bg-white ring-1 ring-orange-100">
      <ProductImage src={current} alt={name} sizes="(max-width: 768px) 92vw, 560px" priority className="h-full" />
    </div>
    {images.length > 1 && <div className="mt-3 flex gap-3 overflow-x-auto pb-1" aria-label="Product images">
      {images.map((image, index) => <button key={image} type="button" onClick={() => setActive(index)} aria-label={`View image ${index + 1}`} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white ring-2 ${active === index ? 'ring-brand-orange' : 'ring-orange-100'}`}><SmartImage src={image} alt={`${name} image ${index + 1}`} sizes="64px" fit="contain" className="p-1" /></button>)}
    </div>}
  </div>;
}
