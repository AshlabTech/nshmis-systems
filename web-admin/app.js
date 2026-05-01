const state = {
  apiBaseUrl: localStorage.getItem("niger_hmis_api_base_url") || "http://127.0.0.1:8000/api/v1",
  token: localStorage.getItem("niger_hmis_token") || "",
  user: loadJson("niger_hmis_user"),
  metadata: null,
  route: "",
  query: {},
  pageData: {},
  modal: null,
  toast: null,
  mobileNavOpen: false,
  trendMode: "daily",
};

const navConfig = [
  { key: "dashboard", label: "Dashboard", roles: ["data_clerk", "supervisor", "state_admin"] },
  { key: "patients", label: "Patients", roles: ["data_clerk", "supervisor", "state_admin"] },
  { key: "encounters", label: "Encounters", roles: ["data_clerk", "supervisor", "state_admin"] },
  { key: "referrals", label: "Referrals", roles: ["data_clerk", "supervisor", "state_admin"] },
  { key: "sync-logs", label: "Sync Logs", roles: ["data_clerk", "supervisor", "state_admin"] },
  { key: "users", label: "Users", roles: ["state_admin"], section: "Administration" },
  { key: "lgas", label: "LGAs", roles: ["state_admin"], section: "Administration" },
  { key: "wards", label: "Wards", roles: ["state_admin"], section: "Administration" },
  { key: "facilities", label: "Facilities", roles: ["state_admin"], section: "Administration" },
  { key: "disease-categories", label: "Disease Categories", roles: ["state_admin"], section: "Administration" },
  { key: "service-categories", label: "Service Categories", roles: ["state_admin"], section: "Administration" },
];

const app = document.getElementById("app");

window.addEventListener("hashchange", renderApp);
document.addEventListener("click", handleDocumentClick);
document.addEventListener("submit", handleDocumentSubmit);
document.addEventListener("change", handleDocumentChange);

bootstrap();

async function bootstrap() {
  if (state.token) {
    try {
      await hydrateSession();
    } catch (error) {
      clearSession();
      showToast(error.message || "Session expired. Please sign in again.", "error");
    }
  }
  renderApp();
}

async function hydrateSession() {
  const me = await apiRequest("/auth/me");
  state.user = me.user;
  saveJson("niger_hmis_user", state.user);
  state.metadata = await apiRequest("/metadata");
}

function renderApp() {
  state.route = getRoute();
  if (!state.user || !state.token) {
    renderLogin();
    return;
  }

  if (!isRouteAllowed(state.route)) {
    navigate("dashboard");
    return;
  }

  renderShell();
  loadCurrentPage().catch((error) => {
    renderPageContent(renderError(error.message || "Unable to load this page."));
  });
}

function renderLogin() {
  app.innerHTML = `
    <section class="auth-screen">
      <div class="auth-panel">
        <div class="brand">
          <div class="brand-mark">NH</div>
          <div class="brand-copy">
            <h1>Niger HMIS Outreach Admin</h1>
            <p>Secure web dashboard for outreach supervision, reporting, and records review.</p>
          </div>
        </div>
        <p class="hint">Default seeded admin: <strong>admin@nigerhmis.local</strong> / <strong>Admin@1234</strong></p>
        <form id="login-form" class="auth-stack">
          <div class="field">
            <label for="apiBaseUrl">API Base URL</label>
            <input id="apiBaseUrl" name="apiBaseUrl" type="url" value="${escapeHtml(state.apiBaseUrl)}" required>
          </div>
          <div class="field">
            <label for="email">Email</label>
            <input id="email" name="email" type="email" placeholder="admin@nigerhmis.local" required>
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" placeholder="Enter password" required>
          </div>
          <button class="btn" type="submit">Sign In</button>
        </form>
      </div>
      ${renderToast()}
    </section>
  `;
}

