// static/js/dashboard.js

const API_URL = "/api/readings/latest";

let latestBins = [];
let selectedBinId = null;
let currentFilter = "all";
let activeView = "overview";
let activeAlerts = [];

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function getFilteredBins(bins) {
  if (currentFilter === "all") {
    return bins;
  }

  if (currentFilter === "full") {
    return bins.filter((bin) => {
      const status = normalizeText(bin.status || getFillStatus(bin.fill_percentage));
      const fill = Number(bin.fill_percentage || 0);

      return (
        status === "full" ||
        status === "almost full" ||
        fill >= 80
      );
    });
  }

  if (currentFilter === "fire") {
    return bins.filter((bin) => {
      const fireRisk = normalizeText(bin.fire_risk || getFireRisk(bin.temperature_c, bin.flame_detected));
      const flameDetected = bin.flame_detected === true;

      return (
        flameDetected ||
        fireRisk === "critical" ||
        fireRisk === "warning"
      );
    });
  }

  return bins;
}

document.addEventListener("DOMContentLoaded", () => {
  loadDashboardData();

  // Refresh every 5 seconds for MVP demo
  setInterval(loadDashboardData, 5000);

  document.querySelectorAll(".filter-btn").forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;

      document.querySelectorAll(".filter-btn").forEach((btn) => {
        btn.classList.remove("on");
      });

      button.classList.add("on");

      if (latestBins.length > 0) {
        if (activeView === "overview") {
          renderDashboard(latestBins);
        }
      }
    });
  });

  // Setup sidebar routing
  document.querySelectorAll(".sidebar-item[data-view]").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const view = item.dataset.view;
      if (!view) return;

      activeView = view;
      
      document.querySelectorAll(".sidebar-item").forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      document.getElementById("overview-view").style.display = view === "overview" ? "block" : "none";
      document.getElementById("alerts-view").style.display = view === "alerts" ? "block" : "none";

      if (view === "alerts") {
        renderAlertsPage();
      } else if (view === "overview") {
        renderDashboard(latestBins);
      }
    });
  });

  const refreshButton = document.querySelector("#refreshBtn");
  if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
      try {
        refreshButton.disabled = true;
        refreshButton.innerHTML = '<i class="ti ti-refresh" aria-hidden="true"></i> <span>Refreshing...</span>';

        await loadDashboardData();
        updateLastSyncedText();
      } catch (error) {
        console.error("Failed to refresh dashboard:", error);
        alert("Could not refresh dashboard data. Please check that the Django API is running.");
      } finally {
        refreshButton.disabled = false;
        refreshButton.innerHTML = '<i class="ti ti-refresh" aria-hidden="true"></i> <span>Refresh</span>';
      }
    });
  }
});

function updateLastSyncedText() {
  const lastSyncedEl = document.getElementById("last-synced-text");
  if (lastSyncedEl) {
    const now = new Date();
    lastSyncedEl.textContent = "Last synced: " + now.toLocaleTimeString();
  }
}

async function loadDashboardData() {
  try {
    showLoadingState();

    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== "success" || !Array.isArray(data.readings)) {
      throw new Error("Invalid API response format");
    }

    latestBins = data.readings;
    activeAlerts = generateAlerts(latestBins);
    
    if (activeView === "overview") {
      renderDashboard(latestBins);
    } else if (activeView === "alerts") {
      renderAlertsPage();
    }
    
    updateLastSyncedText();
    
    const activeBinsEl = document.getElementById("active-bins-count");
    if (activeBinsEl) {
      activeBinsEl.textContent = latestBins.length;
    }
  } catch (error) {
    console.error("Dashboard data loading error:", error);
    showErrorState();
  }
}

function renderDashboard(bins) {
  renderSummaryCards(bins);
  
  const filteredBins = getFilteredBins(bins);
  renderBinTable(filteredBins);
  
  renderAlerts(bins);
  renderFillVisual(bins);
  renderTemperatureVisual(bins);

  if (filteredBins.length > 0) {
    const selectedBin = filteredBins.find(bin => bin.bin_id === selectedBinId) || filteredBins[0];
    selectedBinId = selectedBin.bin_id;
    renderSelectedBinDetail(selectedBin);
  } else {
    renderEmptyStateForFilter();
  }
}

// ----------------------------------------------------
// Rendering Functions
// ----------------------------------------------------

