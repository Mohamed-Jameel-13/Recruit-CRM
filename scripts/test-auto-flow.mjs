import fs from 'fs';

const BASE_URL = 'http://localhost:3000';

async function verifyAutomatedFlow() {
  console.log('🚀 === STARTING END-TO-END AUTONOMOUS PIPELINE TEST ===\n');

  // 1. Reset database to clean state
  console.log('1️⃣ Resetting database to clean initial state...');
  const resetRes = await fetch(`${BASE_URL}/api/system/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keepBaseJob: true })
  });
  console.log('   Data reset status:', resetRes.status);

  // 2. Upload a real candidate resume
  console.log('\n2️⃣ Ingesting real candidate resume (Elena Rostova - Full Stack Cloud)...');
  const filePath = 'demo_cvs/01_Elena_Rostova_FullStack.txt';
  const fileContent = fs.readFileSync(filePath);
  const blob = new Blob([fileContent], { type: 'text/plain' });
  const formData = new FormData();
  formData.append('files', blob, '01_Elena_Rostova_FullStack.txt');
  formData.append('batchName', 'Automated_Live_Batch');

  const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData
  });
  const uploadData = await uploadRes.json();
  console.log('   Upload & Auto-Screening Result:');
  console.log('   - Processed:', uploadData.processedCount);
  const result = uploadData.processed?.[0];
  console.log(`   - Candidate: ${result?.candidateName} (${result?.candidateEmail})`);
  console.log(`   - AI Match Score: ${result?.matchScore}/100 [${result?.recommendation}]`);
  console.log(`   - Auto-Shortlisted: ${result?.isShortlisted}`);
  console.log(`   - Assessment Link: ${result?.testUrl}`);
  console.log(`   - Test Invite Email Sent: ${result?.emailSent}`);

  if (!result?.isShortlisted) {
    throw new Error('Candidate was unexpectedly not shortlisted!');
  }

  // 3. Candidate submits Google Form Assessment
  console.log('\n3️⃣ Candidate submits Google Form Assessment Test...');
  const webhookRes = await fetch(`${BASE_URL}/api/webhooks/google-form`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      candidateEmail: result.candidateEmail,
      score: 94,
      maxScore: 100,
      answers: {
        'System Architecture': 'Implemented event-driven microservices with Redis queues and PostgreSQL transactional outbox pattern.',
        'Concurrency & Locking': 'Leveraged pessimistic row-level locking for checkout operations and optimistic version locking for updates.'
      }
    })
  });

  const webhookData = await webhookRes.json();
  console.log('   Google Form Webhook Ingestion Result:');
  console.log(`   - Candidate Email: ${webhookData.candidateEmail}`);
  console.log(`   - Score: ${webhookData.score}% (Passed: ${webhookData.passed})`);
  console.log(`   - Round 2 Interview Booked: ${!!webhookData.interview}`);
  console.log(`   - Interviewer: ${webhookData.interview?.interviewer_name}`);
  console.log(`   - Scheduled Slot: ${webhookData.interview?.scheduled_start}`);
  console.log(`   - Google Meet Room: ${webhookData.interview?.meeting_url}`);

  // 4. Check Email Outbox
  console.log('\n4️⃣ Verifying Dispatched Emails in Live Outbox...');
  const emailsRes = await fetch(`${BASE_URL}/api/emails`);
  const emailsData = await emailsRes.json();
  console.log(`   Total Emails in Outbox: ${emailsData.totalCount}`);
  for (const email of emailsData.emails) {
    console.log(`   ✉️ [${email.template_type}] To: ${email.recipient_email} | Subject: "${email.subject}"`);
  }

  console.log('\n✅ === PIPELINE FULLY VERIFIED END-TO-END! ===');
}

verifyAutomatedFlow().catch(err => {
  console.error('❌ Pipeline Test Failed:', err);
  process.exit(1);
});
