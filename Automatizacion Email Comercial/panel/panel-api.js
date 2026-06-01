/**
 * Cliente HTTP del panel Email Comercial (puerto 8020).
 */
function resolveApiBase() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("api");
  if (fromQuery) return fromQuery.replace(/\/$/, "");

  const { protocol, hostname, port, origin } = window.location;

  if (protocol === "file:" || !origin || origin === "null") {
    return "http://127.0.0.1:8020";
  }

  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    return origin.replace(/\/$/, "");
  }

  if (port && port !== "8020") {
    return "http://127.0.0.1:8020";
  }

  return origin.replace(/\/$/, "");
}

class EmailComercialAPI {
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
          ? "Abre el panel en http://127.0.0.1:8020/panel/ (no como archivo local)."
          : `¿Está la API en marcha? Prueba: ${this.base}/health`;
      throw new Error(`No se pudo conectar con la API (${this.base}). ${hint}`);
    }
    let data = null;
    const ct = response.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      data = await response.json();
    } else if (!response.ok) {
      data = { detail: await response.text() };
    }
    if (!response.ok) {
      const detail =
        (data && (data.detail || data.solucion || data.message)) ||
        `Error HTTP ${response.status}`;
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    return data;
  }

  async health() {
    return this.request("/health");
  }

  async listEmpresas() {
    const data = await this.request("/empresas");
    return data.empresas || [];
  }

  async crearEmpresa(empresa_id, nombre) {
    return this.request("/empresas", {
      method: "POST",
      body: { empresa_id, nombre },
    });
  }

  async getEmpresa(empresaId) {
    return this.request(`/empresas/${encodeURIComponent(empresaId)}`);
  }

  async saveKnowledge(empresaId, texto) {
    return this.request(`/empresas/${encodeURIComponent(empresaId)}/knowledge`, {
      method: "PUT",
      body: { texto },
    });
  }

  async crearBorrador(empresaId, payload) {
    return this.request(`/empresas/${encodeURIComponent(empresaId)}/draft`, {
      method: "POST",
      body: payload,
    });
  }
}

window.EmailComercialAPI = new EmailComercialAPI();
