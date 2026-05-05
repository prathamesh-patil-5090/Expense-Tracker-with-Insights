import nodemailer from "nodemailer";

type MailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
}

export async function sendMail(payload: MailPayload) {
  const transporter = buildTransporter();

  if (!transporter) {
    console.log("[email:mock]", payload.subject, payload.to, payload.text);
    return { mocked: true };
  }

  const from = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@example.com";
  const info = await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  return { messageId: info.messageId };
}