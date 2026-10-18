'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePipeline } from './PipelineProvider';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

export function GlobalPipelineStatusBar() {
  const { isRunning, screeningProgress, phase, uploadResult } = usePipeline();
  const pathname = usePathname();

  // If already on the upload page or idle, no need for the floating status bar
  if (!isRunning || pathname === '/upload') {
    return null;
  }

  const percent =
    screeningProgress.total > 0
      ? Math.round((screeningProgress.current / screeningProgress.total) * 100)
      : 50;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
      <div className="bg-neutral-900/95 dark:bg-neutral-900/95 backdrop-blur-md border border-neutral-700/80 rounded-xl shadow-2xl p-3.5 max-w-sm flex flex-col gap-2.5 text-xs text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />
            <span className="font-semibold truncate max-w-[200px]">
              {screeningProgress.candidateName
                ? `Screening: ${screeningProgress.candidateName}`
                : 'Processing Pipeline...'}
            </span>
          </div>
          <span className="font-mono text-neutral-400 text-[11px] shrink-0">
            {screeningProgress.current}/{screeningProgress.total} ({percent}%)
          </span>
        </div>

        <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] pt-0.5">
          <span className="text-neutral-400">
            {uploadResult?.processed.filter((p) => p.isShortlisted).length || 0} shortlisted so far
          </span>
          <Link
            href="/upload"
            className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1 hover:underline"
          >
            <span>View Pipeline</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
