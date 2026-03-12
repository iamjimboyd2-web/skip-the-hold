import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

async function resolveUserFromToken(token) {
  const payload = jwt.verify(token, env.JWT_SECRET);

  const user = await prisma.user.findUnique({
    where: { id: Number(payload.sub) },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  return user;
}

function readBearerToken(req) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length);
}

export async function optionalAuthenticate(req, _res, next) {
  try {
    const token = readBearerToken(req);

    if (!token) {
      req.user = null;
      return next();
    }

    req.user = await resolveUserFromToken(token);
    return next();
  } catch (_error) {
    req.user = null;
    return next();
  }
}

export async function authenticate(req, res, next) {
  try {
    const token = readBearerToken(req);

    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    const user = await resolveUserFromToken(token);

    if (!user) {
      return res.status(401).json({ error: "Invalid token." });
    }

    req.user = user;
    return next();
  } catch (_error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required." });
  }

  return next();
}

