'use client';

import { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Clock, 
  Target, 
  Plus, 
  Loader2,
  Cpu,
  Cloud
} from 'lucide-react';

interface NewAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    role: string;
    title: string;
    duration_minutes: number;
    pass_threshold_percentage: number;
    template: 'scratch' | 'fullstack' | 'backend' | 'devops' | 'ai_generate';
  }) => Promise<void>;
}

export function NewAssessmentModal({ isOpen, onClose, onCreate }: NewAssessmentModalProps) {
  const [role, setRole] = useState('');
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(45);
  const [threshold, setThreshold] = useState(70);
  const [template, setTemplate] = useState<'scratch' | 'fullstack' | 'backend' | 'devops' | 'ai_generate'>('ai_generate');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role.trim()) return;

    setLoading(true);
    try {
      await onCreate({
        role: role.trim(),
        title: title.trim() || `${role.trim()} Competency Assessment Challenge`,
        duration_minutes: duration,
        pass_threshold_percentage: threshold,
        template
      });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="app-card max-w-lg w-full p-6 space-y-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <Plus className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Create New Role Assessment Challenge
              </h3>
              <p className="text-[11px] text-neutral-500">
                Configure role title, parameters, and question blueprint.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
              Target Role Name *
            </label>
            <input
              type="text"
              required
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (!title || title.includes('Competency Assessment Challenge')) {
                  setTitle(`${e.target.value} Competency Assessment Challenge`);
                }
              }}
              placeholder="e.g. Senior Security Engineer, Staff Data Architect"
              className="w-full text-xs app-input p-3 font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
              Assessment Challenge Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Security Engineer Cloud Competency Challenge"
              className="w-full text-xs app-input p-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>Duration (Minutes)</span>
              </label>
              <input
                type="number"
                min={15}
                max={180}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value, 10) || 45)}
                className="w-full text-xs app-input p-2.5 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-500" />
                <span>Pass Cutoff (%)</span>
              </label>
              <input
                type="number"
                min={40}
                max={95}
                value={threshold}
                onChange={(e) => setThreshold(parseInt(e.target.value, 10) || 70)}
                className="w-full text-xs app-input p-2.5 font-mono"
              />
            </div>
          </div>

          {/* Starter Blueprint Selection */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
              Starter Questions Blueprint
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                onClick={() => setTemplate('ai_generate')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  template === 'ai_generate'
                    ? 'border-purple-600 bg-purple-500/10 text-purple-900 dark:text-purple-200'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <input
                  type="radio"
                  name="starterTemplate"
                  checked={template === 'ai_generate'}
                  onChange={() => setTemplate('ai_generate')}
                  className="mt-0.5 text-purple-600 focus:ring-purple-500"
                />
                <div>
                  <span className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                    <span>AI Full Suite</span>
                  </span>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Generate MCQs, Coding &amp; Arch questions tailored to this role
                  </p>
                </div>
              </label>

              <label
                onClick={() => setTemplate('fullstack')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  template === 'fullstack'
                    ? 'border-blue-600 bg-blue-500/10 text-blue-900 dark:text-blue-200'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <input
                  type="radio"
                  name="starterTemplate"
                  checked={template === 'fullstack'}
                  onChange={() => setTemplate('fullstack')}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="font-bold flex items-center gap-1">
                    <Cloud className="w-3.5 h-3.5 text-blue-600" />
                    <span>Full-Stack Preset</span>
                  </span>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Microservices, PostgreSQL locking, and Kubernetes
                  </p>
                </div>
              </label>

              <label
                onClick={() => setTemplate('backend')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  template === 'backend'
                    ? 'border-indigo-600 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <input
                  type="radio"
                  name="starterTemplate"
                  checked={template === 'backend'}
                  onChange={() => setTemplate('backend')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-bold flex items-center gap-1">
                    <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Backend Preset</span>
                  </span>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Kafka, Sharding, and Rate Limiting Code Challenge
                  </p>
                </div>
              </label>

              <label
                onClick={() => setTemplate('scratch')}
                className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  template === 'scratch'
                    ? 'border-neutral-600 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <input
                  type="radio"
                  name="starterTemplate"
                  checked={template === 'scratch'}
                  onChange={() => setTemplate('scratch')}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-bold">Blank Slate</span>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    Start empty and build custom questions manually
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !role.trim()}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Challenge...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Assessment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
