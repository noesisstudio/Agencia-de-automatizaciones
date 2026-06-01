const revealItems = document.querySelectorAll("[data-reveal]");

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.16 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const CLIENT_SESSION_KEY = "noesisClientSession";
const PRIVACY_NOTICE_KEY = "noesisPrivacyNotice";

function readStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // Storage can be blocked in strict browser modes. The interface remains usable without persistence.
  }
}

function removeStorage(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    // Ignore storage restrictions.
  }
}

const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector("#mobile-menu");

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!isOpen));
    mobileMenu.hidden = isOpen;
  });
}

const privateLinks = document.querySelectorAll("[data-private-link]");
const hasClientSession = readStorage(CLIENT_SESSION_KEY) === "active";

privateLinks.forEach((link) => {
  if (hasClientSession) {
    link.href = "portal-dashboard.html";
    link.textContent = "\u00c1rea privada";
  } else {
    link.href = "portal.html";
    link.textContent = "Acceso cliente";
  }
});

const portalForm = document.querySelector("#portal-login-form");

if (portalForm) {
  portalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    writeStorage(CLIENT_SESSION_KEY, "active");
    const dashboardUrl = portalForm.dataset.dashboardUrl || "portal-dashboard.html";
    window.location.href = dashboardUrl;
  });
}

document.querySelectorAll("[data-logout]").forEach((logout) => {
  logout.addEventListener("click", () => {
    removeStorage(CLIENT_SESSION_KEY);
  });
});

const diagnosisForm = document.querySelector("#diagnosis-form");

if (diagnosisForm) {
  diagnosisForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(diagnosisForm);
    const body = [
      "Hola Noesis,",
      "",
      "Quiero solicitar un diagnostico inicial.",
      "",
      `Nombre: ${formData.get("name") || ""}`,
      `Email: ${formData.get("email") || ""}`,
      `Empresa: ${formData.get("company") || ""}`,
      `Telefono: ${formData.get("phone") || ""}`,
      "",
      "Proceso a revisar:",
      formData.get("message") || ""
    ].join("\n");
    const feedback = document.querySelector("#diagnosis-feedback");
    if (feedback) {
      feedback.textContent = "Perfecto. Se abrir\u00e1 tu correo con la solicitud preparada.";
    }
    window.location.href = `mailto:hola@noesis.studio?subject=${encodeURIComponent("Diagnostico inicial Noesis")}&body=${encodeURIComponent(body)}`;
  });
}

const panelTriggers = document.querySelectorAll("[data-panel-target]");
const clientPanels = document.querySelectorAll(".client-panel[data-panel]");
const clientNavButtons = document.querySelectorAll(".client-nav [data-panel-target]");

