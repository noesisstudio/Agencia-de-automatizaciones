/**
 * Gestión de documentos del chatbot.
 */
(function () {
  const api = window.OpenixAPI;
  const ui = window.PanelUI;

  const els = {
    tenant: document.getElementById("tenant"),
    nombre: document.getElementById("nombre"),
    knowledge: document.getElementById("knowledge"),
    preview: document.getElementById("preview"),
    archivosLista: document.getElementById("archivosLista"),
    clienteBanner: document.getElementById("clienteBanner"),
    pubStatus: document.getElementById("pubStatus"),
    charBase: document.getElementById("charBase"),
    charCompiled: document.getElementById("charCompiled"),
    charLimit: document.getElementById("charLimit"),
    archCount: document.getElementById("archCount"),
    dirtyHint: document.getElementById("dirtyHint"),
    statusBox: document.getElementById("statusBox"),
    statusGrid: document.getElementById("statusGrid"),
    drop: document.getElementById("drop"),
    dropLabel: document.getElementById("dropLabel"),
    file: document.getElementById("file"),
    urlImport: document.getElementById("urlImport"),
  };

  let savedBase = "";
  let dirty = false;

  function tenantId() {
    return (els.tenant?.value || ClientePanel.getId() || "").trim();
  }

  function setDirty(val) {
    dirty = val;
    if (els.dirtyHint) els.dirtyHint.hidden = !dirty;
  }

  function updateCharCounts(stats) {
    const s = stats || {};
    if (els.charBase) {
      els.charBase.textContent =
        (els.knowledge?.value.length || s.caracteres_base || 0) + " caracteres (base)";
    }
    const compiled = s.caracteres_compilado || 0;
    const limit = s.limite_caracteres || 22000;
    if (els.charCompiled) {
      els.charCompiled.textContent = compiled + " caracteres (compilado)";
      els.charCompiled.className =
        "meta-pill" + (compiled > limit * 0.9 ? " meta-pill--warn" : "");
    }
    if (els.charLimit) els.charLimit.textContent = "Límite ~" + limit.toLocaleString("es");
    if (els.archCount) els.archCount.textContent = (s.archivos_activos ?? "?") + " archivo(s)";
    if (s.recortado) ui.toast("Conocimiento cerca del límite — puede estar recortado.", "err");
  }

  function renderArchivos(lista) {
    if (!els.archivosLista) return;
    if (!lista.length) {
      els.archivosLista.innerHTML = '<li class="file-list__empty">Ningún archivo subido aún.</li>';
      return;
    }
    els.archivosLista.innerHTML = lista
      .map((a) => {
        const kb = a.bytes ? Math.round(a.bytes / 1024) + " KB" : "";
        const sec = a.seccion ? `<span class="file-tag">${ui.escape(a.seccion)}</span>` : "";
        const ext = a.texto_extraido ? `<span class="file-tag">PDF extraído</span>` : "";
        return `<li class="file-list__item">
          <div class="file-list__info">
            <strong>${ui.escape(a.nombre)}</strong>${sec}${ext}
            ${kb ? `<span class="file-meta">${kb}</span>` : ""}
          </div>
          <button type="button" class="btn btn--ghost btn--sm btn-del" data-name="${ui.escape(a.nombre)}">Eliminar</button>
        </li>`;
      })
      .join("");
    els.archivosLista.querySelectorAll(".btn-del").forEach((btn) => {
      btn.onclick = () => deleteFile(btn.dataset.name);
    });
  }

  function applyTenantData(d) {
    savedBase = d.base_markdown || "";
    if (els.knowledge) els.knowledge.value = savedBase;
    setDirty(false);
    if (els.nombre) els.nombre.value = d.nombre || "";
    if (els.preview) els.preview.textContent = d.knowledge_markdown || "(vacío)";
    if (els.clienteBanner) {
      els.clienteBanner.className = "cliente-banner";
      els.clienteBanner.innerHTML = ClientePanel.badgeHtml(d.nombre, tenantId()) +
        `<a class="btn btn--ghost btn--sm" href="${ClientePanel.link("clientes.html")}">Cambiar</a>`;
    }
    if (els.pubStatus) {
      els.pubStatus.textContent = d.publicado_at
        ? "Activo para el chat: " + d.publicado_at
        : "Guarda el texto base para activar el chat";
    }
    renderArchivos(d.archivos_subidos || []);
    updateCharCounts(d.stats);
    const archivos = d.archivos_subidos || [];
    const warn = document.getElementById("archivosWarn");
    if (warn) {
      warn.hidden = archivos.length === 0;
      if (archivos.length) {
        warn.textContent =
          "Hay " +
          archivos.length +
          " archivo(s) subido(s): el bot mezcla texto base + archivos. " +
          "Si cambias solo el texto, elimina archivos viejos o recompila.";
      }
    }
  }

  async function refreshStatus() {
    const id = tenantId();
    if (!id || !els.statusGrid) return;
    try {
      const d = await api.setupStatus(id);
      if (els.statusBox) els.statusBox.style.display = "block";
      els.statusGrid.innerHTML = (d.pasos || [])
        .map((p) => {
          const cls = p.ok === true ? "ok" : p.ok === false ? "err" : "warn";
          return `<div class="status-item ${cls}"><span class="status-dot"></span><span><strong>${ui.escape(p.titulo)}</strong><br>${ui.escape(p.detalle)}</span></div>`;
        })
        .join("");
    } catch (e) {
      ui.toast("Estado: " + e.message, "err");
    }
  }

  async function load() {
    const id = tenantId();
    if (!id) {
      if (els.clienteBanner) {
        els.clienteBanner.className = "cliente-banner cliente-banner--warn";
        els.clienteBanner.innerHTML = `⚠️ <a href="${ClientePanel.link("clientes.html")}">Elige un cliente</a> para editar documentos.`;
      }
      return;
    }
    try {
      applyTenantData(await api.getTenant(id));
      refreshStatus();
    } catch (e) {
      ui.toast(e.message, "err");
    }
  }

  async function saveBase() {
    const id = tenantId();
    const texto = els.knowledge?.value || "";
    if (!texto.trim()) return ui.toast("Escribe contenido en el texto base", "err");
    try {
      const d = await api.saveKnowledge(id, texto, els.nombre?.value || "");
      savedBase = texto;
      setDirty(false);
      if (d.stats) {
        updateCharCounts(d.stats);
        const tenant = await api.getTenant(id);
        if (els.preview) els.preview.textContent = tenant.knowledge_markdown || "";
      }
      const comp = d.stats?.caracteres_compilado ?? d.stats?.caracteres ?? "?";
      ui.toast(
        "Guardado y activo para el chat (" + comp + " caracteres compilados)",
        "ok"
      );
      refreshStatus();
    } catch (e) {
      ui.toast(e.message, "err");
    }
  }

  async function publish() {
    if (dirty) {
      await saveBase();
      if (dirty) return;
    }
    try {
      const d = await api.publish(tenantId(), els.nombre?.value || "");
      ui.toast("Chatbot publicado", "ok");
      if (els.pubStatus) els.pubStatus.textContent = "Publicado: " + (d.meta?.publicado_at || "ahora");
      refreshStatus();
    } catch (e) {
      ui.toast(e.message, "err");
    }
  }

  async function upload(f) {
    const id = tenantId();
    if (!id) return ui.toast("Elige un cliente primero", "err");
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (!["md", "txt", "pdf", "json"].includes(ext)) {
      return ui.toast("Formatos: .md, .txt, .pdf, .json", "err");
    }
    if (els.dropLabel) els.dropLabel.textContent = "Subiendo " + f.name + "…";
    try {
      const d = await api.uploadDocument(id, f);
      applyTenantData(await api.getTenant(id));
      document.querySelector('.tab[data-tab="preview"]')?.click();
      ui.toast("«" + (d.archivo || f.name) + "» subido" + (d.duplicado ? " (duplicado)" : ""), "ok");
      refreshStatus();
    } catch (e) {
      ui.toast(e.message, "err");
    } finally {
      if (els.dropLabel) els.dropLabel.textContent = "Arrastra aquí o haz clic para subir";
      if (els.file) els.file.value = "";
    }
  }

  async function importUrl() {
    const id = tenantId();
    if (!id) return ui.toast("Elige un cliente primero", "err");
    const url = (els.urlImport?.value || "").trim();
    if (!url) return ui.toast("Pega una URL (https://…)", "err");
    if (!/^https?:\/\//i.test(url)) return ui.toast("La URL debe empezar por http:// o https://", "err");
    const btn = document.getElementById("btnImportUrl");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Descargando…";
    }
    try {
      const d = await api.importUrl(id, url);
      applyTenantData(await api.getTenant(id));
      document.querySelector('.tab[data-tab="preview"]')?.click();
      ui.toast("Importado: «" + (d.archivo || "web") + "»", "ok");
      if (els.urlImport) els.urlImport.value = "";
      refreshStatus();
    } catch (e) {
      ui.toast(e.message, "err");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Importar URL";
      }
    }
  }

  async function deleteFile(name) {
    if (!confirm("¿Eliminar «" + name + "»?")) return;
    try {
      await api.deleteDocument(tenantId(), name);
      applyTenantData(await api.getTenant(tenantId()));
      ui.toast("Archivo eliminado", "ok");
      refreshStatus();
    } catch (e) {
      ui.toast(e.message, "err");
    }
  }

  function wireTabs() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.onclick = () => {
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".panel-section").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("tab-" + tab.dataset.tab)?.classList.add("active");
      };
    });
  }

  function wireDrop() {
    if (!els.drop || !els.file) return;
    els.drop.onclick = () => els.file.click();
    els.drop.ondragover = (e) => { e.preventDefault(); els.drop.classList.add("drag"); };
    els.drop.ondragleave = () => els.drop.classList.remove("drag");
    els.drop.ondrop = (e) => {
      e.preventDefault();
      els.drop.classList.remove("drag");
      if (e.dataTransfer.files[0]) upload(e.dataTransfer.files[0]);
    };
    els.file.onchange = () => { if (els.file.files[0]) upload(els.file.files[0]); };
  }

  function init() {
    PanelShell.mount({ active: "configurar.html", title: "Documentos" });
    const q = new URLSearchParams(location.search).get("cliente");
    if (q) ClientePanel.setId(q.trim());
    if (els.tenant) els.tenant.value = ClientePanel.getId() || "";
    const linkProbar = document.getElementById("linkProbar");
    if (linkProbar) linkProbar.href = ClientePanel.link("probar.html");

    wireTabs();
    wireDrop();

    els.knowledge?.addEventListener("input", () => {
      setDirty(els.knowledge.value !== savedBase);
      if (els.charBase) els.charBase.textContent = els.knowledge.value.length + " caracteres (base)";
    });

    document.getElementById("btnLoad")?.addEventListener("click", load);
    document.getElementById("btnRefreshPreview")?.addEventListener("click", load);
    document.getElementById("btnSave")?.addEventListener("click", saveBase);
    document.getElementById("btnPub")?.addEventListener("click", publish);
    document.getElementById("btnImportUrl")?.addEventListener("click", importUrl);
    els.urlImport?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        importUrl();
      }
    });

    document.getElementById("btnRebuild")?.addEventListener("click", async () => {
      try {
        await api.rebuildKnowledge(tenantId());
        applyTenantData(await api.getTenant(tenantId()));
        ui.toast("Conocimiento recompilado", "ok");
        refreshStatus();
      } catch (e) {
        ui.toast(e.message, "err");
      }
    });
    document.getElementById("btnPlantilla")?.addEventListener("click", async () => {
      try {
        els.knowledge.value = await (await fetch("plantilla-conocimiento.md")).text();
        setDirty(els.knowledge.value !== savedBase);
        ui.toast("Plantilla cargada", "ok");
      } catch {
        ui.toast("No se pudo cargar la plantilla", "err");
      }
    });

    load();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
