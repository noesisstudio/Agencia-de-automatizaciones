/**
 * Cabecera y navegación del panel Email Comercial.
 */
const PanelShell = {
  navItems: [
    { href: "empresas.html", label: "Empresas" },
    { href: "conocimiento.html", label: "Documentación" },
    { href: "borrador.html", label: "Probar borrador" },
    { href: "instalacion.html", label: "Instalación" },
  ],

  mount(options = {}) {
    const active = options.active || "";
    const pageTitle = options.title || "Email comercial";

    document.body.classList.add("app-shell");

    let header = document.querySelector(".app-header");
    if (!header) {
      header = document.createElement("header");
      header.className = "app-header";
      document.body.insertBefore(header, document.body.firstChild);
    }

    const links = this.navItems
      .map((item) => {
        const isActive =
          active === item.href ||
          active === item.label.toLowerCase() ||
          (active === "" && item.href === "index.html");
        const cls = isActive ? "app-nav__link app-nav__link--active" : "app-nav__link";
        const href =
          item.href === "index.html" ? "index.html" : EmpresaPanel.link(item.href);
        return `<a href="${href}" class="${cls}">${item.label}</a>`;
      })
      .join("");

    header.innerHTML = `
      <div class="app-header__brand">
        <a href="index.html" style="display:flex;align-items:center;gap:10px;text-decoration:none;color:inherit">
          <span class="app-header__logo">EC</span>
          <span class="app-header__title">${PanelUI.escape(pageTitle)}</span>
        </a>
      </div>
      <nav class="app-nav">${links}</nav>`;

    return header;
  },
};

window.PanelShell = PanelShell;
