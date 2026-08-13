'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/lib/supabase-browser';

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;
    if (!supabase) {
      setError('Supabase is not configured.');
      setCheckingSession(false);
      return;
    }
    const client = supabase;

    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) {
        setSessionReady(true);
        setError('');
      }
      setCheckingSession(false);
    });

    async function recoverSession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          window.history.replaceState({}, '', url.pathname);
        }
        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        if (!active) return;
        setSessionReady(Boolean(data.session));
        if (!data.session) setError('This password recovery link is invalid or has expired. Request a new link from the admin login page.');
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'The password recovery link could not be verified.');
      } finally {
        if (active) setCheckingSession(false);
      }
    }

    void recoverSession();
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !sessionReady) return;
    if (newPassword !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    const { data, error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (!data.user) {
      setError('Supabase did not return the updated user.');
      return;
    }
    setSuccess('Password updated successfully');
    setNewPassword('');
    setConfirmPassword('');
    window.setTimeout(() => router.replace('/admin/login'), 1200);
  }

  return <main className="mx-auto max-w-md px-4 py-16"><section className="rounded-3xl bg-white p-7 shadow-card"><p className="font-bold uppercase text-brand-orange">Admin security</p><h1 className="mt-2 text-3xl font-black">Reset your password</h1>{checkingSession&&<p className="mt-5">Verifying recovery link…</p>}{!checkingSession&&sessionReady&&!success&&<form onSubmit={updatePassword} className="mt-6 grid gap-3"><input type="password" value={newPassword} onChange={event=>setNewPassword(event.target.value)} autoComplete="new-password" placeholder="New password" className="rounded-xl border p-3" required/><input type="password" value={confirmPassword} onChange={event=>setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Confirm new password" className="rounded-xl border p-3" required/><button disabled={loading} className="orange-gradient rounded-xl p-3 font-black text-white">{loading?'Updating…':'Update password'}</button></form>}{success&&<p role="status" className="mt-5 font-bold text-green-700">{success}</p>}{error&&<p role="alert" className="mt-4 text-sm font-bold text-red-700">{error}</p>}<Link href="/admin/login" className="mt-5 inline-block font-bold text-brand-deep underline">Return to admin login</Link></section></main>;
}
