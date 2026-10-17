'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  CheckCircle2, 
  Clock, 
  Send, 
  ShieldCheck, 
  MailCheck, 
  Loader2, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  FileText, 
  Lock,
  Code2,
  RotateCcw
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { AssessmentQuestion } from '@/types/database';

interface AssessmentClientProps {
  assignmentId: string;
  initialData: {
    assessment: {
      id: string;
      isSubmitted?: boolean;
      submittedAt?: string | null;
    };
    candidate: {
      first_name?: string;
      last_name?: string;
      email?: string;
    } | null;
    job: {
      title?: string;
      department?: string;
    } | null;
    config: {
      duration_minutes?: number;
      questions?: AssessmentQuestion[];
    };
  };
}

type AssessmentStage = 'INSTRUCTIONS' | 'TESTING' | 'SUBMITTING' | 'COMPLETED';

export function AssessmentClient({ assignmentId, initialData }: AssessmentClientProps) {
  const { toast } = useToast();

  const [assessmentData] = useState(initialData);
  const questions: AssessmentQuestion[] = assessmentData?.config?.questions || [];
  const candidate = assessmentData?.candidate;
  const job = assessmentData?.job;
  const config = assessmentData?.config;
  const durationMinutes = config?.duration_minutes || 45;

  // Determine initial stage: if already submitted, go directly to COMPLETED
  const initialCompleted = Boolean(initialData.assessment?.isSubmitted);

  const [stage, setStage] = useState<AssessmentStage>(initialCompleted ? 'COMPLETED' : 'INSTRUCTIONS');

  // Answer state keyed by question ID
  const [answers, setAnswers] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    questions.forEach((q) => {
      initial[q.id] = q.type === 'mcq' ? -1 : '';
    });
    return initial;
  });

  // Active question navigation index
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Timer state
  const [timeLeft, setTimeLeft] = useState<number>(durationMinutes * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [showConfirmSubmitModal, setShowConfirmSubmitModal] = useState(false);

  // Ref to guard against multiple auto-submissions
  const hasAutoSubmittedRef = useRef(false);

  // Countdown timer: only ticks when in 'TESTING' stage and timerRunning is true
  useEffect(() => {
    if (stage !== 'TESTING' || !timerRunning || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setTimerRunning(false);
          handleAutoSubmitOnTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [stage, timerRunning, timeLeft]);

  function formatTime(seconds: number) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  function handleStartAssessment() {
    setStage('TESTING');
    setTimerRunning(true);
    toast.info(`Assessment started! You have ${durationMinutes} minutes. Good luck!`, 'Timer Started');
  }

  async function handleAutoSubmitOnTimeout() {
    if (hasAutoSubmittedRef.current) return;
    hasAutoSubmittedRef.current = true;
    setAutoSubmitting(true);
    toast.warning('Time has expired! Automatically submitting your answers...', 'Time Expired');
    await executeSubmission(true);
  }

  async function handleManualSubmit() {
    setShowConfirmSubmitModal(false);
    await executeSubmission(false);
  }

  async function executeSubmission(isAuto: boolean) {
    setStage('SUBMITTING');
    try {
      const candidateEmail = candidate?.email;
      const res = await fetch('/api/assessments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          answers,
          candidateEmail,
          autoSubmitted: isAuto
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setStage('COMPLETED');
      setTimerRunning(false);

      toast.success(
        'Thank you! Your assessment has been submitted successfully.',
        'Assessment Submitted'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Submission Error');
      setStage('TESTING');
    } finally {
      setAutoSubmitting(false);
    }
  }

  // Answered counter
  const answeredCount = questions.filter(q => {
    const ans = answers[q.id];
    if (q.type === 'mcq') return ans !== undefined && ans !== -1;
    return typeof ans === 'string' && ans.trim().length > 0;
  }).length;

  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;
  const currentQ = questions[currentQuestionIdx];
  const refId = 'REF-' + (assignmentId.replace(/[^0-9a-zA-Z]/g, '').slice(-8).toUpperCase() || '2026');

  // ==============================================================
  // STAGE 1: INSTRUCTIONS & CANDIDATE BRIEFING (CLEAN WHITE THEME)
  // No AI models, scoring rubrics, or internal keys are exposed.
  // ==============================================================
  if (stage === 'INSTRUCTIONS') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900">
        {/* Top Header */}
        <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20">
                A
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-slate-900 block">
                  Acme Cloud Innovations
                </span>
                <span className="text-xs text-slate-500">
                  Candidate Assessment Portal
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-900 block">
                {candidate?.first_name} {candidate?.last_name}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {candidate?.email}
              </span>
            </div>
          </div>
        </header>

        {/* Main Instruction Card */}
        <main className="max-w-3xl mx-auto py-10 px-4 sm:px-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header Banner */}
            <div className="p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 via-slate-50 to-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/80 text-blue-700 text-xs font-semibold mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Technical Evaluation Challenge</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                  {job?.title || 'Senior Software Engineer'}
                </h1>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Welcome, <strong>{candidate?.first_name}</strong>. Please review the instructions below and begin when you are ready.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartAssessment}
                className="shrink-0 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <span>Start Challenge</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Assessment Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 border-b border-slate-100 bg-slate-50/50 text-center">
              <div className="p-4">
                <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">Format</span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">{questions.length} Questions</span>
                <span className="text-[11px] text-slate-500">MCQs &amp; Architecture</span>
              </div>
              <div className="p-4">
                <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">Time Limit</span>
                <span className="text-sm font-bold text-blue-600 mt-0.5 block font-mono">{durationMinutes} Minutes</span>
                <span className="text-[11px] text-slate-500">Continuous session</span>
              </div>
              <div className="p-4">
                <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">Session</span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">Online Proctored</span>
                <span className="text-[11px] text-slate-500">Single attempt</span>
              </div>
              <div className="p-4">
                <span className="text-[11px] uppercase font-bold text-slate-400 block tracking-wider">Next Step</span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block">Hiring Review</span>
                <span className="text-[11px] text-slate-500">Email notification</span>
              </div>
            </div>

            {/* Rules & Guidelines */}
            <div className="p-6 sm:p-8 space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Assessment Instructions &amp; Rules</span>
              </h2>

              <ul className="space-y-4 text-sm text-slate-600">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <strong className="text-slate-900 block">Timed Continuous Session:</strong>
                    The timer begins immediately once you click <strong>&quot;Start Assessment Challenge&quot;</strong>. The timer runs continuously and cannot be paused.
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <strong className="text-slate-900 block">Automatic Submission on Time Expiration:</strong>
                    If the countdown timer reaches 00:00, your test will be automatically submitted with all answers recorded up to that moment.
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <strong className="text-slate-900 block">Flexible Navigation &amp; Review:</strong>
                    You can freely jump between questions, edit answers, and review your progress at any time before final submission.
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <div>
                    <strong className="text-slate-900 block">Hiring Team Evaluation &amp; Follow-up:</strong>
                    Upon submission, your responses will be reviewed by our engineering recruitment team. We will reach out to you directly via email regarding the outcome and next steps.
                  </div>
                </li>
              </ul>

              {/* Agreement Notice */}
              <div className="pt-2 border-t border-slate-100">
                <div className="p-4 rounded-xl border border-blue-200/80 bg-blue-50/60 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-700 leading-relaxed">
                    By clicking <strong>&quot;Start Assessment Challenge&quot;</strong>, you confirm that you are <strong>{candidate?.first_name} {candidate?.last_name}</strong> and you agree to complete this assessment independently. Your <strong>{durationMinutes}-minute</strong> countdown timer will start immediately.
                  </p>
                </div>
              </div>

              {/* Start Button & Security Notice */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-slate-600">Secure testing environment ready</span>
                </div>

                <button
                  type="button"
                  id="start-assessment-btn"
                  onClick={handleStartAssessment}
                  className="w-full sm:w-auto px-9 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/45 transition-all cursor-pointer"
                >
                  <span>Start Assessment Challenge</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ==============================================================
  // STAGE SUBMITTING: DEDICATED CLEAN TRANSMISSION SCREEN
  // ==============================================================
  if (stage === 'SUBMITTING') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900 antialiased">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 sm:p-10 max-w-md w-full text-center space-y-6 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100 shadow-inner">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Submitting Your Assessment...
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Securely encrypting and transmitting your responses to the Acme Cloud Innovations recruitment portal. Please do not close or refresh this page.
            </p>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-blue-600 h-full w-2/3 animate-pulse rounded-full" />
          </div>

          <div className="text-[11px] text-slate-400 font-mono">
            Candidate: {candidate?.email}
          </div>
        </div>
      </div>
    );
  }

  // ==============================================================
  // STAGE 2: ACTIVE ASSESSMENT SESSION (CLEAN WHITE CORPORATE THEME)
  // No AI models, scoring rubrics, or recruiter shortcuts are shown.
  // ==============================================================
  if (stage === 'TESTING') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        {/* Sticky Corporate Navigation Header */}
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3 shadow-sm transition-colors">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm">
                A
              </div>
              <div>
                <span className="font-bold text-xs tracking-tight text-slate-900 block">
                  Acme Cloud Innovations
                </span>
                <p className="text-[11px] text-slate-500">
                  {candidate?.first_name} {candidate?.last_name} &bull; <span className="font-mono">{candidate?.email}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Live Countdown Timer */}
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg border font-mono text-xs font-bold tracking-wider transition-all shadow-sm ${
                  timeLeft <= 300
                    ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                    : timeLeft <= 600
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-slate-100 border-slate-200 text-slate-800'
                }`}
                title="Time remaining before auto-submission"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{formatTime(timeLeft)}</span>
              </div>

              {/* Answered Counter Pill */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                <span className="font-bold">{answeredCount}</span>
                <span className="text-blue-400">/</span>
                <span>{questions.length} Answered</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-100 h-1 absolute left-0 bottom-0 overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </header>

        {/* Main Testing View */}
        <main className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6">
          {/* Question Stepper Buttons */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-2">
              {questions.map((q, idx) => {
                const isAnswered = q.type === 'mcq'
                  ? answers[q.id] !== undefined && answers[q.id] !== -1
                  : typeof answers[q.id] === 'string' && answers[q.id].trim().length > 0;
                const isCurrent = currentQuestionIdx === idx;

                return (
                  <button
                    key={q.id || idx}
                    type="button"
                    onClick={() => setCurrentQuestionIdx(idx)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                      isCurrent
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : isAnswered
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>Q{idx + 1}</span>
                    <span className="text-[10px] font-normal uppercase opacity-80">
                      {q.type === 'mcq' ? 'MCQ' : 'ARCH'}
                    </span>
                    {isAnswered && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-slate-500 font-medium shrink-0 hidden sm:block">
              {answeredCount} of {questions.length} completed
            </div>
          </div>

          {/* Active Question Card */}
          {currentQ && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              {/* Question Meta Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 gap-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md bg-blue-100 text-blue-700 font-black text-xs">
                    Question {currentQuestionIdx + 1} of {questions.length}
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                    {currentQ.category}
                  </span>
                </div>

                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {currentQ.points || 25} Points
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  {currentQ.title}
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {currentQ.description}
                </p>
              </div>

              {/* Question Input: MCQ or Subjective */}
              {currentQ.type === 'mcq' && currentQ.options && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block">
                    Select the single most optimal answer:
                  </span>
                  <div className="space-y-2.5">
                    {currentQ.options.map((opt, optIdx) => {
                      const isSelected = answers[currentQ.id] === optIdx;
                      const letter = String.fromCharCode(65 + optIdx);

                      return (
                        <label
                          key={optIdx}
                          onClick={() => setAnswers({ ...answers, [currentQ.id]: optIdx })}
                          className={`flex items-start gap-3.5 p-4 rounded-xl border text-sm cursor-pointer transition-all ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/70 text-slate-900 shadow-sm ring-1 ring-blue-500/30'
                              : 'border-slate-200 bg-white hover:bg-slate-50/80 text-slate-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${currentQ.id}`}
                            checked={isSelected}
                            onChange={() => setAnswers({ ...answers, [currentQ.id]: optIdx })}
                            className="mt-1 text-blue-600 focus:ring-blue-500 shrink-0"
                          />
                          <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {letter}
                          </span>
                          <span className="leading-relaxed flex-1 font-normal">
                            {opt.replace(/^[A-D]\)\s*/, '')}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* IF CODING: Code editor with starter code & test cases */}
              {currentQ.type === 'coding' && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 font-mono text-xs font-bold uppercase flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5" />
                        <span>{currentQ.language || 'TypeScript'}</span>
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Production Implementation Canvas
                      </span>
                    </div>

                    {currentQ.starter_code && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Reset your code back to the starter skeleton?')) {
                            setAnswers({ ...answers, [currentQ.id]: currentQ.starter_code });
                          }
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-medium transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset Starter Code</span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Your Code Solution:
                    </label>
                    <textarea
                      rows={10}
                      value={answers[currentQ.id] !== undefined ? answers[currentQ.id] : (currentQ.starter_code || '')}
                      onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                      placeholder={currentQ.placeholder || '// Write your clean code implementation here...'}
                      className="w-full text-xs font-mono p-4 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-inner"
                      spellCheck={false}
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                      <span>Monospaced Code Canvas &bull; {currentQ.language || 'typescript'}</span>
                      <span>{(answers[currentQ.id] !== undefined ? answers[currentQ.id] : (currentQ.starter_code || '')).length} characters</span>
                    </div>
                  </div>

                  {/* Test Cases Preview */}
                  {currentQ.test_cases && currentQ.test_cases.length > 0 && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                        Sample Verification Test Cases:
                      </span>
                      <div className="space-y-2">
                        {currentQ.test_cases.map((tc, tcIdx) => (
                          <div key={tcIdx} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-mono space-y-1">
                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                              <span className="font-semibold text-slate-700">{tc.description || `Test ${tcIdx + 1}`}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-slate-400">Input: </span>
                                <span className="text-slate-800 font-semibold">{tc.input}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">Expected: </span>
                                <span className="text-emerald-700 font-semibold">{tc.expected_output}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Subjective / Architecture Area */}
              {currentQ.type === 'subjective' && (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Your Technical Architecture &amp; Solution:
                    </label>
                    <textarea
                      rows={8}
                      value={answers[currentQ.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [currentQ.id]: e.target.value })}
                      placeholder={currentQ.placeholder || 'Detail your technical design, caching strategies, and resiliency mechanics...'}
                      className="w-full text-xs font-mono p-4 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
                    />
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                      <span>Monospaced architectural canvas</span>
                      <span>{(answers[currentQ.id] || '').length} characters typed</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Stepper Navigation Buttons */}
              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <button
                  type="button"
                  disabled={currentQuestionIdx === 0}
                  onClick={() => setCurrentQuestionIdx(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-3">
                  {currentQuestionIdx < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIdx(prev => Math.min(questions.length - 1, prev + 1))}
                      className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <span>Next Question</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmSubmitModal(true)}
                      className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Review &amp; Submit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Sticky Submit Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">{answeredCount} of {questions.length} questions completed.</span> All progress is saved automatically.
            </div>

            <button
              type="button"
              disabled={autoSubmitting}
              onClick={() => setShowConfirmSubmitModal(true)}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Assessment Challenge</span>
            </button>
          </div>
        </main>

        {/* Confirmation Modal */}
        {showConfirmSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Submit Technical Assessment?
                  </h3>
                  <p className="text-xs text-slate-500">
                    You have answered <strong>{answeredCount}</strong> of <strong>{questions.length}</strong> questions.
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Once submitted, your responses will be finalized and transmitted to our engineering hiring team for review. You will not be able to modify your answers after submission.
              </p>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmitModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Continue Editing
                </button>
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Yes, Submit Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==============================================================
  // STAGE 3: POST-SUBMISSION CANDIDATE COMPLETION SCREEN (WHITE THEME)
  // Candidate sees professional "Thank you, we will contact you"
  // No AI models, scoring keys, or internal rubrics are exposed.
  // ==============================================================
  const submissionDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm">
              A
            </div>
            <div>
              <span className="font-bold text-xs tracking-tight text-slate-900 block">
                Acme Cloud Innovations
              </span>
              <span className="text-[11px] text-slate-500">
                Candidate Assessment Portal
              </span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Submitted</span>
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-10 space-y-8 text-center sm:text-left">
          {/* Success Hero */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
              <Check className="w-9 h-9 stroke-[3]" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Thank You, {candidate?.first_name || 'Candidate'}!
              </h1>
              <p className="text-base text-slate-600 font-medium">
                Your technical assessment has been successfully submitted.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed pt-1">
                We have received your responses for the <strong>{job?.title || 'Engineering'}</strong> position. Our engineering recruitment team will review your submission and contact you regarding the next steps.
              </p>
            </div>
          </div>

          {/* Submission Details Card */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-3 text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
              Submission Confirmation Details
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[11px]">Candidate Name</span>
                <span className="font-semibold text-slate-800">{candidate?.first_name} {candidate?.last_name}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[11px]">Registered Email</span>
                <span className="font-semibold text-slate-800 font-mono">{candidate?.email}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[11px]">Target Role</span>
                <span className="font-semibold text-slate-800">{job?.title || 'Senior Software Engineer'}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[11px]">Submission Reference ID</span>
                <span className="font-semibold text-blue-600 font-mono">{refId}</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[11px]">Submission Status</span>
                <span className="font-semibold text-emerald-700">Received &amp; Under Review</span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 block text-[11px]">Submitted On</span>
                <span className="font-semibold text-slate-800">{submissionDate}</span>
              </div>
            </div>
          </div>

          {/* Next Steps Information */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <MailCheck className="w-4 h-4 text-blue-600" />
              <span>What Happens Next?</span>
            </h3>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                  1
                </span>
                <div>
                  <strong className="text-slate-800">Engineering Review:</strong> Our technical team will review your architectural designs, engineering tradeoffs, and problem-solving solutions.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                  2
                </span>
                <div>
                  <strong className="text-slate-800">Email Notification:</strong> You will receive an update at <strong className="text-slate-800">{candidate?.email}</strong> regarding the status of your application within 2–3 business days.
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                  3
                </span>
                <div>
                  <strong className="text-slate-800">Next Round:</strong> Candidates progressing to the next stage will receive an invitation to meet directly with our hiring managers.
                </div>
              </div>
            </div>
          </div>

          {/* Footer Safe Exit Notice */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>All responses saved securely. You may now close this window.</span>
            </div>

            <Link
              href="/"
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              Return to Platform
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
