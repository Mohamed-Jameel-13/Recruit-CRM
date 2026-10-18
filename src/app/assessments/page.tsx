'use client';

import { useState, useEffect } from 'react';
import { 
  FileCheck2, 
  Settings, 
  Users, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Sparkles, 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  Check, 
  Zap, 
  Globe, 
  FileQuestion, 
  RefreshCw, 
  Copy, 
  ChevronUp, 
  ChevronDown, 
  Layers, 
  ListChecks, 
  Code2, 
  Wand2, 
  Loader2 
} from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { AssessmentConfig, AssessmentQuestion, AssessmentQuestionType } from '@/types/database';
import { AssessmentChatDrawer } from '@/components/assessments/AssessmentChatDrawer';
import { NewAssessmentModal } from '@/components/assessments/NewAssessmentModal';

export default function AssessmentsPage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'tracker' | 'config'>('tracker');
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [generatingAiQ, setGeneratingAiQ] = useState(false);
  const [generatingFullSuite, setGeneratingFullSuite] = useState(false);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASSED' | 'FAILED' | 'PENDING'>('ALL');

  // Answers Viewer Modal
  const [selectedAnswers, setSelectedAnswers] = useState<any | null>(null);

  // Multi-Assessment State
  const [configs, setConfigs] = useState<AssessmentConfig[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string>('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);

  // Configuration State for Currently Selected Blueprint
  const [config, setConfig] = useState<AssessmentConfig>({
    id: 'cfg-fullstack',
    role: 'Senior Full-Stack Cloud Engineer',
    mode: 'INBUILT',
    external_url: '',
    title: 'Senior Full-Stack Cloud Competency Challenge',
    duration_minutes: 45,
    pass_threshold_percentage: 70,
    questions: []
  });

  // Track if config has been modified
  const [isDirty, setIsDirty] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [resAssessments, resConfig] = await Promise.all([
        fetch('/api/assessments'),
        fetch('/api/assessments/config')
      ]);

      const dataAssessments = await resAssessments.json();
      const dataConfig = await resConfig.json();

      setAssessments(dataAssessments.assessments || []);
      if (dataConfig.configs && Array.isArray(dataConfig.configs) && dataConfig.configs.length > 0) {
        setConfigs(dataConfig.configs);
      }
      if (dataConfig.config) {
        setConfig(dataConfig.config);
        setSelectedConfigId(dataConfig.config.id);
      }
      setIsDirty(false);
    } catch (err: unknown) {
      console.error('Failed to load assessment data:', err);
      toast.error('Failed to load assessments', 'Load Error');
    } finally {
      setLoading(false);
    }
  }

  function handleSelectConfig(cfgId: string) {
    const found = configs.find(c => c.id === cfgId);
    if (!found) return;
    if (isDirty) {
      if (!confirm('You have unsaved changes in the current assessment. Do you want to switch anyway?')) {
        return;
      }
    }
    setConfig(found);
    setSelectedConfigId(found.id);
    setIsDirty(false);
    toast.info(`Switched to "${found.title}"`, 'Blueprint Selected');
  }

  async function handleSaveConfig() {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/assessments/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration');
      
      setConfig(data.config);
      if (data.configs) {
        setConfigs(data.configs);
      }
      setIsDirty(false);
      toast.success('Assessment configuration saved. All candidates assigned to this role will receive these questions.', 'Settings Saved');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Save Error');
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleCreateNewAssessment(data: {
    role: string;
    title: string;
    duration_minutes: number;
    pass_threshold_percentage: number;
    template: 'scratch' | 'fullstack' | 'backend' | 'devops' | 'ai_generate';
  }) {
    try {
      toast.info(`Creating assessment blueprint for "${data.role}"...`, 'Creating Assessment');
      
      let starterQuestions: AssessmentQuestion[] = [];
      if (data.template === 'fullstack') {
        const fsPreset = configs.find(c => c.id === 'cfg-fullstack');
        starterQuestions = fsPreset ? JSON.parse(JSON.stringify(fsPreset.questions)) : [];
      } else if (data.template === 'backend') {
        const bePreset = configs.find(c => c.id === 'cfg-backend');
        starterQuestions = bePreset ? JSON.parse(JSON.stringify(bePreset.questions)) : [];
      } else if (data.template === 'devops') {
        const doPreset = configs.find(c => c.id === 'cfg-devops');
        starterQuestions = doPreset ? JSON.parse(JSON.stringify(doPreset.questions)) : [];
      }

      const res = await fetch('/api/assessments/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          role: data.role,
          title: data.title,
          duration_minutes: data.duration_minutes,
          pass_threshold_percentage: data.pass_threshold_percentage,
          questions: starterQuestions
        })
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || 'Failed to create assessment');

      if (resData.configs) setConfigs(resData.configs);
      if (resData.config) {
        setConfig(resData.config);
        setSelectedConfigId(resData.config.id);
      }
      setIsDirty(false);
      toast.success(`Created assessment blueprint for "${data.role}"!`, 'Assessment Created');

      // If user chose AI generation, run it right away
      if (data.template === 'ai_generate') {
        handleGenerateFullSuite(data.role, resData.config);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Creation Failed');
    }
  }

  function handleDuplicateAssessment() {
    const dup: AssessmentConfig = {
      ...JSON.parse(JSON.stringify(config)),
      id: `cfg-${Date.now()}`,
      title: `${config.title} (Copy)`,
      role: config.role ? `${config.role} (Copy)` : 'Custom Role',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setConfigs([...configs, dup]);
    setConfig(dup);
    setSelectedConfigId(dup.id);
    setIsDirty(true);
    toast.info('Assessment duplicated. Click Save to persist.', 'Duplicated');
  }

  async function handleDeleteAssessment() {
    if (configs.length <= 1) {
      toast.warning('At least one assessment configuration must be maintained.', 'Cannot Delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete "${config.title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/assessments/config?id=${config.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete assessment');

      if (data.configs) setConfigs(data.configs);
      if (data.config) {
        setConfig(data.config);
        setSelectedConfigId(data.config.id);
      }
      setIsDirty(false);
      toast.success('Assessment configuration deleted.', 'Deleted');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Delete Failed');
    }
  }

  function handleAddQuestion(type: AssessmentQuestionType = 'mcq') {
    const qCount = config.questions.length + 1;
    let newQ: AssessmentQuestion;

    if (type === 'mcq') {
      newQ = {
        id: 'q_' + Date.now(),
        type: 'mcq',
        title: `Technical Concept ${qCount}`,
        category: 'Architecture',
        points: 25,
        description: 'Specify the engineering problem scenario and trade-offs that the candidate must evaluate.',
        options: [
          'Option A: First proposed implementation strategy',
          'Option B: Second proposed implementation strategy (Recommended / Optimal)',
          'Option C: Third proposed implementation strategy',
          'Option D: Fourth proposed implementation strategy'
        ],
        correct_option_index: 1,
        explanation: 'Option B is optimal because it guarantees scalability and zero message drops.'
      };
    } else if (type === 'coding') {
      newQ = {
        id: 'q_' + Date.now(),
        type: 'coding',
        title: `Algorithmic / Code Implementation ${qCount}`,
        category: 'Coding',
        points: 25,
        language: 'typescript',
        description: 'Implement a thread-safe, resilient function meeting the performance requirements.',
        starter_code: `// Write your production TypeScript/Node.js implementation here...\nfunction solution() {\n  \n}`,
        test_cases: [
          { input: 'sample input 1', expected_output: 'expected result 1', description: 'Basic happy path' },
          { input: 'edge case input', expected_output: 'handled edge case', description: 'Edge boundary condition' }
        ],
        hints: ['Consider space-time complexity bounds', 'Handle null or empty inputs gracefully'],
        rubric: 'Must handle edge cases, O(1) or O(log N) lookup complexity, memory bounds, and concurrency safely.',
        sample_pass_answer: 'function solution() { /* Optimal implementation */ }'
      };
    } else {
      newQ = {
        id: 'q_' + Date.now(),
        type: 'subjective',
        title: `System Architecture Scenario ${qCount}`,
        category: 'Architecture',
        points: 25,
        description: 'Describe your architectural solution and trade-offs for this distributed scenario.',
        placeholder: 'Explain system components, caching layers, database indexing, and fault tolerance...',
        rubric: 'Candidate must specify distributed locking, idempotency, horizontal scalability, and monitoring.',
        sample_pass_answer: 'Detailed production implementation with Redis sliding-window deduplication, Kafka partitioned groups, and PostgreSQL ACID transactions.'
      };
    }

    setConfig({
      ...config,
      questions: [...config.questions, newQ]
    });
    setIsDirty(true);
    toast.info(`New ${type.toUpperCase()} question added.`, 'Question Added');
  }

  function handleRemoveQuestion(id: string) {
    if (config.questions.length <= 1) {
      toast.warning('At least one question is required.', 'Cannot Delete');
      return;
    }
    setConfig({
      ...config,
      questions: config.questions.filter(q => q.id !== id)
    });
    setIsDirty(true);
  }

  function handleDuplicateQuestion(q: AssessmentQuestion) {
    const dup: AssessmentQuestion = {
      ...JSON.parse(JSON.stringify(q)),
      id: 'q_' + Date.now(),
      title: `${q.title} (Copy)`
    };
    setConfig({
      ...config,
      questions: [...config.questions, dup]
    });
    setIsDirty(true);
    toast.info('Question duplicated.', 'Duplicated');
  }

  function handleMoveQuestion(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= config.questions.length) return;

    const updated = [...config.questions];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);

    setConfig({ ...config, questions: updated });
    setIsDirty(true);
  }

  function handleQuestionChange(id: string, field: keyof AssessmentQuestion, value: any) {
    setConfig({
      ...config,
      questions: config.questions.map(q => q.id === id ? { ...q, [field]: value } : q)
    });
    setIsDirty(true);
  }

  function handleOptionChange(qId: string, optIndex: number, text: string) {
    setConfig({
      ...config,
      questions: config.questions.map(q => {
        if (q.id !== qId) return q;
        const newOptions = [...(q.options || [])];
        newOptions[optIndex] = text;
        return { ...q, options: newOptions };
      })
    });
    setIsDirty(true);
  }

  function handleAddOption(qId: string) {
    setConfig({
      ...config,
      questions: config.questions.map(q => {
        if (q.id !== qId) return q;
        const newOptions = [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`];
        return { ...q, options: newOptions };
      })
    });
    setIsDirty(true);
  }

  function handleRemoveOption(qId: string, optIndex: number) {
    setConfig({
      ...config,
      questions: config.questions.map(q => {
        if (q.id !== qId) return q;
        const currentOptions = q.options || [];
        if (currentOptions.length <= 2) {
          toast.warning('An MCQ question requires at least 2 options.', 'Cannot Remove');
          return q;
        }
        const newOptions = currentOptions.filter((_, idx) => idx !== optIndex);
        let newCorrect = q.correct_option_index || 0;
        if (newCorrect >= newOptions.length) {
          newCorrect = newOptions.length - 1;
        }
        return { ...q, options: newOptions, correct_option_index: newCorrect };
      })
    });
    setIsDirty(true);
  }

  function handleAddTestCase(qId: string) {
    setConfig({
      ...config,
      questions: config.questions.map(q => {
        if (q.id !== qId) return q;
        const tests = q.test_cases || [];
        return {
          ...q,
          test_cases: [
            ...tests,
            { input: 'input args', expected_output: 'expected value', description: `Test Case ${tests.length + 1}` }
          ]
        };
      })
    });
    setIsDirty(true);
  }

  function handleRemoveTestCase(qId: string, testIdx: number) {
    setConfig({
      ...config,
      questions: config.questions.map(q => {
        if (q.id !== qId) return q;
        return {
          ...q,
          test_cases: (q.test_cases || []).filter((_, idx) => idx !== testIdx)
        };
      })
    });
    setIsDirty(true);
  }

  function handleTestCaseChange(qId: string, testIdx: number, field: string, val: string) {
    setConfig({
      ...config,
      questions: config.questions.map(q => {
        if (q.id !== qId) return q;
        const tests = [...(q.test_cases || [])];
        if (tests[testIdx]) {
          tests[testIdx] = { ...tests[testIdx], [field]: val };
        }
        return { ...q, test_cases: tests };
      })
    });
    setIsDirty(true);
  }

  async function handleGenerateAiQuestion(type: AssessmentQuestionType = 'mcq') {
    setGeneratingAiQ(true);
    try {
      const roleTarget = config.role || config.title;
      toast.info(`Generating ${type.toUpperCase()} question tailored to "${roleTarget}" via Gemini 2.5 Flash...`, 'AI Architect');
      
      const res = await fetch('/api/assessments/generate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: roleTarget,
          type,
          category: type === 'mcq' ? 'Architecture' : type === 'coding' ? 'Algorithms' : 'System Design'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate question');

      if (data.question) {
        setConfig({
          ...config,
          questions: [...config.questions, data.question]
        });
        setIsDirty(true);
        toast.success(`Generated: "${data.question.title}"`, 'Question Generated');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'AI Generation Failed');
    } finally {
      setGeneratingAiQ(false);
    }
  }

  async function handleGenerateFullSuite(overrideRole?: string, targetConfig?: AssessmentConfig) {
    setGeneratingFullSuite(true);
    const active = targetConfig || config;
    const roleTarget = overrideRole || active.role || active.title;

    try {
      toast.info(`Synthesizing balanced assessment suite (MCQs, Coding, Architecture) for "${roleTarget}"...`, 'Full AI Suite');

      const [mcq1Res, mcq2Res, codingRes, archRes] = await Promise.all([
        fetch('/api/assessments/generate-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: roleTarget, type: 'mcq', category: 'Core Architecture' })
        }),
        fetch('/api/assessments/generate-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: roleTarget, type: 'mcq', category: 'Concurrency & Scale' })
        }),
        fetch('/api/assessments/generate-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: roleTarget, type: 'coding', category: 'Algorithms & Implementation' })
        }),
        fetch('/api/assessments/generate-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: roleTarget, type: 'subjective', category: 'System Design & Trade-offs' })
        })
      ]);

      const [mcq1, mcq2, coding, arch] = await Promise.all([
        mcq1Res.json(),
        mcq2Res.json(),
        codingRes.json(),
        archRes.json()
      ]);

      const newQuestions = [mcq1.question, mcq2.question, coding.question, arch.question].filter(Boolean);

      if (newQuestions.length > 0) {
        const updatedConfig: AssessmentConfig = {
          ...active,
          questions: newQuestions
        };
        setConfig(updatedConfig);

        // Automatically persist to backend so the created assessment is instantly saved and ready for screening
        try {
          const saveRes = await fetch('/api/assessments/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedConfig)
          });
          const saveData = await saveRes.json();
          if (saveRes.ok && saveData.config) {
            setConfig(saveData.config);
            if (saveData.configs) setConfigs(saveData.configs);
            setIsDirty(false);
            toast.success(`Generated & saved complete 4-question technical challenge for ${roleTarget}!`, 'Assessment Saved');
            return;
          }
        } catch {}

        setIsDirty(true);
        toast.success(`Generated complete 4-question technical challenge for ${roleTarget}!`, 'Full Suite Ready');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Full Suite Generation Error');
    } finally {
      setGeneratingFullSuite(false);
    }
  }

  function handleCopilotAddQuestions(newQuestions: AssessmentQuestion[]) {
    setConfig(prev => ({
      ...prev,
      questions: [...prev.questions, ...newQuestions]
    }));
    setIsDirty(true);
  }

  function handleCopilotReplaceQuestions(newQuestions: AssessmentQuestion[]) {
    setConfig(prev => ({
      ...prev,
      questions: newQuestions
    }));
    setIsDirty(true);
  }

  function handleCopilotUpdateConfig(updates: Partial<AssessmentConfig>) {
    setConfig(prev => ({
      ...prev,
      ...updates
    }));
    setIsDirty(true);
  }

  async function handleFastTrackSimulate(assignmentId: string, email: string) {
    try {
      toast.info(`Simulating verified assessment pass for ${email}...`, 'Simulating Submission');
      const res = await fetch('/api/assessments/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId,
          score: 95,
          candidateEmail: email,
          answers: {
            'Simulated Fast-Track': 'Candidate scored 95% on all technical competencies. Automatically progressed to Round 2.'
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission simulation failed');
      toast.success(
        `Scored ${data.score}%! Candidate automatically moved to Round 2. Sarah Connor booked and Google Meet link emailed.`,
        'Shortlisted to Round 2'
      );
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'Simulation Error');
    }
  }

  const webhookBaseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || 'https://spare-guides-documented-discrete.trycloudflare.com');
  const fullWebhookUrl = `${webhookBaseUrl}/api/webhooks/google-form`;

  function handleCopyWebhook() {
    navigator.clipboard.writeText(fullWebhookUrl);
    setCopiedWebhook(true);
    toast.success('Google Form Webhook URL copied to clipboard.', 'Copied');
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  const filteredAssessments = assessments.filter(a => {
    const name = `${a.candidate?.first_name || ''} ${a.candidate?.last_name || ''}`.toLowerCase();
    const email = (a.candidate?.email || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = name.includes(query) || email.includes(query);

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PASSED') return a.status === 'PASSED';
    if (statusFilter === 'FAILED') return a.status === 'FAILED';
    if (statusFilter === 'PENDING') return a.status !== 'PASSED' && a.status !== 'FAILED';
    return true;
  });

  const totalAssigned = assessments.length;
  const totalPassed = assessments.filter(a => a.status === 'PASSED').length;
  const totalPending = assessments.filter(a => a.status !== 'PASSED' && a.status !== 'FAILED').length;
  const avgScore = totalPassed > 0 
    ? Math.round(assessments.filter(a => a.percentage_score).reduce((acc, curr) => acc + (curr.percentage_score || 0), 0) / (totalPassed || 1))
    : 0;

  const totalConfigPoints = config.questions.reduce((sum, q) => sum + (q.points || 25), 0);
  const requiredPassPoints = Math.round((totalConfigPoints * config.pass_threshold_percentage) / 100);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-blue-500" />
            <span>Technical Assessment Hub</span>
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Build flexible role-specific challenges (MCQs, coding &amp; system architecture), chat with AI Copilot, and track candidate evaluations.
          </p>
        </div>

        {/* Tab Controls & Copilot Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium">
            <button
              onClick={() => setActiveTab('tracker')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'tracker'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Candidate Tracker</span>
              <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                {totalAssigned}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeTab === 'config'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Assessment Studio</span>
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes" />
              )}
            </button>
          </div>

          {activeTab === 'config' && (
            <button
              type="button"
              onClick={() => setShowChatDrawer(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 animate-spin-slow" />
              <span>AI Copilot Chat</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CANDIDATE ASSESSMENT TRACKER */}
      {/* ======================================================== */}
      {activeTab === 'tracker' && (
        <div className="space-y-6">
          {/* Metric Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="app-card p-4 space-y-1">
              <span className="text-[11px] font-semibold text-neutral-500 block">Total Sent / Assigned</span>
              <span className="text-2xl font-bold text-neutral-900 dark:text-white">{totalAssigned}</span>
            </div>
            <div className="app-card p-4 space-y-1">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">Passed &amp; Shortlisted</span>
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalPassed}</span>
            </div>
            <div className="app-card p-4 space-y-1">
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block">In Progress / Pending</span>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalPending}</span>
            </div>
            <div className="app-card p-4 space-y-1">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 block">Average Pass Score</span>
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{avgScore}%</span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidate by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 app-input"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800 text-xs">
                {(['ALL', 'PASSED', 'FAILED', 'PENDING'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                      statusFilter === filter
                        ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    {filter === 'ALL' ? 'All' : filter.charAt(0) + filter.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors"
                title="Refresh Assessments"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Assessments Table */}
          <div className="app-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Candidate</th>
                    <th className="py-3 px-4">Target Job</th>
                    <th className="py-3 px-4">Challenge Link</th>
                    <th className="py-3 px-4 text-center">Score / Cutoff</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {filteredAssessments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-400">
                        <FileQuestion className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-sm">No assessments found</p>
                        <p className="text-[11px] mt-1">Upload CVs on the Upload page to auto-dispatch assessment invitations.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredAssessments.map((a) => {
                      const isPassed = a.status === 'PASSED';
                      const isFailed = a.status === 'FAILED';
                      const hasResult = a.percentage_score !== undefined;

                      return (
                        <tr key={a.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-neutral-900 dark:text-white block">
                              {a.candidate?.first_name} {a.candidate?.last_name}
                            </span>
                            <span className="text-[11px] text-neutral-400 font-mono">
                              {a.candidate?.email}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-medium text-neutral-700 dark:text-neutral-300">
                              {a.jobTitle || 'Senior Full-Stack Cloud Engineer'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            {a.assessment_url ? (
                              <a
                                href={a.assessment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <span>{a.assessment_url.length > 32 ? a.assessment_url.substring(0, 32) + '...' : a.assessment_url}</span>
                                <ExternalLink className="w-3 h-3 shrink-0" />
                              </a>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {hasResult ? (
                              <div className="font-mono font-bold">
                                <span className={isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                  {a.percentage_score}%
                                </span>
                                <span className="text-neutral-400 text-[10px]"> / {a.pass_threshold_percentage}%</span>
                              </div>
                            ) : (
                              <span className="text-neutral-400 text-[11px]">Awaiting Test</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              isPassed 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : isFailed
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            }`}>
                              {isPassed && <CheckCircle2 className="w-3 h-3" />}
                              {isFailed && <XCircle className="w-3 h-3" />}
                              {!isPassed && !isFailed && <Clock className="w-3 h-3" />}
                              <span>{a.status}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-1.5">
                            {/* Inspect Responses */}
                            {a.result_details?.answers && (
                              <button
                                type="button"
                                onClick={() => setSelectedAnswers({
                                  candidateName: `${a.candidate?.first_name} ${a.candidate?.last_name}`,
                                  score: a.percentage_score,
                                  details: a.result_details
                                })}
                                className="px-2.5 py-1 text-xs rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 font-medium transition-colors"
                              >
                                View Answers
                              </button>
                            )}

                            {/* Fast-track test submission simulator */}
                            {!isPassed && (
                              <button
                                type="button"
                                onClick={() => handleFastTrackSimulate(a.id, a.candidate?.email)}
                                className="px-2.5 py-1 text-xs rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium transition-colors"
                                title="Simulate Candidate 95% pass"
                              >
                                Fast-Track Pass
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: RECRUITER ASSESSMENT STUDIO */}
      {/* ======================================================== */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Assessment Management Top Bar */}
          <div className="app-card p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-transparent border-blue-500/20">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Active Assessment Blueprint:
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                    {configs.length} Roles Managed
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedConfigId}
                    onChange={(e) => handleSelectConfig(e.target.value)}
                    className="app-input text-sm font-bold p-2 min-w-[280px] bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700"
                  >
                    {configs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} — {c.role || 'Role'} ({c.questions?.length || 0} Qs)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Assessment Blueprint Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setShowNewModal(true)}
                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ New Assessment</span>
              </button>

              <button
                type="button"
                onClick={handleDuplicateAssessment}
                className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                title="Duplicate Current Blueprint"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>

              <button
                type="button"
                disabled={configs.length <= 1}
                onClick={handleDeleteAssessment}
                className="px-3 py-2 rounded-lg border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40"
                title="Delete Current Blueprint"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>

          {/* Mode Switcher: Inbuilt vs External */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => { setConfig({ ...config, mode: 'INBUILT' }); setIsDirty(true); }}
              className={`app-card p-5 cursor-pointer border-2 transition-all ${
                config.mode === 'INBUILT'
                  ? 'border-blue-500 bg-blue-500/5 shadow-md'
                  : 'border-transparent hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${config.mode === 'INBUILT' ? 'bg-blue-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                      Inbuilt Assessment Studio
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      Flexible MCQs, coding challenges &amp; architecture problems with automated AI evaluation.
                    </p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${config.mode === 'INBUILT' ? 'border-blue-500 bg-blue-500 text-white' : 'border-neutral-400'}`}>
                  {config.mode === 'INBUILT' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-neutral-600 dark:text-neutral-400 bg-white/60 dark:bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
                Candidates receive a dedicated test URL (`/assessment/take/[id]`). Answers are graded instantly, advancing passing candidates to Round 2.
              </div>
            </div>

            <div 
              onClick={() => { setConfig({ ...config, mode: 'EXTERNAL_URL' }); setIsDirty(true); }}
              className={`app-card p-5 cursor-pointer border-2 transition-all ${
                config.mode === 'EXTERNAL_URL'
                  ? 'border-purple-500 bg-purple-500/5 shadow-md'
                  : 'border-transparent hover:border-neutral-300 dark:hover:border-neutral-700'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${config.mode === 'EXTERNAL_URL' ? 'bg-purple-500 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'}`}>
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                      External Form Link (Google Forms / Typeform)
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      Send your existing Google Form or custom assessment survey.
                    </p>
                  </div>
                </div>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${config.mode === 'EXTERNAL_URL' ? 'border-purple-500 bg-purple-500 text-white' : 'border-neutral-400'}`}>
                  {config.mode === 'EXTERNAL_URL' && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>
              <div className="mt-3 text-[11px] text-neutral-600 dark:text-neutral-400 bg-white/60 dark:bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800">
                Invited candidates are sent your Google Form URL. Submissions are received automatically via webhook and scheduled for Round 2.
              </div>
            </div>
          </div>

          {/* External URL Input (if External Form selected) */}
          {config.mode === 'EXTERNAL_URL' && (
            <div className="app-card p-5 space-y-4 bg-purple-500/5 border-purple-500/20">
              <label className="text-xs font-bold text-neutral-900 dark:text-white block">
                Google Form / External Assessment Link
              </label>
              <input
                type="url"
                value={config.external_url || ''}
                onChange={(e) => { setConfig({ ...config, external_url: e.target.value }); setIsDirty(true); }}
                placeholder="https://forms.gle/your-google-form-id or https://docs.google.com/forms/..."
                className="w-full text-xs app-input p-3"
              />
              <div className="text-[11px] text-neutral-600 dark:text-neutral-400 space-y-2">
                <p>
                  <strong>Webhook Endpoint for Google Apps Script / Form Automation:</strong>
                </p>
                <div className="flex items-center gap-2 p-2 bg-neutral-900 text-neutral-200 rounded-lg font-mono text-xs overflow-x-auto">
                  <span className="flex-1 truncate">{fullWebhookUrl}</span>
                  <button
                    type="button"
                    onClick={handleCopyWebhook}
                    className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] flex items-center gap-1 shrink-0"
                  >
                    {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* General Assessment Parameters */}
          <div className="app-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Assessment Blueprint &amp; Role Parameters
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Configure title, target role, time limit, and passing cutoff for candidate evaluation.
                </p>
              </div>

              {/* Generate Full Suite Button */}
              <button
                type="button"
                disabled={generatingFullSuite}
                onClick={() => handleGenerateFullSuite()}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {generatingFullSuite ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Generate Full Role Suite</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Assessment Title
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(e) => { setConfig({ ...config, title: e.target.value }); setIsDirty(true); }}
                  placeholder="e.g. Senior Full-Stack Cloud Competency Challenge"
                  className="w-full text-xs app-input p-2.5 font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  Target Role
                </label>
                <input
                  type="text"
                  value={config.role || ''}
                  onChange={(e) => { setConfig({ ...config, role: e.target.value }); setIsDirty(true); }}
                  placeholder="e.g. Senior Full-Stack Cloud Engineer"
                  className="w-full text-xs app-input p-2.5 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Time (Mins)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={config.duration_minutes}
                    onChange={(e) => { setConfig({ ...config, duration_minutes: parseInt(e.target.value, 10) || 45 }); setIsDirty(true); }}
                    className="w-full text-xs app-input p-2.5 text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                    Pass Cutoff (%)
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={100}
                    value={config.pass_threshold_percentage}
                    onChange={(e) => { setConfig({ ...config, pass_threshold_percentage: parseInt(e.target.value, 10) || 70 }); setIsDirty(true); }}
                    className="w-full text-xs app-input p-2.5 text-center font-mono"
                  />
                </div>
              </div>

              <div className="sm:col-span-4">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1 flex items-center justify-between">
                  <span>Round 2 Calendly / Interview Booking Link (Default for this role)</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Included in candidate email upon scoring &ge; {config.pass_threshold_percentage}%</span>
                </label>
                <input
                  type="url"
                  value={config.calendly_link || ''}
                  onChange={(e) => { setConfig({ ...config, calendly_link: e.target.value }); setIsDirty(true); }}
                  placeholder="https://calendly.com/your-org/30min-interview"
                  className="w-full text-xs app-input p-2.5 font-mono"
                />
              </div>
            </div>

            {/* Summary Stat Pill */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-xs flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Total Questions: <strong>{config.questions.length}</strong>
                </span>
                <span className="text-neutral-400">&bull;</span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {config.questions.filter(q => q.type === 'mcq').length} MCQs
                </span>
                <span className="text-neutral-400">&bull;</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {config.questions.filter(q => q.type === 'coding').length} Coding
                </span>
                <span className="text-neutral-400">&bull;</span>
                <span className="text-purple-600 dark:text-purple-400 font-medium">
                  {config.questions.filter(q => q.type === 'subjective').length} Architecture
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono font-bold">
                <span className="text-neutral-500">Total Points: {totalConfigPoints} pts</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  (Pass Cutoff: &ge; {requiredPassPoints} pts / {config.pass_threshold_percentage}%)
                </span>
              </div>
            </div>
          </div>

          {/* Questions Builder Studio */}
          {config.mode === 'INBUILT' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-blue-500" />
                    <span>Technical Challenge Questions ({config.questions.length})</span>
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Add or generate MCQs, coding challenges, and system architecture scenarios with automated grading rubrics.
                  </p>
                </div>

                {/* Question Creation & AI Suite Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('mcq')}
                    className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 font-medium border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ MCQ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('coding')}
                    className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>+ Coding</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('subjective')}
                    className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 font-medium border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Arch</span>
                  </button>

                  <div className="h-4 w-[1px] bg-neutral-200 dark:bg-neutral-700 hidden sm:block" />

                  {/* AI Quick Buttons */}
                  <button
                    type="button"
                    disabled={generatingAiQ}
                    onClick={() => handleGenerateAiQuestion('mcq')}
                    className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                    title="Generate an MCQ via AI"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>AI MCQ</span>
                  </button>
                  <button
                    type="button"
                    disabled={generatingAiQ}
                    onClick={() => handleGenerateAiQuestion('coding')}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                    title="Generate a Coding Challenge via AI"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>AI Coding</span>
                  </button>
                  <button
                    type="button"
                    disabled={generatingAiQ}
                    onClick={() => handleGenerateAiQuestion('subjective')}
                    className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                    title="Generate an Architecture Problem via AI"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Arch</span>
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-5">
                {config.questions.map((q, idx) => {
                  const isMCQ = q.type === 'mcq';
                  const isCoding = q.type === 'coding';
                  const isSubjective = !isMCQ && !isCoding;

                  return (
                    <div 
                      key={q.id || idx} 
                      className="app-card p-5 sm:p-6 space-y-4 relative border hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-sm"
                    >
                      {/* Top Header of Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Reordering Controls */}
                          <div className="flex items-center gap-0.5 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-700">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveQuestion(idx, 'up')}
                              className="p-1 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30"
                              title="Move Question Up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === config.questions.length - 1}
                              onClick={() => handleMoveQuestion(idx, 'down')}
                              className="p-1 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30"
                              title="Move Question Down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold text-xs flex items-center justify-center border border-blue-500/20">
                            {idx + 1}
                          </span>

                          {/* Type Switcher Pills */}
                          <div className="flex items-center gap-1 p-0.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[11px] font-semibold">
                            <button
                              type="button"
                              onClick={() => handleQuestionChange(q.id, 'type', 'mcq')}
                              className={`px-2.5 py-1 rounded-md transition-colors ${
                                isMCQ
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                              }`}
                            >
                              MCQ
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuestionChange(q.id, 'type', 'coding')}
                              className={`px-2.5 py-1 rounded-md transition-colors ${
                                isCoding
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                              }`}
                            >
                              Coding
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuestionChange(q.id, 'type', 'subjective')}
                              className={`px-2.5 py-1 rounded-md transition-colors ${
                                isSubjective
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                              }`}
                            >
                              Architecture
                            </button>
                          </div>

                          {/* Category Selector */}
                          <select
                            value={q.category}
                            onChange={(e) => handleQuestionChange(q.id, 'category', e.target.value)}
                            className="text-xs app-input p-1.5 w-32 font-medium"
                          >
                            <option value="Architecture">Architecture</option>
                            <option value="Database">Database</option>
                            <option value="DevOps">DevOps</option>
                            <option value="Coding">Coding</option>
                            <option value="Frontend">Frontend</option>
                            <option value="Security">Security</option>
                            <option value="Distributed Systems">Distributed Systems</option>
                            <option value="General">General</option>
                          </select>

                          {/* Points Input */}
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={5}
                              max={100}
                              value={q.points || 25}
                              onChange={(e) => handleQuestionChange(q.id, 'points', parseInt(e.target.value, 10) || 25)}
                              className="text-xs app-input p-1.5 w-16 text-center font-bold font-mono"
                            />
                            <span className="text-[11px] text-neutral-400 font-medium">pts</span>
                          </div>
                        </div>

                        {/* Card Top Actions: Duplicate & Delete */}
                        <div className="flex items-center gap-1 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleDuplicateQuestion(q)}
                            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
                            title="Duplicate Question"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestion(q.id)}
                            className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                            title="Delete Question"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Question Title & Description */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                            Question Title
                          </label>
                          <input
                            type="text"
                            value={q.title}
                            onChange={(e) => handleQuestionChange(q.id, 'title', e.target.value)}
                            placeholder="e.g. Distributed Database Concurrency & ACID Locking"
                            className="font-bold text-xs app-input p-2.5 w-full"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                            Question Prompt / Problem Specification
                          </label>
                          <textarea
                            rows={3}
                            value={q.description}
                            onChange={(e) => handleQuestionChange(q.id, 'description', e.target.value)}
                            placeholder="Detail the technical problem, edge cases, and expected trade-offs the candidate must evaluate..."
                            className="w-full text-xs app-input p-2.5 leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* IF MCQ: Multiple Choice Options Manager */}
                      {isMCQ && (
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                              Options &amp; Correct Answer Key
                            </label>
                            <button
                              type="button"
                              onClick={() => handleAddOption(q.id)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Option</span>
                            </button>
                          </div>

                          <div className="space-y-2">
                            {(q.options || []).map((opt, optIdx) => {
                              const isCorrect = (q.correct_option_index ?? 0) === optIdx;

                              return (
                                <div 
                                  key={optIdx} 
                                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                                    isCorrect 
                                      ? 'border-emerald-500/50 bg-emerald-500/5 shadow-xs' 
                                      : 'border-neutral-200 dark:border-neutral-800'
                                  }`}
                                >
                                  <label 
                                    className="cursor-pointer flex items-center gap-2 shrink-0 px-2"
                                    title="Mark as correct answer"
                                  >
                                    <input
                                      type="radio"
                                      name={`correct_${q.id}`}
                                      checked={isCorrect}
                                      onChange={() => handleQuestionChange(q.id, 'correct_option_index', optIdx)}
                                      className="text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                    />
                                    <span className={`w-5 h-5 rounded text-xs font-bold flex items-center justify-center ${
                                      isCorrect ? 'bg-emerald-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                                    }`}>
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                  </label>

                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) => handleOptionChange(q.id, optIdx, e.target.value)}
                                    className="flex-1 text-xs bg-transparent border-none focus:outline-none py-1"
                                    placeholder={`Option ${optIdx + 1} text...`}
                                  />

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveOption(q.id, optIdx)}
                                    className="text-neutral-400 hover:text-red-500 p-1 transition-colors"
                                    title="Remove this option"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                              Explanation (Why the selected option is architecturally optimal)
                            </label>
                            <input
                              type="text"
                              value={q.explanation || ''}
                              onChange={(e) => handleQuestionChange(q.id, 'explanation', e.target.value)}
                              placeholder="e.g. SHA-256 idempotency key deduplication in Redis ensures zero message loss..."
                              className="w-full text-xs app-input p-2 text-neutral-600 dark:text-neutral-400"
                            />
                          </div>
                        </div>
                      )}

                      {/* IF CODING: Language, Starter Code Skeleton & Test Cases */}
                      {isCoding && (
                        <div className="space-y-4 pt-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                                Programming Language:
                              </label>
                              <select
                                value={q.language || 'typescript'}
                                onChange={(e) => handleQuestionChange(q.id, 'language', e.target.value)}
                                className="text-xs app-input p-1.5 font-mono font-semibold"
                              >
                                <option value="typescript">TypeScript</option>
                                <option value="javascript">JavaScript (Node.js)</option>
                                <option value="python">Python 3</option>
                                <option value="go">Go</option>
                                <option value="sql">PostgreSQL / SQL</option>
                              </select>
                            </div>
                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                              <Code2 className="w-3.5 h-3.5" />
                              <span>Automated Code Sandbox Evaluation</span>
                            </span>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                              Starter Code Skeleton (Candidate starts with this template)
                            </label>
                            <textarea
                              rows={5}
                              value={q.starter_code || q.placeholder || ''}
                              onChange={(e) => handleQuestionChange(q.id, 'starter_code', e.target.value)}
                              placeholder="function solution(args) { ... }"
                              className="w-full text-xs app-input p-3 font-mono leading-relaxed bg-neutral-900 text-neutral-100 dark:bg-black border-neutral-700"
                            />
                          </div>

                          {/* Test Cases Editor */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                                <span>Automated Verification Test Cases</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-normal">
                                  {(q.test_cases || []).length} Cases
                                </span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleAddTestCase(q.id)}
                                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Test Case</span>
                              </button>
                            </div>

                            <div className="space-y-2">
                              {(q.test_cases || []).map((tc, tcIdx) => (
                                <div key={tcIdx} className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="font-bold text-neutral-700 dark:text-neutral-300">
                                      Case {tcIdx + 1} &bull; {tc.description || 'Verification Test'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTestCase(q.id, tcIdx)}
                                      className="text-neutral-400 hover:text-red-500"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <input
                                      type="text"
                                      value={tc.input}
                                      onChange={(e) => handleTestCaseChange(q.id, tcIdx, 'input', e.target.value)}
                                      placeholder="Input parameters / invocation..."
                                      className="app-input text-xs p-2 font-mono"
                                    />
                                    <input
                                      type="text"
                                      value={tc.expected_output}
                                      onChange={(e) => handleTestCaseChange(q.id, tcIdx, 'expected_output', e.target.value)}
                                      placeholder="Expected return value..."
                                      className="app-input text-xs p-2 font-mono"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                              Optimal Reference Solution (Used for benchmarking and instant verification)
                            </label>
                            <textarea
                              rows={4}
                              value={q.sample_pass_answer || ''}
                              onChange={(e) => handleQuestionChange(q.id, 'sample_pass_answer', e.target.value)}
                              placeholder="Complete optimal solution code..."
                              className="w-full text-xs app-input p-3 font-mono leading-relaxed bg-neutral-900 text-neutral-100 dark:bg-black border-neutral-700"
                            />
                          </div>
                        </div>
                      )}

                      {/* IF SUBJECTIVE: Architecture rubric, hint, and benchmark */}
                      {isSubjective && (
                        <div className="space-y-3 pt-2">
                          <div>
                            <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                              Evaluation Rubric (AI checks for these specific architectural patterns &amp; trade-offs)
                            </label>
                            <textarea
                              rows={2}
                              value={q.rubric || ''}
                              onChange={(e) => handleQuestionChange(q.id, 'rubric', e.target.value)}
                              placeholder="e.g. Candidate must specify Redis sliding window, Lua script, HTTP 429 status code, and fallback strategies..."
                              className="w-full text-xs app-input p-2.5 font-mono text-[11px]"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                              Candidate Placeholder / Hint Prompt
                            </label>
                            <input
                              type="text"
                              value={q.placeholder || ''}
                              onChange={(e) => handleQuestionChange(q.id, 'placeholder', e.target.value)}
                              placeholder="e.g. Detail your distributed rate limiter data structures and fallback resilience..."
                              className="w-full text-xs app-input p-2"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-neutral-500 block mb-1">
                              Benchmark Pass Answer (Used by AI evaluation engine and test simulator)
                            </label>
                            <textarea
                              rows={3}
                              value={q.sample_pass_answer || ''}
                              onChange={(e) => handleQuestionChange(q.id, 'sample_pass_answer', e.target.value)}
                              placeholder="Provide the ideal production-grade answer..."
                              className="w-full text-xs app-input p-2.5 text-neutral-600 dark:text-neutral-400 font-mono text-[11px]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sticky Save Bar */}
          <div className="sticky bottom-4 z-20 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {isDirty ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>You have unsaved changes in &quot;{config.title}&quot;.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="w-4 h-4" />
                  <span>All settings and questions for &quot;{config.title}&quot; are live.</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={savingConfig}
                onClick={handleSaveConfig}
                className="btn-primary bg-blue-600 hover:bg-blue-700 text-white text-xs px-6 py-2.5 flex items-center gap-2 shadow-md shadow-blue-500/20 font-bold cursor-pointer disabled:opacity-50"
              >
                {savingConfig ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing Assessment...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Assessment Blueprint</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Answers Viewer Modal */}
      {selectedAnswers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="app-card max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-700 pb-3">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
                  Assessment Responses &bull; {selectedAnswers.candidateName}
                </h3>
                <span className="text-xs text-emerald-600 font-semibold">
                  Score: {selectedAnswers.score}%
                </span>
              </div>
              <button
                onClick={() => setSelectedAnswers(null)}
                className="text-neutral-400 hover:text-neutral-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {Object.entries(selectedAnswers.details.answers || {}).map(([key, val]) => (
                <div key={key} className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
                  <span className="font-bold text-neutral-700 dark:text-neutral-300 block mb-1">
                    {key}:
                  </span>
                  <p className="text-neutral-600 dark:text-neutral-400 font-mono text-[11px] whitespace-pre-wrap">
                    {String(val)}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedAnswers(null)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive AI Assessment Copilot Chat Drawer */}
      <AssessmentChatDrawer
        isOpen={showChatDrawer}
        onClose={() => setShowChatDrawer(false)}
        currentAssessment={config}
        onAddQuestions={handleCopilotAddQuestions}
        onReplaceQuestions={handleCopilotReplaceQuestions}
        onUpdateConfig={handleCopilotUpdateConfig}
      />

      {/* Create New Assessment Modal */}
      <NewAssessmentModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreate={handleCreateNewAssessment}
      />
    </div>
  );
}
