import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(12),
  JWT_EXPIRES_IN: z.string().default("7d"),
  FRONTEND_ORIGIN: z.string().default("http://localhost:8080"),
  ANALYTICS_TIMEZONE: z.string().default("America/Los_Angeles"),
  ADMIN_EMAIL: z.string().email().default("admin@skiptheholdapp.com"),
  ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!")
});

export const env = envSchema.parse(process.env);

