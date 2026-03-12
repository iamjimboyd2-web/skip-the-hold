import express from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

const betaSchema = z.object({
  email: z.string().email()
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { email } = betaSchema.parse(req.body);

    const betaUser = await prisma.betaUser.upsert({
      where: { email },
      update: {},
      create: { email }
    });

    return res.status(201).json(betaUser);
  })
);

export default router;

