import crypto from "node:crypto";
import { Router } from "express";
import passport from "../passport.js";
import { config } from "../config.js";
import { handleGoogleLogin } from "../services/oauth.service.js";

const router = Router();
const cookieOptions = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: "lax" as const,
  path: "/",
  maxAge: config.refreshTokenDays * 24 * 60 * 60 * 1000,
};
const oauthStateCookieOptions = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: "lax" as const,
  path: "/auth/google",
  maxAge: 10 * 60 * 1000,
};

router.get("/google", (req, res, next) => {
  if (!config.google.clientId || !config.google.clientSecret) {
    return res.redirect(`${config.frontendUrl}/?oauth=not-configured`);
  }

  const state = crypto.randomBytes(32).toString("base64url");
  res.cookie("googleOAuthState", state, oauthStateCookieOptions);

  return passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state,
  })(req, res, next);
});

router.get("/google/callback", (req, res, next) => {
  const expectedState = req.cookies.googleOAuthState as string | undefined;
  const receivedState =
    typeof req.query.state === "string" ? req.query.state : undefined;
  res.clearCookie("googleOAuthState", {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/auth/google",
  });

  if (
    !expectedState ||
    !receivedState ||
    expectedState.length !== receivedState.length ||
    !crypto.timingSafeEqual(
      Buffer.from(expectedState),
      Buffer.from(receivedState),
    )
  ) {
    return res.redirect(`${config.frontendUrl}/?oauth=error`);
  }

  passport.authenticate(
    "google",
    { session: false },
    async (error: Error | null, user: Express.User | false | null) => {
      if (error) {
        return next(error);
      }

      if (!user) {
        return res.redirect(`${config.frontendUrl}/?oauth=error`);
      }

      try {
        const result = await handleGoogleLogin(user.googleId, user.email);
        res.cookie("refreshToken", result.refreshToken, cookieOptions);
        return res.redirect(`${config.frontendUrl}/?oauth=success`);
      } catch (loginError) {
        return next(loginError);
      }
    },
  )(req, res, next);
});

export default router;
