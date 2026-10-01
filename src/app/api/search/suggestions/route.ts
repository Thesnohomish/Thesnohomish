import { NextResponse } from 'next/server';
import { getHomepageProducts, effectivePrice } from '@/lib/supabase';
import { searchProducts } from '@/lib/product-search';
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim().slice(0, 100) || '';
  if (q.length < 2) return NextResponse.json({ products: [] });
  const products = searchProducts(await getHomepageProducts(), q).slice(0, 7).map(p => ({ id: p.id, name: p.name, slug: p.slug, price: effectivePrice(p), bottle_size: p.bottle_size }));
  return NextResponse.json({ products });
}
