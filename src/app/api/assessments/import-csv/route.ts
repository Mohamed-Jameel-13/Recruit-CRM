import { NextRequest, NextResponse } from 'next/server';
import { parseAndValidateCSV } from '@/lib/assessment/csv-importer';
import { db } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { csvContent, mapping, passThresholdPercentage } = body;

    if (!csvContent || !mapping || !mapping.emailColumn || !mapping.scoreColumn) {
      return NextResponse.json({ 
        error: 'Missing required parameters: csvContent, emailColumn, and scoreColumn.' 
      }, { status: 400 });
    }

    const threshold = passThresholdPercentage ? parseFloat(passThresholdPercentage) : 70;
    const parseResult = parseAndValidateCSV(csvContent, mapping, threshold);

    const applications = db.getApplications();
    const assessments = db.getAssessments();

    let matchedCount = 0;
    let unmatchedCount = 0;
    const matchDetails = [];

    for (const record of parseResult.validRows) {
      // Find candidate application by email
      const app = applications.find(
        a => a.candidate?.email.toLowerCase() === record.email.toLowerCase()
      );

      if (app) {
        // Find or create assessment assignment
        let assignment = assessments.find(a => a.application_id === app.id);
        if (!assignment) {
          db.approveForAssessment(app.id, 'CSV Importer');
          assignment = db.getAssessments().find(a => a.application_id === app.id);
        }

        if (assignment) {
          db.saveAssessmentResult(assignment.id, {
            score: record.score,
            maxScore: record.maxScore,
            source: 'csv_import',
            verified: true,
            verifiedBy: 'CSV Import Batch',
            details: {
              rawRow: record.rawRow,
              completionDate: record.completionDate
            }
          });
          matchedCount++;
          matchDetails.push({
            email: record.email,
            status: 'matched',
            score: record.score,
            passed: record.passed
          });
        }
      } else {
        unmatchedCount++;
        matchDetails.push({
          email: record.email,
          status: 'unmatched_candidate',
          score: record.score,
          passed: record.passed
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalRows: parseResult.totalRows,
      validRowsCount: parseResult.validRows.length,
      invalidRowsCount: parseResult.invalidRows.length,
      duplicateCount: parseResult.duplicateCount,
      matchedApplications: matchedCount,
      unmatchedCandidates: unmatchedCount,
      invalidRows: parseResult.invalidRows,
      matchDetails
    });
  } catch (err: unknown) {
    return NextResponse.json({ 
      error: 'Failed to process CSV assessment import', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
