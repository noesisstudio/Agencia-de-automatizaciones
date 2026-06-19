import { api, resolveApiBase } from "./api.js";
import { el, formatMoney, showToast, escapeHtml, openModal, downloadWithAuth } from "./utils.js";

let folders = [];
const batch = [];

export async function renderUpload(root) {
  batch.length = 0;
  root.innerHTML = `<div class="page-head"><h1>Contabilizar Facturas</h1></div>` +
    `<div class="loading-skeleton"><div class="skeleton-line"></div></div>`;

  try {
    const base = await resolveApiBase();
    const [foldersRes, healthRes] = await Promise.all([
      api("/folders"),
      base ? fetch(`${base}/health`).then(r => r.json()).catch(() => ({})) : Promise.resolve({})
    ]);
    folders = foldersRes;
    render(root, healthRes);
  } catch (err) {
    root.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
      <h3>Error de conexión</h3>
      <p class="muted">${escapeHtml(err.message)}</p>
    </div>`;
  }
}

function render(root, health = {}) {
  root.innerHTML = "";

  const head = el("div", { className: "page-head" }, [el("h1", { text: "Contabilizar Facturas Recibidas" })]);
  const p = el("p", {
    className: "muted mb-lg",
    text: "Sube el PDF o imagen de una factura recibida. La IA extrae los datos y tú los revisas antes de guardar."
  });

  // Banner de advertencia cuando Anthropic no está configurado
  const warnings = [];
  if (health.anthropic_configured === false) {
    warnings.push(el("div", {
      className: "alert-card alert-card--warn",
      style: { marginBottom: "1rem", borderRadius: "var(--radius-sm)" }
    }, [
      el("span", { innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>' }),
      el("div", {}, [
        el("strong", { text: "Clave de IA no configurada — la extracción automática no funcionará." }),
        el("br"),
        el("span", { text: 'Abre el archivo ' }),
        el("code", { text: "Automatizacion Facturas/backend/.env" }),
        el("span", { text: " y pon tu clave real: " }),
        el("code", { text: "ANTHROPIC_API_KEY=sk-ant-..." }),
        el("span", { text: " Luego reinicia el backend." })
      ])
    ]));
  }

  // Aviso de IA (obligatorio por AI Act)
  const aiNotice = el("div", {
    className: "alert-card",
    style: { marginBottom: "1rem", borderRadius: "var(--radius-sm)", fontSize: ".82rem", opacity: ".8" }
  }, [
    el("span", { text: "Este servicio utiliza inteligencia artificial (Claude de Anthropic) para extraer datos de tus facturas. Los datos se envían a Anthropic para su procesamiento y los resultados son siempre revisados por ti antes de guardarse." })
  ]);
  warnings.push(aiNotice);

  const panel = el("div", { className: "upload-panel panel" });
  const folderPicker = createFolderPicker(folders);
  const form = el("form", { className: "stack", id: "upload-form" }, [
    el("div", { className: "stack-field" }, [
      el("label", { text: "Carpeta de destino (opcional)" }),
      folderPicker.element
    ])
  ]);

  const fileInput = el("input", {
    type: "file",
    accept: "application/pdf,image/jpeg,image/png,image/webp",
    multiple: true,
    hidden: true,
    onChange: (e) => handleFiles(e.target.files)
  });

  const dropZone = el("label", { className: "upload-zone mt-md", id: "drop-zone" }, [
    el("div", {
      className: "upload-zone__icon",
      innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px;height:48px;color:var(--accent)"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>'
    }),
    el("div", { className: "upload-zone__title mt-sm", text: "Haz clic o arrastra facturas aquí" }),
    el("div", {
      className: "upload-zone__hint mt-xs",
      text: "PDF, JPG, PNG — máx. 15 MB · La IA extrae los datos y tú los confirmas antes de guardar"
    }),
    fileInput
  ]);

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
    dropZone.addEventListener(ev, (e) => { e.preventDefault(); e.stopPropagation(); }, false);
  });
  dropZone.addEventListener('dragenter', () => dropZone.classList.add('is-drag'));
  dropZone.addEventListener('dragover', () => dropZone.classList.add('is-drag'));
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-drag'));
  dropZone.addEventListener('drop', (e) => {
    dropZone.classList.remove('is-drag');
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  });

  panel.appendChild(form);
  panel.appendChild(dropZone);

  const statusWrap = el("div", { id: "upload-status-wrap", className: "mt-md" });
  const resultWrap = el("div", { id: "upload-result-wrap", className: "mt-md" });

  root.appendChild(head);
  root.appendChild(p);
  warnings.forEach(w => root.appendChild(w));
  root.appendChild(panel);
  root.appendChild(statusWrap);
  root.appendChild(resultWrap);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;
    const folderId = folderPicker.getValue();
    dropZone.classList.add("is-busy");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.size > 15 * 1024 * 1024) {
        batch.push({ filename: file.name, ok: false, estado: "Demasiado grande (>15 MB)" });
        renderBatch(resultWrap);
        continue;
      }

      setStatus(statusWrap, `Analizando ${i + 1} de ${files.length}: ${file.name}…`);

      const fd = new FormData();
      fd.append("file", file);
      if (folderId) fd.append("folder_id", folderId);
      fd.append("save_to_db", "false");
      fd.append("include_template", "false");

      let extracted;
      try {
        const data = await api("/invoice/process", { method: "POST", body: fd });
        extracted = data.extracted || {};
      } catch (err) {
        batch.push({ filename: file.name, ok: false, estado: "Error al extraer", message: err.message });
        renderBatch(resultWrap);
        setStatus(statusWrap, "");
        continue;
      }

      setStatus(statusWrap, "");

      const { confirmed, corrected } = await showReviewModal(file.name, extracted, i + 1, files.length);

      if (!confirmed) {
        batch.push({ filename: file.name, ok: false, estado: "Descartada" });
        renderBatch(resultWrap);
        continue;
      }

      setStatus(statusWrap, `Guardando ${file.name}…`);

      try {
        const saved = await api("/invoice/save-extracted", {
          method: "POST",
          body: {
            extracted: corrected,
            folder_id: folderId ? parseInt(folderId) : null,
            filename: file.name
          }
        });

        batch.push({
          filename: file.name,
          ok: true,
          invoiceId: saved.id,
          cliente: corrected.emisor || corrected.cliente || "—",
          numero: saved.number || corrected.numero || "—",
          total: saved.total_amount,
          estado: "Guardada"
        });
      } catch (err) {
        batch.push({ filename: file.name, ok: false, estado: "Error al guardar", message: err.message });
      }

      renderBatch(resultWrap);
      setStatus(statusWrap, "");
    }

    dropZone.classList.remove("is-busy");
    setStatus(statusWrap, "");
    const okCount = batch.filter(b => b.ok).length;
    showToast(
      `${okCount} de ${batch.length} factura${batch.length !== 1 ? "s" : ""} guardada${okCount !== 1 ? "s" : ""}`,
      okCount ? "success" : "warning"
    );
  }
}

function setStatus(wrap, text) {
  if (!text) { wrap.innerHTML = ""; return; }
  wrap.innerHTML = `
    <div class="flex items-center gap-sm p-md">
      <svg class="spin text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
      <span class="font-medium">${escapeHtml(text)}</span>
    </div>`;
}

function showReviewModal(filename, extracted, current, total) {
  return new Promise((resolve) => {
    const confianza = Number(extracted.confianza ?? 0);
    const confBg = confianza >= 85 ? "var(--success-bg)" : confianza >= 60 ? "var(--warning-bg)" : "var(--danger-bg)";
    const confColor = confianza >= 85 ? "var(--success)" : confianza >= 60 ? "#92400e" : "var(--danger)";
    const confLabel = confianza >= 85
      ? "Alta — los datos parecen correctos"
      : confianza >= 60
      ? "Media — revisa los campos antes de guardar"
      : "Baja — revisa todos los datos con atención";
    const confIcon = confianza >= 85
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;flex-shrink:0"><path d="M20 6L9 17l-5-5"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>';

    const mkInput = (type, val, extra = {}) => {
      const inp = el("input", { type, ...extra });
      inp.value = val ?? "";
      return inp;
    };
    const mkTextarea = (val) => {
      const ta = el("textarea");
      ta.value = val ?? "";
      return ta;
    };

    const emisorIn   = mkInput("text",   extracted.emisor);
    const nifIn      = mkInput("text",   extracted.nif_emisor);
    const numIn      = mkInput("text",   extracted.numero);
    const fechaIn    = mkInput("text",   extracted.fecha);
    const baseIn     = mkInput("number", extracted.base_imponible, { step: "0.01" });
    const ivaRateIn  = mkInput("number", extracted.porcentaje_iva ?? 21, { step: "0.1", min: "0", max: "100" });
    const ivaCuotaIn = mkInput("number", extracted.cuota_iva, { step: "0.01" });
    const totalIn    = mkInput("number", extracted.total, { step: "0.01" });
    const conceptoIn = mkTextarea(extracted.concepto);

    const sf = (label, inp) => el("div", { className: "stack-field" }, [el("label", { text: label }), inp]);

    const confBanner = el("div", {
      className: "alert-card",
      style: { background: confBg, color: confColor, marginBottom: "1rem" }
    }, [
      el("span", { innerHTML: confIcon }),
      el("span", { innerHTML: `Confianza de extracción: <strong>${confianza}%</strong> — ${confLabel}` })
    ]);

    const formBody = el("div", { className: "stack" }, [
      confBanner,
      el("div", { className: "grid-2" }, [
        sf("Emisor / Proveedor", emisorIn),
        sf("NIF Emisor", nifIn),
        sf("Nº Factura", numIn),
        sf("Fecha (DD/MM/AAAA)", fechaIn),
        sf("Base imponible (€)", baseIn),
        sf("% IVA", ivaRateIn),
        sf("Cuota IVA (€)", ivaCuotaIn),
        sf("Total factura (€)", totalIn)
      ]),
      sf("Concepto / descripción", conceptoIn)
    ]);

    const btnDiscard = el("button", { className: "btn btn--ghost", text: "Descartar" });
    const btnSave    = el("button", { className: "btn btn--primary", text: "Guardar factura" });

    btnDiscard.addEventListener("click", () => { modal.close(); resolve({ confirmed: false }); });
    btnSave.addEventListener("click", () => {
      const corrected = {
        ...extracted,
        emisor:          emisorIn.value.trim(),
        nif_emisor:      nifIn.value.trim(),
        numero:          numIn.value.trim(),
        fecha:           fechaIn.value.trim(),
        base_imponible:  baseIn.value,
        porcentaje_iva:  ivaRateIn.value,
        cuota_iva:       ivaCuotaIn.value,
        total:           totalIn.value,
        concepto:        conceptoIn.value.trim()
      };
      modal.close();
      resolve({ confirmed: true, corrected });
    });

    const footer = el("div", { className: "flex gap-sm justify-end" }, [btnDiscard, btnSave]);

    const titleText = total > 1
      ? `Revisar extracción (${current}/${total})`
      : `Revisar: ${filename}`;

    const modal = openModal({
      title: titleText,
      body: formBody,
      footer,
      size: "lg",
      onClose: () => resolve({ confirmed: false })
    });
  });
}

function renderBatch(wrap) {
  wrap.innerHTML = "";
  if (!batch.length) return;

  const okItems = batch.filter(b => b.ok && b.invoiceId);
  const ids = okItems.map(b => b.invoiceId);

  const head = el("div", { className: "flex justify-between items-center mb-md flex-wrap gap-sm" }, [
    el("h3", { className: "m-0 text-lg", text: `Documentos procesados (${batch.length})` }),
    el("div", { className: "flex gap-sm flex-wrap" }, [
      ids.length ? el("button", {
        className: "btn btn--primary btn--sm",
        innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:14px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Descargar Excel de esta tanda',
        onClick: async (e) => {
          const q = ids.map(id => `invoice_id=${id}`).join("&");
          const btn = e.currentTarget;
          btn.disabled = true;
          try {
            await downloadWithAuth(`/export/invoices/excel?${q}`, "facturas_subidas.xlsx");
            showToast("Excel descargado", "success");
          } catch (err) {
            showToast(err.message, "error");
          } finally {
            btn.disabled = false;
          }
        }
      }) : "",
      ids.length ? el("a", { className: "btn btn--secondary btn--sm", href: "#/invoices", text: "Ver todas las facturas" }) : ""
    ])
  ]);

  const tbody = el("tbody");
  batch.forEach(b => {
    tbody.appendChild(el("tr", {}, [
      el("td", { className: "truncate", style: { maxWidth: "240px" }, text: b.filename }),
      el("td", { text: b.cliente || "—" }),
      el("td", { className: "font-mono text-sm", text: b.numero || "—" }),
      el("td", { className: "text-right font-mono", text: b.total != null ? formatMoney(b.total) : "—" }),
      el("td", { className: "text-center", innerHTML: b.ok
        ? `<span class="pill pill--ok"><span class="pill__dot"></span>${escapeHtml(b.estado)}</span>`
        : `<span class="pill pill--${b.estado === "Descartada" ? "muted" : "danger"}"><span class="pill__dot"></span>${escapeHtml(b.estado)}</span>`
      }),
      el("td", { className: "actions" }, [
        b.invoiceId ? el("a", {
          className: "btn btn--icon btn--sm",
          href: `#/invoices?id=${b.invoiceId}`,
          title: "Ver factura",
          innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>'
        }) : ""
      ])
    ]));
  });

  const table = el("table", { className: "data-table" }, [
    el("thead", {}, [el("tr", {}, [
      el("th", { text: "Archivo" }),
      el("th", { text: "Emisor" }),
      el("th", { text: "Nº" }),
      el("th", { className: "text-right", text: "Total" }),
      el("th", { className: "text-center", text: "Estado" }),
      el("th", { text: "" })
    ])]),
    tbody
  ]);

  const card = el("div", { className: "panel slide-up" }, [head, el("div", { className: "table-wrap" }, [table])]);
  wrap.appendChild(card);
}

