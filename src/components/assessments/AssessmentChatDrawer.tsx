'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  X, 
  Loader2, 
  Trash2, 
  CheckCircle2 
} from 'lucide-react';
import { AssessmentConfig, AssessmentQuestion } from '@/types/database';
import { useToast } from '@/components/ui/Toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: 'ADD_QUESTIONS' | 'REPLACE_ALL' | 'UPDATE_CONFIG' | 'NONE';
  questionCount?: number;
}

interface AssessmentChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentAssessment: AssessmentConfig;
  onAddQuestions: (questions: AssessmentQuestion[]) => void;
  onReplaceQuestions: (questions: AssessmentQuestion[]) => void;
  onUpdateConfig: (updates: Partial<AssessmentConfig>) => void;
}

const SUGGESTION_PROMPTS = [
  'Add 2 tricky MCQs on PostgreSQL locks & ACID concurrency',
  'Add a TypeScript coding challenge for an in-memory LRU Cache with TTL',
  'Add an architecture question on Kafka consumer group rebalances & DLQ',
  'Make questions more challenging for a Staff-level engineer',
  'Set time limit to 60 minutes and passing cutoff to 75%',
  'Add a Kubernetes zero-downtime deployment question'
];

export function AssessmentChatDrawer({
  isOpen,
  onClose,
  currentAssessment,
  onAddQuestions,
  onReplaceQuestions,
  onUpdateConfig
}: AssessmentChatDrawerProps) {
  const { toast } = useToast();
  const counterRef = useRef(1);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I am your AI Assessment Architect. Tell me what you need for **${currentAssessment.title || currentAssessment.role || 'this role'}** — you can ask me to generate MCQs, subjective system architecture scenarios, or hands-on coding challenges.`,
      timestamp: 'Just now',
      action: 'NONE'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  async function handleSendMessage(textToSend?: string) {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const nextId = `msg_${counterRef.current++}`;
    const userMsg: ChatMessage = {
      id: nextId,
      role: 'user',
      content: query,
      timestamp: 'Just now'
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/assessments/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history,
          currentAssessment
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process prompt');

      const action = data.action || 'NONE';
      const generatedQs = data.generatedQuestions || [];
      const configUpdates = data.configUpdates || {};

      if (action === 'ADD_QUESTIONS' && generatedQs.length > 0) {
        onAddQuestions(generatedQs);
        toast.success(`Added ${generatedQs.length} question(s) to the assessment challenge!`, 'Questions Added');
      } else if (action === 'REPLACE_ALL' && generatedQs.length > 0) {
        onReplaceQuestions(generatedQs);
        toast.success(`Replaced assessment questions with AI-generated suite!`, 'Assessment Updated');
      }

      if (action === 'UPDATE_CONFIG' || Object.keys(configUpdates).length > 0) {
        onUpdateConfig(configUpdates);
        toast.info('Assessment parameters updated.', 'Config Updated');
      }

      const assistantMsg: ChatMessage = {
        id: `msg_${counterRef.current++}`,
        role: 'assistant',
        content: data.reply || 'Changes have been applied to your assessment challenge.',
        timestamp: 'Just now',
        action,
        questionCount: generatedQs.length
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err), 'AI Copilot Error');
      setMessages(prev => [
        ...prev,
        {
          id: `msg_${counterRef.current++}`,
          role: 'assistant',
          content: 'Sorry, I encountered an issue evaluating that request. Please try again or rephrase.',
          timestamp: 'Just now',
          action: 'NONE'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleClearHistory() {
    setMessages([
      {
        id: 'welcome_cleared',
        role: 'assistant',
        content: `Chat history cleared. What questions or architectural scenarios would you like to design next?`,
        timestamp: 'Just now',
        action: 'NONE'
      }
    ]);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-white dark:bg-neutral-900 shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Assessment AI Copilot
              </h3>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
                Gemini 2.5
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 truncate max-w-[240px]">
              {currentAssessment.title || 'Role Assessment Studio'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Close Copilot"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                  isUser
                    ? 'bg-purple-600 text-white rounded-br-none shadow-sm'
                    : 'bg-neutral-100 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 rounded-bl-none border border-neutral-200 dark:border-neutral-700/60'
                }`}
              >
                {msg.content}

                {/* Badge if action occurred */}
                {msg.action && msg.action !== 'NONE' && (
                  <div className="mt-2 pt-2 border-t border-neutral-300 dark:border-neutral-700 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Applied to builder ({msg.questionCount || 0} questions updated)</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-neutral-400 px-1 mt-1">
                {msg.timestamp}
              </span>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-neutral-500 text-xs p-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800/50 w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
            <span>AI Copilot is synthesizing questions &amp; rubrics...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Prompt Pills */}
      <div className="px-4 py-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-1.5">
          Suggested Prompts:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {SUGGESTION_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={() => handleSendMessage(prompt)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors shrink-0 text-left"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Box */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type: 'Add 2 MCQs on Redis' or 'Create a coding challenge'..."
            disabled={isLoading}
            className="flex-1 app-input text-xs p-2.5 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:bg-white dark:focus:bg-neutral-900"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 transition-colors shadow-sm"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <p className="text-[10px] text-neutral-400 mt-1.5 text-center">
          Ask naturally. The Copilot adds questions of all types directly to your active challenge.
        </p>
      </div>
    </div>
  );
}
