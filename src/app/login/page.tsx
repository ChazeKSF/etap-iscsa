'use client';

import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/grc/dashboard');
    }
  }, [status, router]);

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400">
            <ShieldCheck className="w-10 h-10" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            eTap GRC Operations
          </h1>
          <p className="text-sm text-slate-400">
            Restricted Gateway • ISO 27001 Compliance Portal
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-left">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Access Denied. Your account is not authorized to access GRC Operations.</span>
          </div>
        )}

        <button
          onClick={() => signIn('google', { callbackUrl: '/grc/dashboard' })}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
          <Lock className="w-4 h-4" />
          Sign in with Google SSO
        </button>

        <p className="text-xs text-slate-500">
          Authorized GRC Personnel only. Business Units should access the public submission link.
        </p>
      </div>
    </main>
  );
}