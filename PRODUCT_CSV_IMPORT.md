# Product CSV mapping

The supplied legacy CSV shape must be normalized before insertion into
`public.products`:

| CSV field | Product column | Conversion |
|---|---|---|
| `name` | `name` | trim text; required |
| `price` | `price` | finite nonnegative number |
| `slug` | `slug` | trim text; required and used for conflict matching |
| `stock_quantity` | `stock` | finite nonnegative integer; default 0 |
| `is_active` | `is_active` | boolean |

`currency` may be accepted only as the existing `products.currency` value where
an importer explicitly supports it. `stock_status`, `published`, `available`,
and `featured` are legacy input signals and must not create database columns.
No category or country is inferred: an import row must be assigned later by an
administrator unless an explicit, unambiguous mapping is supplied. Imports must
upsert by `slug` or skip an existing slug so current products are never duplicated
or replaced accidentally.

## Grouped spreadsheet importer

Run `npm run supabase:import-grouped-products` with `PRODUCT_CSV_PATH`,
`NEXT_PUBLIC_SUPABASE_URL`, and the server-only `SUPABASE_SERVICE_ROLE_KEY`.
The importer matches `category` (or `category_name`) case-insensitively against
`public.categories.name` and writes only the resolved UUID to
`products.category_id`. Rows without a product name, slug, and numeric price are
treated as grouping headings and skipped. Rows with distinct SKUs or sizes retain
distinct product slugs, while an existing matching SKU/slug is updated rather
than duplicated.
