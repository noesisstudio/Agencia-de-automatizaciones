import { getApiBase } from "./api.js";
import { state } from "./state.js";

/**
 * Descarga un recurso protegido del backend inyectando el token JWT.
 * Devuelve { html: true } cuando el servidor entregó HTML en vez del binario esperado
 * (p. ej. PDF cuando WeasyPrint no está disponible).
 */
export async function downloadWithAuth(path, fallbackName) {
  const base = await getApiBase();
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${state.token}` }
  });
  if (!res.ok) {
    let msg = `Error en la descarga (${res.status})`;
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch (_) {}
    throw new Error(msg);
  }
  const ct = res.headers.get("Content-Type") || "";
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const name = match ? match[1] : fallbackName;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return { html: ct.includes("html") };
}

export function escapeHtml(unsafe) {
  if (unsafe == null) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatMoney(n) {
  if (n == null || isNaN(n)) return "0,00 €";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR"
  }).format(n);
}

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return escapeHtml(dateStr);
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(d);
}

export function debounce(fn, ms = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function el(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith("on") && typeof value === "function") {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "className") {
      element.className = value;
    } else if (key === "innerHTML") {
      element.innerHTML = value; // Assumes value is already escaped!
    } else if (key === "text") {
      element.textContent = value;
    } else if (key === "style" && typeof value === "object") {
      Object.assign(element.style, value);
    } else if (value !== false && value != null) {
      element.setAttribute(key, value === true ? "" : value);
    }
  }
  children.forEach((child) => {
    if (typeof child === "string" || typeof child === "number") {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });
  return element;
}

export function statusPillClass(status) {
  const s = String(status || "").toLowerCase();
  if (["pagada", "cobrada"].includes(s)) return "pill--ok";
  if (["enviada", "emitida"].includes(s)) return "pill--info";
  if (["vencida"].includes(s)) return "pill--warn";
  if (["anulada", "rechazada"].includes(s)) return "pill--danger";
  return "pill--muted"; // borrador
}

export function statusPill(status) {
  const cls = statusPillClass(status);
  const text = escapeHtml(status || "Borrador");
  return `<span class="pill ${cls}"><span class="pill__dot"></span>${text}</span>`;
}

export function showToast(message, type = "info") {
  const root = document.getElementById("toast-root");
  if (!root) return;

  const icons = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
  };

  const toast = el("div", { className: `toast toast--${type}` }, [
    el("div", { className: "toast__icon", innerHTML: icons[type] || icons.info }),
    el("div", { className: "toast__message", text: message }),
    el("button", {
      className: "toast__close",
      innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
      onClick: () => {
        toast.style.animation = "slideOut 0.3s forwards";
        setTimeout(() => toast.remove(), 300);
      }
    })
  ]);

  root.appendChild(toast);
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.animation = "slideOut 0.3s forwards";
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 300);
    }
  }, 4000);
}

export function openModal({ title, body, footer, size = "md", onClose }) {
  const root = document.getElementById("modal-root");
  if (!root) return null;

  const closeBtn = el("button", {
    className: "btn btn--icon modal__close",
    innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    onClick: handleClose
  });

  const headerEl = el("div", { className: "modal__header" }, [
    el("h2", { text: title }),
    closeBtn
  ]);

  const bodyEl = el("div", { className: "modal__body" });
  if (typeof body === "string") bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);

  const footerEl = el("div", { className: "modal__footer" });
  if (footer) {
    if (typeof footer === "string") footerEl.innerHTML = footer;
    else if (footer instanceof Node) footerEl.appendChild(footer);
  }

  const content = el("div", { className: `modal__content modal--${size}` }, [
    headerEl,
    bodyEl,
    ...(footer ? [footerEl] : [])
  ]);

  const overlay = el("div", {
    className: "modal-overlay",
    onClick: (e) => {
      if (e.target === overlay) handleClose();
    }
  }, [content]);

  function handleClose() {
    overlay.style.animation = "fadeOut 0.2s forwards";
    content.style.animation = "slideDown 0.2s forwards";
    setTimeout(() => {
      overlay.remove();
      if (onClose) onClose();
    }, 200);
    document.removeEventListener("keydown", escapeHandler);
  }

  function escapeHandler(e) {
    if (e.key === "Escape") handleClose();
  }
  document.addEventListener("keydown", escapeHandler);

  root.appendChild(overlay);
  return { overlay, close: handleClose };
}

export function closeModal() {
  const root = document.getElementById("modal-root");
  if (root && root.lastChild) {
    const overlay = root.lastChild;
    const content = overlay.querySelector(".modal__content");
    if (content) content.style.animation = "slideDown 0.2s forwards";
    overlay.style.animation = "fadeOut 0.2s forwards";
    setTimeout(() => overlay.remove(), 200);
  }
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    let m;
    const footer = el("div", { className: "flex gap-sm justify-end" }, [
      el("button", {
        className: "btn btn--ghost",
        text: "Cancelar",
        onClick: () => {
          m.close();
          resolve(false);
        }
      }),
      el("button", {
        className: "btn btn--danger",
        text: "Confirmar",
        onClick: () => {
          m.close();
          resolve(true);
        }
      })
    ]);

    m = openModal({
      title: "Confirmar acción",
      body: el("p", { text: message }),
      footer: footer,
      size: "sm",
      onClose: () => resolve(false)
    });
  });
}

export function renderLoading(lines = 3) {
  return `
    <div class="loading-skeleton">
      ${Array(lines).fill('<div class="skeleton-line"></div>').join("")}
    </div>
  `;
}
