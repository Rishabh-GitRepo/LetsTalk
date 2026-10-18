import type { Request, Response } from "express";
import { prisma } from "../db.js";
import {
  loginUser,
  logoutUser,
  refreshUser,
  registerUser,
} from "../services/auth.service.js";
import { verifyAccessToken } from "../services/token.service.js";
import { config } from "../config.js";

const cookieOptions = {
  httpOnly: true,
  secure: config.cookieSecure,
  sameSite: "lax" as const,
  path: "/",
  maxAge: config.refreshTokenDays * 24 * 60 * 60 * 1000,
};

export async function registerController(req: Request, res: Response) {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        message: "email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "password must be at least 8 characters",
      });
    }

    const result = await registerUser(
      email,
      password,
      String(req.headers["x-request-id"] ?? ""),
    );

    res.cookie("refreshToken", result.refreshToken, cookieOptions);

    return res.status(201).json({
      accessToken: result.accessToken,
      user: {
        id: result.user.id,
        email: result.user.email,
      },
    });
  } catch (error) {
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

export async function loginController(req: Request, res: Response) {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email ||
    !password
  ) {
    return res.status(400).json({
      message: "email and password are required",
    });
  }

  try {
    const result = await loginUser(email, password);

    res.cookie("refreshToken", result.refreshToken, cookieOptions);

    return res.json({
      accessToken: result.accessToken,
    });
  } catch (error) {
    if (!(error instanceof Error) || error.message !== "INVALID_CREDENTIALS") {
      console.error(error);
      return res.status(500).json({ message: "Internal server error" });
    }

    return res.status(401).json({
      message: "Invalid credentials",
    });
  }
}

export async function refreshController(req: Request, res: Response) {
  try {
    const token = req.cookies.refreshToken as string | undefined;

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
  } catch (error) {
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

export async function logoutController(req: Request, res: Response) {
  try {
    await logoutUser(req.cookies.refreshToken as string | undefined);
  } catch (error) {
    console.error(error);
    res.clearCookie("refreshToken", cookieOptions);
    return res.status(500).json({
      message: "Internal server error",
    });
  }

  res.clearCookie("refreshToken", cookieOptions);
  return res.status(204).end();
}

export async function getMeController(req: Request, res: Response) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const token = authorization.slice(7);
    const payload = await verifyAccessToken(token);
    const userId =
      typeof payload.sub === "string" ? payload.sub : String(payload.sub);

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
  } catch {
    return res.status(401).json({
      message: "Invalid access token",
    });
  }
}
