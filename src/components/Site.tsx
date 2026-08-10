'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Heart, Menu, Search, ShoppingBag, UserCircle } from 'lucide-react';
import { DbCategory, DbProduct, effectivePrice, imageFor, money, SiteContent } from '@/lib/supabase';
import { readCart, writeCart } from '@/lib/cart';
import { BrandLogo } from '@/components/BrandLogo';
import { SmartImage } from '@/components/SmartImage';

function animateProductToCart(source: HTMLButtonElement) {
  const image = source.parentElement?.querySelector('img'), cart = document.querySelector('[data-cart-icon]');
  if (!image || !cart || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const from = image.getBoundingClientRect(), to = cart.getBoundingClientRect(), clone = image.cloneNode(true) as HTMLImageElement;
  Object.assign(clone.style, { position: 'fixed', zIndex: '80', pointerEvents: 'none', objectFit: 'contain', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, transition: 'transform 600ms cubic-bezier(.2,.8,.2,1), opacity 600ms ease' });
  document.body.appendChild(clone);
  requestAnimationFrame(() => { clone.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(.12)`; clone.style.opacity = '0.2'; });
  window.setTimeout(() => clone.remove(), 650);
}

function searchScore(product: DbProduct, query: string) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const name = product.name.toLowerCase();
  const searchable = `${name} ${product.brands?.name || ''} ${product.categories?.name || ''} ${product.description || ''} ${product.bottle_size || ''} ${(product.product_variants || []).map(variant => variant.name).join(' ')}`.toLowerCase();
  if (!words.every(word => searchable.includes(word))) return -1;
  return words.reduce((score, word) => score + (name.startsWith(word) ? 10 : name.split(/\s+/).some(part => part.startsWith(word)) ? 6 : name.includes(word) ? 3 : 1), 0);
}

export function Header({ content = {}, products = [] }: { content?: SiteContent; products?: DbProduct[] }) {
  const [cart, setCart] = useState<{ count: number; total: number }>({ count: 0, total: 0 }), [query, setQuery] = useState(''), [menuOpen, setMenuOpen] = useState(false);
  const refresh = () => { try { const items = JSON.parse(localStorage.getItem('chupahub-cart') || '[]'); setCart({ count: items.reduce((n:number,item:{quantity?:number}) => n + Number(item.quantity || 0), 0), total: items.reduce((n:number,item:{quantity?:number;price?:number}) => n + Number(item.quantity || 0) * Number(item.price || 0), 0) }); } catch { setCart({ count: 0, total: 0 }); } };
  useEffect(() => { refresh(); window.addEventListener('chupahub-cart-updated', refresh); return () => window.removeEventListener('chupahub-cart-updated', refresh); }, []);
  const links = [['Shop','/shop'],['Categories','/shop#categories'],['Retail Stores','/#stores'],['Wholesale','/#wholesale'],['Deals','/offers'],['Mega Drive-Through','/#mega-drive-through'],['About','/about'],['Contact','/contact']];
  const suggestions = query.trim().length < 1 ? [] : products.map(product => ({ product, score: searchScore(product, query) })).filter(result => result.score >= 0).sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name)).slice(0, 6).map(result => result.product);
  return <header className="sno-header sticky top-0 z-40">
    <div className="announcement"><div className="announcement-track"><span>{content.header_notice || "NAIROBI'S PREMIUM DISTRIBUTOR • RETAIL • WHOLESALE • FAST DELIVERY"}</span><span aria-hidden="true">{content.header_notice || "NAIROBI'S PREMIUM DISTRIBUTOR • RETAIL • WHOLESALE • FAST DELIVERY"}</span></div></div>
    <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:px-8"><button className="menu-button lg:hidden" onClick={()=>setMenuOpen(v=>!v)} aria-expanded={menuOpen} aria-label="Open navigation"><Menu/></button><Link href="/" aria-label="The Snohomish home"><BrandLogo/></Link><nav className="ml-5 hidden gap-5 text-xs font-bold text-white/80 lg:flex">{links.slice(0,6).map(([label,href])=><Link key={href} href={href} className="hover:text-sno-yellow">{label}</Link>)}</nav><div className="relative ml-auto hidden w-full max-w-sm md:block"><Search className="absolute left-3 top-3 text-sno-yellow" size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} className="header-search" placeholder="Search wines, spirits, beers, mixers and brands..." aria-label="Search products"/>{suggestions.length>0&&<div className="search-results">{suggestions.map(p=><Link key={p.id} href={`/product/${p.slug}`} onClick={()=>setQuery('')}><img src={imageFor(p)} alt=""/><span><b>{p.name}</b><small>{money(p.product_variants?.[0]?.price??p.price)}</small></span></Link>)}</div>}</div><div className="header-icons"><Link href="/wishlist" aria-label="Wishlist"><Heart/></Link><Link href="/account" aria-label="Account"><UserCircle/></Link><Link href="/checkout" data-cart-icon className="cart-link" aria-label={`Cart with ${cart.count} items`}><ShoppingBag/><b>{cart.count}</b><span>{money(cart.total)}</span></Link></div></div>
    <div className="px-4 pb-3 md:hidden"><div className="relative"><Search className="absolute left-3 top-3 text-sno-yellow" size={18}/><form action="/search"><input name="q" className="header-search" placeholder="Search wines, spirits, beers..."/></form></div></div>
    {menuOpen&&<nav className="mobile-nav">{links.map(([label,href])=><Link onClick={()=>setMenuOpen(false)} key={href} href={href}>{label}</Link>)}</nav>}
  </header>;
}
export function Footer({ content = {} }: { content?: SiteContent; products?: DbProduct[] }) {
  const columns = [
    ['Shop',[['Shop All','/shop'],['Deals','/offers'],['New Arrivals','/collections/new-arrivals'],['Categories','/shop#categories']]],
    ['Business',[['Wholesale','/#wholesale'],['Trade Accounts','/contact?subject=trade-account'],['Bulk Orders','/contact?subject=bulk-order'],['Corporate Orders','/contact?subject=corporate']]],
    ['Stores',[['Mautamu','/#stores'],['The Snohomish','/#stores'],['Three Amigos','/#stores'],['Mega Drive-Through — Coming Soon','/#mega-drive-through']]],
    ['Help',[['Contact','/contact'],['Delivery & Returns','/faq'],['Privacy Policy','/privacy'],['Terms','/terms']]],
  ];
  const socials=[['Instagram',content.instagram_url],['WhatsApp',content.whatsapp_url],['TikTok',content.tiktok_url],['Facebook',content.facebook_url]].filter((x):x is [string,string]=>Boolean(x[1]));
  return <footer className="sno-footer"><div className="mx-auto max-w-7xl px-5 py-16 md:px-8"><div className="grid gap-10 border-b border-white/10 pb-14 lg:grid-cols-[1fr_.7fr]"><div><BrandLogo footer/><h2>Better selection.<br/><span>Better service.</span></h2><p>{content.footer_text||'Retail, wholesale and distribution of wines, spirits and beverages across Nairobi.'}</p></div><form className="self-center"><label htmlFor="newsletter">Get the good news</label><div><input id="newsletter" type="email" placeholder="Your email address"/><button aria-label="Subscribe">→</button></div></form></div><div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">{columns.map(([heading,items])=><nav key={String(heading)}><h3>{String(heading)}</h3>{(items as string[][]).map(([label,href])=><Link key={label} href={href}>{label}</Link>)}</nav>)}<nav><h3>Social</h3>{socials.length?socials.map(([label,url])=><a key={label} href={url} target="_blank" rel="noreferrer">{label}</a>):<><span>Instagram</span><span>WhatsApp</span><span>TikTok</span><span>Facebook</span></>}</nav></div><div className="footer-bottom"><span>{content.copyright_text||`© ${new Date().getFullYear()} The Snohomish.`}</span><span>Nairobi, Kenya.</span><span>Drink responsibly · 18+ only</span></div></div></footer>;
}
export function Journal({ content = {} }: { content?: SiteContent }) {
  const title = content.journal_title || 'The Snohomish Journal';
  const intro = content.journal_intro || 'Discover practical guides to choosing wine, whisky, beer and party drinks for every Nairobi occasion. Explore responsibly, compare styles and find the right bottle for your celebration.';
  return <section className="mx-auto max-w-5xl px-4 py-10"><div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-card sm:p-8"><p className="font-bold uppercase tracking-[0.18em] text-brand-orange">Drink guides & ideas</p><h2 className="mt-2 text-3xl font-black text-brand-ink">{title}</h2><p className="mt-3 max-w-3xl leading-7 text-slate-700">{intro}</p><p className="mt-4 text-sm leading-6 text-slate-600">The Snohomish helps Nairobi customers shop wine, whisky, gin, vodka, beer, mixers and snacks with clear product details and responsible delivery information.</p></div></section>;
}

export function SeoArticle({ content = {} }: { content?: SiteContent }) {
  const title = content.article_title || "The Snohomish Deliveries – Kenya's Online Alcohol & Drinks Delivery Platform";
  const summary = content.article_summary || 'Discover wines, spirits, beers, champagne and mixers online with convenient The Snohomish delivery.';
  const body = content.article_body || `The Snohomish Deliveries is a fast, convenient online platform for ordering wines, spirits, beers, champagne, whisky, gin, vodka, tequila, rum, ciders, mixers, and other beverages for delivery across Kenya. Whether you're planning a celebration, stocking your home bar, or simply need a quick delivery, The Snohomish makes ordering drinks online simple and reliable.

If you're familiar with delivery services and retailers such as Chupa Chap, Oaks & Corks, Greenspoon, Quickmart, The Bar KE, or other well-known shops in Kenya, The Snohomish offers a convenient independent marketplace where you can discover a wide selection of drinks and have them delivered to your location.

Customers searching for terms such as:

• Chupa Chap
• Oaks & Corks
• Greenspoon
• Quickmart
• The Bar KE
• online alcohol delivery Kenya
• online drinks delivery Nairobi
• liquor delivery near me
• wine delivery Nairobi
• whisky delivery Kenya
• beer delivery
• champagne delivery
• gin delivery
• vodka delivery
• tequila delivery
• same-day alcohol delivery
• drinks delivery
• buy alcohol online
• buy wine online Kenya
• premium liquor store
• online liquor shop
• alcohol delivery service
• drinks delivered to your door

can use The Snohomish to browse products, compare options, and order quickly from one easy-to-use platform.

Our goal is to make finding and ordering your favorite drinks as easy as ordering food online. Whether you're looking for premium whisky, fine wine, craft beer, champagne, spirits, or mixers, The Snohomish provides a secure and convenient shopping experience with fast delivery and excellent customer service.

The Snohomish Deliveries is designed for customers who want a trusted alternative when searching online for alcohol delivery services in Kenya. If you're comparing online liquor stores, wine delivery, beer delivery, or drink delivery services such as Chupa Chap, Oaks & Corks, Greenspoon, Quickmart, or The Bar KE, The Snohomish is ready to help you find what you need.

Please note that The Snohomish is an independent platform and is not affiliated with, endorsed by, or operated by Chupa Chap, Oaks & Corks, Greenspoon, Quickmart, The Bar KE, or other third-party brands referenced for comparison. All trademarks remain the property of their respective owners.

The Snohomish Deliveries promotes responsible drinking and only serves customers who are of legal drinking age.`;
  const articles = content.articles?.filter(article => article.is_active !== false && article.title.trim() && article.body.trim()) || [];
  const visibleArticles = articles.length ? articles : [{ id: 'default', title, summary, body, is_active: true }];
  return <section className="mx-auto max-w-4xl space-y-3 px-4 pb-10">{visibleArticles.map(article => <details key={article.id} className="group rounded-2xl border border-orange-100 bg-white px-5 py-4 text-sm shadow-sm"><summary className="cursor-pointer list-none font-black text-brand-ink"><span className="text-brand-orange">Journal</span> · {article.title}<span className="float-right text-brand-orange group-open:hidden">Read article</span><span className="float-right hidden text-brand-orange group-open:inline">Close</span></summary>{article.summary && <p className="mt-2 text-neutral-500">{article.summary}</p>}<article className="mt-4 border-t border-orange-100 pt-4 leading-7 text-neutral-700"><h2 className="text-xl font-black text-brand-ink">{article.title}</h2><p className="mt-3 whitespace-pre-line">{article.body}</p></article></details>)}</section>;
}

export function CategoryGrid({ categories }: { categories: DbCategory[] }) {
  return <section className="mx-auto grid grid-cols-3 gap-2 px-3 py-4 sm:grid-cols-4 sm:px-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-12">{categories.map((category) => <Link href={`/category/${category.slug}`} key={category.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-card"><SmartImage src={category.image_url || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=700&q=80'} alt={`${category.name} category`} sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 17vw, (max-width: 1280px) 13vw, 9vw" className="transition duration-500 group-hover:scale-[1.03]" /><div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 to-transparent" /><div className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-white"><h2 className="truncate text-[11px] font-semibold tracking-wide sm:text-xs">{category.name}</h2></div></Link>)}</section>;
}

export function ProductCard({ p }: { p: DbProduct }) {
  const [adding, setAdding] = useState(false);
  const variants = (p.product_variants || []).filter((variant) => variant.is_active !== false);
  const firstVariant = variants[0], pricing = effectivePrice(firstVariant || p), price = pricing.price, oldPrice = pricing.oldPrice;
  const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
  const available = variants.length ? variants.some((variant) => Number(variant.stock) > 0) : Number(p.stock || 0) > 0;
  function add(event: React.MouseEvent<HTMLButtonElement>) { event.preventDefault(); event.stopPropagation(); if (!available || adding) return; setAdding(true); const cart = readCart(), variant = firstVariant, stock = variant?.stock ?? p.stock ?? 1; const current = cart.find((item) => item.productId === p.id && item.variantId === variant?.id), previousQuantity = current?.quantity ?? 0, nextQuantity = Math.min(previousQuantity + 1, stock); if (nextQuantity <= previousQuantity) { setAdding(false); return; } if (current) current.quantity = nextQuantity; else cart.push({ productId: p.id, variantId: variant?.id, name: p.name, size: variant?.name || p.bottle_size, price, image: imageFor(p), quantity: nextQuantity, stock }); const item = cart.find((entry) => entry.productId === p.id && entry.variantId === variant?.id)!; writeCart(cart, { item: { ...item }, quantityAdded: nextQuantity - previousQuantity }); animateProductToCart(event.currentTarget); window.setTimeout(() => setAdding(false), 600); }
  return <Link href={`/product/${p.slug}`} className="block min-w-0 rounded-2xl bg-white p-2 transition hover:-translate-y-1 hover:shadow-card"><div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-white"><SmartImage src={imageFor(p)} alt={`${p.name} product image`} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw" fit="contain" className="p-1 transition-transform duration-300 hover:scale-[1.03]" /><button type="button" aria-label={`Add ${p.name} to cart`} onClick={add} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-brand-orange text-lg font-black text-white shadow-orange transition hover:scale-105 disabled:bg-neutral-300" disabled={!available || adding}>{adding ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"/> : available ? '+' : '×'}</button>{variants.length > 1 && <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-brand-deep shadow-sm">{variants.length} sizes</span>}</div><div className="pt-3"><div className="flex flex-wrap items-center gap-2"><b className="rounded-md bg-brand-orange px-2 py-1 text-base leading-none text-white"><span className="text-[11px] text-white">KSh</span> {Number(price).toLocaleString('en-KE')}</b>{discount > 0 && <span className="text-xs font-black text-brand-deep">{discount}% off</span>}{oldPrice && <s className="text-sm text-neutral-500">{money(oldPrice)}</s>}</div><h3 className="mt-2 min-h-9 text-[13px] font-medium leading-tight text-brand-ink">{p.name}</h3><p className={`mt-0.5 text-[10px] uppercase tracking-wide ${available ? 'text-green-700' : 'text-red-600'}`}>{p.abv != null ? `${p.abv}% ABV` : 'ABV not specified'} · {available ? 'Available' : 'Out of stock'}</p></div></Link>;
}

/** A sellable bottle size is shown as its own catalog card while retaining the
 * parent product record for shared editorial information and inventory links. */
export function ProductVariantCard({ product, variant }: { product: DbProduct; variant: NonNullable<DbProduct['product_variants']>[number] }) {
  const [adding, setAdding] = useState(false);
  const pricing = effectivePrice(variant), oldPrice = pricing.oldPrice;
  const discount = oldPrice ? Math.round((1 - pricing.price / oldPrice) * 100) : 0;
  const available = Number(variant.stock) > 0;
  function add(event: React.MouseEvent<HTMLButtonElement>) { event.preventDefault(); event.stopPropagation(); if (!available || adding) return; setAdding(true); const cart = readCart(), current = cart.find(item => item.productId === product.id && item.variantId === variant.id), previousQuantity = current?.quantity ?? 0, nextQuantity = Math.min(previousQuantity + 1, variant.stock); if (nextQuantity <= previousQuantity) { setAdding(false); return; } if (current) current.quantity = nextQuantity; else cart.push({ productId: product.id, variantId: variant.id, name: product.name, size: variant.name, price: pricing.price, image: variant.image_url || imageFor(product), quantity: nextQuantity, stock: variant.stock }); const item = cart.find(entry => entry.productId === product.id && entry.variantId === variant.id)!; writeCart(cart, { item: { ...item }, quantityAdded: nextQuantity - previousQuantity }); animateProductToCart(event.currentTarget); window.setTimeout(() => setAdding(false), 600); }
  return <Link href={`/product/${product.slug}?variant=${encodeURIComponent(variant.id)}`} className="block min-w-0 rounded-2xl bg-white p-2 transition hover:-translate-y-1 hover:shadow-card"><div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-white"><SmartImage src={variant.image_url || imageFor(product)} alt={`${product.name} ${variant.name} product image`} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw" fit="contain" className="p-1 transition-transform duration-300 hover:scale-[1.03]" /><button type="button" aria-label={`Add ${product.name} ${variant.name} to cart`} onClick={add} disabled={!available || adding} className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-brand-orange text-lg font-black text-white shadow-orange transition hover:scale-105 disabled:bg-neutral-300">{adding ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent"/> : available ? '+' : '×'}</button></div><div className="pt-3"><div className="flex flex-wrap items-center gap-2"><b className="rounded-md bg-brand-orange px-2 py-1 text-base leading-none text-white"><span className="text-[11px] text-white">KSh</span> {Number(pricing.price).toLocaleString('en-KE')}</b>{discount > 0 && <span className="text-xs font-black text-brand-deep">{discount}% off</span>}{oldPrice && <s className="text-sm text-neutral-500">{money(oldPrice)}</s>}</div><h3 className="mt-2 min-h-9 text-[13px] font-medium leading-tight text-brand-ink">{product.name}</h3><p className={`mt-0.5 text-[10px] uppercase tracking-wide ${available ? 'text-green-700' : 'text-red-600'}`}>{product.abv != null ? `${product.abv}% ABV` : 'ABV not specified'} · {available ? 'Available' : 'Out of stock'}</p></div></Link>;
}

function CatalogCards({ products, limit }: { products: DbProduct[]; limit?: number }) {
  return <>{products.flatMap((product) => {
    const activeVariants = (product.product_variants || []).filter((variant) => variant.is_active !== false);
    // Keep the parent card for the first/default offering, and surface every
    // additional bottle size as a separately clickable catalog product.
    return [<ProductCard key={product.id} p={product} />, ...activeVariants.slice(1).map((variant) => <ProductVariantCard key={variant.id} product={product} variant={variant} />)];
  }).slice(0, limit)}</>;
}

export function ProductRail({ title, products, href, limit = 8 }: { title: string; products: DbProduct[]; href: string; limit?: number }) {
  const rail = useRef<HTMLDivElement>(null), paused = useRef(false);
  useEffect(() => { const timer = window.setInterval(() => { const node=rail.current, first=node?.firstElementChild as HTMLElement|null; if(!node||!first||paused.current||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return; const step=first.offsetWidth+16, atEnd=node.scrollLeft+node.clientWidth>=node.scrollWidth-step; node.scrollTo({left:atEnd?0:node.scrollLeft+step,behavior:'smooth'}); },2600); return()=>window.clearInterval(timer); },[]);
  return <section className="mx-auto max-w-none overflow-hidden px-6 py-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-extrabold tracking-tight text-brand-ink">{title}</h2><Link href={href} className="font-bold text-brand-orange">View all {title}</Link></div><div ref={rail} onMouseEnter={()=>{paused.current=true}} onMouseLeave={()=>{paused.current=false}} onTouchStart={()=>{paused.current=true}} onTouchEnd={()=>{paused.current=false}} className="product-rail-grid"><CatalogCards products={products} limit={limit} /></div></section>;
}
