-- Replace the launch-only merchandising rows with five professional,
-- category-led storefront carousels. Each row and its eight selected products
-- remain fully editable in Admin > Homepage rows.
begin;

update public.homepage_product_sections
set is_active = false, updated_at = now()
where id in (
 '50000000-0000-4000-8000-000000000101',
 '50000000-0000-4000-8000-000000000102',
 '50000000-0000-4000-8000-000000000103',
 '50000000-0000-4000-8000-000000000104'
);

insert into public.homepage_product_sections
 (id, heading, category_id, product_ids, use_best_sellers, item_limit, sort_order, rotation_enabled, rotation_seconds, is_active)
values
 ('51000000-0000-4000-8000-000000000101','Whisky Favourites',(select id from public.categories where slug='whisky' limit 1),array(select id from public.products where category_id=(select id from public.categories where slug='whisky' limit 1) and is_active order by is_top_seller desc, updated_at desc limit 8),false,8,10,true,6,true),
 ('51000000-0000-4000-8000-000000000102','Wines We Love',(select id from public.categories where slug='wine' limit 1),array(select id from public.products where category_id=(select id from public.categories where slug='wine' limit 1) and is_active order by is_featured desc, updated_at desc limit 8),false,8,20,true,6,true),
 ('51000000-0000-4000-8000-000000000103','Beer & Cider',(select id from public.categories where slug='beer' limit 1),array(select id from public.products where category_id=(select id from public.categories where slug='beer' limit 1) and is_active order by is_top_seller desc, updated_at desc limit 8),false,8,30,true,6,true),
 ('51000000-0000-4000-8000-000000000104','Gin Selection',(select id from public.categories where slug='gin' limit 1),array(select id from public.products where category_id=(select id from public.categories where slug='gin' limit 1) and is_active order by is_featured desc, updated_at desc limit 8),false,8,40,true,6,true),
 ('51000000-0000-4000-8000-000000000105','Champagne & Sparkling',(select id from public.categories where slug='champagne' limit 1),array(select id from public.products where category_id=(select id from public.categories where slug='champagne' limit 1) and is_active order by is_featured desc, updated_at desc limit 8),false,8,50,true,6,true)
on conflict (id) do update set
 heading=excluded.heading,
 category_id=excluded.category_id,
 product_ids=excluded.product_ids,
 item_limit=8,
 sort_order=excluded.sort_order,
 rotation_enabled=true,
 rotation_seconds=6,
 is_active=true,
 updated_at=now();

commit;
