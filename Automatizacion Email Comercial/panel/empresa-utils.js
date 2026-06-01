/**
 * Estado de la empresa activa + navegación entre páginas del panel.
 */
const EmpresaPanel = {
  storageKey: "openix_email_empresa_activa",
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
    window.dispatchEvent(new CustomEvent("openix:empresa", { detail: { id } }));
  },

  getId() {
    const q = new URLSearchParams(location.search).get("empresa");
    if (q) {
      sessionStorage.setItem(this.storageKey, q.trim());
      return q.trim();
    }
    return sessionStorage.getItem(this.storageKey) || "";
  },

  setId(id) {
    const eid = (id || "").trim();
    sessionStorage.setItem(this.storageKey, eid);
    this._emit();
    return eid;
  },

  link(path, empresaId) {
    const id = empresaId || this.getId();
    const sep = path.includes("?") ? "&" : "?";
    return id ? `${path}${sep}empresa=${encodeURIComponent(id)}` : path;
  },

  badgeHtml(nombre, id) {
    const n = nombre || id || "Sin empresa";
    const esc =
      typeof PanelUI !== "undefined"
        ? PanelUI.escape
        : (t) => {
            const d = document.createElement("div");
            d.textContent = t ?? "";
            return d.innerHTML;
          };
    return `<span class="cliente-badge">${esc(n)} <code>${esc(id)}</code></span>`;
  },
};

window.EmpresaPanel = EmpresaPanel;
