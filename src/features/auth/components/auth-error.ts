const safeMessageKeys = {
  EMAIL_NOT_VERIFIED: "emailNotVerified",
  INVALID_EMAIL_OR_PASSWORD: "invalidCredentials",
  INVALID_USERNAME_OR_PASSWORD: "invalidCredentials",
  USER_ALREADY_EXISTS: "existingUser",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "existingUser",
  BANNED_USER: "banned",
  TOO_MANY_REQUESTS: "rateLimited",
  INVALID_PASSWORD: "invalidPassword",
  PASSWORD_POLICY_VIOLATION: "passwordPolicy",
  USERNAME_IS_ALREADY_TAKEN: "usernameTaken",
} as const;

interface AuthErrorMessages {
  readonly emailNotVerified: string;
  readonly invalidCredentials: string;
  readonly existingUser: string;
  readonly banned: string;
  readonly rateLimited: string;
  readonly invalidPassword: string;
  readonly passwordPolicy: string;
  readonly usernameTaken: string;
};

export function authErrorMessage(code: string | undefined, messages: AuthErrorMessages, fallback: string): string {
  const key = code === undefined ? undefined : safeMessageKeys[code as keyof typeof safeMessageKeys];
  return key === undefined ? fallback : messages[key];
}
