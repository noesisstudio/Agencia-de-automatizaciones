import { api } from "./api.js";
import { el, formatMoney, showToast, escapeHtml, downloadWithAuth } from "./utils.js";

let folders = [];
const batch = []; // { filename, ok, invoiceId, cliente, total, estado, sheetOk, message }

export async function renderUpload(root) {
  batch.length = 0;
  root.innerHTML = `<div class="page-head"><h1>Subir Facturas</h1></div>` +
    `<div class="loading-skeleton"><div class="skeleton-line"></div></div>`;

  try {
    folders = await api("/folders");
    render(root);
  } catch (err) {
    root.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
      <h3>Error de conexión</h3>
      <p class="muted">${escapeHtml(err.message)}</p>
    </div>`;
  }
}

function render(root) {
  root.innerHTML = "";

  const head = el("div", { className: "page-head" }, [el("h1", { text: "Subir Facturas con IA" })]);
  const p = el("p", { className: "muted mb-lg", text: "Sube uno o varios PDF/imágenes. La IA extrae los datos, se guardan como facturas y podrás exportarlas a Excel o a Google Sheets." });

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
    el("div", { className: "upload-zone__icon", innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px;height:48px;color:var(--accent)"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>' }),
    el("div", { className: "upload-zone__title mt-sm", text: "Haz clic o arrastra uno o varios archivos aquí" }),
    el("div", { className: "upload-zone__hint mt-xs", text: "Soporta PDF, JPG, PNG (máx. 15MB por archivo)" }),
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
        batch.push({ filename: file.name, ok: false, estado: "Demasiado grande (>15MB)" });
        renderBatch(resultWrap);
        continue;
      }
      statusWrap.innerHTML = `
        <div class="flex items-center gap-sm p-md">
          <svg class="spin text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:24px;height:24px"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          <span class="font-medium">Procesando ${i + 1} de ${files.length}: ${escapeHtml(file.name)}</span>
        </div>`;

      const fd = new FormData();
      fd.append("file", file);
      if (folderId) fd.append("folder_id", folderId);
      fd.append("save_to_db", "true");
      fd.append("include_template", "false");

      try {
        const data = await api("/invoice/process", { method: "POST", body: fd });
        const ext = data.extracted || {};
        batch.push({
          filename: file.name,
          ok: true,
          invoiceId: data.invoice?.id || null,
          cliente: ext.cliente || ext.emisor || "—",
          numero: ext.numero || (data.invoice?.number ?? "—"),
          total: ext.total != null ? parseFloat(ext.total) : (data.invoice?.total_amount ?? null),
          estado: data.invoice?.id ? "Guardada" : "Procesada",
          sheetOk: !!data.sheets?.ok
        });
      } catch (err) {
        batch.push({ filename: file.name, ok: false, estado: "Error", message: err.message });
      }
      renderBatch(resultWrap);
    }

    dropZone.classList.remove("is-busy");
    statusWrap.innerHTML = "";
    const okCount = batch.filter(b => b.ok).length;
    showToast(`${okCount} de ${batch.length} facturas procesadas`, okCount ? "success" : "error");
  }
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
        ? `<span class="pill pill--ok"><span class="pill__dot"></span>${escapeHtml(b.estado)}${b.sheetOk ? " · Sheets" : ""}</span>`
        : `<span class="pill pill--danger"><span class="pill__dot"></span>${escapeHtml(b.estado)}</span>` }),
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
      el("th", { text: "Cliente" }),
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
  const chevron = el("span", { className: "folder-picker__chevron", innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M6 9l6 6 6-6"/></svg>' });

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
