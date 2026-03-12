import express from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getAdminAnalytics } from "../services/analyticsService.js";

const router = express.Router();

const companySchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  industry: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(7).max(30)
});

const adminWaitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

router.use(authenticate, requireAdmin);

router.get(
  "/analytics",
  asyncHandler(async (_req, res) => {
    const analytics = await getAdminAnalytics();
    res.json(analytics);
  })
);

router.get(
  "/waittimes",
  asyncHandler(async (req, res) => {
    const { limit } = adminWaitQuerySchema.parse(req.query);

    const reports = await prisma.waitTime.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        company: {
          select: {
            companyName: true,
            industry: true
          }
        },
        user: {
          select: {
            email: true
          }
        }
      }
    });

    res.json({ items: reports });
  })
);

router.post(
  "/companies",
  asyncHandler(async (req, res) => {
    const payload = companySchema.parse(req.body);

    const existing = await prisma.company.findUnique({
      where: { phone: payload.phone }
    });

    if (existing) {
      return res.status(409).json({ error: "A company with that phone number already exists." });
    }

    const company = await prisma.company.create({
      data: payload
    });

    return res.status(201).json(company);
  })
);

router.put(
  "/companies/:id",
  asyncHandler(async (req, res) => {
    const companyId = Number(req.params.id);

    if (Number.isNaN(companyId)) {
      return res.status(400).json({ error: "Company id must be a number." });
    }

    const payload = companySchema.parse(req.body);

    const company = await prisma.company.update({
      where: { id: companyId },
      data: payload
    });

    return res.json(company);
  })
);

router.delete(
  "/waittimes/:id",
  asyncHandler(async (req, res) => {
    const waitTimeId = Number(req.params.id);

    if (Number.isNaN(waitTimeId)) {
      return res.status(400).json({ error: "Wait time id must be a number." });
    }

    await prisma.waitTime.delete({
      where: { id: waitTimeId }
    });

    return res.status(204).send();
  })
);

export default router;
