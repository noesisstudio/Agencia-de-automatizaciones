import { api, checkApiHealth, login } from "./api.js";
import { state } from "./state.js";
import { el, showToast } from "./utils.js";

export async function isApiAvailable() {
  return await checkApiHealth();
}

export async function ensureAuth() {
  if (!state.token) return false;
  try {
    const user = await api("/auth/me");
    state.user = user;
    return true;
  } catch (e) {
    console.error("Auth error:", e);
    state.token = "";
    state.user = null;
    return false;
  }
}

export function renderLogin(root, onSuccess) {
  root.innerHTML = "";
  
  const form = el("form", { className: "stack" }, [
    el("div", { className: "stack-field" }, [
      el("label", { text: "Usuario", for: "login-user" }),
      el("input", { type: "text", id: "login-user", name: "username", required: true, autocomplete: "username" })
    ]),
    el("div", { className: "stack-field" }, [
      el("label", { text: "Contraseña", for: "login-pass" }),
      el("input", { type: "password", id: "login-pass", name: "password", required: true, autocomplete: "current-password" })
    ]),
    el("div", { className: "error", id: "login-error", hidden: true }),
    el("button", { type: "submit", className: "btn btn--primary", text: "Iniciar Sesión", id: "login-submit" })
  ]);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("login-error");
    const submitBtn = document.getElementById("login-submit");
    errorEl.hidden = true;
    
    const user = document.getElementById("login-user").value.trim();
    const pass = document.getElementById("login-pass").value;
    
    if (!user || !pass) {
      errorEl.textContent = "Por favor, completa todos los campos.";
      errorEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Iniciando...";

    try {
      await login(user, pass);
      const isAuthed = await ensureAuth();
      if (isAuthed) {
        showToast("Sesión iniciada correctamente", "success");
        if (onSuccess) onSuccess();
      } else {
        throw new Error("No se pudo obtener el perfil de usuario");
      }
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = "Iniciar Sesión";
    }
  });

  const card = el("div", { className: "auth-card" }, [
    el("div", { className: "text-center mb-md" }, [
      el("h1", { className: "logo text-xl", innerHTML: 'Noesis<span class="logo__dot">.</span>' }),
      el("p", { className: "muted", text: "Bienvenido de nuevo" })
    ]),
    form
  ]);

  root.appendChild(card);
}

export function renderApiDown(root) {
  root.innerHTML = "";
  const card = el("div", { className: "auth-card text-center" }, [
    el("div", { className: "mb-md" }, [
      el("svg", { 
        viewBox: "0 0 24 24", 
        fill: "none", 
        stroke: "currentColor", 
        strokeWidth: "2", 
        style: { width: "48px", height: "48px", color: "var(--danger)", margin: "0 auto" },
        innerHTML: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>'
      })
    ]),
    el("h2", { text: "Servidor no disponible", className: "mb-sm" }),
    el("p", { className: "muted mb-md", text: "No se ha podido conectar con el backend. Asegúrate de que está ejecutándose." }),
    el("div", { className: "code-block mb-md text-left" }, [
      el("code", { text: "cd backend && source .venv/bin/activate && python3 run.py" })
    ]),
    el("button", { 
      className: "btn btn--primary", 
      text: "Reintentar conexión",
      onClick: () => location.reload()
    })
  ]);
  root.appendChild(card);
}
