import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../../prisma";
import { config } from "../../config";
import { asyncHandler, HttpError } from "../../middleware/errors";
import { requireAuth } from "../../middleware/auth";

const router = Router();

function signTokens(user: { id: string; role: string; email: string }) {
  const payload = { id: user.id, role: user.role, email: user.email };
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, { expiresIn: config.jwt.accessTtl } as jwt.SignOptions);
  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshTtl } as jwt.SignOptions);
  return { accessToken, refreshToken };
}

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid credentials");
    }
    const tokens = signTokens(user);
    res.json({ ...tokens, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as { id: string; role: string; email: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) throw new Error();
      res.json(signTokens(user));
    } catch {
      throw new HttpError(401, "Invalid refresh token");
    }
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, student: { select: { id: true } } },
    });
    res.json(user);
  })
);

export default router;
