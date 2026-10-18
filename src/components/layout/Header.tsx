'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  UploadCloud, 
  Sun, 
  Moon, 
  RotateCcw, 
  Cpu,
  AlertTriangle,
  X
} from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';
import { useToast } from '@/components/ui/Toast';

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [llmModel, setLlmModel] = useState<string>('Detecting...');

  useEffect(() => {
    fetch('/api/llm/config')
      .then(res => res.json())
      .then(data => {
        if (data.config?.model) {
          setLlmModel(data.config.model);
        }
      })
      .catch(() => setLlmModel('Universal LLM'));
  }, []);

  async function handleConfirmReset() {
    setResetting(true);
    try {
      const res = await fetch('/api/system/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Reset request failed');

      // Thoroughly clear all cached client-side pipeline results, assessment statuses, and session records
      if (typeof window !== 'undefined') {
        try {
          localStorage.clear();
          sessionStorage.clear();
          window.dispatchEvent(new CustomEvent('recruitcrm:data_updated', { detail: { action: 'reset' } }));
        } catch {}
      }

      setShowResetModal(false);
      toast.success('Database and application state have been completely reset to a clean baseline.', 'Data Reset');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset data', 'Reset Failed');
    } finally {
      setResetting(false);
    }
  }

  return (
    <>
      <header className="h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] sticky top-0 z-20 px-6 flex items-center justify-between ml-60 transition-colors">
        {/* Left: Org */}
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold tracking-tight text-[var(--text-primary)]">
            Acme Cloud Innovations
          </div>
        </div>

        {/* Right: LLM Indicator, Theme Switcher, Reset, and Action */}
        <div className="flex items-center gap-2.5">
          {/* Connected LLM Model Indicator */}
          <Link
            href="/settings"
            title="Configure Universal LLM endpoint & Base URL in Settings"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] font-mono text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-all"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-500" />
            <span>LLM: <strong className="text-[var(--text-primary)] font-semibold">{llmModel}</strong></span>
          </Link>

          {/* Clean White & Pure Black Theme Switcher */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Clean White' : 'Pure Black'} theme`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-all"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden md:inline font-medium">White Theme</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-700" />
                <span className="hidden md:inline font-medium">Pure Black</span>
              </>
            )}
          </button>

          {/* Reset Data Button */}
          <button
            onClick={() => setShowResetModal(true)}
            disabled={resetting}
            title="Reset database to clean slate"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--bg-subtle)] hover:bg-rose-500/10 text-[var(--text-secondary)] hover:text-rose-500 border border-[var(--border-subtle)] text-xs font-medium transition-all"
          >
            <RotateCcw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
            <span className="hidden lg:inline">Reset</span>
          </button>

          {/* Upload Action Button */}
          <Link
            href="/upload"
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-all shadow-sm"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload CVs</span>
          </Link>
        </div>
      </header>

      {/* Confirmation Modal for Reset */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="app-card max-w-sm w-full p-6 space-y-4 shadow-2xl border-neutral-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2 text-rose-500">
                <AlertTriangle className="w-4 h-4" />
                <span>Reset Database to Clean Slate</span>
              </h3>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              This action will permanently wipe all uploaded CV files, candidate records, screening evaluations, and assessments, returning the system to a clean baseline state.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                onClick={() => setShowResetModal(false)}
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                disabled={resetting}
                className="btn-primary bg-rose-600 hover:bg-rose-500 text-xs flex items-center gap-1.5"
              >
                <RotateCcw className={`w-3 h-3 ${resetting ? 'animate-spin' : ''}`} />
                <span>{resetting ? 'Resetting...' : 'Yes, Reset Database'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
