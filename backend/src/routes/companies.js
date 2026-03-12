import express from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  enrichCompaniesWithStats,
  getCompanyBestTimeAnalytics,
  getCompanyInsights
} from "../services/analyticsService.js";

const router = express.Router();

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

function buildCompanyWhere({ q, industry }) {
  const where = {};

  if (q) {
    where.OR = [
      { companyName: { contains: q, mode: "insensitive" } },
      { industry: { contains: q, mode: "insensitive" } }
    ];
  }

  if (industry && industry !== "All") {
    where.industry = { equals: industry, mode: "insensitive" };
  }

  return where;
}

async function fetchCompanyPage(params) {
  const where = buildCompanyWhere(params);
  const skip = (params.page - 1) * params.limit;

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { companyName: "asc" },
      skip,
      take: params.limit
    }),
    prisma.company.count({ where })
  ]);

  const items = await enrichCompaniesWithStats(companies);

  return {
    items,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.limit))
    }
  };
}

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const params = listQuerySchema.parse(req.query);
    const result = await fetchCompanyPage(params);
    res.json(result);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const params = listQuerySchema.parse(req.query);
    const result = await fetchCompanyPage(params);
    res.json(result);
  })
);

router.get(
  "/:id/average",
  asyncHandler(async (req, res) => {
    const companyId = Number(req.params.id);

    if (Number.isNaN(companyId)) {
      return res.status(400).json({ error: "Company id must be a number." });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });

    if (!company) {
      return res.status(404).json({ error: "Company not found." });
    }

    const stats = await prisma.waitTime.aggregate({
      where: { companyId },
      _avg: { waitTimeMinutes: true },
      _count: { _all: true }
    });

    return res.json({
      companyId,
      averageWaitMinutes: stats._avg.waitTimeMinutes ? Number(stats._avg.waitTimeMinutes) : null,
      reportCount: stats._count._all
    });
  })
);

router.get(
  "/:id/best-time",
  asyncHandler(async (req, res) => {
    const companyId = Number(req.params.id);

    if (Number.isNaN(companyId)) {
      return res.status(400).json({ error: "Company id must be a number." });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });

    if (!company) {
      return res.status(404).json({ error: "Company not found." });
    }

    const analytics = await getCompanyBestTimeAnalytics(companyId);
    return res.json(analytics);
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const companyId = Number(req.params.id);

    if (Number.isNaN(companyId)) {
      return res.status(400).json({ error: "Company id must be a number." });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return res.status(404).json({ error: "Company not found." });
    }

    const [insights, bestTimeAnalytics] = await Promise.all([
      getCompanyInsights(companyId),
      getCompanyBestTimeAnalytics(companyId)
    ]);

    return res.json({
      ...company,
      ...insights,
      bestTimeAnalytics
    });
  })
);

export default router;
