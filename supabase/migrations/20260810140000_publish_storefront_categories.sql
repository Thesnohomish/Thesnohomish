-- Guarantee that the primary ecommerce category row is populated from Supabase.
-- Admins can rename, reorder, illustrate, or hide these records after deployment.
insert into public.categories (id, name, slug, description, sort_order, is_active)
values
 ('c1000000-0000-4000-8000-000000000001','Wine','wine','Red, white, rosé and dessert wines.',10,true),
 ('c1000000-0000-4000-8000-000000000002','Whisky','whisky','Blended, bourbon and single malt whisky.',20,true),
 ('c1000000-0000-4000-8000-000000000003','Gin','gin','Classic, flavoured and premium gin.',30,true),
 ('c1000000-0000-4000-8000-000000000004','Vodka','vodka','Classic and flavoured vodka.',40,true),
 ('c1000000-0000-4000-8000-000000000005','Tequila','tequila','Blanco, reposado and gold tequila.',50,true),
 ('c1000000-0000-4000-8000-000000000006','Rum','rum','White, dark, spiced and aged rum.',60,true),
 ('c1000000-0000-4000-8000-000000000007','Brandy','brandy','Brandy and cognac selections.',70,true),
 ('c1000000-0000-4000-8000-000000000008','Liqueur','liqueur','Cream, fruit and herbal liqueurs.',80,true),
 ('c1000000-0000-4000-8000-000000000009','Beer','beer','Local, imported and craft beer.',90,true),
 ('c1000000-0000-4000-8000-000000000010','Champagne','champagne','Champagne for celebrations and gifting.',100,true),
 ('c1000000-0000-4000-8000-000000000011','Sparkling','sparkling','Prosecco and sparkling wine.',110,true),
 ('c1000000-0000-4000-8000-000000000012','Spirits','spirits','Explore the complete spirits collection.',120,true),
 ('c1000000-0000-4000-8000-000000000013','Mixers','mixers','Tonic, soda and cocktail mixers.',130,true),
 ('c1000000-0000-4000-8000-000000000014','Soft Drinks','soft-drinks','Refreshing non-alcoholic drinks.',140,true),
 ('c1000000-0000-4000-8000-000000000015','Energy Drinks','energy-drinks','Energy drinks and functional beverages.',150,true),
 ('c1000000-0000-4000-8000-000000000016','Snacks','snacks','Snacks for parties and everyday moments.',160,true)
on conflict (slug) do update set
 name=excluded.name,
 description=coalesce(public.categories.description,excluded.description),
 is_active=true;
