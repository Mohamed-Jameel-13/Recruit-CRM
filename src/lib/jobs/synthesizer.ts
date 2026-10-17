import { ScreeningCriteria, SemanticRule } from '@/types/database';
import { CANONICAL_SEMANTIC_MATRIX } from '@/lib/screening/engine';

export interface SynthesizedRubric {
  minYearsExperience: number;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredEducation: string;
  semanticEquivalenceRules: SemanticRule[];
  scoringWeights: { skills: number; experience: number; education: number; domain: number };
  passThresholdScore: number;
  department: string;
  location: string;
}

const COMMON_TECH_SKILLS = [
  'TypeScript', 'JavaScript', 'Node.js', 'PostgreSQL', 'MySQL', 'MongoDB', 'React', 'Next.js',
  'Vue.js', 'Angular', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Python', 'FastAPI',
  'Django', 'Flask', 'Go', 'Golang', 'Java', 'Spring Boot', 'C#', '.NET', 'GraphQL',
  'REST', 'Redis', 'Kafka', 'RabbitMQ', 'Git', 'CI/CD', 'Terraform', 'System Architecture',
  'Microservices', 'SQL', 'NoSQL', 'Linux', 'Tailwind CSS', 'CSS', 'HTML', 'Jest', 'Vitest'
];

/**
 * Automatically synthesizes comprehensive screening criteria from just Role and Job Description.
 * Users do NOT need to fill out skills, min experience, or semantic equivalence rules manually.
 */
export function synthesizeJobCriteria(title: string, description: string): SynthesizedRubric {
  const combinedText = `${title}\n${description}`.toLowerCase();

  // 1. Infer Experience Level
  let minYears = 3;
  const expMatch = /(\d+)\+?\s*(?:years|yrs)\s*(?:of)?\s*(?:experience|exp)/i.exec(description);
  if (expMatch && expMatch[1]) {
    minYears = parseInt(expMatch[1], 10);
  } else {
    // Infer from title seniority
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('staff') || lowerTitle.includes('principal') || lowerTitle.includes('director')) {
      minYears = 7;
    } else if (lowerTitle.includes('lead') || lowerTitle.includes('architect')) {
      minYears = 6;
    } else if (lowerTitle.includes('senior') || lowerTitle.includes('sr')) {
      minYears = 5;
    } else if (lowerTitle.includes('junior') || lowerTitle.includes('entry') || lowerTitle.includes('associate')) {
      minYears = 1;
    } else {
      minYears = 3;
    }
  }

  // 2. Extract Required Skills
  const detectedSkills = COMMON_TECH_SKILLS.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    return regex.test(combinedText);
  });

  // Default to at least core stack if JD is brief
  const requiredSkills = detectedSkills.length > 0 
    ? detectedSkills.slice(0, 8)
    : ['TypeScript', 'Node.js', 'PostgreSQL', 'React', 'Docker'];

  const preferredSkills = detectedSkills.length > 8 
    ? detectedSkills.slice(8, 14) 
    : ['Redis', 'AWS', 'CI/CD', 'System Architecture'];

  // 3. Dynamically Activate Semantic Equivalence Rules based on required skills
  const semanticRules: SemanticRule[] = [];
  for (const reqSkill of requiredSkills) {
    for (const item of CANONICAL_SEMANTIC_MATRIX) {
      if (item.targetSkill.toLowerCase() === reqSkill.toLowerCase()) {
        for (const candidateSkill of item.candidateSkills.slice(0, 2)) {
          semanticRules.push({
            source: candidateSkill.toUpperCase(),
            target: reqSkill,
            relationship: item.relationship,
            weight: Number((item.creditPercentage / 100).toFixed(2)),
            explanation: item.explanation
          });
        }
      }
    }
  }

  // Deduplicate rules
  const uniqueRules: SemanticRule[] = [];
  const seen = new Set<string>();
  for (const r of semanticRules) {
    const key = `${r.source}->${r.target}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRules.push(r);
    }
  }

  // 4. Infer Department & Location
  let department = 'Engineering';
  if (combinedText.includes('platform') || combinedText.includes('infrastructure') || combinedText.includes('devops')) {
    department = 'Platform Engineering';
  } else if (combinedText.includes('frontend') || combinedText.includes('ui') || combinedText.includes('design')) {
    department = 'Frontend Engineering';
  } else if (combinedText.includes('data') || combinedText.includes('ai') || combinedText.includes('machine learning')) {
    department = 'Data & AI Engineering';
  }

  let location = 'Remote (Global)';
  if (combinedText.includes('hybrid')) {
    location = 'Hybrid';
  } else if (combinedText.includes('on-site') || combinedText.includes('onsite')) {
    location = 'On-site';
  }

  return {
    minYearsExperience: minYears,
    requiredSkills,
    preferredSkills,
    requiredEducation: 'Bachelor in Computer Science or equivalent practical industry experience',
    semanticEquivalenceRules: uniqueRules,
    scoringWeights: { skills: 40, experience: 30, education: 15, domain: 15 },
    passThresholdScore: 65,
    department,
    location
  };
}
