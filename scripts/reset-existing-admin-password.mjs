#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const ADMIN_USER_ID = 'aa001392-35bf-464d-b646-eb1f2bbebdaa';
const ADMIN_EMAIL = 'evancekirigia@gmail.com';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.ADMIN_TEMP_PASSWORD;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || process.env.SUPABASE_PUBLISHABLE_KEY
  || process.env.SUPABASE_ANON_KEY;

if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.');
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
if (!password) throw new Error('ADMIN_TEMP_PASSWORD is required.');
if (!publicKey) throw new Error('A Supabase publishable or anon key is required to verify normal password login.');

const serverAdmin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const beforeResult = await serverAdmin.auth.admin.getUserById(ADMIN_USER_ID);
if (beforeResult.error) throw beforeResult.error;
if (!beforeResult.data.user) throw new Error('The existing admin Auth user was not found.');
if (beforeResult.data.user.email?.toLowerCase() !== ADMIN_EMAIL) {
  throw new Error('The supplied user ID does not belong to the expected admin email.');
}

const previousLastSignIn = beforeResult.data.user.last_sign_in_at || null;
const updateResult = await serverAdmin.auth.admin.updateUserById(ADMIN_USER_ID, {
  password,
  email_confirm: true,
});
if (updateResult.error) throw updateResult.error;

const verificationResult = await serverAdmin.auth.admin.getUserById(ADMIN_USER_ID);
if (verificationResult.error) throw verificationResult.error;
if (!verificationResult.data.user) throw new Error('Password updated, but getUserById did not return the user.');

const publicClient = createClient(url, publicKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const loginResult = await publicClient.auth.signInWithPassword({
  email: ADMIN_EMAIL.trim(),
  password,
});
if (loginResult.error) throw loginResult.error;
if (!loginResult.data.session || !loginResult.data.user) {
  throw new Error('Supabase did not return an authenticated session');
}

const afterLoginResult = await serverAdmin.auth.admin.getUserById(ADMIN_USER_ID);
if (afterLoginResult.error) throw afterLoginResult.error;
const currentLastSignIn = afterLoginResult.data.user?.last_sign_in_at || null;
await publicClient.auth.signOut();

console.log(JSON.stringify({
  passwordUpdateSucceeded: Boolean(updateResult.data.user),
  getUserByIdSucceeded: Boolean(verificationResult.data.user),
  signInWithPasswordSucceeded: true,
  userId: verificationResult.data.user.id,
  email: verificationResult.data.user.email,
  emailConfirmed: Boolean(verificationResult.data.user.email_confirmed_at),
  lastSignInAtChanged: Boolean(currentLastSignIn && currentLastSignIn !== previousLastSignIn),
  lastSignInAt: currentLastSignIn,
}, null, 2));
