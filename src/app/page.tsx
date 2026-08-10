import Link from 'next/link';
import type { Metadata } from 'next';
import { ProductRail } from '@/components/Site';
import { getBanners, getCategories, getHomepageSections, getProducts, getPromotions, getSiteContent, imageFor, money } from '@/lib/supabase';
import { stableCollectionSlug } from '@/lib/public-urls';
import { DEFAULT_DESCRIPTION } from '@/lib/seo';
import { ArrowRight, Boxes, Building2, CarFront, Check, Clock3, PackageCheck, Store, Truck } from 'lucide-react';

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
const essentialCategories = [
  ['Wine','wine'],['Whisky','whisky'],['Gin','gin'],['Vodka','vodka'],['Tequila','tequila'],['Rum','rum'],['Brandy','brandy'],['Liqueur','liqueur'],
  ['Beer','beer'],['Champagne','champagne'],['Sparkling','sparkling'],['Spirits','spirits'],['Mixers','mixers'],['Soft Drinks','soft-drinks'],['Energy Drinks','energy-drinks'],['Snacks','snacks'],
].map(([name,slug])=>({id:`essential-${slug}`,name,slug}));
const benefits = [
  [Truck, 'Fast delivery', 'Nairobi delivery and convenient collection options.'],
  [PackageCheck, 'Authentic products', 'Trusted wines, spirits and beverages sourced through verified distribution channels.'],
  [Boxes, 'Retail + wholesale', 'Shop one bottle or supply your entire business.'],
  [Building2, 'Competitive pricing', 'Retail offers, wholesale pricing and volume opportunities.'],
] as const;

