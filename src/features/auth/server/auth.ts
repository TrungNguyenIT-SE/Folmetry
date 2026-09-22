import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, username } from "better-auth/plugins";

import { isPasswordPolicySatisfied, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, PASSWORD_POLICY_ERROR_CODE } from "@/features/auth/password-policy";
import { authDatabase } from "@/features/auth/server/database";
import { sendAuthEmail } from "@/features/auth/server/email";
import { authBaseUrl, authSecret, googleOAuthCredentials } from "@/features/auth/server/environment";
import { SITE_NAME } from "@/lib/site-metadata";

const google = googleOAuthCredentials();

export const auth = betterAuth({
  appName: SITE_NAME,
  baseURL: authBaseUrl(),
  secret: authSecret(),
  database: authDatabase,
  trustedOrigins: [authBaseUrl()],
  socialProviders: google === undefined
    ? {}
    : {
        google: {
          clientId: google.clientId,
          clientSecret: google.clientSecret,
        },
      },
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: true,
      allowDifferentEmails: false,
    },
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      const passwordPaths = new Set([
        "/sign-up/email",
        "/reset-password",
        "/change-password",
        "/set-password",
        "/admin/set-user-password",
      ]);
      if (passwordPaths.has(context.path)) {
        const body = context.body as { password?: unknown; newPassword?: unknown } | undefined;
        const candidate = typeof body?.newPassword === "string" ? body.newPassword : body?.password;
        if (typeof candidate !== "string" || !isPasswordPolicySatisfied(candidate)) {
          throw new APIError("BAD_REQUEST", {
            code: PASSWORD_POLICY_ERROR_CODE,
            message: "Password does not meet the Folmetry password policy.",
          });
        }
      }

      if (context.path === "/sign-up/email") {
        const body = context.body as Record<string, unknown> | undefined;
        const email = typeof body?.["email"] === "string" ? body["email"].trim().toLowerCase() : "";
        const configuredAdminEmail = process.env["ADMIN_EMAIL"]?.trim().toLowerCase();
        const configuredAdminUsername = process.env["ADMIN_USERNAME"]?.trim().toLowerCase();
        const submittedUsername = typeof body?.["username"] === "string" ? body["username"].trim().toLowerCase() : "";

        if (configuredAdminUsername && submittedUsername === configuredAdminUsername && email !== configuredAdminEmail) {
          throw new APIError("BAD_REQUEST", { code: "USERNAME_IS_ALREADY_TAKEN", message: "Username is unavailable." });
        }
        if (configuredAdminEmail && configuredAdminUsername && email === configuredAdminEmail) {
          return { context: { ...context, body: { ...body, username: configuredAdminUsername } } };
        }
      }

      if (context.path === "/update-user") {
        const body = context.body as Record<string, unknown> | undefined;
        const configuredAdminEmail = process.env["ADMIN_EMAIL"]?.trim().toLowerCase();
        const configuredAdminUsername = process.env["ADMIN_USERNAME"]?.trim().toLowerCase();
        const submittedUsername = typeof body?.["username"] === "string" ? body["username"].trim().toLowerCase() : undefined;
        if (submittedUsername !== undefined && configuredAdminUsername) {
          const session = await getSessionFromCtx(context);
          const isBootstrapAdmin = session?.user.email.toLowerCase() === configuredAdminEmail;
          if (!isBootstrapAdmin && submittedUsername === configuredAdminUsername) {
            throw new APIError("BAD_REQUEST", { code: "USERNAME_IS_ALREADY_TAKEN", message: "Username is unavailable." });
          }
          if (isBootstrapAdmin) {
            return { context: { ...context, body: { ...body, username: configuredAdminUsername } } };
          }
        }
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const bootstrapAdminEmail = process.env["ADMIN_EMAIL"]?.trim().toLowerCase();
          return bootstrapAdminEmail !== undefined && user.email.toLowerCase() === bootstrapAdminEmail
            ? { data: { ...user, role: "admin" } }
            : { data: user };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({ kind: "reset", recipient: user.email, recipientName: user.name, url });
    },
    customSyntheticUser: ({ coreFields, additionalFields, id }) => ({
      ...coreFields,
      role: "user",
      banned: false,
      banReason: null,
      banExpires: null,
      ...additionalFields,
      id,
    }),
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAuthEmail({ kind: "verify", recipient: user.email, recipientName: user.name, url });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    freshAge: 60 * 10,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-in/username": { window: 60, max: 10 },
      "/sign-in/social": { window: 60, max: 20 },
      "/sign-up/email": { window: 60 * 5, max: 5 },
      "/request-password-reset": { window: 60 * 5, max: 5 },
      "/send-verification-email": { window: 60 * 5, max: 5 },
    },
  },
  plugins: [
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    username({ minUsernameLength: 3, maxUsernameLength: 30 }),
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
