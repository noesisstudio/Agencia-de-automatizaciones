# RGPD: ¿Qué hacer?

Guía completa de cumplimiento del Reglamento General de Protección de Datos (UE 2016/679)
y la Ley Orgánica 3/2018 (LOPDGDD) para todas las automatizaciones de Noesis.

Fecha: junio 2026 · Aplica a: España / UE

---

## 1. Resumen ejecutivo

Cualquier automatización que trate datos personales (nombre, NIF, email, teléfono, dirección,
mensajes de WhatsApp, contenido de facturas) debe cumplir el RGPD. No es opcional.

**Qué te juegas si no cumples:**
- Multa de hasta 20 M€ o el 4 % de la facturación global (lo que sea mayor).
- Reclamación ante la AEPD (Agencia Española de Protección de Datos).
- Pérdida de confianza del cliente.

**Qué tienes que hacer (resumen de 1 minuto):**
1. Tener un Registro de Actividades de Tratamiento (RAT) por cada automatización.
2. Informar al usuario (aviso de privacidad) ANTES de recoger sus datos.
3. Tener base legal para cada tratamiento (normalmente: contrato o consentimiento).
4. Firmar un contrato de encargado de tratamiento con cada proveedor (Anthropic, Google, Meta, etc.).
5. No almacenar más datos de los necesarios ni durante más tiempo del necesario.
6. Cifrar y proteger los datos personales.
7. Si usas IA, cumplir también el AI Act (transparencia obligatoria).

---

## 2. ¿Qué datos personales tratan nuestras automatizaciones?

| Automatización | Datos personales que trata | Nivel de riesgo |
|---|---|---|
| **Facturas (FacturAI)** | NIF/CIF, nombre, dirección, email, teléfono, importes, conceptos, cuentas bancarias | ALTO |
| **Chatbot web (Noesis)** | Mensajes del usuario, IP, cookies de sesión | MEDIO |
| **Chatbot WhatsApp (Meta)** | Número de teléfono, nombre de WhatsApp, mensajes, historial de conversación | ALTO |
| **Email comercial** | Nombre, email, contenido del email, adjuntos | ALTO |
| **Presupuestos** | Nombre, datos del proyecto, importes | MEDIO |
| **Presupuesto WhatsApp** | Número de teléfono, nombre, productos solicitados, importes | MEDIO |

---

## 3. Obligaciones por automatización

### 3.1 Facturas (FacturAI)

**Base legal:** Ejecución de contrato + obligación legal (facturación obligatoria por ley fiscal).

**Qué ya cumplimos:**
- NIF/CIF cifrado en la base de datos (Fernet/AES).
- Contraseñas hasheadas con bcrypt.
- JWT con expiración para sesiones.
- `.env` con las claves fuera del código.
- Headers de seguridad (X-Frame-Options, X-Content-Type-Options, HSTS).

**Qué falta hacer:**

| Acción | Prioridad | Cómo |
|---|---|---|
| Añadir aviso de privacidad en el frontend | ALTA | Enlace en el login y en la sección de configuración |
| Registro de Actividades de Tratamiento (RAT) | ALTA | Documento interno (ver plantilla abajo) |
| Contrato de encargado con Anthropic | ALTA | Anthropic ya firma DPA — aceptar en console.anthropic.com/settings |
| Política de retención: borrar facturas >5 años | MEDIA | La ley fiscal española exige conservar 4 años (art. 66 LGT); borrar después |
| Permitir exportar/borrar datos de un cliente (derecho de acceso/supresión) | MEDIA | Ya existe exportar a Excel; añadir botón "Eliminar cliente y sus datos" |
| Log de accesos a datos sensibles | BAJA | Añadir tabla de auditoría en la BD |

**Transferencia internacional:**
Cuando la IA (Anthropic) procesa una factura, los datos del PDF se envían a servidores de Anthropic (EE.UU./UE).
Anthropic está cubierto por el EU-US Data Privacy Framework. Aun así, debes:
1. Aceptar el DPA de Anthropic (Data Processing Addendum).
2. Informar al usuario de que sus datos se procesan con IA.

---

### 3.2 Chatbot web (Noesis)

**Base legal:** Consentimiento (el usuario inicia la conversación voluntariamente).

**Qué ya cumplimos:**
- Aviso de que es una IA (obligatorio por AI Act).
- Enlace a /privacidad.html en el widget.
- No se guardan conversaciones en el servidor (stateless — solo en el navegador del usuario).
- La API key está en el servidor (Netlify Function), no expuesta al navegador.

