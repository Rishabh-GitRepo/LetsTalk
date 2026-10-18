import { createClient } from "redis";
export const redis = createClient({
    url: process.env.REDIS_URL ?? "redis://localhost:6380",
});
redis.on("error", (error) => {
    console.error("Redis error", error);
});
export async function connectRedis() {
    await redis.connect();
}
