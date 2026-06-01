(function () {
  var SESSION_KEY = "openixPortal";
  var billing = null;

  function readSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseNum(v) {
    if (v == null || v === "") return 0;
    var n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? 0 : n;
  }

  function formatMoney(n) {
    return (
      parseNum(n).toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + " €"
    );
  }

  function formatDate(s) {
    if (!s) return "—";
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      var p = s.slice(0, 10).split("-");
      return p[2] + "/" + p[1] + "/" + p[0];
    }
    return s;
  }

  function pillClass(status) {
    if (status === "paid" || status === "completed") {
      return "portal-pill portal-pill--ok";
    }
    if (status === "pending" || status === "overdue") {
      return "portal-pill portal-pill--pending";
    }
    return "portal-pill";
  }

  function statusLabel(status) {
    var map = {
      paid: "Pagada",
      pending: "Pendiente",
      overdue: "Vencida",
      completed: "Completado",
      scheduled: "Programado",
      active: "Activo",
      none: "Sin contrato",
    };
    return map[status] || status;
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function showPanel(id, panels, navBtns) {
    panels.forEach(function (p) {
      p.hidden = p.getAttribute("data-portal-panel") !== id;
    });
    navBtns.forEach(function (b) {
      var active = b.getAttribute("data-portal-nav") === id;
      b.classList.toggle("is-active", active);
      if (active) b.setAttribute("aria-current", "page");
      else b.removeAttribute("aria-current");
    });
    try {
      history.replaceState(null, "", "#" + id);
    } catch (e) {
      /* ignore */
    }
  }

  function showBillingTab(id, tabBtns, tabPanels) {
    tabBtns.forEach(function (btn) {
      var active = btn.getAttribute("data-billing-tab") === id;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
    tabPanels.forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-billing-panel") !== id;
    });
  }

  function renderEmptyRow(tbody, cols, message) {
    if (!tbody) return;
    tbody.innerHTML =
      '<tr class="portal-table__empty"><td colspan="' +
      cols +
      '">' +
      escapeHtml(message) +
      "</td></tr>";
  }

  function computeStats(data) {
    var invoices = data.invoices || [];
    var payments = data.payments || [];
    var pending = invoices
      .filter(function (i) {
        return i.status === "pending" || i.status === "overdue";
      })
      .reduce(function (s, i) {
        return s + parseNum(i.amount);
      }, 0);
    var paid = payments
      .filter(function (p) {
        return p.status === "completed";
      })
      .reduce(function (s, p) {
        return s + parseNum(p.amount);
      }, 0);
    return {
      totalInvoices: invoices.length,
      pendingAmount: pending,
      paidTotal: paid,
      pendingCount: invoices.filter(function (i) {
        return i.status === "pending" || i.status === "overdue";
      }).length,
    };
  }

  function renderInvoicesTable() {
    var tbody = document.getElementById("tbody-invoices");
    var list = (billing && billing.invoices) || [];
    if (!tbody) return;

    if (!list.length) {
      renderEmptyRow(
        tbody,
        6,
        "No tienes facturas de Noesis todavía. Aparecerán aquí cuando contrates o renueves un servicio."
      );
      return;
    }

    tbody.innerHTML = list
      .map(function (row) {
        var pdf =
          row.pdf || row.pdfUrl
            ? '<a class="portal-link-btn" href="' +
              escapeHtml(row.pdf || row.pdfUrl) +
              '" download>PDF</a>'
            : '<span class="portal-table__muted">—</span>';
        return (
          "<tr>" +
          "<td>" +
          escapeHtml(row.id || "—") +
          "</td>" +
          "<td>" +
          formatDate(row.date) +
          "</td>" +
          "<td>" +
          escapeHtml(row.concept || "—") +
          "</td>" +
          "<td>" +
          formatMoney(row.amount) +
          "</td>" +
          "<td><span class=\"" +
          pillClass(row.status) +
          "\">" +
          statusLabel(row.status) +
          "</span></td>" +
          "<td>" +
          pdf +
          "</td></tr>"
        );
      })
      .join("");
  }

  function renderPaymentsTable() {
    var tbody = document.getElementById("tbody-payments");
    var list = (billing && billing.payments) || [];
    if (!tbody) return;

    if (!list.length) {
      renderEmptyRow(
        tbody,
        6,
        "No hay pagos registrados. Se mostrarán cuando realices un pago por nuestros servicios."
      );
      return;
    }

    tbody.innerHTML = list
      .map(function (row) {
        return (
          "<tr>" +
          "<td>" +
          escapeHtml(row.id || "—") +
          "</td>" +
          "<td>" +
          formatDate(row.date) +
          "</td>" +
          "<td>" +
          escapeHtml(row.method || "—") +
          "</td>" +
          "<td>" +
          escapeHtml(row.invoiceId || row.reference || "—") +
          "</td>" +
          "<td>" +
          formatMoney(row.amount) +
          "</td>" +
          "<td><span class=\"" +
          pillClass(row.status) +
          "\">" +
          statusLabel(row.status) +
          "</span></td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function renderActivity() {
    var list = document.getElementById("portal-activity-list");
    if (!list) return;
    var events = [];
    (billing.invoices || []).forEach(function (inv) {
      events.push({
        at: inv.date || "",
        text:
          "Factura " +
          (inv.id || "") +
          " · " +
          (inv.concept || "Servicio Noesis") +
          " — " +
          statusLabel(inv.status),
      });
    });
    (billing.payments || []).forEach(function (pay) {
      events.push({
        at: pay.date || "",
        text:
          "Pago " +
          (pay.id || "") +
          " · " +
          formatMoney(pay.amount) +
          " — " +
          statusLabel(pay.status),
      });
    });
    events.sort(function (a, b) {
      return String(b.at).localeCompare(String(a.at));
    });
    events = events.slice(0, 8);

    if (!events.length) {
      list.innerHTML =
        '<li class="portal-empty-inline">Sin movimientos recientes.</li>';
      return;
    }
    list.innerHTML = events
      .map(function (ev) {
        return (
          '<li><span class="portal-timeline__dot" aria-hidden="true"></span>' +
          escapeHtml(ev.text) +
          "</li>"
        );
      })
      .join("");
  }

  function renderServiceStatus() {
    var container = document.getElementById("portal-service-status");
    if (!container) return;
    var items = (billing && billing.serviceStatus) || [];
    if (!items.length) {
      container.innerHTML =
        '<li class="portal-milestone"><p class="portal-milestone__desc">Tu proyecto aparecerá aquí cuando Noesis active el seguimiento de tu cuenta.</p></li>';
      return;
    }
    container.innerHTML = items
      .map(function (item) {
        var cls = "portal-milestone";
        if (item.state === "done") cls += " portal-milestone--done";
        if (item.state === "active") cls += " portal-milestone--active";
        return (
          '<li class="' +
          cls +
          '"><p class="portal-milestone__title">' +
          escapeHtml(item.title || "") +
          '</p><p class="portal-milestone__desc">' +
          escapeHtml(item.description || "") +
          "</p></li>"
        );
      })
      .join("");
  }

  function setLoadBanner() {
    var el = document.getElementById("portal-load-status");
    if (!el) return;
    if (location.protocol === "file:") {
      el.className = "portal-api-status portal-api-status--warn";
      el.textContent =
        "Para cargar tu facturación al iniciar sesión, abre la web con un servidor local (no file://).";
      return;
    }
    el.hidden = true;
  }

  function renderAll(session) {
    var data = billing || window.NoesisBilling.emptyProfile(session.user);
    var company = data.company || {};
    var contract = data.contract || {};
    var stats = computeStats(data);

    var display =
      company.displayName || session.displayName || session.user || "Cliente";
    document.querySelectorAll(".js-portal-username").forEach(function (el) {
      el.textContent = display;
    });

    var meta = document.getElementById("portal-company-meta");
    if (meta) {
      var parts = [];
      if (company.plan) parts.push(company.plan);
      if (company.nif) parts.push("NIF " + company.nif);
      if (contract.label) parts.push(contract.label);
      meta.textContent = parts.length ? parts.join(" · ") : "";
      meta.hidden = !parts.length;
    }

    setText("stat-pending-amount", formatMoney(stats.pendingAmount));
    setText("stat-paid-total", formatMoney(stats.paidTotal));
    setText("stat-pending-count", String(stats.pendingCount));
    setText(
      "stat-next-invoice",
      contract.nextInvoiceDate ? formatDate(contract.nextInvoiceDate) : "—"
    );
    setText("bill-stat-invoices", String(stats.totalInvoices));
    setText("bill-stat-pending", String(stats.pendingCount));
    setText("bill-stat-paid", formatMoney(stats.paidTotal));

    var contractEl = document.getElementById("portal-contract-status");
    if (contractEl) {
      contractEl.textContent = contract.label || statusLabel(contract.status);
    }

    renderActivity();
    renderInvoicesTable();
    renderPaymentsTable();
    renderServiceStatus();
  }

  document.addEventListener("DOMContentLoaded", async function () {
    var session = readSession();
    if (!session || !session.user) return;

    setLoadBanner();

    try {
      billing = await window.NoesisBilling.load(session.user);
    } catch (e) {
      billing = window.NoesisBilling.emptyProfile(session.user);
    }
    renderAll(session);

    document.getElementById("portalLogout") &&
      document.getElementById("portalLogout").addEventListener("click", function () {
        try {
          sessionStorage.removeItem(SESSION_KEY);
        } catch (err) {
          /* ignore */
        }
        location.href = "login.html";
      });

    var panels = document.querySelectorAll("[data-portal-panel]");
    var navBtns = document.querySelectorAll("[data-portal-nav]");
    var tabBtns = document.querySelectorAll("[data-billing-tab]");
    var tabPanels = document.querySelectorAll("[data-billing-panel]");

    if (panels.length && navBtns.length) {
      function go(id) {
        id = String(id || "").replace(/[^a-z0-9_-]/gi, "");
        if (!id || !document.querySelector('[data-portal-panel="' + id + '"]')) {
          id = "resumen";
        }
        showPanel(id, panels, navBtns);
      }
      navBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          go(btn.getAttribute("data-portal-nav"));
          var sidebar = document.getElementById("portalSidebar");
          var backdrop = document.getElementById("portalBackdrop");
          var toggle = document.getElementById("portalNavToggle");
          if (sidebar) sidebar.classList.remove("is-open");
          if (backdrop) backdrop.hidden = true;
          if (toggle) toggle.setAttribute("aria-expanded", "false");
        });
      });
      var hash = (location.hash || "").replace(/^#/, "");
      go(hash || "resumen");
    }

    if (tabBtns.length && tabPanels.length) {
      tabBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          showBillingTab(btn.getAttribute("data-billing-tab"), tabBtns, tabPanels);
        });
      });
      showBillingTab("facturas", tabBtns, tabPanels);
    }

    var toggle = document.getElementById("portalNavToggle");
    var sidebar = document.getElementById("portalSidebar");
    var backdrop = document.getElementById("portalBackdrop");
    if (toggle && sidebar) {
      toggle.addEventListener("click", function () {
        sidebar.classList.toggle("is-open");
        var open = sidebar.classList.contains("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        if (backdrop) backdrop.hidden = !open;
      });
    }
    if (backdrop && sidebar) {
      backdrop.addEventListener("click", function () {
        sidebar.classList.remove("is-open");
        backdrop.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
      });
    }
  });
})();
