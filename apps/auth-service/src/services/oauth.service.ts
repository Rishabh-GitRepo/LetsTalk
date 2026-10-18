import crypto from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../db.js";
import { createAuthSession } from "./auth.service.js";

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function handleGoogleLogin(googleId: string, email: string) {
  const provider = "google";
  const normalizedEmail = email.trim().toLowerCase();
  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: googleId,
      },
    },
    include: { user: true },
  });

  if (existingAccount) {
    return createAuthSession(existingAccount.userId);
  }

  let userId: string;
  try {
    const linkedUser = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    });

    if (linkedUser) {
      await prisma.oAuthAccount.create({
        data: {
          provider,
          providerAccountId: googleId,
          userId: linkedUser.id,
        },
      });
      userId = linkedUser.id;
    } else {
      const passwordHash = await argon2.hash(
        crypto.randomBytes(32).toString("base64url"),
      );

      const user = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: { email: normalizedEmail, passwordHash },
        });

        await tx.oAuthAccount.create({
          data: {
            provider,
            providerAccountId: googleId,
            userId: createdUser.id,
          },
        });

        return createdUser;
      });
      userId = user.id;
    }
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const concurrentAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider,
          providerAccountId: googleId,
        },
      },
    });
    if (!concurrentAccount) {
      throw error;
    }
    userId = concurrentAccount.userId;
  }

  return createAuthSession(userId);
}
