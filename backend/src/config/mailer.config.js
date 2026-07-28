const {
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  GMAIL_SENDER_EMAIL,
} = require("../constants/app.constant");

const assertGmailConfig = () => {
  if (
    !GMAIL_CLIENT_ID ||
    !GMAIL_CLIENT_SECRET ||
    !GMAIL_REFRESH_TOKEN ||
    !GMAIL_SENDER_EMAIL
  ) {
    throw new Error(
      "Thieu cau hinh Gmail API. Vui long them GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER_EMAIL vao .env",
    );
  }
};

const getAccessToken = async () => {
  assertGmailConfig();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10000),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Khong the lay Gmail access token: ${data.error_description || data.error || response.status}`);
  }

  return data.access_token;
};

const encodeHeader = (value) => `=?UTF-8?B?${Buffer.from(value).toString("base64")}?=`;

const buildRawEmail = ({ to, subject, html }) => {
  const message = [
    `From: StayZ <${GMAIL_SENDER_EMAIL}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(html).toString("base64"),
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

const sendEmail = async ({ to, subject, html }) => {
  const accessToken = await getAccessToken();
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: buildRawEmail({ to, subject, html }) }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(`Gmail API gui email that bai: ${data.error?.message || response.status}`);
  }
};

const buildOtpEmail = ({ title, description, code, footer }) => `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2f46">
    <h2 style="margin-bottom:12px;color:#003b95">${title}</h2>
    <p>${description}</p>
    <p>Mã xác thực của bạn là:</p>
    <div style="display:inline-block;margin:12px 0;padding:12px 20px;border-radius:12px;background:#eef4ff;font-size:28px;font-weight:700;letter-spacing:6px;color:#003b95">
      ${code}
    </div>
    <p>Mã có hiệu lực trong 10 phút.</p>
    <p>${footer}</p>
  </div>
`;

const sendPasswordResetCodeEmail = ({ to, code }) =>
  sendEmail({
    to,
    subject: "Mã xác thực đặt lại mật khẩu StayZ",
    html: buildOtpEmail({
      title: "Khôi phục mật khẩu StayZ",
      description: "Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản StayZ.",
      code,
      footer: "Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.",
    }),
  });

const sendRegisterCodeEmail = ({ to, code }) =>
  sendEmail({
    to,
    subject: "Mã xác thực đăng ký StayZ",
    html: buildOtpEmail({
      title: "Xác thực tài khoản StayZ",
      description: "Bạn đang tạo tài khoản StayZ.",
      code,
      footer: "Nếu bạn không đăng ký tài khoản, hãy bỏ qua email này.",
    }),
  });

module.exports = {
  sendPasswordResetCodeEmail,
  sendRegisterCodeEmail,
};
