import Link from 'next/link';
import type { Metadata } from 'next';
import { ProductRail } from '@/components/Site';
import { getCategories, getProducts, getPromotions, money } from '@/lib/supabase';
import { DEFAULT_DESCRIPTION } from '@/lib/seo';
import { ArrowRight, CarFront, Check, Clock3, Store } from 'lucide-react';

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
const categoryFallbackPositions: Record<string,string> = {
  wine:'18% center',whisky:'70% center',gin:'82% center',vodka:'42% center',tequila:'58% center',rum:'62% center',brandy:'76% center',liqueur:'36% center',
  beer:'28% center',champagne:'47% center',sparkling:'47% center',spirits:'68% center',mixers:'32% center','soft-drinks':'24% center','energy-drinks':'54% center',snacks:'12% center',
};
export default async function Home() {
  const [categories, products, promotions] = await Promise.all([getCategories(), getProducts(), getPromotions()]);
  const topSellers = products.filter(p => p.is_top_seller), featured = products.filter(p => p.is_featured);
  const allCategories = [...essentialCategories, ...categories.filter(category=>!essentialCategories.some(item=>item.slug===category.slug))].map(category=>categories.find(item=>item.slug===category.slug)||category);
  const categoryShowcase = allCategories.map(category=>({category,image:('image_url' in category&&category.image_url)||products.find(product=>product.categories?.slug===category.slug)?.image_url||'/premium-spirits-banner.svg',position:categoryFallbackPositions[category.slug]||'center'}));
  const discounted = products.filter(product=>Boolean(product.old_price)||(product.product_variants||[]).some(variant=>Boolean(variant.old_price)));
  const topDeals = [...discounted,...featured,...topSellers].filter((product,index,list)=>list.findIndex(item=>item.id===product.id)===index);
  const homepageRows = [
    {title:'Top Deals',products:topDeals,href:'/offers'},
    {title:'Top Whiskies',products:products.filter(product=>product.categories?.slug==='whisky'),href:'/category/whisky'},
    {title:'Wines We Love',products:products.filter(product=>product.categories?.slug==='wine'),href:'/category/wine'},
    {title:'Discount Corner',products:discounted,href:'/offers'},
  ];
  return <main>
    <section className="premium-banner" aria-label="Premium wines and spirits">
      <Link href="/shop" aria-label="Shop premium wines and spirits"><img src="/premium-spirits-banner.svg" alt="A premium collection of whisky and spirits against a dark green city backdrop"/></Link>
    </section>
    <section className="alcohol-category-carousel" aria-labelledby="shop-by-category">
      <div className="alcohol-category-heading"><div><p>Explore the shelves</p><h2 id="shop-by-category">Shop by category</h2></div><Link href="/shop">See all categories <ArrowRight size={17}/></Link></div>
      <div className="alcohol-category-track">{[0,1].map(copy=><div className="alcohol-category-group" aria-hidden={copy===1} key={copy}>{categoryShowcase.map(({category,image,position})=><Link href={`/category/${category.slug}`} tabIndex={copy===1?-1:undefined} key={category.id}><span className="alcohol-category-image" style={{backgroundImage:`url(${image})`,backgroundPosition:position}}/><b>{category.name}</b></Link>)}</div>)}</div>
    </section>
    {promotions.length>0&&<section className="mx-auto grid max-w-7xl gap-4 px-5 py-8 md:grid-cols-2">{promotions.map(p=><Link key={p.id} href={p.button_url||'/offers'} className="deal-card"><div><small>{p.badge_text||p.code||'Limited offer'}</small><h2>{p.title}</h2><p>{p.description}</p></div><strong>{p.discount_type==='percent'?`${p.discount_value}%`:money(p.discount_value)}</strong></Link>)}</section>}
    <section className="bg-white py-8">{homepageRows.map(section=><ProductRail key={section.title} {...section}/>)}</section>
    <section className="wholesale-cta"><div><p className="eyebrow">Trade & corporate supply</p><h2>Need stock for your business?</h2><p>We supply bars, restaurants, hotels, liquor stores, supermarkets, events and corporate customers.</p><ul>{['Bulk ordering','Trade pricing','Volume opportunities','Business deliveries','Account support'].map(x=><li key={x}><Check size={16}/>{x}</li>)}</ul><div className="mt-8 flex flex-wrap gap-3"><Link className="sno-button" href="/contact?subject=price-list">Request price list</Link><Link className="sno-button-outline" href="/contact?subject=wholesale">Contact wholesale team</Link></div></div></section>
    <section id="stores" className="footer-experiences"><div className="footer-experiences-heading"><div><p>Visit & collect</p><h2>The Snohomish, closer to you.</h2></div><span>Swipe to explore <ArrowRight size={16}/></span></div><div className="footer-experiences-track"><Link id="mega-drive-through" href="/about#mega-drive-through" className="experience-card mega"><div><span className="coming-badge">Coming soon</span><CarFront/></div><small>Fast collection · Bulk orders</small><h3>Mega Drive-Through</h3><p>A faster new way to collect retail and wholesale orders.</p><b>Discover the drive-through <ArrowRight size={16}/></b></Link>{stores.map((name,index)=><Link href="/shop" className="experience-card store" key={name}><div><span>0{index+1}</span><Store/></div><small>Retail location</small><h3>{name}</h3><p><Clock3 size={14}/> Store information coming soon</p><b>Shop this store <ArrowRight size={16}/></b></Link>)}</div></section>
  </main>;
}
