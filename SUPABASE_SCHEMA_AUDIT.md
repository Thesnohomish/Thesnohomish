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
