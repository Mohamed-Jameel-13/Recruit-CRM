import nodemailer from 'nodemailer';

/**
 * Dispatches an email via real SMTP if environment variables are configured.
 * Otherwise logs safely and lets the system use the recorded Live Outbox.
 */
export async function dispatchRealSmtpEmail(to: string, subject: string, html: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const from = process.env.SMTP_FROM || (user ? `"Talent Acquisition" <${user}>` : 'talent@recruitment-demo.com');

  if (!host || !user) {
    return false; // SMTP credentials not set, fallback to live outbox
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass,
      },
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    console.log(`[SMTP Dispatch Success] Live email dispatched to ${to}: "${subject}"`);
    return true;
  } catch (err: unknown) {
    console.warn('[SMTP Dispatch Warning]:', err instanceof Error ? err.message : String(err));
    return false;
  }
}
