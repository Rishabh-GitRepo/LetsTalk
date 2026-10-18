import express from "express";
import cookieParser from "cookie-parser";
import passport from "passport";
import authRoutes from "./routes/auth.routes.js";
import oauthRoutes from "./routes/oauth.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

export const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "auth-service",
    version: "1.0.0",
  });
});

app.use("/auth", authRoutes);
app.use("/auth", oauthRoutes);
app.use(errorMiddleware);
