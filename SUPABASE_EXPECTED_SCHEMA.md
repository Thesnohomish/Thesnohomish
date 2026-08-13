# Supabase schema audit

## Scope and method

This audit covers every repository use of `.from()`, `.select()`, `.insert()`,
`.update()`, `.upsert()`, `.delete()`, `.rpc()`, `storage.from()`, and Supabase
Auth, together with all SQL migrations, API routes, server helpers, admin pages,
account/checkout UI, and storefront query helpers. The repository has no
generated `database.types.ts`; its application types are maintained in
`src/lib/supabase.ts` and local component types, so no generated file was updated.

The additive repair is
`supabase/migrations/20260812120000_sync_copied_project_schema.sql`. Existing
migration files represent all expected tables, but a copied/partially migrated
project can lack later tables, columns, relationships, policies, and buckets.
The repair therefore reconciles runtime expectations directly and issues a
PostgREST schema-cache reload.

## Expected tables and access

| Table | Important code-required columns / constraints | Relationships | Required access |
|---|---|---|---|
| `admin_users` | UUID PK; unique `user_id`, unique `email`; `role`; `is_active` default true; timestamps | `user_id -> auth.users.id` | authenticated admin self/administrative checks only |
| `categories` | UUID PK; unique required `slug`; required `name`; `parent_id`, icon/image, description/color, SEO, sort, active, timestamps | self parent; target of `products.category_id` and homepage sections | active rows public read; admin write |
| `brands` | UUID PK; unique required slug; name, country, logo, active, timestamps | target of `products.brand_id` | active public read; admin write |
| `products` | UUID PK; name/slug/price; description/short description; tasting/pairing; SKU/barcode; price/old price/discount dates; stock/threshold; category/brand; gallery/image; ABV, origin, bottle and category-specific attributes; feature flags; SEO; active/sort/timestamps | category, brand; variants, order items, reviews | active public read; admin write; server checkout read |
| `product_variants` | UUID PK; product, name, SKU, options JSON, prices/discount schedule, stock/threshold, image, active/sort/timestamps | `product_id -> products` | active public read; admin write; server checkout read |
| `homepage_banners` | UUID PK; title, subtitle, desktop/mobile images, badge/button, active dates/sort, timestamps | none | active public read; admin write |
| `homepage_product_sections` | UUID PK; required heading; category; UUID product array default empty; best-seller flag; item limit; rotation fields; active/sort/timestamps | `category_id -> categories` | active public read; admin write |
| `promotions` | UUID PK; title/code; description; discount type/value; artwork/button; active dates/sort/timestamps | none | active public read; admin write |
| `store_settings` | text PK `key`; JSON `value`; description; `is_public`; timestamps | none | public rows anon read; private/admin write |
| `delivery_settings` | UUID PK; unique name; distance range, fee, ETA, active/sort/timestamps | none | active public read; admin write |
| `customers` | UUID PK; unique auth user; name/email/phone/loyalty; timestamps | `user_id -> auth.users` | owner and admin |
| `delivery_locations` | UUID PK; customer; label/address/building/apartment/instructions; coordinates/place fields; default/fee; timestamps | customer | owner and admin |
| `orders` | UUID PK; unique safe `order_number`; customer/contact/delivery/GPS/place fields; checkout token; totals; payment/status; rider/tracking/status timestamps; timestamps | customer, delivery location; items/payments/history/notifications | owner read; admin read/write; server checkout insert |
| `order_items` | UUID PK; order/product/variant; snapshot name, quantity, prices, timestamp | order, product, variant | order owner/admin; server checkout insert |
| `payments` | UUID PK; order/provider/status/amount; M-Pesa request/receipt/result/callback fields; timestamps | order | server-only writes; admin reads |
| `admin_notifications` | UUID PK; optional order; kind/title/body/read/timestamp | order | server write; admin read/write |
| `notification_deliveries` | UUID PK; order/channel/recipient/event unique; status/provider/error/attempts/timestamps | order | server write; admin read |
| `order_notifications` | same notification identity/status fields used for SMS/WhatsApp audit | order | server/admin only |
| `order_status_history` | UUID PK; order, from/to status, note, actor, timestamp | order; actor to auth user | owner/admin read; server/admin write |
| `reward_accounts` | UUID PK; unique customer; balances and timestamps | customer | owner read; admin write |
| `reward_transactions` | UUID PK; reward account/order/type/points/description/actor/time | account, order, auth actor | owner read; admin/server write |
| `reward_redemptions` | UUID PK; account, points, reward, status/use times | reward account | owner read; admin write |
| `product_reviews` | UUID PK; customer; unique order item; product; rating/review/published/time | customer, order item, product | owner write; published public read/admin moderation |

Migration-only operational tables (`inventory_movements`, `audit_log`) are
represented by earlier admin migrations but are not queried by the current
application. They are intentionally not dropped or renamed.

## Discrepancies repaired

