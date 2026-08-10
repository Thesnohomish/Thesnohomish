-- Curate an ecommerce-first homepage. All seeded records remain editable through
-- the existing Products, Homepage rows, and Website content admin screens.
begin;

-- Use the existing Glenbrynth catalog as the launch promotion and make the
-- merchandising flags/discounts immediately editable in public.products.
update public.products
set is_featured = true,
    is_new_arrival = slug in ('glenbrynth-bourbon-cask-nas','glenbrynth-sherry-cask-single-malt','glenbrynth-rum-cask-single-malt'),
    is_top_seller = slug in ('glenbrynth-3yo','glenbrynth-12yo-blended-malt'),
    old_price = case
      when slug = 'glenbrynth-3yo' then greatest(coalesce(price, 1400), 1800)
      when slug like 'glenbrynth-%cask%' then greatest(coalesce(price, 3136), 3600)
      else old_price
    end,
    discount_label = case when slug in ('glenbrynth-3yo','glenbrynth-bourbon-cask-nas','glenbrynth-sherry-cask-single-malt','glenbrynth-rum-cask-single-malt') then 'Flash sale' else discount_label end,
    updated_at = now()
where slug like 'glenbrynth-%';

insert into public.homepage_banners
  (id, title, subtitle, image_url, badge_text, button_label, button_url, sort_order, is_active)
values
  ('b0000000-0000-4000-8000-000000000101', 'Buy one Glenbrynth.', 'Explore every Glenbrynth expression and enjoy our limited buy one, get one free event while promotional stock lasts.', '/the-snohomish-logo.svg', 'Buy one · Get one free', 'Shop Glenbrynth', '/search?q=glenbrynth', -100, true)
on conflict (id) do update set
  title = excluded.title, subtitle = excluded.subtitle, image_url = excluded.image_url,
  badge_text = excluded.badge_text, button_label = excluded.button_label,
  button_url = excluded.button_url, sort_order = excluded.sort_order,
  is_active = excluded.is_active, updated_at = now();

insert into public.homepage_product_sections
  (id, heading, product_ids, use_best_sellers, item_limit, sort_order, is_active)
values
  ('50000000-0000-4000-8000-000000000101', 'Deals of the Day', array(select id from public.products where is_featured order by updated_at desc limit 8), false, 8, 10, true),
  ('50000000-0000-4000-8000-000000000102', 'New Arrivals', array(select id from public.products where is_new_arrival order by updated_at desc limit 8), false, 8, 20, true),
  ('50000000-0000-4000-8000-000000000103', 'Unique Products', array(select id from public.products where slug in ('glenbrynth-12yo-blended-malt','glenbrynth-bourbon-cask-nas','glenbrynth-sherry-cask-single-malt','glenbrynth-rum-cask-single-malt','glenbrynth-30yo','glenbrynth-40yo') order by price limit 8), false, 8, 30, true),
  ('50000000-0000-4000-8000-000000000104', 'Flash Sales', array(select id from public.products where old_price is not null and old_price > price order by updated_at desc limit 8), false, 8, 40, true)
on conflict (id) do update set
  heading = excluded.heading, product_ids = excluded.product_ids,
  use_best_sellers = excluded.use_best_sellers, item_limit = excluded.item_limit,
  sort_order = excluded.sort_order, is_active = excluded.is_active, updated_at = now();

commit;
