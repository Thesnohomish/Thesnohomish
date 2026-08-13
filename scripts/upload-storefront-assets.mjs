#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.');
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const assets = [
  ['banner-images', 'storefront/premium-spirits-banner.svg'],
  ['banner-images', 'storefront/featured-brands-row-one.svg'],
  ['banner-images', 'storefront/featured-brands-row-two.svg'],
  ['product-images', 'storefront/glenbrynth-variants.svg'],
];
const uploaded = {};
for (const [bucket, path] of assets) {
  const filename = basename(path);
  const bytes = await readFile(join(process.cwd(), 'public', filename));
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: 'image/svg+xml', upsert: true });
  if (error) throw new Error(`${bucket}/${path}: ${error.message}`);
  uploaded[filename] = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

const { error: bannerError } = await supabase.from('homepage_banners').update({
  image_url: uploaded['premium-spirits-banner.svg'],
}).in('id', [
  'b0000000-0000-4000-8000-000000000201',
  'b0000000-0000-4000-8000-000000000301',
]);
if (bannerError) throw bannerError;

console.log(JSON.stringify({ uploaded: Object.keys(uploaded), bannerUpdated: true }, null, 2));
