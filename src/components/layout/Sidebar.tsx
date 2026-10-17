'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  UploadCloud,
  Users,
  FileCheck2,
  CalendarClock,
  Zap,
  Sliders,
  Workflow,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/upload', label: 'Launch Pipeline', icon: Zap, badge: 'AI', primary: true },
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assessments', label: 'Assessment Hub', icon: FileCheck2 },
  { href: '/interviews', label: 'Interviews & Meet', icon: CalendarClock },
  { href: '/candidates', label: 'Candidates', icon: Users },
  { href: '/jobs', label: 'Jobs & Criteria', icon: Briefcase },
  { href: '/settings', label: 'Settings & LLM', icon: Sliders, badge: 'AI' },
  { href: '/integrations', label: 'Workflows & n8n', icon: Workflow },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] min-h-screen flex flex-col fixed left-0 top-0 z-30 transition-colors">
      {/* Brand */}
      <div className="h-14 px-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[var(--text-primary)] text-[var(--bg-page)] flex items-center justify-center font-bold text-sm shadow-sm">
            R
          </div>
          <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">
            RecruitAI
          </span>
        </Link>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
          v2.0
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">
        <div className="px-2 pb-2 text-[10px] font-semibold tracking-wider uppercase text-[var(--text-muted)]">
          Hiring Pipeline
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isPrimary = item.primary;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-medium transition-all ${
                isPrimary && !isActive
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : isActive
                  ? 'bg-[var(--bg-muted)] text-[var(--text-primary)] font-semibold border-l-2 border-[var(--accent)] pl-2'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  className={`w-4 h-4 ${
                    isPrimary && !isActive
                      ? 'text-amber-300'
                      : isActive
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[9px] px-1.5 rounded font-mono border font-semibold ${
                  isPrimary && !isActive
                    ? 'bg-white/20 text-white border-white/30'
                    : 'bg-blue-500/10 text-blue-500 dark:text-blue-400 border-blue-500/20'
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Pipeline Summary */}
      <div className="p-3 mx-2.5 mb-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] space-y-1">
        <div className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
          <UploadCloud className="w-3.5 h-3.5 text-blue-500" />
          <span>Fully Autonomous</span>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
          Upload CVs → AI screens → Assessment sent → Auto-graded → Interview booked with real Meet link.
        </p>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border-subtle)] flex items-center gap-2.5 bg-[var(--bg-subtle)] text-xs">
        <div className="w-7 h-7 rounded-full bg-[var(--border-strong)] text-[var(--text-primary)] font-semibold flex items-center justify-center text-[10px]">
          SC
        </div>
        <div className="truncate">
          <div className="font-medium text-[var(--text-primary)] truncate text-[11px]">Sarah Connor</div>
          <div className="text-[10px] text-[var(--text-muted)]">Lead Administrator</div>
        </div>
      </div>
    </aside>
  );
}
