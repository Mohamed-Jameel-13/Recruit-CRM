import { describe, it, expect } from 'vitest';
import { extractResumeData } from '../extractor/parser';

describe('Document Extractor Suite', () => {
  it('should extract text and metadata from a valid plain text resume', async () => {
    const resumeText = `
Elena Rostova
elena.rostova@example.com
+1 (555) 234-5678
github.com/erostova

Summary:
Senior Full Stack Engineer with 6 years of experience building distributed systems in TypeScript, React, and Node.js.
Proficient in PostgreSQL, Docker, and AWS.

Education:
B.S. in Computer Science
    `;
    const buffer = Buffer.from(resumeText, 'utf-8');
    const result = await extractResumeData(buffer, 'Elena_Rostova.txt', 'text/plain');

    expect(result.name).toBe('Elena Rostova');
    expect(result.email).toBe('elena.rostova@example.com');
    expect(result.skills).toContain('TypeScript');
    expect(result.skills).toContain('React');
    expect(result.skills).toContain('Node.js');
    expect(result.yearsExperience).toBeGreaterThanOrEqual(5);
  });

  it('should extract text from a valid PDF document with text stream', async () => {
    const dummyPdf = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R /MediaBox [0 0 612 792] >>\nendobj\n4 0 obj\n<< /Length 72 >>\nstream\nBT\n/F1 12 Tf\n72 712 Td\n(David Chen david.chen@example.com Senior Engineer with React and Docker) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n338\n%%EOF'
    );

    const result = await extractResumeData(dummyPdf, 'David_Chen.pdf', 'application/pdf');
    expect(result.text).toContain('David Chen');
    expect(result.email).toBe('david.chen@example.com');
  });

  it('should reject a binary PDF with compressed streams and no text layer rather than returning binary garbage', async () => {
    // Simulated scanned/corrupted PDF with pure binary streams
    const binaryGarbagePdf = Buffer.from(
      '%PDF-1.5\n%\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Filter /FlateDecode /Length 12 >>\nstream\nx+/24400\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000015 00000 n \n0000000064 00000 n \n0000000122 00000 n \n0000000180 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n260\n%%EOF'
    );

    await expect(
      extractResumeData(binaryGarbagePdf, 'scanned_binary.pdf', 'application/pdf')
    ).rejects.toThrow();
  });
});
