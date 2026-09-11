const nodemailer = require("nodemailer");

function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn("[Email] SMTP credentials are not configured. Approval emails will only be logged.");
    return null;
  }

  return nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
}

async function sendApprovalEmail(email, fullName) {
  if (!email) return false;
  const transporter = createTransporter();
  const name = fullName?.trim() || "there";

  if (!transporter) {
    console.log(`[Approval] ${email} has been approved.`);
    return false;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Your ResQMeal account has been verified",
    html: `<div style="font-family:Arial,sans-serif;padding:24px;color:#1f2937;">
      <h2>You're verified, ${name}!</h2>
      <p>Our team has reviewed and approved your ResQMeal account. You can now log in and start using the platform.</p>
    </div>`,
    text: `Hi ${name}, your ResQMeal account has been approved. You can now log in.`,
  });

  return true;
}

async function sendRejectionEmail(email, fullName, reason) {
  if (!email) return false;
  const transporter = createTransporter();
  const name = fullName?.trim() || "there";

  if (!transporter) {
    console.log(`[Rejection] ${email} was rejected. Reason: ${reason || "N/A"}`);
    return false;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Update on your ResQMeal registration",
    html: `<div style="font-family:Arial,sans-serif;padding:24px;color:#1f2937;">
      <h2>Registration update</h2>
      <p>Hi ${name}, after review we're unable to verify your ResQMeal registration at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      <p>You're welcome to contact support or re-apply with updated details.</p>
    </div>`,
    text: `Hi ${name}, we were unable to verify your registration.${reason ? " Reason: " + reason : ""}`,
  });

  return true;
}

module.exports = { sendApprovalEmail, sendRejectionEmail };