-- ====================================================================
-- AI Recruitment Automation Platform - Seed Data
-- Fictional Organization, Job, Rubric, and 10 Diverse Candidates
-- ====================================================================

-- 1. Demo Organization
INSERT INTO organizations (id, name, slug)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Acme Cloud Innovations', 'acme-cloud')
ON CONFLICT (id) DO NOTHING;

-- 2. Demo Profiles
INSERT INTO user_profiles (id, email, full_name, role, organization_id)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'admin@acme.example.com', 'Sarah Connor (Lead Admin)', 'admin', 'a0000000-0000-0000-0000-000000000001'),
    ('b0000000-0000-0000-0000-000000000002', 'recruiter@acme.example.com', 'Alex Mercer (Senior Recruiter)', 'recruiter', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- 3. Demo Target Job
INSERT INTO jobs (id, organization_id, title, department, location, employment_type, description, status, version, created_by)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Senior Full-Stack Cloud Engineer',
    'Platform Engineering',
    'Remote (US / EU / Global)',
    'Full-Time',
    'We are seeking an experienced Full-Stack Cloud Engineer to design scalable microservices and resilient web applications. The ideal candidate has deep expertise in TypeScript, Node.js, modern relational databases (PostgreSQL or equivalent enterprise SQL), modern frontend frameworks (React/Next.js), containerization (Docker), and cloud system architecture.',
    'active',
    1,
    'b0000000-0000-0000-0000-000000000001'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Screening Criteria with Explicit Semantic Equivalence Rules
INSERT INTO screening_criteria (
    id, job_id, min_years_experience, required_skills, preferred_skills, 
    required_education, semantic_equivalence_rules, scoring_weights, pass_threshold_score
)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    4,
    '["TypeScript", "Node.js", "PostgreSQL", "React", "Docker", "System Architecture"]'::jsonb,
    '["GraphQL", "Redis", "Next.js", "Kubernetes", "AWS", "CI/CD"]'::jsonb,
    'Bachelor in Computer Science, Software Engineering, or equivalent practical experience',
    '[
        {"source": "MySQL", "target": "PostgreSQL", "relationship": "relational_db_family", "weight": 0.95, "explanation": "Deep MySQL indexing & ACID knowledge translates seamlessly to PostgreSQL"},
        {"source": "FastAPI", "target": "Node.js", "relationship": "backend_api_architecture", "weight": 0.85, "explanation": "REST/async backend concepts apply across Node and Python stacks"},
        {"source": "Vue.js", "target": "React", "relationship": "reactive_component_framework", "weight": 0.90, "explanation": "SPA state management and component lifecycle easily transfer to React"},
        {"source": "Kubernetes", "target": "Docker", "relationship": "container_orchestration", "weight": 1.00, "explanation": "Kubernetes implies containerization competency"},
        {"source": "MongoDB", "target": "PostgreSQL", "relationship": "data_persistence", "weight": 0.75, "explanation": "Database modeling experience provides partial credit for data persistence"}
    ]'::jsonb,
    '{"skills": 40, "experience": 30, "education": 15, "domain": 15}'::jsonb,
    65
)
ON CONFLICT (id) DO NOTHING;

-- 5. Interviewer Setup
INSERT INTO interviewers (id, organization_id, user_id, name, email, timezone, active)
VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'Sarah Connor',
    'sarah.connor@acme.example.com',
    'America/New_York',
    true
)
ON CONFLICT (id) DO NOTHING;
