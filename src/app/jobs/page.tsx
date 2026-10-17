'use client';

import { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Plus, 
  Sparkles, 
  MapPin, 
  RefreshCw,
  GitCompare,
  Pencil,
  Trash2,
  CalendarCheck,
  X,
  Check
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

export default function JobsPage() {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Job Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [calendlyLink, setCalendlyLink] = useState('');

  // Edit Job Modal State
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editEmploymentType, setEditEmploymentType] = useState('Full-Time');
  const [editStatus, setEditStatus] = useState('active');
  const [editCalendlyLink, setEditCalendlyLink] = useState('');
  const [editPassThreshold, setEditPassThreshold] = useState(65);
  const [editMinYears, setEditMinYears] = useState(3);
  const [editRequiredSkills, setEditRequiredSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [reSynthesizeWithAI, setReSynthesizeWithAI] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  function handleOpenEditModal(job: any) {
    setEditingJob(job);
    setEditTitle(job.title || '');
    setEditDescription(job.description || '');
    setEditDepartment(job.department || 'Platform Engineering');
    setEditLocation(job.location || 'Remote (Global)');
    setEditEmploymentType(job.employment_type || 'Full-Time');
    setEditStatus(job.status || 'active');
    setEditCalendlyLink(job.calendly_link || '');
    setEditPassThreshold(job.criteria?.pass_threshold_score ?? 65);
    setEditMinYears(job.criteria?.min_years_experience ?? 3);
    setEditRequiredSkills(job.criteria?.required_skills ? [...job.criteria.required_skills] : []);
    setNewSkillInput('');
    setReSynthesizeWithAI(false);
  }

  function handleAddSkill() {
    const trimmed = newSkillInput.trim();
    if (trimmed && !editRequiredSkills.includes(trimmed)) {
      setEditRequiredSkills([...editRequiredSkills, trimmed]);
      setNewSkillInput('');
    }
  }

  function handleRemoveSkill(skillToRemove: string) {
    setEditRequiredSkills(editRequiredSkills.filter(s => s !== skillToRemove));
  }

  async function handleCreateJobSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.warning('Please provide both the Job Title and Job Description.', 'Missing Details');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          calendly_link: calendlyLink.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create job');

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setCalendlyLink('');
      toast.success(`Role "${data.job?.title || title}" created successfully!`, 'Job Created');
      await fetchJobs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Job Creation Error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditJobSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingJob) return;

    if (!editTitle.trim() || !editDescription.trim()) {
      toast.warning('Job title and description are required.', 'Missing Fields');
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/jobs/${editingJob.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          department: editDepartment.trim(),
          location: editLocation.trim(),
          employment_type: editEmploymentType.trim(),
          status: editStatus,
          calendly_link: editCalendlyLink.trim(),
          pass_threshold_score: editPassThreshold,
          min_years_experience: editMinYears,
          required_skills: editRequiredSkills,
          reSynthesize: reSynthesizeWithAI,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update job');

      toast.success(`Role "${editTitle}" updated successfully!`, 'Job Updated');
      setEditingJob(null);
      await fetchJobs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Update Error');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteJob(jobId: string, jobTitle: string) {
    if (!confirm(`Are you sure you want to delete "${jobTitle}"? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete job');

      toast.success(`Role "${jobTitle}" removed.`, 'Job Deleted');
      if (editingJob?.id === jobId) {
        setEditingJob(null);
      }
      await fetchJobs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Delete Error');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Job Requisitions
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Active roles with AI-synthesized screening rubrics, customizable interview booking links, and automated candidate evaluations.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-sm transition-all"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Requisition</span>
        </button>
      </div>

      {/* Jobs Listing */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading active jobs...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="app-card p-10 text-center text-xs text-[var(--text-muted)]">
            No active jobs found. Click &quot;New Requisition&quot; to create one.
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} className="app-card p-5 space-y-3 relative group">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-[var(--text-primary)]">{job.title}</h2>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase ${
                      job.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : job.status === 'paused'
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-neutral-500/10 text-neutral-500 border border-neutral-500/20'
                    }`}>
                      {job.status}
                    </span>
                    <span className="text-[10px] font-mono text-[var(--text-muted)]">v{job.version}</span>
                    {job.calendly_link && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1 font-semibold">
                        <CalendarCheck className="w-2.5 h-2.5" />
                        <span>Calendly Active</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1 flex-wrap">
                    <span>{job.department || 'Platform Engineering'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {job.location || 'Remote (Global)'}
                    </span>
                    <span>•</span>
                    <span>{job.employment_type || 'Full-Time'}</span>
                    <span>•</span>
                    <span>Pass Threshold: <strong className="text-[var(--text-primary)] font-semibold">{job.criteria?.pass_threshold_score || 65}%</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() => handleOpenEditModal(job)}
                    className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded bg-[var(--bg-subtle)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border-subtle)] text-[var(--text-primary)] font-medium transition-all"
                  >
                    <Pencil className="w-3 h-3" />
                    <span>Edit Job</span>
                  </button>
                  <button
                    onClick={() => handleDeleteJob(job.id, job.title)}
                    className="text-xs p-1.5 rounded text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                    title="Delete Job"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {job.calendly_link && (
                <div className="text-xs flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded border border-blue-200 dark:border-blue-900/50">
                  <CalendarCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px] text-[var(--text-muted)]">Interview Booking Link:</span>
                  <a href={job.calendly_link} target="_blank" rel="noopener noreferrer" className="hover:underline truncate max-w-md">
                    {job.calendly_link}
                  </a>
                </div>
              )}

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                {job.description}
              </p>

              {/* AI Synthesized Rubric Breakdown */}
              {job.criteria && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2">
                    <div className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        <span>Required Skills ({job.criteria.required_skills?.length || 0})</span>
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">Min {job.criteria.min_years_experience} yrs exp</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {job.criteria.required_skills?.map((s: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-[10px] font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2">
                    <div className="text-[11px] font-semibold text-[var(--text-primary)] flex items-center gap-1">
                      <GitCompare className="w-3 h-3 text-blue-500" />
                      <span>Automatic Semantic Equivalence Rules ({job.criteria.semantic_equivalence_rules?.length || 0})</span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {job.criteria.semantic_equivalence_rules?.map((rule: any, idx: number) => (
                        <div key={idx} className="text-[10px] font-mono px-2 py-1 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                          <span className="text-[var(--text-primary)]">{rule.source} ⇄ {rule.target}</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{Math.round((rule.weight || 0.9) * 100)}% credit</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="app-card max-w-2xl w-full p-6 bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-[var(--accent)] text-white flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Edit Job Requisition: {editingJob.title}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Update role description, interview booking link, status, and candidate scoring thresholds.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingJob(null)}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditJobSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Job Title */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Job Title / Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xs rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full text-xs rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                  >
                    <option value="active">Active (Receiving Applicants)</option>
                    <option value="draft">Draft (Unpublished)</option>
                    <option value="paused">Paused</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Calendly / Interview Booking Link */}
              <div className="space-y-1 p-3 rounded-lg bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20">
                <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>Calendly / Interview Booking Link</span>
                  </span>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                    Sent to candidates who pass the assessment
                  </span>
                </label>
                <input
                  type="url"
                  placeholder="https://calendly.com/your-org/30min-interview"
                  value={editCalendlyLink}
                  onChange={(e) => setEditCalendlyLink(e.target.value)}
                  className="w-full text-xs rounded-md app-input p-2.5 font-mono bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                />
              </div>

              {/* Department, Location, Employment Type */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Department
                  </label>
                  <input
                    type="text"
                    value={editDepartment}
                    onChange={(e) => setEditDepartment(e.target.value)}
                    className="w-full text-xs rounded-md app-input p-2 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Location
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full text-xs rounded-md app-input p-2 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--text-primary)]">
                    Employment Type
                  </label>
                  <select
                    value={editEmploymentType}
                    onChange={(e) => setEditEmploymentType(e.target.value)}
                    className="w-full text-xs rounded-md app-input p-2 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                  >
                    <option value="Full-Time">Full-Time</option>
                    <option value="Part-Time">Part-Time</option>
                    <option value="Contract">Contract</option>
                    <option value="Internship">Internship</option>
                  </select>
                </div>
              </div>

              {/* Thresholds & Years Experience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-[var(--text-primary)]">
                      CV Match Threshold
                    </label>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{editPassThreshold}%</span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={95}
                    step={5}
                    value={editPassThreshold}
                    onChange={(e) => setEditPassThreshold(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-[var(--text-primary)]">
                      Min Years Experience
                    </label>
                    <span className="font-bold text-[var(--text-primary)]">{editMinYears} yrs</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={1}
                    value={editMinYears}
                    onChange={(e) => setEditMinYears(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Job Description & Responsibilities <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] leading-relaxed"
                />
              </div>

              {/* Required Skills Editor */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                  <span>Required Skills ({editRequiredSkills.length})</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Press enter or Add to add skills</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Add a required skill (e.g. Redis, Go, AWS)..."
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    className="flex-1 text-xs rounded-md app-input p-2 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)]"
                  />
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-3 py-2 rounded-md bg-[var(--bg-subtle)] hover:bg-[var(--accent)] hover:text-white border border-[var(--border-subtle)] text-xs font-medium"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 rounded bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  {editRequiredSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-subtle)] text-xs flex items-center gap-1.5"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-[var(--text-muted)] hover:text-rose-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* AI Re-synthesis Checkbox */}
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] p-2.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={reSynthesizeWithAI}
                  onChange={(e) => setReSynthesizeWithAI(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <Sparkles className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span>
                  <strong>Re-synthesize skills & semantic equivalence rules with AI</strong> from the updated description upon saving.
                </span>
              </label>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => handleDeleteJob(editingJob.id, editingJob.title)}
                  disabled={isDeleting}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium text-rose-600 hover:bg-rose-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Job</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingJob(null)}
                    className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition-all"
                  >
                    {isUpdating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>{isUpdating ? 'Saving Changes...' : 'Save Changes'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Requisition Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="app-card max-w-xl w-full p-6 bg-[var(--bg-surface)] border-[var(--border-subtle)] shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[var(--accent)] text-white flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Create Job Requisition
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Provide the role title, description, and optional Calendly link — AI synthesizes competencies and equivalence rules.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJobSubmit} className="space-y-4">
              {/* Field 1: Job Title / Role */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Job Title / Target Role <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Senior Backend Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-xs rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                />
              </div>

              {/* Field 2: Job Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)]">
                  Job Description & Responsibilities <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Paste or type the job description here. Mention your core stack (e.g. Node.js, PostgreSQL, React, AWS) and expected seniority level..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs rounded-md app-input p-2.5 bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] leading-relaxed"
                />
              </div>

              {/* Field 3: Calendly / Booking Link */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[var(--text-primary)] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CalendarCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>Calendly / Interview Booking Link (Optional)</span>
                  </span>
                </label>
                <input
                  type="url"
                  placeholder="https://calendly.com/your-org/interview"
                  value={calendlyLink}
                  onChange={(e) => setCalendlyLink(e.target.value)}
                  className="w-full text-xs rounded-md app-input p-2.5 font-mono bg-[var(--bg-subtle)] border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                />
              </div>

              {/* Informational Callout */}
              <div className="p-3 rounded-md bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Internal AI Processing:</strong> The platform will automatically parse the requirements, infer the minimum experience, extract core competencies, and set up transferable semantic rules behind the scenes.
                </span>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Synthesizing with AI...' : 'Create & Synthesize Job'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
