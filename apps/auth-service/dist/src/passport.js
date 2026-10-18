import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { config } from "./config.js";
passport.use(new GoogleStrategy({
    clientID: config.google.clientId,
    clientSecret: config.google.clientSecret,
    callbackURL: config.google.callbackUrl,
}, async (_accessToken, _refreshToken, profile, done) => {
    try {
        done(null, {
            googleId: profile.id,
            email: profile.emails?.[0]?.value,
        });
    }
    catch (error) {
        done(error);
    }
}));
export default passport;
