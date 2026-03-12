import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import { PrismaClient, Role } from "@prisma/client";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const companiesCsvPath = path.resolve(__dirname, "../../database/companies.csv");

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

async function loadCompaniesFromCsv() {
  const rawCsv = await fs.readFile(companiesCsvPath, "utf8");
  const [header, ...lines] = rawCsv.split(/\r?\n/).filter(Boolean);

  if (!header) {
    throw new Error("companies.csv is empty.");
  }

  const columns = parseCsvLine(header).map((column) => column.toLowerCase());
  const companyNameIndex = columns.indexOf("company_name");
  const industryIndex = columns.indexOf("industry");
  const phoneIndex = columns.indexOf("phone");

  if (companyNameIndex === -1 || industryIndex === -1 || phoneIndex === -1) {
    throw new Error("companies.csv must include company_name, industry, and phone columns.");
  }

  const companies = lines.map((line) => {
    const values = parseCsvLine(line);

    return {
      companyName: values[companyNameIndex],
      industry: values[industryIndex],
      phone: values[phoneIndex]
    };
  });

  const uniqueCompanies = new Map();

  for (const company of companies) {
    if (!company.companyName || !company.industry || !company.phone) {
      continue;
    }

    uniqueCompanies.set(company.phone, company);
  }

  return [...uniqueCompanies.values()];
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function createSampleReports(companies) {
  const reports = [];
  const today = startOfToday().getTime();

  companies.slice(0, 140).forEach((company, index) => {
    const totalReports = 4 + (index % 5);

    for (let i = 0; i < totalReports; i += 1) {
      const hoursAgo = (index * 3 + i * 5) % 72;
      const createdAt = new Date(today + ((index + i) % 24) * 60 * 60 * 1000);
      createdAt.setHours((8 + index + i * 2) % 24, (index * 7) % 60, 0, 0);

      const waitBase = 8 + (index % 6) * 4;
      const surge = hoursAgo < 24 ? 10 : 0;
      const waitTimeMinutes = Math.min(95, waitBase + surge + ((i * 7 + index) % 18));

      reports.push({
        companyId: company.id,
        waitTimeMinutes,
        notes:
          i % 3 === 0
            ? "Reported during a busy customer service period."
            : i % 3 === 1
              ? "Reached the billing queue before speaking with an agent."
              : "Automated menu was short, but the live queue took longer.",
        createdAt
      });
    }
  });

  return reports;
}

async function main() {
  const allCompanies = await loadCompaniesFromCsv();

  if (allCompanies.length < 300) {
    throw new Error(`companies.csv must contain at least 300 valid companies. Found ${allCompanies.length}.`);
  }

  for (const { companyName, industry, phone } of allCompanies) {
    await prisma.company.upsert({
      where: { phone },
      update: { companyName, industry },
      create: { companyName, industry, phone }
    });
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@skiptheholdapp.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: Role.ADMIN },
    create: {
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN
    }
  });

  const reportCount = await prisma.waitTime.count();

  if (reportCount === 0) {
    const companies = await prisma.company.findMany({
      orderBy: { id: "asc" }
    });

    const sampleReports = createSampleReports(companies);
    const chunkSize = 100;

    for (let index = 0; index < sampleReports.length; index += chunkSize) {
      const chunk = sampleReports.slice(index, index + chunkSize);
      await prisma.waitTime.createMany({ data: chunk });
    }
  }

  console.log(`Imported ${allCompanies.length} companies from companies.csv and ensured admin access.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
