import { ensureAuth, isApiAvailable, renderApiDown, renderLogin } from "./modules/auth.js";
import { registerRoute, startRouter, stopRouter, resetRoutes, navigateTo } from "./modules/router.js";
import { applyTheme, bindThemeToggle } from "./modules/theme.js";
import { login, loginWithSupabase } from "./modules/api.js";
import { renderDashboard } from "./modules/dashboard.js";
import { renderInvoices } from "./modules/invoices.js";
import { renderClients } from "./modules/clients.js";
import { renderExport } from "./modules/exports.js";
import { renderUpload } from "./modules/upload.js";
import { renderSettings } from "./modules/settings.js";
import { state } from "./modules/state.js";
import { showToast } from "./modules/utils.js";

const main = document.getElementById("app-main");
const shell = document.getElementById("app-shell");
const loginRoot = document.getElementById("login-only");
let routerStarted = false;
// uiBound: tracks whether global UI listeners were registered.
// Do NOT reset on logout — nav/search/sidebar elements persist in the DOM.
let uiBound = false;

// Safe initial state: login visible, app hidden.
if (shell) shell.hidden = true;
if (loginRoot) loginRoot.hidden = false;

function showFatal(message) {
  if (shell) shell.hidden = true;
  if (loginRoot) loginRoot.hidden = false;
  if (loginRoot) {
    loginRoot.innerHTML = `
      <div class="auth-card text-center">
        <p class="error mb-md">Error fatal al arrancar la app: ${message}</p>
        <button type="button" class="btn btn--primary" id="fatal-reload">Recargar página</button>
      </div>`;
    document.getElementById("fatal-reload")?.addEventListener("click", () => location.reload());
  } else {
    document.body.innerHTML = `<div style="padding:1rem;font-family:system-ui;color:#b91c1c">Error fatal: ${message}</div>`;
  }
}

function setupRoutes() {
  registerRoute("dashboard", (root) => renderDashboard(root));
  registerRoute("invoices", (root, params) => renderInvoices(root, params));
  registerRoute("clients", (root) => renderClients(root));
  registerRoute("export", (root) => renderExport(root));
  registerRoute("upload", (root) => renderUpload(root));
  registerRoute("settings", (root) => renderSettings(root));
}

async function enterApp() {
  if (!main || !shell || !loginRoot) {
    throw new Error("No se encontraron contenedores base de la app");
  }
  loginRoot.innerHTML = "";
  loginRoot.hidden = true;
  shell.hidden = false;

  const userLabel = document.getElementById("user-label");
  const avatar = document.getElementById("user-avatar");
  if (userLabel && state.user) userLabel.textContent = state.user.username;
  if (avatar && state.user) avatar.textContent = state.user.username.charAt(0).toUpperCase();

  if (!routerStarted) {
    setupRoutes();
    const h = location.hash;
    if (!h || h === "#" || h === "#/" || h.startsWith("#/login")) {
      location.hash = "#/dashboard";
    }
    startRouter(main);
    routerStarted = true;
  }

  if (!uiBound) {
    bindGlobalUi();
    uiBound = true;
  }
}

function bindGlobalUi() {
  const menuBtn = document.getElementById("mobile-menu-btn");
  const sidebar = document.getElementById("sidebar");
  const searchInput = document.getElementById("global-search");

  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", () => sidebar.classList.toggle("is-open"));
    document.addEventListener("click", (e) => {
      if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        sidebar.classList.remove("is-open");
      }
    });
    document.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", (e) => {
        const targetRoute = el.getAttribute("data-nav");
        if (targetRoute) {
          e.preventDefault();
          navigateTo(targetRoute);
        }
        sidebar.classList.remove("is-open");
      });
    });
  }

  if (searchInput) {
    let timer = null;
    const emitSearch = () => {
      const term = searchInput.value.trim();
      window.dispatchEvent(new CustomEvent("facturai:global-search", { detail: term }));
    };
    searchInput.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(emitSearch, 180);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const term = searchInput.value.trim();
        if (!location.hash.startsWith("#/invoices")) {
          navigateTo("invoices", term ? { search: term } : {});
        } else {
          emitSearch();
        }
      }
    });
  }
}

function showLogin() {
  if (shell) shell.hidden = true;
  if (loginRoot) loginRoot.hidden = false;
  renderLogin(loginRoot, enterApp);
}

function handleSessionExpired() {
  if (!shell || shell.hidden) return;
  stopRouter();
  resetRoutes();
  routerStarted = false;
  if (main) main.innerHTML = "";
  showToast("Tu sesión ha expirado. Inicia sesión de nuevo.", "warning");
  showLogin();
}

async function init() {
  if (location.protocol === "file:") {
    location.href = "http://127.0.0.1:8010/pagina.html";
    return;
  }

  if (!main || !shell || !loginRoot) {
    showFatal("Faltan elementos del layout en pagina.html");
    return;
  }

  applyTheme();
  bindThemeToggle();

  window.addEventListener("facturai:session-expired", handleSessionExpired);

  document.getElementById("btn-logout")?.addEventListener("click", () => {
    state.token = "";
    state.user = null;
    stopRouter();
    resetRoutes();
    routerStarted = false;
    // Note: uiBound stays true — DOM listeners on nav/search persist correctly.
    if (main) main.innerHTML = "";
    location.hash = "";
    showLogin();
  });

  const apiOk = await isApiAvailable();
  if (!apiOk) {
    if (shell) shell.hidden = true;
    renderApiDown(loginRoot);
    return;
  }

  // SSO: check for Supabase token in hash fragment (#sso=<token>)
  const ssoMatch = location.hash.match(/^#sso=(.+)$/);
  if (ssoMatch) {
    history.replaceState(null, "", location.pathname);
    try {
      await loginWithSupabase(decodeURIComponent(ssoMatch[1]));
      const ssoAuthed = await ensureAuth();
      if (ssoAuthed) {
        showToast("Sesión iniciada desde el portal Noesis", "success");
        await enterApp();
        return;
      }
    } catch (e) {
      console.error("SSO error:", e);
      showToast("Error al iniciar sesión desde el portal: " + e.message, "error");
    }
  }

  const authed = await ensureAuth();
  if (authed) {
    await enterApp();
  } else {
    showLogin();
  }

  // Safety watchdog: if both app and login ended up hidden, recover.
  setTimeout(() => {
    if (shell && shell.hidden && loginRoot && loginRoot.hidden) {
      showLogin();
    }
  }, 1200);
}

init().catch((e) => {
  console.error("Critical Init Error:", e);
  showFatal(e.message || "Error desconocido al iniciar la aplicación");
});
