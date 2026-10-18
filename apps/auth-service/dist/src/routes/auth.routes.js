import { Router } from "express";
import { getMeController, loginController, refreshController, registerController, } from "../controllers/auth.controller.js";
const router = Router();
router.post("/register", registerController);
router.post("/login", loginController);
router.post("/refresh", refreshController);
router.get("/me", getMeController);
export default router;