**Qué falta hacer:**

| Acción | Prioridad | Cómo |
|---|---|---|
| Crear /privacidad.html con la política completa | ALTA | Ver plantilla abajo |
| Aviso de cookies (si usas analytics) | MEDIA | Solo si añades Google Analytics u otros trackers |
| Contrato de encargado con Anthropic | ALTA | Mismo DPA que facturas |

**Nota:** El chatbot NO guarda conversaciones en servidor. Cada mensaje se envía a Claude y se
descarta. Esto simplifica mucho el RGPD (no hay base de datos de conversaciones).

---

### 3.3 Chatbot WhatsApp (Meta + n8n)

**Base legal:** Consentimiento (el usuario escribe primero al número de WhatsApp).

**Qué ya cumplimos:**
- Aviso de que es una IA en el prompt del sistema (para el bot con IA).
- Instrucciones de no inventar datos (anti-alucinaciones).

**Qué falta hacer:**

| Acción | Prioridad | Cómo |
|---|---|---|
| Primer mensaje automático con aviso de privacidad | ALTA | Añadir nodo en n8n que envíe aviso ANTES de la primera respuesta |
| Contrato de encargado con Meta | ALTA | Aceptar el DPA de Meta Business Suite |
| Contrato de encargado con Anthropic (bot IA) | ALTA | Mismo DPA |
| No guardar mensajes >30 días | MEDIA | Si usas la pestaña "Conversaciones" de Google Sheets, borrar mensajes antiguos |
| Si guardas leads: consentimiento explícito | ALTA | "¿Quieres que un asesor te contacte?" → solo guardar si dice SÍ |

**Mensaje de aviso sugerido (primer contacto):**
```
Hola 👋 Soy el asistente virtual de [Empresa]. Uso inteligencia artificial para responder.
Tu mensaje se procesa para darte una respuesta y no se almacena después.
Más info: [enlace a política de privacidad]
¿En qué puedo ayudarte?
```

**Para el bot SIN IA:** No necesitas el aviso de IA, pero SÍ el de privacidad si guardas datos.

---

### 3.4 Email comercial

**Base legal:** Interés legítimo (emails comerciales ya existentes) o consentimiento.

**Qué falta hacer:**

| Acción | Prioridad | Cómo |
|---|---|---|
| No procesar emails personales sin consentimiento | ALTA | Solo emails comerciales del negocio |
| Contrato de encargado con Anthropic | ALTA | Mismo DPA |
| Borrar borradores procesados tras 30 días | MEDIA | Tarea automática en n8n o cron |

---

### 3.5 Presupuestos (web y WhatsApp)

**Base legal:** Ejecución de contrato (el cliente solicita un presupuesto).

**Qué falta hacer:**

| Acción | Prioridad | Cómo |
|---|---|---|
| Aviso en el formulario/mensaje: "Usamos tus datos para preparar el presupuesto" | MEDIA | Texto bajo el formulario o primer mensaje |
| No conservar presupuestos rechazados >6 meses | BAJA | Limpieza periódica |

---

## 4. Documentos que necesitas crear

### 4.1 Política de privacidad (web pública)

Crear `/web/privacidad.html` con:

```
POLÍTICA DE PRIVACIDAD — [Tu Empresa]

1. RESPONSABLE DEL TRATAMIENTO
   [Nombre empresa] · NIF: [NIF] · Email: [email] · Web: [web]

2. DATOS QUE RECOGEMOS
   - Chatbot web: mensajes que nos envías (no se almacenan en servidor).
   - Chatbot WhatsApp: tu número de teléfono y mensajes.
   - Facturas: datos fiscales (NIF, nombre, dirección, importes).
   - Presupuestos: datos del proyecto y contacto.

3. FINALIDAD
   Responder a tus consultas, generar facturas/presupuestos, y gestionar
   la relación comercial.

4. BASE LEGAL
   - Chatbot: tu consentimiento (al iniciar la conversación).
   - Facturas: obligación legal (normativa fiscal).
   - Presupuestos: ejecución de contrato.

5. DESTINATARIOS
   Tus datos pueden ser procesados por:
   - Anthropic (IA): para generar respuestas y extraer datos de facturas.
     Cubierto por el EU-US Data Privacy Framework.
   - Google (Sheets): si activamos la exportación automática.
   - Meta (WhatsApp): para el servicio de mensajería.
   Todos tienen contratos de encargado de tratamiento vigentes.

6. CONSERVACIÓN
   - Mensajes de chatbot: no se almacenan.
   - Facturas: 5 años (obligación fiscal).
   - Presupuestos: 6 meses tras la última interacción.
   - Leads de WhatsApp: 12 meses.

7. TUS DERECHOS
   Puedes ejercer tus derechos de acceso, rectificación, supresión,
   oposición, portabilidad y limitación escribiendo a: [email]
   Si no estás satisfecho, puedes reclamar ante la AEPD (www.aepd.es).

8. USO DE INTELIGENCIA ARTIFICIAL
   Algunos servicios utilizan IA (Claude de Anthropic) para generar
   respuestas. Las respuestas son generadas automáticamente y pueden
   contener errores. Ninguna respuesta de la IA constituye asesoramiento
   profesional vinculante.

Última actualización: [fecha]
```

