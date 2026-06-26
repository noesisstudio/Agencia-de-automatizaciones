import { api } from "./api.js";
import { state } from "./state.js";
import { el, showToast, confirmDialog, renderLoading, escapeHtml, formatDate, openModal } from "./utils.js";

let accessUsers = [];
let pageRoot = null;

export async function renderAccess(root) {
  pageRoot = root;
  // Solo el admin puede gestionar usuarios y accesos.
  if (!state.user || state.user.role !== "admin") {
    root.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
      <h3>Acceso restringido</h3>
      <p class="muted">Solo el administrador puede gestionar los usuarios.</p>
    </div>`;
    return;
  }

  root.innerHTML = `<div class="page-head"><h1>Usuarios y accesos</h1></div>` + renderLoading();

  try {
    accessUsers = await api("/auth/clients");
    render(root);
  } catch (err) {
    root.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
      <h3>Error al cargar los usuarios</h3>
      <p class="muted">${escapeHtml(err.message)}</p>
    </div>`;
  }
}

function render(root) {
  root.innerHTML = "";

  const head = el("div", { className: "page-head" }, [
    el("h1", { text: "Usuarios y accesos" }),
    el("div", { className: "flex gap-sm" }, [
      el("button", {
        className: "btn btn--ghost btn--sm",
        innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:14px"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Actualizar',
        onClick: () => renderAccess(root)
      }),
      el("button", {
        className: "btn btn--primary btn--sm",
        innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:14px"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg> Crear usuario',
        onClick: () => openCreateUserModal()
      })
    ])
  ]);

  const intro = el("p", {
    className: "muted mb-md",
    text: "Crea usuarios con acceso inmediato (entran con su usuario y contraseña) o activa/desactiva el acceso de quienes se registran en el portal Noesis. Cada usuario solo ve sus propios datos."
  });

  root.appendChild(head);
  root.appendChild(intro);

  if (accessUsers.length === 0) {
    root.appendChild(el("div", { className: "empty-state py-xl", innerHTML: `
      <div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg></div>
      <h3>Todavía no hay usuarios</h3>
      <p class="muted">Pulsa «Crear usuario» para dar de alta a tu primer cliente.</p>
    ` }));
    return;
  }

  const grid = el("div", { className: "card-grid", id: "access-grid" });
  accessUsers.forEach(u => grid.appendChild(renderCard(u)));
  root.appendChild(grid);
}

function renderCard(u) {
  const initial = (u.email || u.username || "?").charAt(0).toUpperCase();
  const isAdmin = u.role === "admin";

  const statusPill = isAdmin
    ? `<span class="pill pill--info"><span class="pill__dot"></span>Administrador</span>`
    : u.is_active
      ? `<span class="pill pill--ok"><span class="pill__dot"></span>Con acceso</span>`
      : `<span class="pill pill--muted"><span class="pill__dot"></span>Sin acceso</span>`;

  const sourcePill = u.is_sso
    ? `<span class="pill pill--muted" title="Se registró en el portal Noesis"><span class="pill__dot"></span>Portal Noesis</span>`
    : `<span class="pill pill--muted" title="Creado por el administrador"><span class="pill__dot"></span>Usuario directo</span>`;

  // El interruptor de acceso no aplica a uno mismo ni a otros administradores.
  let toggle;
  if (u.is_self) {
    toggle = el("span", { className: "pill pill--info", text: "Tú" });
  } else if (isAdmin) {
    toggle = el("span", { className: "muted text-sm", text: "—" });
  } else {
    toggle = el("label", {
      className: "switch",
      title: u.is_active ? "Quitar acceso" : "Dar acceso"
    }, [
      el("input", {
        type: "checkbox",
        checked: u.is_active,
        onChange: (e) => toggleAccess(u, e.target)
      }),
      el("span", { className: "switch__slider" })
    ]);
  }

  // Acciones (no para uno mismo ni para otros administradores).
  const actions = [];
  if (!u.is_self && !isAdmin) {
    if (!u.is_sso) {
      actions.push(el("button", {
        className: "btn btn--ghost btn--sm",
        text: "Contraseña",
        title: "Restablecer contraseña",
        onClick: () => openResetPasswordModal(u)
      }));
    }
    actions.push(el("button", {
      className: "btn btn--ghost btn--sm text-danger",
      text: "Eliminar",
      onClick: () => deleteUser(u)
    }));
  }

  return el("article", { className: "client-card" }, [
    el("div", { className: "flex justify-between items-start mb-sm" }, [
      el("div", { className: "flex items-center gap-sm" }, [
        el("div", { className: "avatar bg-accent text-white font-bold", text: initial })
      ]),
      toggle
    ]),
    el("h3", { className: "m-0 text-md truncate font-head", text: u.email || u.username }),
    el("div", { className: "text-sm muted mb-sm truncate", text: `@${u.username}` }),
    el("div", { className: "flex gap-xs flex-wrap mb-sm", innerHTML: `${statusPill} ${sourcePill}` }),
    el("div", { className: "mt-md pt-sm border-t flex justify-between items-center text-sm" }, [
      el("div", { className: "muted", text: u.created_at ? `Alta: ${formatDate(u.created_at)}` : "" }),
      el("div", { className: "flex gap-xs" }, actions)
    ])
  ]);
}

