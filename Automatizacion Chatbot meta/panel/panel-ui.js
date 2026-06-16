/** Utilidades visuales compartidas del panel. */
const PanelUI = {
  _toastEl: null,

  mount() {
    if (!this._toastEl) {
      let el = document.getElementById("panel-toast");
      if (!el) {
        el = document.createElement("div");
        el.id = "panel-toast";
        el.className = "panel-toast";
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", "polite");
        document.body.appendChild(el);
      }
      this._toastEl = el;
    }
  },

  toast(message, type = "ok") {
    this.mount();
    this._toastEl.textContent = message;
    this._toastEl.className = "panel-toast panel-toast--" + type + " panel-toast--show";
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      this._toastEl.classList.remove("panel-toast--show");
    }, 4500);
  },

  escape(text) {
    const d = document.createElement("div");
    d.textContent = text ?? "";
    return d.innerHTML;
  },

  slugify(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  },

  initials(name) {
    const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  },

  openModal({ title, bodyHtml, submitLabel = "Guardar", onSubmit }) {
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal__head">
          <h2>${this.escape(title)}</h2>
          <button type="button" class="modal__close" aria-label="Cerrar">&times;</button>
        </div>
        <div class="modal__body">${bodyHtml}</div>
        <div class="modal__foot">
          <button type="button" class="btn btn--ghost" data-action="cancel">Cancelar</button>
          <button type="button" class="btn btn--primary" data-action="submit">${this.escape(submitLabel)}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.classList.add("modal-backdrop--open");
    requestAnimationFrame(() => backdrop.classList.add("modal-backdrop--open"));

    const close = () => {
      backdrop.classList.remove("modal-backdrop--open");
      setTimeout(() => backdrop.remove(), 200);
    };

    backdrop.querySelector(".modal__close").onclick = close;
    backdrop.querySelector('[data-action="cancel"]').onclick = close;
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });

    const submitBtn = backdrop.querySelector('[data-action="submit"]');
    submitBtn.onclick = async () => {
      submitBtn.disabled = true;
      submitBtn.textContent = "Guardando…";
      try {
        await onSubmit(backdrop, close);
      } catch (err) {
        PanelUI.toast(err.message || "Error", "err");
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
      }
    };

    const firstInput = backdrop.querySelector("input, textarea, select");
    if (firstInput) firstInput.focus();
    return { backdrop, close };
  },
};

window.PanelUI = PanelUI;
