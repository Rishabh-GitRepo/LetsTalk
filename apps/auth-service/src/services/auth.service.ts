import crypto from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../db.js";
import { redis } from "../redis.js";
import { config } from "../config.js";
import {
  createAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from "./token.service.js";

const REFRESH_TOKEN_TTL_MS =
  config.refreshTokenDays * 24 * 60 * 60 * 1000;

export async function registerUser(
  email: string,
  password: string,
  requestId: string,
) {
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await argon2.hash(password);
  const refresh = generateRefreshToken();
  const refreshHash = await hashRefreshToken(refresh.secret);
  const familyId = crypto.randomUUID();

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    await tx.refreshToken.create({
      data: {
        id: refresh.id,
        userId: createdUser.id,
        tokenHash: refreshHash,
        familyId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });

    return createdUser;
  });

  await redis.publish(
    "events",
    JSON.stringify({
      eventId: crypto.randomUUID(),
      eventType: "user.created",
      timestamp: new Date().toISOString(),
      requestId,
      payload: {
        userId: user.id,
        email: user.email,
      },
    }),
  );

  return {
    user,
    accessToken: await createAccessToken(user.id),
    refreshToken: refresh.value,
  };
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const valid = await argon2.verify(user.passwordHash, password);

  if (!valid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  return createAuthSession(user.id);
}

export async function createAuthSession(userId: string) {
  const refresh = generateRefreshToken();
  const refreshHash = await hashRefreshToken(refresh.secret);
  const familyId = crypto.randomUUID();

  await prisma.refreshToken.create({
    data: {
      id: refresh.id,
      userId,
      tokenHash: refreshHash,
      familyId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });

  return {
    accessToken: await createAccessToken(userId),
    refreshToken: refresh.value,
  };
}

export async function refreshUser(rawToken: string) {
  const [tokenId, secret] = rawToken.split(".");

  if (!tokenId || !secret) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { id: tokenId },
  });

  if (!stored) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  if (stored.usedAt || stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { familyId: stored.familyId },
      data: { revokedAt: new Date() },
    });

    throw new Error("REFRESH_TOKEN_REUSE");
  }

  if (stored.expiresAt < new Date()) {
    throw new Error("REFRESH_TOKEN_EXPIRED");
  }

  const valid = await verifyRefreshToken(stored.tokenHash, secret);

  if (!valid) {
    throw new Error("INVALID_REFRESH_TOKEN");
  }

  const nextRefresh = generateRefreshToken();
  const nextHash = await hashRefreshToken(nextRefresh.secret);

  await prisma.$transaction(async (tx) => {
    await tx.refreshToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });

    await tx.refreshToken.create({
      data: {
        id: nextRefresh.id,
        userId: stored.userId,
        tokenHash: nextHash,
        familyId: stored.familyId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
      },
    });
  });

  return {
    accessToken: await createAccessToken(stored.userId),
    refreshToken: nextRefresh.value,
  };
}

export async function logoutUser(rawToken: string | undefined) {
  if (!rawToken) {
    return;
  }

  const [tokenId, secret] = rawToken.split(".");
  if (!tokenId || !secret) {
    return;
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { id: tokenId },
  });
  if (
    !stored ||
    stored.usedAt ||
    stored.revokedAt ||
    !(await verifyRefreshToken(stored.tokenHash, secret))
  ) {
    return;
  }

  await prisma.refreshToken.updateMany({
    where: { familyId: stored.familyId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
