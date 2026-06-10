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
const WEB3FORMS_ACCESS_KEY = "c0e13644-9a7a-4dc6-8920-6055afcd351a";

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
    link.href = "iniciar-sesion.html";
    link.textContent = "Iniciar sesi\u00f3n";
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
  diagnosisForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(diagnosisForm);
    const feedback = document.querySelector("#diagnosis-feedback");
    const submitButton = diagnosisForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "";

    formData.append("access_key", WEB3FORMS_ACCESS_KEY);
    formData.append("subject", "Diagnostico inicial Noesis");
    formData.append("from_name", "Formulario web Noesis");

    if (feedback) {
      feedback.textContent = "Enviando solicitud...";
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";
    }

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error("No se ha podido enviar el formulario.");
      }

      diagnosisForm.reset();

      if (feedback) {
        feedback.textContent = "Solicitud enviada correctamente. Te responderemos lo antes posible.";
      }
    } catch (error) {
      if (feedback) {
        feedback.textContent = "No se ha podido enviar ahora mismo. Escríbenos a info@bynoesis.com.";
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
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
    "summary.act1": "Revisi\u00f3n del flujo de chatbot y respuestas frecuentes completada.",
    "summary.act2": "Ajuste de criterios para leads, email y mensajes de WhatsApp.",
    "summary.act3": "Presupuesto de mantenimiento mensual confirmado.",
    "summary.quick": "Acceso r\u00e1pido",
    "summary.quickBody": "Consulta facturas, revisa el estado del servicio o solicita una nueva mejora operativa.",
    "summary.quickBilling": "Ver facturaci\u00f3n",
    "summary.quickService": "Ver servicio",
    "summary.quickGrowth": "Nueva mejora",
    "summary.systems": "Sistemas conectados",
    "kpi.pending": "Pendiente de pago",
    "kpi.pendingNote": "1 factura pendiente",
    "kpi.paid": "Total pagado",
    "kpi.paidNote": "Implementaci\u00f3n inicial completada",
    "kpi.next": "Pr\u00f3xima factura",
    "kpi.nextNote": "Mantenimiento mensual",
    "kpi.contract": "Contrato",
    "kpi.contractValue": "Activo",
    "kpi.contractNote": "Servicio en seguimiento",
    "billing.eyebrow": "Facturaci\u00f3n",
    "billing.title": "Acuerdos, alcance y mantenimiento.",
    "billing.body": "Una vista clara de lo aprobado, lo pendiente y los pr\u00f3ximos pasos del servicio.",
    "billing.budget": "Alcance aprobado",
    "billing.impl": "Implementaci\u00f3n inicial",
    "billing.maint": "Mantenimiento mensual",
    "billing.status": "Estado",
    "billing.statusValue": "Implementaci\u00f3n activa, revisi\u00f3n pendiente",
    "billing.next": "Pr\u00f3ximo vencimiento",
    "billing.docs": "Documentos",
    "billing.invoice1": "Factura implementaci\u00f3n",
    "billing.invoice2": "Factura mantenimiento junio",
    "billing.contractDoc": "Contrato de servicio",
    "billing.paid": "Pagada",
    "billing.pending": "Pendiente",
    "billing.active": "Activo",
    "billing.plan": "Plan contratado",
    "billing.plan1": "Diagn\u00f3stico y mapa operativo",
    "billing.plan1Body": "Proceso revisado, alcance del piloto y responsables definidos.",
    "billing.plan2": "Automatizaci\u00f3n inicial",
    "billing.plan2Body": "Flujo activo con pruebas, ajustes y documentaci\u00f3n b\u00e1sica.",
    "billing.plan3": "Soporte mensual",
    "billing.plan3Body": "Monitorizaci\u00f3n, peque\u00f1os ajustes e informe de seguimiento.",
    "service.eyebrow": "Estado del servicio",
    "service.title": "Seguimiento del sistema activo.",
    "service.body": "Visualiza el progreso de configuraci\u00f3n, pruebas, adopci\u00f3n e impacto del sistema contratado.",
    "service.name": "Chatbot, leads y seguimiento comercial",
    "service.description": "Sistema para responder preguntas frecuentes, ordenar solicitudes entrantes y activar recordatorios comerciales con seguimiento medible.",
    "service.config": "Configuraci\u00f3n",
    "service.tests": "Pruebas con casos reales",
    "service.adoption": "Adopci\u00f3n del equipo",
    "service.impact": "Impacto medido",
    "service.next": "Pr\u00f3ximos pasos",
    "service.step1": "Validar documentaci\u00f3n del chatbot",
    "service.step2": "Probar alertas internas de leads",
    "service.step3": "Revisar adopci\u00f3n con el equipo",
    "service.step4": "Emitir informe mensual",
    "service.module1": "Chatbot web",
    "service.module1Body": "Respuestas con FAQs, condiciones internas y documentaci\u00f3n validada.",
    "service.module2": "Leads",
    "service.module2Body": "Registro, prioridad, asignaci\u00f3n y recordatorios autom\u00e1ticos.",
    "service.module3": "Email",
    "service.module3Body": "Clasificaci\u00f3n, borradores asistidos y extracci\u00f3n de datos.",
    "support.eyebrow": "Soporte",
    "support.title": "Contacto directo con Noesis.",
    "support.body": "Un canal para resolver dudas, pedir ajustes o dejar constancia de incidencias del servicio.",
    "support.chat": "Chat del proyecto",
    "support.msg1": "Hemos detectado menos revisi\u00f3n manual en la clasificaci\u00f3n de leads esta semana.",
    "support.msg2": "Podemos valorar propuestas por WhatsApp m\u00e1s adelante?",
    "support.msg3": "S\u00ed. Lo pondr\u00edamos como fase 2 y validar\u00edamos alcance antes de activarlo.",
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
    "growth.card2": "Presupuestos por WhatsApp",
    "growth.card2Body": "Convertir conversaciones entrantes en propuestas estructuradas listas para revisar.",
    "growth.card3": "Citas y agenda",
    "growth.card3Body": "Reservas, recordatorios, cambios de hora y sincronizaci\u00f3n con calendarios.",
    "growth.card4": "Informe mensual",
    "growth.card4Body": "Resumen de horas recuperadas, incidencias, decisiones y pr\u00f3ximas acciones."
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
    "summary.act1": "Revisi\u00f3 del flux de chatbot i respostes freq\u00fcents completada.",
    "summary.act2": "Ajust de criteris per a leads, email i missatges de WhatsApp.",
    "summary.act3": "Pressupost de manteniment mensual confirmat.",
    "summary.quick": "Acc\u00e9s r\u00e0pid",
    "summary.quickBody": "Consulta factures, revisa l'estat del servei o sol\u00b7licita una nova millora operativa.",
    "summary.quickBilling": "Veure facturaci\u00f3",
    "summary.quickService": "Veure servei",
    "summary.quickGrowth": "Nova millora",
    "summary.systems": "Sistemes connectats",
    "kpi.pending": "Pendent de pagament",
    "kpi.pendingNote": "1 factura pendent",
    "kpi.paid": "Total pagat",
    "kpi.paidNote": "Implementaci\u00f3 inicial completada",
    "kpi.next": "Pr\u00f2xima factura",
    "kpi.nextNote": "Manteniment mensual",
    "kpi.contract": "Contracte",
    "kpi.contractValue": "Actiu",
    "kpi.contractNote": "Servei en seguiment",
    "billing.eyebrow": "Facturaci\u00f3",
    "billing.title": "Acords, abast i manteniment.",
    "billing.body": "Una vista clara del que s'ha aprovat, del que queda pendent i dels pr\u00f2xims passos del servei.",
    "billing.budget": "Abast aprovat",
    "billing.impl": "Implementaci\u00f3 inicial",
    "billing.maint": "Manteniment mensual",
    "billing.status": "Estat",
    "billing.statusValue": "Implementaci\u00f3 activa, revisi\u00f3 pendent",
    "billing.next": "Pr\u00f2xim venciment",
    "billing.docs": "Documents",
    "billing.invoice1": "Factura implementaci\u00f3",
    "billing.invoice2": "Factura manteniment juny",
    "billing.contractDoc": "Contracte de servei",
    "billing.paid": "Pagada",
    "billing.pending": "Pendent",
    "billing.active": "Actiu",
    "billing.plan": "Pla contractat",
    "billing.plan1": "Diagn\u00f2stic i mapa operatiu",
    "billing.plan1Body": "Proc\u00e9s revisat, abast del pilot i responsables definits.",
    "billing.plan2": "Automatitzaci\u00f3 inicial",
    "billing.plan2Body": "Flux actiu amb proves, ajustos i documentaci\u00f3 b\u00e0sica.",
    "billing.plan3": "Suport mensual",
    "billing.plan3Body": "Monitoratge, petits ajustos i informe de seguiment.",
    "service.eyebrow": "Estat del servei",
    "service.title": "Seguiment del sistema actiu.",
    "service.body": "Visualitza el progr\u00e9s de configuraci\u00f3, proves, adopci\u00f3 i impacte del sistema contractat.",
    "service.name": "Chatbot, leads i seguiment comercial",
    "service.description": "Sistema per respondre preguntes freq\u00fcents, ordenar sol\u00b7licituds entrants i activar recordatoris comercials amb seguiment mesurable.",
    "service.config": "Configuraci\u00f3",
    "service.tests": "Proves amb casos reals",
    "service.adoption": "Adopci\u00f3 de l'equip",
    "service.impact": "Impacte mesurat",
    "service.next": "Pr\u00f2xims passos",
    "service.step1": "Validar documentaci\u00f3 del chatbot",
    "service.step2": "Provar alertes internes de leads",
    "service.step3": "Revisar adopci\u00f3 amb l'equip",
    "service.step4": "Emetre informe mensual",
    "service.module1": "Chatbot web",
    "service.module1Body": "Respostes amb FAQs, condicions internes i documentaci\u00f3 validada.",
    "service.module2": "Leads",
    "service.module2Body": "Registre, prioritat, assignaci\u00f3 i recordatoris autom\u00e0tics.",
    "service.module3": "Email",
    "service.module3Body": "Classificaci\u00f3, esborranys assistits i extracci\u00f3 de dades.",
    "support.eyebrow": "Suport",
    "support.title": "Contacte directe amb Noesis.",
    "support.body": "Un canal per resoldre dubtes, demanar ajustos o deixar const\u00e0ncia d'incid\u00e8ncies del servei.",
    "support.chat": "Xat del projecte",
    "support.msg1": "Hem detectat menys revisi\u00f3 manual en la classificaci\u00f3 de leads aquesta setmana.",
    "support.msg2": "Podem valorar propostes per WhatsApp m\u00e9s endavant?",
    "support.msg3": "S\u00ed. Ho posar\u00edem com a fase 2 i validar\u00edem abast abans d'activar-ho.",
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
    "growth.card2": "Pressupostos per WhatsApp",
    "growth.card2Body": "Convertir converses entrants en propostes estructurades llestes per revisar.",
    "growth.card3": "Cites i agenda",
    "growth.card3Body": "Reserves, recordatoris, canvis d'hora i sincronitzaci\u00f3 amb calendaris.",
    "growth.card4": "Informe mensual",
    "growth.card4Body": "Resum d'hores recuperades, incid\u00e8ncies, decisions i pr\u00f2ximes accions."
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
    "summary.act1": "Chatbot flow and FAQ review completed.",
    "summary.act2": "Criteria adjusted for leads, email and WhatsApp messages.",
    "summary.act3": "Monthly maintenance budget confirmed.",
    "summary.quick": "Quick access",
    "summary.quickBody": "Review invoices, check service status or request a new operational improvement.",
    "summary.quickBilling": "View billing",
    "summary.quickService": "View service",
    "summary.quickGrowth": "New improvement",
    "summary.systems": "Connected systems",
    "kpi.pending": "Pending payment",
    "kpi.pendingNote": "1 pending invoice",
    "kpi.paid": "Total paid",
    "kpi.paidNote": "Initial implementation completed",
    "kpi.next": "Next invoice",
    "kpi.nextNote": "Monthly maintenance",
    "kpi.contract": "Contract",
    "kpi.contractValue": "Active",
    "kpi.contractNote": "Service under monitoring",
    "billing.eyebrow": "Billing",
    "billing.title": "Agreements, scope and maintenance.",
    "billing.body": "A clear view of what has been approved, what is pending and the next service steps.",
    "billing.budget": "Approved scope",
    "billing.impl": "Initial implementation",
    "billing.maint": "Monthly maintenance",
    "billing.status": "Status",
    "billing.statusValue": "Implementation active, review pending",
    "billing.next": "Next due date",
    "billing.docs": "Documents",
    "billing.invoice1": "Implementation invoice",
    "billing.invoice2": "June maintenance invoice",
    "billing.contractDoc": "Service contract",
    "billing.paid": "Paid",
    "billing.pending": "Pending",
    "billing.active": "Active",
    "billing.plan": "Contracted plan",
    "billing.plan1": "Diagnosis and operating map",
    "billing.plan1Body": "Reviewed process, pilot scope and owners defined.",
    "billing.plan2": "Initial automation",
    "billing.plan2Body": "Active workflow with tests, adjustments and basic documentation.",
    "billing.plan3": "Monthly support",
    "billing.plan3Body": "Monitoring, small adjustments and progress report.",
    "service.eyebrow": "Service status",
    "service.title": "Active system monitoring.",
    "service.body": "Track configuration, testing, adoption and impact of the contracted system.",
    "service.name": "Chatbot, leads and commercial follow-up",
    "service.description": "A system to answer FAQs, organize incoming requests and activate commercial reminders with measurable follow-up.",
    "service.config": "Configuration",
    "service.tests": "Real-case testing",
    "service.adoption": "Team adoption",
    "service.impact": "Measured impact",
    "service.next": "Next steps",
    "service.step1": "Validate chatbot documentation",
    "service.step2": "Test internal lead alerts",
    "service.step3": "Review team adoption",
    "service.step4": "Issue monthly report",
    "service.module1": "Web chatbot",
    "service.module1Body": "Answers with FAQs, internal conditions and validated documentation.",
    "service.module2": "Leads",
    "service.module2Body": "Capture, priority, assignment and automatic reminders.",
    "service.module3": "Email",
    "service.module3Body": "Classification, assisted drafts and data extraction.",
    "support.eyebrow": "Support",
    "support.title": "Direct contact with Noesis.",
    "support.body": "A channel to resolve questions, request adjustments or record service incidents.",
    "support.chat": "Project chat",
    "support.msg1": "We have detected less manual review in lead classification this week.",
    "support.msg2": "Can we consider WhatsApp proposals later on?",
    "support.msg3": "Yes. We would place it in phase 2 and validate scope before activation.",
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
    "growth.card2": "WhatsApp quotes",
    "growth.card2Body": "Turn incoming conversations into structured proposals ready for review.",
    "growth.card3": "Appointments and calendar",
    "growth.card3Body": "Bookings, reminders, rescheduling and calendar synchronization.",
    "growth.card4": "Monthly report",
    "growth.card4Body": "Summary of recovered hours, incidents, decisions and next actions."
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

async function getSupportReplyEmail() {
  try {
    if (typeof noesisSupabase !== "undefined" && noesisSupabase?.auth) {
      const { data } = await noesisSupabase.auth.getUser();
      if (data?.user?.email) {
        return data.user.email;
      }
    }
  } catch (error) {
    // The support message can still be sent without session metadata.
  }

  return "info@bynoesis.com";
}

if (supportSend && supportInput) {
  supportSend.addEventListener("click", async () => {
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

    try {
      const formData = new FormData();
      formData.append("access_key", WEB3FORMS_ACCESS_KEY);
      formData.append("subject", "Soporte cliente Noesis");
      formData.append("from_name", "Portal cliente Noesis");
      formData.append("email", await getSupportReplyEmail());
      formData.append("message", message);

      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error("No se ha podido enviar el mensaje.");
      }
    } catch (error) {
      const thread = document.querySelector(".chat-thread");
      if (thread) {
        const bubble = document.createElement("div");
        bubble.className = "chat-message system";
        bubble.textContent = "No se ha podido enviar ahora mismo. Escribenos a info@bynoesis.com.";
        thread.appendChild(bubble);
      }
    }
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