### 4.2 Registro de Actividades de Tratamiento (RAT)

Documento interno (no se publica, pero la AEPD puede pedirlo). Uno por tratamiento:

```
REGISTRO DE ACTIVIDADES DE TRATAMIENTO

Responsable: [Tu empresa] · NIF: [NIF]
Delegado de Protección de Datos: [nombre o "no aplicable" si <250 empleados]

TRATAMIENTO 1: Facturación con IA (FacturAI)
- Finalidad: Extracción automatizada de datos de facturas y gestión de facturación.
- Categorías de interesados: Clientes, proveedores.
- Categorías de datos: NIF/CIF, nombre, dirección, email, importes, conceptos.
- Destinatarios: Anthropic (IA), Google (Sheets), proveedor de email (SMTP).
- Transferencias internacionales: EE.UU. (Anthropic) — EU-US DPF.
- Plazo de supresión: 5 años desde la emisión.
- Medidas de seguridad: Cifrado de NIF (AES), JWT, bcrypt, HTTPS, CORS.

TRATAMIENTO 2: Chatbot web
- Finalidad: Atención al visitante de la web.
- Categorías de interesados: Visitantes web.
- Categorías de datos: Mensajes (no se almacenan en servidor).
- Destinatarios: Anthropic (IA).
- Transferencias internacionales: EE.UU. (Anthropic) — EU-US DPF.
- Plazo de supresión: Inmediato (stateless).
- Medidas de seguridad: HTTPS, API key en servidor.

TRATAMIENTO 3: Chatbot WhatsApp
- Finalidad: Atención al cliente por WhatsApp.
- Categorías de interesados: Clientes y potenciales clientes.
- Categorías de datos: Número de teléfono, nombre, mensajes.
- Destinatarios: Meta (WhatsApp), Anthropic (IA, solo bot con IA), Google (Sheets).
- Transferencias internacionales: EE.UU. (Meta, Anthropic) — EU-US DPF.
- Plazo de supresión: 30 días (mensajes), 12 meses (leads).
- Medidas de seguridad: HTTPS, tokens en credentials de n8n.

TRATAMIENTO 4: Email comercial
- Finalidad: Clasificación y borrador de respuestas a emails comerciales.
- Categorías de interesados: Clientes, proveedores.
- Categorías de datos: Nombre, email, contenido del email.
- Destinatarios: Anthropic (IA).
- Transferencias internacionales: EE.UU. (Anthropic) — EU-US DPF.
- Plazo de supresión: 30 días (borradores procesados).
- Medidas de seguridad: HTTPS, credenciales en servidor.
```

### 4.3 Contratos de encargado de tratamiento (DPA)

| Proveedor | Dónde firmar el DPA | Estado |
|---|---|---|
| **Anthropic** | https://console.anthropic.com/ → Settings → Legal | Pendiente |
| **Google** (Sheets, si se usa) | https://admin.google.com/ → Account → Legal | Pendiente |
| **Meta** (WhatsApp) | https://business.facebook.com/ → Settings → Legal terms | Pendiente |
| **Netlify** (hosting web) | Se acepta automáticamente en sus ToS (incluye DPA) | OK |
| **n8n Cloud** (si se usa) | https://n8n.io/legal/dpa/ | Pendiente |

---

## 5. AI Act — Obligaciones adicionales si usas IA

El Reglamento de IA de la UE (AI Act, en vigor desde agosto 2024, con plazos
de cumplimiento escalonados hasta 2027) añade obligaciones específicas:

