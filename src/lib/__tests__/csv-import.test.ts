import { describe, it, expect } from 'vitest';
import { parseAndValidateCSV } from '../assessment/csv-importer';

describe('CSV Assessment Result Import & Validation', () => {
  it('should parse valid CSV assessment rows and compute pass/fail correctly', () => {
    const csvData = `Candidate Email,Score,Max Score,Name
elena.rostova@example.com,88,100,Elena Rostova
david.chen@example.com,78,100,David Chen
jordan.vance@example.com,52,100,Jordan Vance`;

    const result = parseAndValidateCSV(
      csvData,
      {
        emailColumn: 'Candidate Email',
        scoreColumn: 'Score',
        maxScoreColumn: 'Max Score',
        candidateNameColumn: 'Name'
      },
      70 // Pass threshold
    );

    expect(result.totalRows).toBe(3);
    expect(result.validRows.length).toBe(3);
    expect(result.invalidRows.length).toBe(0);

    const elena = result.validRows.find(r => r.email === 'elena.rostova@example.com');
    expect(elena?.passed).toBe(true);
    expect(elena?.percentageScore).toBe(88);

    const jordan = result.validRows.find(r => r.email === 'jordan.vance@example.com');
    expect(jordan?.passed).toBe(false);
    expect(jordan?.percentageScore).toBe(52);
  });

  it('should detect invalid emails, non-numeric scores, and duplicate rows', () => {
    const badCsvData = `Candidate Email,Score
not-an-email,90
elena@example.com,NaN
elena@example.com,85`;

    const result = parseAndValidateCSV(
      badCsvData,
      {
        emailColumn: 'Candidate Email',
        scoreColumn: 'Score'
      },
      70
    );

    expect(result.invalidRows.length).toBeGreaterThan(0);
    expect(result.duplicateCount).toBe(1);
  });
});
