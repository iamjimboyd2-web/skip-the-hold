import express from "express";
import { z } from "zod";
import { getTrendingCompanies } from "../services/analyticsService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

const trendingSchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(8)
});

router.get(
  "/trending",
  asyncHandler(async (req, res) => {
    const { limit } = trendingSchema.parse(req.query);
    const companies = await getTrendingCompanies(limit);
    res.json({ items: companies });
  })
);

export default router;

