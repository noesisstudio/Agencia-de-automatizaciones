const form = document.querySelector("#formulario");
const proposalOutput = document.querySelector("[data-proposal-output]");
const promptOutput = document.querySelector("[data-prompt-output]");
const feedback = document.querySelector("[data-feedback]");
const copyProposalButton = document.querySelector("[data-copy-proposal]");
const copyPromptButton = document.querySelector("[data-copy-prompt]");
const loadDemoButton = document.querySelector("[data-load-demo]");

const i18n = {
  es: {
    title: "Propuesta operativa Noesis",
    context: "Contexto y diagnóstico inicial",
    solution: "La solución propuesta",
    method: "Metodología de trabajo",
    investment: "Inversión estimada",
    next: "Siguientes pasos",
    implementation: "Implementación",
    maintenance: "Mantenimiento mensual",
    validity: "Validez",
    preparedFor: "Preparado para",
    contact: "Contacto",
    sector: "Sector",
    duration: "Duración estimada",
    agencyBrief: "Ficha interna de agencia",
    clientProposal: "Propuesta para cliente",
    nextAction: "Próxima acción"
  },
  ca: {
    title: "Proposta operativa Noesis",
    context: "Context i diagnosi inicial",
    solution: "La solució proposada",
    method: "Metodologia de treball",
    investment: "Inversió estimada",
    next: "Següents passos",
    implementation: "Implementació",
    maintenance: "Manteniment mensual",
    validity: "Validesa",
    preparedFor: "Preparat per a",
    contact: "Contacte",
    sector: "Sector",
    duration: "Durada estimada",
    agencyBrief: "Fitxa interna d'agència",
    clientProposal: "Proposta per al client",
    nextAction: "Pròxima acció"
  },
  en: {
    title: "Noesis operating proposal",
    context: "Context and initial diagnosis",
    solution: "Proposed solution",
    method: "Working methodology",
    investment: "Estimated investment",
    next: "Next steps",
    implementation: "Implementation",
    maintenance: "Monthly maintenance",
    validity: "Validity",
    preparedFor: "Prepared for",
    contact: "Contact",
    sector: "Sector",
    duration: "Estimated duration",
    agencyBrief: "Internal agency brief",
    clientProposal: "Client proposal",
    nextAction: "Next action"
  }
};

const demoData = {
  company: "Clínica Norte",
  contact: "Marta Soler",
  sector: "Clínica dental",
  language: "es",
  stage: "Diagnóstico solicitado",
  source: "Web Noesis",
  owner: "Xavier / Noesis",
  priority: "Alta",
  currentProcess:
    "Gestionan citas, cambios de hora y preguntas frecuentes por teléfono y WhatsApp. La información queda repartida entre conversaciones, agenda y notas internas.",
  problem:
    "La recepción dedica más de 2 horas al día a confirmar citas, responder preguntas repetidas y perseguir huecos cancelados. Esto genera retrasos, errores de seguimiento y poca visibilidad del estado real.",
  service: "Chatbot con IA",
  goal: "Reducir seguimiento manual, ordenar solicitudes entrantes y medir el impacto mensual",
  tools: "WhatsApp, teléfono, Google Calendar y hojas internas",
  successMetric: "Reducir 25-35 horas mensuales de revisión manual",
  deliverables:
    "Diagnóstico operativo, mapa del flujo, chatbot inicial, base de conocimiento, pruebas con casos reales, documentación básica, dashboard de seguimiento y soporte mensual.",
  outOfScope:
    "Migración histórica de conversaciones, integraciones no comunicadas y cambios de alcance después de validar la propuesta.",
  implementationMin: "1400",
  implementationMax: "2600",
  monthlyMin: "220",
  monthlyMax: "420",
  duration: "2-4 semanas",
  validity: "30 días",
  nextAction: "Enviar propuesta y agendar reunión de validación de alcance"
};

let currentProposalText = "";
let currentPromptText = "";

function money(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(amount);
}

function getFormData() {
  return Object.fromEntries(new FormData(form).entries());
}

