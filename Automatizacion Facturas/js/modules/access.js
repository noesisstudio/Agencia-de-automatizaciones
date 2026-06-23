import { api } from "./api.js";
import { state } from "./state.js";
import { el, showToast, confirmDialog, renderLoading, escapeHtml, formatDate } from "./utils.js";

let accessClients = [];

export async function renderAccess(root) {
  // Solo el admin puede gestionar accesos.
  if (!state.user || state.user.role !== "admin") {
    root.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
      <h3>Acceso restringido</h3>
      <p class="muted">Solo el administrador puede gestionar los accesos de los clientes.</p>
    </div>`;
    return;
  }

  root.innerHTML = `<div class="page-head"><h1>Accesos de clientes</h1></div>` + renderLoading();

  try {
    accessClients = await api("/auth/clients");
    render(root);
  } catch (err) {
    root.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
      <h3>Error al cargar los accesos</h3>
      <p class="muted">${escapeHtml(err.message)}</p>
    </div>`;
  }
}

function render(root) {
  root.innerHTML = "";

  const head = el("div", { className: "page-head" }, [
    el("h1", { text: "Accesos de clientes" }),
    el("button", {
      className: "btn btn--ghost btn--sm",
      innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:14px"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Actualizar',
      onClick: () => renderAccess(root)
    })
  ]);

  const intro = el("p", {
    className: "muted mb-md",
    text: "Clientes que se han registrado en el portal Noesis. Activa el interruptor para darles acceso a FacturAI o desactívalo para revocarlo."
  });

  root.appendChild(head);
  root.appendChild(intro);

  if (accessClients.length === 0) {
    root.appendChild(el("div", { className: "empty-state py-xl", innerHTML: `
      <div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
      <h3>Todavía no hay clientes</h3>
      <p class="muted">Cuando un cliente se registre en el portal Noesis aparecerá aquí para que le des acceso.</p>
    ` }));
    return;
  }

  const grid = el("div", { className: "card-grid", id: "access-grid" });
  accessClients.forEach(c => grid.appendChild(renderCard(c)));
  root.appendChild(grid);
}

function renderCard(c) {
  const initial = (c.email || c.username || "?").charAt(0).toUpperCase();
  const statusPill = c.is_active
    ? `<span class="pill pill--ok"><span class="pill__dot"></span>Con acceso</span>`
    : `<span class="pill pill--muted"><span class="pill__dot"></span>Sin acceso</span>`;

  const toggle = el("label", {
    className: "switch",
    title: c.is_active ? "Quitar acceso" : "Dar acceso"
  }, [
    el("input", {
      type: "checkbox",
      checked: c.is_active,
      onChange: (e) => toggleAccess(c, e.target)
    }),
    el("span", { className: "switch__slider" })
  ]);

  return el("article", { className: "client-card" }, [
    el("div", { className: "flex justify-between items-start mb-sm" }, [
      el("div", { className: "flex items-center gap-sm" }, [
        el("div", { className: "avatar bg-accent text-white font-bold", text: initial })
      ]),
      toggle
    ]),
    el("h3", { className: "m-0 text-md truncate font-head", text: c.email || c.username }),
    el("div", { className: "text-sm muted mb-sm truncate", text: `@${c.username}` }),
    el("div", { className: "mt-md pt-sm border-t flex justify-between items-center text-sm" }, [
      el("div", { innerHTML: statusPill }),
      el("div", { className: "muted", text: c.created_at ? `Alta: ${formatDate(c.created_at)}` : "" })
    ])
  ]);
}

async function toggleAccess(client, checkboxEl) {
  const giving = !client.is_active;
  const action = giving ? "dar acceso a" : "quitar el acceso a";
  const who = client.email || client.username;

  const ok = await confirmDialog(`¿Seguro que quieres ${action} "${who}"?`);
  if (!ok) {
    checkboxEl.checked = client.is_active; // revertir el toggle visual
    return;
  }

  checkboxEl.disabled = true;
  try {
    const res = await api(`/auth/clients/${client.id}/toggle`, { method: "PUT" });
    client.is_active = res.is_active;
    showToast(res.message || "Acceso actualizado", "success");
    // Re-renderizar la tarjeta para reflejar el nuevo estado.
    const oldCard = checkboxEl.closest(".client-card");
    if (oldCard) oldCard.replaceWith(renderCard(client));
  } catch (err) {
    checkboxEl.checked = client.is_active;
    showToast(err.message, "error");
  } finally {
    checkboxEl.disabled = false;
  }
}