function renderSummaryCards(bins) {
  const totalBins = bins.length;

  const fullBins = bins.filter(bin =>
    Number(bin.fill_percentage) >= 90 || bin.status === "Full"
  ).length;

  const fireAlerts = bins.filter(bin =>
    bin.flame_detected === true || bin.fire_risk === "Warning" || bin.fire_risk === "Critical" || Number(bin.temperature_c) >= 55
  ).length;

  const averageFill = totalBins > 0
    ? Math.round(
        bins.reduce((sum, bin) => sum + Number(bin.fill_percentage || 0), 0) / totalBins
      )
    : 0;

  setText("total-bins", totalBins);
  setText("full-bins", fullBins);
  setText("fire-alerts", fireAlerts);
  setText("average-fill", `${averageFill}%`);
}

function renderBinTable(bins) {
  const tableBody = document.getElementById("bins-table-body");
  if (!tableBody) return;

  if (bins.length === 0) {
    let msg = "No bin data available.";
    if (currentFilter === "full") msg = "No full or almost full bins found.";
    else if (currentFilter === "fire") msg = "No fire-risk bins found.";

    tableBody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 20px;">${msg}</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = bins.map(bin => {
    const status = bin.status || getFillStatus(bin.fill_percentage);
    const fireRisk = bin.fire_risk || getFireRisk(bin.temperature_c, bin.flame_detected);

    let fillClass = "low";
    if (bin.fill_percentage >= 91) fillClass = "full";
    else if (bin.fill_percentage >= 71) fillClass = "almost";
    else if (bin.fill_percentage >= 31) fillClass = "med";

    let binIdStyle = (status === "Full") ? 'color:#A32D2D;' : '';
    let tempStyle = (fireRisk === "Warning" || fireRisk === "Critical") ? 'color:#A32D2D;' : '';
    let riskIcon = (fireRisk === "Warning" || fireRisk === "Critical") ? '<i class="ti ti-flame" aria-hidden="true" style="font-size:10px;"></i> ' : '';
    
    let humidityVal = bin.humidity != null ? `${Number(bin.humidity).toFixed(0)}%` : 'N/A';
    let flameStatus = getFlameLabel(bin.flame_detected);
    let flameStyle = bin.flame_detected ? 'color:#A32D2D; font-weight:600;' : 'color:var(--color-text-secondary);';

    return `
      <tr class="bin-row-clickable ${bin.bin_id === selectedBinId ? 'selected' : ''}" data-bin-id="${escapeHtml(bin.bin_id)}">
        <td><span class="bin-id" style="${binIdStyle}">${escapeHtml(bin.bin_id)}</span></td>
        <td><span class="location-txt">${escapeHtml(bin.location)}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:8px;">
            <div class="fill-bar-wrap"><div class="fill-bar ${fillClass}" style="width:${Number(bin.fill_percentage).toFixed(0)}%"></div></div>
            <span style="font-size:12px;font-weight:500;${status==='Full'?'color:#A32D2D;':''}">${Number(bin.fill_percentage).toFixed(0)}%</span>
          </div>
        </td>
        <td><span class="temp-txt" style="${tempStyle}">${Number(bin.temperature_c).toFixed(1)}°C</span></td>
        <td><span class="temp-txt">${humidityVal}</span></td>
        <td><span style="${flameStyle}">${flameStatus}</span></td>
        <td><span class="badge ${getStatusClass(status)}">${escapeHtml(status)}</span></td>
        <td><span class="badge ${getFireRiskClass(fireRisk)}">${riskIcon}${escapeHtml(fireRisk)}</span></td>
        <td><span class="time-txt">${formatTime(bin.created_at)}</span></td>
      </tr>
    `;
  }).join("");

  tableBody.querySelectorAll(".bin-row-clickable").forEach(row => {
    row.addEventListener("click", () => {
      selectedBinId = row.dataset.binId;
      tableBody.querySelectorAll("tr").forEach(r => r.classList.remove("selected"));
      row.classList.add("selected");
      
      const selectedBin = latestBins.find(bin => bin.bin_id === selectedBinId);
      if (selectedBin) {
        renderSelectedBinDetail(selectedBin);
      }
    });
  });
}

