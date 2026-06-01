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
    if (window.PanelUI) PanelUI.toast(msg, ok ? "ok" : "err");
    else alert(msg);
  }

  function showModal(show) {
    const el = document.getElementById("modalNewEmpresa");
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

  function openNewModal() {
    document.getElementById("formNewEmpresa")?.reset();
    const idInput = document.getElementById("mId");
    if (idInput) delete idInput.dataset.touched;
    showModal(true);
  }

  PanelShell.mount({ active: "empresas.html", title: "Empresas" });

  let empresas = [];
  let selectedId = EmpresaPanel.getId();
  let searchQuery = "";

  const els = {
    list: document.getElementById("empresaList"),
    search: document.getElementById("empresaSearch"),
    workspace: document.getElementById("empresaWorkspace"),
    count: document.getElementById("empresaCount"),
    apiStatus: document.getElementById("apiStatus"),
  };

  function setApiStatus(ok, msg) {
    if (!els.apiStatus) return;
    els.apiStatus.hidden = false;
    els.apiStatus.className = "api-status api-status--" + (ok ? "ok" : "err");
    els.apiStatus.textContent = msg;
  }

  function filtered() {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter(
      (e) =>
        (e.nombre || "").toLowerCase().includes(q) ||
        (e.empresa_id || "").toLowerCase().includes(q)
    );
  }

  function initials(name) {
    const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return (parts[0] || "?").slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function renderWorkspace(e) {
    if (!e) {
      els.workspace.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">✉</div>
          <h2>Selecciona una empresa</h2>
          <p>Elige una de la lista o crea una nueva.</p>
          <button type="button" class="btn btn--primary" id="btnNewEmpty">+ Nueva empresa</button>
        </div>`;
      document.getElementById("btnNewEmpty")?.addEventListener("click", openNewModal);
      return;
    }

    const docsOk = (e.caracteres || 0) >= 80;
    const docCls = docsOk ? "ok" : "warn";
    const docMsg = docsOk
      ? `${e.caracteres} caracteres en documentación`
      : `Solo ${e.caracteres || 0} caracteres — añade FAQs y servicios`;

    els.workspace.innerHTML = `
      <div class="client-detail">
        <div class="client-detail__head">
          <span class="client-avatar">${escapeHtml(initials(e.nombre))}</span>
          <div>
            <h2>${escapeHtml(e.nombre || e.empresa_id)}</h2>
            <p class="hint"><code>${escapeHtml(e.empresa_id)}</code></p>
          </div>
        </div>
        <div class="card status-item ${docCls}" style="margin-bottom:16px">
          <span class="status-dot"></span><span>${escapeHtml(docMsg)}</span>
        </div>
        <div class="btn-row">
          <a class="btn btn--primary" href="${EmpresaPanel.link("conocimiento.html", e.empresa_id)}">Editar documentación</a>
          <a class="btn btn--ghost" href="${EmpresaPanel.link("borrador.html", e.empresa_id)}">Probar borrador</a>
        </div>
      </div>`;
  }

  function renderList() {
    const items = filtered();
    els.count.textContent = items.length + " empresa" + (items.length === 1 ? "" : "s");

    if (!items.length) {
      els.list.innerHTML =
        '<div class="empty-state empty-state--sm"><p>Pulsa «+ Nueva empresa» para empezar.</p></div>';
      renderWorkspace(null);
      return;
    }

    els.list.innerHTML = items
      .map((e) => {
        const active = e.empresa_id === selectedId ? " client-item--active" : "";
        const chars = e.caracteres || 0;
        const chip = chars >= 80 ? "ok" : "warn";
        return `
          <button type="button" class="client-item${active}" data-id="${escapeHtml(e.empresa_id)}">
            <span class="client-item__avatar">${escapeHtml(initials(e.nombre))}</span>
            <span class="client-item__body">
              <strong>${escapeHtml(e.nombre || e.empresa_id)}</strong>
              <span class="client-item__meta">${escapeHtml(e.empresa_id)} · ${chars} chars</span>
            </span>
            <span class="chip chip--${chip}">${chars >= 80 ? "Docs" : "Pendiente"}</span>
          </button>`;
      })
      .join("");

    els.list.querySelectorAll(".client-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedId = btn.dataset.id || "";
        EmpresaPanel.setId(selectedId);
        renderList();
        renderWorkspace(items.find((x) => x.empresa_id === selectedId));
      });
    });

    if (selectedId) {
      renderWorkspace(items.find((x) => x.empresa_id === selectedId));
    } else {
      renderWorkspace(null);
    }
  }

  async function loadList() {
    try {
      empresas = await EmailComercialAPI.listEmpresas();
      setApiStatus(true, "API conectada");
      if (!selectedId && empresas.length) {
        selectedId = empresas[0].empresa_id;
        EmpresaPanel.setId(selectedId);
      }
      renderList();
    } catch (err) {
      setApiStatus(false, err.message);
      els.list.innerHTML = `<p class="hint" style="padding:12px">${escapeHtml(err.message)}</p>`;
    }
  }

  document.getElementById("btnRefreshList")?.addEventListener("click", loadList);
  document.getElementById("btnNewEmpresa")?.addEventListener("click", openNewModal);
  document.getElementById("modalNewClose")?.addEventListener("click", () => showModal(false));
  document.getElementById("modalNewCancel")?.addEventListener("click", () => showModal(false));

  const mNombre = document.getElementById("mNombre");
  const mId = document.getElementById("mId");
  mNombre?.addEventListener("input", () => {
    if (mId && !mId.dataset.touched) mId.value = slugify(mNombre.value);
  });
  mId?.addEventListener("input", () => {
    if (mId) mId.dataset.touched = "1";
  });

  document.getElementById("formNewEmpresa")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const nombre = mNombre?.value.trim();
    const empresa_id = (mId?.value.trim() || slugify(nombre)).slice(0, 48);
    if (!nombre || empresa_id.length < 2) {
      toast("Nombre e ID válidos requeridos", false);
      return;
    }
    try {
      await EmailComercialAPI.crearEmpresa(empresa_id, nombre);
      selectedId = empresa_id;
      EmpresaPanel.setId(empresa_id);
      showModal(false);
      toast("Empresa creada", true);
      await loadList();
    } catch (err) {
      toast(err.message, false);
    }
  });

  els.search?.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    renderList();
  });

  loadList();
})();
