'use client';

import React from 'react';
import {
  X,
  Sparkles,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Briefcase,
  Code2,
  Cpu,
  Check,
  Brain,
  Layers,
  Target,
} from 'lucide-react';
import { ProcessedCandidate } from '../pipeline/PipelineProvider';

interface CandidateAnalysisModalProps {
  candidate: ProcessedCandidate | null;
  round1Threshold: number;
  onClose: () => void;
}

export function CandidateAnalysisModal({
  candidate,
  round1Threshold,
  onClose,
}: CandidateAnalysisModalProps) {
  if (!candidate) return null;

  const cat = candidate.aiEvaluation?.categoryScores;
  const total = candidate.matchScore;
  const skillsScore = cat?.skills !== undefined ? cat.skills : Math.round(total * 0.40);
  const expScore = cat?.experience !== undefined ? cat.experience : Math.round(total * 0.30);
  const eduScore = cat?.education !== undefined ? cat.education : Math.round(total * 0.15);
  const domainScore = cat?.domain !== undefined ? cat.domain : Math.round(total * 0.15);

  const cards = [
    {
      title: 'Technical Skills',
      score: skillsScore,
      max: 40,
      icon: Code2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      barColor: 'bg-blue-500',
      description: 'Languages, frameworks, and tools',
    },
    {
      title: 'Experience',
      score: expScore,
      max: 30,
      icon: Briefcase,
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10',
      barColor: 'bg-indigo-500',
      description: 'Role history, seniority, and scale',
    },
    {
      title: 'Education',
      score: eduScore,
      max: 15,
      icon: GraduationCap,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      barColor: 'bg-purple-500',
      description: 'Degree and technical credentials',
    },
    {
      title: 'Domain Fit',
      score: domainScore,
      max: 15,
      icon: Cpu,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      barColor: 'bg-amber-500',
      description: 'Architecture and system design',
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-base border border-blue-500/20">
              {candidate.candidateName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                  {candidate.candidateName}
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
                    candidate.isShortlisted
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  {candidate.isShortlisted ? 'Shortlisted' : 'Reviewed'}
                </span>
              </div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-2 mt-0.5">
                <span>{candidate.candidateEmail}</span>
                <span>•</span>
                <span className="font-mono text-[11px]">{candidate.fileName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {candidate.modelName && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                <Brain className="w-3 h-3 text-purple-500" />
                <span>{candidate.modelName}</span>
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-6 text-sm">
          {/* Overall Score Banner */}
          <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Candidate Evaluation
              </div>
              <div className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Recommendation:{' '}
                <span className="text-blue-600 dark:text-blue-400">
                  {candidate.recommendation?.replace(/_/g, ' ') || 'Evaluation Complete'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Screened against core competencies, years of experience, and role requirements.
              </p>
            </div>
            <div className="text-right flex items-center sm:flex-col sm:items-end gap-3 sm:gap-0 self-stretch sm:self-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-200 dark:border-neutral-800">
              <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">
                {candidate.matchScore}
                <span className="text-sm font-medium text-neutral-400">/100</span>
              </div>
              <span className="text-[11px] font-medium text-neutral-400">
                Passing Cutoff: {round1Threshold}%
              </span>
            </div>
          </div>

          {/* 4 Pillars */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-blue-500" />
              <span>Score Breakdown</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {cards.map((c, idx) => {
                const Icon = c.icon;
                const pct = Math.min(100, Math.round((c.score / c.max) * 100));
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`p-1.5 rounded-lg ${c.bgColor} ${c.color}`}>
                        <Icon className="w-4 h-4" />
                      </span>
                      <div className="font-bold text-sm">
                        <span className={c.color}>{c.score}</span>
                        <span className="text-neutral-400 text-xs">/{c.max}</span>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-neutral-800 dark:text-neutral-200">
                        {c.title}
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                        {c.description}
                      </p>
                    </div>
                    <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${c.barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-neutral-400 font-medium">
                      <span>Proficiency</span>
                      <span>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Executive Summary */}
          {candidate.aiEvaluation?.executiveSummary && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span>Executive Summary</span>
              </h4>
              <div className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/40 text-neutral-700 dark:text-neutral-300 text-xs leading-relaxed">
                {candidate.aiEvaluation.executiveSummary}
              </div>
            </div>
          )}

          {/* Skills Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Matched Core Skills */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Matching Skills ({candidate.aiEvaluation?.matchingSkills?.length ?? 0})</span>
              </h4>
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 min-h-[90px]">
                {candidate.aiEvaluation?.matchingSkills &&
                candidate.aiEvaluation.matchingSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.aiEvaluation.matchingSkills.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                      >
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 italic">No direct core skill matches recorded.</p>
                )}
              </div>
            </div>

            {/* Missing Requirements */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Unmet Criteria ({candidate.aiEvaluation?.missingRequirements?.length ?? 0})</span>
              </h4>
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 min-h-[90px]">
                {candidate.aiEvaluation?.missingRequirements &&
                candidate.aiEvaluation.missingRequirements.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.aiEvaluation.missingRequirements.map((gap, gIdx) => (
                      <span
                        key={gIdx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                      >
                        <X className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        {gap}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    All core requirements verified in candidate submission.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Transferable Skills (if any) */}
          {candidate.aiEvaluation?.transferableSkills &&
            candidate.aiEvaluation.transferableSkills.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-500" />
                  <span>Transferable Skills</span>
                </h4>
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500">
                      <tr>
                        <th className="p-2.5 font-medium">Candidate Skill</th>
                        <th className="p-2.5 font-medium">Target Requirement</th>
                        <th className="p-2.5 font-medium">Credit</th>
                        <th className="p-2.5 font-medium">Context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                      {candidate.aiEvaluation.transferableSkills.map((ts, idx) => (
                        <tr key={idx}>
                          <td className="p-2.5 font-semibold text-blue-600 dark:text-blue-400">
                            {ts.candidate_skill}
                          </td>
                          <td className="p-2.5 font-medium">{ts.target_skill}</td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 font-bold">
                              {ts.credit_percentage}%
                            </span>
                          </td>
                          <td className="p-2.5 text-neutral-500 dark:text-neutral-400">
                            {ts.explanation}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70 flex items-center justify-between">
          <span className="text-[11px] text-neutral-400">
            {candidate.isShortlisted ? 'Candidate approved for technical assessment' : 'Candidate below initial cutoff'}
          </span>
          <button onClick={onClose} className="btn-secondary text-xs px-4 py-1.5">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
