import Link from 'next/link';
import type { Metadata } from 'next';
import { ProductRail } from '@/components/Site';
import { getCategories, getHomepageSections, getProducts, getPromotions, money } from '@/lib/supabase';
import { stableCollectionSlug } from '@/lib/public-urls';
import { DEFAULT_DESCRIPTION } from '@/lib/seo';
import {
  ArrowRight,
  Boxes,
  Building2,
  CarFront,
  Check,
  Clock3,
  PackageCheck,
  Store,
  Truck,
} from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: { absolute: 'The Snohomish | Wines, Spirits, Retail & Wholesale Nairobi' },
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: 'The Snohomish | Wines, Spirits, Retail & Wholesale Nairobi', description: DEFAULT_DESCRIPTION, url: '/', siteName: 'The Snohomish', type: 'website', images: [{ url: '/the-snohomish-logo.svg', alt: 'The Snohomish logo' }] },
  twitter: { card: 'summary_large_image', title: 'The Snohomish | Wines, Spirits, Retail & Wholesale Nairobi', description: DEFAULT_DESCRIPTION, images: ['/the-snohomish-logo.svg'] },
};

const stores = ['Mautamu', 'The Snohomish', 'Three Amigos'];
const southAfricanWineBrands = ['Glenbrynth', 'Kanonkop', 'Nederburg', 'Spier', 'Delaire Graff'];
const essentialCategories = [
  ['Wine','wine'],['Whisky','whisky'],['Gin','gin'],['Vodka','vodka'],['Tequila','tequila'],['Rum','rum'],['Brandy','brandy'],['Liqueur','liqueur'],
  ['Beer','beer'],['Champagne','champagne'],['Sparkling','sparkling'],['Spirits','spirits'],['Mixers','mixers'],['Soft Drinks','soft-drinks'],['Energy Drinks','energy-drinks'],['Snacks','snacks'],
].map(([name,slug])=>({id:`essential-${slug}`,name,slug}));
export default async function Home() {
  const [categories, products, promotions, configuredSections] = await Promise.all([getCategories(), getProducts(), getPromotions(), getHomepageSections()]);
  const topSellers = products.filter(p => p.is_top_seller), arrivals = products.filter(p => p.is_new_arrival).sort((a,b)=>Date.parse(b.updated_at||'')-Date.parse(a.updated_at||'')), featured = products.filter(p => p.is_featured);
  const allCategories = [...essentialCategories, ...categories.filter(category=>!essentialCategories.some(item=>item.slug===category.slug))].map(category=>categories.find(item=>item.slug===category.slug)||category);
  const retailCategories = ['wine','whisky','beer','gin','spirits','champagne']
    .map(slug => allCategories.find(category => category.slug === slug))
    .filter((category): category is typeof allCategories[number] => Boolean(category));
  const discounted = products.filter(product=>Boolean(product.old_price)||(product.product_variants||[]).some(variant=>Boolean(variant.old_price)));
  const unique = products.filter(product=>product.is_featured&&!product.is_top_seller);
  const categoryRows = [['Whisky Favourites','whisky'],['Wines We Love','wine'],['Beer & Cider','beer'],['Gin Selection','gin'],['Champagne & Sparkling','champagne']].map(([title,slug])=>({title,products:products.filter(product=>product.categories?.slug===slug),href:`/category/${slug}`,limit:8}));
  const homepageRows = (configuredSections.length ? configuredSections.map(section => { const heading=section.heading.toLowerCase(); const selected=section.product_ids?.length?section.product_ids.map(id=>products.find(p=>p.id===id)).filter((p):p is typeof products[number]=>Boolean(p)):heading.includes('new arrival')?arrivals:heading.includes('flash')?discounted:heading.includes('unique')?unique:heading.includes('deal')||heading.includes('featured')||heading.includes('offer')?featured:section.use_best_sellers||heading.includes('top seller')||heading.includes('best seller')?topSellers:section.category_id?products.filter(p=>p.categories?.slug===section.categories?.slug):products; return {title:section.heading,products:selected,href:`/collections/${stableCollectionSlug(section)||'featured'}`,limit:section.item_limit}; }):categoryRows).filter(s=>s.products.length);
  return <main>
    <section className="premium-banner" aria-label="Premium wines and spirits">
      <Link href="/shop" aria-label="Shop premium wines and spirits"><img src="/premium-spirits-banner.svg" alt="A premium collection of whisky and spirits against a dark green city backdrop"/></Link>
    </section>
    <section className="featured-brand-wall" aria-labelledby="featured-brands-heading">
      <h2 id="featured-brands-heading">Featured brands</h2>
      <div className="featured-brand-art"><img src="/featured-brands-row-one.svg" alt="Grant's, The Glenlivet, Finlandia, Dom Pérignon, Cîroc, Chivas, Bombay Sapphire and Beefeater"/><img src="/featured-brands-row-two.svg" alt="The Balvenie, Moët & Chandon, Johnnie Walker, Jameson, Jägermeister, Jack Daniel's, Hennessy and Grant's"/></div>
      <div className="south-african-brands" aria-label="Glenbrynth and South African wineries"><span>South African selection</span>{southAfricanWineBrands.map(brand=><Link key={brand} href={`/search?q=${encodeURIComponent(brand)}`}>{brand}</Link>)}</div>
    </section>
    {promotions.length>0&&<section className="mx-auto grid max-w-7xl gap-4 px-5 py-8 md:grid-cols-2">{promotions.map(p=><Link key={p.id} href={p.button_url||'/offers'} className="deal-card"><div><small>{p.badge_text||p.code||'Limited offer'}</small><h2>{p.title}</h2><p>{p.description}</p></div><strong>{p.discount_type==='percent'?`${p.discount_value}%`:money(p.discount_value)}</strong></Link>)}</section>}
    <section className="bg-white py-8">{homepageRows.map((section,index)=><ProductRail key={`${section.title}-${index}`} {...section}/>)}</section>
    <section id="wholesale" className="mx-auto grid max-w-7xl gap-4 px-5 py-16 md:grid-cols-2 md:px-8"><div className="audience-card retail category-picker"><p>Retail</p><h2>Choose na category yako.</h2><span>Pick a shelf, start your basket.</span><div className="quick-category-grid">{retailCategories.map(category=><Link href={`/category/${category.slug}`} key={category.id}><div style={'image_url' in category&&category.image_url?{backgroundImage:`url(${category.image_url})`}:undefined}>{category.name.slice(0,2).toUpperCase()}</div><b>{category.name}</b></Link>)}</div><Link href="/shop">See all categories <ArrowRight size={17}/></Link></div><div className="audience-card wholesale"><p>Wholesale</p><Boxes/><h2>Buying for your business?</h2><span>Competitive trade pricing for bars, restaurants, hotels, supermarkets, retailers, events and corporate customers.</span><Link href="/contact?subject=trade-account">Request wholesale pricing <ArrowRight size={17}/></Link></div></section>
    <section className="wholesale-cta"><div><p className="eyebrow">Trade & corporate supply</p><h2>Need stock for your business?</h2><p>We supply bars, restaurants, hotels, liquor stores, supermarkets, events and corporate customers.</p><ul>{['Bulk ordering','Trade pricing','Volume opportunities','Business deliveries','Account support'].map(x=><li key={x}><Check size={16}/>{x}</li>)}</ul><div className="mt-8 flex flex-wrap gap-3"><Link className="sno-button" href="/contact?subject=price-list">Request price list</Link><Link className="sno-button-outline" href="/contact?subject=wholesale">Contact wholesale team</Link></div></div></section>
    <section id="stores" className="footer-experiences"><div className="footer-experiences-heading"><div><p>Visit & collect</p><h2>The Snohomish, closer to you.</h2></div><span>Swipe to explore <ArrowRight size={16}/></span></div><div className="footer-experiences-track"><Link id="mega-drive-through" href="/about#mega-drive-through" className="experience-card mega"><div><span className="coming-badge">Coming soon</span><CarFront/></div><small>Fast collection · Bulk orders</small><h3>Mega Drive-Through</h3><p>A faster new way to collect retail and wholesale orders.</p><b>Discover the drive-through <ArrowRight size={16}/></b></Link>{stores.map((name,index)=><Link href="/shop" className="experience-card store" key={name}><div><span>0{index+1}</span><Store/></div><small>Retail location</small><h3>{name}</h3><p><Clock3 size={14}/> Store information coming soon</p><b>Shop this store <ArrowRight size={16}/></b></Link>)}</div></section>
  </main>;
}
