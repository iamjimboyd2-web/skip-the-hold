import bcrypt from "bcryptjs";
import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post(
  "/register",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = credentialsSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    const token = signToken(user);

    return res.status(201).json({ user, token });
  })
);

router.post(
  "/login",
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = credentialsSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };

    const token = signToken(safeUser);

    return res.json({ user: safeUser, token });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  })
);

export default router;

