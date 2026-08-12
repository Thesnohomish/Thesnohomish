# Chupa Hub admin dashboard

The production admin dashboard lives inside the existing Next.js storefront, not in a second Vercel project:

- Production URL: `https://www.chupahub.com/admin`
- Local URL: `http://localhost:3000/admin`

## Vercel project routing

The Next.js application lives at the repository root and uses Vercel's native
Next.js framework detection without custom routing for `/_next/static` assets.

## Required Vercel environment variables

Set these variables on the existing Vercel project connected to `www.chupahub.com`:

```text
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

The Vercel integration's `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and legacy public anon-key variants are also supported. The admin browser client uses only the centralized public URL and publishable/anon key with Supabase Auth and RLS.

Never add a Supabase service-role key to Vercel public variables or frontend code.

## First administrator

1. Create or confirm the user in **Supabase Dashboard → Authentication → Users**.
2. Run this SQL in the Supabase SQL editor, replacing the email only if needed:

```sql
insert into public.admin_users (user_id, email, role, is_active)
select id, email, 'admin', true
from auth.users
where lower(email) = lower('Evancekirigia@gmail.com')
on conflict (user_id) do update
set email = excluded.email,
    role = 'admin',
    is_active = true,
    updated_at = now();
```

The password must be managed in Supabase Auth. Do not store it in the repository.

## Admin capabilities

After signing in, `/admin` manages live Supabase data for:

- Products, prices, compare-at prices, stock, low-stock alerts, images, gallery URLs, SEO fields and publish/top-seller/new-arrival flags.
- Product variants with options JSON, variant prices, stock and images.
- Categories, unlimited parent/child category relationships, category icons/images and SEO fields.
- Brands, homepage banners, promotions, delivery zones and store settings.
- Orders, payment statuses, order workflow statuses, customers, audit logs and reports.

All writes are protected by Supabase Auth plus RLS policies. The browser uses the public anon/publishable key and never bypasses RLS.

## Simplified catalog update

Run `supabase/migrations/20260719120000_simplified_storefront_admin.sql` once in the Supabase SQL Editor before deploying this version. It is additive and safe to rerun: it preserves existing products, customers, orders and categories, links order items to optional product sizes, creates the editable public website-content settings, and adds the automatic-slug safeguard.

No Vercel project or routing change is required for this update. Keep the existing project rooted at this repository with the committed root `vercel.json`, and keep its existing Supabase integration connected in the Production environment.
