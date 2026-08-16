const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends the password reset OTP email using a modern, branded HTML template.
 */
async function sendPasswordResetEmail({ to, name, code }) {
  const displayName = name?.trim() || "there";

  const html = `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background-color:#F3F6F4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F6F4;padding:40px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(22,101,52,0.08);">
            
            <tr>
              <td style="background:linear-gradient(135deg,#2E7D4F,#3FA66B);padding:36px 40px;text-align:center;">
                <div style="width:56px;height:56px;background:rgba(255,255,255,0.18);border-radius:16px;display:inline-block;line-height:56px;font-size:26px;margin-bottom:14px;">🔑</div>
                <h1 style="color:#FFFFFF;font-size:22px;margin:0;font-weight:700;">Reset your password</h1>
              </td>
            </tr>

            <tr>
              <td style="padding:36px 40px 8px 40px;">
                <p style="font-size:15px;color:#2A2E2B;line-height:1.6;margin:0 0 8px 0;">
                  Hi ${displayName},
                </p>
                <p style="font-size:15px;color:#5B615C;line-height:1.6;margin:0 0 28px 0;">
                  We received a request to reset your ResQMeal password. Use the code below to continue — it expires in <b>15 minutes</b>.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:0 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FAF4;border:1.5px dashed #3FA66B;border-radius:16px;">
                  <tr>
                    <td style="padding:26px;text-align:center;">
                      <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#1E5F3A;">${code}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 40px 8px 40px;">
                <p style="font-size:13px;color:#8A9089;line-height:1.6;margin:0;">
                  Didn't request this? You can safely ignore this email — your password won't be changed.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:28px 40px 36px 40px;border-top:1px solid #EEF1EE;margin-top:20px;">
                <p style="font-size:12px;color:#B0B5AF;text-align:center;margin:20px 0 0 0;">
                  🌿 ResQMeal — Together, we can reduce food waste.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  await resend.emails.send({
    from: `ResQMeal <onboarding@resend.dev>`,
    to,
    subject: `${code} is your ResQMeal password reset code`,
    html,
  });
}

module.exports = { sendPasswordResetEmail };