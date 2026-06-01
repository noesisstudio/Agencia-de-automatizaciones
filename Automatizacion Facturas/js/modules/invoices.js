import { api } from "./api.js";
import { el, formatMoney, formatDate, statusPill, showToast, openModal, confirmDialog, renderLoading, escapeHtml, downloadWithAuth } from "./utils.js";

let currentPage = 1;
let currentFilters = { status: "", limit: 20, search: "" };
let currentInvoices = [];
let clients = [];
let folders = [];
let companySettings = null;

export async function renderInvoices(root, params = {}) {
  // Extract id from query string if available (#/invoices?id=123)
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || "");
  const id = params.id || urlParams.get("id");

  if (id) {
    return await renderInvoiceDetail(root, id);
  }

  root.innerHTML = `<div class="page-head"><h1>Facturas</h1></div>` + renderLoading();

  try {
    const baseFilters = {
      ...currentFilters,
      search: (params.search || currentFilters.search || "").trim()
    };
    const [invData, cData, fData, settings] = await Promise.all([
      fetchInvoices(1, baseFilters),
      api("/clients").catch(() => []),
      api("/folders").catch(() => []),
      api("/dashboard/settings").catch(() => ({}))
    ]);
    clients = cData;
    folders = fData;
    companySettings = settings;
    renderList(root, invData);
  } catch (err) {
    root.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
      <h3>Error al cargar facturas</h3>
      <p class="muted">${escapeHtml(err.message)}</p>
    </div>`;
  }
}

async function fetchInvoices(page, filters) {
  currentPage = page;
  currentFilters = filters;
  const q = new URLSearchParams({ page, limit: filters.limit });
  if (filters.status) q.append("status", filters.status);
  if (filters.client_id) q.append("client_id", filters.client_id);
  if (filters.search) q.append("search", filters.search);
  
  const data = await api(`/invoices?${q.toString()}`);
  currentInvoices = data.items || [];
  return data;
}

function renderList(root, data) {
  root.innerHTML = "";

  const head = el("div", { className: "page-head" }, [
    el("h1", { text: "Facturas" }),
    el("button", { 
      className: "btn btn--primary", 
      innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs"><path d="M12 5v14M5 12h14"/></svg> Nueva factura',
      onClick: () => openInvoiceModal()
    })
  ]);

  const toolbar = el("div", { className: "toolbar flex gap-md mb-md flex-wrap items-center" }, [
    el("div", { className: "flex gap-sm items-center" }, [
      el("label", { text: "Estado:", className: "text-sm font-medium" }),
      el("select", { 
        className: "bg-surface",
        value: currentFilters.status || "",
        onchange: async (e) => {
          const newData = await fetchInvoices(1, { ...currentFilters, status: e.target.value });
          updateTable(newData);
        }
      }, [
        el("option", { value: "", text: "Todos", selected: !currentFilters.status }),
        el("option", { value: "borrador", text: "Borrador", selected: currentFilters.status === "borrador" }),
        el("option", { value: "enviada", text: "Enviada", selected: currentFilters.status === "enviada" }),
        el("option", { value: "pagada", text: "Pagada", selected: currentFilters.status === "pagada" }),
        el("option", { value: "vencida", text: "Vencida", selected: currentFilters.status === "vencida" }),
        el("option", { value: "anulada", text: "Anulada", selected: currentFilters.status === "anulada" })
      ])
    ]),
    el("div", { className: "flex-1" }), // Spacer
    el("input", {
      type: "search",
      placeholder: "Buscar por numero o cliente...",
      value: currentFilters.search || "",
      oninput: async (e) => {
        const newData = await fetchInvoices(1, { ...currentFilters, search: e.target.value.trim() });
        updateTable(newData);
      }
    }),
    el("div", { className: "flex gap-sm" }, [
      el("button", {
        className: "btn btn--secondary btn--sm",
        innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:14px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> CSV',
        onClick: () => downloadExport(exportQuery("/export/invoices/csv"), "facturas.csv")
      }),
      el("button", {
        className: "btn btn--primary btn--sm",
        innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:14px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Excel',
        onClick: () => downloadExport(exportQuery("/export/invoices/excel"), "facturas.xlsx")
      })
    ])
  ]);

  const tableWrap = el("div", { className: "table-wrap", id: "invoices-table-wrap" });

  const pagination = el("div", { className: "flex justify-between items-center mt-md text-sm", id: "invoices-pagination" });

  root.appendChild(head);
  root.appendChild(toolbar);
  root.appendChild(tableWrap);
  root.appendChild(pagination);
  bindGlobalSearch();

  updateTable(data);
}

function bindGlobalSearch() {
  if (window.__facturaiInvoiceSearchBound) return;
  window.__facturaiInvoiceSearchBound = true;
  window.addEventListener("facturai:global-search", async (ev) => {
    const term = (ev.detail || "").trim();
    if (!location.hash.startsWith("#/invoices")) return;
    const newData = await fetchInvoices(1, { ...currentFilters, search: term });
    updateTable(newData);
  });
}

function updateTable(data) {
  const wrap = document.getElementById("invoices-table-wrap");
  const pag = document.getElementById("invoices-pagination");
  if (!wrap || !pag) return;

  if (data.items.length === 0) {
    wrap.innerHTML = `<div class="empty-state py-xl">
      <div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></div>
      <h3>No hay facturas</h3>
      <p class="muted">Crea una nueva factura o sube un PDF con IA.</p>
    </div>`;
    pag.innerHTML = "";
    return;
  }

  const tbody = el("tbody");
  data.items.forEach(inv => {
    const tr = el("tr", { className: "cursor-pointer", onClick: (e) => {
      // Prevent navigation if clicking actions
      if (e.target.closest('.actions')) return;
      location.hash = `#/invoices?id=${inv.id}`;
    }}, [
      el("td", { className: "font-mono font-medium", text: inv.number }),
      el("td", { className: "font-medium", text: inv.client_name || "Sin cliente" }),
      el("td", { className: "text-sm", text: formatDate(inv.issue_date) }),
      el("td", { className: "text-right font-mono", text: formatMoney(inv.total_amount) }),
      el("td", { className: "text-center", innerHTML: statusPill(inv.status) }),
      el("td", { className: "actions" }, [
        el("button", { 
          title: "Ver detalles",
          className: "btn btn--icon btn--sm",
          innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
          onClick: (e) => { e.stopPropagation(); location.hash = `#/invoices?id=${inv.id}`; }
        }),
        el("button", { 
          title: "Descargar PDF",
          className: "btn btn--icon btn--sm",
          innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
          onClick: (e) => { e.stopPropagation(); downloadPdf(inv.id, inv.number); }
        }),
        el("button", { 
          title: "Duplicar",
          className: "btn btn--icon btn--sm",
          innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>',
          onClick: async (e) => {
            e.stopPropagation();
            try {
              const dup = await api(`/invoices/${inv.id}/duplicate`, { method: "POST" });
              showToast(`Factura duplicada: ${dup.number}`, "success");
              const newData = await fetchInvoices(1, currentFilters);
              updateTable(newData);
            } catch (err) { showToast(err.message, "error"); }
          }
        }),
        inv.status === "borrador" ? el("button", { 
          title: "Eliminar",
          className: "btn btn--icon btn--sm text-danger",
          innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
          onClick: async (e) => {
            e.stopPropagation();
            const ok = await confirmDialog(`¿Eliminar borrador ${inv.number}?`);
            if (ok) {
              try {
                await api(`/invoices/${inv.id}`, { method: "DELETE" });
                showToast("Borrador eliminado", "success");
                const newData = await fetchInvoices(currentPage, currentFilters);
                updateTable(newData);
              } catch (err) { showToast(err.message, "error"); }
            }
          }
        }) : ""
      ])
    ]);
    tbody.appendChild(tr);
  });

  const table = el("table", { className: "data-table" }, [
    el("thead", {}, [
      el("tr", {}, [
        el("th", { text: "Número" }),
        el("th", { text: "Cliente" }),
        el("th", { text: "Fecha" }),
        el("th", { className: "text-right", text: "Total" }),
        el("th", { className: "text-center", text: "Estado" }),
        el("th", { text: "Acciones" })
      ])
    ]),
    tbody
  ]);

  wrap.innerHTML = "";
  wrap.appendChild(table);

  // Pagination
  const totalPages = Math.ceil(data.total / data.limit);
  pag.innerHTML = "";
  pag.appendChild(el("span", { className: "muted", text: `Mostrando ${data.items.length} de ${data.total} facturas` }));
  
  if (totalPages > 1) {
    const btns = el("div", { className: "flex gap-xs" }, [
      el("button", { 
        className: "btn btn--secondary btn--sm", 
        text: "Anterior", 
        disabled: currentPage === 1,
        onClick: async () => {
          const newData = await fetchInvoices(currentPage - 1, currentFilters);
          updateTable(newData);
        }
      }),
      el("span", { className: "px-sm py-xs font-medium", text: `Página ${currentPage} de ${totalPages}` }),
      el("button", { 
        className: "btn btn--secondary btn--sm", 
        text: "Siguiente", 
        disabled: currentPage === totalPages,
        onClick: async () => {
          const newData = await fetchInvoices(currentPage + 1, currentFilters);
          updateTable(newData);
        }
      })
    ]);
    pag.appendChild(btns);
  }
}

