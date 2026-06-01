import { state } from "./state.js";

const routes = [];
let currentRoot = null;
let hashListenerBound = false;

/** Navigate without relying on duplicate hashchange quirks. */
export function navigateTo(path, query = {}) {
  const qs = new URLSearchParams(query).toString();
  const next = `#/${path.replace(/^\/+/, "")}${qs ? `?${qs}` : ""}`;
  if (location.hash === next) {
    handleRoute();
  } else {
    location.hash = next;
  }
}

export function registerRoute(pathPattern, handler) {
  // Convert basic pattern like "invoices/:id" to regex
  const regexPath = pathPattern.replace(/:([^\/]+)/g, "([^/]+)");
  const regex = new RegExp(`^${regexPath}$`);
  
  routes.push({
    pattern: pathPattern,
    regex,
    handler,
    params: (pathPattern.match(/:[^\/]+/g) || []).map(p => p.slice(1))
  });
}

function updateNavHighlight(path) {
  const baseSection = path.split('/')[0];
  state.section = baseSection || "dashboard";
  
  document.querySelectorAll("[data-nav]").forEach(el => {
    if (el.dataset.nav === baseSection) {
      el.classList.add("is-active");
    } else {
      el.classList.remove("is-active");
    }
  });
}

async function handleRoute() {
  if (!currentRoot) return;
  
  const rawHash = location.hash.slice(1);
  const [pathOnly, queryString] = rawHash.split("?");
  let path = pathOnly;
  if (path.startsWith("/")) path = path.slice(1);
  if (!path) path = "dashboard";
  const queryParams = Object.fromEntries(new URLSearchParams(queryString || "").entries());
  
  updateNavHighlight(path);
  currentRoot.innerHTML = "";

  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.params.forEach((paramName, index) => {
        params[paramName] = match[index + 1];
      });
      
      try {
        await route.handler(currentRoot, { ...params, ...queryParams });
      } catch (err) {
        console.error("Route error:", err);
        currentRoot.innerHTML = `<div class="empty-state">
          <div class="empty-state__icon error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
          <h3>Error en la vista</h3>
          <p class="muted">${err.message || 'Ha ocurrido un error inesperado.'}</p>
        </div>`;
      }
      return;
    }
  }

  // Redirect known non-app paths to dashboard
  if (path === "login" || path === "logout") {
    location.hash = "#/dashboard";
    return;
  }

  // 404 Fallback
  currentRoot.innerHTML = `<div class="empty-state">
    <div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg></div>
    <h3>Página no encontrada</h3>
    <p class="muted">La ruta <code>${escapeHtml(path)}</code> no existe.</p>
    <a href="#/dashboard" class="btn btn--primary mt-md">Volver al Inicio</a>
  </div>`;
}

// Simple escape inline since utils might not be loaded if we hit a hard 404 early
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

export function startRouter(root) {
  currentRoot = root;
  if (!hashListenerBound) {
    window.addEventListener("hashchange", handleRoute);
    hashListenerBound = true;
  }
  handleRoute();
}

export function stopRouter() {
  currentRoot = null;
}

export function resetRoutes() {
  routes.length = 0;
}
