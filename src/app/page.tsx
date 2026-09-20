import React from 'react';
import Link from 'next/link';
import { BUSubmissionForm } from '@/components/public/bu-submission-form';
import { ShieldCheck, Lock } from 'lucide-react';

export default function PublicPage() {
  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-950 text-slate-100">
      <header className="max-w-4xl mx-auto flex justify-between items-center pb-6 border-b border-slate-800 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">eTap ISCSA Portal</h1>
            <p className="text-xs text-slate-400">ISO 27001 Compliance Self-Assessment Submission</p>
          </div>
        </div>

        <Link
          href="/login"
          className="flex items-center gap-2 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 py-2 px-3 rounded-lg border border-slate-800 transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          GRC Sign In
        </Link>
      </header>

      <BUSubmissionForm />
    </main>
  );
}