### Missing tables

The reported target lacks `homepage_product_sections`. The migration also uses
`CREATE TABLE IF NOT EXISTS` for every runtime table above, covering any other
missing late-migration tables without replacing populated tables.

### Missing columns

Known missing columns repaired are `products.tasting_notes` and
`orders.order_number`. All product fields read or written by public queries,
admin editing, checkout, search, sitemap, and product detail pages are included,
including `pairing_suggestions`, merchandising flags, discount schedule,
inventory, SEO, media, and category-specific attributes. Order creation,
account, receipt, live-admin, dispatch, payment, delivery-location, and tracking
fields are likewise represented. Existing null order numbers are backfilled
from their unchanged UUIDs as `SNO-<12 hex characters>` and protected by a
partial unique index; checkout continues supplying human-facing numbers for new
orders.

### Missing foreign keys / PostgREST relationships

Conditional foreign keys repair all nested-select relationships. In particular,
`products.category_id -> categories.id` restores `categories(...)`, and the
migration also repairs product/brand, variants/product, order items/order,
items/product/variant, orders/customer/location, homepage section/category,
payment/notification/order, reward, and review relationships. Constraints are
added only when the local column has no existing FK, preserving equivalent
existing constraints.

## Storage audit

Runtime bucket references are:

- `product-images` (admin upload and import script)
- `category-images` (admin upload)
- `banner-images` (admin upload)

The migration creates/updates these as public-read buckets with a 10 MiB limit.
Object writes are limited to authenticated users for whom `public.is_admin()` is
true. No service-role credential is used in browser code.

## RLS audit

RLS is enabled rather than disabled. Catalogue/configuration tables require
public reads of active/public rows and authenticated-admin writes. Customer,
address, order, reward, and review data require ownership policies from the
existing canonical migrations, with admin access through `public.is_admin()`.
Payments and notifications remain server/admin data. The sync explicitly
repairs policies needed for the known missing homepage table, product/category
admin writes, and storage. Existing, more specific canonical owner policies are
preserved.

## Admin resilience

Admin loading already executes independent Supabase requests concurrently,
assigns successful product/category/banner/settings/section results separately,
and reports every failed resource with the exact Supabase message. Therefore an
optional homepage-section failure does not discard successful product/category
results; the schema migration fixes the underlying failure rather than hiding it.

## Manual steps

1. Review and apply the sync migration to the existing linked Supabase project.
2. Confirm prior migrations are recorded with `supabase migration list --linked`.
3. Verify the three buckets and their policies in Storage.
4. Re-run `supabase/LIVE_DATABASE_AUDIT.sql` and refresh the admin dashboard.
5. If the target has a legacy column with an incompatible non-UUID type, inspect
   and migrate it manually; this migration intentionally does not blindly rename
   or destructively cast populated columns.

## Catalogue, homepage rows, and asset upload

`20260812130000_seed_category_products_rows_banner.sql` supplies a conservative
starter catalogue only where an active category has fewer than five products.
It uses stable slugs and `ON CONFLICT` handling, preserves all merchant data,
creates an editable homepage row for every active category, and adds the main
storefront banner. Apply it after the schema-sync migration.

