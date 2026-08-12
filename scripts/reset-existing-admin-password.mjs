#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

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
if (!adminEmail) throw new Error('ADMIN_EMAIL is required.');
if (!publicKey) throw new Error('A Supabase publishable or anon key is required to verify normal password login.');

const serverAdmin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const usersResult = await serverAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersResult.error) throw usersResult.error;
const authUser = usersResult.data.users.find(user => user.email?.trim().toLowerCase() === adminEmail);
if (!authUser) throw new Error(`No Supabase Auth user exists for ${adminEmail}. Create or invite that user before resetting its password.`);

const adminResult = await serverAdmin.from('admin_users').select('user_id,is_active').eq('user_id', authUser.id).maybeSingle();
if (adminResult.error) throw adminResult.error;
if (!adminResult.data?.is_active) throw new Error(`The Auth user for ${adminEmail} is not an active administrator.`);

const previousLastSignIn = authUser.last_sign_in_at || null;
const updateResult = await serverAdmin.auth.admin.updateUserById(authUser.id, {
  password,
  email_confirm: true,
});
if (updateResult.error) throw updateResult.error;

const verificationResult = await serverAdmin.auth.admin.getUserById(authUser.id);
if (verificationResult.error) throw verificationResult.error;
if (!verificationResult.data.user) throw new Error('Password updated, but getUserById did not return the user.');

const publicClient = createClient(url, publicKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const loginResult = await publicClient.auth.signInWithPassword({
  email: adminEmail,
  password,
});
if (loginResult.error) throw loginResult.error;
if (!loginResult.data.session || !loginResult.data.user) {
  throw new Error('Supabase did not return an authenticated session');
}

const afterLoginResult = await serverAdmin.auth.admin.getUserById(authUser.id);
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
