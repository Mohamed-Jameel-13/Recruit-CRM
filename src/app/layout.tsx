import type { Metadata } from 'next';
import './globals.css';
import { AppLayout } from '@/components/layout/AppLayout';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: 'RecruitAI — Intelligent Recruitment Platform',
  description: 'AI-assisted HR recruitment platform with universal LLM integration, semantic matching, and automated pipelines.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)] antialiased">
        <ThemeProvider>
          <ToastProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
