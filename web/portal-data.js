/**
 * portal-data.js — Capa de datos dinámica para el portal de clientes Noesis.
 *
 * Carga KPIs, facturas, actividad y tickets desde Supabase
 * y los inyecta en el HTML existente de portal-dashboard.html.
 *
 * Depende de:
 *   - supabase-config.js (window.NOESIS_SUPABASE)
 *   - noesis-auth.js (sesión activa)
 *   - Supabase JS SDK (CDN)
 */

(async function portalData() {
  "use strict";

  /* ------------------------------------------------------------------ */
  /*  Supabase client                                                    */
  /* ------------------------------------------------------------------ */

  function getClient() {
    var config = window.NOESIS_SUPABASE || {};
    if (!window.supabase || !config.url || !config.anonKey) return null;
    return window.supabase.createClient(config.url, config.anonKey);
  }

  var sb = getClient();
  if (!sb) return;

  var sessionResult = await sb.auth.getSession();
  var session = sessionResult.data && sessionResult.data.session;
  if (!session) return;

  var userId = session.user.id;

  /* ------------------------------------------------------------------ */
  /*  Utilidades                                                         */
  /* ------------------------------------------------------------------ */

  function formatCurrency(n) {
    var num = Number(n) || 0;
    return num.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + "€";
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    var d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  }

  function formatDateFull(dateStr) {
    if (!dateStr) return "—";
    var d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function setText(selector, text) {
    var el = document.querySelector(selector);
    if (el) el.textContent = text;
  }

  function statusLabel(estado) {
    var map = {
      pendiente: "Pendiente",
      pagada: "Pagada",
      vencida: "Vencida",
      abierto: "Abierto",
      en_proceso: "En proceso",
      resuelto: "Resuelto",
      cerrado: "Cerrado",
      activa: "Activa",
      cancelada: "Cancelada",
      pausada: "Pausada",
    };
    return map[estado] || estado;
  }

  function statusClass(estado) {
    var map = {
      pendiente: "status-pending",
      pagada: "status-paid",
      vencida: "status-overdue",
      abierto: "status-open",
      en_proceso: "status-progress",
      resuelto: "status-resolved",
      cerrado: "status-closed",
      activa: "status-active",
      cancelada: "status-cancelled",
    };
    return map[estado] || "";
  }

  /* ------------------------------------------------------------------ */
  /*  Carga de datos                                                     */
  /* ------------------------------------------------------------------ */

  // Fetch all data concurrently
  var results = await Promise.all([
    sb.from("facturas").select("*").eq("cliente_id", userId).order("fecha_emision", { ascending: false }),
    sb.from("suscripciones").select("*").eq("cliente_id", userId).order("created_at", { ascending: false }).limit(1),
    sb.from("actividad").select("*").eq("cliente_id", userId).order("fecha", { ascending: false }).limit(10),
    sb.from("tickets").select("*").eq("cliente_id", userId).order("created_at", { ascending: false }),
  ]);

  var facturas = (results[0].data || []);
  var suscripcion = (results[1].data || [])[0] || null;
  var actividad = results[2].data || [];
  var tickets = results[3].data || [];

  /* ------------------------------------------------------------------ */
  /*  Panel: Resumen — KPIs                                              */
  /* ------------------------------------------------------------------ */

  var pendiente = 0;
  var totalPagado = 0;
  var proximaFecha = null;

  facturas.forEach(function (f) {
    if (f.estado === "pendiente" || f.estado === "vencida") {
      pendiente += Number(f.importe) || 0;
    }
    if (f.estado === "pagada") {
      totalPagado += Number(f.importe) || 0;
    }
  });

  // Próxima factura = la primera pendiente por fecha
  var pendientes = facturas.filter(function (f) { return f.estado === "pendiente"; });
  if (pendientes.length > 0) {
    // Sort ascending by date to get the nearest
    pendientes.sort(function (a, b) { return new Date(a.fecha_emision) - new Date(b.fecha_emision); });
    proximaFecha = pendientes[0].fecha_emision;
  } else if (suscripcion && suscripcion.fecha_proximo_cobro) {
    proximaFecha = suscripcion.fecha_proximo_cobro;
  }

  var estadoContrato = suscripcion ? statusLabel(suscripcion.estado) : "Sin suscripción";
  var notaContrato = suscripcion ? (suscripcion.plan.charAt(0).toUpperCase() + suscripcion.plan.slice(1)) : "—";
  var facturasPendientesCount = pendientes.length;

  setText("[data-kpi-value='pending']", formatCurrency(pendiente));
  setText("[data-kpi-note='pending']", facturasPendientesCount + (facturasPendientesCount === 1 ? " factura pendiente" : " facturas pendientes"));
  setText("[data-kpi-value='paid']", formatCurrency(totalPagado));
  setText("[data-kpi-note='paid']", facturas.filter(function (f) { return f.estado === "pagada"; }).length + " facturas pagadas");
  setText("[data-kpi-value='next']", formatDate(proximaFecha));
  setText("[data-kpi-note='next']", proximaFecha ? "Próximo vencimiento" : "Sin facturas pendientes");
  setText("[data-kpi-value='contract']", estadoContrato);
  setText("[data-kpi-note='contract']", notaContrato);

  /* ------------------------------------------------------------------ */
  /*  Panel: Resumen — Actividad reciente                                */
  /* ------------------------------------------------------------------ */

  var timelineContainer = document.getElementById("portal-activity-timeline");

  if (timelineContainer) {
    timelineContainer.innerHTML = "";

    if (actividad.length === 0) {
      timelineContainer.innerHTML = "<p class='empty-state'>No hay actividad reciente.</p>";
    } else {
      actividad.slice(0, 5).forEach(function (item) {
        var entry = document.createElement("div");
        entry.innerHTML = "<span>" + formatDate(item.fecha) + "</span><p>" + item.descripcion + "</p>";
        timelineContainer.appendChild(entry);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Panel: Facturación — Lista de facturas                             */
  /* ------------------------------------------------------------------ */

  var invoiceListContainer = document.getElementById("portal-invoice-list");

  if (invoiceListContainer) {
    invoiceListContainer.innerHTML = "";

    if (facturas.length === 0) {
      invoiceListContainer.innerHTML = "<p class='empty-state'>No hay facturas registradas.</p>";
    } else {
      facturas.forEach(function (f) {
        var link = document.createElement("a");
        link.href = f.url_factura || "#";
        if (f.url_factura) link.target = "_blank";
        link.rel = "noopener";
        link.className = "invoice-row";
        link.innerHTML =
          "<span class='invoice-icon'>" + (f.metodo_pago === "stripe" ? "💳" : "🏦") + "</span>" +
          "<div class='invoice-info'>" +
            "<strong>" + f.concepto + "</strong>" +
            "<small>" + formatDateFull(f.fecha_emision) + " · " + formatCurrency(f.importe) + "</small>" +
          "</div>" +
          "<span class='invoice-status " + statusClass(f.estado) + "'>" + statusLabel(f.estado) + "</span>";
        invoiceListContainer.appendChild(link);
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Panel: Facturación — Suscripción                                   */
  /* ------------------------------------------------------------------ */

  var subInfoContainer = document.getElementById("portal-subscription-info");

  if (subInfoContainer && suscripcion) {
    subInfoContainer.innerHTML =
      "<div><span>Plan</span><strong>" + (suscripcion.plan.charAt(0).toUpperCase() + suscripcion.plan.slice(1)) + "</strong></div>" +
      "<div><span>Precio mensual</span><strong>" + formatCurrency(suscripcion.precio_mensual) + "/mes</strong></div>" +
      "<div><span>Estado</span><strong>" + statusLabel(suscripcion.estado) + "</strong></div>" +
      "<div><span>Próximo cobro</span><strong>" + formatDateFull(suscripcion.fecha_proximo_cobro) + "</strong></div>";
  } else if (subInfoContainer) {
    subInfoContainer.innerHTML = "<p class='empty-state'>No hay suscripción activa.</p>";
  }

  /* ------------------------------------------------------------------ */
  /*  Panel: Facturación — Stripe Customer Portal                        */
  /* ------------------------------------------------------------------ */

  var stripePortalBtn = document.getElementById("portal-stripe-btn");

  if (stripePortalBtn) {
    if (suscripcion && suscripcion.stripe_customer_id) {
      stripePortalBtn.style.display = "";
      stripePortalBtn.addEventListener("click", async function () {
        var originalText = stripePortalBtn.textContent;
        stripePortalBtn.disabled = true;
        stripePortalBtn.textContent = "Abriendo…";
        try {
          // Sesión actual → token para que la función identifique al cliente
          var sr = await sb.auth.getSession();
          var cs = sr.data && sr.data.session;
          if (!cs || !cs.access_token) {
            alert("Tu sesión ha expirado. Vuelve a iniciar sesión.");
            return;
          }
          var res = await fetch("/.netlify/functions/crear-portal-pago", {
            method: "POST",
            headers: { Authorization: "Bearer " + cs.access_token },
          });
          var data = await res.json();
          if (res.ok && data.url) {
            window.location.href = data.url; // Stripe Customer Portal
          } else {
            alert(data.error || "No se pudo abrir el portal de pago. Escríbenos a info@bynoesis.com.");
          }
        } catch (err) {
          alert("Error de conexión al abrir el portal de pago. Inténtalo de nuevo.");
        } finally {
          stripePortalBtn.disabled = false;
          stripePortalBtn.textContent = originalText;
        }
      });
    } else {
      stripePortalBtn.style.display = "none";
    }
  }

  /* ------------------------------------------------------------------ */
  /*  FacturAI SSO — Abre FacturAI con la sesión del portal              */
  /* ------------------------------------------------------------------ */

  var FACTURAI_URL = window.FACTURAI_URL || "https://facturas.bynoesis.com";

  var facturaiBtn = document.getElementById("portal-facturai-btn");

  if (facturaiBtn) {
    facturaiBtn.addEventListener("click", async function () {
      try {
        var sessionResult = await sb.auth.getSession();
        var currentSession = sessionResult.data && sessionResult.data.session;
        if (!currentSession || !currentSession.access_token) {
          alert("Tu sesión ha expirado. Vuelve a iniciar sesión.");
          return;
        }
        var token = encodeURIComponent(currentSession.access_token);
        window.open(FACTURAI_URL + "/pagina.html#sso=" + token, "_blank");
      } catch (err) {
        alert("Error al abrir FacturAI: " + err.message);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Panel: Soporte — Lista de tickets                                  */
  /* ------------------------------------------------------------------ */

  var ticketListContainer = document.getElementById("portal-ticket-list");

  function renderTickets() {
    if (!ticketListContainer) return;

    ticketListContainer.innerHTML = "";

    if (tickets.length === 0) {
      ticketListContainer.innerHTML = "<p class='empty-state'>No tienes incidencias registradas. ¡Todo bien!</p>";
      return;
    }

    tickets.forEach(function (t) {
      var card = document.createElement("article");
      card.className = "ticket-card";
      card.innerHTML =
        "<header class='ticket-header'>" +
          "<strong>" + t.asunto + "</strong>" +
          "<span class='ticket-status " + statusClass(t.estado) + "'>" + statusLabel(t.estado) + "</span>" +
        "</header>" +
        "<p class='ticket-body'>" + t.descripcion + "</p>" +
        (t.respuesta_noesis
          ? "<div class='ticket-reply'><span>Respuesta Noesis:</span><p>" + t.respuesta_noesis + "</p></div>"
          : "") +
        "<footer class='ticket-footer'>" +
          "<small>" + formatDateFull(t.created_at) + "</small>" +
          "<small class='ticket-priority'>" + t.prioridad + "</small>" +
        "</footer>";
      ticketListContainer.appendChild(card);
    });
  }

  renderTickets();

  /* ------------------------------------------------------------------ */
  /*  Panel: Soporte — Crear nuevo ticket                                */
  /* ------------------------------------------------------------------ */

  var ticketForm = document.getElementById("portal-ticket-form");

  if (ticketForm) {
    ticketForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      var asuntoInput = ticketForm.querySelector("[name='asunto']");
      var descripcionInput = ticketForm.querySelector("[name='descripcion']");
      var prioridadInput = ticketForm.querySelector("[name='prioridad']");
      var submitBtn = ticketForm.querySelector("button[type='submit']");

      var asunto = (asuntoInput.value || "").trim();
      var descripcion = (descripcionInput.value || "").trim();
      var prioridad = prioridadInput ? prioridadInput.value : "normal";

      if (!asunto || !descripcion) {
        alert("Rellena el asunto y la descripción de la incidencia.");
        return;
      }

      var originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = "Enviando...";

      try {
        var result = await sb.from("tickets").insert({
          cliente_id: userId,
          asunto: asunto,
          descripcion: descripcion,
          prioridad: prioridad,
        }).select();

        if (result.error) throw result.error;

        // Add to local list and re-render
        if (result.data && result.data[0]) {
          tickets.unshift(result.data[0]);
        }
        renderTickets();

        // Also send email notification via Web3Forms
        try {
          var formData = new FormData();
          formData.append("access_key", "c0e13644-9a7a-4dc6-8920-6055afcd351a");
          formData.append("subject", "Nueva incidencia: " + asunto);
          formData.append("from_name", "Portal cliente Noesis");
          formData.append("email", session.user.email || "portal@bynoesis.com");
          formData.append("message", "Prioridad: " + prioridad + "\n\n" + descripcion);
          await fetch("https://api.web3forms.com/submit", { method: "POST", body: formData });
        } catch (emailErr) {
          // Email notification is optional; ticket is already saved
        }

        // Reset form
        ticketForm.reset();

        // Show success feedback
        var feedback = ticketForm.querySelector("[data-ticket-feedback]");
        if (feedback) {
          feedback.textContent = "✓ Incidencia enviada correctamente.";
          feedback.className = "ticket-feedback ticket-feedback-success";
          feedback.hidden = false;
          setTimeout(function () { feedback.hidden = true; }, 4000);
        }
      } catch (err) {
        var feedback = ticketForm.querySelector("[data-ticket-feedback]");
        if (feedback) {
          feedback.textContent = "Error al enviar la incidencia. Inténtalo de nuevo.";
          feedback.className = "ticket-feedback ticket-feedback-error";
          feedback.hidden = false;
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }
})();
