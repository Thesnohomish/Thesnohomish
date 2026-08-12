-- Additive starter catalogue: guarantees at least five active products and one
-- editable homepage row per storefront category. Existing products are retained.
begin;

do $$
declare item jsonb; category_uuid uuid; product_uuid uuid;
begin
  for item in select value from jsonb_array_elements($catalog$[
 {
  "category": "wine",
  "name": "Cabernet Sauvignon",
  "slug": "snohomish-wine-1",
  "price": 1850,
  "size": "750ml"
 },
 {
  "category": "wine",
  "name": "Merlot Reserve",
  "slug": "snohomish-wine-2",
  "price": 1750,
  "size": "750ml"
 },
 {
  "category": "wine",
  "name": "Chenin Blanc",
  "slug": "snohomish-wine-3",
  "price": 1600,
  "size": "750ml"
 },
 {
  "category": "wine",
  "name": "Sauvignon Blanc",
  "slug": "snohomish-wine-4",
  "price": 1700,
  "size": "750ml"
 },
 {
  "category": "wine",
  "name": "Rosé Cuvée",
  "slug": "snohomish-wine-5",
  "price": 1650,
  "size": "750ml"
 },
 {
  "category": "whisky",
  "name": "Highland Blended Whisky",
  "slug": "snohomish-whisky-1",
  "price": 2800,
  "size": "750ml"
 },
 {
  "category": "whisky",
  "name": "Speyside Single Malt",
  "slug": "snohomish-whisky-2",
  "price": 5200,
  "size": "750ml"
 },
 {
  "category": "whisky",
  "name": "Irish Triple Distilled",
  "slug": "snohomish-whisky-3",
  "price": 2600,
  "size": "750ml"
 },
 {
  "category": "whisky",
  "name": "Bourbon Cask Whisky",
  "slug": "snohomish-whisky-4",
  "price": 3900,
  "size": "750ml"
 },
 {
  "category": "whisky",
  "name": "Sherry Cask Malt",
  "slug": "snohomish-whisky-5",
  "price": 4600,
  "size": "750ml"
 },
 {
  "category": "gin",
  "name": "London Dry Gin",
  "slug": "snohomish-gin-1",
  "price": 2200,
  "size": "750ml"
 },
 {
  "category": "gin",
  "name": "Pink Botanical Gin",
  "slug": "snohomish-gin-2",
  "price": 2400,
  "size": "750ml"
 },
 {
  "category": "gin",
  "name": "Citrus Dry Gin",
  "slug": "snohomish-gin-3",
  "price": 2350,
  "size": "750ml"
 },
 {
  "category": "gin",
  "name": "Navy Strength Gin",
  "slug": "snohomish-gin-4",
  "price": 3200,
  "size": "750ml"
 },
 {
  "category": "gin",
  "name": "Herbal Craft Gin",
  "slug": "snohomish-gin-5",
  "price": 2900,
  "size": "750ml"
 },
 {
  "category": "vodka",
  "name": "Classic Vodka",
  "slug": "snohomish-vodka-1",
  "price": 1800,
  "size": "750ml"
 },
 {
  "category": "vodka",
  "name": "Premium Wheat Vodka",
  "slug": "snohomish-vodka-2",
  "price": 2300,
  "size": "750ml"
 },
 {
  "category": "vodka",
  "name": "Citrus Vodka",
  "slug": "snohomish-vodka-3",
  "price": 1950,
  "size": "750ml"
 },
 {
  "category": "vodka",
  "name": "Vanilla Vodka",
  "slug": "snohomish-vodka-4",
  "price": 2050,
  "size": "750ml"
 },
 {
  "category": "vodka",
  "name": "Triple Distilled Vodka",
  "slug": "snohomish-vodka-5",
  "price": 2500,
  "size": "750ml"
 },
 {
  "category": "tequila",
  "name": "Blanco Tequila",
  "slug": "snohomish-tequila-1",
  "price": 2600,
  "size": "750ml"
 },
 {
  "category": "tequila",
  "name": "Reposado Tequila",
  "slug": "snohomish-tequila-2",
  "price": 3200,
  "size": "750ml"
 },
 {
  "category": "tequila",
  "name": "Añejo Tequila",
  "slug": "snohomish-tequila-3",
  "price": 4800,
  "size": "750ml"
 },
 {
  "category": "tequila",
  "name": "Gold Tequila",
  "slug": "snohomish-tequila-4",
  "price": 2400,
  "size": "750ml"
 },
 {
  "category": "tequila",
  "name": "Agave Silver Tequila",
  "slug": "snohomish-tequila-5",
  "price": 2900,
  "size": "750ml"
 },
 {
  "category": "rum",
  "name": "White Rum",
  "slug": "snohomish-rum-1",
  "price": 1900,
  "size": "750ml"
 },
 {
  "category": "rum",
  "name": "Dark Rum",
  "slug": "snohomish-rum-2",
  "price": 2200,
  "size": "750ml"
 },
 {
  "category": "rum",
  "name": "Spiced Rum",
  "slug": "snohomish-rum-3",
  "price": 2100,
  "size": "750ml"
 },
 {
  "category": "rum",
  "name": "Aged Caribbean Rum",
  "slug": "snohomish-rum-4",
  "price": 3800,
  "size": "750ml"
 },
 {
  "category": "rum",
  "name": "Coconut Rum",
  "slug": "snohomish-rum-5",
  "price": 2000,
  "size": "750ml"
 },
 {
  "category": "brandy",
  "name": "VS Brandy",
  "slug": "snohomish-brandy-1",
  "price": 2100,
  "size": "750ml"
 },
 {
  "category": "brandy",
  "name": "VSOP Brandy",
  "slug": "snohomish-brandy-2",
  "price": 3600,
  "size": "750ml"
 },
 {
  "category": "brandy",
  "name": "Five Star Brandy",
  "slug": "snohomish-brandy-3",
  "price": 1900,
  "size": "750ml"
 },
 {
  "category": "brandy",
  "name": "Cape Brandy",
  "slug": "snohomish-brandy-4",
  "price": 2400,
  "size": "750ml"
 },
 {
  "category": "brandy",
  "name": "Reserve Brandy",
  "slug": "snohomish-brandy-5",
  "price": 4200,
  "size": "750ml"
 },
 {
  "category": "liqueur",
  "name": "Coffee Liqueur",
  "slug": "snohomish-liqueur-1",
  "price": 2200,
  "size": "750ml"
 },
 {
  "category": "liqueur",
  "name": "Cream Liqueur",
  "slug": "snohomish-liqueur-2",
  "price": 1950,
  "size": "750ml"
 },
 {
  "category": "liqueur",
  "name": "Orange Liqueur",
  "slug": "snohomish-liqueur-3",
  "price": 2500,
  "size": "750ml"
 },
 {
  "category": "liqueur",
  "name": "Herbal Liqueur",
  "slug": "snohomish-liqueur-4",
  "price": 2300,
  "size": "750ml"
 },
 {
  "category": "liqueur",
  "name": "Amaretto Liqueur",
  "slug": "snohomish-liqueur-5",
  "price": 2700,
  "size": "750ml"
 },
 {
  "category": "beer",
  "name": "Premium Lager 6 Pack",
  "slug": "snohomish-beer-1",
  "price": 1200,
  "size": "6 pack"
 },
 {
  "category": "beer",
  "name": "Pilsner 6 Pack",
  "slug": "snohomish-beer-2",
  "price": 1100,
  "size": "6 pack"
 },
 {
  "category": "beer",
  "name": "Craft IPA 6 Pack",
  "slug": "snohomish-beer-3",
  "price": 1500,
  "size": "6 pack"
 },
 {
  "category": "beer",
  "name": "Stout 6 Pack",
  "slug": "snohomish-beer-4",
  "price": 1300,
  "size": "6 pack"
 },
 {
  "category": "beer",
  "name": "Cider 6 Pack",
  "slug": "snohomish-beer-5",
  "price": 1400,
  "size": "6 pack"
 },
 {
  "category": "champagne",
  "name": "Brut Champagne",
  "slug": "snohomish-champagne-1",
  "price": 6500,
  "size": "750ml"
 },
 {
  "category": "champagne",
  "name": "Rosé Champagne",
  "slug": "snohomish-champagne-2",
  "price": 7800,
  "size": "750ml"
 },
 {
  "category": "champagne",
  "name": "Vintage Champagne",
  "slug": "snohomish-champagne-3",
  "price": 12500,
  "size": "750ml"
 },
 {
  "category": "champagne",
  "name": "Demi-Sec Champagne",
  "slug": "snohomish-champagne-4",
  "price": 7200,
  "size": "750ml"
 },
 {
  "category": "champagne",
  "name": "Prestige Cuvée",
  "slug": "snohomish-champagne-5",
  "price": 18000,
  "size": "750ml"
 },
 {
  "category": "sparkling",
  "name": "Brut Sparkling Wine",
  "slug": "snohomish-sparkling-1",
  "price": 2200,
  "size": "750ml"
 },
 {
  "category": "sparkling",
  "name": "Sparkling Rosé",
  "slug": "snohomish-sparkling-2",
  "price": 2400,
  "size": "750ml"
 },
 {
  "category": "sparkling",
  "name": "Prosecco Extra Dry",
  "slug": "snohomish-sparkling-3",
  "price": 2600,
  "size": "750ml"
 },
 {
  "category": "sparkling",
  "name": "Moscato Sparkling",
  "slug": "snohomish-sparkling-4",
  "price": 2100,
  "size": "750ml"
 },
 {
  "category": "sparkling",
  "name": "Alcohol-Free Sparkling",
  "slug": "snohomish-sparkling-5",
  "price": 1800,
  "size": "750ml"
 },
 {
  "category": "spirits",
  "name": "Premium Spirit Blend",
  "slug": "snohomish-spirits-1",
  "price": 2500,
  "size": "750ml"
 },
 {
  "category": "spirits",
  "name": "Oak-Aged Spirit",
  "slug": "snohomish-spirits-2",
  "price": 3200,
  "size": "750ml"
 },
 {
  "category": "spirits",
  "name": "Botanical Spirit",
  "slug": "snohomish-spirits-3",
  "price": 2800,
  "size": "750ml"
 },
 {
  "category": "spirits",
  "name": "Reserve Spirit",
  "slug": "snohomish-spirits-4",
  "price": 4500,
  "size": "750ml"
 },
 {
  "category": "spirits",
  "name": "Craft Spirit",
  "slug": "snohomish-spirits-5",
  "price": 3000,
  "size": "750ml"
 },
 {
  "category": "mixers",
  "name": "Tonic Water 6 Pack",
  "slug": "snohomish-mixers-1",
  "price": 720,
  "size": "6 pack"
 },
 {
  "category": "mixers",
  "name": "Soda Water 6 Pack",
  "slug": "snohomish-mixers-2",
  "price": 650,
  "size": "6 pack"
 },
 {
  "category": "mixers",
  "name": "Ginger Ale 6 Pack",
  "slug": "snohomish-mixers-3",
  "price": 780,
  "size": "6 pack"
 },
 {
  "category": "mixers",
  "name": "Bitter Lemon 6 Pack",
  "slug": "snohomish-mixers-4",
  "price": 750,
  "size": "6 pack"
 },
 {
  "category": "mixers",
  "name": "Pink Tonic 6 Pack",
  "slug": "snohomish-mixers-5",
  "price": 850,
  "size": "6 pack"
 },
 {
  "category": "soft-drinks",
  "name": "Cola 6 Pack",
  "slug": "snohomish-soft-drinks-1",
  "price": 650,
  "size": "6 pack"
 },
 {
  "category": "soft-drinks",
  "name": "Lemon-Lime Soda 6 Pack",
  "slug": "snohomish-soft-drinks-2",
  "price": 620,
  "size": "6 pack"
 },
 {
  "category": "soft-drinks",
  "name": "Orange Soda 6 Pack",
  "slug": "snohomish-soft-drinks-3",
  "price": 640,
  "size": "6 pack"
 },
 {
  "category": "soft-drinks",
  "name": "Ginger Soda 6 Pack",
  "slug": "snohomish-soft-drinks-4",
  "price": 720,
  "size": "6 pack"
 },
 {
  "category": "soft-drinks",
  "name": "Malted Soft Drink 6 Pack",
  "slug": "snohomish-soft-drinks-5",
  "price": 780,
  "size": "6 pack"
 },
 {
  "category": "energy-drinks",
  "name": "Classic Energy Drink 6 Pack",
  "slug": "snohomish-energy-drinks-1",
  "price": 1100,
  "size": "6 pack"
 },
 {
  "category": "energy-drinks",
  "name": "Sugar-Free Energy Drink 6 Pack",
  "slug": "snohomish-energy-drinks-2",
  "price": 1150,
  "size": "6 pack"
 },
 {
  "category": "energy-drinks",
  "name": "Tropical Energy Drink 6 Pack",
  "slug": "snohomish-energy-drinks-3",
  "price": 1200,
  "size": "6 pack"
 },
 {
  "category": "energy-drinks",
  "name": "Berry Energy Drink 6 Pack",
  "slug": "snohomish-energy-drinks-4",
  "price": 1200,
  "size": "6 pack"
 },
 {
  "category": "energy-drinks",
  "name": "Extra Energy Drink 6 Pack",
  "slug": "snohomish-energy-drinks-5",
  "price": 1300,
  "size": "6 pack"
 },
 {
  "category": "snacks",
  "name": "Salted Crisps",
  "slug": "snohomish-snacks-1",
  "price": 250,
  "size": "150g"
 },
 {
  "category": "snacks",
  "name": "Chilli Crisps",
  "slug": "snohomish-snacks-2",
  "price": 250,
  "size": "150g"
 },
 {
  "category": "snacks",
  "name": "Mixed Nuts",
  "slug": "snohomish-snacks-3",
  "price": 450,
  "size": "150g"
 },
 {
  "category": "snacks",
  "name": "Beef Bites",
  "slug": "snohomish-snacks-4",
  "price": 500,
  "size": "150g"
 },
 {
  "category": "snacks",
  "name": "Party Snack Mix",
  "slug": "snohomish-snacks-5",
  "price": 550,
  "size": "150g"
 }
]
$catalog$::jsonb) loop
    insert into public.categories(name,slug,is_active,sort_order)
    values (initcap(replace(item->>'category','-',' ')),item->>'category',true,100)
    on conflict(slug) do update set is_active=true
    returning id into category_uuid;

    -- Seed only while this category has fewer than five active products. Stable
    -- slugs make reruns safe and never overwrite merchant-managed records.
    if (select count(*) from public.products where category_id=category_uuid and is_active) < 5 then
      insert into public.products(category_id,name,slug,description,bottle_size,price,stock,is_active,is_featured,sort_order)
      values(category_uuid,item->>'name',item->>'slug',
        item->>'name'||' selected for The Snohomish catalogue.',item->>'size',
        (item->>'price')::numeric,25,true,true,(right(item->>'slug',1))::integer)
      on conflict(slug) do nothing
      returning id into product_uuid;
    end if;
  end loop;
