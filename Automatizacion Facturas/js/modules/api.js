import { state } from "./state.js";

let _apiBase = null;

export function formatApiError(data, fallback = "Error desconocido") {
  if (typeof data === "string") return data;
  if (data?.detail) {
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  }
  if (data?.message) return data.message;
  return fallback;
}

export async function resolveApiBase() {
  if (_apiBase) return _apiBase;

  const candidates = [
    window.FACTURAS_API_URL,
    location.origin,
    "http://127.0.0.1:8010",
    "http://localhost:8010"
  ].filter(Boolean);

  for (const base of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${base}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        _apiBase = base;
        return base;
      }
    } catch (e) {
      // Ignorar e intentar el siguiente
    }
  }
  return null;
}

export async function getApiBase() {
  const base = await resolveApiBase();
  if (!base) throw new Error("API no disponible. Comprueba que el backend está corriendo.");
  return base;
}

export async function checkApiHealth() {
  const base = await resolveApiBase();
  return !!base;
}

export async function api(path, options = {}) {
  const base = await getApiBase();
  const headers = new Headers(options.headers || {});
  
  if (state.token) {
    headers.set("Authorization", `Bearer ${state.token}`);
  }

  if (!(options.body instanceof FormData)) {
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }
    if (options.body && typeof options.body === "object") {
      options.body = JSON.stringify(options.body);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
  try {
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (res.status === 401) {
      state.token = "";
      state.user = null;
      window.dispatchEvent(new CustomEvent("facturai:session-expired"));
      throw new Error("Sesión expirada");
    }

    if (res.status === 204) {
      return null;
    }

    let data;
    try {
      data = await res.json();
    } catch {
      if (!res.ok) throw new Error(`Error HTTP: ${res.status}`);
      return null;
    }

    if (!res.ok) {
      throw new Error(formatApiError(data, `Error: ${res.status}`));
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("Tiempo de espera agotado");
    }
    throw error;
  }
}

export async function login(username, password) {
  const base = await getApiBase();
  const body = new URLSearchParams();
  body.append("username", username);
  body.append("password", password);

  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(formatApiError(data, "Usuario o contraseña incorrectos"));
  }

  state.token = data.access_token;
  return data;
}
