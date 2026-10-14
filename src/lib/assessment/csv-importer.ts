import Papa from 'papaparse';

export interface CSVRowData {
  [key: string]: string;
}

export interface CSVColumnMapping {
  emailColumn: string;
  scoreColumn: string;
  maxScoreColumn?: string;
  completionDateColumn?: string;
  candidateNameColumn?: string;
}

export interface ParsedAssessmentRecord {
  email: string;
  score: number;
  maxScore: number;
  percentageScore: number;
  passed: boolean;
  completionDate?: string;
  candidateName?: string;
  rawRow: Record<string, string>;
  isValid: boolean;
  errors: string[];
}

export interface CSVImportResult {
  totalRows: number;
  validRows: ParsedAssessmentRecord[];
  invalidRows: Array<{ rowNumber: number; raw: Record<string, string>; errors: string[] }>;
  duplicateCount: number;
}

export function parseAndValidateCSV(
  csvContent: string,
  mapping: CSVColumnMapping,
  passThresholdPercentage: number = 70
): CSVImportResult {
  const parsed = Papa.parse<CSVRowData>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  });

  const validRows: ParsedAssessmentRecord[] = [];
  const invalidRows: Array<{ rowNumber: number; raw: Record<string, string>; errors: string[] }> = [];
  const seenEmails = new Set<string>();
  let duplicateCount = 0;

  parsed.data.forEach((row, index) => {
    const rowNumber = index + 1;
    const errors: string[] = [];

    const emailRaw = row[mapping.emailColumn]?.trim() || '';
    const scoreRaw = row[mapping.scoreColumn]?.trim() || '';
    const maxScoreRaw = mapping.maxScoreColumn ? row[mapping.maxScoreColumn]?.trim() : '100';
    const dateRaw = mapping.completionDateColumn ? row[mapping.completionDateColumn]?.trim() : undefined;
    const nameRaw = mapping.candidateNameColumn ? row[mapping.candidateNameColumn]?.trim() : undefined;

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRaw || !emailRegex.test(emailRaw)) {
      errors.push(`Invalid or missing email address: "${emailRaw}"`);
    }

    // Check duplicates in CSV
    const normalizedEmail = emailRaw.toLowerCase();
    if (seenEmails.has(normalizedEmail)) {
      errors.push(`Duplicate email entry within CSV file: "${emailRaw}"`);
      duplicateCount++;
    } else if (normalizedEmail) {
      seenEmails.add(normalizedEmail);
    }

    // Validate score
    const score = parseFloat(scoreRaw);
    const maxScore = parseFloat(maxScoreRaw || '100');

    if (isNaN(score)) {
      errors.push(`Score "${scoreRaw}" is not a valid number`);
    } else if (score < 0) {
      errors.push(`Score cannot be negative`);
    }

    if (isNaN(maxScore) || maxScore <= 0) {
      errors.push(`Max score "${maxScoreRaw}" must be a positive number`);
    } else if (score > maxScore) {
      errors.push(`Score (${score}) exceeds max score (${maxScore})`);
    }

    if (errors.length > 0) {
      invalidRows.push({
        rowNumber,
        raw: row,
        errors
      });
    } else {
      const percentageScore = Number(((score / maxScore) * 100).toFixed(2));
      const passed = percentageScore >= passThresholdPercentage;

      validRows.push({
        email: normalizedEmail,
        score,
        maxScore,
        percentageScore,
        passed,
        completionDate: dateRaw || new Date().toISOString(),
        candidateName: nameRaw,
        rawRow: row,
        isValid: true,
        errors: []
      });
    }
  });

  return {
    totalRows: parsed.data.length,
    validRows,
    invalidRows,
    duplicateCount
  };
}
