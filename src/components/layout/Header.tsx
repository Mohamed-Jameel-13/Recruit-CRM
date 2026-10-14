'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  UploadCloud, 
  Sparkles, 
  Activity, 
  CheckCircle2, 
  HelpCircle,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

export function Header() {
  const [activeRole, setActiveRole] = useState<'admin' | 'recruiter'>('admin');

  return (
    <header className="h-16 border-b border-slate-800/80 glass-panel sticky top-0 z-20 px-6 flex items-center justify-between ml-64">
      {/* Left: Organization & Role Context */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
          <span className="text-slate-200">Organization:</span>
          <span className="font-semibold text-slate-200">Acme Cloud Innovations</span>
        </div>

        {/* Role Toggle for RBAC Testing */}
        <div className="flex items-center bg-slate-900/80 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setActiveRole('admin')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
              activeRole === 'admin'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-200 hover:text-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Admin Role
          </button>
          <button
            onClick={() => setActiveRole('recruiter')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
              activeRole === 'recruiter'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-200 hover:text-slate-100'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Recruiter Role
          </button>
        </div>
      </div>

      {/* Right: Live Integration Status & Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Status Indicators */}
        <div className="hidden lg:flex items-center gap-3 text-xs bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-lg">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Supabase Ready</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Semantic Matcher</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center gap-1.5 text-amber-400">
            <Activity className="w-3.5 h-3.5" />
            <span>n8n Webhook</span>
          </div>
        </div>

        <Link
          href="/upload"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload CVs</span>
        </Link>
      </div>
    </header>
  );
}
