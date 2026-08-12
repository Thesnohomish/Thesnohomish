#!/usr/bin/env node

import { unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'evancekirigia@gmail.com';
const EXPECTED_PROJECT_URL = 'https://xttdnlqxbtgdspfczsnw.supabase.co';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.ADMIN_TEMP_PASSWORD;

if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.');
if (url !== EXPECTED_PROJECT_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL does not identify the expected existing Supabase project.');
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
if (!password) throw new Error('ADMIN_TEMP_PASSWORD is required.');

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let page = 1;
let user;
do {
  const result = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (result.error) throw result.error;
  user = result.data.users.find(candidate => candidate.email?.trim().toLowerCase() === ADMIN_EMAIL);
  if (user || result.data.users.length < 1000) break;
  page += 1;
} while (!user);

if (!user) throw new Error(`No Supabase Auth user exists for ${ADMIN_EMAIL}.`);

const updateResult = await supabase.auth.admin.updateUserById(user.id, {
  password,
  email_confirm: true,
});
if (updateResult.error) throw updateResult.error;

const verificationResult = await supabase.auth.admin.getUserById(user.id);
if (verificationResult.error) throw verificationResult.error;
const verifiedUser = verificationResult.data.user;
if (!verifiedUser) throw new Error('Password updated, but Supabase did not return the user during verification.');
if (verifiedUser.email?.trim().toLowerCase() !== ADMIN_EMAIL) throw new Error('Verified Auth user email does not match the requested administrator.');

// This is deliberately a one-use operator script. Removing it after success
// prevents the privileged reset operation from remaining available.
await unlink(fileURLToPath(import.meta.url));

console.log(JSON.stringify({
  userId: verifiedUser.id,
  passwordUpdateSucceeded: true,
  emailConfirmed: Boolean(verifiedUser.email_confirmed_at),
  resetScriptDisabled: true,
}, null, 2));
