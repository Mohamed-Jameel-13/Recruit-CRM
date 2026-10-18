import fs from 'fs';
import path from 'path';
import os from 'os';
import { createClient } from '@supabase/supabase-js';
// Force reload repository module
import { 
  Job, 
  Candidate, 
  CVDocument, 
  Application, 
  ScreeningRun, 
  AssessmentAssignment, 
  Interview, 
  AuditLog, 
  ImportBatch, 
  Interviewer,
  RetentionDeletionRequest,
  ScreeningCriteria,
  SentEmail,
  AssessmentConfig
} from '@/types/database';
import { dispatchRealSmtpEmail } from '@/lib/email/mailer';
import { generateMeetLink } from '@/lib/calendar/meet';

const DATA_DIR = path.resolve(process.cwd(), '.data');
const isTestEnv = typeof process !== 'undefined' && (!!process.env.VITEST || process.env.NODE_ENV === 'test');
const STORE_FILE = isTestEnv
  ? path.join(DATA_DIR, 'test_recruitment_store.json')
  : path.join(DATA_DIR, 'recruitment_store.json');
const TMP_STORE_FILE = path.join(os.tmpdir(), isTestEnv ? 'test_recruitment_store.json' : 'recruitai_recruitment_store.json');

export interface RecruitmentStore {
  jobs: Job[];
  criteria: ScreeningCriteria[];
  candidates: Candidate[];
  cv_documents: CVDocument[];
  applications: Application[];
  screening_runs: ScreeningRun[];
  assessment_assignments: AssessmentAssignment[];
  interviews: Interview[];
  interviewers: Interviewer[];
  import_batches: ImportBatch[];
  audit_logs: AuditLog[];
  retention_requests: RetentionDeletionRequest[];
  sent_emails: SentEmail[];
  assessment_config?: AssessmentConfig;
  assessment_configs: AssessmentConfig[];
}

