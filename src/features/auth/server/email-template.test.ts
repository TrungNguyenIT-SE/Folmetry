import { describe, expect, it } from "vitest";

import { renderAuthEmail } from "./email-template";

describe("renderAuthEmail", () => {
  it("renders a branded bilingual verification email with an escaped action URL", () => {
    const template = renderAuthEmail({
      kind: "verify",
      recipientName: '<Admin & "Owner">',
      siteName: "Folmetry",
      url: "https://folmetry.example/verify?token=a&next=/account",
    });

    expect(template.subject).toBe("Confirm your Folmetry email");
    expect(template.html).toContain("ACCOUNT VERIFICATION · XÁC MINH TÀI KHOẢN");
    expect(template.html).toContain("Confirm email · Xác minh email");
    expect(template.html).toContain("&lt;Admin &amp; &quot;Owner&quot;&gt;");
    expect(template.html).toContain("token=a&amp;next=/account");
    expect(template.html).not.toContain('<Admin & "Owner">');
    expect(template.text).toContain("https://folmetry.example/verify?token=a&next=/account");
    expect(template.text).toContain("Liên kết hết hạn sau 60 phút");
  });

  it("renders reset-specific security copy and rejects unsafe protocols", () => {
    const template = renderAuthEmail({
      kind: "reset",
      siteName: "Folmetry",
      url: "https://folmetry.example/reset-password?token=secret",
    });

    expect(template.subject).toBe("Reset your Folmetry password");
    expect(template.html).toContain("Choose a new password");
    expect(template.html).toContain("Reset password · Đặt lại mật khẩu");
    expect(template.text).toContain("Folmetry will never ask for your Instagram password by email.");
    expect(() => renderAuthEmail({ kind: "reset", siteName: "Folmetry", url: "javascript:alert(1)" })).toThrow(
      "Authentication email URL must use HTTP or HTTPS.",
    );
  });
});