function activateClientPanel(panelName) {
  if (!panelName || !clientPanels.length) return;

  clientPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === panelName);
  });

  clientNavButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.panelTarget === panelName);
  });

  if (window.location.hash !== `#${panelName}`) {
    window.history.replaceState(null, "", `#${panelName}`);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

panelTriggers.forEach((trigger) => {
  trigger.addEventListener("click", () => activateClientPanel(trigger.dataset.panelTarget));
});

if (clientPanels.length && window.location.hash) {
  const initialPanel = window.location.hash.replace("#", "");
  if (document.querySelector(`.client-panel[data-panel="${initialPanel}"]`)) {
    activateClientPanel(initialPanel);
  }
}

const translations = {
  es: {
    "nav.summary": "Resumen",
    "nav.billing": "Facturaci\u00f3n",
    "nav.service": "Estado del servicio",
    "nav.support": "Soporte",
    "nav.growth": "Nuevos servicios",
    "sidebar.workspace": "Workspace activo",
    "top.panel": "Panel",
    "top.title": "Control operativo del cliente",
    "top.user": "Usuario:",
    "top.logout": "Cerrar sesi\u00f3n",
    "summary.eyebrow": "Resumen",
    "summary.title": "Tu sistema Noesis, en una sola vista.",
    "summary.body": "Consulta el estado de tu servicio, los pagos, el rendimiento operativo y los siguientes pasos acordados con el equipo Noesis.",
    "summary.activity": "Actividad reciente",
    "summary.act1": "Revisi\u00f3n del flujo de citas y agenda completada.",
    "summary.act2": "Ajuste de criterios para recordatorios y cambios de hora.",
    "summary.act3": "Presupuesto de mantenimiento mensual confirmado.",
    "summary.quick": "Acceso r\u00e1pido",
    "summary.quickBody": "Consulta facturas, revisa el estado del servicio o solicita una nueva mejora operativa.",
    "summary.quickBilling": "Ver facturaci\u00f3n",
    "summary.quickGrowth": "Nueva mejora",
    "kpi.pending": "Pendiente de pago",
    "kpi.pendingNote": "0 factura(s) pendientes",
    "kpi.paid": "Total pagado",
    "kpi.paidNote": "Implementaci\u00f3n inicial completada",
    "kpi.next": "Pr\u00f3xima factura",
    "kpi.nextNote": "Mantenimiento mensual",
    "kpi.contract": "Contrato",
    "kpi.contractValue": "Activo",
    "kpi.contractNote": "Servicio en seguimiento",
    "billing.eyebrow": "Facturaci\u00f3n",
    "billing.title": "Pagos, presupuesto y mantenimiento.",
    "billing.body": "Una vista clara de lo aprobado, lo pagado y los pr\u00f3ximos vencimientos.",
    "billing.budget": "Presupuesto aprobado",
    "billing.impl": "Implementaci\u00f3n inicial",
    "billing.maint": "Mantenimiento mensual",
    "billing.status": "Estado",
    "billing.statusValue": "Pagado",
    "billing.next": "Pr\u00f3ximo vencimiento",
    "billing.docs": "Documentos",
    "billing.invoice1": "Factura implementaci\u00f3n",
    "billing.invoice2": "Factura mantenimiento junio",
    "billing.contractDoc": "Contrato de servicio",
    "service.eyebrow": "Estado del servicio",
    "service.title": "Seguimiento del sistema activo.",
    "service.body": "Visualiza el progreso de configuraci\u00f3n, pruebas, adopci\u00f3n e impacto del sistema contratado.",
    "service.name": "Citas y agenda",
    "service.description": "Sistema para ordenar reservas, recordatorios y cambios de hora con seguimiento medible.",
    "service.config": "Configuraci\u00f3n",
    "service.tests": "Pruebas con casos reales",
    "service.adoption": "Adopci\u00f3n del equipo",
    "service.impact": "Impacto medido",
    "service.next": "Pr\u00f3ximos pasos",
    "service.step1": "Validar criterios de agenda",
    "service.step2": "Probar recordatorios internos",
    "service.step3": "Revisar adopci\u00f3n con el equipo",
    "service.step4": "Emitir informe mensual",
    "support.eyebrow": "Soporte",
    "support.title": "Contacto directo con Noesis.",
    "support.body": "Un canal para resolver dudas, pedir ajustes o dejar constancia de incidencias del servicio.",
    "support.chat": "Chat del proyecto",
    "support.msg1": "Hemos detectado menos revisi\u00f3n manual en los cambios de agenda esta semana.",
    "support.msg2": "Podemos valorar recordatorios por WhatsApp m\u00e1s adelante?",
    "support.msg3": "S\u00ed. Lo pondr\u00edamos como fase 2 y validar\u00edamos coste antes de activarlo.",
    "support.placeholder": "Escribe un mensaje...",
    "support.send": "Enviar",
    "support.channels": "Canales",
    "support.meeting": "Reuni\u00f3n",
    "support.meetingText": "Solicitar revisi\u00f3n mensual",
    "support.issue": "Incidencia",
    "support.issueText": "Registrar un problema del sistema",
    "growth.eyebrow": "Nuevos servicios",
    "growth.title": "Oportunidades para ordenar m\u00e1s procesos.",
    "growth.body": "Propuestas de mejora que podr\u00edan implementarse cuando el sistema actual est\u00e9 consolidado.",
    "growth.card1": "Documentos y facturas",
    "growth.card1Body": "Centralizar recepci\u00f3n de documentos, validaci\u00f3n y preparaci\u00f3n para revisi\u00f3n.",
    "growth.card2": "Flujos internos",
    "growth.card2Body": "Conectar correos, formularios y tareas recurrentes en un circuito con responsables.",
    "growth.card3": "Informe mensual",
    "growth.card3Body": "Resumen de horas recuperadas, incidencias, decisiones y pr\u00f3ximas acciones."
  },
  ca: {
    "nav.summary": "Resum",
    "nav.billing": "Facturaci\u00f3",
    "nav.service": "Estat del servei",
    "nav.support": "Suport",
    "nav.growth": "Nous serveis",
    "sidebar.workspace": "Workspace actiu",
    "top.panel": "Panell",
    "top.title": "Control operatiu del client",
    "top.user": "Usuari:",
    "top.logout": "Tancar sessi\u00f3",
    "summary.eyebrow": "Resum",
    "summary.title": "El teu sistema Noesis, en una sola vista.",
    "summary.body": "Consulta l'estat del servei, els pagaments, el rendiment operatiu i els seg\u00fcents passos acordats amb l'equip Noesis.",
    "summary.activity": "Activitat recent",
    "summary.act1": "Revisi\u00f3 del flux de cites i agenda completada.",
    "summary.act2": "Ajust de criteris per a recordatoris i canvis d'hora.",
    "summary.act3": "Pressupost de manteniment mensual confirmat.",
    "summary.quick": "Acc\u00e9s r\u00e0pid",
    "summary.quickBody": "Consulta factures, revisa l'estat del servei o sol\u00b7licita una nova millora operativa.",
    "summary.quickBilling": "Veure facturaci\u00f3",
    "summary.quickGrowth": "Nova millora",
    "kpi.pending": "Pendent de pagament",
    "kpi.pendingNote": "0 factura(es) pendents",
    "kpi.paid": "Total pagat",
    "kpi.paidNote": "Implementaci\u00f3 inicial completada",
    "kpi.next": "Pr\u00f2xima factura",
    "kpi.nextNote": "Manteniment mensual",
    "kpi.contract": "Contracte",
    "kpi.contractValue": "Actiu",
    "kpi.contractNote": "Servei en seguiment",
    "billing.eyebrow": "Facturaci\u00f3",
    "billing.title": "Pagaments, pressupost i manteniment.",
    "billing.body": "Una vista clara del que s'ha aprovat, del que s'ha pagat i dels pr\u00f2xims venciments.",
    "billing.budget": "Pressupost aprovat",
    "billing.impl": "Implementaci\u00f3 inicial",
    "billing.maint": "Manteniment mensual",
    "billing.status": "Estat",
    "billing.statusValue": "Pagat",
    "billing.next": "Pr\u00f2xim venciment",
    "billing.docs": "Documents",
    "billing.invoice1": "Factura implementaci\u00f3",
    "billing.invoice2": "Factura manteniment juny",
    "billing.contractDoc": "Contracte de servei",
    "service.eyebrow": "Estat del servei",
    "service.title": "Seguiment del sistema actiu.",
    "service.body": "Visualitza el progr\u00e9s de configuraci\u00f3, proves, adopci\u00f3 i impacte del sistema contractat.",
    "service.name": "Cites i agenda",
    "service.description": "Sistema per ordenar reserves, recordatoris i canvis d'hora amb seguiment mesurable.",
    "service.config": "Configuraci\u00f3",
    "service.tests": "Proves amb casos reals",
    "service.adoption": "Adopci\u00f3 de l'equip",
    "service.impact": "Impacte mesurat",
    "service.next": "Pr\u00f2xims passos",
    "service.step1": "Validar criteris d'agenda",
    "service.step2": "Provar recordatoris interns",
    "service.step3": "Revisar adopci\u00f3 amb l'equip",
    "service.step4": "Emetre informe mensual",
    "support.eyebrow": "Suport",
    "support.title": "Contacte directe amb Noesis.",
    "support.body": "Un canal per resoldre dubtes, demanar ajustos o deixar const\u00e0ncia d'incid\u00e8ncies del servei.",
    "support.chat": "Xat del projecte",
    "support.msg1": "Hem detectat menys revisi\u00f3 manual en els canvis d'agenda aquesta setmana.",
    "support.msg2": "Podem valorar recordatoris per WhatsApp m\u00e9s endavant?",
    "support.msg3": "S\u00ed. Ho posar\u00edem com a fase 2 i validar\u00edem cost abans d'activar-ho.",
    "support.placeholder": "Escriu un missatge...",
    "support.send": "Enviar",
    "support.channels": "Canals",
    "support.meeting": "Reuni\u00f3",
    "support.meetingText": "Sol\u00b7licitar revisi\u00f3 mensual",
    "support.issue": "Incid\u00e8ncia",
    "support.issueText": "Registrar un problema del sistema",
    "growth.eyebrow": "Nous serveis",
    "growth.title": "Oportunitats per ordenar m\u00e9s processos.",
    "growth.body": "Propostes de millora que es podrien implementar quan el sistema actual estigui consolidat.",
    "growth.card1": "Documents i factures",
    "growth.card1Body": "Centralitzar recepci\u00f3 de documents, validaci\u00f3 i preparaci\u00f3 per a revisi\u00f3.",
    "growth.card2": "Fluxos interns",
    "growth.card2Body": "Connectar correus, formularis i tasques recurrents en un circuit amb responsables.",
    "growth.card3": "Informe mensual",
    "growth.card3Body": "Resum d'hores recuperades, incid\u00e8ncies, decisions i pr\u00f2ximes accions."
  },
  en: {
    "nav.summary": "Overview",
    "nav.billing": "Billing",
    "nav.service": "Service status",
    "nav.support": "Support",
    "nav.growth": "New services",
    "sidebar.workspace": "Active workspace",
    "top.panel": "Panel",
    "top.title": "Client operating control",
    "top.user": "User:",
    "top.logout": "Log out",
    "summary.eyebrow": "Overview",
    "summary.title": "Your Noesis system in one view.",
    "summary.body": "Check service status, payments, operating performance and the next steps agreed with the Noesis team.",
    "summary.activity": "Recent activity",
    "summary.act1": "Appointments and calendar flow review completed.",
    "summary.act2": "Criteria adjusted for reminders and rescheduling.",
    "summary.act3": "Monthly maintenance budget confirmed.",
    "summary.quick": "Quick access",
    "summary.quickBody": "Review invoices, check service status or request a new operational improvement.",
    "summary.quickBilling": "View billing",
    "summary.quickGrowth": "New improvement",
    "kpi.pending": "Pending payment",
    "kpi.pendingNote": "0 pending invoice(s)",
    "kpi.paid": "Total paid",
    "kpi.paidNote": "Initial implementation completed",
    "kpi.next": "Next invoice",
    "kpi.nextNote": "Monthly maintenance",
    "kpi.contract": "Contract",
    "kpi.contractValue": "Active",
    "kpi.contractNote": "Service under monitoring",
    "billing.eyebrow": "Billing",
    "billing.title": "Payments, budget and maintenance.",
    "billing.body": "A clear view of what has been approved, paid and scheduled.",
    "billing.budget": "Approved budget",
    "billing.impl": "Initial implementation",
    "billing.maint": "Monthly maintenance",
    "billing.status": "Status",
    "billing.statusValue": "Paid",
    "billing.next": "Next due date",
    "billing.docs": "Documents",
    "billing.invoice1": "Implementation invoice",
    "billing.invoice2": "June maintenance invoice",
    "billing.contractDoc": "Service contract",
    "service.eyebrow": "Service status",
    "service.title": "Active system monitoring.",
    "service.body": "Track configuration, testing, adoption and impact of the contracted system.",
    "service.name": "Appointments and calendar",
    "service.description": "A system for organizing bookings, reminders and rescheduling with measurable follow-up.",
    "service.config": "Configuration",
    "service.tests": "Real-case testing",
    "service.adoption": "Team adoption",
    "service.impact": "Measured impact",
    "service.next": "Next steps",
    "service.step1": "Validate calendar criteria",
    "service.step2": "Test internal reminders",
    "service.step3": "Review team adoption",
    "service.step4": "Issue monthly report",
    "support.eyebrow": "Support",
    "support.title": "Direct contact with Noesis.",
    "support.body": "A channel to resolve questions, request adjustments or record service incidents.",
    "support.chat": "Project chat",
    "support.msg1": "We have detected less manual review in calendar changes this week.",
    "support.msg2": "Can we consider WhatsApp reminders later on?",
    "support.msg3": "Yes. We would place it in phase 2 and validate cost before activation.",
    "support.placeholder": "Write a message...",
    "support.send": "Send",
    "support.channels": "Channels",
    "support.meeting": "Meeting",
    "support.meetingText": "Request monthly review",
    "support.issue": "Incident",
    "support.issueText": "Report a system issue",
    "growth.eyebrow": "New services",
    "growth.title": "Opportunities to organize more processes.",
    "growth.body": "Improvement proposals that could be implemented once the current system is consolidated.",
    "growth.card1": "Documents and invoices",
    "growth.card1Body": "Centralize document intake, validation and preparation for review.",
    "growth.card2": "Internal workflows",
    "growth.card2Body": "Connect emails, forms and recurring tasks in a circuit with clear owners.",
    "growth.card3": "Monthly report",
    "growth.card3Body": "Summary of recovered hours, incidents, decisions and next actions."
  }
};

const languageButtons = document.querySelectorAll("[data-lang]");
const translatedNodes = document.querySelectorAll("[data-i18n]");
const translatedPlaceholders = document.querySelectorAll("[data-i18n-placeholder]");

function setPortalLanguage(language) {
  const dictionary = translations[language];
  if (!dictionary) return;

  document.documentElement.lang = language;

  translatedNodes.forEach((node) => {
    const key = node.dataset.i18n;
    if (dictionary[key]) node.textContent = dictionary[key];
  });

  translatedPlaceholders.forEach((node) => {
    const key = node.dataset.i18nPlaceholder;
    if (dictionary[key]) node.setAttribute("placeholder", dictionary[key]);
  });

  languageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === language);
  });
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => setPortalLanguage(button.dataset.lang));
});

