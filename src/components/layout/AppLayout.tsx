'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();

  // If this is a candidate-facing assessment route, isolate it completely:
  // No recruiter sidebar, no recruiter header, no admin buttons, full-width distraction-free canvas.
  const isCandidateAssessmentRoute = pathname?.startsWith('/assessment/take');

  if (isCandidateAssessmentRoute) {
    return (
      <main className="min-h-screen w-full bg-slate-50 text-slate-900 transition-colors">
        {children}
      </main>
    );
  }

  // Recruiter Dashboard layout
  return (
    <div className="flex min-h-screen bg-[var(--bg-page)] transition-colors">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 ml-60 p-6 lg:p-8 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
