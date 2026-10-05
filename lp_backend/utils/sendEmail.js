import nodemailer from "nodemailer";

const hasEmailConfig = () =>
  Boolean(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!hasEmailConfig()) return null;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT || 587) === 465,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  const currentTransporter = getTransporter();
  if (!currentTransporter) {
    console.warn(`[Email] Not sent to ${to}: SMTP credentials are not configured`);
    return;
  }
  try {
    const info = await currentTransporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    });
    console.log(`[Email] Delivered "${subject}" to ${to} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error(`[Email] Delivery failed to ${to}:`, error.message);
  }
}

export function sendWelcomeEmail(user) {
  if (!user?.email) return Promise.resolve();
  return sendEmail({
    to: user.email,
    subject: "Welcome to Unicode",
    text: `Hi ${user.name || "there"}, your account has been created successfully.`,
    html: `<p>Hi ${user.name || "there"},</p><p>Welcome! Your account has been created successfully.</p>`,
  });
}

export function sendLoginNotification(user) {
  if (!user?.email) return Promise.resolve();
  const timestamp = new Date().toISOString();
  return sendEmail({
    to: user.email,
    subject: "New login to your account",
    text: `A successful login occurred at ${timestamp}.`,
    html: `<p>A successful login occurred at <strong>${timestamp}</strong>.</p>`,
  });
}
