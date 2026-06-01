(function () {
  "use strict";

  PanelShell.mount({ active: "borrador.html", title: "Probar borrador" });

  const empresaId = EmpresaPanel.getId();
  const banner = document.getElementById("empresaBanner");
  const resultBox = document.getElementById("resultBox");
  const genStatus = document.getElementById("genStatus");

  if (!empresaId) {
    banner.className = "cliente-banner cliente-banner--warn";
    banner.innerHTML =
      'Sin empresa activa. <a href="empresas.html">Elige una empresa</a> primero.';
  } else {
    banner.className = "cliente-banner cliente-banner--ok";
    banner.innerHTML = EmpresaPanel.badgeHtml("", empresaId);
  }

  document.getElementById("btnGenerate")?.addEventListener("click", async () => {
    if (!empresaId) {
      PanelUI.toast("Selecciona una empresa primero", "err");
      return;
    }

    const lead_name = document.getElementById("leadName")?.value.trim();
    const lead_company = document.getElementById("leadCompany")?.value.trim();
    const sales_rep_name = document.getElementById("salesRep")?.value.trim();
    const email_subject = document.getElementById("emailSubject")?.value.trim();
    const incoming_email_body = document.getElementById("incomingEmail")?.value.trim();

    if (!lead_name || !sales_rep_name || incoming_email_body.length < 10) {
      PanelUI.toast("Completa nombre, comercial y correo (mín. 10 caracteres)", "err");
      return;
    }

    genStatus.textContent = "Generando…";
    resultBox.style.display = "none";

    try {
      const data = await EmailComercialAPI.crearBorrador(empresaId, {
        lead_name,
        lead_company,
        sales_rep_name,
        incoming_email_body,
        email_subject,
      });

      genStatus.textContent = "";

      if (!data.ok) {
        PanelUI.toast(data.solucion || data.codigo_error || "Error", "err");
        return;
      }

      resultBox.style.display = "block";
      document.getElementById("disclaimer").textContent = data.disclaimer || "";
      document.getElementById("analysisOut").textContent = JSON.stringify(
        data.analysis,
        null,
        2
      );
      document.getElementById("subjectOut").textContent =
        data.email_draft?.subject_line || "";
      document.getElementById("bodyOut").textContent = data.email_draft?.body || "";
      document.getElementById("ragHint").textContent =
        "Contexto RAG usado: " + (data.knowledge_context_chars || 0) + " caracteres";
      PanelUI.toast("Borrador generado", "ok");
    } catch (err) {
      genStatus.textContent = "";
      PanelUI.toast(err.message, "err");
    }
  });
})();