function renderSelectedBinDetail(bin) {
  const detailContainer = document.getElementById("selected-bin-detail");
  if (!detailContainer) return;

  const status = bin.status || getFillStatus(bin.fill_percentage);
  const fireRisk = bin.fire_risk || getFireRisk(bin.temperature_c, bin.flame_detected);
  const recommendation = getRecommendation(bin);

  let recoIcon = '<i class="ti ti-check" aria-hidden="true" style="font-size:13px; color: #1D9E75;"></i> ';
  let recoBoxClass = "";
  if (fireRisk === "Critical" || bin.flame_detected) {
    recoIcon = '<i class="ti ti-alert-triangle" aria-hidden="true" style="font-size:13px; color: #A32D2D;"></i> ';
    recoBoxClass = "reco-risk";
  } else if (fireRisk === "Warning" || bin.fill_percentage >= 91) {
    recoIcon = '<i class="ti ti-alert-triangle" aria-hidden="true" style="font-size:13px;"></i> ';
  } else if (bin.fill_percentage >= 80) {
    recoIcon = '<i class="ti ti-info-circle" aria-hidden="true" style="font-size:13px;"></i> ';
  }

  let riskIcon = (fireRisk === "Critical" || fireRisk === "Warning") ? '<i class="ti ti-flame" aria-hidden="true" style="font-size:10px;"></i> ' : '';
  
  let humidityVal = bin.humidity != null ? `${Number(bin.humidity).toFixed(0)}%` : 'N/A';
  let flameStatus = getFlameLabel(bin.flame_detected);

  detailContainer.innerHTML = `
    <div class="detail-header">
      <div class="detail-bin-id">${escapeHtml(bin.bin_id)}</div>
      <div class="detail-loc"><i class="ti ti-map-pin" aria-hidden="true" style="font-size:11px;"></i> ${escapeHtml(bin.location)}</div>
    </div>
    <div class="detail-section">
      <div class="detail-label">Fill level</div>
      <div class="progress-wrap"><div class="progress-bar" style="width:${Number(bin.fill_percentage).toFixed(0)}%; ${bin.fill_percentage >= 91 ? 'background:#E24B4A;' : ''}"></div></div>
      <div class="progress-pct" style="${bin.fill_percentage >= 91 ? 'color:#A32D2D;' : ''}margin-top:4px;">${Number(bin.fill_percentage).toFixed(0)}% — ${escapeHtml(status)}</div>
    </div>
    <div>
      <div class="detail-row">
        <span class="detail-row-label">Temperature</span>
        <span class="detail-row-val" style="${(fireRisk === 'Critical' || fireRisk === 'Warning') ? 'color:#A32D2D;' : ''}">${Number(bin.temperature_c).toFixed(1)}°C</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Humidity</span>
        <span class="detail-row-val">${humidityVal}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Flame</span>
        <span class="detail-row-val" style="${bin.flame_detected ? 'color:#A32D2D; font-weight:600;' : ''}">${flameStatus}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Fire risk</span>
        <span class="badge ${getFireRiskClass(fireRisk)}">${riskIcon}${escapeHtml(fireRisk)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Device status</span>
        <span class="detail-row-val" style="color:#1D9E75;">Online</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">Last update</span>
        <span class="detail-row-val">${formatTime(bin.created_at)}</span>
      </div>
    </div>
    <div class="reco-box ${recoBoxClass}">${recoIcon}${escapeHtml(recommendation)}</div>
  `;
}

function generateAlerts(bins) {
  const alerts = [];

  bins.forEach((bin) => {
    const binId = bin.bin_id || "Unknown bin";
    const status = normalizeText(bin.status);
    const fireRisk = normalizeText(bin.fire_risk);
    const fill = Number(bin.fill_percentage || 0);
    const temp = Number(bin.temperature_c || 0);
    const time = bin.updated_at || bin.created_at || "";

    if (bin.flame_detected === true || fireRisk === "critical") {
      alerts.push({
        binId,
        message: `${binId} flame detected. Immediate inspection required.`,
        time,
        severity: "critical"
      });
    }

    if (status === "full" || fill >= 95) {
      alerts.push({
        binId,
        message: `${binId} is ${fill}% full. Collection required.`,
        time,
        severity: "critical"
      });
    }

    if (fireRisk === "warning" || temp >= 55) {
      alerts.push({
        binId,
        message: `${binId} temperature reached ${temp.toFixed(1)}°C. Possible fire risk.`,
        time,
        severity: "warning"
      });
    }

    if ((status === "almost full" || fill >= 80) && fill < 95) {
      alerts.push({
        binId,
        message: `${binId} is above 80%. Prepare collection.`,
        time,
        severity: "info"
      });
    }
  });

  return alerts;
}

