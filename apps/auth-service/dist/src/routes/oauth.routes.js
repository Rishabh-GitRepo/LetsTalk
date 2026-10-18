import { Router } from "express";
import passport from "../passport.js";
const router = Router();
router.get("/google", passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
}));
router.get("/google/callback", passport.authenticate("google", {
    session: false,
    failureRedirect: "/login",
}), async (_req, res) => {
    res.redirect("/");
});
export default router;
