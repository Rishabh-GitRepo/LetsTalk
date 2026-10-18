import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 3003),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5433/letstalk_db?schema=public",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6380",
  jwtSecret: process.env.JWT_SECRET ?? "dev-super-secret-change-this",
  jwtIssuer: process.env.JWT_ISSUER ?? "letstalk",
  jwtAudience: process.env.JWT_AUDIENCE ?? "letstalk-web",
  accessTokenExpires: process.env.ACCESS_TOKEN_EXPIRES ?? "15m",
  refreshTokenDays: Number(process.env.REFRESH_TOKEN_DAYS ?? 7),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      "http://localhost:3003/auth/google/callback",
  },
  cookieSecure: process.env.COOKIE_SECURE === "true",
};