async function renderInvoiceDetail(root, id) {
  root.innerHTML = renderLoading(10);
  try {
    const [inv, cData, fData, settings] = await Promise.all([
      api(`/invoices/${id}`),
      api("/clients").catch(() => []),
      api("/folders").catch(() => []),
      api("/dashboard/settings").catch(() => ({}))
    ]);
    clients = cData;
    folders = fData;
    companySettings = settings;
    
    root.innerHTML = "";
    
    // Header
    const head = el("div", { className: "flex justify-between items-start mb-lg border-b pb-md" }, [
      el("div", {}, [
        el("button", { 
          className: "btn btn--ghost btn--sm mb-sm", 
          innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:14px"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Volver',
          onClick: () => location.hash = "#/invoices"
        }),
        el("h1", { className: "m-0 flex items-center gap-sm", innerHTML: `${escapeHtml(inv.number)} ${statusPill(inv.status)}` })
      ]),
      el("div", { className: "flex gap-sm" }, [
        inv.status === "borrador" ? el("button", {
          className: "btn btn--secondary",
          innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:14px"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar',
          onClick: () => openInvoiceModal(inv)
        }) : "",
        el("button", {
          className: "btn btn--secondary",
          innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:14px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> PDF',
          onClick: () => downloadPdf(inv.id, inv.number)
        }),
        inv.status !== "anulada" ? el("button", {
          className: "btn btn--secondary",
          innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:14px"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar',
          onClick: async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            const original = btn.innerHTML;
            btn.textContent = "Enviando...";
            try {
              const res = await api(`/invoices/${inv.id}/send`, { method: "POST" });
              if (res.email?.ok) {
                showToast("Factura enviada por email", "success");
              } else {
                showToast(res.email?.message || "No se pudo enviar el email (revisa SMTP y el email del cliente)", "warning");
              }
              renderInvoiceDetail(root, id);
            } catch (err) {
              showToast(err.message, "error");
              btn.disabled = false;
              btn.innerHTML = original;
            }
          }
        }) : "",
        (() => {
          let outsideClickBound = false;
          const menu = el("div", { className: "status-dropdown__menu hidden" },
            ["borrador", "enviada", "pagada", "vencida", "anulada"].filter(s => s !== inv.status).map(s =>
              el("button", {
                text: s,
                onClick: async () => {
                  menu.classList.add("hidden");
                  try {
                    await api(`/invoices/${inv.id}/status`, { method: "PATCH", body: { status: s } });
                    showToast("Estado actualizado", "success");
                    renderInvoiceDetail(root, id);
                  } catch (err) { showToast(err.message, "error"); }
                }
              })
            )
          );
          const toggleBtn = el("button", {
            className: "btn btn--primary",
            innerHTML: 'Cambiar Estado <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="ml-xs" style="width:14px"><path d="M6 9l6 6 6-6"/></svg>',
            onClick: (e) => {
              e.stopPropagation();
              menu.classList.toggle("hidden");
              if (!outsideClickBound) {
                document.addEventListener("click", () => menu.classList.add("hidden"));
                outsideClickBound = true;
              }
            }
          });
          return el("div", { className: "status-dropdown" }, [toggleBtn, menu]);
        })()
      ])
    ]);

    // Top Info Grid
    const infoGrid = el("div", { className: "grid-2 gap-lg mb-lg" }, [
      // Cliente Info — InvoiceResponse only provides client_name & client_id
      el("div", { className: "panel" }, [
        el("h3", { className: "text-sm muted uppercase tracking-wide mb-sm", text: "Facturar a" }),
        el("p", { className: "font-medium text-lg m-0", text: inv.client_name || "Sin cliente asignado" }),
        inv.client_id ? el("a", {
          className: "text-sm text-accent",
          href: `#/clients`,
          text: `Ver ficha del cliente`
        }) : ""
      ]),
      // Fechas
      el("div", { className: "panel flex flex-col justify-center gap-md" }, [
        el("div", { className: "flex justify-between border-b pb-sm" }, [
          el("span", { className: "muted", text: "Fecha Emisión:" }),
          el("strong", { text: formatDate(inv.issue_date) || "-" })
        ]),
        el("div", { className: "flex justify-between" }, [
          el("span", { className: "muted", text: "Fecha Vencimiento:" }),
          el("strong", { text: formatDate(inv.due_date) || "-" })
        ])
      ])
    ]);

    // Lines Table
    const tbody = el("tbody");
    (inv.lines || []).forEach(line => {
      tbody.appendChild(el("tr", {}, [
        el("td", { text: line.description || "-" }),
        el("td", { className: "text-right", text: line.quantity }),
        el("td", { className: "text-right", text: formatMoney(line.unit_price) }),
        el("td", { className: "text-right", text: `${line.iva_rate}%` }),
        el("td", { className: "text-right font-medium", text: formatMoney(line.quantity * line.unit_price * (1 + line.iva_rate/100)) })
      ]));
    });

    const linesPanel = el("div", { className: "panel p-0 mb-lg overflow-hidden" }, [
      el("table", { className: "data-table w-full m-0 border-0" }, [
        el("thead", {}, [
          el("tr", {}, [
            el("th", { text: "Descripción" }),
            el("th", { className: "text-right", text: "Cantidad" }),
            el("th", { className: "text-right", text: "Precio Unit." }),
            el("th", { className: "text-right", text: "IVA" }),
            el("th", { className: "text-right", text: "Total" })
          ])
        ]),
        tbody
      ])
    ]);

    // Totals Grid
    const totalsGrid = el("div", { className: "grid-2 gap-lg" }, [
      // Notes
      el("div", { className: "stack gap-md" }, [
        inv.notes ? el("div", { className: "panel bg-transparent border-dashed" }, [
          el("h4", { className: "text-sm muted mb-xs", text: "Notas" }),
          el("p", { className: "text-sm m-0", text: inv.notes })
        ]) : "",
        inv.payment_terms ? el("div", { className: "panel bg-transparent border-dashed" }, [
          el("h4", { className: "text-sm muted mb-xs", text: "Términos de pago" }),
          el("p", { className: "text-sm m-0", text: inv.payment_terms })
        ]) : ""
      ]),
      // Sums
      el("div", { className: "panel stack gap-sm text-right" }, [
        el("div", { className: "flex justify-between" }, [el("span", { className: "muted", text: "Base Imponible:" }), el("span", { text: formatMoney(inv.base_amount) })]),
        el("div", { className: "flex justify-between" }, [el("span", { className: "muted", text: "Total IVA:" }), el("span", { text: formatMoney(inv.iva_amount) })]),
        inv.irpf_amount > 0 ? el("div", { className: "flex justify-between" }, [el("span", { className: "muted", text: "Retención IRPF:" }), el("span", { className: "text-danger", text: `-${formatMoney(inv.irpf_amount)}` })]) : "",
        el("div", { className: "flex justify-between text-lg font-bold border-t pt-sm mt-sm" }, [el("span", { text: "Total:" }), el("span", { text: formatMoney(inv.total_amount) })])
      ])
    ]);

    root.appendChild(head);
    root.appendChild(infoGrid);
    root.appendChild(linesPanel);
    root.appendChild(totalsGrid);

  } catch (err) {
    root.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
      <h3>Factura no encontrada</h3>
      <p class="muted">${escapeHtml(err.message)}</p>
      <a href="#/invoices" class="btn btn--primary mt-md">Volver a facturas</a>
    </div>`;
  }
}

function exportQuery(path) {
  const q = new URLSearchParams();
  if (currentFilters.status) q.append("status", currentFilters.status);
  if (currentFilters.search) q.append("search", currentFilters.search);
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

async function downloadExport(path, filename) {
  try {
    await downloadWithAuth(path, filename);
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function downloadPdf(id, number) {
  try {
    showToast("Generando documento...", "info");
    const { html } = await downloadWithAuth(`/invoices/${id}/pdf`, `${number}.pdf`);
    if (html) {
      showToast("Descargado como HTML (WeasyPrint no disponible en este servidor)", "warning");
    }
  } catch (err) {
    showToast(err.message, "error");
  }
}

// ---- Modal Creation Logic ----

function openInvoiceModal(inv = null) {
  const isEdit = !!inv;
  
  // Default values
  const defIva = companySettings?.default_iva_rate ?? 21;
  const defIrpf = companySettings?.default_irpf_rate ?? 0;
  
  const form = el("form", { className: "stack invoice-form" });
  
  // 1. Header Grid
  const headerGrid = el("div", { className: "grid-2 gap-md" }, [
    el("div", { className: "stack-field" }, [
      el("label", { text: "Cliente *" }),
      el("select", { name: "client_id", required: true }, [
        el("option", { value: "", text: "-- Seleccionar Cliente --" }),
        ...clients.map(c => el("option", { value: String(c.id), text: c.name, selected: inv?.client_id === c.id }))
      ])
    ]),
    el("div", { className: "stack-field" }, [
      el("label", { text: "Carpeta" }),
      el("select", { name: "folder_id" }, [
        el("option", { value: "", text: "-- Opcional --" }),
        ...folders.map(f => el("option", { value: String(f.id), text: f.name, selected: inv?.folder_id === f.id }))
      ])
    ])
  ]);

  const datesGrid = el("div", { className: "grid-3 flex gap-md mt-md" }, [
    el("div", { className: "stack-field flex-1" }, [
      el("label", { text: "Fecha Emisión" }),
      el("input", { name: "issue_date", type: "date", value: inv?.issue_date || new Date().toISOString().split('T')[0], required: true })
    ]),
    el("div", { className: "stack-field flex-1" }, [
      el("label", { text: "Fecha Vencimiento" }),
      el("input", { name: "due_date", type: "date", value: inv?.due_date || "" })
    ]),
    el("div", { className: "stack-field flex-1" }, [
      el("label", { text: "% IRPF Global" }),
      el("input", { name: "irpf_rate", type: "number", step: "0.1", value: inv?.irpf_rate ?? defIrpf, id: "modal-irpf" })
    ])
  ]);

  // 2. Lines Section
  const linesContainer = el("div", { className: "stack gap-sm mt-lg border p-md rounded-md bg-primary" }, [
    el("h4", { className: "m-0 mb-xs", text: "Conceptos" })
  ]);
  
  const linesWrapper = el("div", { className: "stack gap-sm", id: "lines-wrapper" });
  
  function addLineRow(line = null) {
    const row = el("div", { className: "flex gap-sm items-end line-row" }, [
      el("div", { className: "flex-1 stack-field m-0" }, [
        !linesWrapper.children.length ? el("label", { text: "Descripción", className: "text-xs" }) : "",
        el("input", { type: "text", name: "l_desc", placeholder: "Concepto", required: true, value: line?.description || "" })
      ]),
      el("div", { className: "stack-field m-0", style: { width: "80px" } }, [
        !linesWrapper.children.length ? el("label", { text: "Cant.", className: "text-xs" }) : "",
        el("input", { type: "number", name: "l_qty", step: "0.01", required: true, value: line?.quantity || 1, onInput: calcTotals })
      ]),
      el("div", { className: "stack-field m-0", style: { width: "100px" } }, [
        !linesWrapper.children.length ? el("label", { text: "Precio", className: "text-xs" }) : "",
        el("input", { type: "number", name: "l_price", step: "0.01", required: true, value: line?.unit_price || 0, onInput: calcTotals })
      ]),
      el("div", { className: "stack-field m-0", style: { width: "80px" } }, [
        !linesWrapper.children.length ? el("label", { text: "IVA %", className: "text-xs" }) : "",
        el("select", { name: "l_iva", onchange: calcTotals }, [
          el("option", { value: "21", text: "21%", selected: (line?.iva_rate ?? defIva) == 21 }),
          el("option", { value: "10", text: "10%", selected: (line?.iva_rate ?? defIva) == 10 }),
          el("option", { value: "4", text: "4%", selected: (line?.iva_rate ?? defIva) == 4 }),
          el("option", { value: "0", text: "0%", selected: (line?.iva_rate ?? defIva) == 0 })
        ])
      ]),
      el("button", { 
        type: "button", 
        className: "btn btn--icon text-danger", 
        innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px"><path d="M18 6L6 18M6 6l12 12"/></svg>',
        onClick: () => { row.remove(); calcTotals(); }
      })
    ]);
    linesWrapper.appendChild(row);
    calcTotals();
  }

  linesContainer.appendChild(linesWrapper);
  linesContainer.appendChild(el("button", { 
    type: "button", 
    className: "btn btn--ghost btn--sm mt-xs self-start", 
    innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:14px"><path d="M12 5v14M5 12h14"/></svg> Añadir línea',
    onClick: () => addLineRow()
  }));

  // Populate initial lines
  if (inv && inv.lines?.length) {
    inv.lines.forEach(l => addLineRow(l));
  } else {
    addLineRow();
  }

  // Totals Display
  const totalsDiv = el("div", { className: "text-right mt-md p-md bg-surface border rounded-md font-medium font-mono text-sm" }, [
    el("div", { id: "modal-subtotal", text: "Base: 0,00 €" }),
    el("div", { id: "modal-iva", text: "IVA: 0,00 €" }),
    el("div", { id: "modal-irpf-display", className: "text-danger", text: "IRPF: 0,00 €", hidden: true }),
    el("div", { id: "modal-total", className: "text-lg font-bold mt-xs pt-xs border-t", text: "Total: 0,00 €" })
  ]);

  function calcTotals() {
    let base = 0, iva = 0;
    const rows = linesWrapper.querySelectorAll('.line-row');
    rows.forEach(r => {
      const q = parseFloat(r.querySelector('[name="l_qty"]').value) || 0;
      const p = parseFloat(r.querySelector('[name="l_price"]').value) || 0;
      const i = parseFloat(r.querySelector('[name="l_iva"]').value) || 0;
      const b = q * p;
      base += b;
      iva += b * (i / 100);
    });
    
    const irpfInput = form.querySelector('[name="irpf_rate"]');
    const irpfRate = irpfInput ? (parseFloat(irpfInput.value) || 0) : 0;
    const irpf = base * (irpfRate / 100);
    const total = base + iva - irpf;

    const elSub = document.getElementById("modal-subtotal");
    const elIva = document.getElementById("modal-iva");
    const elIrpfDiv = document.getElementById("modal-irpf-display");
    const elTotal = document.getElementById("modal-total");

    if (elSub) elSub.textContent = `Base: ${formatMoney(base)}`;
    if (elIva) elIva.textContent = `IVA: ${formatMoney(iva)}`;
    if (elIrpfDiv) {
      if (irpf > 0) {
        elIrpfDiv.hidden = false;
        elIrpfDiv.textContent = `IRPF: -${formatMoney(irpf)}`;
      } else {
        elIrpfDiv.hidden = true;
      }
    }
    if (elTotal) elTotal.textContent = `Total: ${formatMoney(total)}`;
  }

  // 3. Notes
  const notesGrid = el("div", { className: "grid-2 gap-md mt-md" }, [
    el("div", { className: "stack-field" }, [
      el("label", { text: "Notas" }),
      el("textarea", { name: "notes", rows: 2, text: inv?.notes || "" })
    ]),
    el("div", { className: "stack-field" }, [
      el("label", { text: "Términos de pago" }),
      el("textarea", { name: "payment_terms", rows: 2, text: inv?.payment_terms || "" })
    ])
  ]);

  form.appendChild(headerGrid);
  form.appendChild(datesGrid);
  form.appendChild(linesContainer);
  form.appendChild(totalsDiv);
  form.appendChild(notesGrid);

  // Recalc on IRPF change — use the form reference, not getElementById
  const irpfFieldEl = form.querySelector('[name="irpf_rate"]');
  if (irpfFieldEl) irpfFieldEl.addEventListener("input", calcTotals);

  let m;
  const footer = el("div", { className: "flex justify-end gap-sm w-full" }, [
    el("button", { type: "button", className: "btn btn--ghost", text: "Cancelar", onClick: () => m.close() }),
    el("button", { 
      type: "button", 
      className: "btn btn--primary", 
      text: "Guardar Factura",
      onClick: async (e) => {
        if (!form.reportValidity()) return;
        
        const rows = linesWrapper.querySelectorAll('.line-row');
        if (rows.length === 0) {
          showToast("Añade al menos un concepto a la factura", "warning");
          return;
        }

        const btn = e.target;
        btn.disabled = true;
        btn.textContent = "Guardando...";

        const fd = new FormData(form);
        const data = Object.fromEntries(fd.entries());
        
        // Build payload
        const payload = {
          client_id: parseInt(data.client_id, 10),
          folder_id: data.folder_id ? parseInt(data.folder_id, 10) : null,
          issue_date: data.issue_date,
          due_date: data.due_date || null,
          irpf_rate: parseFloat(data.irpf_rate) || 0,
          notes: data.notes,
          payment_terms: data.payment_terms,
          lines: []
        };

        rows.forEach(r => {
          payload.lines.push({
            description: r.querySelector('[name="l_desc"]').value,
            quantity: parseFloat(r.querySelector('[name="l_qty"]').value) || 1,
            unit_price: parseFloat(r.querySelector('[name="l_price"]').value) || 0,
            iva_rate: parseFloat(r.querySelector('[name="l_iva"]').value) || 21
          });
        });

        try {
          if (isEdit) {
            await api(`/invoices/${inv.id}`, { method: "PUT", body: payload });
            showToast("Factura actualizada", "success");
            m.close();
            // Refetch details
            const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || "");
            if (urlParams.get("id")) renderInvoiceDetail(document.getElementById("app-main"), inv.id);
            else fetchInvoices(currentPage, currentFilters).then(d => updateTable(d));
          } else {
            const created = await api("/invoices", { method: "POST", body: payload });
            showToast(`Factura ${created.number} creada`, "success");
            m.close();
            // Redirect to detail
            location.hash = `#/invoices?id=${created.id}`;
          }
        } catch (err) {
          showToast(err.message, "error");
          btn.disabled = false;
          btn.textContent = "Guardar Factura";
        }
      }
    })
  ]);

  m = openModal({
    title: isEdit ? `Editar Factura (${inv.number})` : "Nueva Factura",
    body: form,
    footer: footer,
    size: "lg"
  });
}
