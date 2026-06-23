import { api } from "./api.js";
import { el, formatMoney, showToast, openModal, confirmDialog, renderLoading, escapeHtml, downloadWithAuth } from "./utils.js";

let clients = [];
let folders = [];
const selected = new Set();

export async function renderClients(root) {
  root.innerHTML = `<div class="page-head"><h1>Clientes</h1></div>` + renderLoading();

  try {
    await loadClientsData();
    render(root);
  } catch (err) {
    root.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
      <h3>Error al cargar clientes</h3>
      <p class="muted">${escapeHtml(err.message)}</p>
    </div>`;
  }
}

async function loadClientsData() {
  const [c, f] = await Promise.all([
    api("/clients?limit=200"),
    api("/folders")
  ]);
  clients = c;
  folders = f;
}

function render(root) {
  root.innerHTML = "";

  const head = el("div", { className: "page-head" }, [
    el("h1", { text: "Clientes" }),
    el("button", { 
      className: "btn btn--primary", 
      innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs"><path d="M12 5v14M5 12h14"/></svg> Nuevo cliente',
      onClick: () => openClientModal()
    })
  ]);

  const searchInput = el("input", {
    type: "search", 
    placeholder: "Buscar cliente por nombre o NIF...", 
    className: "w-full px-md py-sm",
    style: { maxWidth: "400px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)" },
    onInput: (e) => filterClients(e.target.value.toLowerCase())
  });

  // Barra de selección para descargar facturas de varios clientes.
  const toolbar = el("div", { className: "toolbar flex gap-sm items-center flex-wrap my-md", id: "clients-toolbar" }, [
    el("label", { className: "flex items-center gap-xs text-sm", style: { cursor: "pointer" } }, [
      el("input", { type: "checkbox", id: "clients-select-all", style: { width: "auto" }, onChange: (e) => toggleSelectAll(e.target.checked) }),
      el("span", { text: "Seleccionar todos" })
    ]),
    el("span", { className: "muted text-sm", id: "clients-selected-count", text: "" }),
    el("div", { className: "flex-1" }),
    el("button", {
      className: "btn btn--primary btn--sm",
      id: "clients-download-selected",
      disabled: true,
      innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:14px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Descargar facturas seleccionadas',
      onClick: (e) => downloadSelected(e.currentTarget)
    })
  ]);

  const grid = el("div", { className: "card-grid", id: "clients-grid" });

  root.appendChild(head);
  root.appendChild(searchInput);
  root.appendChild(toolbar);
  root.appendChild(grid);
  
  renderGrid(clients);
  updateSelectionUI();
}

function renderGrid(list) {
  const grid = document.getElementById("clients-grid");
  if (!grid) return;
  grid.innerHTML = "";

  if (list.length === 0) {
    grid.style.display = "block";
    grid.innerHTML = `<div class="empty-state py-xl">
      <div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
      <h3>No hay clientes</h3>
      <p class="muted">Aún no has registrado ningún cliente o la búsqueda no arrojó resultados.</p>
    </div>`;
    return;
  }
  
  grid.style.display = "grid";

  list.forEach(c => {
    const initial = (c.name || "?").charAt(0).toUpperCase();
    const colors = ["bg-accent", "bg-success", "bg-warning", "bg-info", "bg-danger"];
    const colorClass = colors[c.id % colors.length] || "bg-accent";

    const checkbox = el("input", {
      type: "checkbox",
      style: { width: "auto" },
      checked: selected.has(c.id),
      title: "Seleccionar para descargar facturas",
      onChange: (e) => { toggleSelect(c.id, e.target.checked); }
    });

    const card = el("article", { className: "client-card relative group" }, [
      el("div", { className: "flex justify-between items-start mb-sm" }, [
        el("div", { className: "flex items-center gap-sm" }, [
          checkbox,
          el("div", { className: `avatar ${colorClass} text-white font-bold`, text: initial })
        ]),
        el("div", { className: "flex gap-xs" }, [
          el("button", {
            className: "btn btn--icon btn--sm",
            innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
            title: "Descargar sus facturas (Excel)",
            disabled: !c.invoice_count,
            onClick: (e) => { e.stopPropagation(); downloadClientInvoices(c, e.currentTarget); }
          }),
          el("button", { 
            className: "btn btn--icon btn--sm", 
            innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
            title: "Editar",
            onClick: (e) => { e.stopPropagation(); openClientModal(c); }
          }),
          el("button", { 
            className: "btn btn--icon btn--sm text-danger", 
            innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>',
            title: "Eliminar",
            onClick: (e) => { e.stopPropagation(); deleteClient(c.id, c.name); }
          })
        ])
      ]),
      el("h3", { className: "m-0 text-md truncate font-head", text: c.name }),
      el("div", { className: "text-sm muted mb-sm font-mono truncate", text: c.nif_masked || "Sin NIF" }),
      c.email ? el("div", { className: "text-sm truncate mb-xs flex items-center gap-xs", innerHTML: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="M22 6l-10 7L2 6"/></svg> ${escapeHtml(c.email)}` }) : "",
      el("div", { className: "mt-md pt-sm border-t flex justify-between text-sm" }, [
        el("div", { innerHTML: `<span class="muted">Facturas:</span> <strong>${c.invoice_count}</strong>` }),
        el("div", { innerHTML: `<span class="muted">Total:</span> <strong>${formatMoney(c.total_billed)}</strong>` })
      ])
    ]);
    grid.appendChild(card);
  });
}

function filterClients(query) {
  if (!query) {
    renderGrid(clients);
    return;
  }
  const filtered = clients.filter(c => 
    (c.name || "").toLowerCase().includes(query) || 
    (c.nif_masked || "").toLowerCase().includes(query) ||
    (c.email || "").toLowerCase().includes(query)
  );
  renderGrid(filtered);
}