To copy the committed banner/brand artwork into the existing Supabase Storage
buckets and update the banner to its Storage public URL, run the server-only
`npm run supabase:upload-storefront-assets` command with
`NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The service-role key
must never use a `NEXT_PUBLIC_` name or be exposed to browser code.

## Exact high-priority column definitions

### `products`

| Column | SQL type | Null/default |
|---|---|---|
| `id` | `uuid` PK | required, `gen_random_uuid()` |
| `category_id` | `uuid` FK | nullable |
| `brand_id` | `uuid` FK | nullable |
| `name` | `text` | required |
| `slug` | `text` | required, unique |
| `description`, `short_description` | `text` | nullable |
| `tasting_notes`, `pairing_suggestions` | `text` | nullable |
| `country`, `bottle_size`, `grape_variety`, `wine_type`, `sweetness` | `text` | nullable |
| `whisky_type`, `age_statement`, `beer_type`, `pack_size`, `product_format`, `gin_style`, `flavour` | `text` | nullable |
| `abv` | `numeric(5,2)` | nullable |
| `sku`, `barcode` | `text` | nullable; SKU is unique in canonical schema |
| `price` | `numeric(12,2)` | required, nonnegative |
| `old_price` | `numeric(12,2)` | nullable |
| `currency` | `text` | required, default `KES` |
| `discount_starts_at`, `discount_ends_at` | `timestamptz` | nullable |
| `discount_label` | `text` | nullable |
| `stock` | `integer` | required, default 0 |
| `low_stock_threshold` | `integer` | required, default 5 |
| `track_inventory` | `boolean` | required, default true |
| `image_url` | `text` | nullable |
| `gallery_urls` | `text[]` | required, default empty |
| `is_featured`, `is_top_seller`, `is_new_arrival` | `boolean` | required, default false |
| `is_active` | `boolean` | required, default true |
| `sort_order` | `integer` | required, default 0 |
| `seo_title`, `seo_description` | `text` | nullable |
| `weight_grams` | `integer` | nullable, nonnegative in canonical schema |
| `metadata` | `jsonb` | required, default `{}` |
| `created_at`, `updated_at` | `timestamptz` | required, default `now()` |

Indexes/uniques: PK `id`; unique `slug`; canonical unique nullable `sku`;
indexes on `(category_id)` and `(is_active, sort_order, created_at desc)`.

### `homepage_product_sections`

| Column | SQL type | Null/default |
|---|---|---|
| `id` | `uuid` PK | required, generated UUID |
| `heading` | `text` | required |
| `category_id` | `uuid` FK | nullable |
| `product_ids` | `uuid[]` | required, empty array |
| `use_best_sellers` | `boolean` | required, false |
| `item_limit` | `integer` | required, 8 |
| `sort_order` | `integer` | required, 0 |
| `rotation_enabled` | `boolean` | required, false |
| `rotation_seconds` | `integer` | required, 6 |
| `is_active` | `boolean` | required, true |
| `created_at`, `updated_at` | `timestamptz` | required, `now()` |

Relationship: `category_id -> categories.id ON DELETE SET NULL`. Index on
`(is_active, sort_order)`. Active rows are public-readable; admin writes only.

### `orders`

| Column group | Columns / SQL types |
|---|---|
| Identity | `id uuid` PK; `order_number text` unique; `checkout_token uuid` unique |
| Owner | `customer_id uuid`; `delivery_location_id uuid` |
| Customer snapshot | `customer_name text`, `customer_email text`, `customer_phone text` |
| Delivery | `delivery_address text`, `gps_lat/gps_lng numeric(10,7)`, `delivery_place_id text`, `delivery_place_name text`, `delivery_location_verified boolean default false`, `delivery_instructions text` |
| Workflow | `status text default pending`, `rider_name text`, `rider_phone text`, `tracking_url text`, `accepted_at`, `processing_at`, `dispatched_at`, `delivered_at`, `cancelled_at` (`timestamptz`) |
| Payment | `payment_method text default mpesa`, `payment_status text default pending`, `payment_reference text` |
| Totals | `subtotal numeric(12,2)`, `delivery_fee numeric(10,2)`, `discount_total numeric(10,2)`, `total numeric(12,2)`; required defaults 0 |
| Notes/time | `gift_note text`, `admin_notes text`, required `created_at/updated_at timestamptz default now()` |

Relationships: customer and delivery location, plus reverse nested relations to
order items, payments, status history, order notifications, and notification
deliveries. Indexes: unique non-null order number, unique checkout token, and
`(customer_id, created_at desc)`.

### `order_items`

`id uuid` PK; required `order_id uuid`, `product_name text`, `quantity integer`,
`unit_price numeric(12,2)`, `line_total numeric(12,2)`; nullable `product_id uuid`
and `variant_id uuid`; required `created_at timestamptz default now()`.
Relationships are order→orders, product→products, and variant→product_variants.

### `categories`

`id uuid` PK; required unique `slug` and required `name`; nullable `parent_id`,
`icon`, `image_url`, `description`, `color`, `seo_title`, `seo_description`;
required `sort_order integer default 0`, `is_active boolean default true`, and
timestamps. `parent_id` self-references categories; products and homepage rows
reference `categories.id`.

### `admin_users`

`id uuid` PK; required unique `user_id uuid -> auth.users.id`; required unique
`email text`; required `role text default admin`; required
`is_active boolean default true`; timestamps. No migration changes existing
administrator records.

## Complete nested-select relationship inventory

- `products.categories(...)`: `products.category_id -> categories.id`
- `products.brands(...)`: `products.brand_id -> brands.id`
- `products.product_variants(...)`: `product_variants.product_id -> products.id`
- `orders.order_items(...)`: `order_items.order_id -> orders.id`
- `orders.payments(...)`: `payments.order_id -> orders.id`
- `orders.order_status_history(...)`: `order_status_history.order_id -> orders.id`
- `orders.order_notifications(...)`: `order_notifications.order_id -> orders.id`
- `orders.notification_deliveries(...)`: `notification_deliveries.order_id -> orders.id`
- `order_items.products(...)`: `order_items.product_id -> products.id`
- `order_items.orders(...)` / `orders!inner(...)`: `order_items.order_id -> orders.id`
- `reward_accounts.customers(...)`: `reward_accounts.customer_id -> customers.id`
- `reward_transactions.reward_accounts(...)`: account FK; nested customer follows the reward account customer FK.

## Migration created but not applied

`supabase/migrations/20260812140000_sync_complete_schema.sql` is the requested
complete additive migration. It was generated from the repository audit and was
**not applied to any Supabase project**.
