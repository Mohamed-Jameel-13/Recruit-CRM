'use client';

import { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Sparkles, 
  GitCompare, 
  Layers, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  BookOpen, 
  Sliders
} from 'lucide-react';

export default function JobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Job Form State
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Platform Engineering');
  const [location, setLocation] = useState('Remote');
  const [description, setDescription] = useState('');
  const [minExp, setMinExp] = useState('3');
  const [skillsRaw, setSkillsRaw] = useState('TypeScript, Node.js, PostgreSQL, React, Docker');
  const [preferredSkillsRaw, setPreferredSkillsRaw] = useState('Redis, AWS, GraphQL, CI/CD');
  const [passThreshold, setPassThreshold] = useState('65');

  // Semantic Equivalence Rule Inputs
  const [sourceSkill, setSourceSkill] = useState('');
  const [targetSkill, setTargetSkill] = useState('');
  const [equivWeight, setEquivWeight] = useState('0.95');
  const [equivExplanation, setEquivExplanation] = useState('');
  const [customRules, setCustomRules] = useState<any[]>([]);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleAddEquivalenceRule() {
    if (!sourceSkill.trim() || !targetSkill.trim()) return;
    setCustomRules([
      ...customRules,
      {
        source: sourceSkill.trim(),
        target: targetSkill.trim(),
        weight: parseFloat(equivWeight) || 0.9,
        relationship: 'custom_transferable_skill',
        explanation: equivExplanation.trim() || `Equivalence rule between ${sourceSkill} and ${targetSkill}`
      }
    ]);
    setSourceSkill('');
    setTargetSkill('');
    setEquivExplanation('');
  }

  async function handleCreateJobSubmit() {
    if (!title.trim() || !description.trim()) {
      alert('Please fill in job title and description.');
      return;
    }

    const required_skills = skillsRaw.split(',').map(s => s.trim()).filter(Boolean);
    const preferred_skills = preferredSkillsRaw.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          department,
          location,
          description,
          min_years_experience: parseInt(minExp, 10),
          required_skills,
          preferred_skills,
          pass_threshold_score: parseInt(passThreshold, 10),
          semantic_equivalence_rules: customRules
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create job');

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setCustomRules([]);
      await fetchJobs();
    } catch (err: unknown) {
      alert(`Job creation error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Job Requisitions & Screening Criteria</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
              Configurable Rubrics
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Define target competencies, minimum experience, and intelligent semantic equivalence rules.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Requisition</span>
        </button>
      </div>

      {/* Jobs Listing */}
      <div className="grid grid-cols-1 gap-6">
        {jobs.map((job) => (
          <div key={job.id} className="glass-card rounded-2xl border border-slate-800/90 p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{job.title}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase font-semibold">
                    {job.status}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">v{job.version}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                  <span>{job.department}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    {job.location}
                  </span>
                  <span>•</span>
                  <span>{job.employment_type}</span>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="text-slate-400">Passing Score Threshold: </span>
                <span className="font-bold text-emerald-400">{job.criteria?.pass_threshold_score || 65}%</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {job.description}
            </p>

            {/* Criteria & Skills */}
            {job.criteria && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>Required Competencies ({job.criteria.required_skills?.length || 0})</span>
                    <span className="text-[11px] text-slate-400">Min {job.criteria.min_years_experience} yrs exp</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {job.criteria.required_skills?.map((s: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[11px] font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-300">
                    Active Semantic Equivalence Rules ({job.criteria.semantic_equivalence_rules?.length || 0})
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {job.criteria.semantic_equivalence_rules?.map((rule: any, i: number) => (
                      <div key={i} className="text-[11px] p-1.5 rounded bg-slate-900 border border-slate-800 flex items-center justify-between font-mono">
                        <span className="text-cyan-300">{rule.source} ⇄ {rule.target}</span>
                        <span className="text-emerald-400 font-bold">{Math.round((rule.weight || 0.9) * 100)}% credit</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create Job Requisition Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card max-w-2xl w-full p-6 rounded-2xl border border-slate-700 bg-slate-900 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>Create Job Requisition & Screening Rubric</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Backend Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-700 text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-700 text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[11px] font-medium text-slate-400">Job Description & Responsibilities</label>
              <textarea
                rows={3}
                placeholder="Describe role objectives and team focus..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-700 text-slate-200"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Min Experience (Yrs)</label>
                <input
                  type="number"
                  value={minExp}
                  onChange={(e) => setMinExp(e.target.value)}
                  className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-700 text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Pass Threshold %</label>
                <input
                  type="number"
                  value={passThreshold}
                  onChange={(e) => setPassThreshold(e.target.value)}
                  className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-700 text-slate-200"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-400">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-700 text-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="text-[11px] font-medium text-slate-400">Required Skills (Comma separated)</label>
              <input
                type="text"
                value={skillsRaw}
                onChange={(e) => setSkillsRaw(e.target.value)}
                className="w-full rounded glass-input p-2 bg-slate-950 border border-slate-700 text-slate-200"
              />
            </div>

            {/* Semantic Equivalence Rules Builder */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                <GitCompare className="w-3.5 h-3.5" />
                <span>Configure Semantic Equivalence Rules</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Grant automatic transferable credit if a candidate has an equivalent technology (e.g. MySQL for PostgreSQL).
              </p>

              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Candidate Skill (e.g. MySQL)"
                  value={sourceSkill}
                  onChange={(e) => setSourceSkill(e.target.value)}
                  className="rounded glass-input p-1.5 bg-slate-900 border border-slate-700 text-slate-200 text-[11px]"
                />
                <input
                  type="text"
                  placeholder="Target Skill (e.g. PostgreSQL)"
                  value={targetSkill}
                  onChange={(e) => setTargetSkill(e.target.value)}
                  className="rounded glass-input p-1.5 bg-slate-900 border border-slate-700 text-slate-200 text-[11px]"
                />
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    step="0.05"
                    placeholder="Weight (0.95)"
                    value={equivWeight}
                    onChange={(e) => setEquivWeight(e.target.value)}
                    className="w-20 rounded glass-input p-1.5 bg-slate-900 border border-slate-700 text-slate-200 text-[11px]"
                  />
                  <button
                    onClick={handleAddEquivalenceRule}
                    type="button"
                    className="flex-1 px-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold"
                  >
                    Add Rule
                  </button>
                </div>
              </div>

              {customRules.length > 0 && (
                <div className="space-y-1 pt-1">
                  {customRules.map((r, i) => (
                    <div key={i} className="p-1 rounded bg-slate-900 border border-slate-800 text-[11px] flex justify-between font-mono">
                      <span className="text-cyan-300">{r.source} ➔ {r.target}</span>
                      <span className="text-emerald-400 font-bold">{Math.round(r.weight * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateJobSubmit}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30"
              >
                Publish Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