function createFolderPicker(folderList) {
  let selectedValue = "";
  const valueEl = el("span", { className: "folder-picker__value", text: "-- Sin carpeta --" });
  const chevron = el("span", {
    className: "folder-picker__chevron",
    innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M6 9l6 6 6-6"/></svg>'
  });

  const trigger = el("button", {
    type: "button",
    className: "folder-picker__trigger",
    onClick: (e) => {
      e.stopPropagation();
      menu.classList.toggle("hidden");
      trigger.classList.toggle("is-open", !menu.classList.contains("hidden"));
    }
  }, [valueEl, chevron]);

  const options = [
    { id: "", name: "-- Sin carpeta --" },
    ...folderList.map((f) => ({ id: String(f.id), name: f.name }))
  ];

  const menu = el("div", { className: "folder-picker__menu hidden" },
    options.map((opt) =>
      el("button", {
        type: "button",
        className: `folder-picker__option ${opt.id === selectedValue ? "is-selected" : ""}`,
        text: opt.name,
        onClick: () => {
          selectedValue = opt.id;
          valueEl.textContent = opt.name;
          menu.classList.add("hidden");
          trigger.classList.remove("is-open");
          menu.querySelectorAll(".folder-picker__option").forEach((btn) => btn.classList.remove("is-selected"));
          const idx = options.findIndex((o) => o.id === opt.id);
          if (idx >= 0 && menu.children[idx]) menu.children[idx].classList.add("is-selected");
        }
      })
    )
  );

  const root = el("div", { className: "folder-picker" }, [trigger, menu]);
  document.addEventListener("click", (ev) => {
    if (!root.contains(ev.target)) {
      menu.classList.add("hidden");
      trigger.classList.remove("is-open");
    }
  });

  return { element: root, getValue: () => selectedValue };
}
