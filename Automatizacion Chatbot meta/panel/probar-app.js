/**
 * Probar conversación del chatbot.
 */
(function () {
  const api = window.OpenixAPI;

  const els = {
    tenant: document.getElementById("tenant"),
    tenantLabel: document.getElementById("tenantLabel"),
    msgs: document.getElementById("msgs"),
    text: document.getElementById("text"),
    form: document.getElementById("form"),
    diagBanner: document.getElementById("diagBanner"),
  };

  const SID = "panel-" + Math.random().toString(36).slice(2);

  function tenantId() {
    return (els.tenant?.value || ClientePanel.getId() || "").trim();
  }

  function bubble(text, kind) {
    if (!els.msgs) return;
    const d = document.createElement("div");
    d.className = "bubble " + (kind === "out" ? "bubble--out" : kind === "err" ? "bubble--err" : "bubble--in");
    d.textContent = text;
    els.msgs.appendChild(d);
    els.msgs.scrollTop = els.msgs.scrollHeight;
  }

  function showDiag(d) {
    const box = els.diagBanner;
    if (!box) return;
    if (!d) { box.style.display = "none"; return; }

    const bloqueos = d.bloqueos || [];
    const avisos = d.avisos || [];
    let cls = bloqueos.length ? "err" : avisos.length ? "warn" : "ok";

    let html = "<strong>" + (d.listo ? "Listo para chatear" : "Hay bloqueos") + "</strong>";
    if (d.mensaje_resumen) html += "<div>" + d.mensaje_resumen + "</div>";
    if (d.accion_recomendada) html += "<div style='margin-top:6px'>" + d.accion_recomendada + "</div>";
    bloqueos.concat(avisos).forEach((c) => {
      html += `<div style='margin-top:8px'><span class="diag-code">${c.codigo}</span> — ${c.titulo}</div>`;
    });

    box.className = "diag-box " + cls;
    box.innerHTML = html;
    box.style.display = "block";
  }

  async function runDiagnostico() {
    const id = tenantId();
    if (!id) {
      showDiag({ listo: false, mensaje_resumen: "Sin cliente.", accion_recomendada: "Elige uno en Clientes.", bloqueos: [], avisos: [] });
      return;
    }
    try {
      showDiag(await api.diagnostico(id));
    } catch (e) {
      showDiag({ listo: false, mensaje_resumen: "API no disponible.", accion_recomendada: e.message, bloqueos: [], avisos: [] });
    }
  }

  function syncTenantUi(id) {
    if (els.tenant) els.tenant.value = id || "";
    if (els.tenantLabel) {
      els.tenantLabel.innerHTML = id
        ? `Cliente activo: <code>${PanelUI.escape(id)}</code> — las respuestas usan solo sus documentos`
        : `<a href="${ClientePanel.link("clientes.html")}">Elige un cliente</a>`;
    }
  }

  function init() {
    PanelShell.mount({ active: "probar.html", title: "Probar chat" });
    const q = new URLSearchParams(location.search).get("cliente");
    if (q) ClientePanel.setId(q.trim());
    const id = ClientePanel.getId();
    syncTenantUi(id);

    ClientePanel.onChange((newId) => {
      syncTenantUi(newId);
      if (els.msgs) els.msgs.innerHTML = "";
      if (newId) {
        bubble("Cliente cambiado a «" + newId + "». Pregunta sobre este cliente.", "in");
        runDiagnostico();
      }
    });

    document.getElementById("btnDiag")?.addEventListener("click", runDiagnostico);
    els.form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const m = els.text?.value.trim() || "";
      if (!m) return;
      if (!tenantId()) return bubble("Selecciona un cliente en Clientes.", "err");
      if (els.text) els.text.value = "";
      bubble(m, "out");
      try {
        const d = await api.chat(tenantId(), m, SID);
        bubble(d.respuesta, d.ok === false ? "err" : "in");
        if (d.ok === false) runDiagnostico();
      } catch (err) {
        bubble("Error: " + err.message, "err");
      }
    });

    bubble(id ? "Pregunta lo que quieras sobre " + id + "." : "Selecciona un cliente primero.", "in");
    if (id) runDiagnostico();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
