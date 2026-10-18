import express from "express";
import cors from "cors";
import type { IncomingMessage } from "node:http";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();

const PORT = 3000;
const AUTH_SERVICE_URL = "http://localhost:3003";

/*
 * CORS
 */
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

/*
 * Gateway health
 */
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "gateway",
  });
});

/*
 * AUTH PROXY
 *
 * IMPORTANT:
 * Proxy comes BEFORE express.json()
 */
app.use(
  "/auth",
  createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,

    on: {
      proxyReq: (proxyReq, req: IncomingMessage) => {
        console.log(
          `[Gateway] ${req.method} ${req.url} -> ${AUTH_SERVICE_URL}`,
        );
      },

      proxyRes: (proxyRes, req) => {
        console.log(
          `[Gateway] Auth response: ${proxyRes.statusCode} ${req.url}`,
        );
      },

      error: (err, req, res) => {
        console.error("[Gateway Proxy Error]", err);

        const response = res as any;

        if (response && !response.headersSent) {
          response.statusCode = 502;
          response.setHeader("Content-Type", "application/json");

          response.end(
            JSON.stringify({
              message: "Auth service unavailable",
            }),
          );
        }
      },
    },
  }),
);

/*
 * JSON parser
 *
 * Keep this AFTER proxy.
 */
app.use(express.json());

/*
 * Start Gateway
 */
app.listen(PORT, () => {
  console.log(`Gateway running on http://localhost:${PORT}`);
});