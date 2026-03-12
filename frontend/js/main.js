import {
  betaSignup,
  clearSession,
  formatMinutes,
  getCompanies,
  getStoredUser,
  getTrending,
  renderFeedback,
  searchCompanies
} from "./api.js";

const heroTrending = document.getElementById("hero-trending");
const trendingList = document.getElementById("trending-list");
const searchForm = document.getElementById("search-form");
const searchResults = document.getElementById("search-results");
const searchFeedback = document.getElementById("search-feedback");
const betaForm = document.getElementById("beta-form");
const betaFeedback = document.getElementById("beta-feedback");
const loginLink = document.getElementById("login-link");
const adminLink = document.getElementById("admin-link");
const logoutButton = document.getElementById("logout-button");
const statTrendingCount = document.getElementById("stat-trending-count");
const statLongestWait = document.getElementById("stat-longest-wait");

function companyCard(company) {
  return `
    <article class="company-card">
      <div class="card-topline">
        <span class="pill">${company.industry}</span>
        <span class="pill wait-pill">${formatMinutes(company.averageWaitMinutes)}</span>
      </div>
      <div>
        <h3>${company.companyName}</h3>
        <p>${company.phone}</p>
      </div>
      <div class="detail-meta">
        <span class="meta-label">${company.reportCount || 0} reports</span>
      </div>
      <a class="primary-button" href="/company.html?id=${company.id}">View company</a>
    </article>
  `;
}

function miniItem(company, rank) {
  return `
    <a class="mini-item" href="/company.html?id=${company.id}">
      <div class="card-topline">
        <span class="pill">#${rank}</span>
        <span class="pill wait-pill">${formatMinutes(company.averageWaitMinutes)}</span>
      </div>
      <strong>${company.companyName}</strong>
      <span class="meta-label">${company.industry}</span>
    </a>
  `;
}

function updateNavForSession() {
  const user = getStoredUser();

  if (!user) {
    loginLink.classList.remove("hidden");
    adminLink.classList.add("hidden");
    logoutButton.classList.add("hidden");
    return;
  }

  loginLink.textContent = user.email;
  logoutButton.classList.remove("hidden");

  if (user.role === "ADMIN") {
    adminLink.classList.remove("hidden");
  }
}

async function loadTrending() {
  const { items } = await getTrending(6);

  if (items.length === 0) {
    heroTrending.innerHTML = `<p class="meta-label">No reports have been submitted yet today.</p>`;
    trendingList.innerHTML = `<p class="meta-label">Trending data appears here once people start reporting.</p>`;
    statTrendingCount.textContent = "0";
    statLongestWait.textContent = "--";
    return;
  }

  heroTrending.innerHTML = items.slice(0, 4).map((company, index) => miniItem(company, index + 1)).join("");
  trendingList.innerHTML = items.map(companyCard).join("");
  statTrendingCount.textContent = String(items.length);
  statLongestWait.textContent = formatMinutes(items[0].averageWaitMinutes);
}

async function loadDefaultCompanies() {
  const result = await getCompanies("limit=6");
  searchResults.innerHTML = result.items.map(companyCard).join("");
}

async function handleSearch(event) {
  event.preventDefault();

  const q = document.getElementById("search-query").value.trim();
  const industry = document.getElementById("search-industry").value;

  renderFeedback(searchFeedback, "Searching...");

  try {
    const result = await searchCompanies({ q, industry, limit: 12 });

    if (result.items.length === 0) {
      searchResults.innerHTML = "";
      renderFeedback(searchFeedback, "No companies matched that search. Try a broader term.", "error");
      return;
    }

    searchResults.innerHTML = result.items.map(companyCard).join("");
    renderFeedback(searchFeedback, `Found ${result.pagination.total} matching companies.`, "success");
  } catch (error) {
    renderFeedback(searchFeedback, error.message, "error");
  }
}

async function handleBetaSignup(event) {
  event.preventDefault();

  const email = document.getElementById("beta-email").value.trim();

  try {
    await betaSignup({ email });
    betaForm.reset();
    renderFeedback(betaFeedback, "You're on the beta list.", "success");
  } catch (error) {
    renderFeedback(betaFeedback, error.message, "error");
  }
}

logoutButton?.addEventListener("click", () => {
  clearSession();
  window.location.reload();
});

searchForm?.addEventListener("submit", handleSearch);
betaForm?.addEventListener("submit", handleBetaSignup);

async function init() {
  updateNavForSession();

  try {
    await Promise.all([loadTrending(), loadDefaultCompanies()]);
  } catch (error) {
    renderFeedback(searchFeedback, error.message, "error");
  }
}

init();
