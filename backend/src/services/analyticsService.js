import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

const timeBuckets = [
  { label: "Early morning", startHour: 6, endHour: 9 },
  { label: "Late morning", startHour: 9, endHour: 12 },
  { label: "Afternoon", startHour: 12, endHour: 17 },
  { label: "Evening", startHour: 17, endHour: 21 }
];

function formatHourOfDay(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getHourInTimezone(date) {
  const formatted = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: env.ANALYTICS_TIMEZONE
  }).format(date);

  return Number(formatted);
}

function bucketForHour(hour) {
  return timeBuckets.find((bucket) => hour >= bucket.startHour && hour < bucket.endHour) || null;
}

function startOfTodayInServerTime() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function enrichCompaniesWithStats(companies) {
  if (companies.length === 0) {
    return [];
  }

  const aggregates = await prisma.waitTime.groupBy({
    by: ["companyId"],
    where: {
      companyId: { in: companies.map((company) => company.id) }
    },
    _avg: {
      waitTimeMinutes: true
    },
    _count: {
      _all: true
    }
  });

  const aggregateMap = new Map(
    aggregates.map((aggregate) => [
      aggregate.companyId,
      {
        averageWaitMinutes: aggregate._avg.waitTimeMinutes ? Number(aggregate._avg.waitTimeMinutes) : null,
        reportCount: aggregate._count._all
      }
    ])
  );

  return companies.map((company) => {
    const stats = aggregateMap.get(company.id) || {
      averageWaitMinutes: null,
      reportCount: 0
    };

    return {
      ...company,
      ...stats
    };
  });
}

export async function getCompanyInsights(companyId) {
  const [aggregate, reports] = await Promise.all([
    prisma.waitTime.aggregate({
      where: { companyId },
      _avg: { waitTimeMinutes: true },
      _count: { _all: true }
    }),
    prisma.waitTime.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        waitTimeMinutes: true,
        notes: true,
        createdAt: true
      }
    })
  ]);

  const bucketStats = new Map();

  for (const report of reports) {
    const hour = getHourInTimezone(report.createdAt);
    const bucket = bucketForHour(hour);

    if (!bucket) {
      continue;
    }

    const current = bucketStats.get(bucket.label) || {
      label: bucket.label,
      total: 0,
      count: 0
    };

    current.total += report.waitTimeMinutes;
    current.count += 1;
    bucketStats.set(bucket.label, current);
  }

  const sortedBuckets = [...bucketStats.values()]
    .map((entry) => ({
      label: entry.label,
      averageWaitMinutes: Math.round((entry.total / entry.count) * 10) / 10,
      sampleSize: entry.count
    }))
    .sort((left, right) => left.averageWaitMinutes - right.averageWaitMinutes);

  const bestTimeToCall =
    sortedBuckets.length > 0
      ? {
          recommendation: `${sortedBuckets[0].label} tends to be the fastest window for this company.`,
          bestWindow: sortedBuckets[0].label,
          averageWaitMinutes: sortedBuckets[0].averageWaitMinutes,
          sampleSize: sortedBuckets[0].sampleSize
        }
      : {
          recommendation: "We need more reports before we can recommend a time window.",
          bestWindow: null,
          averageWaitMinutes: null,
          sampleSize: 0
        };

  return {
    averageWaitMinutes: aggregate._avg.waitTimeMinutes ? Number(aggregate._avg.waitTimeMinutes) : null,
    reportCount: aggregate._count._all,
    recentReports: reports,
    bestTimeToCall
  };
}

export async function getCompanyBestTimeAnalytics(companyId) {
  const reports = await prisma.waitTime.findMany({
    where: { companyId },
    select: {
      waitTimeMinutes: true,
      createdAt: true
    }
  });

  if (reports.length === 0) {
    return {
      best_time: null,
      worst_time: null,
      average_wait: null
    };
  }

  const hourlyStats = new Map();
  let totalWait = 0;

  for (const report of reports) {
    const hour = getHourInTimezone(report.createdAt);
    const current = hourlyStats.get(hour) || { total: 0, count: 0 };
    current.total += report.waitTimeMinutes;
    current.count += 1;
    hourlyStats.set(hour, current);
    totalWait += report.waitTimeMinutes;
  }

  const hourlyAverages = [...hourlyStats.entries()]
    .map(([hour, stats]) => ({
      hour,
      average: stats.total / stats.count
    }))
    .sort((left, right) => {
      if (left.average === right.average) {
        return left.hour - right.hour;
      }

      return left.average - right.average;
    });

  const bestHour = hourlyAverages[0];
  const worstHour = [...hourlyAverages].sort((left, right) => {
    if (left.average === right.average) {
      return left.hour - right.hour;
    }

    return right.average - left.average;
  })[0];

  return {
    best_time: formatHourOfDay(bestHour.hour),
    worst_time: formatHourOfDay(worstHour.hour),
    average_wait: Math.round((totalWait / reports.length) * 10) / 10
  };
}

export async function getTrendingCompanies(limit = 8) {
  const today = startOfTodayInServerTime();

  const grouped = await prisma.waitTime.groupBy({
    by: ["companyId"],
    where: {
      createdAt: {
        gte: today
      }
    },
    _avg: {
      waitTimeMinutes: true
    },
    _count: {
      _all: true
    }
  });

  if (grouped.length === 0) {
    return [];
  }

  const companies = await prisma.company.findMany({
    where: {
      id: { in: grouped.map((entry) => entry.companyId) }
    }
  });

  const companyMap = new Map(companies.map((company) => [company.id, company]));

  return grouped
    .map((entry) => {
      const company = companyMap.get(entry.companyId);

      if (!company) {
        return null;
      }

      return {
        id: company.id,
        companyName: company.companyName,
        industry: company.industry,
        phone: company.phone,
        averageWaitMinutes: entry._avg.waitTimeMinutes ? Number(entry._avg.waitTimeMinutes) : null,
        reportCount: entry._count._all
      };
    })
    .filter(Boolean)
    .sort((left, right) => (right.averageWaitMinutes || 0) - (left.averageWaitMinutes || 0))
    .slice(0, limit);
}

export async function getAdminAnalytics() {
  const today = startOfTodayInServerTime();

  const [companyCount, reportCount, reportsToday, betaCount, averageWait, companies] = await Promise.all([
    prisma.company.count(),
    prisma.waitTime.count(),
    prisma.waitTime.count({
      where: {
        createdAt: { gte: today }
      }
    }),
    prisma.betaUser.count(),
    prisma.waitTime.aggregate({
      _avg: {
        waitTimeMinutes: true
      }
    }),
    prisma.company.findMany({
      select: {
        industry: true
      }
    })
  ]);

  const industryMap = new Map();

  for (const company of companies) {
    industryMap.set(company.industry, (industryMap.get(company.industry) || 0) + 1);
  }

  return {
    companyCount,
    reportCount,
    reportsToday,
    betaCount,
    averageWaitMinutes: averageWait._avg.waitTimeMinutes ? Number(averageWait._avg.waitTimeMinutes) : null,
    industries: [...industryMap.entries()]
      .map(([industry, count]) => ({ industry, count }))
      .sort((left, right) => right.count - left.count)
  };
}
