import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "./config.js";

declare global {
  namespace Express {
    interface User {
      googleId: string;
      email: string;
    }
  }
}

if (config.google.clientId && config.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
      },
      (_accessToken, _refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value;
        const emailVerified = profile._json.email_verified === true;

        if (!email || !emailVerified) {
          return done(null, false);
        }

        return done(null, {
          googleId: profile.id,
          email,
        });
      },
    ),
  );
}

export default passport;
