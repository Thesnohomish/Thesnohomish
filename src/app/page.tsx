import Link from 'next/link';
import type { Metadata } from 'next';
import { CategoryGrid, ProductRail } from '@/components/Site';
import { getBanners, getCategories, getHomepageSections, getProducts, getPromotions, getSiteContent, money } from '@/lib/supabase';
import { stableCollectionSlug } from '@/lib/public-urls';
import { DEFAULT_DESCRIPTION } from '@/lib/seo';
import { ArrowRight, Boxes, Building2, CarFront, Check, Clock3, PackageCheck, ShoppingBag, Store, Truck } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata: Metadata = {
  title: { absolute: 'The Snohomish | Wines, Spirits, Retail & Wholesale Nairobi' },
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: 'The Snohomish | Wines, Spirits, Retail & Wholesale Nairobi', description: DEFAULT_DESCRIPTION, url: '/', siteName: 'The Snohomish', type: 'website', images: [{ url: '/snohomish-logo.svg', alt: 'The Snohomish logo' }] },
  twitter: { card: 'summary_large_image', title: 'The Snohomish | Wines, Spirits, Retail & Wholesale Nairobi', description: DEFAULT_DESCRIPTION, images: ['/snohomish-logo.svg'] },
};

const stores = ['Mautamu', 'The Snohomish', 'Three Amigos'];
const benefits = [
  [Truck, 'Fast delivery', 'Nairobi delivery and convenient collection options.'],
  [PackageCheck, 'Authentic products', 'Trusted wines, spirits and beverages sourced through verified distribution channels.'],
  [Boxes, 'Retail + wholesale', 'Shop one bottle or supply your entire business.'],
  [Building2, 'Competitive pricing', 'Retail offers, wholesale pricing and volume opportunities.'],
] as const;

