"use client";

import { evaluatePassword } from "@/features/auth/password-policy";

interface PasswordStrengthCopy {
  readonly label: string;
  readonly levels: readonly [string, string, string, string, string];
  readonly minimumLength: string;
  readonly uppercase: string;
  readonly number: string;
  readonly special: string;
}

export function PasswordStrength({ password, copy }: Readonly<{ password: string; copy: PasswordStrengthCopy }>) {
  const result = evaluatePassword(password);
  const requirements = [
    [result.minimumLength, copy.minimumLength],
    [result.uppercase, copy.uppercase],
    [result.number, copy.number],
    [result.special, copy.special],
  ] as const;

  return (
    <div className={`password-strength password-strength--${result.score}`}>
      <div className="password-strength__heading">
        <span>{copy.label}</span>
        <strong>{copy.levels[result.score]}</strong>
      </div>
      <progress aria-label={`${copy.label}: ${copy.levels[result.score]}`} max={4} value={result.score} />
      <ul className="password-strength__requirements">
        {requirements.map(([met, label]) => (
          <li className={met ? "is-met" : undefined} key={label}>
            <span aria-hidden="true">{met ? "✓" : "○"}</span>{label}
          </li>
        ))}
      </ul>
    </div>
  );
}
