import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'RecruitAI — AI Recruitment Automation Platform',
  description: 'Zero-budget AI-assisted HR recruitment automation platform with semantic matching, n8n orchestration, and Google Workspace integration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#090d16] text-slate-100 selection:bg-indigo-500 selection:text-white">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 ml-64 p-6 lg:p-8 max-w-7xl">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
