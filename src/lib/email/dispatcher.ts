import { db } from '@/lib/db/repository';
import { SentEmail } from '@/types/database';
import { dispatchRealSmtpEmail } from './mailer';

export const emailDispatcher = {
  /**
   * Dispatch Technical Assessment invitation email to candidate
   */
  sendAssessmentInvitation(params: {
    applicationId: string;
    candidateEmail: string;
    candidateName: string;
    jobTitle: string;
    testUrl: string;
    dueDate?: string;
    passThreshold?: number;
  }): SentEmail {
    const {
      applicationId,
      candidateEmail,
      candidateName,
      jobTitle,
      testUrl,
      dueDate = '7 days from receipt',
      passThreshold = 70
    } = params;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const absoluteTestUrl = testUrl.startsWith('http://') || testUrl.startsWith('https://')
      ? testUrl
      : `${cleanBaseUrl}/${testUrl.replace(/^\/+/, '')}`;

    const subject = `Action Required: Technical Assessment for ${jobTitle}`;
    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff; color: #111827;">
        <div style="margin-bottom: 20px;">
          <span style="background-color: #eff6ff; color: #2563eb; font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 9999px; border: 1px solid #bfdbfe;">
            Step 2: Technical Assessment Challenge
          </span>
        </div>
        
        <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 12px;">
          Hello ${candidateName},
        </h2>
        
        <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 16px;">
          Congratulations! Your profile has successfully passed our initial AI competency screening for the <strong>${jobTitle}</strong> position.
        </p>
        
        <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 20px;">
          The next step in our process is an interactive technical challenge designed to evaluate your system architecture, API design, and database concurrency skills.
        </p>
        
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #374151; line-height: 1.7;">
            <li><strong>Duration:</strong> Approximately 45 minutes</li>
            <li><strong>Minimum Pass Score:</strong> ${passThreshold}%</li>
            <li><strong>Due By:</strong> ${dueDate}</li>
            <li><strong>Automation:</strong> Scoring and Round 2 shortlisting are evaluated instantly upon submission.</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 28px 0 16px;">
          <a href="${absoluteTestUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block;">
            Open Technical Assessment Challenge
          </a>
        </div>
        
        <p style="font-size: 12px; color: #6b7280; text-align: center; margin-bottom: 24px; line-height: 1.5;">
          Direct Link: <a href="${absoluteTestUrl}" style="color: #2563eb; text-decoration: underline;">${absoluteTestUrl}</a>
          <br />
          <span style="color: #9ca3af; font-size: 11px;">(Testing locally on your machine? <a href="http://localhost:3000/${testUrl.replace(/^\/+/, '')}" style="color: #2563eb;">Open via http://localhost:3000</a>)</span>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">
          Sent by Acme Autonomous Talent Platform &bull; Real-Time Automated Hiring Engine
        </p>
      </div>
    `.trim();

    const email = db.addSentEmail({
      recipient_email: candidateEmail,
      recipient_name: candidateName,
      subject,
      body_html: bodyHtml,
      template_type: 'ASSESSMENT_INVITATION',
      metadata: {
        applicationId,
        jobTitle,
        testUrl,
        passThreshold
      }
    });

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'assessment',
      entity_id: applicationId,
      action: 'UPDATE',
      details: {
        event: 'EMAIL_DISPATCHED',
        type: 'ASSESSMENT_INVITATION',
        recipient: candidateEmail,
        subject
      }
    });

    dispatchRealSmtpEmail(candidateEmail, subject, bodyHtml);

    return email;
  },

  /**
   * Dispatch Round 2 Technical Interview Invitation with Calendly / booking link
   */
  sendRound2InterviewInvitation(params: {
    applicationId: string;
    candidateEmail: string;
    candidateName: string;
    jobTitle: string;
    score: number;
    meetingUrl: string;
    scheduledStart?: string;
    durationMinutes?: number;
    interviewerName?: string;
    calendlyUrl?: string;
  }): SentEmail {
    const {
      applicationId,
      candidateEmail,
      candidateName,
      jobTitle,
      score,
      meetingUrl,
      scheduledStart,
      interviewerName = 'Engineering Team',
      calendlyUrl
    } = params;

    const firstName = candidateName.split(' ')[0] || candidateName || 'there';
    const bookingUrl = (calendlyUrl && calendlyUrl.trim()) ? calendlyUrl.trim() : meetingUrl;

    const subject = `Next steps: Technical Interview for ${jobTitle}`;
    const bodyHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #1f2937; line-height: 1.6; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
        <p style="font-size: 15px; margin-top: 0; margin-bottom: 20px; color: #111827;">
          Hi ${firstName},
        </p>

        <p style="font-size: 15px; margin-bottom: 16px; color: #374151;">
          Thank you for taking the time to complete the technical assessment for the <strong>${jobTitle}</strong> role. Our engineering team reviewed your submission, and we were really impressed with your architecture and problem-solving approach.
        </p>

        <p style="font-size: 15px; margin-bottom: 24px; color: #374151;">
          We'd love to invite you to our next round—a 45-minute technical conversation. It'll be a chance to talk through your experience, dive deeper into system design, and give you plenty of time to ask us anything about what we're building and what it's like working here.
        </p>

        <div style="margin: 28px 0; text-align: left;">
          <a href="${bookingUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 26px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px; display: inline-block;">
            Schedule your interview
          </a>
        </div>

        <p style="font-size: 13px; color: #6b7280; margin-bottom: 20px; line-height: 1.5;">
          You can also use this direct link to view available times: <br/>
          <a href="${bookingUrl}" style="color: #2563eb; word-break: break-all;">${bookingUrl}</a>
        </p>

        <p style="font-size: 14px; color: #4b5563; margin-bottom: 24px;">
          If none of the available slots fit your schedule or timezone, just reply directly to this email with a few times that suit you best and we'll gladly work around your availability.
        </p>

        <p style="font-size: 15px; margin-bottom: 4px; color: #374151;">
          Looking forward to speaking with you!
        </p>
        <p style="font-size: 15px; font-weight: 600; color: #111827; margin-top: 0;">
          The Engineering Hiring Team
        </p>
      </div>
    `.trim();

    const email = db.addSentEmail({
      recipient_email: candidateEmail,
      recipient_name: candidateName,
      subject,
      body_html: bodyHtml,
      template_type: 'ROUND_2_INTERVIEW_INVITATION',
      metadata: {
        applicationId,
        score,
        meetingUrl: bookingUrl,
        calendlyUrl: bookingUrl,
        scheduledStart,
        interviewerName
      }
    });

    db.addAuditLog({
      organization_id: 'a0000000-0000-0000-0000-000000000001',
      entity_type: 'interview',
      entity_id: applicationId,
      action: 'CREATE',
      details: {
        event: 'ROUND_2_INVITATION_EMAILED',
        recipient: candidateEmail,
        score,
        interviewer: interviewerName,
        bookingUrl
      }
    });

    dispatchRealSmtpEmail(candidateEmail, subject, bodyHtml);

    return email;
  }
};
