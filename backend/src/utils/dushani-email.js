const nodemailer = require("nodemailer");

function createTransporter() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn(
      "[Email] SMTP credentials are not configured. OTP will only be logged to the console."
    );
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: Number(port) === 465,
    auth: {
      user,
      pass,
    },
  });
}

async function sendVerificationEmail(email, code) {
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !code) {
    return false;
  }

  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[Verification] Code for ${normalizedEmail}: ${code}`);
    return false;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to: normalizedEmail,
    subject: "ResQMeal verification code",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 24px; color: #1f2937;">
        <h2 style="margin-bottom: 12px;">Your ResQMeal verification code</h2>
        <p style="margin-bottom: 16px;">Use the code below to verify your account:</p>
        <div style="display: inline-block; padding: 14px 20px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #065f46;">
          ${code}
        </div>
        <p style="margin-top: 16px;">This code expires in 15 minutes.</p>
      </div>
    `,
    text: `Your ResQMeal verification code is: ${code}. This code expires in 15 minutes.`,
  });

  console.log(`[Email] Verification code sent to ${normalizedEmail}`);
  return true;
}

module.exports = { sendVerificationEmail };
