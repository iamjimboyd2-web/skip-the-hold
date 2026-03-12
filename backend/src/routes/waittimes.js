import express from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { optionalAuthenticate } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

const waitTimeSchema = z.object({
  companyId: z.coerce.number().int().positive(),
  waitTimeMinutes: z.coerce.number().int().min(1).max(240),
  notes: z.string().trim().max(500).optional().or(z.literal(""))
});

router.post(
  "/",
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const payload = waitTimeSchema.parse(req.body);

    const company = await prisma.company.findUnique({
      where: { id: payload.companyId }
    });

    if (!company) {
      return res.status(404).json({ error: "Company not found." });
    }

    const waitTime = await prisma.waitTime.create({
      data: {
        companyId: payload.companyId,
        userId: req.user?.id || null,
        waitTimeMinutes: payload.waitTimeMinutes,
        notes: payload.notes || null
      },
      select: {
        id: true,
        companyId: true,
        waitTimeMinutes: true,
        notes: true,
        createdAt: true
      }
    });

    return res.status(201).json(waitTime);
  })
);

export default router;