end $$;

insert into public.homepage_product_sections
  (id,heading,category_id,product_ids,use_best_sellers,item_limit,sort_order,rotation_enabled,rotation_seconds,is_active)
select ('52000000-0000-4000-8000-'||lpad(row_number() over(order by c.sort_order,c.name)::text,12,'0'))::uuid,
       c.name||' Selection',c.id,
       array(select p.id from public.products p where p.category_id=c.id and p.is_active order by p.is_featured desc,p.sort_order,p.updated_at desc limit 8),
       false,8,100+row_number() over(order by c.sort_order,c.name),true,6,true
from public.categories c where c.is_active
on conflict(id) do update set heading=excluded.heading,category_id=excluded.category_id,
 product_ids=excluded.product_ids,item_limit=excluded.item_limit,sort_order=excluded.sort_order,
 rotation_enabled=true,rotation_seconds=6,is_active=true,updated_at=now();

insert into public.homepage_banners(id,title,subtitle,image_url,badge_text,button_label,button_url,sort_order,is_active)
values('b0000000-0000-4000-8000-000000000201','The Snohomish collection',
 'Explore wines, spirits, beer, mixers and more, selected for retail and wholesale customers.',
 '/premium-spirits-banner.svg','Shop the collection','Browse products','/shop',-200,true)
on conflict(id) do update set title=excluded.title,subtitle=excluded.subtitle,image_url=excluded.image_url,
 badge_text=excluded.badge_text,button_label=excluded.button_label,button_url=excluded.button_url,
 sort_order=excluded.sort_order,is_active=true,updated_at=now();

notify pgrst,'reload schema';
commit;