function openClientModal(client = null) {
  const isEdit = !!client;
  
  const form = el("form", { className: "stack" }, [
    el("div", { className: "stack-field" }, [
      el("label", { text: "Nombre o Razón Social *" }),
      el("input", { name: "name", type: "text", required: true, value: client?.name || "" })
    ]),
    el("div", { className: "grid-2 gap-md" }, [
      el("div", { className: "stack-field" }, [
        el("label", { text: "NIF / CIF" }),
        el("input", { name: "nif", type: "text", value: client?.nif_masked || "", placeholder: isEdit ? "(Oculto, escribe para cambiar)" : "" })
      ]),
      el("div", { className: "stack-field" }, [
        el("label", { text: "Teléfono" }),
        el("input", { name: "phone", type: "tel", value: client?.phone || "" })
      ])
    ]),
    el("div", { className: "stack-field" }, [
      el("label", { text: "Email" }),
      el("input", { name: "email", type: "email", value: client?.email || "" })
    ]),
    el("div", { className: "stack-field" }, [
      el("label", { text: "Dirección postal" }),
      el("textarea", { name: "address", rows: 2, text: client?.address || "" })
    ]),
    el("div", { className: "stack-field" }, [
      el("label", { text: "Carpeta predeterminada" }),
      el("select", { name: "folder_id" }, [
        el("option", { value: "", text: "-- Ninguna --" }),
        ...folders.map(f => el("option", { 
          value: String(f.id), 
          text: f.name,
          selected: client?.folder_id === f.id
        }))
      ])
    ])
  ]);

  let m;
  const footer = el("div", { className: "flex justify-end gap-sm w-full" }, [
    el("button", { type: "button", className: "btn btn--ghost", text: "Cancelar", onClick: () => m.close() }),
    el("button", { 
      type: "button", 
      className: "btn btn--primary", 
      text: "Guardar cliente",
      onClick: async (e) => {
        if (!form.reportValidity()) return;
        const btn = e.target;
        btn.disabled = true;
        btn.textContent = "Guardando...";
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        if (data.folder_id) data.folder_id = parseInt(data.folder_id, 10);
        else data.folder_id = null;
        if (!data.nif || (isEdit && data.nif === client.nif_masked)) delete data.nif;

        try {
          if (isEdit) {
            await api(`/clients/${client.id}`, { method: "PUT", body: data });
            showToast("Cliente actualizado", "success");
          } else {
            await api("/clients", { method: "POST", body: data });
            showToast("Cliente creado", "success");
          }
          await loadClientsData();
          m.close();
          renderGrid(clients);
        } catch (err) {
          showToast(err.message, "error");
          btn.disabled = false;
          btn.textContent = "Guardar cliente";
        }
      }
    })
  ]);

  m = openModal({
    title: isEdit ? "Editar Cliente" : "Nuevo Cliente",
    body: form,
    footer: footer
  });
}

function toggleSelect(id, checked) {
  if (checked) selected.add(id);
  else selected.delete(id);
  updateSelectionUI();
}

function toggleSelectAll(checked) {
  selected.clear();
  if (checked) clients.forEach(c => selected.add(c.id));
  renderGrid(clients);
  updateSelectionUI();
}

function updateSelectionUI() {
  const count = selected.size;
  const countEl = document.getElementById("clients-selected-count");
  const btn = document.getElementById("clients-download-selected");
  const all = document.getElementById("clients-select-all");
  if (countEl) countEl.textContent = count ? `${count} seleccionado${count > 1 ? "s" : ""}` : "";
  if (btn) btn.disabled = count === 0;
  if (all) all.checked = clients.length > 0 && count === clients.length;
}

async function downloadSelected(btn) {
  if (selected.size === 0) return;
  const q = [...selected].map(id => `client_id=${id}`).join("&");
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.textContent = "Generando...";
  try {
    await downloadWithAuth(`/export/invoices/excel?${q}`, "facturas_clientes.xlsx");
    showToast("Excel descargado", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}

async function downloadClientInvoices(client, btn) {
  if (!client.invoice_count) {
    showToast("Este cliente no tiene facturas", "warning");
    return;
  }
  btn.disabled = true;
  try {
    await downloadWithAuth(`/export/invoices/excel?client_id=${client.id}`, `facturas_${(client.name || "cliente").replace(/\s+/g, "_")}.xlsx`);
    showToast("Excel descargado", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
  }
}

async function deleteClient(id, name) {
  const ok = await confirmDialog(`¿Estás seguro de que deseas eliminar al cliente "${name}"? Esta acción no se puede deshacer.`);
  if (!ok) return;

  try {
    await api(`/clients/${id}`, { method: "DELETE" });
    await loadClientsData();
    renderGrid(clients);
    showToast("Cliente eliminado", "success");
  } catch (err) {
    // El cliente tiene facturas: la ley fiscal impide borrarlas, pero el RGPD
    // permite anonimizar sus datos de contacto. Lo ofrecemos.
    if (/anonimiza/i.test(err.message)) {
      const anon = await confirmDialog(
        `No se puede borrar "${name}" porque tiene facturas (obligación fiscal). ` +
        `¿Quieres anonimizar sus datos de contacto (email, teléfono y dirección) ` +
        `cumpliendo el RGPD? Se conservan nombre y NIF para la contabilidad.`
      );
      if (!anon) return;
      try {
        const res = await api(`/clients/${id}/anonymize`, { method: "POST" });
        await loadClientsData();
        renderGrid(clients);
        showToast(res.message || "Cliente anonimizado", "success");
      } catch (e2) {
        showToast(e2.message, "error");
      }
      return;
    }
    showToast(err.message, "error");
  }
}
