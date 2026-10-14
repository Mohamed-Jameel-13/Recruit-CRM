import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export interface ExtractedCandidateData {
  text: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  skills: string[];
  yearsExperience?: number;
  education?: string[];
}

export async function extractResumeData(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ExtractedCandidateData> {
  let rawText = '';

  const lowerName = fileName.toLowerCase();
  const isPdf = mimeType.includes('pdf') || lowerName.endsWith('.pdf');
  const isDocx = mimeType.includes('word') || lowerName.endsWith('.docx') || mimeType.includes('document');

  if (isPdf) {
    try {
      const parser = new PDFParse({ data: fileBuffer });
      const result = await parser.getText();
      rawText = result.text;
    } catch (err: unknown) {
      throw new Error(`Failed to parse PDF "${fileName}": ${err instanceof Error ? err.message : 'Corrupted or unreadable PDF'}`);
    }
  } else if (isDocx) {
    try {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      rawText = result.value;
    } catch (err: unknown) {
      throw new Error(`Failed to parse DOCX "${fileName}": ${err instanceof Error ? err.message : 'Corrupted or unreadable DOCX'}`);
    }
  } else {
    // Attempt plain text fallback
    rawText = fileBuffer.toString('utf-8');
    if (!rawText || rawText.trim().length === 0) {
      throw new Error(`Unsupported file type or empty file: ${fileName} (${mimeType})`);
    }
  }

  if (!rawText || rawText.trim().length < 20) {
    throw new Error(`The resume file "${fileName}" does not contain sufficient legible text.`);
  }

  return extractMetadataFromText(rawText, fileName);
}

export function extractMetadataFromText(text: string, fallbackFileName: string): ExtractedCandidateData {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Extract Email
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const emailMatches = text.match(emailRegex);
  const email = emailMatches && emailMatches.length > 0 ? emailMatches[0].toLowerCase() : undefined;

  // 2. Extract Phone
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phoneMatches = text.match(phoneRegex);
  const phone = phoneMatches && phoneMatches.length > 0 ? phoneMatches[0] : undefined;

  // 3. Extract Links
  const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/gi;
  const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/gi;
  const linkedinMatches = text.match(linkedinRegex);
  const githubMatches = text.match(githubRegex);
  const linkedinUrl = linkedinMatches ? linkedinMatches[0] : undefined;
  const githubUrl = githubMatches ? githubMatches[0] : undefined;

  // 4. Candidate Name: inspect top lines or file name
  let name = '';
  if (lines.length > 0) {
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (
        !line.includes('@') &&
        !line.includes('http') &&
        !line.match(/\d{4}/) &&
        line.split(' ').length >= 2 &&
        line.split(' ').length <= 4 &&
        line.length < 50
      ) {
        name = line;
        break;
      }
    }
  }

  if (!name) {
    name = fallbackFileName
      .replace(/\.(pdf|docx|txt)$/i, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b(cv|resume|profile|document)\b/gi, '')
      .trim();
  }

  // 5. Extract Skills
  const COMMON_SKILLS = [
    'TypeScript', 'JavaScript', 'Node.js', 'PostgreSQL', 'MySQL', 'MongoDB', 'React', 'Next.js',
    'Vue.js', 'Angular', 'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Python', 'FastAPI',
    'Django', 'Flask', 'Go', 'Golang', 'Java', 'Spring Boot', 'C#', '.NET', 'GraphQL',
    'REST', 'Redis', 'Kafka', 'RabbitMQ', 'Git', 'CI/CD', 'Terraform', 'System Architecture',
    'Microservices', 'SQL', 'NoSQL', 'Linux', 'Tailwind CSS', 'CSS', 'HTML', 'Jest', 'Vitest'
  ];

  const lowerText = text.toLowerCase();
  const detectedSkills = COMMON_SKILLS.filter(skill => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, 'i');
    return regex.test(lowerText);
  });

  // 6. Estimate Years of Experience
  let yearsExperience = 0;
  const expRegex = /(\d+)\+?\s*(?:years|yrs)\s*(?:of)?\s*(?:experience|exp)/gi;
  const expMatch = expRegex.exec(text);
  if (expMatch && expMatch[1]) {
    yearsExperience = parseInt(expMatch[1], 10);
  } else {
    const yearRangeRegex = /(?:20\d{2}|19\d{2})\s*(?:-|–|to)\s*(?:20\d{2}|present|current)/gi;
    const ranges = text.match(yearRangeRegex) || [];
    if (ranges.length > 0) {
      yearsExperience = Math.min(ranges.length * 2, 15);
    }
  }

  return {
    text,
    name: name || 'Candidate',
    email: email || `candidate_${Date.now()}@example.com`,
    phone,
    location: undefined,
    linkedinUrl,
    githubUrl,
    skills: detectedSkills,
    yearsExperience: yearsExperience || 3,
    education: ['Computer Science or related technical discipline']
  };
}
