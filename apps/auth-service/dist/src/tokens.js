import crypto from "node:crypto";
import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "dev-super-secret-change-this");
export async function createAccessToken(userId) {
    return new SignJWT({
        sub: userId
    })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(process.env.ACCESS_TOKEN_EXPIRES ?? "15m")
        .sign(secret);
}
export async function verifyAccessToken(token) {
    const { payload } = await jwtVerify(token, secret);
    return payload;
}
export function generateRefreshSecret() {
    return crypto.randomBytes(32).toString("base64url");
}
export async function hashRefreshSecret(secret) {
    return argon2.hash(secret);
}
export async function verifyRefreshSecret(hash, secret) {
    return argon2.verify(hash, secret);
}
