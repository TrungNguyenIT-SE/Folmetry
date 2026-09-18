export type AuthEmailKind = "verify" | "reset";

export interface AuthEmailTemplateInput {
  readonly kind: AuthEmailKind;
  readonly recipientName?: string | null;
  readonly siteName: string;
  readonly url: string;
}

export interface AuthEmailTemplate {
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function actionUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Authentication email URL must use HTTP or HTTPS.");
  }
  return url.toString();
}

export function renderAuthEmail(input: AuthEmailTemplateInput): AuthEmailTemplate {
  const url = actionUrl(input.url);
  const siteName = escapeHtml(input.siteName);
  const name = input.recipientName?.trim();
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hello,";
  const isVerification = input.kind === "verify";
  const subject = isVerification
    ? `Confirm your ${input.siteName} email`
    : `Reset your ${input.siteName} password`;
  const eyebrow = isVerification ? "ACCOUNT VERIFICATION · XÁC MINH TÀI KHOẢN" : "SECURITY REQUEST · YÊU CẦU BẢO MẬT";
  const title = isVerification ? "Confirm your email address" : "Choose a new password";
  const description = isVerification
    ? `One final step activates your ${siteName} account and protects it with a verified email address.`
    : `We received a request to change the password for your ${siteName} account.`;
  const vietnamese = isVerification
    ? `Chỉ còn một bước để kích hoạt tài khoản ${siteName} và xác minh địa chỉ email của bạn.`
    : `Folmetry đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.`;
  const action = isVerification ? "Confirm email · Xác minh email" : "Reset password · Đặt lại mật khẩu";
  const safeUrl = escapeHtml(url);
  const preheader = isVerification
    ? `Confirm your email to finish setting up ${input.siteName}.`
    : `Use this secure link to reset your ${input.siteName} password.`;

  const text = [
    `${input.siteName} — ${eyebrow}`,
    "",
    name ? `Hi ${name},` : "Hello,",
    isVerification
      ? `Confirm your email address to activate your ${input.siteName} account.`
      : `Use the secure link below to choose a new ${input.siteName} password.`,
    isVerification
      ? `Xác minh địa chỉ email để kích hoạt tài khoản ${input.siteName}.`
      : `Sử dụng liên kết bảo mật bên dưới để đặt mật khẩu ${input.siteName} mới.`,
    "",
    url,
    "",
    "This link expires in 60 minutes. If you did not request this action, ignore this email; no change will be made.",
    "Liên kết hết hạn sau 60 phút. Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email; tài khoản sẽ không thay đổi.",
    "",
    "Your relationship exports stay on your device. Folmetry will never ask for your Instagram password by email.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(subject)}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      .email-body { background-color: #090d15 !important; }
      .email-card { background-color: #111722 !important; border-color: #263247 !important; }
      .email-copy, .email-title { color: #f4f6fb !important; }
      .email-muted { color: #aab5c6 !important; }
      .email-panel { background-color: #0c1320 !important; border-color: #263247 !important; }
      .email-link { color: #8fddec !important; }
    }
    @media only screen and (max-width: 640px) {
      .email-shell { width: 100% !important; }
      .email-pad { padding-left: 24px !important; padding-right: 24px !important; }
      .email-title { font-size: 32px !important; line-height: 38px !important; }
      .email-button { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body class="email-body" style="margin:0;padding:0;background:#f1f4fa;color:#151c2b;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table class="email-body" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f1f4fa;">
    <tr>
      <td align="center" style="padding:36px 14px;">
        <table class="email-shell email-card" role="presentation" width="620" cellspacing="0" cellpadding="0" border="0" style="width:620px;max-width:620px;background:#ffffff;border:1px solid #dce3ef;border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(20,31,52,.12);">
          <tr>
            <td class="email-pad" style="padding:28px 44px;background:#0c111b;border-bottom:1px solid #263247;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="48" valign="middle">
                    <div style="width:40px;height:40px;line-height:40px;text-align:center;border:1px solid #53647f;border-radius:13px;background:#101827;color:#ffffff;font-size:18px;font-weight:800;box-shadow:0 0 0 4px #151e31;">F</div>
                  </td>
                  <td valign="middle" style="color:#ffffff;font-size:19px;font-weight:800;letter-spacing:-.3px;">${siteName}<span style="color:#63d8ea;">●</span></td>
                  <td align="right" valign="middle" style="color:#8d9bb1;font-family:Consolas,'Courier New',monospace;font-size:10px;letter-spacing:1.5px;">LOCAL / PRIVATE</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:48px 44px 18px;">
              <div style="margin-bottom:18px;color:#4057ff;font-family:Consolas,'Courier New',monospace;font-size:11px;font-weight:700;letter-spacing:1.3px;">— ${escapeHtml(eyebrow)}</div>
              <div class="email-copy" style="margin:0 0 12px;color:#151c2b;font-size:16px;line-height:26px;">${greeting}</div>
              <h1 class="email-title" style="margin:0 0 18px;color:#101726;font-size:38px;line-height:44px;font-weight:650;letter-spacing:-1.4px;">${escapeHtml(title)}</h1>
              <p class="email-copy" style="margin:0 0 8px;color:#303b50;font-size:16px;line-height:27px;">${description}</p>
              <p class="email-muted" style="margin:0;color:#647086;font-size:14px;line-height:23px;">${vietnamese}</p>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:22px 44px 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius:12px;background:#4057ff;box-shadow:0 10px 24px rgba(64,87,255,.28);">
                    <a class="email-button" href="${safeUrl}" style="display:inline-block;padding:15px 22px;color:#ffffff;font-size:15px;font-weight:800;line-height:20px;text-decoration:none;border-radius:12px;">${escapeHtml(action)} &nbsp;→</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:0 44px 32px;">
              <table class="email-panel" role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f5f7fb;border:1px solid #dce3ef;border-radius:14px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <div class="email-copy" style="margin:0 0 5px;color:#263249;font-size:13px;font-weight:800;">Secure link · Liên kết bảo mật</div>
                    <div class="email-muted" style="margin:0 0 12px;color:#647086;font-size:12px;line-height:19px;">This link expires in 60 minutes. Liên kết sẽ hết hạn sau 60 phút.</div>
                    <a class="email-link" href="${safeUrl}" style="display:block;color:#3154c7;font-family:Consolas,'Courier New',monospace;font-size:11px;line-height:18px;word-break:break-all;">${safeUrl}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-pad" style="padding:26px 44px;background:#0c111b;border-top:1px solid #263247;">
              <p style="margin:0 0 9px;color:#e5eaf2;font-size:13px;line-height:21px;font-weight:700;">Didn’t request this? You can safely ignore this email.</p>
              <p style="margin:0 0 18px;color:#8d9bb1;font-size:12px;line-height:20px;">Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email. Tài khoản sẽ không thay đổi.</p>
              <div style="height:1px;background:#263247;margin-bottom:18px;"></div>
              <p style="margin:0;color:#8d9bb1;font-size:11px;line-height:18px;">Your relationship exports stay on your device. ${siteName} never asks for your Instagram password by email.</p>
              <p style="margin:6px 0 0;color:#66758d;font-size:11px;line-height:18px;">Dữ liệu quan hệ được giữ trên thiết bị. ${siteName} không bao giờ yêu cầu mật khẩu Instagram qua email.</p>
            </td>
          </tr>
        </table>
        <p style="margin:18px 0 0;color:#7a8699;font-size:11px;line-height:18px;">Transactional account security email from ${siteName}.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text, html };
}
