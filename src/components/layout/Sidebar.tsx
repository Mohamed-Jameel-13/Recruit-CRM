'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Briefcase, 
  UploadCloud, 
  Users, 
  Sparkles, 
  FileCheck2, 
  CalendarClock, 
  BarChart3, 
  Workflow, 
  ShieldAlert,
  BrainCircuit,
  Bot
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Jobs & Criteria', icon: Briefcase },
  { href: '/upload', label: 'Upload CV Batches', icon: UploadCloud },
  { href: '/candidates', label: 'Candidates', icon: Users },
  { href: '/screening', label: 'Screening Review', icon: Sparkles, badge: 'AI' },
  { href: '/assessments', label: 'Assessments & CSV', icon: FileCheck2 },
  { href: '/interviews', label: 'Interviews & Calendar', icon: CalendarClock },
  { href: '/analytics', label: 'Live Analytics', icon: BarChart3 },
  { href: '/integrations', label: 'n8n & Integrations', icon: Workflow },
  { href: '/audit', label: 'Audit Activity', icon: ShieldAlert },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 min-h-screen flex flex-col fixed left-0 top-0 z-30">
      {/* Platform Branding */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <BrainCircuit className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-slate-100 text-sm tracking-wide flex items-center gap-1.5">
            RecruitAI
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-slate-400">Zero-Budget Automation</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-slate-300">
          Recruitment Pipeline
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600/30 to-indigo-500/10 text-indigo-300 border-l-2 border-indigo-500'
                  : 'text-slate-200 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-semibold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Semantic Intelligence Notice */}
      <div className="p-3 mx-3 mb-4 rounded-xl glass-card border border-indigo-500/20 bg-indigo-950/20">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-indigo-300">Semantic Matching</span>
        </div>
        <p className="text-[11px] text-slate-200 leading-relaxed">
          Screening uses transferable reasoning (e.g., MySQL <span className="text-cyan-400 font-mono">⇄</span> PostgreSQL, Vue <span className="text-cyan-400 font-mono">⇄</span> React) to prevent false score drops.
        </p>
      </div>

      {/* User / Org Footer */}
      <div className="p-4 border-t border-slate-800/80 flex items-center justify-between bg-slate-950/40">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300">
            SC
          </div>
          <div className="truncate">
            <p className="text-xs font-medium text-slate-200 truncate">Sarah Connor</p>
            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Admin • Acme Cloud
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
