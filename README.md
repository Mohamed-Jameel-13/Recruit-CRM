# RecruitAI — Zero-Budget AI Recruitment Automation Platform

A complete, production-grade, AI-assisted HR recruitment automation system built from scratch with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL & Storage**, **Google Gemini Free Tier**, and self-hosted **n8n orchestration**.

---

## 🌟 Key Features

1. **Intelligent Semantic Screening Engine (Not Just Keyword Matching)**:
   - Evaluates competencies using semantic reasoning and transferable skill models (e.g., granting 95% proficiency credit for MySQL when PostgreSQL is required).
   - Powered by Google Gemini 1.5 Flash (with structured JSON output validated via Zod) and a deterministic semantic equivalence matrix fallback.
   - Explainable scoring (0–100): matching skills, transferable equivalents, missing criteria, evidence citations from the CV, and uncertainty flags.

2. **Human-in-the-Loop Ethical Guardrail**:
   - AI screening scores are strictly advisory. AI never automatically rejects a candidate.
   - Mandatory human approvals before assessment invitations and second-round interviews.
   - Admin override controls with mandatory recorded justifications.

3. **Multi-File Private CV Batch Ingestion**:
   - Drag-and-drop multi-file uploader (up to 50 files per batch, 15MB limit).
   - Automatic text and metadata extraction from PDF and DOCX files.
   - SHA-256 deduplication fingerprinting and private document storage.

4. **Multi-Channel Technical Assessments**:
   - External assessment URLs (HackerRank, TestGorilla, etc.).
   - Google Forms & Google Sheets response synchronization.
   - Manual result entry and bulk CSV Import Wizard with column mapping, live preview, duplicate detection, and automated pass/fail policy evaluation.

5. **Round 2 Interview Management & Scheduling**:
   - Timezone-aware interview booking with real-time conflict prevention.
   - Optional Google Calendar & Meet integration with real free/busy checks and conference generation.
   - Fully functional manual scheduling fallback.

6. **Database-Backed Live Analytics**:
   - Calculated strictly from real database records (no fake/hardcoded numbers).
   - Real-time recruitment pipeline funnel: *Uploaded ➔ Screened ➔ Approved ➔ Assessment Passed ➔ Interview Scheduled*.
   - Accurate metric denominators (e.g. unverified/missing assessment results are never counted as failures).

7. **5 Production-Ready n8n Workflow JSONs**:
   - `01_cv_processing_workflow.json` (CV document batch processing & AI screening)
   - `02_assessment_invitations_workflow.json` (Approved assessment invitation dispatch & delivery tracking)
   - `03_assessment_result_sync_workflow.json` (Google Forms / Sheets score synchronization)
   - `04_interview_coordination_workflow.json` (Interview scheduling & calendar coordination)
   - `05_reminders_and_errors_workflow.json` (Due-date reminders, dead-letter recovery & alerts)

8. **Compliance & Audit Logging**:
   - Immutable audit trail recording all approvals, overrides, status changes, and imports.
   - GDPR/CCPA Article 17 personal data erasure controls.

---

## 🏗️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) with React 19 & TypeScript |
| **Styling & UI** | Tailwind CSS with custom glassmorphic dark theme & Lucide icons |
| **Validation** | Zod runtime schema validation & React Hook Form |
| **Database & Auth** | Supabase PostgreSQL, Supabase Storage, Row Level Security (RLS) |
| **AI Evaluation** | Google Gemini API (Free Tier) + Semantic Equivalence Knowledge Matrix |
| **Document Parsing** | `pdf-parse` (PDF) & `mammoth` (DOCX) |
| **Automation** | Self-hosted n8n instance via authenticated webhooks & HMAC secrets |
| **Testing** | Vitest suite (scoring, semantic matching, calendar conflicts, CSV parser, state machines) |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20+ (tested on Node v26)
- **npm**: v10+

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone <repo-url> "CV Screener"
cd "CV Screener"
npm install
```

### 3. Environment Setup
Copy the example environment configuration:
```bash
cp .env.example .env.local
```
*(The platform runs immediately out-of-the-box with persistent local mock storage and semantic fallback if external keys are not yet provided).*

### 4. Run the Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 5. Run the Automated Test Suite
```bash
npm test
```
To run the complete programmatic end-to-end simulation across all stages:
```bash
node scripts/test-e2e.mjs
```

---

## 🧠 Semantic Matching vs. Keyword Screening

Traditional applicant tracking systems (ATS) penalize candidates who omit exact keyword matches (e.g. searching only for `PostgreSQL` and rejecting a candidate with 5 years of enterprise `MySQL`).

RecruitAI implements **Intelligent Semantic Transferability**:
- **Relational SQL Database Family**: Knowledge of schema design, composite indexes, CTEs, and ACID transactions in `MySQL`, `MariaDB`, `Oracle`, or `SQL Server` transfers to `PostgreSQL` with **95% credit**.
- **Modern UI Component Frameworks**: State management, component lifecycles, and Virtual DOM principles in `Vue.js` or `Svelte` transfer to `React` with **90% credit**.
- **Backend API Architectures**: RESTful design, async event loops, and middleware patterns in `FastAPI` or `Go` transfer to `Node.js` with **85% credit**.
- **Containerization**: `Kubernetes` experience awards **100% credit** for Docker containerization.

Custom semantic equivalence rules can be adjusted per job requisition in the **Jobs & Criteria** screen.

---

## 🗄️ Supabase Setup & Migrations

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Open `supabase/migrations/001_initial_schema.sql` and run the script to create all tables, indexes, constraints, and Row Level Security (RLS) policies.
4. (Optional) Run `supabase/seed.sql` to seed the demo organization, sample job, and initial interviewers.
5. In your Supabase Dashboard, create a private storage bucket named `cv_documents`.
6. Add your project URL and service role keys into `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

