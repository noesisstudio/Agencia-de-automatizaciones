(function () {
  "use strict";

  PanelShell.mount({ active: "conocimiento.html", title: "Documentación" });

  const empresaId = EmpresaPanel.getId();
  const banner = document.getElementById("empresaBanner");
  const knowledge = document.getElementById("knowledge");
  const charCount = document.getElementById("charCount");
  const dirtyHint = document.getElementById("dirtyHint");
  let savedText = "";

  function updateChars() {
    const n = (knowledge?.value || "").length;
    if (charCount) charCount.textContent = n + " caracteres";
    if (dirtyHint) dirtyHint.hidden = knowledge?.value === savedText;
  }

  async function load() {
    if (!empresaId) {
      banner.className = "cliente-banner cliente-banner--warn";
      banner.innerHTML =
        'Sin empresa activa. <a href="empresas.html">Elige una empresa</a> primero.';
      return;
    }

    banner.className = "cliente-banner cliente-banner--ok";
    banner.innerHTML = EmpresaPanel.badgeHtml("", empresaId);

    document.getElementById("empresaId").value = empresaId;
    document.getElementById("linkBorrador").href = EmpresaPanel.link("borrador.html", empresaId);

    try {
      const data = await EmailComercialAPI.getEmpresa(empresaId);
      document.getElementById("empresaNombre").value = data.nombre || empresaId;
      savedText = data.knowledge_markdown || "";
      knowledge.value = savedText;
      updateChars();
    } catch (err) {
      banner.className = "cliente-banner cliente-banner--err";
      banner.textContent = err.message;
    }
  }

  knowledge?.addEventListener("input", updateChars);

  document.getElementById("btnLoad")?.addEventListener("click", load);

  document.getElementById("btnSave")?.addEventListener("click", async () => {
    const texto = knowledge?.value.trim() || "";
    if (texto.length < 10) {
      PanelUI.toast("Escribe al menos 10 caracteres", "err");
      return;
    }
    try {
      await EmailComercialAPI.saveKnowledge(empresaId, texto);
      savedText = knowledge.value;
      updateChars();
      PanelUI.toast("Documentación guardada", "ok");
    } catch (err) {
      PanelUI.toast(err.message, "err");
    }
  });

  load();
})();