export default async function Home() {
  const [categories, banners, products, promotions, content, configuredSections] = await Promise.all([getCategories(), getBanners(), getProducts(), getPromotions(), getSiteContent(), getHomepageSections()]);
  const topSellers = products.filter(p => p.is_top_seller), arrivals = products.filter(p => p.is_new_arrival).sort((a,b)=>Date.parse(b.updated_at||'')-Date.parse(a.updated_at||'')), featured = products.filter(p => p.is_featured);
  const allCategories = [...essentialCategories, ...categories.filter(category=>!essentialCategories.some(item=>item.slug===category.slug))].map(category=>categories.find(item=>item.slug===category.slug)||category);
  const quickCategorySlugs = ['wine','whisky','beer','gin','spirits','champagne'];
  const quickCategories = quickCategorySlugs.map(slug=>allCategories.find(category=>category.slug===slug)).filter((category):category is typeof allCategories[number]=>Boolean(category)).map(category=>({category,preview:products.find(product=>product.categories?.slug===category.slug)}));
  const discounted = products.filter(product=>Boolean(product.old_price)||(product.product_variants||[]).some(variant=>Boolean(variant.old_price)));
  const unique = products.filter(product=>product.is_featured&&!product.is_top_seller);
  const categoryRows = [['Whisky favourites','whisky'],['Wines we love','wine'],['Beer picks','beer'],['Gin selection','gin'],['Spirits to explore','spirits'],['Champagne moments','champagne']].map(([title,slug])=>({title,products:products.filter(product=>product.categories?.slug===slug).filter((product,index,list)=>list.findIndex(item=>item.id===product.id)===index),href:`/category/${slug}`,limit:8,uniqueProducts:true})).filter(section=>section.products.length);
  const configuredRows = configuredSections.map(section => { const heading=section.heading.toLowerCase(); const selected=section.product_ids?.length?section.product_ids.map(id=>products.find(p=>p.id===id)).filter((p):p is typeof products[number]=>Boolean(p)):heading.includes('new arrival')?arrivals:heading.includes('flash')?discounted:heading.includes('unique')?unique:heading.includes('deal')||heading.includes('featured')||heading.includes('offer')?featured:section.use_best_sellers||heading.includes('top seller')||heading.includes('best seller')?topSellers:section.category_id?products.filter(p=>p.categories?.slug===section.categories?.slug):products; return {title:section.heading,products:selected,href:`/collections/${stableCollectionSlug(section)||'featured'}`,limit:section.item_limit}; }).filter(section=>section.products.length);
  const sections = [...configuredRows,...categoryRows];
  const heroImage = banners[0]?.image_url;
  const heroBanner = banners[0];
  const glenbrynth = products.filter(product=>product.slug.startsWith('glenbrynth-')).slice(0,5);
  return <main>
    <section className="sno-hero" style={heroImage ? {backgroundImage:`linear-gradient(90deg,rgba(5,5,5,.97) 5%,rgba(5,5,5,.79) 55%,rgba(5,5,5,.62)),url(${heroImage})`}:undefined}>
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:px-8 lg:grid-cols-[1.25fr_.75fr] lg:py-24">
        <div className="max-w-3xl"><p className="eyebrow">{heroBanner?.badge_text||'Glenbrynth whisky event'}</p><h1 className="mt-5 text-5xl font-black leading-[.98] tracking-[-.055em] text-white sm:text-6xl lg:text-7xl">{heroBanner?.title||'Buy two Glenbrynth.'}<br/><span className="text-sno-yellow">Get one free.</span></h1><p className="mt-7 max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{heroBanner?.subtitle||'Choose any two featured Glenbrynth bottles and receive one promotional bottle free while stock lasts.'}</p><div className="mt-8 flex flex-wrap gap-3"><Link className="sno-button" href={heroBanner?.button_url||'/search?q=glenbrynth'}>{heroBanner?.button_label||heroBanner?.button_text||'Shop the offer'} <ArrowRight size={18}/></Link><Link className="sno-button-outline" href="/offers">See all deals</Link></div></div>
        <div className="glenbrynth-showcase" aria-label="Glenbrynth whisky variants"><img className="glenbrynth-collection-image" src="/glenbrynth-variants.svg" alt="Six Glenbrynth whisky variants"/><div className="glenbrynth-links">{glenbrynth.map(product=><Link href={`/product/${product.slug}`} key={product.id}>{product.name.replace('Glenbrynth ','')}</Link>)}</div><strong>BUY 2<br/><span>GET 1 FREE</span></strong></div>
      </div>
    </section>
    <div className="partner-marquee" aria-label="The Snohomish retail and trade services"><div className="marquee-track">{[0,1].map(copy=><div className="marquee-group" aria-hidden={copy===1} key={copy}><span>Retail shopping</span><b>•</b><span>Wholesale supply</span><b>•</b><span>Business deliveries</span><b>•</b><span>Bulk orders</span><b>•</b><span>Three Nairobi stores</span><b>•</b></div>)}</div></div>
    {promotions.length>0&&<section className="mx-auto grid max-w-7xl gap-4 px-5 py-8 md:grid-cols-2">{promotions.map(p=><Link key={p.id} href={p.button_url||'/offers'} className="deal-card"><div><small>{p.badge_text||p.code||'Limited offer'}</small><h2>{p.title}</h2><p>{p.description}</p></div><strong>{p.discount_type==='percent'?`${p.discount_value}%`:money(p.discount_value)}</strong></Link>)}</section>}
    <section className="home-category-wrap" aria-labelledby="home-category-title"><div className="home-category-picker"><div><h2 id="home-category-title">What are you after?</h2><p>Pick a shelf, start your basket.</p></div><div className="home-category-grid">{quickCategories.map(({category,preview})=><Link href={`/category/${category.slug}`} key={category.id}>{preview?<img src={imageFor(preview)} alt=""/>:<span>{category.name.slice(0,2).toUpperCase()}</span>}<b>{category.name}</b></Link>)}</div><Link className="home-category-all" href="/shop#categories">Shop in for a top-up <ArrowRight size={14}/></Link></div></section>
    <section className="bg-white py-8">{sections.map((section,index)=><ProductRail key={`${section.title}-${index}`} {...section}/>)}</section>
    <section id="wholesale" className="mx-auto max-w-7xl px-5 py-16 md:px-8"><div className="audience-card wholesale"><p>Wholesale</p><Boxes/><h2>Buying for your business?</h2><span>Competitive trade pricing for bars, restaurants, hotels, supermarkets, retailers, events and corporate customers.</span><Link href="/contact?subject=trade-account">Request wholesale pricing <ArrowRight size={17}/></Link></div></section>
    <section className="mx-auto grid max-w-7xl gap-4 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4 md:px-8">{benefits.map(([Icon,title,copy])=><article className="benefit-card" key={title}><Icon/><h3>{title}</h3><p>{copy}</p></article>)}</section>
    <section className="wholesale-cta"><div><p className="eyebrow">Trade & corporate supply</p><h2>Need stock for your business?</h2><p>We supply bars, restaurants, hotels, liquor stores, supermarkets, events and corporate customers.</p><ul>{['Bulk ordering','Trade pricing','Volume opportunities','Business deliveries','Account support'].map(x=><li key={x}><Check size={16}/>{x}</li>)}</ul><div className="mt-8 flex flex-wrap gap-3"><Link className="sno-button" href="/contact?subject=price-list">Request price list</Link><Link className="sno-button-outline" href="/contact?subject=wholesale">Contact wholesale team</Link></div></div></section>
    <section id="stores" className="footer-experiences"><div className="footer-experiences-heading"><div><p>Visit & collect</p><h2>The Snohomish, closer to you.</h2></div><span>Swipe to explore <ArrowRight size={16}/></span></div><div className="footer-experiences-track"><Link id="mega-drive-through" href="/about#mega-drive-through" className="experience-card mega"><div><span className="coming-badge">Coming soon</span><CarFront/></div><small>Fast collection · Bulk orders</small><h3>Mega Drive-Through</h3><p>A faster new way to collect retail and wholesale orders.</p><b>Discover the drive-through <ArrowRight size={16}/></b></Link>{stores.map((name,index)=><Link href="/shop" className="experience-card store" key={name}><div><span>0{index+1}</span><Store/></div><small>Retail location</small><h3>{name}</h3><p><Clock3 size={14}/> Store information coming soon</p><b>Shop this store <ArrowRight size={16}/></b></Link>)}</div></section>
  </main>;
}
