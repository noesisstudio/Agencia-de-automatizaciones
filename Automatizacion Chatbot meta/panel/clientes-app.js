/**
 * Hub de clientes — modal de creación integrado en la página.
 */
(function () {
  "use strict";

  function slugify(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  function escapeHtml(text) {
    const d = document.createElement("div");
    d.textContent = text ?? "";
    return d.innerHTML;
  }

  function toast(msg, ok) {
    if (window.PanelUI) {
      PanelUI.toast(msg, ok ? "ok" : "err");
      return;
    }
    alert(msg);
  }

  function showModal(show) {
    const el = document.getElementById("modalNewClient");
    if (!el) return;
    if (show) {
      el.hidden = false;
      el.removeAttribute("aria-hidden");
      el.classList.add("modal-backdrop--open");
      document.getElementById("mNombre")?.focus();
    } else {
      el.classList.remove("modal-backdrop--open");
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
    }
  }

  function openNewClientModal() {
    const form = document.getElementById("formNewClient");
    form?.reset();
    const idInput = document.getElementById("mId");
    if (idInput) delete idInput.dataset.touched;
    showModal(true);
  }

  function boot() {
    const api = window.OpenixAPI;
    if (!api) {
      document.getElementById("clientList").innerHTML =
        '<p class="hint" style="padding:12px">Error: no cargó panel-api.js. Recarga con Cmd+Shift+R.</p>';
      return;
    }

    let clientes = [];
    let selectedId = (window.ClientePanel && ClientePanel.getId()) || "";
    let searchQuery = "";

    const els = {
      list: document.getElementById("clientList"),
      search: document.getElementById("clientSearch"),
      workspace: document.getElementById("clientWorkspace"),
      count: document.getElementById("clientCount"),
      apiStatus: document.getElementById("apiStatus"),
    };

    function setApiStatus(ok, msg) {
      if (!els.apiStatus) return;
      els.apiStatus.hidden = false;
      els.apiStatus.className = "api-status api-status--" + (ok ? "ok" : "err");
      els.apiStatus.textContent = msg;
    }

    function statusMeta(c) {
      const chips = [];
      if (c.publicado_at) chips.push({ t: "Publicado", c: "ok" });
      else chips.push({ t: "Borrador", c: "warn" });
      if (c.tiene_conocimiento) chips.push({ t: "Docs", c: "ok" });
      if (c.meta_phone_number_id) chips.push({ t: "WhatsApp", c: "ok" });
      return chips;
    }

    function filtered() {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return clientes;
      return clientes.filter(
        (c) =>
          (c.nombre || "").toLowerCase().includes(q) ||
          (c.tenant_id || "").toLowerCase().includes(q)
      );
    }

    function initials(name) {
      const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
      if (parts.length <= 1) return (parts[0] || "?").slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    function renderList() {
      if (!els.list || !els.count) return;
      const items = filtered();
      els.count.textContent = items.length + " cliente" + (items.length === 1 ? "" : "s");

      if (!items.length) {
        els.list.innerHTML =
          '<div class="empty-state empty-state--sm"><p>Pulsa «+ Nuevo cliente» para empezar.</p></div>';
        return;
      }

      els.list.innerHTML = items
        .map((c) => {
          const active = c.tenant_id === selectedId ? " client-item--active" : "";
          const chips = statusMeta(c)
            .slice(0, 2)
            .map((ch) => `<span class="chip chip--${ch.c}">${escapeHtml(ch.t)}</span>`)
            .join("");
          return `<button type="button" class="client-item${active}" data-id="${escapeHtml(c.tenant_id)}">
            <span class="client-item__avatar">${escapeHtml(initials(c.nombre || c.tenant_id))}</span>
            <span class="client-item__body">
              <span class="client-item__name">${escapeHtml(c.nombre || c.tenant_id)}</span>
              <span class="client-item__id">${escapeHtml(c.tenant_id)}</span>
              <span class="client-item__chips">${chips}</span>
            </span>
          </button>`;
        })
        .join("");

      els.list.querySelectorAll(".client-item").forEach((btn) => {
        btn.onclick = () => selectClient(btn.dataset.id);
      });
    }

    function renderWorkspace() {
      if (!els.workspace) return;
      const c = clientes.find((x) => x.tenant_id === selectedId);
      if (!c) {
        els.workspace.innerHTML = `<div class="empty-state">
          <h2>Selecciona un cliente</h2>
          <p>O crea uno nuevo.</p>
          <button type="button" class="btn btn--primary" id="btnNewEmpty">+ Nuevo cliente</button>
        </div>`;
        document.getElementById("btnNewEmpty")?.addEventListener("click", openNewClientModal);
        return;
      }

      if (window.ClientePanel) ClientePanel.setId(c.tenant_id);
      const link = (p, id) =>
        window.ClientePanel ? ClientePanel.link(p, id) : p + "?cliente=" + encodeURIComponent(id);

      els.workspace.innerHTML = `
        <div class="workspace-header">
          <div class="workspace-header__avatar">${escapeHtml(initials(c.nombre))}</div>
          <div class="workspace-header__info">
            <h2>${escapeHtml(c.nombre)}</h2>
            <p class="workspace-header__id">${escapeHtml(c.tenant_id)}</p>
          </div>
        </div>
        <div class="workspace-actions">
          <a class="action-tile" href="${link("configurar.html", c.tenant_id)}"><strong>Documentos</strong></a>
          <a class="action-tile" href="${link("whatsapp.html", c.tenant_id)}"><strong>WhatsApp</strong></a>
          <a class="action-tile" href="${link("probar.html", c.tenant_id)}"><strong>Probar</strong></a>
        </div>
        <div class="workspace-danger">
          <p>Elimina el cliente y todos sus documentos. No se puede deshacer.</p>
          <button type="button" class="btn btn--danger btn--sm" id="btnDeleteClient">Eliminar cliente</button>
        </div>`;

      document.getElementById("btnDeleteClient")?.addEventListener("click", () => deleteClient(c));
    }

    async function deleteClient(c) {
      const msg =
        "¿Eliminar el cliente «" +
        (c.nombre || c.tenant_id) +
        "» (" +
        c.tenant_id +
        ")?\n\nSe borrarán documentos, WhatsApp y todo el conocimiento.";
      if (!confirm(msg)) return;
      try {
        await api.deleteTenant(c.tenant_id);
        toast("Cliente eliminado", true);
        selectedId = "";
        if (window.ClientePanel) ClientePanel.setId("");
        await refreshList();
        renderWorkspace();
      } catch (err) {
        toast(err.message || "Error al eliminar", false);
      }
    }

    function selectClient(id) {
      selectedId = id;
      if (window.ClientePanel) ClientePanel.setId(id);
      renderList();
      renderWorkspace();
    }

    async function refreshList() {
      const data = await api.listTenants();
      clientes = data.clientes || data.tenants || [];
      setApiStatus(true, "API conectada · " + clientes.length + " cliente(s)");
      renderList();
    }

    async function submitNewClient(e) {
      e.preventDefault();
      const nombre = document.getElementById("mNombre").value.trim();
      let tenant_id = document.getElementById("mId").value.trim() || slugify(nombre);
      const contacto = document.getElementById("mContacto").value.trim();

      if (!nombre) {
        toast("Escribe el nombre de la empresa", false);
        return;
      }
      if (!tenant_id || tenant_id.length < 2) {
        tenant_id = slugify(nombre) || "empresa-" + Date.now().toString(36).slice(2, 8);
      }

      const btn = document.getElementById("modalNewSubmit");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Creando…";
      }

      try {
        await api.createTenant({ tenant_id, nombre, contacto });
        showModal(false);
        toast("Cliente «" + nombre + "» creado", true);
        await refreshList();
        selectClient(tenant_id);
      } catch (err) {
        toast(err.message || "Error al crear", false);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Crear cliente";
        }
      }
    }

    // ── Enlaces del modal y botones ──
    document.getElementById("btnNewClient")?.addEventListener("click", openNewClientModal);
    document.getElementById("modalNewClose")?.addEventListener("click", () => showModal(false));
    document.getElementById("modalNewCancel")?.addEventListener("click", () => showModal(false));
    document.getElementById("formNewClient")?.addEventListener("submit", submitNewClient);

    document.getElementById("modalNewClient")?.addEventListener("click", (e) => {
      if (e.target.id === "modalNewClient") showModal(false);
    });

    const nombreInput = document.getElementById("mNombre");
    const idInput = document.getElementById("mId");
    nombreInput?.addEventListener("input", () => {
      if (idInput && !idInput.dataset.touched) idInput.value = slugify(nombreInput.value);
    });
    idInput?.addEventListener("input", () => {
      idInput.dataset.touched = "1";
    });

    document.getElementById("btnRefreshList")?.addEventListener("click", async () => {
      try {
        await refreshList();
        toast("Lista actualizada", true);
      } catch (err) {
        toast(err.message, false);
      }
    });

    els.search?.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      renderList();
    });

    if (window.PanelShell) {
      PanelShell.mount({ active: "clientes.html", title: "Clientes" });
    }

    window.OpenixClientes = { openNewClientModal, refreshList };

    setApiStatus(true, "Conectando con la API…");

    refreshList()
      .then(() => renderWorkspace())
      .catch((err) => {
        setApiStatus(false, "Sin conexión — abre http://127.0.0.1:8000/panel/clientes.html");
        els.list.innerHTML = `<div class="empty-state empty-state--sm">
          <p><strong>API no disponible</strong></p>
          <p>${escapeHtml(err.message)}</p>
          <p>1. Doble clic en <code>start-chatbot.command</code><br>
          2. O en terminal:<br>
          <code>cd chatbot-backend && source .venv/bin/activate && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000</code><br>
          3. Abre <a href="http://127.0.0.1:8000/panel/clientes.html">http://127.0.0.1:8000/panel/clientes.html</a></p>
        </div>`;
        toast(err.message, false);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
