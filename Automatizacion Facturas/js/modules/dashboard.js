import { api } from "./api.js";
import { state } from "./state.js";
import { el, formatMoney, statusPill, renderLoading, formatDate, escapeHtml } from "./utils.js";

let chart1 = null;
let chart2 = null;

export async function renderDashboard(root) {
  root.innerHTML = `<div class="page-head"><h1>Dashboard</h1></div>` + renderLoading(8);

  try {
    const [stats, recent, chartData] = await Promise.all([
      api("/dashboard/stats"),
      api("/dashboard/recent"),
      api("/dashboard/chart-data")
    ]);

    state.stats = stats;
    render(root, stats, recent, chartData);
  } catch (err) {
    root.innerHTML = `<div class="page-head"><h1>Dashboard</h1></div>
      <div class="empty-state">
        <div class="empty-state__icon error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
        <h3>Error al cargar dashboard</h3>
        <p class="muted">${escapeHtml(err.message)}</p>
        <button class="btn btn--primary mt-md" onclick="location.reload()">Reintentar</button>
      </div>`;
  }
}

function render(root, stats, recent, chartData) {
  root.innerHTML = "";

  const head = el("div", { className: "page-head" }, [
    el("h1", { text: "Dashboard" })
  ]);

  const pct = stats.monthly_change_pct || 0;
  const isUp = pct >= 0;
  const pctHtml = `<span class="${isUp ? 'text-success' : 'text-danger'} flex items-center gap-xs text-sm">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;transform:${isUp ? 'rotate(0deg)' : 'rotate(180deg)'}"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
    ${Math.abs(pct).toFixed(1)}%
  </span>`;

  const statGrid = el("div", { className: "stat-grid" }, [
    createStatCard("Ingresos del mes", formatMoney(stats.monthly_revenue), pctHtml, "M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"),
    createStatCard("Total Emitidas", stats.total_invoices, "Facturas creadas", "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8"),
    createStatCard("Pendientes", stats.sent_count, "Enviadas sin pagar", "M22 11.08V12a10 10 0 11-5.93-9.14 M22 4L12 14.01l-3-3"),
    createStatCard("Vencidas", stats.overdue_count, "Requieren atención", "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", true)
  ]);

  const canvasWrap1 = el("div", {}, [el("canvas", { id: "chart-monthly" })]);
  const canvasWrap2 = el("div", {}, [el("canvas", { id: "chart-status" })]);
  const chartGrid = el("div", { className: "grid-2" }, [canvasWrap1, canvasWrap2]);

  const recentList = el("div", { className: "stack gap-sm" }, 
    recent.length === 0 
      ? [el("p", { className: "muted text-center py-md", text: "No hay facturas recientes." })]
      : recent.map(inv => el("a", { 
          className: "list-row list-row--hoverable text-inherit", 
          href: `#/invoices?id=${inv.id}`,
          style: { textDecoration: 'none' }
        }, [
          el("div", { className: "font-mono text-sm", text: inv.number }),
          el("div", { className: "truncate", text: inv.client_name || "Sin cliente" }),
          el("div", { className: "text-right font-medium", text: formatMoney(inv.total_amount) }),
          el("div", { className: "text-right", innerHTML: statusPill(inv.status) })
        ]))
  );

  const recentPanel = el("section", { className: "panel" }, [
    el("div", { className: "flex justify-between items-center mb-md" }, [
      el("h3", { text: "Facturas recientes", className: "m-0 text-lg" }),
      el("a", { href: "#/invoices", className: "btn btn--ghost btn--sm", text: "Ver todas" })
    ]),
    recentList
  ]);

  root.appendChild(head);
  root.appendChild(statGrid);
  root.appendChild(chartGrid);
  root.appendChild(recentPanel);

  if (window.Chart) {
    initCharts(chartData);
  } else {
    // If Chart.js loads later
    const checkChart = setInterval(() => {
      if (window.Chart) {
        clearInterval(checkChart);
        initCharts(chartData);
      }
    }, 100);
    setTimeout(() => clearInterval(checkChart), 5000);
  }
}

function createStatCard(label, value, subHtml, iconPath, isWarning = false) {
  const iconHtml = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${isWarning ? 'text-danger' : 'text-accent'}"><path d="${iconPath}"/></svg>`;
  
  return el("div", { className: `stat-card ${isWarning && value > 0 ? 'stat-card--warning' : ''}` }, [
    el("div", { className: "flex justify-between items-start mb-sm" }, [
      el("span", { className: "stat-card__label", text: label }),
      el("div", { className: "stat-card__icon", innerHTML: iconHtml })
    ]),
    el("div", { className: "stat-card__value mb-xs", text: String(value) }),
    el("div", { className: "stat-card__sub text-sm muted", innerHTML: subHtml })
  ]);
}

function initCharts(data) {
  if (chart1) chart1.destroy();
  if (chart2) chart2.destroy();

  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "rgba(241, 245, 249, 0.06)" : "rgba(15, 23, 42, 0.06)";

  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "Inter, system-ui, sans-serif";

  const ctx1 = document.getElementById("chart-monthly");
  if (ctx1) {
    const labels = data.monthly.map(m => m.month);
    const values = data.monthly.map(m => m.total);
    
    chart1 = new Chart(ctx1, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Facturación (€)",
          data: values,
          backgroundColor: isDark ? "rgba(99, 102, 241, 0.8)" : "rgba(99, 102, 241, 0.9)",
          borderRadius: 4,
          hoverBackgroundColor: "#4f46e5"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: gridColor }, beginAtZero: true }
        }
      }
    });
  }

  const ctx2 = document.getElementById("chart-status");
  if (ctx2) {
    const labels = data.by_status.map(s => s.status.charAt(0).toUpperCase() + s.status.slice(1));
    const values = data.by_status.map(s => s.count);
    
    // Map status to colors
    const colors = labels.map(l => {
      const s = l.toLowerCase();
      if (s === "pagada" || s === "cobrada") return "#10b981";
      if (s === "enviada" || s === "emitida") return "#6366f1";
      if (s === "vencida") return "#f59e0b";
      if (s === "anulada" || s === "rechazada") return "#f43f5e";
      return "#64748b"; // borrador
    });

    chart2 = new Chart(ctx2, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: isDark ? "#141b2d" : "#ffffff",
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "70%",
        plugins: {
          legend: { position: "right" }
        }
      }
    });
  }
}