function renderAlerts(bins) {
  const alertsContainer = document.getElementById("alerts-panel");
  const alertsCount = document.getElementById("alerts-count");
  if (!alertsContainer) return;

  const alerts = generateAlerts(bins);

  if (alertsCount) {
    alertsCount.textContent = `${alerts.length} active`;
    alertsCount.style.display = alerts.length > 0 ? "inline-flex" : "none";
  }

  // Update sidebar badge
  const sidebarBadge = document.getElementById("sidebar-alerts-badge");
  if (sidebarBadge) {
    sidebarBadge.textContent = alerts.length;
    sidebarBadge.style.display = alerts.length > 0 ? "inline-block" : "none";
  }

  if (alerts.length === 0) {
    alertsContainer.innerHTML = `<div style="padding: 16px; font-size: 13px; color: var(--color-text-secondary);">No active alerts. All monitored bins are within normal range.</div>`;
    return;
  }

  // Map severity to overview dot classes
  const getDotClass = (sev) => {
    if (sev === "critical") return "critical";
    if (sev === "warning") return "warn";
    return "info";
  };

  alertsContainer.innerHTML = alerts.map(alert => `
    <div class="alert-item">
      <div class="alert-dot ${getDotClass(alert.severity)}"></div>
      <div>
        <div class="alert-text">${escapeHtml(alert.message)}</div>
        <div class="alert-time">${formatTime(alert.time)}</div>
      </div>
    </div>
  `).join("");
}

function renderAlertsPage() {
  const container = document.getElementById("alerts-view");
  if (!container) return;

  // Update sidebar badge globally whenever this is called too
  const sidebarBadge = document.getElementById("sidebar-alerts-badge");
  if (sidebarBadge) {
    sidebarBadge.textContent = activeAlerts.length;
    sidebarBadge.style.display = activeAlerts.length > 0 ? "inline-block" : "none";
  }

  if (!activeAlerts.length) {
    container.innerHTML = `
      <section class="alerts-page">
        <div class="page-header">
          <div>
            <div class="page-title">Active alerts</div>
            <div class="page-sub">Bins that require attention</div>
          </div>
          <span class="alert-count-badge">0 active</span>
        </div>

        <div class="panel" style="padding: 32px; text-align: center;">
          <h3 style="margin-bottom: 8px; color: var(--color-text-primary);">No active alerts right now.</h3>
          <p style="color: var(--color-text-secondary);">All monitored bins are operating normally.</p>
        </div>
      </section>
    `;
    return;
  }

  container.innerHTML = `
    <section class="alerts-page">
      <div class="page-header">
        <div>
          <div class="page-title">Active alerts</div>
          <div class="page-sub">Bins that require attention</div>
        </div>
        <span class="alert-count-badge">${activeAlerts.length} active</span>
      </div>

      <div class="alerts-list">
        ${activeAlerts.map(alert => `
          <article class="alert-item-lg alert-${alert.severity}">
            <span class="alert-dot-lg"></span>
            <div class="alert-body-lg">
              <p>${escapeHtml(alert.message)}</p>
              <small>${formatTime(alert.time)}</small>
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderFillVisual(bins) {
  const container = document.getElementById("fill-chart");
  if (!container) return;

  container.innerHTML = bins.map(bin => {
    return `
      <div style="margin-bottom: 8px; font-size: 12px; display: flex; align-items: center; gap: 10px;">
        <span style="width: 55px; font-weight: 500;">${escapeHtml(bin.bin_id)}</span>
        <div class="mini-bar">
          <div class="mini-bar-fill" style="width: ${Number(bin.fill_percentage).toFixed(0)}%; ${bin.fill_percentage >= 90 ? 'background:#E24B4A;' : ''}"></div>
        </div>
        <span style="width: 35px; text-align: right;">${Number(bin.fill_percentage).toFixed(0)}%</span>
      </div>
    `;
  }).join("");
}

function renderTemperatureVisual(bins) {
  const container = document.getElementById("temperature-chart");
  if (!container) return;

  container.innerHTML = bins.map(bin => {
    const fireRisk = bin.fire_risk || getFireRisk(bin.temperature_c, bin.flame_detected);
    let tempColor = "var(--color-text-primary)";
    let badge = "";
    
    if (fireRisk === "Critical" || fireRisk === "Warning") {
      tempColor = "#A32D2D";
      badge = `<span class="badge ${getFireRiskClass(fireRisk)}" style="margin-left: 8px;">${escapeHtml(fireRisk)}</span>`;
    } else if (fireRisk === "Warm") {
      tempColor = "#854F0B";
      badge = `<span class="badge ${getFireRiskClass(fireRisk)}" style="margin-left: 8px;">${escapeHtml(fireRisk)}</span>`;
    }

    return `
      <div style="margin-bottom: 8px; font-size: 12px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <span style="font-weight: 500;">${escapeHtml(bin.bin_id)}</span> — 
          <span style="color: ${tempColor}; font-weight: 600;">${Number(bin.temperature_c).toFixed(1)}°C</span>
        </div>
        <div>${badge}</div>
      </div>
    `;
  }).join("");
}

function renderEmptyState() {
  const detailContainer = document.getElementById("selected-bin-detail");
  if (detailContainer) detailContainer.innerHTML = '<div style="padding:16px;">No bin selected.</div>';
}

function renderEmptyStateForFilter() {
  const detailContainer = document.getElementById("selected-bin-detail");
  if (detailContainer) detailContainer.innerHTML = '<div style="padding:16px;">No bin selected for this filter.</div>';
}

// ----------------------------------------------------
// State Handlers
// ----------------------------------------------------

function showLoadingState() {
  const tbody = document.getElementById("bins-table-body");
  if (tbody && latestBins.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px;" class="loading-state">Loading bin data...</td></tr>`;
  }
}

function showErrorState() {
  const tbody = document.getElementById("bins-table-body");
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px;" class="error-state">Unable to load bin data. Please check that the Django API is running and sensor readings exist.</td></tr>`;
  }

  const alertsPanel = document.getElementById("alerts-panel");
  if (alertsPanel) {
    alertsPanel.innerHTML = `
      <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
        Unable to load bin data. Please check that the Django API is running and sensor readings exist.
      </p>
    `;
  }
}

