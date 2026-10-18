import { prisma } from "../db.js";
import { loginUser, refreshUser, registerUser, } from "../services/auth.service.js";
import { verifyAccessToken } from "../services/token.service.js";
const cookieOptions = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};
export async function registerController(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "email and password are required",
            });
        }
        const result = await registerUser(email, password, String(req.headers["x-request-id"] ?? ""));
        res.cookie("refreshToken", result.refreshToken, cookieOptions);
        return res.status(201).json({
            accessToken: result.accessToken,
            user: {
                id: result.user.id,
                email: result.user.email,
            },
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
            return res.status(409).json({
                message: "Email already exists",
            });
        }
        console.error(error);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
export async function loginController(req, res) {
    try {
        const { email, password } = req.body;
        const result = await loginUser(email ?? "", password ?? "");
        res.cookie("refreshToken", result.refreshToken, cookieOptions);
        return res.json({
            accessToken: result.accessToken,
        });
    }
    catch {
        return res.status(401).json({
            message: "Invalid credentials",
        });
    }
}
export async function refreshController(req, res) {
    try {
        const token = req.cookies.refreshToken;
        if (!token) {
            return res.status(401).json({
                message: "Refresh token missing",
            });
        }
        const result = await refreshUser(token);
        res.cookie("refreshToken", result.refreshToken, cookieOptions);
        return res.json({
            accessToken: result.accessToken,
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === "REFRESH_TOKEN_REUSE") {
            res.clearCookie("refreshToken");
            return res.status(401).json({
                message: "Refresh token reuse detected",
            });
        }
        return res.status(401).json({
            message: "Invalid refresh token",
        });
    }
}
export async function getMeController(req, res) {
    const authorization = req.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }
    try {
        const token = authorization.slice(7);
        const payload = await verifyAccessToken(token);
        const userId = typeof payload.sub === "string" ? payload.sub : String(payload.sub);
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                createdAt: true,
            },
        });
        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }
        return res.json(user);
    }
    catch {
        return res.status(401).json({
            message: "Invalid access token",
        });
    }
}
