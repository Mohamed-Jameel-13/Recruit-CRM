'use client';

import { useState } from 'react';
import { 
  Sparkles, 
  Play, 
  CheckCircle2, 
  Loader2, 
  Calendar, 
  Video, 
  Award, 
  ArrowRight, 
  RotateCcw, 
  X, 
  Zap, 
  ShieldCheck, 
  FileText, 
  Layers, 
  TrendingUp,
  Brain,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface ClientDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function ClientDemoModal({ isOpen, onClose, onComplete }: ClientDemoModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [demoResult, setDemoResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    {
      title: 'Target Role & Competency Matrix',
      desc: 'Loading "Senior Full-Stack Cloud Engineer" with Semantic Equivalence rules (PostgreSQL ⇄ MySQL, Vue ⇄ React, AWS ⇄ GCP).'
    },
    {
      title: 'Resumes Ingestion & Extraction',
      desc: 'Ingesting 10 real-world resumes (PDF/Text) & validating corrupted file handling.'
    },
    {
      title: 'AI Semantic Competency Screening',
      desc: 'LLM analyzes depth, relevance, and transferable tech stacks. Eliminates non-matches.'
    },
    {
      title: 'Shortlisting & Assessment Form Email',
      desc: 'Top 3 candidates shortlisted and dispatched interactive technical assessment form via email.'
    },
    {
      title: 'Candidate Test Submission & Evaluation',
      desc: 'Candidate submits technical challenge. Autonomously graded against criteria (Elena: 95% vs >= 70% pass threshold).'
    },
    {
      title: 'Round 2 Shortlisting & Google Meet Link Emailed',
      desc: 'Champion candidate automatically promoted to Round 2 with Sarah Connor and confirmation email with Google Meet link sent.'
    }
  ];

  async function runDemo() {
    setIsRunning(true);
    setCurrentStep(1);
    setDemoResult(null);
    setError(null);

    // Simulate real-time stepping for visual impact during screen share
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => (prev < 5 ? prev + 1 : prev));
    }, 900);

    try {
      const res = await fetch('/api/demo/run-e2e', { method: 'POST' });
      const data = await res.json();

      clearInterval(stepInterval);

      if (!res.ok) {
        throw new Error(data.error || 'Demo execution failed');
      }

      setCurrentStep(6);
      setDemoResult(data);
      if (onComplete) onComplete();
    } catch (err: unknown) {
      clearInterval(stepInterval);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <Sparkles className="w-3 h-3" />
                Live Client Demonstration
              </span>
              <span className="text-xs text-neutral-400">Autonomous Hiring Journey</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              End-to-End Autonomous Recruitment Flow
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Watch real-world resumes get screened with AI, short-listed, scored, and the best candidate booked for a Round 2 Technical Interview.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
              <strong>Execution Error:</strong> {error}
            </div>
          )}

          {/* Stepper Progress */}
          <div className="space-y-3">
            {steps.map((step, idx) => {
              const stepNumber = idx + 1;
              const isPassed = currentStep > stepNumber || (currentStep === 6 && demoResult);
              const isCurrent = currentStep === stepNumber && isRunning;

              return (
                <div 
                  key={idx}
                  className={`flex items-start gap-3.5 p-3 rounded-xl border transition-all duration-300 ${
                    isCurrent 
                      ? 'bg-blue-500/5 border-blue-500/30 scale-[1.01]' 
                      : isPassed
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-neutral-50/50 dark:bg-neutral-900/50 border-neutral-200/60 dark:border-neutral-800/60 opacity-60'
                  }`}
                >
                  <div className="mt-0.5">
                    {isPassed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 animate-in zoom-in" />
                    ) : isCurrent ? (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-400">
                        {stepNumber}
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${isCurrent ? 'text-blue-600 dark:text-blue-400' : isPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-neutral-700 dark:text-neutral-300'}`}>
                        {step.title}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                          Processing
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Champion Victory Card */}
          {demoResult && demoResult.champion && (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-blue-500/5 to-transparent border border-emerald-500/30 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                    🏆
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Champion Candidate Advanced to Round 2!
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Automated assessment top scorer scheduled for technical interview
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Round 2 Confirmed
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Candidate</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white truncate block">
                    {demoResult.champion.name}
                  </span>
                  <span className="text-[10px] text-neutral-400 truncate block">
                    {demoResult.champion.email}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">AI Screening</span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    {demoResult.champion.aiScreeningScore} / 100
                  </span>
                  <span className="text-[10px] text-neutral-400 block">Semantic Equivalence</span>
                </div>

                <div className="p-3 rounded-xl bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">CodeSignal Score</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {demoResult.champion.assessmentScore}%
                  </span>
                  <span className="text-[10px] text-neutral-400 block">Verified Pass</span>
                </div>

                <div className="p-3 rounded-xl bg-white/70 dark:bg-neutral-800/70 border border-neutral-200/60 dark:border-neutral-700/60">
                  <span className="text-[10px] uppercase font-bold text-neutral-400 block">Interviewer</span>
                  <span className="text-xs font-bold text-neutral-900 dark:text-white truncate block">
                    {demoResult.champion.interviewer}
                  </span>
                  <span className="text-[10px] text-neutral-400 block">Lead Architect</span>
                </div>
              </div>

              {/* Schedule and Meeting link */}
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-neutral-800/90 border border-neutral-200 dark:border-neutral-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white">
                      {demoResult.champion.interviewScheduledFor} (45 mins)
                    </div>
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      Round 2: Architecture & Deep-Dive Technical Interview &bull; Email Sent to {demoResult.champion.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  {demoResult.champion.testFormUrl && (
                    <a
                      href={demoResult.champion.testFormUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold btn-secondary text-blue-600 dark:text-blue-400"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Open Candidate Test Form</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  )}
                  <a 
                    href={demoResult.champion.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join Google Meet</span>
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-50/50 dark:bg-neutral-900/50">
          <div className="text-xs text-neutral-400">
            {demoResult ? 'Demo completed. All data persisted live in database.' : 'Ready to start live demonstration.'}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {demoResult ? (
              <>
                <Link
                  href="/interviews"
                  onClick={onClose}
                  className="btn-primary text-xs w-full sm:w-auto flex items-center justify-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>View in Interviews</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={runDemo}
                  disabled={isRunning}
                  className="btn-secondary text-xs flex items-center gap-1.5"
                  title="Re-run Demo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-Run</span>
                </button>
              </>
            ) : (
              <button
                onClick={runDemo}
                disabled={isRunning}
                className="btn-primary text-xs w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 shadow-lg shadow-blue-500/20"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start Autonomous Demo</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
