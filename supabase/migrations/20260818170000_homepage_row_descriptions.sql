alter table public.homepage_product_sections
  add column if not exists description text;

comment on column public.homepage_product_sections.description is
  'Optional short storefront copy displayed beneath the homepage row heading.';

update public.homepage_product_sections
set description = 'Fresh weekly offers at better prices.'
where lower(trim(heading)) = 'deals za wiki'
  and nullif(trim(description), '') is null;
