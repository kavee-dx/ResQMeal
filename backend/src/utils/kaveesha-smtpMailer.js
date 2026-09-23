const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendPasswordResetEmail({ to, name, code }) {
  const displayName = name?.trim() || "there";

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset your ResQMeal password</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F6F8FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#023047;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F6F8FA;padding:48px 16px;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(2,48,71,0.12);">

            <!-- HEADER -->
            <tr>
              <td style="padding:36px 40px 32px;background:linear-gradient(135deg,#023047 0%,#126782 100%);text-align:center;">
                <div style="width:58px;height:58px;margin:0 auto 18px;background:rgba(255,183,3,0.18);border:1px solid rgba(255,183,3,0.35);border-radius:18px;line-height:58px;font-size:28px;">🔐</div>
                <h1 style="margin:0;color:#FFFFFF;font-size:24px;line-height:1.3;font-weight:700;letter-spacing:-0.3px;">Reset your password</h1>
                <p style="margin:8px 0 0;color:rgba(255,255,255,0.82);font-size:14px;line-height:1.5;">Let's get you back into your ResQMeal account.</p>
              </td>
            </tr>

            <!-- CONTENT -->
            <tr>
              <td style="padding:38px 40px 0;">
                <p style="margin:0 0 8px;font-size:16px;line-height:1.6;color:#023047;font-weight:600;">Hi ${displayName} 👋</p>
                <p style="margin:0 0 28px;font-size:14px;line-height:1.7;color:#6B7B85;">
                  We received a request to reset your ResQMeal password.
                  Enter the verification code below to continue.
                  This code will expire in <strong style="color:#FB8500;">15 minutes</strong>.
                </p>
              </td>
            </tr>

            <!-- OTP SECTION -->
            <tr>
              <td style="padding:0 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F8FA;border:1px solid #D6E6EB;border-radius:18px;">
                  <tr>
                    <td style="padding:24px 20px 10px;text-align:center;">
                      <p style="margin:0 0 12px;font-size:11px;line-height:1.4;color:#126782;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Verification code</p>
                      <div style="font-size:34px;line-height:1.3;font-weight:800;letter-spacing:9px;color:#023047;padding-left:9px;">${code}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 20px 24px;text-align:center;">
                      <span style="display:inline-block;background:#FFFFFF;border:1px solid #FFE1A8;border-radius:20px;padding:6px 12px;font-size:11px;color:#B36B00;">⏱ Expires in 15 minutes</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- SECURITY MESSAGE -->
            <tr>
              <td style="padding:28px 40px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="34" valign="top" style="padding-top:2px;">
                      <div style="width:28px;height:28px;background:#EAF2F5;border-radius:9px;text-align:center;line-height:28px;font-size:14px;">🛡️</div>
                    </td>
                    <td style="padding-left:10px;">
                      <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#023047;">Keep your code private</p>
                      <p style="margin:0;font-size:12px;line-height:1.6;color:#6B7B85;">Never share this verification code with anyone. ResQMeal will never ask you for your password or OTP.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- SUPPORT -->
            <tr>
              <td style="padding:30px 40px 0;">
                <div style="height:1px;background:#E4E9ED;margin-bottom:26px;"></div>
                <p style="margin:0 0 7px;font-size:13px;font-weight:700;color:#023047;">Need help?</p>
                <p style="margin:0;font-size:12px;line-height:1.6;color:#6B7B85;">If you're having trouble resetting your password, our team is here to help. Contact the ResQMeal support team and we'll be happy to assist you.</p>
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="padding:30px 40px 34px;text-align:center;">
                <div style="height:1px;background:#E4E9ED;margin-bottom:24px;"></div>
                <p style="margin:0 0 7px;font-size:13px;font-weight:700;color:#FB8500;">🌿 ResQMeal</p>
                <p style="margin:0;font-size:11px;line-height:1.5;color:#8B98A3;">Together, we can reduce food waste.</p>
                <p style="margin:12px 0 0;font-size:10px;color:#A9B4BC;">This is an automated email. Please do not reply directly to this message.</p>
              </td>
            </tr>

          </table>

          <!-- OUTSIDE FOOTER -->
          <p style="max-width:480px;margin:20px auto 0;text-align:center;font-size:10px;line-height:1.5;color:#8B98A3;">© ResQMeal · Food rescue made easier</p>

        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"ResQMeal" <${process.env.SMTP_USER}>`,
    to,
    subject: `${code} is your ResQMeal password reset code`,
    html,
  });
}

module.exports = { sendPasswordResetEmail };