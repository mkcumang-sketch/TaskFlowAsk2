import crypto from "node:crypto";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

const GOOGLE_TOKEN_KEY = process.env.AUTH_SECRET || "taskflow-google-token-key";

function deriveTokenSecret() {
  return crypto.createHash("sha256").update(GOOGLE_TOKEN_KEY).digest();
}

export function encryptGoogleToken(value: string) {
  const key = deriveTokenSecret();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${encrypted.toString("base64")}:${tag.toString("base64")}`;
}

export function decryptGoogleToken(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    const [ivValue, encryptedValue, tagValue] = value.split(":");

    if (!ivValue || !encryptedValue || !tagValue) {
      return null;
    }

    const key = deriveTokenSecret();
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivValue, "base64"),
    );

    decipher.setAuthTag(Buffer.from(tagValue, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google/callback";

  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth is not configured.");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function buildGoogleAuthUrl() {
  const oauth2Client = getGoogleOAuthClient();

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/calendar",
    ],
  });
}

function decodeGoogleTokenPayload(token: string | null | undefined) {
  if (!token) {
    return null;
  }

  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as { sub?: string };
  } catch {
    return null;
  }
}

export async function saveGoogleTokens({
  userId,
  tokens,
  providerAccountId,
}: {
  userId: string;
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
    id_token?: string | null;
  };
  providerAccountId?: string | null;
}) {
  const accountId =
    providerAccountId ||
    decodeGoogleTokenPayload(tokens.id_token)?.sub ||
    `google-user-${userId}`;

  const accessToken = tokens.access_token ? encryptGoogleToken(tokens.access_token) : null;
  const refreshToken = tokens.refresh_token ? encryptGoogleToken(tokens.refresh_token) : null;
  const expiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

  await prisma.oAuthAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: "google",
        providerAccountId: accountId,
      },
    },
    update: {
      accessToken,
      refreshToken: refreshToken ?? undefined,
      expiresAt,
      userId,
    },
    create: {
      provider: "google",
      providerAccountId: accountId,
      userId,
      accessToken,
      refreshToken,
      expiresAt,
    },
  });

  await prisma.calendarIntegration.upsert({
    where: {
      userId_provider: {
        userId,
        provider: "google",
      },
    },
    update: {
      accessToken,
      refreshToken: refreshToken ?? undefined,
      expiresAt,
      status: "CONNECTED",
    },
    create: {
      userId,
      provider: "google",
      accessToken,
      refreshToken,
      expiresAt,
      status: "CONNECTED",
    },
  });
}

export async function disconnectGoogleAccount(userId: string) {
  await prisma.oAuthAccount.deleteMany({
    where: {
      userId,
      provider: "google",
    },
  });

  await prisma.calendarIntegration.deleteMany({
    where: {
      userId,
      provider: "google",
    },
  });
}

export async function getGoogleCalendarClientForUser(userId: string) {
  const integration = await prisma.calendarIntegration.findUnique({
    where: {
      userId_provider: {
        userId,
        provider: "google",
      },
    },
  });

  if (!integration || !integration.accessToken) {
    throw new Error("Google Calendar is not connected.");
  }

  const oauth2Client = getGoogleOAuthClient();
  const accessToken = decryptGoogleToken(integration.accessToken);
  const refreshToken = integration.refreshToken ? decryptGoogleToken(integration.refreshToken) : null;

  oauth2Client.setCredentials({
    access_token: accessToken ?? undefined,
    refresh_token: refreshToken ?? undefined,
  });

  if (integration.expiresAt && integration.expiresAt.getTime() <= Date.now() + 60_000 && refreshToken) {
    const refreshed = await oauth2Client.refreshAccessToken();
    const nextAccessToken = refreshed.credentials.access_token;
    const nextRefreshToken = refreshed.credentials.refresh_token ?? refreshToken;
    const nextExpiryDate = refreshed.credentials.expiry_date
      ? new Date(refreshed.credentials.expiry_date)
      : integration.expiresAt;

    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: nextAccessToken ? encryptGoogleToken(nextAccessToken) : integration.accessToken,
        refreshToken: nextRefreshToken ? encryptGoogleToken(nextRefreshToken) : integration.refreshToken,
        expiresAt: nextExpiryDate,
        status: "CONNECTED",
      },
    });

    oauth2Client.setCredentials({
      access_token: nextAccessToken ?? undefined,
      refresh_token: nextRefreshToken ?? undefined,
    });
  }

  return google.calendar({ version: "v3", auth: oauth2Client });
}
