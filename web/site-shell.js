(function () {
  const current = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const items = [
    ["index.html", "site.nav.home", "Inicio"],
    ["serveis.html", "site.nav.solutions", "Soluciones"],
    ["casos-uso.html", "site.nav.useCases", "Casos de uso"],
    ["integraciones.html", "site.nav.integrations", "Integraciones"],
    ["proces.html", "site.nav.method", "Proceso"],
    ["impacte.html", "site.nav.results", "Impacto"],
    ["contacto.html", "site.nav.contact", "Contacto"],
  ];

  function links(className) {
    return items.map(([href, key, fallback]) => {
      const active = current === href ? ' class="is-active" aria-current="page"' : "";
      return `<a href="${href}" data-i18n="${key}"${active}>${fallback}</a>`;
    }).join("");
  }

  document.querySelectorAll(".topbar .nav").forEach((nav) => {
    nav.innerHTML = links("nav");
  });

  document.querySelectorAll(".topbar .mobile-nav").forEach((nav) => {
    nav.innerHTML = `${links("mobile-nav")}<a href="iniciar-sesion.html" data-private-link data-i18n="site.nav.login">Iniciar sesión</a>`;
  });

  document.querySelectorAll(".site-footer").forEach((footer) => {
    if (footer.querySelector(".footer-explore")) return;
    const explore = document.createElement("nav");
    explore.className = "footer-explore";
    explore.setAttribute("aria-label", "Explorar Bynoesis");
    explore.innerHTML = `<strong data-i18n="site.footer.explore">Explorar</strong>${links("footer-explore")}`;
    const legalNav = footer.querySelector("nav");
    footer.insertBefore(explore, legalNav || null);
  });
})();
