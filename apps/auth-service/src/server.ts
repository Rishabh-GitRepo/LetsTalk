import { app } from "./app.js";
import { config } from "./config.js";
import { connectRedis } from "./redis.js";

async function startServer() {
  await connectRedis();

  app.listen(config.port, "0.0.0.0", () => {
    console.log(`Auth service running on http://localhost:${config.port}`);
  });
}

startServer().catch((error) => {
  console.error(error);
  process.exit(1);
});

export { startServer };
