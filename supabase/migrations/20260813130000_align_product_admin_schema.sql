-- Align the existing products table with the fields read and written by the
-- current admin and storefront. Additive only: existing products are preserved.
create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.categories
  add column if not exists name text,
  add column if not exists slug text,
  add column if not exists is_active boolean not null default true;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text,
  slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists description text,
  add column if not exists tasting_notes text,
  add column if not exists pairing_suggestions text,
  add column if not exists country text,
  add column if not exists bottle_size text,
  add column if not exists grape_variety text,
  add column if not exists wine_type text,
  add column if not exists sweetness text,
  add column if not exists whisky_type text,
  add column if not exists age_statement text,
  add column if not exists beer_type text,
  add column if not exists pack_size text,
  add column if not exists product_format text,
  add column if not exists gin_style text,
  add column if not exists flavour text,
  add column if not exists abv numeric(5,2),
  add column if not exists stock integer not null default 0,
  add column if not exists low_stock_threshold integer not null default 5,
  add column if not exists image_url text,
  add column if not exists gallery_urls text[] not null default '{}',
  add column if not exists price numeric(12,2) not null default 0,
  add column if not exists category_id uuid,
  add column if not exists is_active boolean not null default true;

create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_admin_name_idx on public.products(name);

-- Add the PostgREST-discoverable relationship only if category_id does not
-- already have a foreign key. Existing equivalent constraints are preserved.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.products'::regclass
      and contype = 'f'
      and conkey = array[(select attnum from pg_attribute where attrelid='public.products'::regclass and attname='category_id')]
  ) then
    alter table public.products
      add constraint products_category_id_fkey
      foreign key (category_id) references public.categories(id) on delete set null;
  end if;
end $$;

notify pgrst, 'reload schema';
