(function () {
  var STORAGE_KEY = "openixLang";

  var STR = {
    es: {
      bannerRegion: "Acceso para clientes",
      bannerMsg:
        "<strong>Empresas y despachos</strong> · Facturas, pagos y estado del servicio",
      skip: "Ir al contenido principal",
      navAria: "Principal",
      langNav: "Idioma",
      navHome: "Inicio",
      navServices: "Servicios",
      navPricing: "Precios",
      navSecurity: "Seguridad",
      navContact: "Hablar con nosotros",
      login: "Iniciar sesión",
      menuOpen: "Abrir menú",
      menuClose: "Cerrar menú",
      footerTagline: " Openix · Automatización con IA",
      loginTitle: "Iniciar sesión",
      userLabel: "Usuario",
      passwordLabel: "Contraseña",
      signIn: "Entrar",
      forgotPassword: "¿Has olvidado tu contraseña?",
      footerContact: "Contacto",
      footerLegal: "Legal",
      hubFaqTitle: "Preguntas frecuentes",
      hubFaqDesc: "Dudas habituales sobre plazos, datos y cómo empezar.",
      hubFaqCta: "Ver FAQs →",
      faqLabel: "Preguntas frecuentes",
      faqTitle: "Respuestas rápidas antes de escribirnos",
      faqIntro:
        "Si no encuentras lo que buscas, en <a href=\"contacto.html\">Contacto</a> te respondemos sin compromiso.",
      faq1q: "¿Qué entendéis por automatización con IA?",
      faq1a:
        "Unimos tus herramientas habituales (correo, CRM, formularios, WhatsApp…) con flujos <strong>no-code</strong> y modelos de lenguaje cuando aportan valor: menos copiar y pegar, respuestas más rápidas y datos ordenados. Puedes ver el detalle en <a href=\"servicios.html\">Servicios</a>.",
      faq2q: "¿Necesito saber de programación?",
      faq2a:
        "No. Diseñamos y mantenemos los flujos contigo; tú sigues usando las mismas apps que ya conoces.",
      faq3q: "¿Cuánto tardáis en poner algo en marcha?",
      faq3a:
        "Depende del alcance, pero en proyectos acotados solemos tener un primer flujo útil en <strong>unas pocas semanas</strong>. La primera consulta es gratuita para alinear expectativas y prioridades.",
      faq4q: "¿Qué pasa con mis datos y el RGPD?",
      faq4a:
        "Trabajamos con accesos mínimos, contratos claros y proveedores acordes a uso empresarial. Más información en <a href=\"seguridad.html\">Seguridad</a>.",
      faq5q: "¿Cómo son los precios?",
      faq5a:
        "Planes transparentes y posibilidad de bundle a medida. Rangos y condiciones en <a href=\"precios.html\">Precios</a>.",
      faq6q: "¿Cómo pido una demo?",
      faq6a:
        "Desde <a href=\"contacto.html\">Contacto</a> puedes solicitar una demo gratuita o una primera reunión.",
      portalAreaBadge: "Área de clientes",
      portalNavResumen: "Resumen",
      portalNavFacturas: "Facturas",
      portalNavEstado: "Estado del servicio",
      portalNavSoporte: "Soporte",
      portalBackWeb: "← Volver a la web",
      portalTopbarTitle: "Panel",
      portalUserLabel: "Usuario",
      portalLogout: "Cerrar sesión",
      portalDemoNote: "Vista de demostración: los datos son ficticios.",
      portalHeadingResumen: "Resumen",
      portalWelcomeBefore: "Bienvenido,",
      portalWelcomeAfter: "aquí tienes un resumen rápido de tu cuenta.",
      portalStatNextInvTitle: "Próxima factura",
      portalStatNextInvMeta: "Plan mensual · IVA incluido",
      portalStatContractTitle: "Contrato",
      portalStatContractVal: "Activo",
      portalStatContractMeta: "Renovación automática",
      portalStatSupportTitle: "Soporte",
      portalStatSupportMeta: "Horas incluidas este trimestre",
      portalCardActivityTitle: "Actividad reciente",
      portalAct1: "Factura INV-2026-014 emitida y enviada por correo.",
      portalAct2: "Flujo «Leads web» ejecutado 48 veces esta semana.",
      portalAct3: "Copia de seguridad de credenciales actualizada.",
      portalCardNextTitle: "Próximos pasos",
      portalNext1: "Revisar borrador del informe trimestral (te lo enviamos por email).",
      portalNext2: "Confirmar el alcance del nuevo flujo de presupuestos.",
      portalNext3: "Reservar reunión de seguimiento desde Soporte.",
      portalHeadingFacturas: "Facturas",
      portalInvoicesLead: "Descarga y estado de tus facturas emitidas por Openix.",
      portalThInvoice: "Número",
      portalThDate: "Fecha",
      portalThConcept: "Concepto",
      portalThAmount: "Importe",
      portalThStatus: "Estado",
      portalThAction: "Acción",
      portalInvRow1c: "Automatización — abril 2026",
      portalInvRow2c: "Automatización — marzo 2026",
      portalInvRow3c: "Automatización — febrero 2026",
      portalInvRow4c: "Automatización — mayo 2026",
      portalStatusPaid: "Pagada",
      portalStatusPending: "Pendiente",
      portalBtnPdf: "PDF",
      portalHeadingEstado: "Estado del servicio",
      portalStatusLead: "Seguimiento de tu proyecto y automatizaciones activas.",
      portalMs1t: "Onboarding y accesos",
      portalMs1d: "Completado · Credenciales y entorno listos.",
      portalMs2t: "Flujo principal de leads",
      portalMs2d: "En producción · Monitorizado.",
      portalMs3t: "Ampliación presupuestos",
      portalMs3d: "En curso · Pruebas internas esta semana.",
      portalMs4t: "Informe y optimización",
      portalMs4d: "Planificado · Tras validar presupuestos.",
      portalHeadingSoporte: "Soporte",
      portalSupportLead:
        "¿Necesitas ayuda o un cambio? Escríbenos y te respondemos en horario laboral.",
      portalSupportCta: "Abrir formulario de contacto",
      portalSupportSecurity: "Ver política de seguridad",
      portalSupportHoursTitle: "Horario",
      portalSupportHoursText: "Lunes a viernes, 9:00–18:00 (CET).",
      portalNavAria: "Secciones del panel",
    },
    ca: {
      bannerRegion: "Accés per a clients",
      bannerMsg:
        "<strong>Empreses i despatxos</strong> · Factures, pagaments i estat del servei",
      skip: "Anar al contingut principal",
      navAria: "Principal",
      langNav: "Idioma",
      navHome: "Inici",
      navServices: "Serveis",
      navPricing: "Preus",
      navSecurity: "Seguretat",
      navContact: "Parlar amb nosaltres",
      login: "Iniciar sessió",
      menuOpen: "Obrir el menú",
      menuClose: "Tancar el menú",
      footerTagline: " Openix · Automatització amb IA",
      loginTitle: "Iniciar sessió",
      userLabel: "Usuari",
      passwordLabel: "Contrasenya",
      signIn: "Entrar",
      forgotPassword: "Has oblidat la contrasenya?",
      footerContact: "Contacte",
      footerLegal: "Avís legal",
      hubFaqTitle: "Preguntes freqüents",
      hubFaqDesc: "Dubtes habituals sobre terminis, dades i com començar.",
      hubFaqCta: "Veure FAQs →",
      faqLabel: "Preguntes freqüents",
      faqTitle: "Respostes ràpides abans d'escriure'ns",
      faqIntro:
        "Si no trobes el que busques, a <a href=\"contacto.html\">Contacte</a> et respondem sense compromís.",
      faq1q: "Què enteneu per automatització amb IA?",
      faq1a:
        "Unim les teves eines habituals (correu, CRM, formularis, WhatsApp…) amb fluxos <strong>no-code</strong> i models de llenguatge quan aporten valor: menys copiar i enganxar, respostes més ràpides i dades ordenades. Pots veure el detall a <a href=\"servicios.html\">Serveis</a>.",
      faq2q: "Cal saber programar?",
      faq2a:
        "No. Dissenyem i mantenim els fluxos amb tu; tu continues fent servir les mateixes apps que ja coneixes.",
      faq3q: "Quant trigueu a posar alguna cosa en marxa?",
      faq3a:
        "Depèn de l'abast, però en projectes acotats solem tenir un primer flux útil en <strong>poques setmanes</strong>. La primera consulta és gratuïta per alinear expectatives i prioritats.",
      faq4q: "Què passa amb les meves dades i el RGPD?",
      faq4a:
        "Treballem amb accesos mínims, contractes clars i proveïdors adients a ús empresarial. Més informació a <a href=\"seguridad.html\">Seguretat</a>.",
      faq5q: "Com són els preus?",
      faq5a:
        "Plans transparents i possibilitat de paquet a mida. Rang i condicions a <a href=\"precios.html\">Preus</a>.",
      faq6q: "Com demano una demo?",
      faq6a:
        "Des de <a href=\"contacto.html\">Contacte</a> pots sol·licitar una demo gratuïta o una primera reunió.",
      portalAreaBadge: "Àrea de clients",
      portalNavResumen: "Resum",
      portalNavFacturas: "Factures",
      portalNavEstado: "Estat del servei",
      portalNavSoporte: "Suport",
      portalBackWeb: "← Tornar al web",
      portalTopbarTitle: "Tauler",
      portalUserLabel: "Usuari",
      portalLogout: "Tancar sessió",
      portalDemoNote: "Vista de demostració: les dades són fictícies.",
      portalHeadingResumen: "Resum",
      portalWelcomeBefore: "Benvingut,",
      portalWelcomeAfter: "aquí tens un resum ràpid del teu compte.",
      portalStatNextInvTitle: "Propera factura",
      portalStatNextInvMeta: "Pla mensual · IVA inclòs",
      portalStatContractTitle: "Contracte",
      portalStatContractVal: "Actiu",
      portalStatContractMeta: "Renovació automàtica",
      portalStatSupportTitle: "Suport",
      portalStatSupportMeta: "Hores incloses aquest trimestre",
      portalCardActivityTitle: "Activitat recent",
      portalAct1: "Factura INV-2026-014 emesa i enviada per correu.",
      portalAct2: "Flux «Leads web» executat 48 vegades aquesta setmana.",
      portalAct3: "Còpia de seguretat de credencials actualitzada.",
      portalCardNextTitle: "Propers passos",
      portalNext1: "Revisar l'esborrany de l'informe trimestral (t'ho enviem per email).",
      portalNext2: "Confirmar l'abast del nou flux de pressupostos.",
      portalNext3: "Reservar reunió de seguiment des de Suport.",
      portalHeadingFacturas: "Factures",
      portalInvoicesLead: "Descàrrega i estat de les teves factures emeses per Openix.",
      portalThInvoice: "Número",
      portalThDate: "Data",
      portalThConcept: "Concepte",
      portalThAmount: "Import",
      portalThStatus: "Estat",
      portalThAction: "Acció",
      portalInvRow1c: "Automatització — abril 2026",
      portalInvRow2c: "Automatització — març 2026",
      portalInvRow3c: "Automatització — febrer 2026",
      portalInvRow4c: "Automatització — maig 2026",
      portalStatusPaid: "Pagada",
      portalStatusPending: "Pendent",
      portalBtnPdf: "PDF",
      portalHeadingEstado: "Estat del servei",
      portalStatusLead: "Seguiment del teu projecte i automatitzacions actives.",
      portalMs1t: "Onboarding i accesos",
      portalMs1d: "Completat · Credencials i entorn llestos.",
      portalMs2t: "Flux principal de leads",
      portalMs2d: "En producció · Monitoritzat.",
      portalMs3t: "Ampliació de pressupostos",
      portalMs3d: "En curs · Proves internes aquesta setmana.",
      portalMs4t: "Informe i optimització",
      portalMs4d: "Planificat · Després de validar pressupostos.",
      portalHeadingSoporte: "Suport",
      portalSupportLead:
        "Necessites ajuda o un canvi? Escriu-nos i et respondrem en horari laboral.",
      portalSupportCta: "Obrir formulari de contacte",
      portalSupportSecurity: "Veure política de seguretat",
      portalSupportHoursTitle: "Horari",
      portalSupportHoursText: "Dilluns a divendres, 9:00–18:00 (CET).",
      portalNavAria: "Seccions del tauler",
    },
  };

  function getLang() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return v === "ca" ? "ca" : "es";
    } catch (e) {
      return "es";
    }
  }

  function setUiLabels(t) {
    window.__openixUi = {
      menuOpen: t.menuOpen,
      menuClose: t.menuClose,
    };
  }

  function apply() {
    var lang = getLang();
    var t = STR[lang] || STR.es;
    document.documentElement.lang = lang === "ca" ? "ca" : "es";

    setUiLabels(t);

    var banner = document.querySelector(".client-banner");
    if (banner && t.bannerRegion) {
      banner.setAttribute("aria-label", t.bannerRegion);
    }

    document.querySelectorAll(".lang-switch").forEach(function (el) {
      if (t.langNav) {
        el.setAttribute("aria-label", t.langNav);
      }
    });

    var navEl = document.getElementById("nav");
    if (navEl && t.navAria) {
      navEl.setAttribute("aria-label", t.navAria);
    }

    var skip = document.querySelector(".skip-link");
    if (skip && t.skip) {
      skip.textContent = t.skip;
    }

    var portalNav = document.getElementById("portalNav");
    if (portalNav && t.portalNavAria) {
      portalNav.setAttribute("aria-label", t.portalNavAria);
    }

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (key && t[key]) {
        el.textContent = t[key];
      }
    });

    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (key && t[key]) {
        el.innerHTML = t[key];
      }
    });

    var toggle = document.getElementById("navToggle");
    if (toggle && navEl && !navEl.classList.contains("is-open")) {
      toggle.setAttribute("aria-label", t.menuOpen);
    }
  }

  function setLang(lang) {
    if (lang !== "es" && lang !== "ca") {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* ignore */
    }
    apply();
    document.querySelectorAll(".lang-switch__btn").forEach(function (btn) {
      var active = btn.getAttribute("data-set-lang") === lang;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setLang(getLang());
    document.querySelectorAll("[data-set-lang]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setLang(btn.getAttribute("data-set-lang"));
      });
    });
  });
})();
