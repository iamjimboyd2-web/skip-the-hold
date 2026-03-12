import {
  formatDate,
  formatMinutes,
  getCompany,
  getCompanyBestTime,
  renderFeedback,
  submitWaitTime
} from "./api.js";

const companyCard = document.getElementById("company-card");
const companyFeedback = document.getElementById("company-feedback");
const bestTimeCard = document.getElementById("best-time-card");
const reportForm = document.getElementById("report-form");
const reportFeedback = document.getElementById("report-feedback");
const recentReports = document.getElementById("recent-reports");

const params = new URLSearchParams(window.location.search);
const companyId = params.get("id");

function renderCompany(company, bestTimeAnalytics) {
  const bestTime = bestTimeAnalytics?.best_time || "Not enough data";
  const worstTime = bestTimeAnalytics?.worst_time || "Not enough data";

  companyCard.innerHTML = `
    <div>
      <div class="card-topline">
        <span class="pill">${company.industry}</span>
        <span class="pill wait-pill">${formatMinutes(company.averageWaitMinutes)}</span>
      </div>
      <h1>${company.companyName}</h1>
      <div class="detail-meta">
        <span class="meta-label">${company.phone}</span>
        <span class="meta-label">${company.reportCount} reports total</span>
      </div>
    </div>
    <div class="stats-grid">
      <article class="analytics-card">
        <span class="stat-label">Average wait</span>
        <strong>${formatMinutes(company.averageWaitMinutes)}</strong>
      </article>
      <article class="analytics-card">
        <span class="stat-label">Best time to call</span>
        <strong>${bestTime}</strong>
      </article>
      <article class="analytics-card">
        <span class="stat-label">Worst time to call</span>
        <strong>${worstTime}</strong>
      </article>
    </div>
  `;
}

function renderBestTime(company, bestTimeAnalytics) {
  const averageWait = bestTimeAnalytics?.average_wait;
  const bestTime = bestTimeAnalytics?.best_time;
  const worstTime = bestTimeAnalytics?.worst_time;
  const hasPrediction = bestTime && worstTime;

  bestTimeCard.innerHTML = `
    <div class="best-time-shell">
      <div class="pill">${hasPrediction ? bestTime : "More data needed"}</div>
      <h3>${hasPrediction ? "Best Time to Call" : "Hourly prediction unavailable"}</h3>
      <p>${hasPrediction ? `Average wait is ${formatMinutes(averageWait)}. Lowest waits trend around ${bestTime}, while the highest waits trend around ${worstTime}.` : "Submit more reports to unlock best and worst call-time predictions."}</p>
      <div class="stats-grid">
        <article class="analytics-card">
          <span class="stat-label">Average wait time</span>
          <strong>${formatMinutes(averageWait)}</strong>
        </article>
        <article class="analytics-card">
          <span class="stat-label">Best time to call</span>
          <strong>${bestTime || "--"}</strong>
        </article>
        <article class="analytics-card">
          <span class="stat-label">Worst time to call</span>
          <strong>${worstTime || "--"}</strong>
        </article>
      </div>
      <p class="meta-label">${company.reportCount} reports analyzed</p>
    </div>
  `;
}

function renderReports(reports) {
  if (!reports.length) {
    recentReports.innerHTML = `<article class="report-card"><p>No reports yet. Be the first to help the next caller.</p></article>`;
    return;
  }

  recentReports.innerHTML = reports
    .map(
      (report) => `
        <article class="report-card">
          <div class="card-topline">
            <span class="pill wait-pill">${formatMinutes(report.waitTimeMinutes)}</span>
            <span class="meta-label">${formatDate(report.createdAt)}</span>
          </div>
          <p>${report.notes || "No extra notes included."}</p>
        </article>
      `
    )
    .join("");
}

async function loadCompany() {
  if (!companyId) {
    renderFeedback(companyFeedback, "Missing company id.", "error");
    return;
  }

  try {
    const [company, bestTimeAnalytics] = await Promise.all([getCompany(companyId), getCompanyBestTime(companyId)]);
    document.title = `${company.companyName} | Skip the Hold`;
    renderCompany(company, bestTimeAnalytics);
    renderBestTime(company, bestTimeAnalytics);
    renderReports(company.recentReports);
  } catch (error) {
    renderFeedback(companyFeedback, error.message, "error");
  }
}

reportForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    await submitWaitTime({
      companyId,
      waitTimeMinutes: document.getElementById("wait-minutes").value,
      notes: document.getElementById("wait-notes").value.trim()
    });

    reportForm.reset();
    renderFeedback(reportFeedback, "Report submitted. Thanks for helping the next caller.", "success");
    await loadCompany();
  } catch (error) {
    renderFeedback(reportFeedback, error.message, "error");
  }
});

loadCompany();
