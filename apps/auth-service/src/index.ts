import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import argon2 from "argon2";
import { createClient } from "redis";

import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "./db.js";
import {
  createAccessToken,
  generateRefreshSecret,
  hashRefreshSecret,
  verifyAccessToken,
  verifyRefreshSecret
} from "./tokens.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

const redis = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6380"
});

redis.on("error", (error) => {
  console.error("Redis error", error);
});

await redis.connect();

function createRefreshToken() {
  const id = crypto.randomUUID();
  const secret = generateRefreshSecret();

  return {
    id,
    secret,
    token: `${id}.${secret}`
  };
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: false,
    sameSite: "lax" as const,
    path: "/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000
  };
}

app.post("/auth/register", async (req, res) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({
        message: "email and password are required"
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email }
    });

    if (existing) {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    const passwordHash = await argon2.hash(password);
    const refresh = createRefreshToken();
    const tokenHash = await hashRefreshSecret(refresh.secret);
    const familyId = crypto.randomUUID();

    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash
        }
      });

      await tx.refreshToken.create({
        data: {
          id: refresh.id,
          userId: createdUser.id,
          tokenHash,
          familyId,
          expiresAt: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          )
        }
      });

      return createdUser;
    });

    const accessToken = await createAccessToken(user.id);

    await redis.publish(
      "events",
      JSON.stringify({
        eventId: crypto.randomUUID(),
        eventType: "user.created",
        timestamp: new Date().toISOString(),
        requestId: req.headers["x-request-id"] ?? "",
        payload: {
          userId: user.id,
          email: user.email
        }
      })
    );

    res.cookie("refreshToken", refresh.token, refreshCookieOptions());

    return res.status(201).json({
      accessToken
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Internal server error"
    });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  const user = await prisma.user.findUnique({
    where: { email: email ?? "" }
  });

  if (!email || !password || !user) {
    return res.status(401).json({
      message: "Invalid credentials"
    });
  }

  const valid = await argon2.verify(user.passwordHash, password);

  if (!valid) {
    return res.status(401).json({
      message: "Invalid credentials"
    });
  }

  const refresh = createRefreshToken();
  const tokenHash = await hashRefreshSecret(refresh.secret);
  const familyId = crypto.randomUUID();

  await prisma.refreshToken.create({
    data: {
      id: refresh.id,
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });

  const accessToken = await createAccessToken(user.id);

  res.cookie("refreshToken", refresh.token, refreshCookieOptions());

  return res.json({ accessToken });
});

app.post("/auth/refresh", async (req, res) => {
  const rawToken = req.cookies.refreshToken as string | undefined;

  if (!rawToken) {
    return res.status(401).json({
      message: "Refresh token missing"
    });
  }

  const [tokenId, secret] = rawToken.split(".");

  if (!tokenId || !secret) {
    return res.status(401).json({
      message: "Invalid refresh token"
    });
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { id: tokenId }
  });

  if (!stored) {
    return res.status(401).json({
      message: "Invalid refresh token"
    });
  }

  if (stored.usedAt || stored.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: {
        familyId: stored.familyId
      },
      data: {
        revokedAt: new Date()
      }
    });

    res.clearCookie("refreshToken", {
      path: "/auth/refresh"
    });

    return res.status(401).json({
      message: "Refresh token reuse detected"
    });
  }

  if (stored.expiresAt < new Date()) {
    return res.status(401).json({
      message: "Refresh token expired"
    });
  }

  const valid = await verifyRefreshSecret(stored.tokenHash, secret);

  if (!valid) {
    return res.status(401).json({
      message: "Invalid refresh token"
    });
  }

  const nextRefresh = createRefreshToken();
  const nextHash = await hashRefreshSecret(nextRefresh.secret);

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.refreshToken.update({
      where: { id: stored.id },
      data: {
        usedAt: new Date()
      }
    });

    await tx.refreshToken.create({
      data: {
        id: nextRefresh.id,
        userId: stored.userId,
        tokenHash: nextHash,
        familyId: stored.familyId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
  });

  const accessToken = await createAccessToken(stored.userId);

  res.cookie("refreshToken", nextRefresh.token, refreshCookieOptions());

  return res.json({
    accessToken
  });
});

app.get("/auth/me", async (req, res) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized"
    });
  }

  try {
    const token = authorization.slice(7);
    const payload = await verifyAccessToken(token);
    const userId = typeof payload.sub === "string" ? payload.sub : String(payload.sub);

    const user = await prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    return res.json(user);
  } catch {
    return res.status(401).json({
      message: "Invalid access token"
    });
  }
});

const PORT = Number(process.env.PORT ?? 3003);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Auth service running on http://localhost:${PORT}`);
});