// ----------------------------------------------------
// Helper Functions
// ----------------------------------------------------

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function getRecommendation(bin) {
  const fill = Number(bin.fill_percentage || 0);
  const temp = Number(bin.temperature_c || 0);
  const flameDetected = Boolean(bin.flame_detected);
  const fireRisk = bin.fire_risk || getFireRisk(temp, flameDetected);

  if (flameDetected || fireRisk === "Critical") {
    return "Critical flame detected. Immediate inspection required.";
  }

  if (fireRisk === "Warning") {
    return "Possible fire risk detected. Inspect this bin as soon as possible.";
  }

  if (fill >= 91) {
    return "Collection required. This bin is full.";
  }

  if (fill >= 80) {
    return "Collection recommended soon. This bin is almost full.";
  }

  return "No urgent action needed.";
}

function getFillStatus(fillPercentage) {
  const fill = Number(fillPercentage || 0);
  if (fill >= 91) return "Full";
  if (fill >= 71) return "Almost Full";
  if (fill >= 31) return "Medium";
  return "Low";
}

function getFireRisk(temperatureC, flameDetected = false) {
  if (flameDetected) return "Critical";

  const temp = Number(temperatureC || 0);
  if (temp >= 55) return "Warning";
  if (temp >= 40) return "Warm";
  return "Normal";
}

function getStatusClass(status) {
  const normalized = String(status).toLowerCase().replace(/\s+/g, "-");
  if (normalized === "low") return "badge-low";
  if (normalized === "medium") return "badge-med";
  if (normalized === "almost-full") return "badge-almost";
  if (normalized === "full") return "badge-full";
  return "badge-med";
}

function getFireRiskClass(fireRisk) {
  const normalized = String(fireRisk).toLowerCase();
  if (normalized === "normal") return "badge-normal";
  if (normalized === "warm") return "badge-warn";
  if (normalized === "warning") return "badge-warn";
  if (normalized === "critical") return "badge-risk";
  return "badge-normal";
}

function getFlameLabel(flameDetected) {
  return flameDetected ? "Flame Detected" : "No Flame";
}

function formatTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
