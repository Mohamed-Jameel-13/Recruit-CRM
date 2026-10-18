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

function isBinaryStreamOrGarbage(text: string): boolean {
  if (!text || text.trim().length < 25) return true;

  // Check for PDF stream or object header leakage
  if (
    text.includes('%PDF-') ||
    text.includes('/FlateDecode') ||
    text.includes('/Filter') ||
    text.includes('endstream') ||
    text.includes('endobj')
  ) {
    const stripped = text
      .replace(/%PDF-[\d.]+/g, '')
      .replace(/\d+\s+\d+\s+obj[\s\S]*?endobj/g, '')
      .replace(/stream[\s\S]*?endstream/g, '')
      .replace(/<<[\s\S]*?>>/g, '')
      .replace(/xref[\s\S]*?%%EOF/g, '')
      .trim();
    if (stripped.length < 50) return true;
  }

  // Check for DOCX zip binary leakage
  if (
    text.startsWith('PK\x03\x04') ||
    text.includes('[Content_Types].xml') ||
    text.includes('word/document.xml')
  ) {
    return true;
  }

  // Check ratio of readable alphanumeric characters vs binary symbols
  const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
  const ratio = alphanumericCount / text.length;
  if (ratio < 0.25) return true;

  // Check for at least some recognizable words
  const words = text.split(/\s+/).filter(w => w.length >= 3 && /^[a-zA-Z]+$/.test(w));
  if (words.length < 5) return true;

  return false;
}

async function extractTextFromPdf(fileBuffer: Buffer, fileName: string): Promise<string> {
  // Strategy 1: pdfjs-dist legacy Node.js build (robust, handles encodings & CMaps without canvas)
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(fileBuffer),
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
      useWorkerFetch: false,
    });
    const doc = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items || [])
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean)
        .join(' ');
      if (pageText.trim()) {
        fullText += pageText + '\n\n';
      }
    }
    if (fullText.trim().length >= 30 && !isBinaryStreamOrGarbage(fullText)) {
      return fullText.trim();
    }
  } catch (pdfjsErr) {
    console.warn(`PDF.js legacy parse notice for "${fileName}":`, pdfjsErr instanceof Error ? pdfjsErr.message : String(pdfjsErr));
  }

  // Strategy 2: pdf-parse v2 PDFParse class
  try {
    const pdfModule = await import('pdf-parse');
    const PDFParseClass = (pdfModule as any).PDFParse || (pdfModule as any).default;
    if (typeof PDFParseClass === 'function') {
      const parser = new PDFParseClass({ data: new Uint8Array(fileBuffer) });
      const result = await parser.getText();
      await parser.destroy();
      const text = result?.text || '';
      if (text.trim().length >= 30 && !isBinaryStreamOrGarbage(text)) {
        return text.trim();
      }
    }
  } catch (pdfParseErr) {
    console.warn(`pdf-parse notice for "${fileName}":`, pdfParseErr instanceof Error ? pdfParseErr.message : String(pdfParseErr));
  }

  // Strategy 3: Direct zlib FlateDecode stream extractor for PDFs with uncompressed/compressed text streams
  try {
    const zlib = await import('zlib');
    const rawBinary = fileBuffer.toString('binary');
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match: RegExpExecArray | null;
    let fallbackText = '';
    while ((match = streamRegex.exec(rawBinary)) !== null) {
      const streamBytes = Buffer.from(match[1], 'binary');
      let decompressed: string | null = null;
      try {
        decompressed = zlib.inflateSync(streamBytes).toString('utf-8');
      } catch {
        try {
          decompressed = zlib.inflateRawSync(streamBytes).toString('utf-8');
        } catch {}
      }
      const block = decompressed || match[1];
      const tjRegex = /\(([^)]+)\)\s*Tj/g;
      let tjMatch: RegExpExecArray | null;
      while ((tjMatch = tjRegex.exec(block)) !== null) {
        fallbackText += tjMatch[1] + ' ';
      }
      const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
      let tjaMatch: RegExpExecArray | null;
      while ((tjaMatch = tjArrayRegex.exec(block)) !== null) {
        const parts = tjaMatch[1].match(/\(([^)]*)\)/g) || [];
        for (const p of parts) {
          fallbackText += p.slice(1, -1) + ' ';
        }
      }
    }
    if (fallbackText.trim().length >= 30 && !isBinaryStreamOrGarbage(fallbackText)) {
      return fallbackText.trim();
    }
  } catch {}

  throw new Error(
    `The PDF "${fileName}" does not contain extractable text. It may be a scanned image or binary-encoded document without a readable text layer. Please upload a text-based PDF or DOCX file.`
  );
}

async function extractTextFromDocx(fileBuffer: Buffer, fileName: string): Promise<string> {
  try {
    const mammothModule = await import('mammoth');
    const mammoth = (mammothModule as any).default || mammothModule;
    const result = await mammoth.extractRawText({ buffer: fileBuffer });
    const text = result?.value || '';
    if (text.trim().length >= 20 && !isBinaryStreamOrGarbage(text)) {
      return text.trim();
    }
  } catch (docxErr) {
    console.warn(`DOCX parse error for "${fileName}":`, docxErr instanceof Error ? docxErr.message : String(docxErr));
  }

  throw new Error(
    `Unable to extract readable text from DOCX file "${fileName}". Please ensure the file is not password-protected or corrupted.`
  );
}

export async function extractResumeData(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ExtractedCandidateData> {
  let rawText = '';

  const lowerName = fileName.toLowerCase();
  const isPdf = mimeType.includes('pdf') || lowerName.endsWith('.pdf');
  const isDocx =
    mimeType.includes('word') ||
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc') ||
    mimeType.includes('document');

  if (isPdf) {
    rawText = await extractTextFromPdf(fileBuffer, fileName);
  } else if (isDocx) {
    rawText = await extractTextFromDocx(fileBuffer, fileName);
  } else {
    // Plain text / RTF / Markdown
    rawText = fileBuffer.toString('utf-8');
    if (isBinaryStreamOrGarbage(rawText)) {
      throw new Error(
        `The file "${fileName}" does not contain legible candidate text. Please upload a text-based PDF, DOCX, or TXT file.`
      );
    }
  }

  if (!rawText || rawText.trim().length < 20 || isBinaryStreamOrGarbage(rawText)) {
    throw new Error(
      `The resume file "${fileName}" does not contain sufficient legible text to evaluate. Please provide a text-based document.`
    );
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
