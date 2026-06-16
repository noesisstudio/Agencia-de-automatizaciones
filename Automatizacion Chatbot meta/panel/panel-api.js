/**
 * Cliente HTTP único del panel.
 */
function resolveApiBase() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("api");
  if (fromQuery) return fromQuery.replace(/\/$/, "");

  const { protocol, hostname, port, origin } = window.location;

  if (protocol === "file:" || !origin || origin === "null") {
    return "http://127.0.0.1:8000";
  }

  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    return origin.replace(/\/$/, "");
  }

  if (port && port !== "8000") {
    return "http://127.0.0.1:8000";
  }

  return origin.replace(/\/$/, "");
}

class OpenixAPI {
  constructor(baseUrl) {
    this.base = (baseUrl || resolveApiBase()).replace(/\/$/, "");
  }

  _defaultHeaders() {
    const h = {};
    const host = window.location.hostname || "";
    if (host.includes("ngrok")) {
      h["ngrok-skip-browser-warning"] = "1";
    }
    return h;
  }

  async request(path, options = {}) {
    const url = path.startsWith("http") ? path : `${this.base}${path}`;
    const headers = { ...this._defaultHeaders(), ...(options.headers || {}) };
    let body = options.body;
    if (body && typeof body === "object" && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }
    let response;
    try {
      response = await fetch(url, { ...options, headers, body });
    } catch {
      const hint =
        window.location.protocol === "file:"
          ? "Abre el panel en http://127.0.0.1:8000/panel/ (no como archivo local)."
          : `¿Está uvicorn en marcha? Prueba: ${this.base}/health`;
      throw new Error(`No se pudo conectar con la API (${this.base}). ${hint}`);
    }
    let data = null;
    const ct = response.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    }
    if (!response.ok) {
      const detail =
        typeof data?.detail === "string"
          ? data.detail
          : Array.isArray(data?.detail)
            ? data.detail.map((d) => d.msg || JSON.stringify(d)).join(", ")
            : `Error ${response.status}`;
      throw new Error(detail);
    }
    return data;
  }

  listTenants() {
    return this.request("/bot/tenants");
  }

  getTenant(id) {
    return this.request(`/bot/tenants/${encodeURIComponent(id)}`);
  }

  createTenant(payload) {
    return this.request("/bot/tenants", { method: "POST", body: payload });
  }

  updateTenant(id, payload) {
    return this.request(`/bot/tenants/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: payload,
    });
  }

  deleteTenant(id) {
    return this.request(`/bot/tenants/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  setupStatus(tenantId) {
    const q = tenantId ? `?tenant_id=${encodeURIComponent(tenantId)}` : "";
    return this.request(`/bot/setup/status${q}`);
  }

  diagnostico(tenantId) {
    return this.request(`/bot/tenants/${encodeURIComponent(tenantId)}/diagnostico`);
  }

  saveKnowledge(id, texto, nombre) {
    return this.request(`/bot/tenants/${encodeURIComponent(id)}/knowledge`, {
      method: "PUT",
      body: { texto, nombre },
    });
  }

  publish(id, nombre) {
    return this.request(`/bot/tenants/${encodeURIComponent(id)}/publicar`, {
      method: "POST",
      body: { nombre },
    });
  }

  chat(id, mensaje, sessionId) {
    return this.request(`/bot/tenants/${encodeURIComponent(id)}/chat`, {
      method: "POST",
      body: { mensaje, session_id: sessionId },
    });
  }

  uploadDocument(id, file) {
    const fd = new FormData();
    fd.append("archivo", file);
    return this.request(`/bot/tenants/${encodeURIComponent(id)}/documentos`, {
      method: "POST",
      body: fd,
    });
  }

  importUrl(id, url) {
    return this.request(`/bot/tenants/${encodeURIComponent(id)}/documentos/url`, {
      method: "POST",
      body: { url },
    });
  }

  deleteDocument(id, nombre) {
    return this.request(
      `/bot/tenants/${encodeURIComponent(id)}/documentos/${encodeURIComponent(nombre)}`,
      { method: "DELETE" }
    );
  }

  rebuildKnowledge(id) {
    return this.request(`/bot/tenants/${encodeURIComponent(id)}/knowledge/rebuild`, {
      method: "POST",
    });
  }

  whatsappHealth() {
    return this.request("/whatsapp/health");
  }

  whatsappSendTest(payload) {
    return this.request("/whatsapp/send-test", { method: "POST", body: payload });
  }
}

window.OpenixAPI = new OpenixAPI();
