const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends the password reset OTP email using a modern ResQMeal-branded template.
 */
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

  <body
    style="
      margin:0;
      padding:0;
      background-color:#F4F7F5;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
      color:#1F2933;
    "
  >

    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="background-color:#F4F7F5;padding:48px 16px;"
    >
      <tr>
        <td align="center">

          <!-- MAIN CARD -->
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            border="0"
            style="
              max-width:520px;
              background:#FFFFFF;
              border-radius:24px;
              overflow:hidden;
              box-shadow:0 12px 40px rgba(31,72,49,0.10);
            "
          >

            <!-- HEADER -->
            <tr>
              <td
                style="
                  padding:36px 40px 32px;
                  background:linear-gradient(135deg,#246B45 0%,#3FA66B 100%);
                  text-align:center;
                "
              >

                <!-- LOGO -->
                <div
                  style="
                    width:58px;
                    height:58px;
                    margin:0 auto 18px;
                    background:rgba(255,255,255,0.16);
                    border:1px solid rgba(255,255,255,0.22);
                    border-radius:18px;
                    line-height:58px;
                    font-size:28px;
                  "
                >
                  🔐
                </div>

                <h1
                  style="
                    margin:0;
                    color:#FFFFFF;
                    font-size:24px;
                    line-height:1.3;
                    font-weight:700;
                    letter-spacing:-0.3px;
                  "
                >
                  Reset your password
                </h1>

                <p
                  style="
                    margin:8px 0 0;
                    color:rgba(255,255,255,0.82);
                    font-size:14px;
                    line-height:1.5;
                  "
                >
                  Let's get you back into your ResQMeal account.
                </p>

              </td>
            </tr>

            <!-- CONTENT -->
            <tr>
              <td style="padding:38px 40px 0;">

                <p
                  style="
                    margin:0 0 8px;
                    font-size:16px;
                    line-height:1.6;
                    color:#1F2933;
                    font-weight:600;
                  "
                >
                  Hi ${displayName} 👋
                </p>

                <p
                  style="
                    margin:0 0 28px;
                    font-size:14px;
                    line-height:1.7;
                    color:#68736D;
                  "
                >
                  We received a request to reset your ResQMeal password.
                  Enter the verification code below to continue.
                  This code will expire in
                  <strong style="color:#2E7D4F;">15 minutes</strong>.
                </p>

              </td>
            </tr>

            <!-- OTP SECTION -->
            <tr>
              <td style="padding:0 40px;">

                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    background:#F2FAF5;
                    border:1px solid #D6EBDD;
                    border-radius:18px;
                  "
                >
                  <tr>
                    <td
                      style="
                        padding:24px 20px 10px;
                        text-align:center;
                      "
                    >

                      <p
                        style="
                          margin:0 0 12px;
                          font-size:11px;
                          line-height:1.4;
                          color:#6B7A70;
                          font-weight:700;
                          letter-spacing:1.5px;
                          text-transform:uppercase;
                        "
                      >
                        Verification code
                      </p>

                      <div
                        style="
                          font-size:34px;
                          line-height:1.3;
                          font-weight:800;
                          letter-spacing:9px;
                          color:#246B45;
                          padding-left:9px;
                        "
                      >
                        ${code}
                      </div>

                    </td>
                  </tr>

                  <tr>
                    <td
                      style="
                        padding:10px 20px 24px;
                        text-align:center;
                      "
                    >
                      <span
                        style="
                          display:inline-block;
                          background:#FFFFFF;
                          border:1px solid #DCE8E0;
                          border-radius:20px;
                          padding:6px 12px;
                          font-size:11px;
                          color:#718078;
                        "
                      >
                        ⏱ Expires in 15 minutes
                      </span>
                    </td>
                  </tr>
                </table>

              </td>
            </tr>

            <!-- SECURITY MESSAGE -->
            <tr>
              <td style="padding:28px 40px 0;">

                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                >
                  <tr>

                    <td
                      width="34"
                      valign="top"
                      style="padding-top:2px;"
                    >
                      <div
                        style="
                          width:28px;
                          height:28px;
                          background:#EEF7F1;
                          border-radius:9px;
                          text-align:center;
                          line-height:28px;
                          font-size:14px;
                        "
                      >
                        🛡️
                      </div>
                    </td>

                    <td style="padding-left:10px;">

                      <p
                        style="
                          margin:0 0 4px;
                          font-size:13px;
                          font-weight:700;
                          color:#35423A;
                        "
                      >
                        Keep your code private
                      </p>

                      <p
                        style="
                          margin:0;
                          font-size:12px;
                          line-height:1.6;
                          color:#7A857E;
                        "
                      >
                        Never share this verification code with anyone.
                        ResQMeal will never ask you for your password or OTP.
                      </p>

                    </td>

                  </tr>
                </table>

              </td>
            </tr>

            <!-- SUPPORT -->
            <tr>
              <td style="padding:30px 40px 0;">

                <div
                  style="
                    height:1px;
                    background:#EEF2EF;
                    margin-bottom:26px;
                  "
                ></div>

                <p
                  style="
                    margin:0 0 7px;
                    font-size:13px;
                    font-weight:700;
                    color:#35423A;
                  "
                >
                  Need help?
                </p>

                <p
                  style="
                    margin:0;
                    font-size:12px;
                    line-height:1.6;
                    color:#7A857E;
                  "
                >
                  If you're having trouble resetting your password,
                  our team is here to help.
                  Contact the ResQMeal support team and we'll be happy
                  to assist you.
                </p>

              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td
                style="
                  padding:30px 40px 34px;
                  text-align:center;
                "
              >

                <div
                  style="
                    height:1px;
                    background:#EEF2EF;
                    margin-bottom:24px;
                  "
                ></div>

                <p
                  style="
                    margin:0 0 7px;
                    font-size:13px;
                    font-weight:700;
                    color:#2E7D4F;
                  "
                >
                  🌿 ResQMeal
                </p>

                <p
                  style="
                    margin:0;
                    font-size:11px;
                    line-height:1.5;
                    color:#A0AAA3;
                  "
                >
                  Together, we can reduce food waste.
                </p>

                <p
                  style="
                    margin:12px 0 0;
                    font-size:10px;
                    color:#B3BBB6;
                  "
                >
                  This is an automated email. Please do not reply directly
                  to this message.
                </p>

              </td>
            </tr>

          </table>

          <!-- OUTSIDE FOOTER -->
          <p
            style="
              max-width:480px;
              margin:20px auto 0;
              text-align:center;
              font-size:10px;
              line-height:1.5;
              color:#A3ADA6;
            "
          >
            © ResQMeal · Food rescue made easier
          </p>

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