const supportSend = document.querySelector("[data-support-send]");
const supportInput = document.querySelector("[data-support-input]");

if (supportSend && supportInput) {
  supportSend.addEventListener("click", () => {
    const message = supportInput.value.trim();
    if (!message) {
      supportInput.focus();
      return;
    }

    const thread = document.querySelector(".chat-thread");
    if (thread) {
      const bubble = document.createElement("div");
      bubble.className = "chat-message user";
      bubble.textContent = message;
      thread.appendChild(bubble);
    }

    supportInput.value = "";
    window.location.href = `mailto:hola@noesis.studio?subject=${encodeURIComponent("Soporte cliente Noesis")}&body=${encodeURIComponent(message)}`;
  });
}

if (
  !readStorage(PRIVACY_NOTICE_KEY) &&
  !document.body.classList.contains("client-area-body") &&
  !document.body.classList.contains("portal-entry-body")
) {
  const notice = document.createElement("aside");
  notice.className = "cookie-notice";
  notice.setAttribute("aria-label", "Aviso de privacidad");
  notice.innerHTML = `
    <p>Noesis utiliza almacenamiento t&eacute;cnico para recordar preferencias y habilitar la sesi&oacute;n demo. No usamos anal&iacute;tica ni publicidad en esta versi&oacute;n. <a href="cookies.html">Ver pol&iacute;tica</a>.</p>
    <button class="button primary compact" type="button">Entendido</button>
  `;
  document.body.appendChild(notice);
  notice.querySelector("button").addEventListener("click", () => {
    writeStorage(PRIVACY_NOTICE_KEY, "accepted");
    notice.remove();
  });
}
