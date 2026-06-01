/**
 * WhatsApp Meta: configuración y envío de prueba.
 */
(function () {
  const api = window.OpenixAPI;
  const ui = window.PanelUI;

  const els = {
    tenant: document.getElementById("tenant"),
    phoneId: document.getElementById("phoneId"),
    webhookUrl: document.getElementById("webhookUrl"),
    statusGrid: document.getElementById("statusGrid"),
    sendStatus: document.getElementById("sendStatus"),
    testResult: document.getElementById("testResult"),
    testPhone: document.getElementById("testPhone"),
    testMsg: document.getElementById("testMsg"),
    clienteBadge: document.getElementById("clienteBadge"),
    clienteBanner: document.getElementById("clienteBanner"),
  };

  function tenantId() {
    return (els.tenant?.value || ClientePanel.getId() || "").trim();
  }

  function showSendStatus(msg, ok) {
    if (!els.sendStatus) return;
    els.sendStatus.hidden = false;
    els.sendStatus.className = "send-status " + (ok ? "send-status--ok" : "send-status--err");
    els.sendStatus.textContent = msg;
  }

  async function loadCliente() {
    const id = tenantId();
    if (!id) {
      if (els.clienteBanner) {
        els.clienteBanner.className = "cliente-banner cliente-banner--warn";
        els.clienteBanner.innerHTML = `⚠️ <a href="${ClientePanel.link("clientes.html")}">Elige un cliente</a> primero.`;
      }
      return;
    }
    try {
      const d = await api.getTenant(id);
      if (els.clienteBadge) els.clienteBadge.innerHTML = ClientePanel.badgeHtml(d.nombre, id);
      if (els.clienteBanner) {
        els.clienteBanner.className = "cliente-banner";
        els.clienteBanner.innerHTML = ClientePanel.badgeHtml(d.nombre, id);
      }
      if (els.phoneId) els.phoneId.value = d.meta_phone_number_id || "";
    } catch (e) {
      ui.toast(e.message, "err");
    }
  }

  async function refreshStatus() {
    const id = tenantId();
    if (!id || !els.statusGrid) return;
    try {
      const d = await api.setupStatus(id);
      els.statusGrid.innerHTML = (d.pasos || [])
        .map((p) => {
          const cls = p.ok === true ? "ok" : p.ok === false ? "err" : "warn";
          return `<div class="status-item ${cls}"><span class="status-dot"></span><span><strong>${ui.escape(p.titulo)}</strong><br>${ui.escape(p.detalle)}</span></div>`;
        })
        .join("");
    } catch (e) {
      ui.toast(e.message, "err");
    }
  }

  async function savePhone() {
    const id = tenantId();
    const phone = els.phoneId?.value.trim() || "";
    if (!id) return ui.toast("Elige un cliente", "err");
    if (!phone) return ui.toast("Escribe el Phone number ID", "err");
    try {
      await api.updateTenant(id, { meta_phone_number_id: phone });
      ui.toast("Phone number ID guardado", "ok");
      refreshStatus();
    } catch (e) {
      ui.toast(e.message, "err");
    }
  }

  async function sendTest() {
    const to = (els.testPhone?.value || "").replace(/\D/g, "");
    const message = (els.testMsg?.value || "").trim();
    const phone_number_id = els.phoneId?.value.trim() || "";

    if (!to || to.length < 8) return ui.toast("Teléfono inválido (ej. 34600111222)", "err");
    if (!message) return ui.toast("Escribe un mensaje", "err");
    if (!phone_number_id) return ui.toast("Guarda el Phone number ID primero", "err");

    const btn = document.getElementById("btnSendTest");
    if (btn) btn.disabled = true;
    showSendStatus("Enviando a Meta…", true);
    if (els.testResult) els.testResult.style.display = "none";

    try {
      const d = await api.whatsappSendTest({ to, message, phone_number_id, tenant_id: tenantId() });
      if (els.testResult) {
        els.testResult.style.display = "block";
        els.testResult.textContent = JSON.stringify(d, null, 2);
      }
      const meta = d.meta_response || {};
      if (meta.sent) {
        showSendStatus("Enviado a " + (meta.to || to), true);
        ui.toast("WhatsApp enviado", "ok");
      } else {
        showSendStatus(meta.reason || d.motivo || "Rechazado por Meta", false);
        ui.toast(meta.reason || "Error al enviar", "err");
      }
    } catch (e) {
      showSendStatus(e.message, false);
      ui.toast(e.message, "err");
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function init() {
    PanelShell.mount({ active: "whatsapp.html", title: "WhatsApp" });
    if (els.tenant) els.tenant.value = ClientePanel.getId() || "";
    if (els.webhookUrl) els.webhookUrl.textContent = location.origin.replace(/\/$/, "") + "/whatsapp/webhook";

    document.getElementById("btnSavePhone")?.addEventListener("click", savePhone);
    document.getElementById("btnRefresh")?.addEventListener("click", refreshStatus);
    document.getElementById("btnCopyWebhook")?.addEventListener("click", () => {
      navigator.clipboard.writeText(els.webhookUrl?.textContent || "")
        .then(() => ui.toast("URL copiada", "ok"))
        .catch(() => ui.toast("No se pudo copiar", "err"));
    });
    document.getElementById("testForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      sendTest();
    });

    loadCliente();
    refreshStatus();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
