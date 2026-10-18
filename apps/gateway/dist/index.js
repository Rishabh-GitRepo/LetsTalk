import express from "express";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
const app = express();
const PORT = 3000;
const AUTH_SERVICE_URL = "http://localhost:3003";
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));
app.use(express.json());
app.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "gateway",
    });
});
app.use("/auth", createProxyMiddleware({
    target: AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        "^/auth": "/auth",
    },
    on: {
        proxyReq: (_proxyReq, req) => {
            const reqAny = req;
            console.log(`[Gateway] ${req.method} ${reqAny.originalUrl ?? req.url}`);
        },
        error: (err, _req, res) => {
            console.error("[Gateway Proxy Error]", err);
            const response = res;
            if (response && !response.headersSent) {
                response.writeHead(502, {
                    "Content-Type": "application/json",
                });
                response.end(JSON.stringify({ message: "Auth service unavailable" }));
            }
        },
    },
}));
app.listen(PORT, () => {
    console.log(`Gateway running on http://localhost:${PORT}`);
});
