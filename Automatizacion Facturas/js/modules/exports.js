import { api } from "./api.js";
import { el, showToast, renderLoading, escapeHtml, downloadWithAuth } from "./utils.js";

export async function renderExport(root) {
  root.innerHTML = `<div class="page-head"><h1>Exportar y Hojas de Google</h1></div>` + renderLoading();

  try {
    const sheets = await api("/export/sheets/status").catch(() => ({ configured: false }));
    render(root, sheets);
  } catch (err) {
    root.innerHTML = `<div class="empty-state">
      <div class="empty-state__icon error"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
      <h3>Error al cargar exportaciones</h3>
      <p class="muted">${escapeHtml(err.message)}</p>
    </div>`;
  }
}

function render(root, sheets) {
  root.innerHTML = "";

  root.appendChild(el("div", { className: "page-head" }, [
    el("div", { className: "stack gap-xs" }, [
      el("h1", { text: "Exportar y Hojas de Google" }),
      el("p", { className: "muted text-sm m-0", text: "Descarga tus facturas o conéctalas en automático con una hoja de Google." })
    ])
  ]));

  root.appendChild(renderDownloadsCard());
  root.appendChild(renderSheetsCard(sheets));
}

/* ───── Tarjeta: Descargas Excel / CSV ───── */
function renderDownloadsCard() {
  const excelBtn = el("button", {
    className: "btn btn--primary",
    innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:16px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> Descargar Excel (.xlsx)',
    onClick: async (e) => downloadAndNotify(e.currentTarget, "/export/invoices/excel", "facturas.xlsx")
  });
  const csvBtn = el("button", {
    className: "btn btn--secondary",
    innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:16px"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Descargar CSV',
    onClick: async (e) => downloadAndNotify(e.currentTarget, "/export/invoices/csv", "facturas.csv")
  });

  return el("section", { className: "panel conn-card stack gap-md" }, [
    el("div", { className: "conn-card__head" }, [
      el("span", { className: "conn-card__icon bg-success-soft", innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>' }),
      el("div", { className: "stack gap-xs" }, [
        el("h2", { className: "m-0 text-lg", text: "Descargar Excel / CSV" }),
        el("p", { className: "muted text-sm m-0", text: "Todas las facturas con cliente, NIF, base, IVA, IRPF y total, listas para tu programa de contabilidad." })
      ])
    ]),
    el("div", { className: "flex gap-sm flex-wrap", style: { paddingTop: "0.25rem" } }, [excelBtn, csvBtn])
  ]);
}

/* ───── Tarjeta: Google Sheets ───── */
function renderSheetsCard(sheets) {
  const card = el("section", { className: "panel conn-card stack gap-md" });
  renderSheetsBlock(card, sheets);
  return card;
}

function renderSheetsBlock(container, sheets) {
  container.innerHTML = "";
  const configured = !!sheets?.configured;
  const credsDetected = !!sheets?.credentials_detected;

  const statusBadge = configured
    ? el("span", { className: "pill pill--ok", innerHTML: '<span class="pill__dot"></span>Conectado' })
    : el("span", { className: "pill pill--muted", innerHTML: '<span class="pill__dot"></span>Falta configurar' });

  // Cabecera de la tarjeta con icono + título + estado.
  container.appendChild(el("div", { className: "conn-card__head" }, [
    el("span", { className: "conn-card__icon bg-accent-soft", innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>' }),
    el("div", { className: "stack gap-xs flex-1" }, [
      el("div", { className: "flex items-center gap-sm flex-wrap" }, [
        el("h2", { className: "m-0 text-lg", text: "Google Sheets (automático)" }),
        statusBadge
      ]),
      el("p", {
        className: "muted text-sm m-0",
        text: configured
          ? `Cada factura nueva se añade sola a la pestaña «${sheets.sheet_name}». Usa «Sincronizar todo» para volcar las facturas existentes.`
          : "Conecta una hoja de Google para que cada factura se registre automáticamente y se importe a tu contabilidad."
      })
    ])
  ]));

  // Aviso sobre el archivo de credenciales.
  const credsNote = credsDetected
    ? el("p", { className: "text-sm text-success m-0 flex items-center gap-xs", innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px"><path d="M20 6L9 17l-5-5"/></svg> Archivo de credenciales detectado.' })
    : el("p", { className: "text-sm text-warning m-0 flex items-center gap-xs", innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg> Falta el archivo de credenciales en <code>backend/credentials/</code>.' });
  container.appendChild(credsNote);

  // Email de la cuenta de servicio: hay que compartir la hoja con él.
  if (sheets?.service_account_email) {
    container.appendChild(el("div", { className: "panel bg-primary border-dashed stack gap-xs p-md m-0" }, [
      el("p", { className: "text-sm m-0", innerHTML: "<strong>Comparte tu hoja de Google con este email</strong> (botón Compartir → permiso de Editor):" }),
      el("div", { className: "flex gap-sm items-center flex-wrap" }, [
        el("code", { className: "text-sm", style: { wordBreak: "break-all" }, text: sheets.service_account_email }),
        el("button", {
          className: "btn btn--ghost btn--sm",
          text: "Copiar",
          onClick: async () => {
            try {
              await navigator.clipboard.writeText(sheets.service_account_email);
              showToast("Email copiado", "success");
            } catch (_) {
              showToast("No se pudo copiar", "error");
            }
          }
        })
      ])
    ]));
  }

  // Formulario de conexión.
  const idInput = el("input", { type: "text", name: "spreadsheet_id", value: sheets?.spreadsheet_id || "", placeholder: "ID de la hoja (entre /d/ y /edit en la URL)" });
  const nameInput = el("input", { type: "text", name: "sheet_name", value: sheets?.sheet_name || "Facturas", placeholder: "Facturas" });
  const autoSync = el("input", { type: "checkbox", name: "auto_sync", checked: sheets?.auto_sync !== false, style: { width: "auto" } });

  container.appendChild(el("div", { className: "stack gap-md" }, [
    el("div", { className: "grid-2 gap-md" }, [
      el("div", { className: "stack-field" }, [
        el("label", { text: "ID de la hoja de Google" }),
        idInput
      ]),
      el("div", { className: "stack-field" }, [
        el("label", { text: "Nombre de la pestaña" }),
        nameInput
      ])
    ]),
    el("label", { className: "flex items-center gap-sm text-sm", style: { cursor: "pointer" } }, [
      autoSync,
      el("span", { text: "Añadir automáticamente cada factura nueva a la hoja" })
    ])
  ]));

  // Botones.
  const saveBtn = el("button", {
    className: "btn btn--primary",
    text: "Guardar conexión",
    onClick: async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.textContent = "Guardando...";
      try {
        const updated = await api("/export/sheets/config", {
          method: "PUT",
          body: {
            google_spreadsheet_id: idInput.value.trim(),
            google_sheet_name: nameInput.value.trim(),
            sheets_auto_sync: autoSync.checked
          }
        });
        showToast("Conexión guardada", "success");
        renderSheetsBlock(container, updated);
      } catch (err) {
        showToast(err.message, "error");
        btn.disabled = false;
        btn.textContent = "Guardar conexión";
      }
    }
  });

  const testBtn = el("button", {
    className: "btn btn--secondary",
    text: "Probar conexión",
    onClick: async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = "Probando...";
      try {
        const res = await api("/export/sheets/test", { method: "POST" });
        showToast(res.message || (res.ok ? "Conexión correcta" : "No se pudo conectar"), res.ok ? "success" : "error");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    }
  });

  const syncBtn = el("button", {
    className: "btn btn--secondary",
    disabled: !configured,
    innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:16px"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Sincronizar todo ahora',
    onClick: async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      const original = btn.innerHTML;
      btn.textContent = "Sincronizando...";
      try {
        const res = await api("/export/sheets/sync", { method: "POST" });
        showToast(res.message || "Sincronizado con Google Sheets", "success");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = original;
      }
    }
  });

  const actions = el("div", { className: "flex gap-sm flex-wrap" }, [saveBtn, testBtn, syncBtn]);
  if (configured && sheets.spreadsheet_url) {
    actions.appendChild(el("a", {
      className: "btn btn--ghost",
      href: sheets.spreadsheet_url,
      target: "_blank",
      rel: "noopener",
      innerHTML: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mr-xs" style="width:16px"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><path d="M15 3h6v6M10 14L21 3"/></svg> Abrir hoja'
    }));
  }
  container.appendChild(actions);

  container.appendChild(el("details", { className: "text-sm muted" }, [
    el("summary", { style: { cursor: "pointer" }, text: "¿Cómo conecto mi Google Sheets? (paso a paso)" }),
    el("ol", { className: "mt-sm pl-md stack gap-xs" }, [
      el("li", { innerHTML: 'En Google Cloud crea una <strong>cuenta de servicio</strong> y descarga su clave <strong>JSON</strong>.' }),
      el("li", { innerHTML: 'Copia ese archivo <code>.json</code> dentro de <code>backend/credentials/</code> (se detecta solo).' }),
      el("li", { innerHTML: 'Comparte tu hoja de Google con el <code>client_email</code> del JSON, con permiso de <strong>Editor</strong>.' }),
      el("li", { innerHTML: 'Pega aquí el <strong>ID de la hoja</strong> y pulsa «Guardar conexión» y «Probar conexión».' })
    ])
  ]));
}

async function downloadAndNotify(btn, path, fallbackName) {
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.textContent = "Generando...";
  try {
    await downloadWithAuth(path, fallbackName);
    showToast("Descarga lista", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
}
