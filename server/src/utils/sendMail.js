import { createTransport } from "nodemailer";

const createMailTransport = () =>
  createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL,
      pass: process.env.PASSWORD,
    },
  });

const sendMail = async (email, subject, data) => {
  const transport = createMailTransport();
  const html = `<!DOCTYPE html>
    <html lang="en">
      <body style="font-family: Arial, sans-serif; background:#f7f7fb; padding:24px;">
        <div style="max-width:560px; margin:0 auto; background:#fff; border-radius:12px; padding:32px; border:1px solid #e7e7ef;">
          <h2 style="margin:0 0 12px; color:#1f3c88;">Password Reset OTP</h2>
          <p style="margin:0 0 16px; color:#555;">Use the one-time password below to reset your password.</p>
          <div style="font-size:28px; letter-spacing:8px; font-weight:700; color:#111; margin:24px 0;">${data.otp}</div>
          <p style="margin:0 0 8px; color:#555;">This OTP will expire in ${data.expiresInMinutes || 10} minutes.</p>
          <p style="margin:0; color:#777;">If you did not request this, you can ignore this email.</p>
        </div>
      </body>
    </html>`;

  await transport.sendMail({
    from: process.env.GMAIL,
    to: email,
    subject,
    html,
    text: `Your OTP is ${data.otp}. It expires in ${data.expiresInMinutes || 10} minutes.`,
  });
};

const sendResetMail = async (email, subject, data) => {
  const transport = createMailTransport();

  const html = `<!DOCTYPE html>
                <html lang="en">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Reset Your Password</title>
                  <style>
                    body {
                      font-family: Arial, sans-serif;
                      background-color: #f3f3f3;
                      margin: 0;
                      padding: 0;
                    }
                    .container {
                      background-color: #ffffff;
                      padding: 20px;
                      margin: 20px auto;
                      border-radius: 8px;
                      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                      max-width: 600px;
                    }
                    h1 {
                      color: #5a2d82;
                    }
                    p {
                      color: #666666;
                    }
                    .button {
                      display: inline-block;
                      padding: 15px 25px;
                      margin: 20px 0;
                      background-color: #5a2d82;
                      color: white;
                      text-decoration: none;
                      border-radius: 4px;
                      font-size: 16px;
                    }
                    .footer {
                      margin-top: 20px;
                      color: #999999;
                      text-align: center;
                    }
                    .footer a {
                      color: #5a2d82;
                      text-decoration: none;
                    }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <h1>Reset Your Password</h1>
                    <p>Hello,</p>
                    <p>You have requested to reset your password. Please click the button below to reset your password.</p>
                    <a href="${process.env.frontend_url}reset-password/${data.token}" class="button">Reset Password</a>
                    <p>If you did not request this, please ignore this email.</p>
                    <div class="footer">
                      <p>Thank you,<br>Your Website Team</p>
                      <p><a href="https://yourwebsite.com">yourwebsite.com</a></p>
                    </div>
                  </div>
                </body>
                </html>`;
  await transport.sendMail({
    from: process.env.GMAIL,
    to: email,
    subject,
    html,
  });
};

export { sendMail, sendResetMail };
