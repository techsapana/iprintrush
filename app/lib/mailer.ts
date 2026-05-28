import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

function getTransport() {
  const host = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
  const port = Number(process.env.BREVO_SMTP_PORT || 587);
  const secure = String(process.env.BREVO_SMTP_SECURE || 'false') === 'true';
  const user = process.env.BREVO_SMTP_USER;
  const pass = process.env.BREVO_SMTP_PASS;

  if (!user || !pass) {
    throw new Error('Missing Brevo SMTP credentials');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendEmail(opts: { to: string; subject: string; text: string; html?: string }) {
  const from = process.env.MAIL_FROM || 'no-reply@iprintrush.com';
  const transporter = getTransport();
  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });
}

export async function sendOtpEmail(to: string, otp: string, purpose: 'signup' | 'forgot_password') {
  const subject = purpose === 'signup' ? 'Your iPrintRush signup code' : 'Your iPrintRush password reset code';
  const text = `Your verification code is: ${otp}. This code expires in 10 minutes.`;
  const html = `<p>Your verification code is:</p><p style="font-size:20px;font-weight:bold;letter-spacing:2px;">${otp}</p><p>This code expires in 10 minutes.</p>`;
  await sendEmail({ to, subject, text, html });
}
