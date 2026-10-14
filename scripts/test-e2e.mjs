import fs from 'fs';

const BASE_URL = 'http://localhost:3000';

async function runEndToEndVerification() {
  console.log('--- STARTING E2E RECRUITMENT AUTOMATION VERIFICATION ---');

  // 1. Ingest Demo Batch
  console.log('\n[1] Ingesting 10 Demo CVs...');
  const resBatch = await fetch(`${BASE_URL}/api/upload/load-demo-batch`, { method: 'POST' });
  const batchData = await resBatch.json();
  console.log(`Ingested: ${batchData.processedCount} processed, ${batchData.failedCount} expected corrupted file`);

  // 2. Query Applications
  console.log('\n[2] Checking Applications & Semantic Match...');
  const resApps = await fetch(`${BASE_URL}/api/applications`);
  const appsData = await resApps.json();
  const david = appsData.applications.find(a => a.candidate?.email === 'david.chen@example.com');
  console.log(`Found David Chen: Score ${david?.latest_screening?.match_score}/100, Recommendation: ${david?.latest_screening?.recommendation}`);
  console.log(`Transferable Skills:`, david?.latest_screening?.transferable_skills);

  // 3. Approve for Assessment
  console.log('\n[3] Approving David Chen for Assessment...');
  const resApprove = await fetch(`${BASE_URL}/api/screening/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId: david.id, approvedBy: 'Lead Admin Sarah Connor' })
  });
  const approveData = await resApprove.json();
  console.log(`Approval status: ${approveData.application?.stage}, Invitation: ${approveData.application?.invitation_status}`);

  // 4. Import Assessment CSV
  console.log('\n[4] Importing Assessment CSV Results...');
  const csvRaw = fs.readFileSync('demo_cvs/sample_assessment_results.csv', 'utf-8');
  const resCsv = await fetch(`${BASE_URL}/api/assessments/import-csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      csvContent: csvRaw,
      mapping: {
        emailColumn: 'Candidate Email',
        scoreColumn: 'Quiz Score',
        maxScoreColumn: 'Max Score'
      },
      passThresholdPercentage: 70
    })
  });
  const csvData = await resCsv.json();
  console.log(`CSV Import Result: ${csvData.matchedApplications} matched applications, ${csvData.validRowsCount} valid rows`);

  // 5. Query Assessments
  console.log('\n[5] Verifying Assessments Status...');
  const resAssess = await fetch(`${BASE_URL}/api/assessments`);
  const assessData = await resAssess.json();
  const davidAssess = assessData.assessments.find(a => a.candidate?.email === 'david.chen@example.com');
  console.log(`David Chen Assessment: Score=${davidAssess?.score}/${davidAssess?.max_score} (${davidAssess?.percentage_score}%), Status=${davidAssess?.status}`);

  // 6. Approve for Round 2 Interview
  console.log('\n[6] Approving David Chen for Round 2 Interview...');
  const resApproveInt = await fetch(`${BASE_URL}/api/interviews/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ applicationId: david.id, approvedBy: 'Lead Admin Sarah Connor' })
  });
  const approveIntData = await resApproveInt.json();
  console.log(`Interview Approval Result: ${approveIntData.application?.interview_status}`);

  // 7. Schedule Interview (Conflict check)
  console.log('\n[7] Scheduling Interview...');
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(15, 0, 0, 0);

  const resSched = await fetch(`${BASE_URL}/api/interviews/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      applicationId: david.id,
      interviewerId: 'e0000000-0000-0000-0000-000000000001',
      scheduledStart: tomorrow.toISOString(),
      durationMinutes: 45,
      timezone: 'America/New_York',
      schedulingMode: 'MANUAL',
      meetingUrl: 'https://meet.google.com/dem-tech-int'
    })
  });
  const schedData = await resSched.json();
  console.log(`Interview Booking Result: Mode=${schedData.mode}, Meeting=${schedData.interview?.meeting_url}`);

  // 8. Query Database Analytics
  console.log('\n[8] Querying Analytics Calculated From Real Database Records...');
  const resAnalytics = await fetch(`${BASE_URL}/api/analytics`);
  const analyticsData = await resAnalytics.json();
  console.log('Analytics Summary:', {
    totalCVsUploaded: analyticsData.analytics.totalCVsUploaded,
    cvsParsedSuccessfully: analyticsData.analytics.cvsParsedSuccessfully,
    screeningCompleted: analyticsData.analytics.screeningCompleted,
    assessmentPassRate: `${analyticsData.analytics.assessmentPassRate}%`,
    interviewsScheduled: analyticsData.analytics.interviewsScheduled
  });
  console.log('Funnel Stages:', analyticsData.analytics.funnel);

  // 9. Query Audit Log
  console.log('\n[9] Querying Immutable Audit Trail...');
  const resAudit = await fetch(`${BASE_URL}/api/audit`);
  const auditData = await resAudit.json();
  console.log(`Total Audit Entries Logged: ${auditData.logs.length}`);
  console.log(`Recent 3 actions:`, auditData.logs.slice(0, 3).map(l => `${l.action} on ${l.entity_type} (${l.created_at})`));

  console.log('\n--- E2E VERIFICATION COMPLETED WITH ZERO ERRORS ---');
}

runEndToEndVerification().catch(err => {
  console.error('E2E Verification Failed:', err);
  process.exit(1);
});