function openCreateUserModal() {
  const form = el("form", { className: "stack", id: "create-user-form" }, [
    el("div", { className: "stack-field" }, [
      el("label", { text: "Usuario", for: "cu-username" }),
      el("input", { type: "text", id: "cu-username", required: true, minlength: "3", maxlength: "80", placeholder: "p. ej. cliente_acme", autocomplete: "off" }),
      el("small", { className: "muted", text: "Con esto y la contraseña iniciará sesión (sin @)." })
    ]),
    el("div", { className: "stack-field" }, [
      el("label", { text: "Email (opcional)", for: "cu-email" }),
      el("input", { type: "email", id: "cu-email", placeholder: "cliente@empresa.com", autocomplete: "off" })
    ]),
    el("div", { className: "stack-field" }, [
      el("label", { text: "Contraseña", for: "cu-password" }),
      el("input", { type: "text", id: "cu-password", required: true, minlength: "6", placeholder: "Mínimo 6 caracteres", autocomplete: "off" }),
      el("small", { className: "muted", text: "Anótala y compártela con el cliente; podrá cambiarla luego." })
    ]),
    el("div", { className: "error", id: "cu-error", hidden: true })
  ]);

  const submitBtn = el("button", { type: "submit", className: "btn btn--primary", text: "Crear usuario", form: "create-user-form" });
  const footer = el("div", { className: "flex gap-sm justify-end" }, [
    el("button", { type: "button", className: "btn btn--ghost", text: "Cancelar", onClick: () => modal.close() }),
    submitBtn
  ]);

  const modal = openModal({ title: "Crear usuario", body: form, footer, size: "sm" });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("cu-error");
    errorEl.hidden = true;
    const username = document.getElementById("cu-username").value.trim();
    const email = document.getElementById("cu-email").value.trim();
    const password = document.getElementById("cu-password").value;

    if (username.length < 3) { errorEl.textContent = "El usuario debe tener al menos 3 caracteres."; errorEl.hidden = false; return; }
    if (password.length < 6) { errorEl.textContent = "La contraseña debe tener al menos 6 caracteres."; errorEl.hidden = false; return; }
    if (username.includes("@")) { errorEl.textContent = "El usuario no puede contener @ (eso es un email)."; errorEl.hidden = false; return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creando...";
    try {
      await api("/auth/clients", { method: "POST", body: { username, email: email || null, password, role: "user" } });
      modal.close();
      showToast(`Usuario "${username}" creado. Ya puede iniciar sesión.`, "success");
      renderAccess(pageRoot);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Crear usuario";
    }
  });
}

function openResetPasswordModal(user) {
  const form = el("form", { className: "stack", id: "reset-pw-form" }, [
    el("p", { className: "muted", text: `Nueva contraseña para "${user.username}".` }),
    el("div", { className: "stack-field" }, [
      el("label", { text: "Nueva contraseña", for: "rp-password" }),
      el("input", { type: "text", id: "rp-password", required: true, minlength: "6", placeholder: "Mínimo 6 caracteres", autocomplete: "off" })
    ]),
    el("div", { className: "error", id: "rp-error", hidden: true })
  ]);

  const submitBtn = el("button", { type: "submit", className: "btn btn--primary", text: "Guardar", form: "reset-pw-form" });
  const footer = el("div", { className: "flex gap-sm justify-end" }, [
    el("button", { type: "button", className: "btn btn--ghost", text: "Cancelar", onClick: () => modal.close() }),
    submitBtn
  ]);

  const modal = openModal({ title: "Restablecer contraseña", body: form, footer, size: "sm" });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("rp-error");
    errorEl.hidden = true;
    const password = document.getElementById("rp-password").value;
    if (password.length < 6) { errorEl.textContent = "La contraseña debe tener al menos 6 caracteres."; errorEl.hidden = false; return; }

    submitBtn.disabled = true;
    submitBtn.textContent = "Guardando...";
    try {
      await api(`/auth/clients/${user.id}/password`, { method: "PUT", body: { new_password: password } });
      modal.close();
      showToast(`Contraseña de "${user.username}" actualizada.`, "success");
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Guardar";
    }
  });
}

async function toggleAccess(user, checkboxEl) {
  const giving = !user.is_active;
  const action = giving ? "dar acceso a" : "quitar el acceso a";
  const who = user.email || user.username;

  const ok = await confirmDialog(`¿Seguro que quieres ${action} "${who}"?`);
  if (!ok) {
    checkboxEl.checked = user.is_active; // revertir el toggle visual
    return;
  }

  checkboxEl.disabled = true;
  try {
    const res = await api(`/auth/clients/${user.id}/toggle`, { method: "PUT" });
    user.is_active = res.is_active;
    showToast(res.message || "Acceso actualizado", "success");
    const oldCard = checkboxEl.closest(".client-card");
    if (oldCard) oldCard.replaceWith(renderCard(user));
  } catch (err) {
    checkboxEl.checked = user.is_active;
    showToast(err.message, "error");
  } finally {
    checkboxEl.disabled = false;
  }
}

async function deleteUser(user) {
  const who = user.email || user.username;
  const ok = await confirmDialog(`¿Eliminar a "${who}" y sus datos sin facturas? Esta acción no se puede deshacer.`);
  if (!ok) return;
  try {
    const res = await api(`/auth/clients/${user.id}`, { method: "DELETE" });
    showToast(res.message || "Usuario eliminado", "success");
    renderAccess(pageRoot);
  } catch (err) {
    showToast(err.message, "error");
  }
}