function renderShell() {
  const navItems = navConfig.filter((item) => item.roles.includes(state.user.role));
  let lastSection = "";
  const navMarkup = navItems.map((item) => {
    const label = item.section && item.section !== lastSection ? `<div class="section-label">${item.section}</div>` : "";
    lastSection = item.section || lastSection;
    return `${label}<button class="nav-link ${state.route === item.key ? "active" : ""}" data-nav="${item.key}">${item.label}</button>`;
  }).join("");

  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar ${state.mobileNavOpen ? "open" : ""}">
        <div class="brand">
          <div class="brand-mark">NH</div>
          <div class="brand-copy">
            <h1>Niger HMIS</h1>
            <p>Outreach System Admin</p>
          </div>
        </div>
        <div class="sidebar-user">
          <strong>${escapeHtml(state.user.name || "User")}</strong>
          <p>${formatRole(state.user.role)}</p>
          <p>${escapeHtml(state.user.email || "")}</p>
        </div>
        <nav>${navMarkup}</nav>
        <div style="margin-top:20px;">
          <button class="logout-btn" data-action="logout">Logout</button>
        </div>
      </aside>
      <main class="main">
        <div class="mobile-topbar">
          <button class="btn-outline" data-action="toggle-nav">Menu</button>
          <button class="btn-outline" data-action="logout">Logout</button>
        </div>
        <div id="page-root">${renderLoading()}</div>
      </main>
      ${renderModal()}
      ${renderToast()}
    </div>
  `;
}

async function loadCurrentPage() {
  switch (state.route) {
    case "dashboard":
      return loadDashboard();
    case "patients":
      return loadPatients();
    case "encounters":
      return loadEncounters();
    case "referrals":
      return loadReferrals();
    case "sync-logs":
      return loadSyncLogs();
    default:
      return loadAdminResource(state.route);
  }
}

async function loadDashboard() {
  const stats = await apiRequest("/dashboard/stats");
  renderPageContent(`
    ${renderPageHeader("Dashboard Overview", "Live operational view of outreach performance, referrals, and sync health.")}
    <section class="grid-cards">
      ${renderStatCard("Total Patients", stats.cards.total_patients)}
      ${renderStatCard("Total Encounters", stats.cards.total_encounters)}
      ${renderStatCard("Total Referrals", stats.cards.total_referrals)}
      ${renderStatCard("Pending Sync Records", stats.cards.pending_sync_records)}
      ${renderStatCard("Failed Sync Records", stats.cards.failed_sync_records)}
      ${renderStatCard("Referral Completion Rate", `${stats.cards.referral_completion_rate}%`)}
    </section>
    <section class="layout-two">
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>Encounter Trends</h3>
            <p class="muted">Daily, weekly, and monthly view of activity volume.</p>
          </div>
          <div class="segmented">
            <button class="${state.trendMode === "daily" ? "active" : ""}" data-action="trend" data-value="daily">Daily</button>
            <button class="${state.trendMode === "weekly" ? "active" : ""}" data-action="trend" data-value="weekly">Weekly</button>
            <button class="${state.trendMode === "monthly" ? "active" : ""}" data-action="trend" data-value="monthly">Monthly</button>
          </div>
        </div>
        ${renderTrendChart(stats.charts[`${state.trendMode}_trend`] || [])}
      </div>
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>Referral Status Breakdown</h3>
            <p class="muted">Current distribution of referral workflow outcomes.</p>
          </div>
        </div>
        ${renderBarChart(stats.charts.referral_status_breakdown || [], "label")}
      </div>
    </section>
    <section class="layout-three">
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>Encounters by LGA</h3>
            <p class="muted">Where outreach activity is concentrated.</p>
          </div>
        </div>
        ${renderBarChart(stats.charts.encounters_by_lga || [], "label")}
      </div>
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>Encounters by Ward</h3>
            <p class="muted">Ward-level operational spread.</p>
          </div>
        </div>
        ${renderBarChart(stats.charts.encounters_by_ward || [], "label")}
      </div>
      <div class="panel">
        <div class="panel-head">
          <div>
            <h3>Disease / Program Breakdown</h3>
            <p class="muted">Programs and encounter types currently being handled.</p>
          </div>
        </div>
        ${renderBarChart(stats.charts.disease_program_breakdown || [], "label")}
      </div>
    </section>
  `);
}

async function loadPatients() {
  const query = readQuery(["search", "lga_uuid", "ward_uuid", "sex", "nhis_status", "date_from", "date_to", "page", "per_page"]);
  const result = await apiRequest(`/patients?${toQueryString({ per_page: 20, ...query })}`);
  state.pageData.patients = result;

  renderPageContent(`
    ${renderPageHeader("Patients", roleScopeCopy())}
    <section class="panel">
      ${renderPatientFilters(query)}
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="btn-outline" data-export="patients">Export CSV</button>
        </div>
        <div class="table-meta">Showing ${result.data.length} of ${result.total} patient records</div>
      </div>
      ${renderTable(result.data, [
        "Patient",
        "Sex / NHIS",
        "Location",
        "Phone",
        "Sync",
        "Created",
        "Action",
      ], (patient) => `
        <tr>
          <td><strong>${escapeHtml(fullName(patient))}</strong><div class="mini-note">${escapeHtml(shortRef(patient.uuid))}</div></td>
          <td>${escapeHtml(patient.sex || "-")}<div class="mini-note">${escapeHtml(patient.nhis_status || "Unknown")}</div></td>
          <td>${escapeHtml(patient.lga?.name || "-")}<div class="mini-note">${escapeHtml(patient.ward?.name || "-")}</div></td>
          <td>${escapeHtml(patient.phone_number || "-")}</td>
          <td>${statusPill(patient.sync_status)}</td>
          <td>${formatDate(patient.created_at, true)}</td>
          <td><button class="link-btn" data-detail="patient" data-uuid="${patient.uuid}">View details</button></td>
        </tr>
      `)}
      ${renderPagination(result, "patients")}
    </section>
  `);
}

async function loadEncounters() {
  const query = readQuery(["search", "lga_uuid", "ward_uuid", "disease_program", "date_from", "date_to", "user_id", "page", "per_page"]);
  const result = await apiRequest(`/encounters?${toQueryString({ per_page: 20, ...query })}`);
  state.pageData.encounters = result;

  renderPageContent(`
    ${renderPageHeader("Encounters", roleScopeCopy())}
    <section class="panel">
      ${renderEncounterFilters(query)}
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="btn-outline" data-export="encounters">Export CSV</button>
        </div>
        <div class="table-meta">Showing ${result.data.length} of ${result.total} encounters</div>
      </div>
      ${renderTable(result.data, [
        "Encounter",
        "Patient",
        "Disease / Program",
        "Location",
        "Data Clerk",
        "Sync",
        "Action",
      ], (encounter) => `
        <tr>
          <td><strong>${escapeHtml(shortRef(encounter.uuid))}</strong><div class="mini-note">${formatDate(encounter.encounter_date)}</div></td>
          <td>${escapeHtml(fullName(encounter.patient))}<div class="mini-note">${escapeHtml(shortRef(encounter.patient?.uuid))}</div></td>
          <td>${escapeHtml(encounter.encounter_type || "-")}<div class="mini-note">${escapeHtml(encounter.service_point || "-")}</div></td>
          <td>${escapeHtml(encounter.lga?.name || "-")}<div class="mini-note">${escapeHtml(encounter.ward?.name || "-")}</div></td>
          <td>${escapeHtml(encounter.creator?.name || "-")}</td>
          <td>${statusPill(encounter.sync_status)}</td>
          <td><button class="link-btn" data-detail="encounter" data-uuid="${encounter.uuid}">View details</button></td>
        </tr>
      `)}
      ${renderPagination(result, "encounters")}
    </section>
  `);
}

async function loadReferrals() {
  const query = readQuery(["search", "status", "urgency", "facility", "lga_uuid", "ward_uuid", "date_from", "date_to", "page", "per_page"]);
  const result = await apiRequest(`/referrals?${toQueryString({ per_page: 20, ...query })}`);
  state.pageData.referrals = result;

  renderPageContent(`
    ${renderPageHeader("Referrals", "Track referral progression, triage urgency, destination facilities, and completion rates.")}
    <section class="panel">
      ${renderReferralFilters(query)}
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="btn-outline" data-export="referrals">Export CSV</button>
        </div>
        <div class="table-meta">Showing ${result.data.length} of ${result.total} referrals</div>
      </div>
      ${renderTable(result.data, [
        "Referral",
        "Patient",
        "Facility",
        "Urgency",
        "Status",
        "Location",
        "Action",
      ], (referral) => `
        <tr>
          <td><strong>${escapeHtml(shortRef(referral.uuid))}</strong><div class="mini-note">${formatDate(referral.created_at, true)}</div></td>
          <td>${escapeHtml(fullName(referral.patient))}<div class="mini-note">${escapeHtml(shortRef(referral.patient?.uuid))}</div></td>
          <td>${escapeHtml(referral.referred_to_facility || "-")}</td>
          <td>${escapeHtml(referral.urgency || "-")}</td>
          <td>${statusPill(referral.workflow_status)}</td>
          <td>${escapeHtml(referral.lga?.name || "-")}<div class="mini-note">${escapeHtml(referral.ward?.name || "-")}</div></td>
          <td class="row-actions">
            <button class="link-btn" data-detail="referral" data-uuid="${referral.uuid}">View</button>
            <button class="link-btn" data-status="${referral.uuid}" data-current-status="${referral.workflow_status || ""}">Update status</button>
          </td>
        </tr>
      `)}
      ${renderPagination(result, "referrals")}
    </section>
  `);
}

async function loadSyncLogs() {
  const query = readQuery(["user_id", "device_id", "status", "date_from", "date_to", "page", "per_page"]);
  const result = await apiRequest(`/sync-logs?${toQueryString({ per_page: 20, ...query })}`);
  state.pageData["sync-logs"] = result;

  renderPageContent(`
    ${renderPageHeader("Sync Logs", "Monitor mobile sync attempts, failures, and per-batch entity counts without changing the sync contract.")}
    <section class="panel">
      ${renderSyncLogFilters(query)}
      <div class="table-meta" style="margin-bottom: 12px;">Showing ${result.data.length} of ${result.total} sync log entries</div>
      ${renderTable(result.data, [
        "Record",
        "User / Device",
        "Status",
        "Counts",
        "Message",
        "Created",
      ], (log) => `
        <tr>
          <td><strong>${escapeHtml(shortRef(log.entity_uuid))}</strong><div class="mini-note">${escapeHtml(formatLabel(log.entity_type))} - Batch ${escapeHtml(shortRef(log.batch_uuid))}</div></td>
          <td>${escapeHtml(log.user?.name || "-")}<div class="mini-note">${escapeHtml(log.device_id || "No device id")}</div></td>
          <td>${statusPill(log.status)}</td>
          <td>
            <div class="mini-note">Patients: ${log.entity_counts?.patient || 0}</div>
            <div class="mini-note">Encounters: ${log.entity_counts?.encounter || 0}</div>
            <div class="mini-note">Referrals: ${log.entity_counts?.referral || 0}</div>
          </td>
          <td>${escapeHtml(log.error_message || log.message || "-")}</td>
          <td>${formatDate(log.created_at, true)}</td>
        </tr>
      `)}
      ${renderPagination(result, "sync-logs")}
    </section>
  `);
}

async function loadAdminResource(routeKey) {
  const resource = adminResources()[routeKey];
  if (!resource) {
    renderPageContent(renderError("Unknown route."));
    return;
  }

  const query = readQuery(["search", "status", "role", "lga_uuid", "ward_uuid", "page", "per_page", "lga_id"]);
  const result = await apiRequest(`${resource.endpoint}?${toQueryString({ per_page: 20, ...query })}`);
  state.pageData[routeKey] = result;

  renderPageContent(`
    ${renderPageHeader(resource.title, resource.description)}
    <section class="panel">
      ${renderAdminFilters(routeKey, query)}
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="btn" data-create="${routeKey}">Add ${resource.singular}</button>
        </div>
        <div class="table-meta">Showing ${result.data.length} of ${result.total} records</div>
      </div>
      ${renderTable(result.data, resource.columns, (item) => resource.row(item))}
      ${renderPagination(result, routeKey)}
    </section>
  `);
}

function renderPageContent(markup) {
  const root = document.getElementById("page-root");
  if (root) {
    root.innerHTML = markup;
  }
}

function renderPageHeader(title, description) {
  return `
    <div class="topbar">
      <div class="page-heading">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="topbar-actions">
        <span class="pill">${formatRole(state.user.role)}</span>
      </div>
    </div>
  `;
}

function renderPatientFilters(query) {
  return `
    <form class="filters" data-filter-form="patients">
      ${searchField("search", "Search patient, reference, phone", query.search)}
      ${selectField("lga_uuid", "LGA", lgaOptions(), query.lga_uuid)}
      ${selectField("ward_uuid", "Ward", wardOptions(query.lga_uuid), query.ward_uuid)}
      ${selectField("sex", "Sex", ["male", "female"], query.sex)}
      ${selectField("nhis_status", "NHIS Status", distinctOptions("nhis_status"), query.nhis_status)}
      ${dateField("date_from", "Date From", query.date_from)}
      ${dateField("date_to", "Date To", query.date_to)}
      <div class="field"><label>&nbsp;</label><button class="btn" type="submit">Apply Filters</button></div>
    </form>
  `;
}

function renderEncounterFilters(query) {
  const userOptions = (state.metadata?.users || []).map((user) => ({ value: String(user.id), label: user.name }));
  return `
    <form class="filters" data-filter-form="encounters">
      ${searchField("search", "Search encounter or patient", query.search)}
      ${selectField("lga_uuid", "LGA", lgaOptions(), query.lga_uuid)}
      ${selectField("ward_uuid", "Ward", wardOptions(query.lga_uuid), query.ward_uuid)}
      ${selectField("disease_program", "Disease / Program", categoryOptions("disease_categories"), query.disease_program)}
      ${selectField("user_id", "Data Clerk", userOptions, query.user_id)}
      ${dateField("date_from", "Date From", query.date_from)}
      ${dateField("date_to", "Date To", query.date_to)}
      <div class="field"><label>&nbsp;</label><button class="btn" type="submit">Apply Filters</button></div>
    </form>
  `;
}

function renderReferralFilters(query) {
  return `
    <form class="filters" data-filter-form="referrals">
      ${searchField("search", "Search referral, patient, reason", query.search)}
      ${selectField("status", "Status", state.metadata?.referral_statuses || [], query.status)}
      ${selectField("urgency", "Urgency", state.metadata?.urgency_levels || [], query.urgency)}
      ${searchField("facility", "Facility", query.facility)}
      ${selectField("lga_uuid", "LGA", lgaOptions(), query.lga_uuid)}
      ${selectField("ward_uuid", "Ward", wardOptions(query.lga_uuid), query.ward_uuid)}
      ${dateField("date_from", "Date From", query.date_from)}
      ${dateField("date_to", "Date To", query.date_to)}
      <div class="field"><label>&nbsp;</label><button class="btn" type="submit">Apply Filters</button></div>
    </form>
  `;
}

function renderSyncLogFilters(query) {
  const userOptions = (state.metadata?.users || []).map((user) => ({ value: String(user.id), label: user.name }));
  return `
    <form class="filters compact" data-filter-form="sync-logs">
      ${selectField("user_id", "User", userOptions, query.user_id)}
      ${searchField("device_id", "Device ID", query.device_id)}
      ${selectField("status", "Status", state.metadata?.sync_statuses || [], query.status)}
      ${dateField("date_from", "Date From", query.date_from)}
      ${dateField("date_to", "Date To", query.date_to)}
      <div class="field"><label>&nbsp;</label><button class="btn" type="submit">Apply Filters</button></div>
    </form>
  `;
}

function renderAdminFilters(routeKey, query) {
  if (routeKey === "users") {
    return `
      <form class="filters compact" data-filter-form="${routeKey}">
        ${searchField("search", "Search name, email, team", query.search)}
        ${selectField("role", "Role", state.metadata?.roles?.map((item) => ({ value: item.value, label: item.label })) || [], query.role)}
        <div class="field"><label>&nbsp;</label><button class="btn" type="submit">Apply Filters</button></div>
      </form>
    `;
  }

  if (routeKey === "wards") {
    return `
      <form class="filters compact" data-filter-form="${routeKey}">
        ${searchField("search", "Search ward", query.search)}
        ${selectField("lga_id", "LGA", (state.metadata?.lgas || []).map((item) => ({ value: String(item.id), label: item.name })), query.lga_id)}
        <div class="field"><label>&nbsp;</label><button class="btn" type="submit">Apply Filters</button></div>
      </form>
    `;
  }

  if (["facilities", "disease-categories", "service-categories"].includes(routeKey)) {
    return `
      <form class="filters compact" data-filter-form="${routeKey}">
        ${searchField("search", "Search records", query.search)}
        ${routeKey === "facilities" ? selectField("lga_uuid", "LGA", lgaOptions(), query.lga_uuid) : ""}
        ${routeKey === "facilities" ? selectField("status", "Status", ["active", "inactive"], query.status) : selectField("status", "Status", ["active", "inactive"], query.status)}
        <div class="field"><label>&nbsp;</label><button class="btn" type="submit">Apply Filters</button></div>
      </form>
    `;
  }

  return `
    <form class="filters compact" data-filter-form="${routeKey}">
      ${searchField("search", "Search records", query.search)}
      <div class="field"><label>&nbsp;</label><button class="btn" type="submit">Apply Filters</button></div>
    </form>
  `;
}

function renderStatCard(label, value) {
  return `<div class="stat-card"><p>${escapeHtml(label)}</p><strong>${escapeHtml(String(value ?? 0))}</strong></div>`;
}

function renderBarChart(items, labelKey) {
  if (!items.length) {
    return renderEmpty("No data available for this chart yet.");
  }

  const max = Math.max(...items.map((item) => Number(item.total || 0)), 1);
  return `
    <div class="chart-bars">
      ${items.map((item) => `
        <div class="bar-row">
          <div>${escapeHtml(item[labelKey] || "Unknown")}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.max(8, (Number(item.total || 0) / max) * 100)}%;"></div></div>
          <strong>${escapeHtml(String(item.total || 0))}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderTrendChart(items) {
  if (!items.length) {
    return renderEmpty("No trend data available yet.");
  }

  const max = Math.max(...items.map((item) => Number(item.total || 0)), 1);
  return `
    <div class="trend-chart">
      ${items.slice(-16).map((item) => `
        <div class="trend-column">
          <strong>${escapeHtml(String(item.total || 0))}</strong>
          <div class="trend-bar" style="height:${Math.max(10, (Number(item.total || 0) / max) * 180)}px;"></div>
          <span>${escapeHtml(String(item.period))}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderTable(data, headers, rowBuilder) {
  if (!data.length) {
    return renderEmpty("No records matched the current filters.");
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>
        </thead>
        <tbody>${data.map(rowBuilder).join("")}</tbody>
      </table>
    </div>
  `;
}

function renderPagination(result, routeKey) {
  return `
    <div class="pagination">
      <div class="table-meta">Page ${result.current_page} of ${result.last_page}</div>
      <div class="pagination-controls">
        <button class="btn-outline" data-page-route="${routeKey}" data-page="${Math.max(1, result.current_page - 1)}" ${result.current_page <= 1 ? "disabled" : ""}>Previous</button>
        <button class="btn-outline" data-page-route="${routeKey}" data-page="${Math.min(result.last_page, result.current_page + 1)}" ${result.current_page >= result.last_page ? "disabled" : ""}>Next</button>
      </div>
    </div>
  `;
}

function renderEmpty(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function renderLoading() {
  return `<div class="loading">Loading...</div>`;
}

function renderError(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

function renderModal() {
  if (!state.modal) {
    return "";
  }

  return `
    <div class="modal">
      <div class="modal-card">
        <div class="modal-head">
          <div>
            <h3>${escapeHtml(state.modal.title)}</h3>
            ${state.modal.subtitle ? `<p class="muted">${escapeHtml(state.modal.subtitle)}</p>` : ""}
          </div>
          <button class="modal-close" data-action="close-modal">x</button>
        </div>
        ${state.modal.content}
      </div>
    </div>
  `;
}

function renderToast() {
  if (!state.toast) {
    return "";
  }
  return `<div class="toast ${state.toast.type || "info"}">${escapeHtml(state.toast.message)}</div>`;
}

function handleDocumentClick(event) {
  const nav = event.target.closest("[data-nav]");
  if (nav) {
    state.mobileNavOpen = false;
    navigate(nav.dataset.nav);
    return;
  }

  const action = event.target.closest("[data-action]");
  if (action) {
    runAction(action.dataset.action, action.dataset.value);
    return;
  }

  const detail = event.target.closest("[data-detail]");
  if (detail) {
    openDetail(detail.dataset.detail, detail.dataset.uuid);
    return;
  }

  const statusButton = event.target.closest("[data-status]");
  if (statusButton) {
    openStatusModal(statusButton.dataset.status, statusButton.dataset.currentStatus || "");
    return;
  }

  const exportButton = event.target.closest("[data-export]");
  if (exportButton) {
    downloadExport(exportButton.dataset.export).catch(handleError);
    return;
  }

  const createButton = event.target.closest("[data-create]");
  if (createButton) {
    openAdminEditor(createButton.dataset.create);
    return;
  }

  const editButton = event.target.closest("[data-edit-admin]");
  if (editButton) {
    openAdminEditor(editButton.dataset.editAdmin, editButton.dataset.id);
    return;
  }

  const deleteButton = event.target.closest("[data-delete-admin]");
  if (deleteButton) {
    deleteAdminRecord(deleteButton.dataset.deleteAdmin, deleteButton.dataset.id).catch(handleError);
    return;
  }

  const pager = event.target.closest("[data-page-route]");
  if (pager) {
    setQueryForRoute(pager.dataset.pageRoute, { page: pager.dataset.page });
  }
}

function handleDocumentSubmit(event) {
  const form = event.target;
  if (form.id === "login-form") {
    event.preventDefault();
    login(new FormData(form)).catch(handleError);
    return;
  }

  if (form.dataset.filterForm) {
    event.preventDefault();
    applyFilters(form.dataset.filterForm, new FormData(form));
    return;
  }

  if (form.dataset.referralStatusForm) {
    event.preventDefault();
    updateReferralStatus(new FormData(form)).catch(handleError);
    return;
  }

  if (form.dataset.adminForm) {
    event.preventDefault();
    saveAdminRecord(form.dataset.adminForm, new FormData(form), form.dataset.recordId).catch(handleError);
  }
}

function handleDocumentChange(event) {
  if (event.target.name === "lga_uuid" && event.target.closest("[data-filter-form]")) {
    const routeKey = event.target.closest("[data-filter-form]").dataset.filterForm;
    const query = readQuery([]);
    query.lga_uuid = event.target.value;
    if (!event.target.value) {
      query.ward_uuid = "";
    }
    setQueryForRoute(routeKey, query, false);
  }
}

async function login(formData) {
  state.apiBaseUrl = formData.get("apiBaseUrl");
  localStorage.setItem("niger_hmis_api_base_url", state.apiBaseUrl);

  const response = await apiRequest("/auth/login", {
    method: "POST",
    body: {
      email: formData.get("email"),
      password: formData.get("password"),
    },
    auth: false,
  });

  state.token = response.token;
  state.user = response.user;
  localStorage.setItem("niger_hmis_token", state.token);
  saveJson("niger_hmis_user", state.user);
  state.metadata = await apiRequest("/metadata");
  showToast("Signed in successfully.", "success");
  navigate("dashboard");
}

async function logout() {
  try {
    await apiRequest("/auth/logout", { method: "POST" });
  } catch (error) {
    console.warn(error);
  }
  clearSession();
  renderApp();
}

function clearSession() {
  state.token = "";
  state.user = null;
  state.metadata = null;
  localStorage.removeItem("niger_hmis_token");
  localStorage.removeItem("niger_hmis_user");
}

function runAction(action, value) {
  if (action === "logout") {
    logout();
    return;
  }
  if (action === "close-modal") {
    state.modal = null;
    renderApp();
    return;
  }
  if (action === "toggle-nav") {
    state.mobileNavOpen = !state.mobileNavOpen;
    renderApp();
    return;
  }
  if (action === "trend") {
    state.trendMode = value;
    loadDashboard().catch(handleError);
  }
}

async function openDetail(type, uuid) {
  const endpoint = type === "patient" ? "/patients" : type === "encounter" ? "/encounters" : "/referrals";
  const record = await apiRequest(`${endpoint}/${uuid}`);

  if (type === "patient") {
    state.modal = {
      title: `${fullName(record)} (${shortRef(record.uuid)})`,
      subtitle: "Patient details and encounter history",
      content: `
        ${renderDetailGrid([
          ["Sex", record.sex],
          ["Date Of Birth", formatDate(record.date_of_birth)],
          ["Estimated Age", record.estimated_age_years],
          ["NHIS Status", record.nhis_status],
          ["Phone Number", record.phone_number],
          ["Address", record.address_line],
          ["LGA", record.lga?.name],
          ["Ward", record.ward?.name],
        ])}
        <div class="panel" style="margin-top:18px;">
          <h3>Encounter History</h3>
          ${renderTable(record.encounters || [], ["Encounter", "Type", "Date", "Data Clerk"], (item) => `
            <tr>
              <td>${escapeHtml(shortRef(item.uuid))}</td>
              <td>${escapeHtml(item.encounter_type || "-")}</td>
              <td>${formatDate(item.encounter_date)}</td>
              <td>${escapeHtml(item.creator?.name || "-")}</td>
            </tr>
          `)}
        </div>
      `,
    };
  }

  if (type === "encounter") {
    state.modal = {
      title: `Encounter ${shortRef(record.uuid)}`,
      subtitle: "Encounter services, notes, and referral links",
      content: `
        ${renderDetailGrid([
          ["Patient", `${fullName(record.patient)} (${shortRef(record.patient?.uuid)})`],
          ["Encounter Type", record.encounter_type],
          ["Service Point", record.service_point],
          ["Encounter Date", formatDate(record.encounter_date)],
          ["LGA", record.lga?.name],
          ["Ward", record.ward?.name],
          ["Data Clerk", record.creator?.name],
          ["Sync Status", record.sync_status],
        ])}
        <div class="panel" style="margin-top:18px;">
          <h3>Findings</h3>
          ${renderFindings(record.findings || {})}
          <h3>Notes</h3>
          <p>${escapeHtml(record.notes || "No notes recorded.")}</p>
          <h3>Referrals</h3>
          ${renderTable(record.referrals || [], ["Referral", "Facility", "Urgency", "Status"], (item) => `
            <tr>
              <td>${escapeHtml(shortRef(item.uuid))}</td>
              <td>${escapeHtml(item.referred_to_facility || "-")}</td>
              <td>${escapeHtml(item.urgency || "-")}</td>
              <td>${statusPill(item.workflow_status)}</td>
            </tr>
          `)}
        </div>
      `,
    };
  }

  if (type === "referral") {
    state.modal = {
      title: `Referral ${shortRef(record.uuid)}`,
      subtitle: "Referral detail and status controls",
      content: `
        ${renderDetailGrid([
          ["Patient", `${fullName(record.patient)} (${shortRef(record.patient?.uuid)})`],
          ["Encounter", shortRef(record.encounter?.uuid)],
          ["Facility", record.referred_to_facility],
          ["Urgency", record.urgency],
          ["Workflow Status", record.workflow_status],
          ["Operational Status", record.status],
          ["LGA", record.lga?.name],
          ["Ward", record.ward?.name],
        ])}
        <div class="panel" style="margin-top:18px;">
          <h3>Referral Reason</h3>
          <p>${escapeHtml(record.referral_reason || "No reason provided.")}</p>
          <form data-referral-status-form="true" data-referral-uuid="${record.uuid}" class="filters compact" style="margin-top:18px;">
            ${selectField("status", "Update Status", state.metadata?.referral_statuses || [], record.workflow_status)}
            <div class="field"><label>&nbsp;</label><button class="btn" type="submit">Save Status</button></div>
          </form>
        </div>
      `,
    };
  }

  renderApp();
}

function openStatusModal(uuid, currentStatus = "") {
  state.modal = {
    title: "Update Referral Status",
    subtitle: "Change workflow state for this referral.",
    content: `
      <form data-referral-status-form="true" data-referral-uuid="${uuid}" class="filters compact">
        ${selectField("status", "Status", state.metadata?.referral_statuses || [], currentStatus)}
        <div class="field"><label>&nbsp;</label><button class="btn" type="submit">Save Status</button></div>
      </form>
    `,
  };
  renderApp();
}

async function updateReferralStatus(formData) {
  const form = document.querySelector("[data-referral-status-form]");
  const uuid = form.dataset.referralUuid;
  await apiRequest(`/referrals/${uuid}/status`, {
    method: "PATCH",
    body: { status: formData.get("status") },
  });
  showToast("Referral status updated.", "success");
  state.modal = null;
  loadReferrals().catch(handleError);
}

function openAdminEditor(routeKey, recordId = "") {
  const resource = adminResources()[routeKey];
  const record = recordId ? (state.pageData[routeKey]?.data || []).find((item) => String(item.id) === String(recordId)) : null;
  state.modal = {
    title: `${record ? "Edit" : "Add"} ${resource.singular}`,
    subtitle: resource.description,
    content: `
      <form data-admin-form="${routeKey}" data-record-id="${record?.id || ""}" class="filters compact">
        ${resource.form(record)}
        <div class="field"><label>&nbsp;</label><button class="btn" type="submit">${record ? "Update" : "Create"}</button></div>
      </form>
    `,
  };
  renderApp();
}

async function saveAdminRecord(routeKey, formData, recordId) {
  const resource = adminResources()[routeKey];
  const payload = {};
  for (const [key, value] of formData.entries()) {
    if (value !== "") {
      payload[key] = value;
    }
  }

  const isUpdate = Boolean(recordId);
  await apiRequest(`${resource.endpoint}${isUpdate ? `/${recordId}` : ""}`, {
    method: isUpdate ? "PUT" : "POST",
    body: payload,
  });

  showToast(`${resource.singular} ${isUpdate ? "updated" : "created"} successfully.`, "success");
  state.modal = null;
  if (routeKey === "users" || routeKey === "lgas" || routeKey === "wards" || routeKey === "facilities" || routeKey === "disease-categories" || routeKey === "service-categories") {
    state.metadata = await apiRequest("/metadata");
  }
  loadAdminResource(routeKey).catch(handleError);
}

async function deleteAdminRecord(routeKey, id) {
  const resource = adminResources()[routeKey];
  if (!window.confirm(`Delete this ${resource.singular.toLowerCase()}?`)) {
    return;
  }

  await apiRequest(`${resource.endpoint}/${id}`, { method: "DELETE" });
  showToast(`${resource.singular} deleted.`, "success");
  if (routeKey !== "users") {
    state.metadata = await apiRequest("/metadata");
  }
  loadAdminResource(routeKey).catch(handleError);
}

async function downloadExport(type) {
  const routeQuery = readQuery([]);
  const response = await fetch(`${state.apiBaseUrl}/exports/${type}?${toQueryString(routeQuery)}`, {
    headers: {
      Authorization: `Bearer ${state.token}`,
      Accept: "text/csv",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Export failed.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${type}-export.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function applyFilters(routeKey, formData) {
  const nextQuery = {};
  for (const [key, value] of formData.entries()) {
    if (value) {
      nextQuery[key] = value;
    }
  }
  nextQuery.page = 1;
  setQueryForRoute(routeKey, nextQuery);
}

function setQueryForRoute(routeKey, updates, navigateAfter = true) {
  const route = routeKey || state.route;
  const query = { ...readQuery([]), ...updates };
  Object.keys(query).forEach((key) => {
    if (query[key] === "" || query[key] == null) {
      delete query[key];
    }
  });
  const hash = `#/${route}${Object.keys(query).length ? `?${toQueryString(query)}` : ""}`;
  if (navigateAfter) {
    window.location.hash = hash;
  } else {
    history.replaceState(null, "", hash);
    renderApp();
  }
}

function navigate(route) {
  window.location.hash = `#/${route}`;
}

function getRoute() {
  const hash = window.location.hash.replace(/^#\//, "");
  const [route] = hash.split("?");
  return route || "dashboard";
}

function readQuery(keys) {
  const hash = window.location.hash.replace(/^#\//, "");
  const [, queryString = ""] = hash.split("?");
  const params = new URLSearchParams(queryString);
  const output = {};
  const selectedKeys = keys.length ? keys : [...params.keys()];
  selectedKeys.forEach((key) => {
    if (params.has(key)) {
      output[key] = params.get(key);
    }
  });
  return output;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${state.apiBaseUrl}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.auth === false ? {} : { Authorization: `Bearer ${state.token}` }),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 401) {
    clearSession();
    renderApp();
    throw new Error("Authentication required.");
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "string"
      ? payload
      : payload.message || payload.error || extractValidationErrors(payload.errors) || "Request failed.";
    throw new Error(message);
  }

  return payload;
}

function isRouteAllowed(route) {
  return navConfig.some((item) => item.key === route && item.roles.includes(state.user.role));
}

function roleScopeCopy() {
  if (state.user.role === "data_clerk") {
    return "Scoped to records submitted by the currently signed-in data clerk.";
  }
  if (state.user.role === "supervisor") {
    return "Scoped to the supervisor's assigned LGA, ward, and team footprint.";
  }
  return "State-wide access across all outreach records and administration tools.";
}

function statusPill(value) {
  return `<span class="pill status-${escapeHtml(String(value || "").toLowerCase())}">${escapeHtml(formatLabel(value || "-"))}</span>`;
}

function renderDetailGrid(items) {
  return `
    <div class="detail-grid">
      ${items.map(([label, value]) => `
        <div>
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(String(value || "-"))}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

const findingLabels = {
  presenting_complaint: "Presenting Complaint",
  symptoms: "Symptoms",
  disease_program_category: "Disease / Program",
  preliminary_diagnosis: "Preliminary Diagnosis",
  services_provided: "Services Provided",
  drugs_commodities_issued: "Drugs / Commodities Issued",
  health_education: "Health Education",
  service_notes: "Service Notes",
  outcome_status: "Outcome",
  referral_required: "Referral Required",
};

function renderFindings(findings = {}) {
  const hasValue = (value) => value !== undefined && value !== null && value !== "";
  const orderedKeys = Object.keys(findingLabels).filter((key) => hasValue(findings[key]));
  const extraKeys = Object.keys(findings).filter((key) => !findingLabels[key] && hasValue(findings[key]));
  const rows = [...orderedKeys, ...extraKeys].map((key) => [findingLabels[key] || formatLabel(key), formatFindingValue(findings[key])]);

  if (!rows.length) {
    return renderEmpty("No findings recorded for this encounter.");
  }

  return renderDetailGrid(rows);
}

function formatFindingValue(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (Array.isArray(value)) return value.filter(Boolean).map(formatFindingValue).join(", ") || "-";
  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, item]) => `${formatLabel(key)}: ${formatFindingValue(item)}`).join("; ");
  }
  return value || "-";
}

function adminResources() {
  return {
    users: {
      title: "Users Management",
      singular: "User",
      description: "Create and manage role assignments for data clerks, supervisors, and state admins.",
      endpoint: "/admin/users",
      columns: ["Name", "Email", "Role", "Scope", "Team", "Action"],
      row: (item) => `
        <tr>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td>${escapeHtml(item.email)}</td>
          <td>${statusPill(item.role)}</td>
          <td>${escapeHtml(labelForLga(item.assigned_lga_uuid) || "Statewide")}<div class="mini-note">${escapeHtml(labelForWard(item.assigned_ward_uuid) || "All wards")}</div></td>
          <td>${escapeHtml(item.team_name || "-")}</td>
          <td class="row-actions">
            <button class="link-btn" data-edit-admin="users" data-id="${item.id}">Edit</button>
            <button class="link-btn" data-delete-admin="users" data-id="${item.id}">Delete</button>
          </td>
        </tr>
      `,
      form: (item) => `
        ${textField("name", "Full Name", item?.name)}
        ${textField("email", "Email", item?.email, "email")}
        ${textField("password", item ? "New Password (optional)" : "Password", "", "password")}
        ${selectField("role", "Role", state.metadata?.roles?.map((role) => ({ value: role.value, label: role.label })) || [], item?.role)}
        ${selectField("assigned_lga_uuid", "Assigned LGA", lgaOptions(), item?.assigned_lga_uuid)}
        ${selectField("assigned_ward_uuid", "Assigned Ward", wardOptions(item?.assigned_lga_uuid), item?.assigned_ward_uuid)}
        ${textField("team_name", "Team Name", item?.team_name)}
      `,
    },
    lgas: {
      title: "LGAs Management",
      singular: "LGA",
      description: "Manage local government areas available for outreach scoping and filters.",
      endpoint: "/admin/lgas",
      columns: ["Name", "Reference", "Action"],
      row: (item) => `
        <tr>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td>${escapeHtml(shortRef(item.uuid))}</td>
          <td class="row-actions">
            <button class="link-btn" data-edit-admin="lgas" data-id="${item.id}">Edit</button>
            <button class="link-btn" data-delete-admin="lgas" data-id="${item.id}">Delete</button>
          </td>
        </tr>
      `,
      form: (item) => `${textField("name", "LGA Name", item?.name)}`,
    },
    wards: {
      title: "Wards Management",
      singular: "Ward",
      description: "Manage ward definitions within each LGA.",
      endpoint: "/admin/wards",
      columns: ["Name", "LGA", "Reference", "Action"],
      row: (item) => `
        <tr>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td>${escapeHtml(item.lga?.name || "-")}</td>
          <td>${escapeHtml(shortRef(item.uuid))}</td>
          <td class="row-actions">
            <button class="link-btn" data-edit-admin="wards" data-id="${item.id}">Edit</button>
            <button class="link-btn" data-delete-admin="wards" data-id="${item.id}">Delete</button>
          </td>
        </tr>
      `,
      form: (item) => `
        ${selectField("lga_id", "LGA", (state.metadata?.lgas || []).map((lga) => ({ value: String(lga.id), label: lga.name })), item?.lga_id ? String(item.lga_id) : "")}
        ${textField("name", "Ward Name", item?.name)}
      `,
    },
    facilities: {
      title: "Facilities Management",
      singular: "Facility",
      description: "Manage referral destinations and public health facility references.",
      endpoint: "/admin/facilities",
      columns: ["Name", "Type", "Location", "Status", "Action"],
      row: (item) => `
        <tr>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td>${escapeHtml(item.type || "-")}</td>
          <td>${escapeHtml(labelForLga(item.lga_uuid) || "-")}<div class="mini-note">${escapeHtml(labelForWard(item.ward_uuid) || "-")}</div></td>
          <td>${statusPill(item.status)}</td>
          <td class="row-actions">
            <button class="link-btn" data-edit-admin="facilities" data-id="${item.id}">Edit</button>
            <button class="link-btn" data-delete-admin="facilities" data-id="${item.id}">Delete</button>
          </td>
        </tr>
      `,
      form: (item) => `
        ${textField("name", "Facility Name", item?.name)}
        ${textField("type", "Facility Type", item?.type)}
        ${selectField("lga_uuid", "LGA", lgaOptions(), item?.lga_uuid)}
        ${selectField("ward_uuid", "Ward", wardOptions(item?.lga_uuid), item?.ward_uuid)}
        ${selectField("status", "Status", ["active", "inactive"], item?.status)}
      `,
    },
    "disease-categories": {
      title: "Disease / Program Categories",
      singular: "Disease Category",
      description: "Manage disease and program categories used in reporting filters.",
      endpoint: "/admin/disease-categories",
      columns: ["Name", "Status", "Reference", "Action"],
      row: (item) => `
        <tr>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td>${statusPill(item.status)}</td>
          <td>${escapeHtml(shortRef(item.uuid))}</td>
          <td class="row-actions">
            <button class="link-btn" data-edit-admin="disease-categories" data-id="${item.id}">Edit</button>
            <button class="link-btn" data-delete-admin="disease-categories" data-id="${item.id}">Delete</button>
          </td>
        </tr>
      `,
      form: (item) => `
        ${textField("name", "Category Name", item?.name)}
        ${selectField("status", "Status", ["active", "inactive"], item?.status)}
      `,
    },
    "service-categories": {
      title: "Service Categories",
      singular: "Service Category",
      description: "Manage service categories shown in supervisory tools and metadata.",
      endpoint: "/admin/service-categories",
      columns: ["Name", "Status", "Reference", "Action"],
      row: (item) => `
        <tr>
          <td><strong>${escapeHtml(item.name)}</strong></td>
          <td>${statusPill(item.status)}</td>
          <td>${escapeHtml(shortRef(item.uuid))}</td>
          <td class="row-actions">
            <button class="link-btn" data-edit-admin="service-categories" data-id="${item.id}">Edit</button>
            <button class="link-btn" data-delete-admin="service-categories" data-id="${item.id}">Delete</button>
          </td>
        </tr>
      `,
      form: (item) => `
        ${textField("name", "Category Name", item?.name)}
        ${selectField("status", "Status", ["active", "inactive"], item?.status)}
      `,
    },
  };
}

function textField(name, label, value = "", type = "text") {
  return `
    <div class="field">
      <label for="${name}">${escapeHtml(label)}</label>
      <input id="${name}" name="${name}" type="${type}" value="${escapeHtml(value || "")}">
    </div>
  `;
}

function searchField(name, label, value = "") {
  return textField(name, label, value, "text");
}

function dateField(name, label, value = "") {
  return textField(name, label, value, "date");
}

function selectField(name, label, options, selectedValue = "") {
  const normalizedOptions = options.map((option) => {
    if (typeof option === "string") {
      return { value: option, label: formatLabel(option) };
    }
    return option;
  });
  return `
    <div class="field">
      <label for="${name}">${escapeHtml(label)}</label>
      <select id="${name}" name="${name}">
        <option value="">All</option>
        ${normalizedOptions.map((option) => `
          <option value="${escapeHtml(option.value)}" ${String(option.value) === String(selectedValue || "") ? "selected" : ""}>${escapeHtml(option.label)}</option>
        `).join("")}
      </select>
    </div>
  `;
}

function lgaOptions() {
  return (state.metadata?.lgas || []).map((item) => ({ value: item.uuid, label: item.name }));
}

function wardOptions(lgaUuid = "") {
  return (state.metadata?.wards || [])
    .filter((item) => !lgaUuid || item.lga?.uuid === lgaUuid || state.metadata?.lgas?.find((lga) => lga.uuid === lgaUuid)?.id === item.lga_id)
    .map((item) => ({ value: item.uuid, label: item.name }));
}

function categoryOptions(key) {
  return (state.metadata?.[key] || [])
    .filter((item) => item.status !== "inactive")
    .map((item) => ({ value: item.name, label: item.name }));
}

function distinctOptions(field) {
  const values = new Set();
  (state.pageData.patients?.data || []).forEach((item) => {
    if (item[field]) {
      values.add(item[field]);
    }
  });
  return [...values];
}

function fullName(record) {
  return [record?.first_name, record?.middle_name, record?.last_name].filter(Boolean).join(" ") || "Unnamed";
}

function labelForLga(uuid) {
  return (state.metadata?.lgas || []).find((item) => item.uuid === uuid)?.name;
}

function labelForWard(uuid) {
  return (state.metadata?.wards || []).find((item) => item.uuid === uuid)?.name;
}

function formatRole(role) {
  return formatLabel(role);
}

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function shortRef(value) {
  if (!value) {
    return "-";
  }
  return `Ref ${String(value).replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function formatDate(value, includeTime = false) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return includeTime ? date.toLocaleString() : date.toLocaleDateString();
}

function toQueryString(object) {
  const params = new URLSearchParams();
  Object.entries(object || {}).forEach(([key, value]) => {
    if (value !== "" && value != null) {
      params.set(key, value);
    }
  });
  return params.toString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (error) {
    return null;
  }
}

function extractValidationErrors(errors) {
  if (!errors || typeof errors !== "object") {
    return "";
  }
  const values = Object.values(errors).flat();
  return values[0] || "";
}

function showToast(message, type = "info") {
  state.toast = { message, type };
  renderApp();
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    state.toast = null;
    renderApp();
  }, 3200);
}

function handleError(error) {
  showToast(error.message || "Something went wrong.", "error");
}