### Clasificación de nuestros sistemas

| Sistema | Categoría AI Act | Obligaciones |
|---|---|---|
| Chatbot web | Sistema de IA de propósito general (bajo riesgo) | Transparencia: avisar que es IA |
| Chatbot WhatsApp con IA | Sistema de IA de propósito general (bajo riesgo) | Transparencia: avisar que es IA |
| Chatbot WhatsApp SIN IA | NO es IA (reglas fijas) | Ninguna del AI Act |
| Extracción de facturas | Sistema de IA de propósito general (bajo riesgo) | Transparencia |
| Email con IA | Sistema de IA de propósito general (bajo riesgo) | Transparencia |

### Qué hacer para cumplir el AI Act

1. **Transparencia** (ya cumplimos parcialmente):
   - El chatbot dice "soy una IA" si le preguntan → OK
   - Falta: aviso visible ANTES de interactuar (no solo si preguntan)

2. **Supervisión humana**:
   - En facturas: el usuario REVISA los datos antes de guardar → OK
   - En chatbot: las respuestas no vinculantes + "contacta con info@" → OK

3. **Documentación técnica**:
   - Modelo usado (Claude de Anthropic), finalidad, limitaciones
   - Ya documentado en los README de cada producto → OK

---

## 6. Checklist de cumplimiento — Acciones prioritarias

### URGENTE (antes de vender)

- [ ] Aceptar el DPA de Anthropic en console.anthropic.com
- [ ] Crear la página /privacidad.html en la web
- [ ] Añadir aviso de IA visible en el chatbot web (ya existe, verificar)
- [ ] Añadir aviso de privacidad en el primer mensaje de WhatsApp
- [ ] Cambiar ADMIN_PASSWORD y SECRET_KEY en producción

### IMPORTANTE (primera semana)

- [ ] Escribir el RAT completo (usar la plantilla de arriba)
- [ ] Aceptar el DPA de Meta Business Suite
- [ ] Añadir enlace a política de privacidad en el login de FacturAI
- [ ] Configurar borrado automático de conversaciones de WhatsApp >30 días

### RECOMENDABLE (primer mes)

- [ ] Añadir tabla de auditoría en FacturAI (quién accedió a qué datos)
- [ ] Implementar "Derecho de supresión" en FacturAI (borrar cliente y todos sus datos)
- [ ] Revisar que no se guardan más datos de los necesarios en Google Sheets
- [ ] Documentar el proceso de respuesta ante brechas de seguridad (72h para notificar)

---

## 7. Preguntas frecuentes de clientes

**"¿Puedo usar el chatbot con IA sin cumplir nada?"**
No. Como mínimo necesitas: aviso de que es IA, política de privacidad, y DPA con Anthropic.

**"¿El bot SIN IA también necesita RGPD?"**
Sí, si trata datos personales (número de WhatsApp = dato personal). No necesita el aviso de IA.

**"¿Tengo que registrarme en la AEPD?"**
No. Desde el RGPD ya no hay que inscribir ficheros. Pero sí debes tener el RAT disponible.

**"¿Puedo guardar los NIF en texto plano?"**
Técnicamente sí, pero es mala práctica. FacturAI ya los cifra — no cambies esto.

**"¿Qué pasa si Anthropic sufre una brecha de datos?"**
Anthropic te notifica según su DPA. Tú tienes 72 horas para notificar a la AEPD y a los afectados.

**"¿Necesito un Delegado de Protección de Datos (DPO)?"**
Solo si tratas datos a gran escala o datos sensibles (salud, ideología…). Para una agencia
de automatización pequeña, normalmente no es obligatorio, pero sí recomendable tener a
alguien responsable del cumplimiento.

---

## 8. Referencias legales

- [RGPD (Reglamento UE 2016/679)](https://eur-lex.europa.eu/eli/reg/2016/679/oj/spa)
- [LOPDGDD (Ley Orgánica 3/2018)](https://www.boe.es/eli/es/lo/2018/12/05/3/con)
- [AI Act (Reglamento UE 2024/1689)](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- [Guía de la AEPD para empresas](https://www.aepd.es/guias)
- [DPA de Anthropic](https://www.anthropic.com/legal/data-processing-addendum)
- [EU-US Data Privacy Framework](https://www.dataprivacyframework.gov/)

---

*Este documento es orientativo y no constituye asesoramiento jurídico. Para casos complejos,
consulta con un abogado especializado en protección de datos.*
