import { describe, it, expect } from 'vitest';
import { 
  evaluateCandidateSemantics, 
  findSemanticEquivalence, 
  CANONICAL_SEMANTIC_MATRIX,
  ScreeningOutputSchema
} from '../screening/engine';
import { ScreeningCriteria } from '@/types/database';

describe('Intelligent Semantic Matching Engine', () => {
  const sampleCriteria: ScreeningCriteria = {
    id: 'crit-test-1',
    job_id: 'job-test-1',
    min_years_experience: 4,
    required_skills: ['TypeScript', 'Node.js', 'PostgreSQL', 'React', 'Docker'],
    preferred_skills: ['AWS', 'Redis'],
    required_education: 'Bachelor degree in CS',
    semantic_equivalence_rules: [
      {
        source: 'MySQL',
        target: 'PostgreSQL',
        relationship: 'relational_db_family',
        weight: 0.95,
        explanation: 'Deep MySQL knowledge transfers cleanly to PostgreSQL'
      }
    ],
    scoring_weights: { skills: 40, experience: 30, education: 15, domain: 15 },
    pass_threshold_score: 65,
    version: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  it('should find semantic equivalence for MySQL when PostgreSQL is required', () => {
    const candidateSkills = ['TypeScript', 'Node.js', 'MySQL', 'React', 'Docker'];
    const match = findSemanticEquivalence(candidateSkills, 'PostgreSQL', sampleCriteria.semantic_equivalence_rules);

    expect(match).not.toBeNull();
    expect(match?.candidate_skill).toBe('MySQL');
    expect(match?.target_skill).toBe('PostgreSQL');
    expect(match?.credit_percentage).toBeGreaterThanOrEqual(90);
  });

  it('should not drop score for candidate with MySQL instead of PostgreSQL', () => {
    // Elena has exact PostgreSQL
    const exactCandidateSkills = ['TypeScript', 'Node.js', 'PostgreSQL', 'React', 'Docker'];
    const exactResult = evaluateCandidateSemantics(
      'Senior engineer with PostgreSQL schema design and TypeScript',
      exactCandidateSkills,
      5,
      sampleCriteria
    );

    // David has MySQL instead of PostgreSQL
    const semanticCandidateSkills = ['TypeScript', 'Node.js', 'MySQL', 'React', 'Docker'];
    const semanticResult = evaluateCandidateSemantics(
      'Senior engineer with 5 years of MySQL database optimization and TypeScript microservices',
      semanticCandidateSkills,
      5,
      sampleCriteria
    );

    expect(semanticResult.matchScore).toBeGreaterThanOrEqual(sampleCriteria.pass_threshold_score);
    expect(semanticResult.transferableSkills.length).toBeGreaterThan(0);
    expect(semanticResult.transferableSkills[0].candidate_skill).toBe('MySQL');
    // Score difference should be negligible (within 2-3 points) due to high 95% equivalence
    expect(Math.abs(exactResult.matchScore - semanticResult.matchScore)).toBeLessThanOrEqual(5);
  });

  it('should match Vue.js as a transferable skill for React', () => {
    const candidateSkills = ['TypeScript', 'Node.js', 'PostgreSQL', 'Vue.js', 'Docker'];
    const result = evaluateCandidateSemantics(
      'Full stack engineer with Vue.js component architecture and state management',
      candidateSkills,
      5,
      sampleCriteria
    );

    const vueTransfer = result.transferableSkills.find(t => t.candidate_skill === 'Vue.js');
    expect(vueTransfer).toBeDefined();
    expect(vueTransfer?.target_skill).toBe('React');
    expect(result.matchScore).toBeGreaterThanOrEqual(75);
  });

  it('should output data that strictly validates against ScreeningOutputSchema', () => {
    const candidateSkills = ['TypeScript', 'Node.js', 'MySQL', 'React', 'Docker'];
    const result = evaluateCandidateSemantics(
      'Senior developer with MySQL and TypeScript',
      candidateSkills,
      6,
      sampleCriteria
    );

    const validated = ScreeningOutputSchema.safeParse(result);
    expect(validated.success).toBe(true);
  });
});
