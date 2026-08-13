-- Preserve the current committed hero as an editable Supabase banner. Existing
-- banners remain active and are automatically included in the storefront carousel.
insert into public.homepage_banners
  (id, title, subtitle, image_url, badge_text, button_label, button_url, sort_order, is_active)
values
  (
    'b0000000-0000-4000-8000-000000000301',
    'Premium wines and spirits',
    'Explore The Snohomish collection for retail, wholesale and reliable Nairobi delivery.',
    '/premium-spirits-banner.svg',
    'The Snohomish collection',
    'Shop now',
    '/shop',
    -300,
    true
  )
on conflict (id) do update set
  title = excluded.title,
  subtitle = excluded.subtitle,
  image_url = case
    when public.homepage_banners.image_url is null or public.homepage_banners.image_url = ''
      then excluded.image_url
    else public.homepage_banners.image_url
  end,
  badge_text = excluded.badge_text,
  button_label = excluded.button_label,
  button_url = excluded.button_url,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

notify pgrst, 'reload schema';