// Initial baseline mock data matching seed.sql
const DEFAULT_CRITERIA: ScreeningCriteria = {
  id: 'd0000000-0000-0000-0000-000000000001',
  job_id: 'c0000000-0000-0000-0000-000000000001',
  min_years_experience: 4,
  required_skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'React', 'Docker', 'System Architecture'],
  preferred_skills: ['GraphQL', 'Redis', 'Next.js', 'Kubernetes', 'AWS', 'CI/CD'],
  required_education: 'Bachelor in Computer Science or equivalent practical experience',
  semantic_equivalence_rules: [
    {
      source: 'MySQL',
      target: 'PostgreSQL',
      relationship: 'relational_db_family',
      weight: 0.95,
      explanation: 'Deep MySQL indexing & ACID knowledge translates seamlessly to PostgreSQL'
    },
    {
      source: 'FastAPI',
      target: 'Node.js',
      relationship: 'backend_api_architecture',
      weight: 0.85,
      explanation: 'REST/async backend concepts apply across Node and Python stacks'
    },
    {
      source: 'Vue.js',
      target: 'React',
      relationship: 'reactive_component_framework',
      weight: 0.90,
      explanation: 'SPA state management and component lifecycle easily transfer to React'
    },
    {
      source: 'Kubernetes',
      target: 'Docker',
      relationship: 'container_orchestration',
      weight: 1.00,
      explanation: 'Kubernetes implies containerization competency'
    },
    {
      source: 'MongoDB',
      target: 'PostgreSQL',
      relationship: 'data_persistence',
      weight: 0.75,
      explanation: 'Database modeling experience provides partial credit for data persistence'
    }
  ],
  scoring_weights: {
    skills: 40,
    experience: 30,
    education: 15,
    domain: 15
  },
  pass_threshold_score: 65,
  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const DEFAULT_ASSESSMENT_CONFIGS: AssessmentConfig[] = [
  {
    id: 'cfg-fullstack',
    role: 'Senior Full-Stack Cloud Engineer',
    mode: 'INBUILT',
    external_url: '',
    title: 'Senior Full-Stack Cloud Competency Challenge',
    description: 'Evaluates microservice architecture, PostgreSQL locking, Kubernetes rolling rollouts, and distributed rate limiting.',
    duration_minutes: 45,
    pass_threshold_percentage: 70,
    calendly_link: 'https://calendly.com',
    anti_cheat_enabled: true,
    webcam_required: false,
    screen_share_required: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    questions: [
      {
        id: 'q_fs_1',
        type: 'mcq',
        title: 'System Architecture & Idempotency',
        category: 'Architecture',
        description: 'Which pattern ensures zero dropped messages and idempotent processing in an API gateway handling 10,000 req/sec webhooks?',
        points: 25,
        options: [
          'A) Store transactions in a local in-memory array and flush to database every hour',
          'B) Compute SHA-256 payload hash as idempotency key, cache in Redis with TTL, and process via partitioned Kafka consumer groups with DLQ',
          'C) Rely solely on auto-incrementing database primary keys with client-side retry disabled',
          'D) Write directly to PostgreSQL with synchronous disk fsync on every HTTP request'
        ],
        correct_option_index: 1,
        explanation: 'SHA-256 payload hashing provides deterministic request identification. Coupled with Redis TTL caching for sub-millisecond deduplication and Kafka partitioned consumer groups with dead-letter queue (DLQ) retry backoff, this pattern guarantees zero message loss and true idempotency at scale.'
      },
      {
        id: 'q_fs_2',
        type: 'mcq',
        title: 'Database Concurrency & ACID Locking',
        category: 'Database',
        description: 'In a high-concurrency ledger service, which PostgreSQL strategy effectively eliminates race conditions and phantom reads without blocking read queries?',
        points: 25,
        options: [
          'A) Execute raw queries inside an application-level mutex lock across all server instances',
          'B) Increase max_connections to 5,000 in postgresql.conf without modifying isolation levels',
          'C) Utilize PostgreSQL REPEATABLE READ isolation or explicit SELECT FOR UPDATE row-level locking within atomic ACID transactions',
          'D) Switch the database engine to READ UNCOMMITTED to allow non-blocking dirty reads'
        ],
        correct_option_index: 2,
        explanation: 'REPEATABLE READ guarantees that all queries within the transaction view data from the same snapshot. SELECT FOR UPDATE acquires an exclusive row-level lock on the targeted balance rows without blocking concurrent read-only queries.'
      },
      {
        id: 'q_fs_3',
        type: 'mcq',
        title: 'Kubernetes Resiliency & Zero-Downtime Rollouts',
        category: 'DevOps',
        description: 'How do you guarantee continuous 100% capacity and zero dropped in-flight requests during rolling deployments in Kubernetes?',
        points: 25,
        options: [
          'A) Configure rollingUpdate with maxSurge: 25%, maxUnavailable: 0, HTTP readiness probes, and graceful SIGTERM preStop hooks',
          'B) Terminate all existing pods at once to prevent version skew across microservices',
          'C) Deploy all pods onto a single node to avoid inter-node networking overhead',
          'D) Disable health check probes during deployments to prevent premature pod restarts'
        ],
        correct_option_index: 0,
        explanation: 'Setting maxUnavailable: 0 ensures that Kubernetes never terminates existing pods until new pods pass their readiness probes. PreStop hooks allow in-flight HTTP connections to complete before SIGKILL.'
      },
      {
        id: 'q_fs_4',
        type: 'subjective',
        title: 'Distributed Rate Limiter & Token Bucket Architecture',
        category: 'Architecture',
        description: 'Design a distributed rate limiter protecting microservices from DDoS and noisy neighbors. Explain the data structures (e.g. Redis ZSET or sliding window), how you prevent race conditions, what headers you return (RFC 6585), and your fail-open/fail-closed strategy if Redis encounters network partitioning.',
        points: 25,
        placeholder: 'Explain Redis sliding window / token bucket, atomic Lua scripts, standard HTTP headers (429, Retry-After), and fallback resilience...',
        rubric: 'Candidate must specify: (1) Redis sorted sets or token bucket with atomic Lua scripts to prevent race conditions; (2) HTTP 429 status code with X-RateLimit-Limit, X-RateLimit-Remaining, and Retry-After headers; (3) Fallback strategy such as local in-memory token bucket or fail-open with alerting during Redis partition.',
        sample_pass_answer: 'We implement a sliding window log counter using Redis with atomic Lua scripting. Each incoming request records the current timestamp in a Redis sorted set (ZSET) keyed by client IP or API token. The Lua script trims timestamps older than (now - window_size), checks ZCARD against the allowed threshold, and if under limit, adds the timestamp with an EXPIRE TTL. If exceeded, it immediately responds with HTTP 429 Too Many Requests including RFC headers: X-RateLimit-Limit, X-RateLimit-Remaining: 0, and Retry-After. If Redis is temporarily unreachable, we fail-open with local in-memory token buckets to maintain service availability while alerting SREs.',
        sample_fail_answer: 'I would just increment a variable in the Node.js server memory and restart the server if it gets too high.'
      }
    ]
  },
  {
    id: 'cfg-backend',
    role: 'Senior Backend Systems Engineer',
    mode: 'INBUILT',
    external_url: '',
    title: 'Distributed Systems & Backend Engineering Challenge',
    description: 'High-scale backend evaluation covering Kafka event streams, database sharding/isolation, and high-throughput cache concurrency.',
    duration_minutes: 60,
    pass_threshold_percentage: 75,
    calendly_link: 'https://calendly.com',
    anti_cheat_enabled: true,
    webcam_required: false,
    screen_share_required: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    questions: [
      {
        id: 'q_be_1',
        type: 'mcq',
        title: 'Kafka Partition Rebalance & Consumer Lag',
        category: 'Distributed Systems',
        description: 'In an event-driven system with 64 Kafka partitions, how do you eliminate stop-the-world partition rebalances during rolling container restarts?',
        points: 25,
        options: [
          'A) Set partition.assignment.strategy to CooperativeStickyAssignor and configure static membership using group.instance.id',
          'B) Decrease session.timeout.ms to 100 milliseconds across all consumers',
          'C) Route all 64 partitions to a single consumer instance without consumer groups',
          'D) Disable auto-commit and commit offsets synchronously after every individual message'
        ],
        correct_option_index: 0,
        explanation: 'CooperativeStickyAssignor implements incremental cooperative rebalancing, allowing unaffected consumers to continue processing while migrating partitions. Static membership (group.instance.id) prevents rebalancing altogether if a restarted pod returns within session timeout.'
      },
      {
        id: 'q_be_2',
        type: 'mcq',
        title: 'Database Sharding & Cross-Shard Distributed Transactions',
        category: 'Database Architecture',
        description: 'When sharding an orders database across multiple PostgreSQL instances, how do you handle cross-shard atomic transfers without 2-Phase Commit (2PC) bottlenecks?',
        points: 25,
        options: [
          'A) Implement the Saga pattern with compensating transactions and transactional outbox table publishing events via CDC',
          'B) Execute synchronous distributed deadlocks using client-side sleep timers',
          'C) Place all database tables in a single unindexed foreign table wrapper (postgres_fdw)',
          'D) Disable ACID isolation and let eventual consistency overwrite conflicting ledger records'
        ],
        correct_option_index: 0,
        explanation: 'The Saga pattern breaks distributed transactions into local ACID transactions coordinated via events or orchestration. The Transactional Outbox pattern guarantees reliable event publishing via Change Data Capture (CDC).'
      },
      {
        id: 'q_be_3',
        type: 'coding',
        title: 'In-Memory Sliding Window Rate Limiter',
        category: 'Coding & Algorithms',
        description: 'Implement a sliding window rate limiter class in TypeScript/JavaScript. The class should take `maxRequests` and `windowSizeMs` in its constructor, and provide an `allowRequest(clientId: string): boolean` method that tracks timestamps in O(1) or O(N) where N is requests within the current window.',
        points: 25,
        language: 'typescript',
        starter_code: `class SlidingWindowRateLimiter {\n  private maxRequests: number;\n  private windowSizeMs: number;\n  private clientLogs: Map<string, number[]>;\n\n  constructor(maxRequests: number, windowSizeMs: number) {\n    this.maxRequests = maxRequests;\n    this.windowSizeMs = windowSizeMs;\n    this.clientLogs = new Map();\n  }\n\n  allowRequest(clientId: string): boolean {\n    const now = Date.now();\n    // TODO: Clean up expired timestamps and evaluate allowance\n    return true;\n  }\n}`,
        test_cases: [
          { input: 'maxRequests: 3, windowSizeMs: 1000, 3 rapid calls', expected_output: 'true, true, true', description: 'Allows requests under the limit' },
          { input: 'maxRequests: 3, windowSizeMs: 1000, 4th immediate call', expected_output: 'false', description: 'Blocks request exceeding limit' }
        ],
        rubric: 'Must correctly prune timestamps older than (now - windowSizeMs), reject when count >= maxRequests, and add current timestamp when permitted.',
        sample_pass_answer: `class SlidingWindowRateLimiter {\n  private maxRequests: number;\n  private windowSizeMs: number;\n  private clientLogs: Map<string, number[]>;\n\n  constructor(maxRequests: number, windowSizeMs: number) {\n    this.maxRequests = maxRequests;\n    this.windowSizeMs = windowSizeMs;\n    this.clientLogs = new Map();\n  }\n\n  allowRequest(clientId: string): boolean {\n    const now = Date.now();\n    const windowStart = now - this.windowSizeMs;\n    let timestamps = this.clientLogs.get(clientId) || [];\n    timestamps = timestamps.filter(ts => ts > windowStart);\n\n    if (timestamps.length >= this.maxRequests) {\n      this.clientLogs.set(clientId, timestamps);\n      return false;\n    }\n\n    timestamps.push(now);\n    this.clientLogs.set(clientId, timestamps);\n    return true;\n  }\n}`
      },
      {
        id: 'q_be_4',
        type: 'subjective',
        title: 'Global Distributed Session & Cache Synchronization',
        category: 'System Design',
        description: 'Design a globally distributed session store across US-East, EU-Central, and AP-Southeast regions with sub-50ms latency and high availability. Detail conflict resolution, caching layers, and how you prevent cache stampedes (dog-piling).',
        points: 25,
        placeholder: 'Detail regional Redis clusters, active-active replication (CRDTs), JWT stateless authentication vs stateful tokens, probabilistic early expiration (XFetch)...',
        rubric: 'Must cover: (1) Regional edge caching / active-active Redis with Conflict-free Replicated Data Types (CRDTs) or centralized master with local read replicas; (2) Cache stampede prevention (mutex locking, singleflight, or probabilistic early recomputation / XFetch); (3) Token invalidation propagation via Redis Pub/Sub or Kafka.',
        sample_pass_answer: 'We employ a hybrid architecture using short-lived asymmetric JWTs (15 min) for stateless regional verification, backed by regional Redis clusters with active-active replication using CRDTs for revocation lists and session metadata. To prevent cache stampedes under heavy traffic, we implement the XFetch probabilistic early expiration algorithm (optimal early recomputation before TTL expires) and singleflight deduplication on cache misses.'
      }
    ]
  },
  {
    id: 'cfg-devops',
    role: 'DevOps & SRE Specialist',
    mode: 'INBUILT',
    external_url: '',
    title: 'Cloud Infrastructure & SRE Technical Challenge',
    description: 'Production infrastructure assessment covering Kubernetes topology spread, zero-downtime Canary deployments, and Terraform drift.',
    duration_minutes: 45,
    pass_threshold_percentage: 70,
    calendly_link: 'https://calendly.com',
    anti_cheat_enabled: true,
    webcam_required: false,
    screen_share_required: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    questions: [
      {
        id: 'q_do_1',
        type: 'mcq',
        title: 'Kubernetes Pod Disruption Budgets & Drain Grace',
        category: 'Kubernetes',
        description: 'When performing a node pool rolling upgrade in production, how do you prevent simultaneous outage of stateful Kafka pods during `kubectl drain`?',
        points: 25,
        options: [
          'A) Define PodDisruptionBudget with maxUnavailable: 1 and configure topologySpreadConstraints across zone topology keys',
          'B) Use --force --ignore-daemonsets on kubectl drain without preStop hooks',
          'C) Increase replica count to 100 on each single node',
          'D) Delete all PVCs prior to draining to speed up unmounting'
        ],
        correct_option_index: 0,
        explanation: 'A PodDisruptionBudget (PDB) with maxUnavailable: 1 guarantees the eviction API will block if more than 1 pod is unavailable, preventing quorum loss in quorum-based clusters like Kafka or etcd.'
      },
      {
        id: 'q_do_2',
        type: 'mcq',
        title: 'Terraform State Locking & CI/CD Concurrency',
        category: 'Infrastructure as Code',
        description: 'In an automated CI/CD pipeline running multiple concurrent git commits, what mechanism prevents corrupting shared Terraform state?',
        points: 25,
        options: [
          'A) Remote backend with state locking (e.g., AWS S3 with DynamoDB lock table or Terraform Cloud state lock)',
          'B) Storing terraform.tfstate in the git repository with auto-merge enabled',
          'C) Disabling state files completely using terraform -refresh=false',
          'D) Running terraform apply simultaneously on all developer laptops'
        ],
        correct_option_index: 0,
        explanation: 'Remote backend locking (such as DynamoDB lock table on S3 or native backend lock) creates an atomic mutex on state file operations, rejecting conflicting runs with lock errors.'
      },
      {
        id: 'q_do_3',
        type: 'coding',
        title: 'Resilient Exponential Backoff with Full Jitter',
        category: 'Reliability Engineering',
        description: 'Implement a resilient retry function `retryWithBackoff<T>(fn: () => Promise<T>, maxRetries: number, baseDelayMs: number, maxDelayMs: number): Promise<T>` using Exponential Backoff with Full Jitter (AWS Architecture recommendation) to prevent retry storms against downstream APIs.',
        points: 25,
        language: 'typescript',
        starter_code: `async function retryWithBackoff<T>(\n  fn: () => Promise<T>,\n  maxRetries: number = 3,\n  baseDelayMs: number = 100,\n  maxDelayMs: number = 2000\n): Promise<T> {\n  // TODO: Implement exponential backoff with full jitter\n  return fn();\n}`,
        test_cases: [
          { input: 'fn resolves immediately', expected_output: 'resolves value without retry', description: 'Immediate success' },
          { input: 'fn fails twice then succeeds', expected_output: 'resolves value after 2 retries with jitter delay', description: 'Recovers on retry' }
        ],
        rubric: 'Must calculate delay = Math.random() * Math.min(maxDelayMs, baseDelayMs * 2 ** attempt), wait using setTimeout promise, and retry up to maxRetries.',
        sample_pass_answer: `async function retryWithBackoff<T>(\n  fn: () => Promise<T>,\n  maxRetries: number = 3,\n  baseDelayMs: number = 100,\n  maxDelayMs: number = 2000\n): Promise<T> {\n  let attempt = 0;\n  while (true) {\n    try {\n      return await fn();\n    } catch (err) {\n      if (attempt >= maxRetries) throw err;\n      const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));\n      const jitterDelay = Math.random() * expDelay;\n      await new Promise(resolve => setTimeout(resolve, jitterDelay));\n      attempt++;\n    }\n  }\n}`
      },
      {
        id: 'q_do_4',
        type: 'subjective',
        title: 'Multi-Region Disaster Recovery & Automated Failover',
        category: 'Disaster Recovery',
        description: 'Architect an automated Active-Active multi-region disaster recovery strategy across AWS us-east-1 and eu-west-1. Detail DNS routing, health checks, database cross-region replication latency, and split-brain mitigation.',
        points: 25,
        placeholder: 'Detail Route 53 latency/failover routing, Aurora Global Database, continuous synthetic probes, and quorum-based split-brain fencing...',
        rubric: 'Candidate must specify: (1) Route 53 health checks with latency or failover policies; (2) Cross-region storage (Aurora Global Database / DynamoDB Global Tables) with RPO/RTO metrics; (3) Fencing tokens / consensus to prevent split-brain writes during partition.',
        sample_pass_answer: 'We deploy an active-active topology across us-east-1 and eu-west-1 using Route 53 latency routing with automated health checks and CloudWatch synthetic canaries. For data persistence, we utilize Aurora Global Database with sub-second replication latency (RPO < 1s, RTO < 1 min). In the event of regional impairment, Route 53 automatically flips DNS traffic to the healthy region, and an automated Lambda step function promotes the replica cluster while applying fencing tokens to prevent split-brain writes.'
      }
    ]
  }
];

