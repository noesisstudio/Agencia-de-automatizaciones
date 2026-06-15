# Guía completa de chatbots web para agencia de automatizaciones

> Documento interno de referencia · Versión 1.0 · Junio 2026

---

## Índice

1. [Decisión previa: Bot A vs Bot B](#1-decisión-previa-bot-a-vs-bot-b)
2. [A quién le vendes cada bot](#2-a-quién-le-vendes-cada-bot)
3. [Arquitectura técnica del Bot A — flujos predefinidos](#3-arquitectura-técnica-del-bot-a--flujos-predefinidos)
4. [Arquitectura técnica del Bot B — con IA](#4-arquitectura-técnica-del-bot-b--con-ia)
5. [Marco legal completo](#5-marco-legal-completo)
6. [Documentos legales que necesitas](#6-documentos-legales-que-necesitas)
7. [Precios y modelo de negocio](#7-precios-y-modelo-de-negocio)
8. [Checklist antes de entregar a un cliente](#8-checklist-antes-de-entregar-a-un-cliente)

---

## 1. Decisión previa: Bot A vs Bot B

Antes de empezar cualquier proyecto con un cliente, necesitas saber qué tipo de bot vas a montar. La pregunta que defines en la reunión de prospección es una sola:

> **"¿Las preguntas que te hacen tus clientes son siempre las mismas, o cada persona pregunta algo diferente?"**

- Respuesta **"siempre las mismas"** → **Bot A** (flujos predefinidos)
- Respuesta **"depende mucho de cada cliente"** → **Bot B** (con IA)

### Comparativa rápida

| Característica | Bot A | Bot B |
|---|---|---|
| Lógica principal | Árbol de decisión fijo | Motor LLM + RAG |
| Entiende lenguaje libre | No | Sí |
| Coste operativo mensual | ~5 €/mes (solo hosting) | 30–80 €/mes (hosting + API IA) |
| Coste por conversación | ~0 € | ~0,002–0,01 € |
| Tiempo de setup | 1–2 días | 3–5 días |
| Actualizar contenido | Editar el árbol manualmente | Subir un documento nuevo |
| Apto para catálogos grandes | No | Sí |
| Riesgo de información incorrecta | Bajo (tú controlas cada respuesta) | Medio (la IA puede alucinar) |
| Precio que cobras (setup) | 600–1.000 € | 1.200–2.500 € |
| Mantenimiento mensual | 100–200 €/mes | 200–400 €/mes |

---

## 2. A quién le vendes cada bot

### Bot A — clientes ideales

**Clínicas y centros de salud / dental / estética**
Su problema principal es el teléfono saturado con preguntas repetidas: horarios, precios de tratamientos, cómo pedir cita, si trabajan con seguros. El bot A resuelve el 80 % de esas llamadas sin necesidad de IA. Argumento de venta: "Dejas de pagar a alguien para contestar siempre lo mismo."

**Restaurantes y bares con delivery o reservas**
Preguntas siempre iguales: carta, alérgenos, horario, zona de reparto, cómo reservar. Especialmente útil si tienen pedidos propios fuera de Glovo o Uber Eats.

**Academias, autoescuelas y centros de formación**
Preguntas sobre cursos, precios, fechas de inicio, cómo matricularse. El flujo es siempre el mismo. Muchas no tienen ningún empleado dedicado a consultas digitales.

**Negocios de servicios locales con precio fijo**
Fontaneros, electricistas, empresas de limpieza, gestorías pequeñas. Necesitan estar disponibles 24 h cuando alguien llega a su web a las 11 de la noche.

**Tiendas físicas con web informativa**
Horarios, ubicación, aparcamiento, envíos, devoluciones. El contenido no cambia casi nunca y no requiere mantenimiento.

### Bot B — clientes ideales

**Ecommerce con catálogo amplio**
Un cliente que pregunta "busco un regalo para mi madre de 60 años que le gusta la jardinería con presupuesto de 40 €" necesita IA que entienda la intención, filtre el catálogo y recomiende. Shopify y WooCommerce con más de 50 productos son candidatos directos.

**Agencias inmobiliarias**
Cada piso es diferente, cada cliente tiene criterios distintos. El bot B puede entender "busco algo de 3 habitaciones en el centro, máximo 1.200 al mes, que admita mascotas" y mostrar las opciones relevantes del portfolio.

**Despachos de abogados, asesorías y gestorías medianas**
Preguntas complejas y variadas. El bot B puede orientar al cliente, explicar procesos y filtrar consultas, dejando al abogado solo las que necesitan su atención.

**Empresas de software y SaaS**
Soporte técnico de primer nivel entrenado con la documentación. Resuelve preguntas de uso y solo escala lo que realmente lo necesita.

**Hoteles y alojamientos turísticos**
Consultas sobre disponibilidad, servicios, qué hacer en la zona, políticas de cancelación. Preguntas muy variadas que el bot B maneja bien.

**Clínicas especializadas** (psicología, nutrición, medicina estética)
A diferencia de una clínica dental estándar, estas tienen conversaciones más complejas donde el cliente necesita sentir que le entienden antes de dar sus datos.

**Distribuidores B2B y proveedores industriales**
Sus clientes hacen consultas técnicas: compatibilidad de productos, plazos de entrega, descuentos por volumen, fichas técnicas. El bot B entrenado con el catálogo técnico puede responder a las 8 de la mañana antes de que abra la oficina.

---

## 3. Arquitectura técnica del Bot A — flujos predefinidos

### Stack tecnológico

| Capa | Herramienta recomendada | Alternativa |
|---|---|---|
| Constructor de flujos | Voiceflow | Botpress |
| Widget embebido | Snippet de Voiceflow/Botpress | Widget JS propio |
| Backend (si es custom) | Railway · Render | Vercel |
| Integraciones | Make (Makecom) | Zapier |
| CRM | HubSpot · Pipedrive | Google Sheets |

### Cómo funciona paso a paso

**Paso 1 — Widget JS en la web del cliente**

El cliente pega un snippet de 2-3 líneas antes del `</body>` de su web. Este snippet carga el chat flotante. Si usas Voiceflow o Botpress, ellos generan este snippet automáticamente. Si montas un widget propio, es un `<div>` flotante que hace `fetch()` a tu backend.

```html
<!-- Ejemplo snippet Voiceflow -->
<script type="text/javascript">
  (function(d, t) {
    var v = d.createElement(t), s = d.getElementsByTagName(t)[0];
    v.onload = function() {
      window.voiceflow.chat.load({ verify: { projectID: 'TU_PROJECT_ID' } });
    }
    v.src = "https://cdn.voiceflow.com/widget/bundle.mjs";
    s.parentNode.insertBefore(v, s);
  })(document, 'script');
</script>
```

**Paso 2 — Árbol de decisión (el corazón del bot A)**

Aquí inviertes el tiempo en el setup. En Voiceflow construyes visualmente:

- Nodo de bienvenida con botones de opciones principales
- Ramas por cada opción: precios, horarios, contacto, reservas, etc.
- Captura de datos (nombre + email + teléfono) cuando sea necesario
- Nodo de escalada a humano con horario configurable

El árbol no usa IA. Cada respuesta la escribes tú. Eso es una ventaja: control total sobre lo que el bot dice.

**Paso 3 — Captura de datos y activación de integraciones**

Cuando el usuario deja sus datos, Make entra en acción:

1. Recibe el webhook de Voiceflow con los datos del lead
2. Crea el contacto en el CRM del cliente
3. Envía email de confirmación al usuario
4. Notifica al equipo del cliente por email o Slack

**Paso 4 — Escalada a humano**

Si el usuario pide hablar con una persona o llega a un punto del flujo que no tiene respuesta automatizada, el bot puede:

- Mostrar un formulario de contacto
- Redirigir a WhatsApp con mensaje prefilled
- Crear una tarea en el CRM para que el equipo llame

### Coste de operación mensual del Bot A

| Concepto | Coste |
|---|---|
| Hosting backend (Railway/Render) | 5–10 €/mes |
| Voiceflow (plan Creator) | 0–50 €/mes según plan |
| Make (operaciones) | 0–9 €/mes |
| **Total coste tuyo** | **5–70 €/mes** |
| **Lo que cobras al cliente** | **100–200 €/mes** |

---

## 4. Arquitectura técnica del Bot B — con IA

### Stack tecnológico

| Capa | Herramienta recomendada | Alternativa |
|---|---|---|
| Widget embebido | Widget JS propio | Voiceflow AI |
| Backend / orquestador | Node.js en Railway | Python (FastAPI) en Render |
| Motor IA | Claude API (Anthropic) | OpenAI GPT-4o |
| Base de conocimiento (RAG) | Supabase (pgvector) | Pinecone |
| Integraciones | Make (Makecom) | n8n |
| CRM | HubSpot · Pipedrive | Google Sheets |
| Registro conversaciones | Airtable | Supabase |

### Cómo funciona paso a paso

**Paso 1 — Widget JS con historial de sesión**

A diferencia del bot A, el widget del bot B necesita mantener el historial de la conversación en el cliente para enviarlo completo en cada llamada al backend. Así la IA tiene contexto de lo que se ha hablado antes.

```javascript
// Estructura básica del widget
const history = [];

async function sendMessage(userMessage) {
  history.push({ role: 'user', content: userMessage });
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: history })
  });
  
  const data = await response.json();
  history.push({ role: 'assistant', content: data.reply });
  renderMessage(data.reply);
}
```

**Paso 2 — Backend como orquestador**

El backend recibe el mensaje, busca contexto relevante en la base de conocimiento y llama a la API de IA. Es el cerebro del sistema.

```javascript
// Endpoint principal /api/chat
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  const lastMessage = messages[messages.length - 1].content;
  
  // 1. Buscar contexto relevante (RAG)
  const context = await searchKnowledgeBase(lastMessage);
  
  // 2. Construir prompt con contexto
  const systemPrompt = buildSystemPrompt(context);
  
  // 3. Llamar a la API de IA
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: systemPrompt,
    messages: messages
  });
  
  const reply = response.content[0].text;
  
  // 4. Detectar intención y disparar acciones
  await handleIntent(reply, lastMessage);
  
  res.json({ reply });
});
```

**Paso 3 — Base de conocimiento con RAG**

RAG (Retrieval-Augmented Generation) es lo que hace que el bot "sepa" cosas específicas del cliente sin que la IA las haya aprendido en su entrenamiento.

El proceso de setup:

1. Recopilas los documentos del cliente: FAQs, catálogo, política de devoluciones, horarios, precios, etc.
2. Divides cada documento en fragmentos de ~500 palabras (chunks)
3. Conviertes cada chunk en un vector de embeddings (representación matemática del significado)
4. Guardas los vectores en Supabase con `pgvector`
5. Cuando llega una pregunta, conviertes la pregunta en vector y buscas los chunks más similares
6. Inyectas esos chunks en el system prompt antes de llamar a la IA

```javascript
// Búsqueda semántica en Supabase
async function searchKnowledgeBase(query) {
  const queryEmbedding = await getEmbedding(query);
  
  const { data } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 5
  });
  
  return data.map(d => d.content).join('\n\n');
}
```

**Paso 4 — System prompt (crítico)**

El system prompt define la personalidad, límites y comportamiento del bot. Es lo más importante que configuras para cada cliente.

```
Eres el asistente virtual de [Nombre Empresa]. Tu nombre es [Nombre Bot].

COMPORTAMIENTO:
- Respondes siempre en español, de forma amable y concisa
- Solo respondes sobre temas relacionados con [Empresa]
- Si no sabes algo con certeza, lo dices claramente y ofreces conectar con el equipo
- Nunca inventas precios, fechas ni información que no tengas
- Si el usuario pide hablar con una persona, recoge nombre y email y confirma que le contactarán

IDENTIFICACIÓN OBLIGATORIA:
- Eres un asistente virtual automatizado, no una persona
- Si el usuario pregunta si es humano, respondes honestamente que eres una IA

LÍMITES:
- No das diagnósticos médicos (si aplica)
- No das asesoramiento legal ni financiero (si aplica)
- No hablas de competidores

INFORMACIÓN DE LA EMPRESA:
[Aquí pegas toda la documentación del cliente]
```

**Paso 5 — Detector de intención y acciones**

Después de generar la respuesta, el backend analiza si el usuario ha mostrado una intención de acción y dispara el flujo correspondiente en Make:

- **Intención de compra / contratación** → crea lead en CRM + notifica al comercial
- **Solicitud de presupuesto** → crea tarea en CRM + envía email al cliente
- **Quiere hablar con humano** → activa escalada por WhatsApp o email
- **Datos de contacto proporcionados** → guarda en base de datos + confirma al usuario

**Paso 6 — Registro y análisis**

Cada conversación se guarda completa en Airtable o Supabase. Esto te permite:

- Ver qué preguntas no pudo responder el bot (para mejorar la base de conocimiento)
- Generar reportes mensuales para el cliente con métricas de uso
- Detectar leads que no se convirtieron y analizarlos

### Coste de operación mensual del Bot B

| Concepto | Coste estimado |
|---|---|
| Hosting backend (Railway) | 5–10 €/mes |
| Supabase (base de datos + vectores) | 0–25 €/mes |
| API de Claude/OpenAI (1.000 conversaciones/mes) | 20–50 €/mes |
| Make (operaciones) | 9–16 €/mes |
| **Total coste tuyo** | **34–101 €/mes** |
| **Lo que cobras al cliente** | **200–400 €/mes** |

---

## 5. Marco legal completo

### Normativa aplicable en España y la UE

| Norma | Ámbito | Aplica a |
|---|---|---|
| RGPD (Reglamento 2016/679) | Protección de datos personales | Ambos bots |
| LOPDGDD (Ley Orgánica 3/2018) | Desarrollo nacional del RGPD | Ambos bots |
| LSSI (Ley 34/2002) | Servicios de la sociedad de la información | Ambos bots |
| AI Act UE (Reglamento 2024/1689) | Sistemas de inteligencia artificial | Solo Bot B |
| Ley General para la Defensa de Consumidores | Información precontractual | Ambos bots |
| Ley de Cookies (transposición Directiva ePrivacy) | Cookies y almacenamiento | Ambos bots |

---

### Riesgos legales del Bot A

#### Riesgo 1 — RGPD: recogida de datos sin base legal ⚠️ GRAVE

**Qué es:** Cuando el bot captura nombre, email o teléfono, eso es tratamiento de datos personales. Sin informar correctamente al usuario en el momento de la recogida, la empresa incumple el RGPD.

**Sanciones posibles:** Infracciones leves desde 40.000 €. Infracciones graves hasta 20 millones € o el 4 % de la facturación global.

**Cómo lo evitas:**
- Texto informativo visible justo donde el usuario introduce sus datos: quién trata los datos, para qué, cuánto tiempo se guardan y enlace a política de privacidad
- Casilla de aceptación opcional si los datos se van a usar para marketing (no para la gestión de la consulta)
- En tu contrato con el cliente, cláusula que especifique quién es responsable de mantener actualizados los textos legales

#### Riesgo 2 — LSSI: identificación como bot ⚠️ MODERADO

**Qué es:** La LSSI obliga a informar al usuario de que está interactuando con un sistema automatizado si lo pregunta. Si el bot usa un nombre humano sin aclaración, puede considerarse práctica engañosa bajo la Ley de Competencia Desleal.

**Cómo lo evitas:**
- Mensaje de bienvenida que incluya: "Soy el asistente virtual de [Empresa]"
- Si el usuario pregunta directamente si es humano, el bot debe responder honestamente
- Evitar nombres humanos sin la aclaración "asistente virtual" o "bot"

#### Riesgo 3 — Ley de consumidores: información precontractual ⚠️ MODERADO

**Qué es:** Si el bot muestra precios, condiciones de servicio o inicia un proceso de compra, la información tiene que ser veraz y completa. Un precio incorrecto o una condición que no se cumple genera derecho de reclamación del usuario final.

**Cómo lo evitas:**
- En el contrato con el cliente: cláusula que les hace responsables de mantener actualizada la información del bot
- Procedimiento documentado de revisión periódica (al menos mensual)
- El bot nunca debe hacer afirmaciones de precio sin un disclaimer "consultar condiciones actuales"

#### Riesgo 4 — Ley de cookies: almacenamiento de sesión ⚠️ LEVE

**Qué es:** Si el widget usa cookies o localStorage para recordar la conversación entre sesiones, esas cookies tienen que estar incluidas en el banner de cookies del cliente.

**Cómo lo evitas:**
- Indicar al cliente que debe añadir las cookies del chatbot a su política de cookies
- Usar cookies de sesión (que expiran al cerrar el navegador) siempre que sea posible, para simplificar la gestión
- Proporcionar al cliente la ficha técnica de las cookies que usa el bot

---

### Riesgos legales del Bot B

El bot B tiene todos los riesgos del bot A más los siguientes:

#### Riesgo 5 — AI Act: transparencia sobre uso de IA ⚠️ GRAVE

**Qué es:** El AI Act de la UE (en vigor desde 2025) clasifica los chatbots de atención al cliente como sistemas de IA de riesgo limitado. La obligación principal es que el usuario sepa que está hablando con una IA antes de iniciar la conversación. No vale meterlo en letra pequeña.

**Sanciones posibles:** Hasta 15 millones de euros o el 3 % de la facturación global para la empresa infractora.

**Riesgo agravado:** Si el bot está tan bien entrenado que el usuario cree que habla con una persona y toma decisiones importantes basándose en esa conversación (contratar un servicio, dar datos bancarios, tomar una decisión médica), puedes estar ante una vulneración grave.

**Cómo lo evitas:**
- Primer mensaje del bot siempre: "Soy un asistente virtual automatizado de [Empresa]"
- Esta identificación debe ser visible, no en letra pequeña ni en los términos y condiciones
- En el system prompt: instrucción explícita de que si el usuario pregunta si es humano, el bot debe responder que es una IA

#### Riesgo 6 — Alucinaciones de IA: responsabilidad por información incorrecta ⚠️ MUY GRAVE

**Qué es:** Los modelos de IA generan ocasionalmente información incorrecta con total confianza. Si el bot de una clínica dice que un medicamento no tiene contraindicaciones cuando sí las tiene, o el bot de una inmobiliaria inventa una característica de un piso, el usuario puede actuar sobre esa información y sufrir un daño.

**Cadena de responsabilidad:** El usuario demanda al cliente → el cliente te demanda a ti → tú intentas reclamar al proveedor de IA (que tiene sus condiciones de uso blindadas).

**Cómo lo evitas:**
- En el system prompt: instrucción explícita de que cuando el bot no esté seguro de algo lo diga claramente y remita a una fuente humana. Ejemplo: "Si no tienes certeza al 100 % sobre un dato, di 'No tengo información confirmada sobre esto, te recomiendo consultarlo directamente con nuestro equipo'"
- En tu contrato con el cliente: cláusula que limite tu responsabilidad a errores de implementación técnica, no al contenido generado por la IA
- Procedimiento de revisión mensual del bot documentado por escrito
- Para sectores sensibles (salud, finanzas, legal): disclaimer visible en la interfaz: "Este asistente no proporciona asesoramiento médico/legal/financiero"

#### Riesgo 7 — RGPD: transferencias internacionales de datos ⚠️ GRAVE

**Qué es:** El bot B envía datos del usuario (lo que escribe en el chat, que puede incluir datos de salud, financieros o personales) a Anthropic u OpenAI, cuyos servidores están en Estados Unidos. Eso es una transferencia internacional de datos.

**Esto es legal si se hace bien:** Anthropic y OpenAI tienen DPAs disponibles y se acogen al EU-US Data Privacy Framework. Pero tiene que estar documentado correctamente.

**La cadena de documentación correcta:**
1. Tu agencia firma DPA con el cliente (tú eres encargado del tratamiento)
2. En ese DPA declaras que usas Anthropic/OpenAI como subencargados
3. El cliente acepta explícitamente el uso de esos subencargados
4. Tú has aceptado los DPAs de Anthropic y OpenAI

**Riesgo adicional para sectores sensibles:** Si el cliente es una clínica, despacho de abogados, o cualquier sector con datos especialmente sensibles (salud, datos financieros, datos de menores), necesitas realizar un EIPD (Evaluación de Impacto en Protección de Datos) antes de desplegar el bot.

**Cómo lo evitas:**
- Nunca despliegues el bot B sin tener el DPA firmado con el cliente
- Acepta el DPA de Anthropic: `https://www.anthropic.com/legal/dpa`
- Acepta el DPA de OpenAI si usas GPT: `https://openai.com/policies/data-processing-addendum`
- Para sectores sensibles: realiza el EIPD o contrata a un consultor de privacidad que lo haga

#### Riesgo 8 — Propiedad intelectual del contenido generado ⚠️ LEVE-MODERADO

**Qué es:** Si el bot B genera contenido para el usuario (redactar un email, un presupuesto, una descripción de producto), ese contenido tiene autoría legal incierta. En España y la UE la IA no tiene derechos de autor, pero si el modelo reproduce contenido protegido de terceros, el cliente podría estar infringiendo derechos sin saberlo.

**Cuándo aplica de verdad:** Si vendes el bot a una empresa que lo usa para generar contenido comercial o contractual de forma masiva.

**Cómo lo evitas:**
- En tu contrato: cláusula que informa al cliente de que el contenido generado por IA debe ser revisado antes de su uso comercial
- No garantices que el contenido generado está libre de derechos de terceros

#### Riesgo 9 — Sectores regulados: riesgo alto específico ⚠️ MUY GRAVE

**Qué es:** Algunos sectores tienen regulación adicional que el bot B puede incumplir si no se configura con cuidado:

| Sector | Lo que el bot NO puede hacer | Consecuencia |
|---|---|---|
| Sanidad | Dar diagnósticos o recomendaciones de tratamiento | Responsabilidad civil + sanción sanitaria |
| Servicios financieros | Dar asesoramiento de inversión o seguros sin licencia CNMV/DGS | Infracción CNMV / DGS |
| Servicios jurídicos | Dar opinión legal vinculante | Intrusismo profesional |
| Educación de menores | Cualquier dato de menores sin consentimiento parental | RGPD agravado (datos de menores) |

**Cómo lo evitas:**
- Identificar el sector del cliente antes de aceptar el proyecto
- Incluir en el system prompt las restricciones específicas del sector
- En tu contrato: cláusula que te exime de responsabilidad si el cliente usa el bot en sectores regulados sin informarte y sin que hayas configurado las restricciones correspondientes

---

## 6. Documentos legales que necesitas

### Documento 1 — Contrato de servicios con el cliente

Debe incluir obligatoriamente:

- Descripción técnica del servicio (qué bot, qué integraciones, qué no incluye)
- Definición de roles: tú como encargado técnico, el cliente como responsable legal del servicio
- Cláusula de limitación de responsabilidad: errores de implementación técnica sí, contenido generado por IA o información incorrecta proporcionada por el cliente no
- Procedimiento de actualización de contenidos: quién actualiza qué y en qué plazo
- Cláusula de sectores regulados: el cliente declara que ha revisado la legalidad del uso del bot en su sector

### Documento 2 — DPA (Data Processing Agreement)

Obligatorio para el bot B, muy recomendable para el bot A si capta datos personales (que casi siempre lo hace).

Debe incluir:

- Identificación de responsable (cliente) y encargado (tu agencia)
- Descripción del tratamiento: qué datos, para qué, cuánto tiempo
- Medidas de seguridad técnicas y organizativas
- Lista de subencargados: Anthropic, OpenAI, Make, Supabase, etc. con sus DPAs
- Procedimiento en caso de brecha de seguridad (notificación en 72h a la AEPD)
- Compromiso de devolver o destruir los datos al finalizar el contrato

### Documento 3 — Textos legales para la interfaz del bot

Para entregar al cliente y que los incluya en su web:

**Aviso en el widget (visible antes de empezar):**
> "Soy un asistente virtual automatizado de [Empresa]. Las conversaciones pueden ser revisadas para mejorar el servicio. Consulta nuestra [política de privacidad]."

**Texto de recogida de datos (visible cuando se piden datos):**
> "Tus datos serán tratados por [Empresa] para gestionar tu consulta. Responsable: [Razón Social]. Puedes ejercer tus derechos en [email]. Más información en nuestra [política de privacidad]."

### Documento 4 — Registro de actividades de tratamiento

Obligatorio si tu agencia procesa datos de clientes de forma habitual (lo que haces). Es un documento interno que lista todos los tratamientos de datos que realizas. La AEPD lo puede pedir en una inspección.

---

## 7. Precios y modelo de negocio

### Estructura de precios recomendada

**Bot A:**
- Setup completo (diseño de flujos, integraciones, textos legales básicos): 600–1.000 €
- Mantenimiento mensual (ajustes, actualizaciones de contenido, soporte): 100–200 €/mes
- Coste de operación que repercutes: 20–50 €/mes

**Bot B:**
- Setup completo (widget, backend, RAG, integraciones, system prompt, textos legales): 1.200–2.500 €
- Mantenimiento mensual (ajustes, actualización base de conocimiento, soporte, revisión de conversaciones): 200–400 €/mes
- Coste de operación que repercutes: 50–100 €/mes

### Upsells naturales una vez el bot está funcionando

- Conexión con WhatsApp Business API: +500–800 € setup
- Panel de analíticas con métricas mensuales: +50–100 €/mes
- Actualización de la base de conocimiento (bot B): +100–200 € por actualización trimestral
- Ampliación a más idiomas: +300–500 € por idioma

### Estrategia de entrada al mercado

El servicio con el que más fácil cierras primeros clientes es el **bot A para clínicas o academias** porque el ROI es inmediato, visible y el cliente no necesita entender qué es la IA para ver el valor.

Una vez tienes 3–5 clientes con bot A, tienes casos de éxito reales para vender el bot B a empresas más grandes.

---

## 8. Checklist antes de entregar a un cliente

### Checklist técnico — Bot A

- [ ] Widget embebido y funcionando en la web del cliente
- [ ] Todos los flujos probados con casos reales (incluidos bordes: respuestas inesperadas, palabras malsonantes, preguntas fuera de ámbito)
- [ ] Integración con CRM probada: el lead llega correctamente
- [ ] Email de confirmación al usuario funcionando
- [ ] Notificación al equipo del cliente funcionando
- [ ] Escalada a humano probada
- [ ] Bot testeado en móvil y escritorio
- [ ] Carga del widget no afecta al rendimiento de la web (Lighthouse score)

### Checklist técnico — Bot B

Todo lo anterior más:

- [ ] Base de conocimiento cargada y búsqueda semántica probada con 20+ preguntas reales
- [ ] System prompt revisado y aprobado por el cliente por escrito
- [ ] Respuestas de la IA revisadas para los 50 casos más probables
- [ ] Mecanismo de fallback cuando la IA no sabe responder funcionando
- [ ] Escalada a humano probada
- [ ] Registro de conversaciones funcionando en Airtable/Supabase
- [ ] Coste de API de IA monitorizado con alertas de gasto
- [ ] Latencia media de respuesta < 3 segundos

### Checklist legal — Ambos bots

- [ ] Contrato de servicios firmado con el cliente
- [ ] DPA firmado con el cliente
- [ ] DPAs de subencargados aceptados (Anthropic, OpenAI, Make, etc.)
- [ ] Aviso de asistente virtual visible en el widget
- [ ] Texto de recogida de datos incluido en los formularios del bot
- [ ] Política de privacidad del cliente actualizada mencionando el chatbot
- [ ] Cookies del widget incluidas en el banner de cookies del cliente
- [ ] Para sectores regulados: restricciones configuradas en el system prompt y revisadas por el cliente

### Checklist legal adicional — Bot B

- [ ] Disclaimer "asistente virtual automatizado" en el primer mensaje
- [ ] Instrucción anti-alucinaciones en el system prompt
- [ ] Para datos sensibles (salud, menores, financieros): EIPD realizado
- [ ] Cláusula de limitación de responsabilidad por contenido IA en el contrato

---

*Documento elaborado para uso interno de la agencia. Actualizar cuando cambien las normativas aplicables o el stack tecnológico utilizado.*

*Última revisión: Junio 2026*
