-- Publish the text-based, native 4:1 Glenbrynth SVG without overwriting custom banners.
update public.homepage_banners
set image_url = '/premium-spirits-banner.svg',
    mobile_image_url = case
      when mobile_image_url is null
        or mobile_image_url in ('/premium-spirits-banner.png', '/premium-spirits-banner.svg')
      then '/premium-spirits-banner.svg'
      else mobile_image_url
    end,
    updated_at = now()
where image_url in ('/premium-spirits-banner.png', '/premium-spirits-banner.svg', '')
   or (id = 'b0000000-0000-4000-8000-000000000101' and image_url is null);