const DEFAULT_ASSESSMENT_CONFIG: AssessmentConfig = DEFAULT_ASSESSMENT_CONFIGS[0];

const DEFAULT_JOB: Job = {
  id: 'c0000000-0000-0000-0000-000000000001',
  organization_id: 'a0000000-0000-0000-0000-000000000001',
  title: 'Senior Full-Stack Cloud Engineer',
  department: 'Platform Engineering',
  location: 'Remote (Global)',
  employment_type: 'Full-Time',
  description: 'We are seeking an experienced Full-Stack Cloud Engineer to design scalable microservices and resilient web applications. The ideal candidate has deep expertise in TypeScript, Node.js, modern relational databases (PostgreSQL or equivalent enterprise SQL), modern frontend frameworks (React/Next.js), containerization (Docker), and cloud system architecture.',
  status: 'active',
  version: 1,
  created_by: 'b0000000-0000-0000-0000-000000000001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  criteria: DEFAULT_CRITERIA
};

const DEFAULT_INTERVIEWER: Interviewer = {
  id: 'e0000000-0000-0000-0000-000000000001',
  organization_id: 'a0000000-0000-0000-0000-000000000001',
  name: 'Sarah Connor',
  email: 'sarah.connor@acme.example.com',
  timezone: 'America/New_York',
  active: true,
  created_at: new Date().toISOString()
};

let memoryStore: RecruitmentStore | null = null;
let lastStoreMtime: number = 0;

export function ensureStoreCollections(store: RecruitmentStore): RecruitmentStore {
  if (!store) return store;
  if (!Array.isArray(store.jobs) || store.jobs.length === 0) store.jobs = [DEFAULT_JOB];
  if (!Array.isArray(store.criteria) || store.criteria.length === 0) store.criteria = [DEFAULT_CRITERIA];
  if (!Array.isArray(store.candidates)) store.candidates = [];
  if (!Array.isArray(store.cv_documents)) store.cv_documents = [];
  if (!Array.isArray(store.applications)) store.applications = [];
  if (!Array.isArray(store.screening_runs)) store.screening_runs = [];
  if (!Array.isArray(store.assessment_assignments)) store.assessment_assignments = [];
  if (!Array.isArray(store.interviews)) store.interviews = [];
  if (!Array.isArray(store.interviewers) || store.interviewers.length === 0) store.interviewers = [DEFAULT_INTERVIEWER];
  if (!Array.isArray(store.import_batches)) store.import_batches = [];
  if (!Array.isArray(store.audit_logs)) store.audit_logs = [];
  if (!Array.isArray(store.retention_requests)) store.retention_requests = [];
  if (!Array.isArray(store.sent_emails)) store.sent_emails = [];
  if (!Array.isArray(store.assessment_configs) || store.assessment_configs.length === 0) {
    store.assessment_configs = JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_CONFIGS));
  }
  if (!store.assessment_config) {
    store.assessment_config = store.assessment_configs[0];
  }
  for (const job of store.jobs) {
    if (!job.criteria) {
      const matched = store.criteria.find(c => c.job_id === job.id);
      job.criteria = matched || DEFAULT_CRITERIA;
    }
  }
  return store;
}

let cloudStoreHydrated = false;
let dbBucketEnsured = false;

async function ensureDbStorageBucket(supabase: any): Promise<boolean> {
  if (dbBucketEnsured) return true;
  try {
    const { error } = await supabase.storage.createBucket('system_config', { public: false });
    if (!error || error.statusCode === '409' || (error as any).code === 'BucketAlreadyExists' || error.message?.includes('already exists')) {
      dbBucketEnsured = true;
      return true;
    }
  } catch {}
  return true;
}

export async function hydrateStoreFromSupabase(forceRefresh: boolean = false): Promise<RecruitmentStore | null> {
  if (isTestEnv) return memoryStore;
  if (cloudStoreHydrated && !forceRefresh && memoryStore) {
    return memoryStore;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return memoryStore;
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.storage.from('system_config').download('recruitment_store.json');
    if (!error && data) {
      const text = await data.text();
      if (text && text.trim()) {
        const parsed = JSON.parse(text);
        if (parsed.jobs && Array.isArray(parsed.jobs)) {
          memoryStore = ensureStoreCollections(parsed);
          cloudStoreHydrated = true;
          try { fs.writeFileSync(TMP_STORE_FILE, JSON.stringify(memoryStore, null, 2), 'utf-8'); } catch {}
          return memoryStore;
        }
      }
    } else if (error) {
      console.warn('Notice: Supabase download recruitment_store.json:', error.message);
    }
  } catch (err) {
    console.warn('Notice: Could not hydrate from Supabase Storage:', err);
  }
  return memoryStore;
}

export async function syncStoreToSupabase(store: RecruitmentStore): Promise<boolean> {
  if (isTestEnv) return true;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    await ensureDbStorageBucket(supabase);

    // Merge remote state to prevent cross-container overwrites in serverless
    try {
      const { data: remoteData } = await supabase.storage.from('system_config').download('recruitment_store.json');
      if (remoteData) {
        const remoteText = await remoteData.text();
        if (remoteText && remoteText.trim()) {
          const remoteStore = JSON.parse(remoteText);
          if (remoteStore && Array.isArray(remoteStore.jobs)) {
            // Merge assignments
            if (Array.isArray(remoteStore.assessment_assignments)) {
              for (const a of remoteStore.assessment_assignments) {
                const existingIdx = store.assessment_assignments.findIndex(x => x.id === a.id);
                if (existingIdx === -1) {
                  store.assessment_assignments.push(a);
                } else if (a.status === 'PASSED' || a.status === 'FAILED' || typeof a.percentage_score === 'number' || typeof a.score === 'number') {
                  store.assessment_assignments[existingIdx] = {
                    ...store.assessment_assignments[existingIdx],
                    ...a
                  };
                }
              }
            }
            // Merge candidates
            if (Array.isArray(remoteStore.candidates)) {
              for (const c of remoteStore.candidates) {
                if (!store.candidates.some(x => x.id === c.id)) {
                  store.candidates.push(c);
                }
              }
            }
            // Merge applications
            if (Array.isArray(remoteStore.applications)) {
              for (const app of remoteStore.applications) {
                const existingIdx = store.applications.findIndex(x => x.id === app.id);
                if (existingIdx === -1) {
                  store.applications.push(app);
                } else {
                  if (typeof app.assessment_score === 'number') {
                    store.applications[existingIdx].assessment_score = app.assessment_score;
                  }
                  if (app.assessment_status && app.assessment_status !== 'NOT_STARTED') {
                    store.applications[existingIdx].assessment_status = app.assessment_status;
                  }
                  if (app.stage === 'INTERVIEW' || app.stage === 'OFFER' || app.stage === 'HIRED') {
                    store.applications[existingIdx].stage = app.stage;
                  } else if (app.stage === 'ASSESSMENT' && store.applications[existingIdx].stage === 'SCREENING') {
                    store.applications[existingIdx].stage = app.stage;
                  }
                }
              }
            }
            // Merge screening runs
            if (Array.isArray(remoteStore.screening_runs)) {
              if (!Array.isArray(store.screening_runs)) store.screening_runs = [];
              for (const s of remoteStore.screening_runs) {
                if (!store.screening_runs.some(x => x.id === s.id)) {
                  store.screening_runs.push(s);
                }
              }
            }
            // Merge sent emails
            if (Array.isArray(remoteStore.sent_emails)) {
              for (const e of remoteStore.sent_emails) {
                if (!store.sent_emails.some(x => x.id === e.id)) {
                  store.sent_emails.push(e);
                }
              }
            }
            // Merge interviews
            if (Array.isArray(remoteStore.interviews)) {
              for (const i of remoteStore.interviews) {
                if (!store.interviews.some(x => x.id === i.id)) {
                  store.interviews.push(i);
                }
              }
            }
          }
        }
      }
    } catch {}

    const { error } = await supabase.storage.from('system_config').upload('recruitment_store.json', JSON.stringify(store, null, 2), {
      contentType: 'application/json',
      upsert: true
    });
    if (error) {
      console.warn('Failed uploading recruitment_store.json to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Notice: Exception during syncStoreToSupabase:', err);
    return false;
  }
}

function getStore(): RecruitmentStore {
  // Check primary local store file
  try {
    if (fs.existsSync(STORE_FILE)) {
      const stats = fs.statSync(STORE_FILE);
      if (!memoryStore || stats.mtimeMs > lastStoreMtime) {
        const data = fs.readFileSync(STORE_FILE, 'utf-8');
        if (data && data.trim()) {
          memoryStore = ensureStoreCollections(JSON.parse(data));
          lastStoreMtime = stats.mtimeMs;
          return memoryStore;
        }
      } else {
        return ensureStoreCollections(memoryStore);
      }
    }
  } catch {
    // try fallback
  }

  // Check serverless /tmp store fallback
  try {
    if (fs.existsSync(TMP_STORE_FILE)) {
      const data = fs.readFileSync(TMP_STORE_FILE, 'utf-8');
      if (data && data.trim()) {
        const parsed = JSON.parse(data);
        if (parsed.jobs && Array.isArray(parsed.jobs)) {
          memoryStore = ensureStoreCollections(parsed);
          return memoryStore;
        }
      }
    }
  } catch {}

  if (memoryStore) {
    return ensureStoreCollections(memoryStore);
  }

  // Trigger cloud hydration for serverless cold-starts
  if (!cloudStoreHydrated && !isTestEnv) {
    hydrateStoreFromSupabase().catch(() => {});
  }

  // Initialize fresh store
  const initialStore: RecruitmentStore = {
    jobs: [DEFAULT_JOB],
    criteria: [DEFAULT_CRITERIA],
    candidates: [],
    cv_documents: [],
    applications: [],
    screening_runs: [],
    assessment_assignments: [],
    interviews: [],
    interviewers: [DEFAULT_INTERVIEWER],
    import_batches: [],
    audit_logs: [
      {
        id: 'log-001',
        organization_id: 'a0000000-0000-0000-0000-000000000001',
        user_name: 'System Admin',
        entity_type: 'job',
        entity_id: DEFAULT_JOB.id,
        action: 'CREATE',
        details: { title: DEFAULT_JOB.title },
        created_at: new Date().toISOString()
      }
    ],
    retention_requests: [],
    sent_emails: [],
    assessment_config: { ...DEFAULT_ASSESSMENT_CONFIG },
    assessment_configs: JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_CONFIGS))
  };

  memoryStore = ensureStoreCollections(initialStore);
  // Write locally only; DO NOT overwrite Supabase with empty initialStore on cold start
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(initialStore, null, 2), 'utf-8');
  } catch {}
  try {
    fs.writeFileSync(TMP_STORE_FILE, JSON.stringify(initialStore, null, 2), 'utf-8');
  } catch {}

  return initialStore;
}

