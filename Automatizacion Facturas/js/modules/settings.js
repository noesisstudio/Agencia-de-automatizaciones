import { api } from "./api.js";
import { el, showToast, renderLoading, escapeHtml } from "./utils.js";

export async function renderSettings(root) {
  root.innerHTML = `<div class="page-head"><h1>Configuración</h1></div>` + renderLoading();

  try {
    const settings = await api("/dashboard/settings");
    render(root, settings);
  } catch (err) {
    root.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
      <h3>Error al cargar configuración</h3>
      <p class="muted">${escapeHtml(err.message)}</p>
    </div>`;
  }
}

function render(root, settings) {
  root.innerHTML = "";

  const head = el("div", { className: "page-head" }, [
    el("div", { className: "stack gap-xs" }, [
      el("h1", { text: "Configuración" }),
      el("p", { className: "muted text-sm m-0", text: "Datos de tu empresa y valores por defecto de la facturación." })
    ])
  ]);

  // Tarjeta: Datos de empresa.
  const companyCard = el("section", { className: "panel conn-card stack gap-md" }, [
    el("div", { className: "conn-card__head" }, [
      el("span", { className: "conn-card__icon bg-accent-soft", innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px"><path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/><path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01"/></svg>' }),
      el("div", { className: "stack gap-xs" }, [
        el("h2", { className: "m-0 text-lg", text: "Datos de la empresa" }),
        el("p", { className: "muted text-sm m-0", text: "Aparecerán en cada factura que generes." })
      ])
    ]),
    el("div", { className: "grid-2 gap-md" }, [
      el("div", { className: "stack-field" }, [
        el("label", { text: "Nombre de la Empresa" }),
        el("input", { name: "name", type: "text", value: settings.name || "" })
      ]),
      el("div", { className: "stack-field" }, [
        el("label", { text: "NIF / CIF" }),
        el("input", { name: "nif", type: "text", value: settings.nif || "" })
      ])
    ]),
    el("div", { className: "stack-field" }, [
      el("label", { text: "Email de contacto" }),
      el("input", { name: "email", type: "email", value: settings.email || "" })
    ]),
    el("div", { className: "stack-field" }, [
      el("label", { text: "Dirección fiscal" }),
      el("textarea", { name: "address", rows: 2, text: settings.address || "" })
    ])
  ]);

  // Tarjeta: Facturación por defecto.
  const billingCard = el("section", { className: "panel conn-card stack gap-md" }, [
    el("div", { className: "conn-card__head" }, [
      el("span", { className: "conn-card__icon bg-success-soft", innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>' }),
      el("div", { className: "stack gap-xs" }, [
        el("h2", { className: "m-0 text-lg", text: "Facturación por defecto" }),
        el("p", { className: "muted text-sm m-0", text: "Numeración e impuestos que se aplican a las nuevas facturas." })
      ])
    ]),
    el("div", { className: "grid-2 gap-md" }, [
      el("div", { className: "stack-field" }, [
        el("label", { text: "Prefijo de Factura" }),
        el("input", { name: "invoice_prefix", type: "text", value: settings.invoice_prefix || "FAC", placeholder: "Ej. FAC-" })
      ]),
      el("div", { className: "stack-field" }, [
        el("label", { text: "Siguiente Número" }),
        el("input", { name: "next_invoice_number", type: "number", min: 1, value: settings.next_invoice_number || 1 })
      ]),
      el("div", { className: "stack-field" }, [
        el("label", { text: "IVA % por Defecto" }),
        el("input", { name: "default_iva_rate", type: "number", step: "0.1", value: settings.default_iva_rate ?? 21.0 })
      ]),
      el("div", { className: "stack-field" }, [
        el("label", { text: "IRPF % por Defecto" }),
        el("input", { name: "default_irpf_rate", type: "number", step: "0.1", value: settings.default_irpf_rate ?? 0.0 })
      ])
    ])
  ]);

  const form = el("form", { className: "stack gap-lg" }, [
    companyCard,
    billingCard,
    el("div", { className: "flex justify-end" }, [
      el("button", { type: "submit", className: "btn btn--primary", text: "Guardar Cambios" })
    ])
  ]);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Guardando...";

    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    data.next_invoice_number = parseInt(data.next_invoice_number, 10);
    data.default_iva_rate = parseFloat(data.default_iva_rate) || 0;
    data.default_irpf_rate = parseFloat(data.default_irpf_rate) || 0;

    try {
      await api("/dashboard/settings", { method: "PUT", body: data });
      showToast("Configuración guardada", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Guardar Cambios";
    }
  });

  root.appendChild(head);
  root.appendChild(form);
}
