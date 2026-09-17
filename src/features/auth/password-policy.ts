export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_POLICY_ERROR_CODE = "PASSWORD_POLICY_VIOLATION";

export interface PasswordPolicyResult {
  readonly valid: boolean;
  readonly score: number;
  readonly minimumLength: boolean;
  readonly uppercase: boolean;
  readonly number: boolean;
  readonly special: boolean;
}

export function evaluatePassword(password: string): PasswordPolicyResult {
  const minimumLength = password.length >= PASSWORD_MIN_LENGTH;
  const uppercase = /[A-Z]/.test(password);
  const number = /[0-9]/.test(password);
  const special = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/.test(password);
  const score = [minimumLength, uppercase, number, special].filter(Boolean).length;

  return {
    valid: score === 4 && password.length <= PASSWORD_MAX_LENGTH,
    score,
    minimumLength,
    uppercase,
    number,
    special,
  };
}

export function isPasswordPolicySatisfied(password: string): boolean {
  return evaluatePassword(password).valid;
}