function saveStore(store: RecruitmentStore): void {
  ensureStoreCollections(store);
  memoryStore = store;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = path.join(DATA_DIR, `tmp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(store, null, 2), 'utf-8');
    try {
      fs.renameSync(tempFile, STORE_FILE);
    } catch {
      // On Windows rename can fail if open, copy instead
      fs.copyFileSync(tempFile, STORE_FILE);
      try { fs.unlinkSync(tempFile); } catch {}
    }
    try {
      lastStoreMtime = fs.statSync(STORE_FILE).mtimeMs;
    } catch {}
  } catch {
    // Read-only filesystem in serverless
  }

  // Always write to tmp as serverless instance fallback
  try {
    fs.writeFileSync(TMP_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch {}

  // Sync to Supabase Storage in cloud
  if (!isTestEnv) {
    syncStoreToSupabase(store).catch((err) => console.warn('Background sync to Supabase warning:', err));
  }
}

export const db = {
  // Ensure the cloud store is hydrated before reading/writing in serverless
  async ensureHydrated(forceRefresh: boolean = false): Promise<RecruitmentStore> {
    await hydrateStoreFromSupabase(forceRefresh);
    return getStore();
  },

  // Explicitly persist and await storage commit to Supabase in serverless before returning API responses
  async persistStoreAsync(): Promise<boolean> {
    const store = getStore();
    return await syncStoreToSupabase(store);
  },
  // Jobs
  resetData(keepBaseJob: boolean = true): RecruitmentStore {
    const resetStore: RecruitmentStore = {
      jobs: keepBaseJob ? [DEFAULT_JOB] : [],
      criteria: keepBaseJob ? [DEFAULT_CRITERIA] : [],
      candidates: [],
      cv_documents: [],
      applications: [],
      screening_runs: [],
      assessment_assignments: [],
      interviews: [],
      interviewers: [DEFAULT_INTERVIEWER],
      import_batches: [],
      audit_logs: [
        {
          id: 'log-clean-' + Date.now(),
          organization_id: 'a0000000-0000-0000-0000-000000000001',
          user_name: 'System Admin',
          entity_type: 'job',
          entity_id: keepBaseJob ? DEFAULT_JOB.id : 'clean-slate',
          action: 'CREATE',
          details: { message: 'Initialized clean database state ready for user testing' },
          created_at: new Date().toISOString()
        }
      ],
      retention_requests: [],
      sent_emails: [],
      assessment_config: { ...DEFAULT_ASSESSMENT_CONFIG },
      assessment_configs: JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_CONFIGS))
    };

    saveStore(resetStore);
    return resetStore;
  },

  getJobs(): Job[] {
    const store = getStore();
    return store.jobs.map(job => {
      const criteria = store.criteria.find(c => c.job_id === job.id) || store.criteria[0] || DEFAULT_CRITERIA;
      return { ...job, criteria };
    });
  },

  getJobById(id: string): Job | null {
    const store = getStore();
    const job = store.jobs.find(j => j.id === id);
    if (!job) return null;
    const criteria = store.criteria.find(c => c.job_id === job.id) || store.criteria[0] || DEFAULT_CRITERIA;
    return { ...job, criteria };
  },

  createJob(jobData: Omit<Job, 'id' | 'created_at' | 'updated_at' | 'version'>, criteriaData?: Partial<ScreeningCriteria>): Job {
    const store = getStore();
    const id = 'job-' + Date.now();
    const newJob: Job = {
      ...jobData,
      id,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.jobs.push(newJob);

    const newCriteria: ScreeningCriteria = {
      id: 'crit-' + Date.now(),
      job_id: id,
      min_years_experience: criteriaData?.min_years_experience ?? 3,
      required_skills: (criteriaData?.required_skills && criteriaData.required_skills.length > 0)
        ? criteriaData.required_skills
        : DEFAULT_CRITERIA.required_skills,
      preferred_skills: criteriaData?.preferred_skills ?? DEFAULT_CRITERIA.preferred_skills,
      required_education: criteriaData?.required_education ?? DEFAULT_CRITERIA.required_education,
      semantic_equivalence_rules: criteriaData?.semantic_equivalence_rules ?? DEFAULT_CRITERIA.semantic_equivalence_rules,
      scoring_weights: criteriaData?.scoring_weights ?? { skills: 40, experience: 30, education: 15, domain: 15 },
      pass_threshold_score: criteriaData?.pass_threshold_score ?? 65,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.criteria.push(newCriteria);
    newJob.criteria = newCriteria;

    db.addAuditLog({
      organization_id: newJob.organization_id,
      entity_type: 'job',
      entity_id: newJob.id,
      action: 'CREATE',
      details: { title: newJob.title }
    });

    saveStore(store);
    return newJob;
  },

  updateJob(id: string, updates: Partial<Job>, criteriaUpdates?: Partial<ScreeningCriteria>): Job | null {
    const store = getStore();
    const index = store.jobs.findIndex(j => j.id === id);
    if (index === -1) return null;

    store.jobs[index] = {
      ...store.jobs[index],
      ...updates,
      version: store.jobs[index].version + 1,
      updated_at: new Date().toISOString()
    };

    if (criteriaUpdates) {
      const critIndex = store.criteria.findIndex(c => c.job_id === id);
      if (critIndex !== -1) {
        store.criteria[critIndex] = {
          ...store.criteria[critIndex],
          ...criteriaUpdates,
          version: store.criteria[critIndex].version + 1,
          updated_at: new Date().toISOString()
        };
      }
    }

    saveStore(store);
    return db.getJobById(id);
  },

  deleteJob(id: string): boolean {
    const store = getStore();
    const index = store.jobs.findIndex(j => j.id === id);
    if (index === -1) return false;
    store.jobs.splice(index, 1);
    store.criteria = store.criteria.filter(c => c.job_id !== id);
    saveStore(store);
    return true;
  },

  getCriteria(): ScreeningCriteria[] {
    return getStore().criteria;
  },

  getCriteriaByJobId(jobId: string): ScreeningCriteria | null {
    const store = getStore();
    return store.criteria.find(c => c.job_id === jobId) || null;
  },

  // Candidates & Applications
  getCandidates(): Candidate[] {
    return getStore().candidates;
  },

  getCandidateById(id: string): Candidate | null {
    return getStore().candidates.find(c => c.id === id) || null;
  },

  getApplications(filter?: { jobId?: string; stage?: string; screeningStatus?: string }): Application[] {
    const store = getStore();
    let apps = store.applications;

    if (filter?.jobId) {
      apps = apps.filter(a => a.job_id === filter.jobId);
    }
    if (filter?.stage) {
      apps = apps.filter(a => a.stage === filter.stage);
    }
    if (filter?.screeningStatus) {
      apps = apps.filter(a => a.screening_status === filter.screeningStatus);
    }

    return apps.map(app => {
      const candidate = store.candidates.find(c => c.id === app.candidate_id);
      const jobRaw = store.jobs.find(j => j.id === app.job_id) || store.jobs[0] || DEFAULT_JOB;
      const criteria = store.criteria.find(c => c.job_id === jobRaw.id) || store.criteria[0] || DEFAULT_CRITERIA;
      const job = { ...jobRaw, criteria };
      const cv_document = store.cv_documents.find(d => d.id === app.cv_document_id);
      const latest_screening = store.screening_runs
        .filter(s => s.application_id === app.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      const assessment_assignment = store.assessment_assignments.find(a => a.application_id === app.id);
      const interview = store.interviews.find(i => i.application_id === app.id);

      return {
        ...app,
        candidate,
        job,
        cv_document,
        latest_screening,
        assessment_assignment,
        interview
      };
    });
  },

  getApplicationById(id: string): Application | null {
    const apps = db.getApplications();
    return apps.find(a => a.id === id) || null;
  },

  createApplicationWithCandidate(data: {
    jobId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    location?: string;
    cvDocId?: string;
    batchId?: string;
  }): { candidate: Candidate; application: Application } {
    const store = getStore();

    // Check existing candidate by email
    let candidate = store.candidates.find(c => c.email.toLowerCase() === data.email.toLowerCase());
    if (!candidate) {
      const cleanFirst = data.firstName 
        ? data.firstName.trim().charAt(0).toUpperCase() + data.firstName.trim().slice(1).toLowerCase() 
        : 'Candidate';
      const cleanLast = data.lastName 
        ? data.lastName.trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') 
        : '';

      candidate = {
        id: 'cand-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        organization_id: 'a0000000-0000-0000-0000-000000000001',
        first_name: cleanFirst,
        last_name: cleanLast,
        email: data.email.trim(),
        phone: data.phone,
        location: data.location,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.candidates.push(candidate);
    }

    const application: Application = {
      id: 'app-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      job_id: data.jobId,
      candidate_id: candidate.id,
      cv_document_id: data.cvDocId,
      stage: 'SCREENING',
      screening_status: 'PENDING',
      invitation_status: 'NOT_SENT',
      assessment_status: 'NOT_STARTED',
      interview_status: 'NOT_SCHEDULED',
      human_approved: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.applications.push(application);
    saveStore(store);

    return { candidate, application };
  },

  updateCandidate(candidateId: string, updates: Partial<Candidate>): Candidate | null {
    const store = getStore();
    const idx = store.candidates.findIndex(c => c.id === candidateId);
    if (idx === -1) return null;

    store.candidates[idx] = {
      ...store.candidates[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveStore(store);
    return store.candidates[idx];
  },

  // CV Documents
  saveCVDocument(docData: Omit<CVDocument, 'id' | 'created_at' | 'updated_at'>): CVDocument {
    const store = getStore();
    const doc: CVDocument = {
      ...docData,
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.cv_documents.push(doc);
    saveStore(store);
    return doc;
  },

  updateCVDocument(id: string, updates: Partial<CVDocument>): CVDocument | null {
    const store = getStore();
    const idx = store.cv_documents.findIndex(d => d.id === id);
    if (idx === -1) return null;
    store.cv_documents[idx] = {
      ...store.cv_documents[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveStore(store);
    return store.cv_documents[idx];
  },

  // Import Batches
  createBatch(batchName: string, jobId?: string, totalFiles: number = 0): ImportBatch {
    const store = getStore();
    const batch: ImportBatch = {
      id: 'batch-' + Date.now(),
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      job_id: jobId,
      batch_name: batchName,
      total_files: totalFiles,
      processed_files: 0,
      failed_files: 0,
      status: 'processing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    store.import_batches.push(batch);
    saveStore(store);
    return batch;
  },

  getBatches(): ImportBatch[] {
    return getStore().import_batches;
  },

  getBatchById(id: string): ImportBatch | null {
    return getStore().import_batches.find(b => b.id === id) || null;
  },

  updateBatch(id: string, updates: Partial<ImportBatch>): ImportBatch | null {
    const store = getStore();
    const idx = store.import_batches.findIndex(b => b.id === id);
    if (idx === -1) return null;
    store.import_batches[idx] = {
      ...store.import_batches[idx],
      ...updates,
      updated_at: new Date().toISOString()
    };
    saveStore(store);
    return store.import_batches[idx];
  },

  // Screening Runs
  recordScreeningRun(runData: Omit<ScreeningRun, 'id' | 'created_at'>): ScreeningRun {
    const store = getStore();
    const run: ScreeningRun = {
      ...runData,
      id: 'screen-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString()
    };
    store.screening_runs.push(run);

    // Update application screening status
    const appIdx = store.applications.findIndex(a => a.id === runData.application_id);
    if (appIdx !== -1) {
      store.applications[appIdx].screening_status = 'COMPLETED';
      store.applications[appIdx].updated_at = new Date().toISOString();
    }

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'screening',
      entity_id: run.id,
      action: 'CREATE',
      details: { 
        application_id: runData.application_id, 
        score: runData.match_score, 
        recommendation: runData.recommendation 
      }
    });

    saveStore(store);
    return run;
  },

  // Admin Approvals & Overrides
  approveForAssessment(applicationId: string, approvedBy: string, configId?: string): Application | null {
    const store = getStore();
    const idx = store.applications.findIndex(a => a.id === applicationId);
    if (idx === -1) return null;

    store.applications[idx].human_approved = true;
    store.applications[idx].approved_by = approvedBy;
    store.applications[idx].approved_at = new Date().toISOString();
    store.applications[idx].stage = 'ASSESSMENT';
    store.applications[idx].invitation_status = 'APPROVED';
    store.applications[idx].updated_at = new Date().toISOString();

    const app = store.applications[idx];
    const job = store.jobs.find(j => j.id === app.job_id);
    const resolvedConfig = db.getAssessmentConfig(configId || job?.assessment_config_id || job?.title);

    const assessId = 'assess-' + Date.now();
    const testUrl = resolvedConfig.mode === 'EXTERNAL_URL' && resolvedConfig.external_url?.trim()
      ? resolvedConfig.external_url.trim()
      : `/assessment/take/${assessId}`;

    let assignment = store.assessment_assignments.find(a => a.application_id === applicationId);
    if (!assignment) {
      assignment = {
        id: assessId,
        application_id: applicationId,
        config_id: resolvedConfig.id,
        assessment_type: resolvedConfig.mode === 'EXTERNAL_URL' ? 'GOOGLE_FORMS' : 'EXTERNAL_URL',
        assessment_url: testUrl,
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        pass_threshold_percentage: resolvedConfig.pass_threshold_percentage || 70,
        status: 'SENT',
        verified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      store.assessment_assignments.push(assignment);
    } else {
      assignment.config_id = resolvedConfig.id;
      assignment.status = 'SENT';
      assignment.assessment_url = testUrl;
      assignment.pass_threshold_percentage = resolvedConfig.pass_threshold_percentage || 70;
      assignment.updated_at = new Date().toISOString();
    }

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'application',
      entity_id: applicationId,
      action: 'APPROVE',
      details: { stage: 'ASSESSMENT', approved_by: approvedBy }
    });

    saveStore(store);
    return db.getApplicationById(applicationId);
  },

  overrideScreening(
    screeningRunId: string, 
    overrideRecommendation: ScreeningRun['recommendation'] | 'REJECT', 
    reason: string, 
    overrideBy: string
  ): ScreeningRun | null {
    const store = getStore();
    const idx = store.screening_runs.findIndex(s => s.id === screeningRunId);
    if (idx === -1) return null;

    store.screening_runs[idx].human_override_recommendation = overrideRecommendation;
    store.screening_runs[idx].human_override_reason = reason;
    store.screening_runs[idx].override_by = overrideBy;
    store.screening_runs[idx].override_at = new Date().toISOString();

    const appId = store.screening_runs[idx].application_id;
    const appIdx = store.applications.findIndex(a => a.id === appId);
    if (appIdx !== -1 && overrideRecommendation === 'REJECT') {
      store.applications[appIdx].stage = 'REJECTED';
      store.applications[appIdx].rejection_reason = reason;
      store.applications[appIdx].updated_at = new Date().toISOString();
    }

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'screening',
      entity_id: screeningRunId,
      action: 'OVERRIDE',
      details: { overrideRecommendation, reason, overrideBy }
    });

    saveStore(store);
    return store.screening_runs[idx];
  },

  rejectApplication(applicationId: string, reason: string, rejectedBy: string): Application | null {
    const store = getStore();
    const idx = store.applications.findIndex(a => a.id === applicationId);
    if (idx === -1) return null;

    store.applications[idx].stage = 'REJECTED';
    store.applications[idx].rejection_reason = reason;
    store.applications[idx].updated_at = new Date().toISOString();

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'application',
      entity_id: applicationId,
      action: 'REJECT',
      details: { reason, rejectedBy }
    });

    saveStore(store);
    return db.getApplicationById(applicationId);
  },

  // Assessments
  getAssessments(): AssessmentAssignment[] {
    const store = getStore();
    return store.assessment_assignments;
  },

  getAssessmentById(id: string): AssessmentAssignment | null {
    const store = getStore();
    return store.assessment_assignments.find(a => a.id === id || a.application_id === id || a.id.toLowerCase() === id.toLowerCase()) || null;
  },

  getOrCreateAssessmentById(id: string): { assignment: AssessmentAssignment; application: Application | null; candidate: Candidate | null; job: Job | null } | null {
    const store = getStore();
    const cleanId = id.trim();
    let assignment = store.assessment_assignments.find(
      a => a.id === cleanId || a.application_id === cleanId || a.id.toLowerCase() === cleanId.toLowerCase()
    ) || null;

    if (!assignment) {
      // 1. Check if the provided ID is an application ID
      const appById = store.applications.find(
        a => a.id === cleanId || a.id.toLowerCase() === cleanId.toLowerCase()
      );
      if (appById) {
        // Look for existing assignment for this application
        assignment = store.assessment_assignments.find(a => a.application_id === appById.id) || null;
        if (!assignment) {
          const appJob = store.jobs.find(j => j.id === appById.job_id) || store.jobs[0] || DEFAULT_JOB;
          assignment = {
            id: 'assess-' + appById.id.replace(/^app-/, ''),
            application_id: appById.id,
            config_id: appJob.assessment_config_id || 'cfg-fullstack',
            assessment_type: 'EXTERNAL_URL',
            assessment_url: `/assessment/take/${appById.id}`,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            pass_threshold_percentage: 70,
            status: 'SENT',
            verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          store.assessment_assignments.push(assignment);
          saveStore(store);
        }
      }
    }

    if (!assignment && cleanId.length >= 8) {
      // 2. Check if ID appears in an assessment URL
      assignment = store.assessment_assignments.find(
        a => a.assessment_url && a.assessment_url.includes(cleanId)
      ) || null;
    }

    if (!assignment && cleanId.length >= 8) {
      // 3. Sent Email Token Recovery: match invitation email sent to candidate
      const emailWithLink = store.sent_emails?.find(
        e => {
          const meta = e.metadata as Record<string, any> | undefined;
          const testUrl = typeof meta?.testUrl === 'string' ? meta.testUrl : '';
          return (testUrl && testUrl.includes(cleanId)) ||
                 (e.body_html && e.body_html.includes(cleanId));
        }
      );
      const emailMeta = emailWithLink?.metadata as Record<string, any> | undefined;
      if (emailMeta?.applicationId) {
        const app = store.applications.find(a => a.id === emailMeta.applicationId);
        if (app) {
          const appJob = store.jobs.find(j => j.id === app.job_id) || store.jobs[0] || DEFAULT_JOB;
          assignment = {
            id: cleanId,
            application_id: app.id,
            config_id: appJob.assessment_config_id || 'cfg-fullstack',
            assessment_type: 'EXTERNAL_URL',
            assessment_url: `/assessment/take/${cleanId}`,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            pass_threshold_percentage: typeof emailMeta.passThreshold === 'number' ? emailMeta.passThreshold : 70,
            status: 'SENT',
            verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          store.assessment_assignments.push(assignment);
          if (app.stage === 'SCREENING') app.stage = 'ASSESSMENT';
          saveStore(store);
        }
      }
    }

    if (!assignment && cleanId.startsWith('assess-')) {
      // 4. Token timestamp auto-recovery: match application created within 10 minutes of this token
      const tokenTs = parseInt(cleanId.replace(/^assess-/, ''), 10);
      if (!isNaN(tokenTs) && tokenTs > 1700000000000) {
        let bestApp: Application | null = null;
        let minDiff = 600000;
        for (const a of store.applications) {
          const appCreatedTs = new Date(a.created_at).getTime();
          let appTs = !isNaN(appCreatedTs) ? appCreatedTs : 0;
          const appIdDigits = a.id.replace(/[^0-9]/g, '');
          if (appIdDigits.length >= 13) {
            const parsedTs = parseInt(appIdDigits.substring(0, 13), 10);
            if (!isNaN(parsedTs)) appTs = parsedTs;
          }
          if (appTs > 0) {
            const diff = Math.abs(appTs - tokenTs);
            if (diff < minDiff) {
              minDiff = diff;
              bestApp = a;
            }
          }
        }
        const nearbyApp = bestApp;

        if (nearbyApp) {
          const appJob = store.jobs.find(j => j.id === nearbyApp.job_id) || store.jobs[0] || DEFAULT_JOB;
          assignment = {
            id: cleanId,
            application_id: nearbyApp.id,
            config_id: appJob.assessment_config_id || 'cfg-fullstack',
            assessment_type: 'EXTERNAL_URL',
            assessment_url: `/assessment/take/${cleanId}`,
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            pass_threshold_percentage: 70,
            status: 'SENT',
            verified: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          store.assessment_assignments.push(assignment);
          if (nearbyApp.stage === 'SCREENING') nearbyApp.stage = 'ASSESSMENT';
          saveStore(store);
        }
      }
    }

    if (!assignment && cleanId.startsWith('assess-')) {
      // 5. Active Shortlisted Application Recovery
      const eligibleApp = store.applications
        .slice()
        .reverse()
        .find(a => a.stage === 'ASSESSMENT' || a.screening_status === 'COMPLETED');

      if (eligibleApp) {
        const appJob = store.jobs.find(j => j.id === eligibleApp.job_id) || store.jobs[0] || DEFAULT_JOB;
        assignment = {
          id: cleanId,
          application_id: eligibleApp.id,
          config_id: appJob.assessment_config_id || 'cfg-fullstack',
          assessment_type: 'EXTERNAL_URL',
          assessment_url: `/assessment/take/${cleanId}`,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          pass_threshold_percentage: 70,
          status: 'SENT',
          verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        store.assessment_assignments.push(assignment);
        if (eligibleApp.stage === 'SCREENING') eligibleApp.stage = 'ASSESSMENT';
        saveStore(store);
      }
    }

    if (!assignment) return null;

    const application = db.getApplicationById(assignment.application_id);
    const candidate = application?.candidate || null;
    const job = application?.job || null;

    return { assignment, application, candidate, job };
  },

  getAssessmentByApplicationId(applicationId: string): AssessmentAssignment | null {
    const store = getStore();
    return store.assessment_assignments.find(a => a.application_id === applicationId) || null;
  },

  getAssessmentConfigs(): AssessmentConfig[] {
    const store = getStore();
    if (!store.assessment_configs || store.assessment_configs.length === 0) {
      store.assessment_configs = JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_CONFIGS));
      saveStore(store);
    }
    return store.assessment_configs;
  },

  getAssessmentConfig(idOrRole?: string): AssessmentConfig {
    const store = getStore();
    if (!store.assessment_configs || store.assessment_configs.length === 0) {
      store.assessment_configs = JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_CONFIGS));
      store.assessment_config = store.assessment_configs[0];
      saveStore(store);
    }

    if (idOrRole && typeof idOrRole === 'string' && idOrRole.trim()) {
      const q = idOrRole.trim().toLowerCase();
      // Match by exact ID
      const byId = store.assessment_configs.find(c => c.id.toLowerCase() === q);
      if (byId) return byId;

      // Match by exact or partial role
      const byRole = store.assessment_configs.find(c => c.role && (c.role.toLowerCase() === q || q.includes(c.role.toLowerCase()) || c.role.toLowerCase().includes(q)));
      if (byRole) return byRole;

      // Match by title
      const byTitle = store.assessment_configs.find(c => c.title && (c.title.toLowerCase() === q || q.includes(c.title.toLowerCase()) || c.title.toLowerCase().includes(q)));
      if (byTitle) return byTitle;
    }

    if (store.assessment_config && store.assessment_config.questions && store.assessment_config.questions.length > 0) {
      return store.assessment_config;
    }

    return store.assessment_configs[0] || DEFAULT_ASSESSMENT_CONFIG;
  },

  saveAssessmentConfig(config: AssessmentConfig): AssessmentConfig {
    const store = getStore();
    if (!store.assessment_configs) {
      store.assessment_configs = JSON.parse(JSON.stringify(DEFAULT_ASSESSMENT_CONFIGS));
    }

    const now = new Date().toISOString();
    const configToSave: AssessmentConfig = {
      ...config,
      id: config.id || `cfg-${Date.now()}`,
      updated_at: now,
      created_at: config.created_at || now
    };

    const idx = store.assessment_configs.findIndex(c => c.id === configToSave.id);
    if (idx >= 0) {
      store.assessment_configs[idx] = configToSave;
    } else {
      store.assessment_configs.push(configToSave);
    }

    store.assessment_config = configToSave;
    saveStore(store);
    return configToSave;
  },

  createAssessmentConfig(data: Partial<AssessmentConfig>): AssessmentConfig {
    const store = getStore();
    const id = `cfg-${Date.now()}`;
    const now = new Date().toISOString();
    const newConfig: AssessmentConfig = {
      id,
      role: data.role || 'Custom Role',
      title: data.title || `${data.role || 'Custom Role'} Assessment Challenge`,
      description: data.description || 'Role-specific competency and technical challenge',
      mode: data.mode || 'INBUILT',
      external_url: data.external_url || '',
      duration_minutes: data.duration_minutes || 45,
      pass_threshold_percentage: data.pass_threshold_percentage || 70,
      calendly_link: data.calendly_link || 'https://calendly.com',
      anti_cheat_enabled: data.anti_cheat_enabled ?? true,
      webcam_required: data.webcam_required ?? false,
      screen_share_required: data.screen_share_required ?? false,
      questions: data.questions || [
        {
          id: 'q_' + Date.now(),
          type: 'mcq',
          title: 'Core Technical Principles',
          category: 'Architecture',
          description: 'Evaluate core architecture patterns, trade-offs, and scalability for this role.',
          points: 25,
          options: [
            'A) Proposed approach option A',
            'B) Recommended production-grade architecture pattern with fault tolerance',
            'C) Synchronous polling without backoff',
            'D) Unindexed raw database queries'
          ],
          correct_option_index: 1,
          explanation: 'Option B follows optimal system architecture principles with horizontal scalability and fault isolation.'
        }
      ],
      created_at: now,
      updated_at: now
    };

    if (!store.assessment_configs) store.assessment_configs = [];
    store.assessment_configs.push(newConfig);
    store.assessment_config = newConfig;
    saveStore(store);
    return newConfig;
  },

  deleteAssessmentConfig(id: string): boolean {
    const store = getStore();
    if (!store.assessment_configs || store.assessment_configs.length <= 1) {
      return false; // Prevent deleting the last remaining config
    }
    store.assessment_configs = store.assessment_configs.filter(c => c.id !== id);
    if (store.assessment_config?.id === id) {
      store.assessment_config = store.assessment_configs[0];
    }
    saveStore(store);
    return true;
  },

  // Sent Emails
  addSentEmail(emailData: Omit<SentEmail, 'id' | 'sent_at'>): SentEmail {
    const store = getStore();
    if (!store.sent_emails) store.sent_emails = [];
    const email: SentEmail = {
      ...emailData,
      id: 'email-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      sent_at: new Date().toISOString()
    };
    store.sent_emails.unshift(email);
    saveStore(store);
    return email;
  },

  getSentEmails(): SentEmail[] {
    const store = getStore();
    return store.sent_emails || [];
  },

  findNextAvailableSlot(interviewerId: string, durationMinutes: number = 45): string {
    const store = getStore();
    const candidateHours = [14, 15, 10, 11, 16]; // 2 PM, 3 PM, 10 AM, 11 AM, 4 PM

    for (let dayOffset = 1; dayOffset <= 10; dayOffset++) {
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + dayOffset);
      // Skip Saturday (6) and Sunday (0)
      if (testDate.getDay() === 0 || testDate.getDay() === 6) continue;

      for (const hour of candidateHours) {
        testDate.setHours(hour, 0, 0, 0);
        const startMs = testDate.getTime();
        const endMs = startMs + durationMinutes * 60 * 1000;

        const hasConflict = store.interviews.some(existing => {
          if (existing.interviewer_id !== interviewerId) return false;
          if (existing.booking_status === 'CANCELLED') return false;
          const eStart = new Date(existing.scheduled_start).getTime();
          const eEnd = new Date(existing.scheduled_end).getTime();
          return (startMs < eEnd && endMs > eStart);
        });

        if (!hasConflict) {
          return testDate.toISOString();
        }
      }
    }

    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(14, 0, 0, 0);
    return fallback.toISOString();
  },

  saveAssessmentResult(
    assignmentId: string, 
    data: { 
      score: number; 
      maxScore?: number; 
      source: string; 
      verified?: boolean; 
      verifiedBy?: string; 
      candidateEmail?: string;
      details?: Record<string, unknown> 
    }
  ): AssessmentAssignment | null {
    const store = getStore();
    const idx = store.assessment_assignments.findIndex(a => a.id === assignmentId);
    if (idx === -1) return null;

    const maxScore = data.maxScore ?? 100;
    const percentage = Number(((data.score / maxScore) * 100).toFixed(2));
    const passThreshold = store.assessment_assignments[idx].pass_threshold_percentage;
    const passed = percentage >= passThreshold;

    store.assessment_assignments[idx] = {
      ...store.assessment_assignments[idx],
      score: data.score,
      max_score: maxScore,
      percentage_score: percentage,
      result_source: data.source,
      result_details: data.details,
      status: passed ? 'PASSED' : 'FAILED',
      verified: data.verified ?? true,
      verified_by: data.verifiedBy,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update application stage if passed
    const appId = store.assessment_assignments[idx].application_id;
    const appIdx = store.applications.findIndex(a => a.id === appId);
    if (appIdx !== -1) {
      store.applications[appIdx].assessment_status = passed ? 'PASSED' : 'FAILED';
      store.applications[appIdx].assessment_score = percentage;
      if (passed) {
        store.applications[appIdx].stage = 'INTERVIEW';
        store.applications[appIdx].interview_status = 'SCHEDULED';

        // Check if an interview already exists
        const existingInterview = store.interviews.find(i => i.application_id === appId);
        if (!existingInterview) {
          const interviewer = store.interviewers[0] || DEFAULT_INTERVIEWER;
          const scheduledStart = db.findNextAvailableSlot(interviewer.id, 45);
          const startMs = new Date(scheduledStart).getTime();
          const endMs = startMs + 45 * 60 * 1000;
          
          const candidate = store.candidates.find(c => c.id === store.applications[appIdx].candidate_id);
          const job = store.jobs.find(j => j.id === store.applications[appIdx].job_id);

          if (candidate) {
            // If caller provided candidate's real email, synchronize it now
            if (data.candidateEmail && typeof data.candidateEmail === 'string') {
              const cleanEmail = data.candidateEmail.trim().toLowerCase();
              if (cleanEmail.includes('@') && !cleanEmail.endsWith('@example.com') && !cleanEmail.endsWith('@test.com')) {
                candidate.email = cleanEmail;
              }
            }

            // Sanitize candidate first and last names (ensure never numeric e.g. "40")
            const rawFullName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim();
            const cleanNames = rawFullName.replace(/\d+/g, '').replace(/[^\p{L}\s'-]/gu, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length >= 2);
            let cleanFirstName = cleanNames[0] ? (cleanNames[0].charAt(0).toUpperCase() + cleanNames[0].slice(1).toLowerCase()) : 'there';
            let cleanLastName = cleanNames.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

            if (cleanFirstName.toLowerCase() === 'there' || cleanFirstName.toLowerCase() === 'candidate') {
              const cvDoc = store.cv_documents.find(d => d.id === store.applications[appIdx].cv_document_id || d.candidate_id === candidate.id);
              if (cvDoc?.file_name) {
                const nameFromDoc = cvDoc.file_name.replace(/\.[^.]+$/, '').replace(/^\s*\d+[\s._-]*/, '').replace(/[-_.]/g, ' ').trim();
                const docWords = nameFromDoc.replace(/\d+/g, '').replace(/[^\p{L}\s'-]/gu, ' ').split(/\s+/).filter(w => w.length >= 2);
                if (docWords.length > 0) {
                  cleanFirstName = docWords[0].charAt(0).toUpperCase() + docWords[0].slice(1).toLowerCase();
                  cleanLastName = docWords.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                }
              }
            }

            candidate.first_name = cleanFirstName === 'there' ? 'Candidate' : cleanFirstName;
            candidate.last_name = cleanLastName;
            const recipientName = `${candidate.first_name} ${candidate.last_name}`.trim();
          
            // Determine booking URL: Use recruiter's Calendly link from UI / Job, fallback to Google Meet
            const calendlyLink = (job?.calendly_link || store.assessment_config?.calendly_link || '').trim();
            const fallbackMeetUrl = generateMeetLink(appId);
            const bookingUrl = calendlyLink || fallbackMeetUrl;

            const interview: Interview = {
              id: 'int-' + Date.now(),
              application_id: appId,
              interviewer_id: interviewer.id,
              interviewer_name: interviewer.name,
              round_number: 2,
              scheduled_start: scheduledStart,
              scheduled_end: new Date(endMs).toISOString(),
              timezone: interviewer.timezone || 'America/New_York',
              duration_minutes: 45,
              scheduling_mode: calendlyLink ? 'MANUAL' : 'GOOGLE_CALENDAR',
              booking_status: 'SCHEDULED',
              meeting_url: bookingUrl,
              calendly_url: calendlyLink || undefined,
              google_event_id: `cal_event_round2_${Date.now()}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            store.interviews.push(interview);

            // Dispatch Round 2 interview email with Calendly booking link (Human, non-AI tone)
            const roleTitle = job?.title || 'Senior Full-Stack Cloud Engineer';
            const subject = `Next steps: Technical Interview for ${roleTitle}`;
            const bodyHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #1f2937; line-height: 1.6; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
                <p style="font-size: 15px; margin-top: 0; margin-bottom: 20px; color: #111827;">
                  Hi ${cleanFirstName},
                </p>

                <p style="font-size: 15px; margin-bottom: 16px; color: #374151;">
                  Thank you for taking the time to complete the technical assessment for the <strong>${roleTitle}</strong> role. Our engineering team reviewed your submission, and we were really impressed with your architecture and problem-solving approach.
                </p>

                <p style="font-size: 15px; margin-bottom: 24px; color: #374151;">
                  We'd love to invite you to our next round—a 45-minute technical conversation. It'll be a chance to talk through your experience, dive deeper into system design, and give you plenty of time to ask us anything about what we're building and what it's like working here.
                </p>

                <div style="margin: 28px 0; text-align: left;">
                  <a href="${bookingUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 26px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Schedule your interview
                  </a>
                </div>

                <p style="font-size: 13px; color: #6b7280; margin-bottom: 20px; line-height: 1.5;">
                  You can also use this direct link to view available times: <br/>
                  <a href="${bookingUrl}" style="color: #2563eb; word-break: break-all;">${bookingUrl}</a>
                </p>

                <p style="font-size: 14px; color: #4b5563; margin-bottom: 24px;">
                  If none of the available slots fit your schedule or timezone, just reply directly to this email with a few times that suit you best and we'll gladly work around your availability.
                </p>

                <p style="font-size: 15px; margin-bottom: 4px; color: #374151;">
                  Looking forward to speaking with you!
                </p>
                <p style="font-size: 15px; font-weight: 600; color: #111827; margin-top: 0;">
                  The Engineering Hiring Team
                </p>
              </div>
            `.trim();

            const email: SentEmail = {
              id: 'email-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              recipient_email: candidate.email,
              recipient_name: recipientName,
              subject,
              body_html: bodyHtml,
              template_type: 'ROUND_2_INTERVIEW_INVITATION',
              metadata: {
                applicationId: appId,
                score: percentage,
                meetingUrl: bookingUrl,
                calendlyUrl: calendlyLink || undefined,
                scheduledStart,
                interviewerName: interviewer.name
              },
              sent_at: new Date().toISOString()
            };
            if (!store.sent_emails) store.sent_emails = [];
            store.sent_emails.unshift(email);
            dispatchRealSmtpEmail(candidate.email, subject, bodyHtml);
          }
        }
      }
      store.applications[appIdx].updated_at = new Date().toISOString();
    }

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'assessment',
      entity_id: assignmentId,
      action: 'UPDATE',
      details: { score: data.score, percentage, passed, source: data.source }
    });

    saveStore(store);
    return store.assessment_assignments[idx];
  },

  // Interviews
  getInterviews(): Interview[] {
    return getStore().interviews;
  },

  getInterviewers(): Interviewer[] {
    return getStore().interviewers;
  },

  approveForInterview(applicationId: string, approvedBy: string): Application | null {
    const store = getStore();
    const idx = store.applications.findIndex(a => a.id === applicationId);
    if (idx === -1) return null;

    store.applications[idx].stage = 'INTERVIEW';
    store.applications[idx].interview_status = 'APPROVED';
    store.applications[idx].updated_at = new Date().toISOString();

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'application',
      entity_id: applicationId,
      action: 'APPROVE',
      details: { stage: 'INTERVIEW', approved_by: approvedBy }
    });

    saveStore(store);
    return db.getApplicationById(applicationId);
  },

  scheduleInterview(data: {
    applicationId: string;
    interviewerId: string;
    interviewerName: string;
    scheduledStart: string;
    durationMinutes: number;
    timezone: string;
    schedulingMode: 'GOOGLE_CALENDAR' | 'MANUAL';
    meetingUrl?: string;
    googleEventId?: string;
  }): { interview?: Interview; conflict?: boolean; error?: string } {
    const store = getStore();

    const startMs = new Date(data.scheduledStart).getTime();
    const endMs = startMs + data.durationMinutes * 60 * 1000;
    const endIso = new Date(endMs).toISOString();

    // Check for scheduling conflicts with the same interviewer
    const conflict = store.interviews.some(existing => {
      if (existing.interviewer_id !== data.interviewerId) return false;
      if (existing.booking_status === 'CANCELLED') return false;

      const existingStart = new Date(existing.scheduled_start).getTime();
      const existingEnd = new Date(existing.scheduled_end).getTime();

      // Check overlap
      return (startMs < existingEnd && endMs > existingStart);
    });

    if (conflict) {
      return { 
        conflict: true, 
        error: 'The interviewer already has a scheduled interview during this time window.' 
      };
    }

    const interview: Interview = {
      id: 'int-' + Date.now(),
      application_id: data.applicationId,
      interviewer_id: data.interviewerId,
      interviewer_name: data.interviewerName,
      round_number: 2,
      scheduled_start: data.scheduledStart,
      scheduled_end: endIso,
      timezone: data.timezone,
      duration_minutes: data.durationMinutes,
      scheduling_mode: data.schedulingMode,
      booking_status: 'SCHEDULED',
      meeting_url: data.meetingUrl || (data.schedulingMode === 'MANUAL' ? 'https://meet.google.com/man-rec-demo' : undefined),
      google_event_id: data.googleEventId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    store.interviews.push(interview);

    // Update application
    const appIdx = store.applications.findIndex(a => a.id === data.applicationId);
    if (appIdx !== -1) {
      store.applications[appIdx].stage = 'INTERVIEW';
      store.applications[appIdx].interview_status = 'SCHEDULED';
      store.applications[appIdx].updated_at = new Date().toISOString();
    }

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'interview',
      entity_id: interview.id,
      action: 'CREATE',
      details: { 
        interviewer: data.interviewerName, 
        start: data.scheduledStart, 
        mode: data.schedulingMode 
      }
    });

    saveStore(store);
    return { interview };
  },

  updateInterviewCalendar(interviewId: string, data: {
    bookingStatus?: Interview['booking_status'];
    calendarEventId?: string;
    meetingUrl?: string;
  }): Interview | null {
    const store = getStore();
    const idx = store.interviews.findIndex(i => i.id === interviewId || i.application_id === interviewId);
    if (idx === -1) return null;

    if (data.bookingStatus) store.interviews[idx].booking_status = data.bookingStatus;
    if (data.calendarEventId) store.interviews[idx].google_event_id = data.calendarEventId;
    if (data.meetingUrl) store.interviews[idx].meeting_url = data.meetingUrl;
    store.interviews[idx].updated_at = new Date().toISOString();

    const appId = store.interviews[idx].application_id;
    const appIdx = store.applications.findIndex(a => a.id === appId);
    if (appIdx !== -1 && data.bookingStatus === 'SCHEDULED') {
      store.applications[appIdx].interview_status = 'SCHEDULED';
      store.applications[appIdx].updated_at = new Date().toISOString();
    }

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'interview',
      entity_id: store.interviews[idx].id,
      action: 'UPDATE',
      details: data
    });

    saveStore(store);
    return store.interviews[idx];
  },

  updateAssessmentStatus(assignmentId: string, status: AssessmentAssignment['status']): AssessmentAssignment | null {
    const store = getStore();
    const idx = store.assessment_assignments.findIndex(a => a.id === assignmentId);
    if (idx === -1) return null;

    store.assessment_assignments[idx].status = status;
    store.assessment_assignments[idx].updated_at = new Date().toISOString();

    const appId = store.assessment_assignments[idx].application_id;
    const appIdx = store.applications.findIndex(a => a.id === appId);
    if (appIdx !== -1) {
      if (status === 'SENT') {
        store.applications[appIdx].invitation_status = 'SENT';
      }
      store.applications[appIdx].updated_at = new Date().toISOString();
    }

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'assessment',
      entity_id: assignmentId,
      action: 'UPDATE',
      details: { status, application_id: appId }
    });

    saveStore(store);
    return store.assessment_assignments[idx];
  },

  getOverdueAssessments(): Array<AssessmentAssignment & { candidate?: Candidate; jobTitle?: string }> {
    const store = getStore();
    return store.assessment_assignments
      .filter(a => a.status !== 'PASSED' && a.status !== 'FAILED')
      .map(assignment => {
        const app = store.applications.find(ap => ap.id === assignment.application_id);
        const candidate = app ? store.candidates.find(c => c.id === app.candidate_id) : undefined;
        const job = app ? store.jobs.find(j => j.id === app.job_id) : undefined;
        return {
          ...assignment,
          candidate,
          jobTitle: job?.title || 'Engineer'
        };
      });
  },

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return getStore().audit_logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  addAuditLog(entry: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const store = getStore();
    const log: AuditLog = {
      ...entry,
      id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      created_at: new Date().toISOString()
    };
    store.audit_logs.unshift(log);
    saveStore(store);
    return log;
  },

  // Retention / Candidate Deletion
  requestCandidateDeletion(candidateId: string, reason: string, requestedBy: string): RetentionDeletionRequest {
    const store = getStore();
    const candidate = store.candidates.find(c => c.id === candidateId);

    const req: RetentionDeletionRequest = {
      id: 'del-' + Date.now(),
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      candidate_id: candidateId,
      candidate_name: candidate ? `${candidate.first_name} ${candidate.last_name}` : 'Unknown',
      requested_by: requestedBy,
      status: 'PROCESSED',
      reason,
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

    // Anonymize/Delete personal data
    store.candidates = store.candidates.filter(c => c.id !== candidateId);
    store.cv_documents = store.cv_documents.filter(d => d.candidate_id !== candidateId);
    const relatedApps = store.applications.filter(a => a.candidate_id === candidateId);
    for (const a of relatedApps) {
      a.stage = 'REJECTED';
      a.rejection_reason = 'Candidate requested personal data deletion under GDPR/Privacy policy.';
    }

    store.retention_requests.push(req);

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'retention',
      entity_id: req.id,
      action: 'DELETE',
      details: { candidateId, reason }
    });

    saveStore(store);
    return req;
  },

  // Real Analytics Aggregations calculated directly from database records
  getAnalytics(jobId?: string) {
    const store = getStore();
    let apps = store.applications;
    let cvDocs = store.cv_documents;
    let assessments = store.assessment_assignments;
    let interviews = store.interviews;

    if (jobId && jobId !== 'all') {
      apps = apps.filter(a => a.job_id === jobId);
      const appIds = new Set(apps.map(a => a.id));
      assessments = assessments.filter(a => appIds.has(a.application_id));
      interviews = interviews.filter(i => appIds.has(i.application_id));
      const cvIds = new Set(apps.map(a => a.cv_document_id).filter(Boolean));
      cvDocs = cvDocs.filter(d => cvIds.has(d.id));
    }

    const totalJobs = store.jobs.length;
    const totalCVsUploaded = cvDocs.length;
    const cvsParsedSuccessfully = cvDocs.filter(d => d.parsing_status === 'parsed').length;
    const processingFailures = cvDocs.filter(d => d.parsing_status === 'failed').length;
    const screeningCompleted = apps.filter(a => a.screening_status === 'COMPLETED').length;
    const candidatesAwaitingApproval = apps.filter(a => a.screening_status === 'COMPLETED' && !a.human_approved && a.stage === 'SCREENING').length;
    const approvedAssessmentInvitations = apps.filter(a => a.invitation_status === 'APPROVED' || a.invitation_status === 'SENT').length;
    const assessmentSubmissions = assessments.filter(a => a.status === 'PASSED' || a.status === 'FAILED' || a.status === 'RESULT_RECEIVED').length;
    const resultsAwaitingVerification = assessments.filter(a => a.status === 'REVIEW_REQUIRED' || !a.verified).length;

    // Strict pass rate calculation: only evaluated submissions
    const evaluatedAssessments = assessments.filter(a => a.status === 'PASSED' || a.status === 'FAILED');
    const passedAssessments = assessments.filter(a => a.status === 'PASSED').length;
    const assessmentPassRate = evaluatedAssessments.length > 0 
      ? Number(((passedAssessments / evaluatedAssessments.length) * 100).toFixed(1)) 
      : 0;

    const candidatesAwaitingInterviewApproval = apps.filter(a => a.assessment_status === 'PASSED' && a.interview_status === 'AWAITING_APPROVAL').length;
    const interviewsScheduled = interviews.filter(i => i.booking_status === 'SCHEDULED' || i.booking_status === 'COMPLETED').length;

    // Assessment Scores Analysis
    const scoredAssignments = assessments.filter(a => typeof a.percentage_score === 'number' || typeof a.score === 'number');
    const assessmentScores = scoredAssignments.map(a => typeof a.percentage_score === 'number' ? a.percentage_score : Number(a.score));
    
    const averageAssessmentScore = assessmentScores.length > 0
      ? Number((assessmentScores.reduce((sum, s) => sum + s, 0) / assessmentScores.length).toFixed(1))
      : 0;
    const highestAssessmentScore = assessmentScores.length > 0
      ? Math.max(...assessmentScores)
      : 0;
    const lowestAssessmentScore = assessmentScores.length > 0
      ? Math.min(...assessmentScores)
      : 0;

    // AI Screening Scores Analysis
    const screeningRuns = store.screening_runs || [];
    const appIdsSet = new Set(apps.map(a => a.id));
    const relevantScreenings = screeningRuns.filter(s => appIdsSet.has(s.application_id));
    const averageScreeningScore = relevantScreenings.length > 0
      ? Number((relevantScreenings.reduce((sum, s) => sum + s.match_score, 0) / relevantScreenings.length).toFixed(1))
      : 0;

    // Score distribution brackets
    const scoreDistribution = {
      excellent: assessmentScores.filter(s => s >= 85).length,
      good: assessmentScores.filter(s => s >= 70 && s < 85).length,
      borderline: assessmentScores.filter(s => s >= 50 && s < 70).length,
      below: assessmentScores.filter(s => s < 50).length,
    };

    // Recent assessed candidates with actual verified scores
    const recentSubmissions = scoredAssignments
      .slice()
      .reverse()
      .slice(0, 10)
      .map(a => {
        const app = store.applications.find(ap => ap.id === a.application_id);
        const cand = app ? store.candidates.find(c => c.id === app.candidate_id) : null;
        const job = app ? store.jobs.find(j => j.id === app.job_id) : null;
        const cleanName = `${cand?.first_name || ''} ${cand?.last_name || ''}`.trim() || 'Candidate';
        const finalScore = typeof a.percentage_score === 'number' ? a.percentage_score : (a.score || 0);
        return {
          id: a.id,
          candidateName: cleanName,
          candidateEmail: cand?.email || '',
          jobTitle: job?.title || 'Engineer',
          score: finalScore,
          status: a.status,
          passThreshold: a.pass_threshold_percentage || 70,
          passed: finalScore >= (a.pass_threshold_percentage || 70),
          submittedAt: a.verified_at || a.updated_at || a.created_at
        };
      });

    // Recruitment funnel counts
    const funnel = [
      { stage: 'Uploaded CVs', count: totalCVsUploaded },
      { stage: 'Screened', count: screeningCompleted },
      { stage: 'Approved for Assessment', count: approvedAssessmentInvitations },
      { stage: 'Assessment Passed', count: passedAssessments },
      { stage: 'Interview Scheduled', count: interviewsScheduled }
    ];

    return {
      totalJobs,
      totalCVsUploaded,
      cvsParsedSuccessfully,
      processingFailures,
      screeningCompleted,
      candidatesAwaitingApproval,
      approvedAssessmentInvitations,
      assessmentSubmissions,
      resultsAwaitingVerification,
      assessmentPassRate,
      averageAssessmentScore,
      highestAssessmentScore,
      lowestAssessmentScore,
      averageScreeningScore,
      scoreDistribution,
      recentSubmissions,
      candidatesAwaitingInterviewApproval,
      interviewsScheduled,
      funnel
    };
  }
};
