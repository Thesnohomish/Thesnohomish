'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createBrowserSupabase } from '@/lib/supabase-browser';

export default function AdminResetPasswordPage() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [newPassword, setNewPassword] = useState(''), [confirmPassword, setConfirmPassword] = useState('');
  const [ready, setReady] = useState(false), [loading, setLoading] = useState(false), [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    async function recoverSession() {
      if (!supabase) { if (active) { setMessage('Supabase is not configured.'); setReady(true); } return; }
      try {
        const url = new URL(window.location.href), code = url.searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          window.history.replaceState({}, '', url.pathname);
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!data.session) throw new Error('This password reset link is invalid or has expired.');
      } catch (cause) {
        setMessage(cause instanceof Error ? cause.message : 'The password reset link could not be verified.');
      } finally {
        if (active) setReady(true);
      }
    }
    void recoverSession();
    return () => { active = false; };
  }, [supabase]);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    if (newPassword !== confirmPassword) { setMessage('The passwords do not match.'); return; }
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMessage('Your password has been updated. You can now return to admin login.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (cause) {
      console.error('Admin password update failed:', cause);
      setMessage(cause instanceof Error ? cause.message : 'The password could not be updated.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="mx-auto max-w-md px-4 py-16"><section className="rounded-3xl bg-white p-7 shadow-card"><p className="font-bold uppercase text-brand-orange">Admin security</p><h1 className="mt-2 text-3xl font-black">Reset your password</h1>{!ready?<p className="mt-5">Verifying reset link…</p>:<form onSubmit={updatePassword} className="mt-6 grid gap-3"><input type="password" value={newPassword} onChange={event=>setNewPassword(event.target.value)} autoComplete="new-password" placeholder="New password" className="rounded-xl border p-3" required/><input type="password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Confirm new password" className="rounded-xl border p-3" required/><button disabled={loading} className="orange-gradient rounded-xl p-3 font-black text-white">{loading?'Updating…':'Update password'}</button></form>}{message&&<p role="status" className="mt-4 text-sm font-bold">{message}</p>}<Link href="/admin" className="mt-5 inline-block font-bold text-brand-deep underline">Return to admin login</Link></section></main>;
}
