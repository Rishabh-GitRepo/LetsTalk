import crypto from "node:crypto";
import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { config } from "../config.js";

const secret = new TextEncoder().encode(config.jwtSecret);

export async function createAccessToken(userId: string) {
  return new SignJWT({
    sub: userId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(config.jwtIssuer)
    .setAudience(config.jwtAudience)
    .setIssuedAt()
    .setExpirationTime(config.accessTokenExpires)
    .sign(secret);
}

export async function verifyAccessToken(token: string) {
  const { payload } = await jwtVerify(token, secret, {
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });

  return payload;
}

export function generateRefreshToken() {
  const id = crypto.randomUUID();
  const secretValue = crypto.randomBytes(32).toString("base64url");

  return {
    id,
    secret: secretValue,
    value: `${id}.${secretValue}`,
  };
}

export async function hashRefreshToken(secret: string) {
  return argon2.hash(secret);
}

export async function verifyRefreshToken(hash: string, secret: string) {
  return argon2.verify(hash, secret);
}
