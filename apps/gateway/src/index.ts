import express from "express";
// pg does not provide TypeScript declarations in the installed package.
// @ts-expect-error Missing declaration file for module "pg".
import { Pool } from "pg";
import { createClient } from "redis";
import cors from "cors";


const app = express();
const PORT = 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

const pool = new Pool({
  connectionString:
    "postgresql://letstalk_user:letstalk_password@localhost:5433/letstalk_db",
});

const redis = createClient({
  url: process.env.REDIS_URL ?? "redis://localhost:6380",
});

redis.on("error", (error) => {
  console.error("Redis error:", error);
});

async function start() {
  await redis.connect();

  app.get("/health", async (_req, res) => {
    let postgres = false;
    let redisStatus = false;

    try {
      await pool.query("SELECT 1");
      postgres = true;
    } catch (error) {
      console.error("Postgres health check failed:", error);
    }

    try {
      redisStatus = (await redis.ping()) === "PONG";
    } catch (error) {
      console.error("Redis health check failed:", error);
    }

    const healthy = postgres && redisStatus;

    res.status(healthy ? 200 : 503).json({
      status: healthy ? "ok" : "error",
      postgres,
      redis: redisStatus,
    });
  });

  app.listen(PORT, () => {
    console.log(`Gateway running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start gateway:", error);
  process.exit(1);
});