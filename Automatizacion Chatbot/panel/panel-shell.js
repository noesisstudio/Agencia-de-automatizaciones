/**
 * Cabecera y navegación compartida del panel Openix.
 */
const PanelShell = {
  navItems: [
    { href: "clientes.html", label: "Clientes" },
    { href: "configurar.html", label: "Documentos" },
    { href: "whatsapp.html", label: "WhatsApp" },
    { href: "probar.html", label: "Probar" },
    { href: "instalacion.html", label: "Instalación" },
  ],

  mount(options = {}) {
    const active = options.active || "";
    const pageTitle = options.title || "Chatbot";

    document.body.classList.add("app-shell");

    let header = document.querySelector(".app-header");
    if (!header) {
      document.querySelector("header.top")?.remove();
      header = document.createElement("header");
      header.className = "app-header";
      document.body.insertBefore(header, document.body.firstChild);
    }

    const links = this.navItems
      .map((item) => {
        const isActive = active === item.href || active === item.label.toLowerCase();
        const cls = isActive ? "app-nav__link app-nav__link--active" : "app-nav__link";
        return `<a href="${ClientePanel.link(item.href)}" class="${cls}">${item.label}</a>`;
      })
      .join("");

    header.innerHTML = `
      <div class="app-header__brand">
        <span class="app-header__logo">OX</span>
        <span class="app-header__title">${PanelUI.escape(pageTitle)}</span>
      </div>
      <nav class="app-nav">${links}</nav>`;

    return header;
  },
};

window.PanelShell = PanelShell;