export default async function Home() {
  const [categories, banners, products, promotions, content, configuredSections] = await Promise.all([getCategories(), getBanners(), getProducts(), getPromotions(), getSiteContent(), getHomepageSections()]);
  const topSellers = products.filter(p => p.is_top_seller), arrivals = products.filter(p => p.is_new_arrival).sort((a,b)=>Date.parse(b.updated_at||'')-Date.parse(a.updated_at||'')), featured = products.filter(p => p.is_featured);
  const sections = (configuredSections.length ? configuredSections.map(section => { const heading=section.heading.toLowerCase(); const selected=section.product_ids?.length?section.product_ids.map(id=>products.find(p=>p.id===id)).filter((p):p is typeof products[number]=>Boolean(p)):heading.includes('new arrival')?arrivals:heading.includes('deal')||heading.includes('featured')||heading.includes('offer')?featured:section.use_best_sellers||heading.includes('top seller')||heading.includes('best seller')?topSellers:section.category_id?products.filter(p=>p.categories?.slug===section.categories?.slug):products; return {title:section.heading,products:selected,href:`/collections/${stableCollectionSlug(section)||'featured'}`,limit:section.item_limit}; }):[{title:'Deals of the Day',products:featured,href:'/offers',limit:8},{title:'Top Sellers',products:topSellers,href:'/collections/top-sellers',limit:8},{title:'New Arrivals',products:arrivals,href:'/collections/new-arrivals',limit:8}]).filter(s=>s.products.length);
  const heroImage = banners[0]?.image_url;
  return <main>
    <section className="sno-hero" style={heroImage ? {backgroundImage:`linear-gradient(90deg,rgba(5,5,5,.97) 5%,rgba(5,5,5,.79) 55%,rgba(5,5,5,.62)),url(${heroImage})`}:undefined}>
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1.25fr_.75fr] lg:py-24">
        <div className="max-w-3xl"><p className="eyebrow">Distribution <span>•</span> Retail <span>•</span> Wholesale</p><h1 className="mt-5 text-5xl font-black leading-[.98] tracking-[-.055em] text-white sm:text-6xl lg:text-7xl">Drinks for every occasion.<br/><span className="text-sno-yellow">Retail or wholesale.</span></h1><p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">The Snohomish is a wines, spirits and beverage distribution and retail group serving individual customers, bars, restaurants, supermarkets, events and businesses across Nairobi.</p><div className="mt-8 flex flex-wrap gap-3"><Link className="sno-button" href="/shop">Shop retail <ArrowRight size={18}/></Link><Link className="sno-button-outline" href="/contact?subject=wholesale">Wholesale enquiry</Link></div></div>
        <div className="grid grid-cols-2 gap-3 self-end">{[['3','Retail stores'],['Wholesale','Trade supply'],['Fast','Nairobi delivery'],['Coming soon','Mega Drive-Through']].map(([top,bottom],i)=><div key={bottom} className={`stat-card ${i===3?'featured':''}`}>{i===3&&<span className="coming-badge">Coming soon</span>}<strong>{top}</strong><span>{bottom}</span></div>)}</div>
      </div>
    </section>
    <div className="partner-marquee" aria-label="The Snohomish retail and trade services"><div className="marquee-track">{[0,1].map(copy=><div className="marquee-group" aria-hidden={copy===1} key={copy}><span>Retail shopping</span><b>•</b><span>Wholesale supply</span><b>•</b><span>Business deliveries</span><b>•</b><span>Bulk orders</span><b>•</b><span>Three Nairobi stores</span><b>•</b></div>)}</div></div>
    <section className="bg-[#f5f4f0] py-10"><div className="mx-auto max-w-7xl px-5 md:px-8"><div className="section-heading"><div><p className="eyebrow dark">Shop by department</p><h2>Explore our selection</h2></div><Link href="/shop">Shop all <ArrowRight size={17}/></Link></div><CategoryGrid categories={categories.filter(c=>!c.parent_id)}/></div></section>
    {promotions.length>0&&<section className="mx-auto grid max-w-7xl gap-4 px-5 py-8 md:grid-cols-2">{promotions.map(p=><Link key={p.id} href={p.button_url||'/offers'} className="deal-card"><div><small>{p.badge_text||p.code||'Limited offer'}</small><h2>{p.title}</h2><p>{p.description}</p></div><strong>{p.discount_type==='percent'?`${p.discount_value}%`:money(p.discount_value)}</strong></Link>)}</section>}
    <section className="bg-white py-8">{sections.map((section,index)=><ProductRail key={`${section.title}-${index}`} {...section}/>)}</section>
    <section id="wholesale" className="mx-auto grid max-w-7xl gap-4 px-5 py-16 md:grid-cols-2 md:px-8"><div className="audience-card retail"><p>Retail</p><ShoppingBag/><h2>Shopping for yourself?</h2><span>Shop wines, spirits, beers, mixers and more with convenient delivery and collection.</span><Link href="/shop">Shop online <ArrowRight size={17}/></Link></div><div className="audience-card wholesale"><p>Wholesale</p><Boxes/><h2>Buying for your business?</h2><span>Competitive trade pricing for bars, restaurants, hotels, supermarkets, retailers, events and corporate customers.</span><Link href="/contact?subject=trade-account">Request wholesale pricing <ArrowRight size={17}/></Link></div></section>
    <section id="mega-drive-through" className="mega-section"><div className="mx-auto max-w-7xl px-5 py-20 md:px-8"><span className="coming-badge">Coming soon</span><div className="mt-6 grid gap-10 lg:grid-cols-2"><div><p className="eyebrow">Something big is coming</p><h2>The Snohomish<br/><em>Mega Drive-Through</em></h2><p className="mt-6 max-w-xl text-white/65">We&apos;re building a new drive-through experience designed for faster collections, larger orders and convenient shopping.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/about#mega-drive-through" className="sno-button">Learn more <ArrowRight size={18}/></Link><Link href="/contact?subject=opening-updates" className="sno-button-outline">Get opening updates</Link></div></div><div className="mega-features">{[[CarFront,'Fast pick-up'],[Store,'Retail shopping'],[Boxes,'Bulk orders'],[Truck,'Wholesale collection'],[Check,'Easy vehicle access']].map(([Icon,label])=><div key={String(label)}><Icon/><span>{String(label)}</span></div>)}</div></div></div></section>
    <section id="stores" className="bg-[#f5f4f0] py-20"><div className="mx-auto max-w-7xl px-5 md:px-8"><div className="section-heading"><div><p className="eyebrow dark">Our stores</p><h2>Three locations. One Snohomish experience.</h2></div></div><div className="store-scroller">{stores.map((name,index)=><article className="store-card" key={name}><div className="store-visual"><span>0{index+1}</span><Store/></div><div className="p-6"><h3>{name}</h3><p><Clock3 size={16}/> Store details coming soon</p><p className="text-neutral-500">Address, opening hours, telephone, WhatsApp and Maps information can be added through site content.</p><Link href="/shop">Shop this store <ArrowRight size={16}/></Link></div></article>)}</div></div></section>
    <section className="mx-auto grid max-w-7xl gap-4 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4 md:px-8">{benefits.map(([Icon,title,copy])=><article className="benefit-card" key={title}><Icon/><h3>{title}</h3><p>{copy}</p></article>)}</section>
    <section className="wholesale-cta"><div><p className="eyebrow">Trade & corporate supply</p><h2>Need stock for your business?</h2><p>We supply bars, restaurants, hotels, liquor stores, supermarkets, events and corporate customers.</p><ul>{['Bulk ordering','Trade pricing','Volume opportunities','Business deliveries','Account support'].map(x=><li key={x}><Check size={16}/>{x}</li>)}</ul><div className="mt-8 flex flex-wrap gap-3"><Link className="sno-button" href="/contact?subject=price-list">Request price list</Link><Link className="sno-button-outline" href="/contact?subject=wholesale">Contact wholesale team</Link></div></div></section>
  </main>;
}