function validate(data) {
  const requiredFields = [
    "company",
    "sector",
    "owner",
    "currentProcess",
    "problem",
    "goal",
    "successMetric",
    "deliverables",
    "implementationMin",
    "implementationMax",
    "monthlyMin",
    "monthlyMax",
    "duration",
    "validity",
    "nextAction"
  ];

  return requiredFields.every((field) => String(data[field] || "").trim());
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildProposalHtml(data) {
  const copy = i18n[data.language] || i18n.es;
  const contact = data.contact || "Pendiente de confirmar";
  const tools = data.tools || "Herramientas pendientes de confirmar";
  const outOfScope = data.outOfScope || "Cualquier ampliación no descrita se valorará por separado.";

  return `
    <header>
      <p class="eyebrow">Noesis · Base comercial de agencia</p>
      <h1>${copy.title}</h1>
      <dl>
        <div><dt>${copy.preparedFor}</dt><dd>${escapeHtml(data.company)}</dd></div>
        <div><dt>${copy.contact}</dt><dd>${escapeHtml(contact)}</dd></div>
        <div><dt>${copy.sector}</dt><dd>${escapeHtml(data.sector)}</dd></div>
        <div><dt>${copy.duration}</dt><dd>${escapeHtml(data.duration)}</dd></div>
      </dl>
    </header>

    <section>
      <h2>${copy.agencyBrief}</h2>
      <div class="agency-grid">
        <article><span>Estado</span><strong>${escapeHtml(data.stage)}</strong></article>
        <article><span>Origen</span><strong>${escapeHtml(data.source)}</strong></article>
        <article><span>Responsable</span><strong>${escapeHtml(data.owner)}</strong></article>
        <article><span>Prioridad</span><strong>${escapeHtml(data.priority)}</strong></article>
      </div>
      <p><strong>${copy.nextAction}:</strong> ${escapeHtml(data.nextAction)}</p>
    </section>

    <section>
      <h2>${copy.context}</h2>
      <p>${escapeHtml(data.company)} trabaja actualmente con este proceso: ${escapeHtml(data.currentProcess)}</p>
      <p>Durante el diagnóstico inicial hemos detectado una fricción principal: ${escapeHtml(data.problem)}</p>
      <p><strong>Herramientas actuales:</strong> ${escapeHtml(tools)}</p>
    </section>

    <section>
      <h2>${copy.solution}</h2>
      <p>Proponemos diseñar e implementar un sistema de <strong>${escapeHtml(data.service)}</strong> orientado a ${escapeHtml(data.goal)}.</p>
      <ul>
        <li>Ordenar la información dispersa en un flujo visible.</li>
        <li>Reducir seguimiento manual y tareas repetitivas.</li>
        <li>Dejar trazabilidad sobre qué ocurre, qué falta y quién decide.</li>
        <li>Medir el impacto con indicadores sencillos.</li>
      </ul>
    </section>

    <section>
      <h2>Alcance operativo</h2>
      <p><strong>Incluido:</strong> ${escapeHtml(data.deliverables)}</p>
      <p><strong>No incluido:</strong> ${escapeHtml(outOfScope)}</p>
      <p><strong>Indicador de éxito:</strong> ${escapeHtml(data.successMetric)}</p>
    </section>

    <section>
      <h2>${copy.method}</h2>
      <ol>
        <li>Observamos el proceso real y las herramientas actuales.</li>
        <li>Cuantificamos horas recuperables, errores evitables e impacto potencial.</li>
        <li>Diseñamos reglas, campos, responsables y estados.</li>
        <li>Implementamos un piloto acotado con casos reales.</li>
        <li>Medimos resultados y decidimos si mantener, ajustar o ampliar.</li>
      </ol>
    </section>

    <section>
      <h2>${copy.investment}</h2>
      <div class="investment-grid">
        <article class="investment-card">
          <span>${copy.implementation}</span>
          <strong>${money(data.implementationMin)} - ${money(data.implementationMax)}</strong>
        </article>
        <article class="investment-card">
          <span>${copy.maintenance}</span>
          <strong>${money(data.monthlyMin)} - ${money(data.monthlyMax)}</strong>
        </article>
      </div>
      <p>${copy.validity}: ${escapeHtml(data.validity)}. Cualquier ampliación de alcance se valorará por separado.</p>
    </section>

    <section>
      <h2>${copy.next}</h2>
      <p>El siguiente paso recomendado es una reunión de diagnóstico operativo para validar alcance, prioridades, calendario y responsables antes de iniciar la implementación.</p>
    </section>
  `;
}

function buildProposalText(data) {
  return proposalOutput.innerText.trim();
}

function buildPrompt(data) {
  return `Actúa como Noesis, una agencia de arquitectura operativa y automatización para empresas.

Redacta una propuesta/presupuesto profesional, claro y personalizado en idioma: ${data.language}.
La propuesta debe servir para vender este servicio a una empresa cliente, manteniendo un tono consultivo y sobrio.

Datos del cliente:
- Empresa: ${data.company}
- Persona de contacto: ${data.contact || "No indicada"}
- Sector: ${data.sector}
- Estado comercial interno: ${data.stage}
- Origen de la oportunidad: ${data.source}
- Responsable interno Noesis: ${data.owner}
- Prioridad: ${data.priority}
- Proceso actual: ${data.currentProcess}
- Problema principal: ${data.problem}
- Herramientas actuales: ${data.tools || "Pendientes de confirmar"}
- Servicio recomendado: ${data.service}
- Objetivo principal: ${data.goal}
- Entregables incluidos: ${data.deliverables}
- Fuera de alcance: ${data.outOfScope || "Cualquier ampliación no descrita se valorará por separado."}
- Indicador de éxito: ${data.successMetric}
- Duración estimada: ${data.duration}
- Implementación estimada: ${money(data.implementationMin)} - ${money(data.implementationMax)}
- Mantenimiento mensual estimado: ${money(data.monthlyMin)} - ${money(data.monthlyMax)}
- Validez del presupuesto: ${data.validity}
- Próxima acción comercial: ${data.nextAction}

Estructura obligatoria:
1. Contexto y diagnóstico inicial: reconoce el problema del cliente y explica el coste real de esa fricción.
2. La solución propuesta: describe el sistema digital adaptado al sector.
3. Alcance del proyecto: incluido, no incluido y entregables concretos.
4. Metodología de trabajo: Observamos, Cuantificamos, Diseñamos, Implementamos y Medimos.
5. Inversión estimada: desglosa implementación, mantenimiento y condiciones.
6. Siguientes pasos: indica la próxima acción comercial.

Tono:
- Claro, sobrio y consultivo.
- Sin promesas exageradas.
- Estilo Noesis: procesos claros, tiempo recuperado y control operativo.
- Evita tecnicismos innecesarios.
- Debe sonar como una agencia preparada para trabajar con muchas empresas, no como un experimento aislado.`;
}

function renderProposal() {
  const data = getFormData();

  if (!validate(data)) {
    feedback.textContent = "Completa los campos obligatorios antes de generar la propuesta.";
    return;
  }

  proposalOutput.innerHTML = buildProposalHtml(data);
  currentProposalText = buildProposalText(data);
  currentPromptText = buildPrompt(data);
  promptOutput.value = currentPromptText;
  feedback.textContent = "Base de agencia generada correctamente.";
}

async function copyText(text, successMessage) {
  if (!text) {
    feedback.textContent = "Primero genera una base de agencia.";
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    feedback.textContent = successMessage;
  } catch (error) {
    feedback.textContent = "No se ha podido copiar automáticamente. Selecciona el texto manualmente.";
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderProposal();
});

form.addEventListener("reset", () => {
  window.setTimeout(() => {
    proposalOutput.innerHTML = '<p class="empty-state">Rellena la oportunidad y pulsa “Generar base agencia”.</p>';
    promptOutput.value = "Genera primero una base de agencia para activar el prompt.";
    currentProposalText = "";
    currentPromptText = "";
    feedback.textContent = "";
  }, 0);
});

copyProposalButton.addEventListener("click", () => {
  copyText(currentProposalText, "Base de agencia copiada.");
});

copyPromptButton.addEventListener("click", () => {
  copyText(currentPromptText, "Prompt copiado.");
});

loadDemoButton.addEventListener("click", () => {
  Object.entries(demoData).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) field.value = value;
  });
  renderProposal();
});
