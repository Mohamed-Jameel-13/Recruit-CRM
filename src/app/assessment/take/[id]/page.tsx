import { db } from '@/lib/db/repository';
import { AssessmentClient } from './AssessmentClient';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TakeAssessmentPage({ params }: PageProps) {
  const { id } = await params;

  // Direct server-side data resolution: 0ms latency, no client-side loading spinners!
  const assignment = db.getAssessmentById(id);

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-800">
        <div className="p-8 rounded-2xl border border-slate-200 bg-white shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Assessment Session Not Found</h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              This assessment link may have expired or the token identifier <span className="font-mono text-slate-800 bg-slate-100 px-1 py-0.5 rounded">({id})</span> is invalid. Please contact your hiring coordinator for assistance.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Platform</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const application = db.getApplicationById(assignment.application_id);
  const candidate = application?.candidate || null;
  const job = application?.job || null;
  const rawConfig = db.getAssessmentConfig(assignment.config_id || job?.assessment_config_id || job?.title);

  const isSubmitted = assignment.status === 'PASSED' || assignment.status === 'FAILED';

  const initialData = {
    assessment: {
      id: assignment.id,
      isSubmitted,
      submittedAt: assignment.verified_at || assignment.updated_at || null,
    },
    candidate: candidate ? {
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email
    } : null,
    job: job ? {
      title: job.title,
      department: job.department
    } : null,
    config: {
      duration_minutes: rawConfig.duration_minutes || 45,
      // Sanitized questions: strict candidate privacy. Never expose correct answers, rubrics, or AI benchmarks.
      questions: (rawConfig.questions || []).map(q => ({
        id: q.id,
        type: q.type || 'subjective',
        title: q.title,
        category: q.category,
        description: q.description,
        points: q.points || 25,
        options: q.options || [],
        placeholder: q.placeholder || '',
        language: q.language || 'typescript',
        starter_code: q.starter_code || q.placeholder || '',
        test_cases: (q.test_cases || []).filter(tc => !tc.is_hidden),
        hints: q.hints || []
      }))
    }
  };

  return (
    <AssessmentClient 
      assignmentId={id} 
      initialData={initialData} 
    />
  );
}
