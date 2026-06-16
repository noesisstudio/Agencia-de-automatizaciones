/**
 * Estado del cliente activo + navegación entre páginas del panel.
 */
const ClientePanel = {
  storageKey: "openix_cliente_activo",
  _listeners: new Set(),

  onChange(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  },

  _emit() {
    const id = this.getId();
    this._listeners.forEach((fn) => {
      try {
        fn(id);
      } catch (_) {}
    });
    window.dispatchEvent(new CustomEvent("openix:cliente", { detail: { id } }));
  },

  getId() {
    const q = new URLSearchParams(location.search).get("cliente");
    if (q) {
      sessionStorage.setItem(this.storageKey, q.trim());
      return q.trim();
    }
    return sessionStorage.getItem(this.storageKey) || "";
  },

  setId(id) {
    const tid = (id || "").trim();
    sessionStorage.setItem(this.storageKey, tid);
    this._emit();
    return tid;
  },

  link(path, clienteId) {
    const id = clienteId || this.getId();
    const sep = path.includes("?") ? "&" : "?";
    return id ? `${path}${sep}cliente=${encodeURIComponent(id)}` : path;
  },

  tenantApi(baseUrl, clienteId) {
    const api = (baseUrl || location.origin).replace(/\/$/, "");
    const id = (clienteId || this.getId() || "default").trim();
    return `${api}/bot/tenants/${encodeURIComponent(id)}`;
  },

  _esc(text) {
    if (typeof PanelUI !== "undefined") return PanelUI.escape(text);
    const d = document.createElement("div");
    d.textContent = text ?? "";
    return d.innerHTML;
  },

  badgeHtml(nombre, id) {
    const n = nombre || id || "Sin cliente";
    return `<span class="cliente-badge">${this._esc(n)} <code>${this._esc(id)}</code></span>`;
  },

  /** Enlaces de nav con cliente activo preservado. */
  wireNav(selector) {
    document.querySelectorAll(selector || "header nav a").forEach((a) => {
      const href = a.getAttribute("href");
      if (href && !href.startsWith("http") && !href.startsWith("/docs")) {
        a.href = this.link(href);
      }
    });
  },
};

window.ClientePanel = ClientePanel;