---

## 🤖 Google Gemini AI Setup

1. Obtain a free API key at [Google AI Studio](https://aistudio.google.com/).
2. Add the key to `.env.local`:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
3. When the key is present, screening requests utilize `gemini-1.5-flash` with low temperature and strict JSON schema output.
4. When unconfigured, the application visibly displays `Rule-based Semantic Simulation` mode and executes the semantic equivalence matrix locally.

---

## ⚡ n8n Workflows Configuration

All 5 workflows are pre-packaged as standard importable JSON files in `n8n-workflows/`:

1. Open your hosted n8n instance.
2. Click **Add Workflow** ➔ **Import from File**.
3. Select any file from `n8n-workflows/`:
   - `01_cv_processing_workflow.json`
   - `02_assessment_invitations_workflow.json`
   - `03_assessment_result_sync_workflow.json`
   - `04_interview_coordination_workflow.json`
   - `05_reminders_and_errors_workflow.json`
4. In n8n **Credentials**, configure:
   - **Header Auth**: Name: `X-N8N-Secret`, Value: `<matching N8N_SHARED_SECRET>`
   - (Optional) **Google Sheets / Calendar OAuth2**: When connecting live Google accounts.
5. In `.env.local`, set:
   ```env
   N8N_WEBHOOK_URL=https://<your-n8n-instance>/webhook/cv-batch
   N8N_SHARED_SECRET=your_secure_shared_token
   ```

---

## 📁 Demonstration Data

The repository includes 10 realistic test resumes in `demo_cvs/`:
- `01_Elena_Rostova_FullStack.txt`: Senior Full-Stack Engineer (Direct match).
- `02_David_Chen_MySQL_Architecture.txt`: MySQL specialist (Tests semantic matching for PostgreSQL).
- `03_Marcus_Brody_Polyglot_FastAPI.txt`: FastAPI & Kubernetes (Tests backend architecture transfer).
- `04_Priya_Sharma_Vue_MongoDB.txt`: Vue.js & MongoDB (Tests component & data layer transfer).
- `05_Jordan_Vance_Junior_Borderline.txt`: Junior developer (Tests borderline human review queue).
- `06_Aisha_AlMansoor_Frontend_Specialist.txt`: Frontend wizard (Tests missing backend criteria).
- `07_Carlos_Gomez_DevOps_Cloud.txt`: Cloud/SRE engineer (Tests missing UI requirements).
- `08_Samantha_Miller_FullStack_Approved.txt`: Staff Engineer (Tests complete assessment & interview flow).
- `09_Liam_OConnor_Distributed_Systems.txt`: Distributed systems (Tests MariaDB semantic match).
- `10_Tariq_Aziz_Corrupted_Test.txt`: Corrupted file (Tests error handling & retry queues).

Also included: `demo_cvs/sample_assessment_results.csv` for 1-click testing of the CSV Import Wizard!

---

## 🧪 Testing Verification Scenarios

| Test Suite | Scenario Covered |
|---|---|
| `semantic-matching.test.ts` | MySQL ➔ PostgreSQL equivalence, Vue ➔ React transfer, scoring bounds |
| `state-transitions.test.ts` | Human approval requirements, preventing automatic AI rejection, admin override |
| `calendar-conflicts.test.ts` | Time slot overlap detection, interviewer availability verification |
| `csv-import.test.ts` | CSV header mapping, validation, duplicate email detection, pass threshold policy |
| `webhook-auth.test.ts` | n8n secret authentication, header parsing, idempotency enforcement |

Run all tests:
```bash
npm test
```

---

## 🔒 Security & Privacy

- **Private Storage**: Resumes are stored in a private directory / bucket, never exposed publicly.
- **Untrusted Input Isolation**: Resume text is strictly bounded in prompt evaluation to defend against prompt injection.
- **Server-Only Secrets**: Supabase service keys, Gemini API tokens, and n8n secrets are never exposed to browser bundles.
- **GDPR Article 17 Erasure**: Recruiters can trigger personal data anonymization with a mandatory recorded reason.
- **Immutable Audit Trail**: All decisions, approvals, score modifications, and deletions are permanently logged.

---

## 📄 License
MIT License. Free for open-source and zero-budget demonstration use.
