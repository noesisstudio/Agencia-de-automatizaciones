# Guía de instalación — Bot A (flujos predefinidos)

Tiempo estimado: 4–8 horas según la complejidad del cliente.
No necesitas saber programar para esta guía. Solo seguir los pasos en orden.

---

## ANTES DE EMPEZAR — Lo que necesitas tener listo

- [ ] Cuenta en [voiceflow.com](https://voiceflow.com) (puedes crearte una gratis)
- [ ] Cuenta en [make.com](https://make.com) (plan gratuito suficiente para empezar)
- [ ] Cuenta en [railway.app](https://railway.app) (solo si usas el webhook receiver opcional)
- [ ] Acceso al gestor de contenidos (WordPress, Wix, Squarespace...) de la web del cliente
- [ ] El documento firmado: contrato + DPA con el cliente
- [ ] La información del cliente: horarios, precios, FAQs, política de devoluciones, etc.

---

## FASE 1 — Voiceflow: crear el proyecto

### Paso 1.1 — Crear el proyecto

1. Entra en [voiceflow.com](https://voiceflow.com) y haz clic en **Create new project**
2. Selecciona **Web Chat** como canal
3. Nombre del proyecto: usa el nombre del cliente (ej: `Clinica Perez`)
4. Idioma: **Spanish**
5. Haz clic en **Create project**

---

### Paso 1.2 — Construir el nodo de bienvenida (obligatorio LSSI)

1. Verás el canvas en blanco con un bloque de inicio
2. Haz clic en el bloque de inicio → añade un bloque **Speak**
3. Escribe el texto de bienvenida:
   ```
   Hola 👋 Soy el asistente virtual de [Nombre Empresa],
   un sistema automatizado. ¿En qué puedo ayudarte hoy?
   ```
4. Debajo del Speak, añade un bloque **Choice** con los botones principales
   (máximo 4-5 opciones, ejemplos):
   ```
   📅 Pedir cita
   💰 Precios y servicios
   🕐 Horarios y ubicación
   📞 Hablar con una persona
   ```

> ⚠️ El texto "soy el asistente virtual" y "sistema automatizado" son obligatorios
> por la LSSI. No los elimines ni los cambies por un nombre humano sin esta aclaración.

---

### Paso 1.3 — Construir cada rama del menú

Por cada botón del paso anterior, crea su flujo:

**Rama "Pedir cita":**
1. Añade un bloque **Speak** con el aviso RGPD (obligatorio antes de pedir datos):
   ```
   Antes de continuar: tus datos serán tratados por [Empresa]
   para gestionar tu consulta. Consulta nuestra política de
   privacidad en: [URL]
   ```
2. Añade un bloque **Capture** → Variable: `nombre` → Pregunta: `¿Cuál es tu nombre?`
3. Añade otro **Capture** → Variable: `email` → Pregunta: `¿Y tu email?`
4. Añade otro **Capture** → Variable: `telefono` → Pregunta: `¿Y tu teléfono?`
5. Añade un bloque **Speak**:
   ```
   Perfecto, {nombre}. Nuestro equipo te contactará pronto
   para confirmar tu cita. ¿Necesitas algo más?
   ```
6. Conecta al nodo de confirmación (ver Paso 1.5)

**Rama "Precios y servicios":**
1. Añade un bloque **Speak** con los precios del cliente (cópialos tal cual te los dé)
2. Al final, añade un bloque **Choice**:
   ```
   📅 Quiero pedir cita
   🔙 Volver al menú
   ```

**Rama "Horarios y ubicación":**
1. Añade un bloque **Speak** con los horarios y dirección exactos del cliente
2. Puedes añadir la URL de Google Maps si la tienen

**Rama "Hablar con una persona":**
1. Añade un bloque **Speak**:
   ```
   Claro, voy a necesitar tus datos para que el equipo te contacte.
   ```
2. Sigue con los bloques **Capture** de nombre, email y teléfono (igual que "Pedir cita")

---

### Paso 1.4 — Configurar el fallback (respuesta cuando no entiende)

1. En el menú lateral izquierdo, busca **Settings**
2. Ve a la sección **Default responses** o **No match**
3. Escribe el texto de fallback:
   ```
   No he entendido bien tu consulta. Por favor, elige una opción:
   ```
4. Conecta de vuelta al menú principal (bloque Choice del paso 1.2)

---

### Paso 1.5 — Nodo de confirmación y disparo del webhook

Este nodo se activa cuando el usuario ha dejado sus datos. Aquí conectamos con Make.

1. Añade un bloque **Integration → API Request**
2. Configura:
   - **Method:** POST
   - **URL:** _(la URL de Make que copiarás en la Fase 2 — déjala vacía por ahora)_
   - **Body (JSON):**
     ```json
     {
       "nombre": "{nombre}",
       "email": "{email}",
       "telefono": "{telefono}",
       "consulta": "Solicitud de cita / contacto"
     }
     ```
3. Después del API Request, añade un **Speak** de confirmación:
   ```
   ¡Listo! En breve recibirás un email de confirmación.
   ¿Puedo ayudarte con algo más?
   ```

---

### Paso 1.6 — Publicar el bot y obtener el Project ID

1. En la esquina superior derecha, haz clic en **Publish**
2. Ve a **Settings → Integrations → Web Chat**
3. Activa el toggle de Web Chat
4. Copia el **Project ID** (lo necesitarás en la Fase 3)
   - Tiene este aspecto: `65abc123def456`

---

## FASE 2 — Make.com: las integraciones

### Paso 2.1 — Crear el escenario

1. Entra en [make.com](https://make.com) y haz clic en **Create a new scenario**
2. Haz clic en el círculo central con el símbolo `+`
3. Busca **Webhooks** → selecciona **Custom Webhook**
4. Haz clic en **Add** → **Create a webhook**
5. Ponle nombre: `Bot A - [Nombre Cliente]`
6. Haz clic en **Copy address** y guarda esa URL — la necesitas en el Paso 1.5 de Voiceflow

---

### Paso 2.2 — Volver a Voiceflow y pegar la URL del webhook

1. Vuelve a Voiceflow → bloque **API Request** del Paso 1.5
2. Pega la URL de Make en el campo **URL**
3. Publica de nuevo el bot

---

### Paso 2.3 — Probar la conexión

1. En Make, el módulo Webhook muestra **Waiting for data**
2. Abre el bot de Voiceflow en modo preview (botón Play arriba a la derecha)
3. Completa el flujo con datos de prueba (nombre, email, teléfono inventados)
4. En Make, deberías ver que el webhook recibió los datos
5. Haz clic en **OK** para guardar la estructura de datos

---

### Paso 2.4 — Añadir el módulo de CRM

Después del webhook, haz clic en `+` para añadir el siguiente módulo:

**Si el cliente usa HubSpot:**
1. Busca **HubSpot CRM** → **Create/Update a Contact**
2. Conecta tu cuenta de HubSpot
3. Mapea los campos:
   - First Name → `nombre` (del webhook)
   - Email → `email`
   - Phone → `telefono`

**Si el cliente usa Google Sheets:**
1. Busca **Google Sheets** → **Add a Row**
2. Conecta tu cuenta de Google
3. Selecciona la hoja de cálculo del cliente
4. Mapea las columnas con los datos del webhook

**Si el cliente no tiene CRM:**
Usa Google Sheets como CRM básico: crea una hoja nueva con columnas
`Nombre | Email | Teléfono | Consulta | Fecha`

---

### Paso 2.5 — Añadir email de confirmación al usuario

1. Después del módulo de CRM, añade otro módulo `+`
2. Busca **Email** → **Send an Email**
   (o **Gmail** si el cliente usa Gmail)
3. Configura:
   - **To:** `email` (del webhook)
   - **Subject:** `Hemos recibido tu consulta — [Nombre Empresa]`
   - **Content:**
     ```
     Hola {nombre},

     Hemos recibido tu consulta y nuestro equipo te
     contactará lo antes posible.

     Gracias por contactar con [Nombre Empresa].
     ```

---

### Paso 2.6 — Añadir notificación al equipo del cliente

1. Añade otro módulo `+`
2. Busca **Email** → **Send an Email**
3. Configura:
   - **To:** email del equipo del cliente
   - **Subject:** `Nuevo contacto desde el chatbot — {nombre}`
   - **Content:**
     ```
     Nuevo lead desde el chatbot web:

     Nombre: {nombre}
     Email: {email}
     Teléfono: {telefono}
     Consulta: {consulta}
     ```

---

### Paso 2.7 — Activar el escenario

1. En la esquina inferior izquierda, activa el toggle **ON**
2. Haz una prueba completa desde el principio:
   - Abre el bot → completa el flujo → revisa Make → revisa el CRM → revisa los emails

---

## FASE 3 — Embed del widget en la web del cliente

### Paso 3.1 — Preparar el snippet

Abre el fichero `1-widget-embed/snippet.html` y sustituye:
- `TU_PROJECT_ID` → el Project ID que copiaste en el Paso 1.6
- `/politica-de-privacidad` → la URL real de la política de privacidad del cliente

El resultado es algo así:
```html
<script type="text/javascript">
  (function(d, t) {
    var v = d.createElement(t), s = d.getElementsByTagName(t)[0];
    v.onload = function() {
      window.voiceflow.chat.load({
        verify: { projectID: '65abc123def456' }
      });
      if (!localStorage.getItem('chatbot_notice_accepted')) {
        setTimeout(function() {
          document.getElementById('chatbot-legal-notice').style.display = 'block';
        }, 1500);
      }
    };
    v.src = 'https://cdn.voiceflow.com/widget/bundle.mjs';
    s.parentNode.insertBefore(v, s);
  })(document, 'script');
</script>
```

---

### Paso 3.2 — Instalar en la web del cliente según su plataforma

**WordPress:**
1. Instala el plugin gratuito **Insert Headers and Footers**
   (Plugins → Añadir nuevo → busca "Insert Headers and Footers")
2. Ve a Settings → Insert Headers and Footers
3. En la sección **Scripts in Footer**, pega el snippet completo
4. Guarda

**Wix:**
1. Ve a tu panel de Wix → Settings → Custom Code
2. Haz clic en **+ Add Custom Code**
3. Pega el snippet
4. Selecciona **Body - end** como ubicación
5. Aplica a **All pages**
6. Guarda y publica

**Shopify:**
1. Online Store → Themes → Edit code
2. Abre el fichero `theme.liquid`
3. Pega el snippet justo antes de `</body>`
4. Guarda

**HTML estático:**
1. Abre el fichero `index.html` (o el fichero principal del cliente)
2. Pega el snippet justo antes de `</body>`
3. Sube el fichero al servidor

---

### Paso 3.3 — Verificar la instalación

1. Abre la web del cliente en una pestaña de incógnito
2. El botón del chat debe aparecer en la esquina inferior derecha
3. Al hacer clic, debe aparecer el aviso legal y el mensaje de bienvenida
4. Completa el flujo completo con datos de prueba
5. Verifica que llegan al CRM y los emails funcionan

---

### Paso 3.4 — Pruebas obligatorias

- [ ] Escritorio: Chrome, Firefox, Safari
- [ ] Móvil: abre la web desde el móvil y prueba todo el flujo
- [ ] El aviso "soy un asistente virtual" aparece correctamente
- [ ] El botón "Entendido" cierra el aviso y no vuelve a aparecer
- [ ] Prueba qué pasa si el usuario escribe texto libre fuera del árbol → fallback amable
- [ ] Prueba si el usuario escribe "¿eres humano?" → debe responder honestamente

---

## FASE 4 — Legal (no saltarse)

### Paso 4.1 — Documentos a firmar

1. Abre `4-documentos-legales/plantilla-contrato-servicios.md`
2. Rellena todos los campos entre corchetes
3. Convierte a PDF (puedes usar Google Docs → Archivo → Descargar como PDF)
4. Envía al cliente para firma (DocuSign, Signaturit, o firma física)
5. Guarda el PDF firmado en tu carpeta de clientes

Haz lo mismo con el DPA (está integrado en el contrato como cláusula 7).

### Paso 4.2 — Textos para la web del cliente

Entrega al cliente los textos de `2-textos-legales/textos-widget.md`:

1. **Aviso de asistente virtual:** ya está en el snippet (el `<div id="chatbot-legal-notice">`)
2. **Política de privacidad:** el cliente tiene que añadir el párrafo de "ASISTENTE VIRTUAL"
   a su política. Si no sabe cómo, hazlo tú (suele ser editable en WordPress desde
   Páginas → Política de privacidad)
3. **Banner de cookies:** el cliente tiene que añadir la entrada `chatbot_notice_accepted`
   a su gestor de cookies (Cookiebot, Usercentrics, Real Cookie Banner, etc.)

### Paso 4.3 — DPAs de subencargados

Acepta estos DPAs si aún no lo has hecho:
- **Voiceflow:** voiceflow.com/legal → descargar PDF como justificante
- **Make:** make.com/en/legal → descargar PDF
- Si usas HubSpot: hubspot.com/legal/dpa

---

## FASE 5 — Entrega al cliente

### Paso 5.1 — Recorrer el checklist

Abre `5-checklist-entrega/checklist-bot-a.md` y marca cada punto.
No entregues el proyecto hasta que todos los puntos estén marcados.

### Paso 5.2 — Documento de entrega al cliente

Entrega un PDF simple con:
- URL del bot activo en su web
- Cómo solicitar cambios en los flujos (contacto de soporte tuyo)
- Qué información debe mantenerse actualizada y cómo avisarte
- SLA de soporte (tiempo de respuesta a incidencias)

### Paso 5.3 — Enviar la primera factura

- Setup: [importe acordado] €
- El mantenimiento mensual empieza el mes siguiente

---

## PROBLEMAS FRECUENTES Y SOLUCIONES

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| El widget no aparece en la web | El snippet está mal pegado | Verifica que está antes de `</body>`, no en el `<head>` |
| El webhook de Make no recibe datos | URL mal copiada en Voiceflow | Copia de nuevo desde Make y vuelve a pegar en Voiceflow |
| El email de confirmación llega al spam | El dominio de envío no tiene SPF/DKIM | Pide al cliente que configure SPF en su DNS o usa su email de Gmail |
| El bot no abre en móvil | CSS del cliente interfiere | Añade `z-index: 9999` al widget desde Voiceflow Settings → Appearance |
| Make no ejecuta el escenario | El escenario está en OFF | Activa el toggle ON en Make |
| Voiceflow pide pagar para publicar | Plan gratuito limitado | Pasa al plan Creator (~50 €/mes) o repercútelo al cliente |
