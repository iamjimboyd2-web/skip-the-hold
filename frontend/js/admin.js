import {
  clearSession,
  createCompany,
  deleteWaitTime,
  formatDate,
  formatMinutes,
  getAdminAnalytics,
  getAdminReports,
  getCompanies,
  getMe,
  renderFeedback,
  updateCompany
} from "./api.js";

const analyticsGrid = document.getElementById("analytics-grid");
const companyForm = document.getElementById("company-form");
const adminSearchForm = document.getElementById("admin-search-form");
const adminCompanyResults = document.getElementById("admin-company-results");
const adminReportResults = document.getElementById("admin-report-results");
const adminFeedback = document.getElementById("admin-feedback");
const adminLogout = document.getElementById("admin-logout");
const companyReset = document.getElementById("company-reset");

function setCompanyForm(company = null) {
  document.getElementById("company-id").value = company?.id || "";
  document.getElementById("company-name").value = company?.companyName || "";
  document.getElementById("company-industry").value = company?.industry || "";
  document.getElementById("company-phone").value = company?.phone || "";
  document.getElementById("company-submit").textContent = company ? "Update company" : "Save company";
}

function renderAnalytics(analytics) {
  const cards = [
    ["Companies", analytics.companyCount],
    ["Reports total", analytics.reportCount],
    ["Reports today", analytics.reportsToday],
    ["Beta signups", analytics.betaCount],
    ["Average wait", analytics.averageWaitMinutes ? `${Math.round(analytics.averageWaitMinutes)} min` : "--"]
  ];

  analyticsGrid.innerHTML = cards
    .map(
      ([label, value]) => `
        <article class="analytics-card">
          <span class="stat-label">${label}</span>
          <strong>${value}</strong>
        </article>
      `
    )
    .join("");
}

function renderCompanies(companies) {
  if (!companies.length) {
    adminCompanyResults.innerHTML = `<article class="admin-item"><p>No companies found.</p></article>`;
    return;
  }

  adminCompanyResults.innerHTML = companies
    .map(
      (company) => `
        <article class="admin-item">
          <div>
            <h3>${company.companyName}</h3>
            <div class="admin-meta">
              <span class="pill">${company.industry}</span>
              <span class="meta-label">${company.phone}</span>
              <span class="meta-label">${company.reportCount || 0} reports</span>
            </div>
          </div>
          <button class="secondary-button" data-action="edit-company" data-id="${company.id}">Edit</button>
        </article>
      `
    )
    .join("");
}

function renderReports(reports) {
  if (!reports.length) {
    adminReportResults.innerHTML = `<article class="admin-item"><p>No reports available.</p></article>`;
    return;
  }

  adminReportResults.innerHTML = reports
    .map(
      (report) => `
        <article class="admin-item">
          <div>
            <div class="card-topline">
              <span class="pill wait-pill">${formatMinutes(report.waitTimeMinutes)}</span>
              <span class="pill">${report.company.companyName}</span>
            </div>
            <p>${report.notes || "No notes included."}</p>
            <div class="admin-meta">
              <span class="meta-label">${formatDate(report.createdAt)}</span>
              <span class="meta-label">${report.user?.email || "Anonymous"}</span>
            </div>
          </div>
          <button class="ghost-button" data-action="delete-report" data-report-id="${report.id}">Delete</button>
        </article>
      `
    )
    .join("");
}

let companyCache = [];

async function loadDashboard() {
  const [analytics, companyResponse, reportResponse] = await Promise.all([
    getAdminAnalytics(),
    getCompanies("limit=12"),
    getAdminReports(30)
  ]);

  companyCache = companyResponse.items;
  renderAnalytics(analytics);
  renderCompanies(companyResponse.items);
  renderReports(reportResponse.items);
}

companyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("company-id").value;
  const payload = {
    companyName: document.getElementById("company-name").value.trim(),
    industry: document.getElementById("company-industry").value.trim(),
    phone: document.getElementById("company-phone").value.trim()
  };

  try {
    if (id) {
      await updateCompany(id, payload);
      renderFeedback(adminFeedback, "Company updated.", "success");
    } else {
      await createCompany(payload);
      renderFeedback(adminFeedback, "Company created.", "success");
    }

    setCompanyForm();
    await loadDashboard();
  } catch (error) {
    renderFeedback(adminFeedback, error.message, "error");
  }
});

companyReset.addEventListener("click", () => setCompanyForm());

adminSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = document.getElementById("admin-search-query").value.trim();

  try {
    const response = await getCompanies(`q=${encodeURIComponent(query)}&limit=12`);
    companyCache = response.items;
    renderCompanies(response.items);
  } catch (error) {
    renderFeedback(adminFeedback, error.message, "error");
  }
});

adminCompanyResults.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action='edit-company']");

  if (!button) {
    return;
  }

  const company = companyCache.find((entry) => entry.id === Number(button.dataset.id));

  if (!company) {
    return;
  }

  setCompanyForm(company);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

adminReportResults.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action='delete-report']");

  if (!button) {
    return;
  }

  try {
    await deleteWaitTime(button.dataset.reportId);
    renderFeedback(adminFeedback, "Report deleted.", "success");
    await loadDashboard();
  } catch (error) {
    renderFeedback(adminFeedback, error.message, "error");
  }
});

adminLogout.addEventListener("click", () => {
  clearSession();
  window.location.href = "/login.html";
});

async function init() {
  try {
    const { user } = await getMe();

    if (user.role !== "ADMIN") {
      window.location.href = "/login.html";
      return;
    }

    await loadDashboard();
  } catch (_error) {
    clearSession();
    window.location.href = "/login.html";
  }
}

init();
