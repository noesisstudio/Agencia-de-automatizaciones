# Guía de instalación — Bot B (con IA)

Tiempo estimado: 2–3 días para el primer cliente. A partir del segundo: 1 día.
Necesitas saber usar la terminal (abrir Terminal en Mac y escribir comandos).

---

## ANTES DE EMPEZAR — Lo que necesitas tener listo

- [ ] Terminal abierta (en Mac: Spotlight → Terminal)
- [ ] Node.js instalado: ejecuta `node -v` en la terminal. Si dice "command not found",
      descárgalo en [nodejs.org](https://nodejs.org) (versión LTS)
- [ ] Git instalado: ejecuta `git -v` en la terminal
- [ ] Cuenta en [supabase.com](https://supabase.com) (gratis)
- [ ] Cuenta en [console.anthropic.com](https://console.anthropic.com) (necesitas tarjeta)
- [ ] Cuenta en [voyageai.com](https://voyageai.com) (gratis hasta 200M tokens/mes)
- [ ] Cuenta en [railway.app](https://railway.app) (gratis con $5 de crédito/mes)
- [ ] Acceso al gestor de contenidos de la web del cliente
- [ ] Contrato + DPA firmado con el cliente
- [ ] Documentos del cliente: FAQs, precios, horarios, catálogo, política, etc.

---

## FASE 1 — Supabase: la base de datos

### Paso 1.1 — Crear el proyecto

1. Entra en [supabase.com](https://supabase.com) → **New project**
2. Nombre: `bot-b-[nombre-cliente]` (ej: `bot-b-clinica-perez`)
3. Database password: genera una contraseña fuerte y **guárdala** (la necesitarás)
4. Region: **West EU (Ireland)** — obligatorio para datos en la UE
5. Haz clic en **Create new project** y espera ~2 minutos

---

### Paso 1.2 — Ejecutar el SQL de setup

1. En el panel de Supabase, ve al menú lateral → **SQL Editor**
2. Haz clic en **New query**
3. Abre el fichero `supabase/001_setup_pgvector.sql` de este proyecto
4. Copia todo el contenido y pégalo en el editor de Supabase
5. Haz clic en **Run** (o pulsa Cmd+Enter)
6. Deberías ver: `Success. No rows returned`

Para verificar que todo se creó bien:
1. Ve al menú lateral → **Table Editor**
2. Deberías ver las tablas: `knowledge_chunks`, `conversations`, `leads`

---

### Paso 1.3 — Copiar las credenciales de Supabase

1. Ve a **Settings** (icono de engranaje en el menú lateral) → **API**
2. Copia y guarda en un lugar seguro:
   - **Project URL** → esto será tu `SUPABASE_URL`
   - **service_role** (en la sección "Project API keys") → esto será tu `SUPABASE_SERVICE_KEY`

> ⚠️ La `service_role` key tiene acceso total a la base de datos.
> Nunca la pongas en el código ni la subas a GitHub.

---

## FASE 2 — Anthropic: el motor de IA

### Paso 2.1 — Crear la cuenta y aceptar el DPA

1. Entra en [console.anthropic.com](https://console.anthropic.com)
2. Crea tu cuenta o inicia sesión
3. **Aceptar el DPA (obligatorio antes de usar con clientes):**
   - Ve a **Settings** → **Privacy**
   - Haz clic en **Data Processing Agreement**
   - Acepta el acuerdo
   - Descarga el PDF y guárdalo en tu carpeta legal de la agencia

### Paso 2.2 — Añadir método de pago

1. Ve a **Settings** → **Billing**
2. Añade tu tarjeta (se cobra por uso real, no hay cuota fija)
3. Configura una alerta de gasto: **Billing** → **Usage alerts** → añade alerta a 50 €
   Así te avisan si el gasto sube inesperadamente.

### Paso 2.3 — Generar la API key

1. Ve a **Settings** → **API Keys**
2. Haz clic en **Create Key**
3. Nombre: `bot-b-[nombre-cliente]`
4. Copia la key → empieza por `sk-ant-...`
5. **Guárdala ahora** — no se puede ver de nuevo después de cerrar la ventana

---

## FASE 3 — Voyage AI: los embeddings

### Paso 3.1 — Crear la cuenta

1. Entra en [voyageai.com](https://voyageai.com)
2. Crea tu cuenta
3. Ve a **API Keys** → **Create new key**
4. Nombre: `agencia-chatbots`
5. Copia la key

> Voyage AI tiene 200 millones de tokens gratis al mes.
> Para una base de conocimiento de un cliente pequeño (~100 documentos),
> el coste es prácticamente 0 durante meses.

---

## FASE 4 — Preparar el backend en tu ordenador

### Paso 4.1 — Descargar el código

Abre la Terminal y ejecuta:

```bash
# Navega a la carpeta donde quieres trabajar (ej: el Escritorio)
cd ~/Desktop

# Copia la carpeta del backend (ajusta la ruta si es diferente)
cp -r "/Users/xagri/Documents/GitHub/Agencia de automatizaciones/Agencia-de-automatizaciones/Chatbot pagina web/bot-b/backend" "./bot-b-[nombre-cliente]"

# Entra en la carpeta
cd "./bot-b-[nombre-cliente]"

# Instala las dependencias
npm install
```

Deberías ver que se instalan los paquetes. Al terminar, aparece algo como:
`added 87 packages in 12s`

---

### Paso 4.2 — Crear el fichero de configuración

1. En la terminal, dentro de la carpeta del backend:
```bash
cp .env.example .env
```

2. Abre el fichero `.env` con cualquier editor de texto (TextEdit en Mac, o VS Code)
3. Rellena cada variable con los valores que has ido copiando:

```
ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXX        ← tu key de Anthropic
SUPABASE_URL=https://XXXX.supabase.co      ← tu URL de Supabase
SUPABASE_SERVICE_KEY=eyJXXXXXX             ← tu service role key
VOYAGE_API_KEY=pa-XXXXXXXXXX               ← tu key de Voyage AI
TENANT_ID=nombre-cliente                   ← sin espacios, todo minúsculas
EMPRESA_NOMBRE=Nombre Empresa              ← nombre que verá el usuario
SMTP_HOST=smtp.gmail.com                   ← servidor de email del cliente
SMTP_PORT=587
SMTP_USER=email@cliente.com                ← email del cliente
SMTP_PASS=contraseña_de_aplicacion         ← ver Paso 4.3
EMAIL_EQUIPO=equipo@cliente.com            ← quién recibe los leads
ALLOWED_ORIGINS=https://cliente.com        ← dominio de la web del cliente
PORT=3000
```

---

### Paso 4.3 — Configurar la contraseña de email (Gmail)

Si el cliente usa Gmail, no puedes usar su contraseña normal. Necesitas una "Contraseña de aplicación":

1. El cliente entra en su cuenta de Google → [myaccount.google.com](https://myaccount.google.com)
2. **Seguridad** → **Verificación en dos pasos** (debe estar activada)
3. Al final de esa página → **Contraseñas de aplicación**
4. Selecciona **Correo** + **Otro dispositivo** → escribe "Chatbot"
5. Google genera una contraseña de 16 caracteres → cópiala
6. Esa contraseña va en `SMTP_PASS` del `.env`

---

### Paso 4.4 — Probar el backend en local

En la terminal:
```bash
npm run dev
```

Deberías ver:
```
Bot B backend · tenant=nombre-cliente · puerto=3000
```

Para verificar que funciona, abre otra pestaña de terminal y ejecuta:
```bash
curl http://localhost:3000/health
```

Respuesta esperada:
```json
{"status":"ok","tenant":"nombre-cliente"}
```

Si ves esto, el backend funciona. Pulsa `Ctrl+C` en la primera terminal para pararlo.

---

## FASE 5 — Base de conocimiento: cargar los documentos del cliente

### Paso 5.1 — Preparar los documentos

1. Crea una carpeta llamada `conocimiento` dentro de la carpeta del backend:
```bash
mkdir conocimiento
```

2. Dentro de esa carpeta, crea ficheros `.txt` con la información del cliente.
   Un fichero por tema es lo más ordenado:
   - `precios.txt` → todos los precios y tarifas
   - `servicios.txt` → descripción de cada servicio
   - `horarios.txt` → horarios, dirección, teléfono
   - `faqs.txt` → preguntas frecuentes con sus respuestas
   - `politica.txt` → política de cancelación, devoluciones, garantías

**Formato de los ficheros (ejemplo `faqs.txt`):**
```
¿Qué incluye la primera consulta?
La primera consulta incluye una valoración inicial de 45 minutos...

¿Aceptáis seguro médico?
Trabajamos con Sanitas, Adeslas y Asisa. Para otras aseguradoras...

¿Cuánto tiempo duran los tratamientos?
Depende del caso. Los tratamientos estándar duran entre 3 y 6 meses...
```

> Cuanta más información pongas, mejor responderá el bot.
> Incluye también las preguntas que el cliente recibe por teléfono habitualmente.

---

### Paso 5.2 — Cargar los documentos en Supabase

Con el fichero `.env` configurado y la terminal en la carpeta del backend:

```bash
node scripts/upload-knowledge.js ./conocimiento/
```

Verás algo como:
```
🚀 Cargando conocimiento para tenant: clinica-perez
   Ficheros: 5

📄 precios.txt → 3 fragmentos
  [1/3] generando embedding... ✓
  [2/3] generando embedding... ✓
  [3/3] generando embedding... ✓

📄 faqs.txt → 8 fragmentos
  [1/8] generando embedding... ✓
  ...

✅ Base de conocimiento actualizada correctamente.
```

---

### Paso 5.3 — Probar la búsqueda semántica

Para verificar que la base de conocimiento funciona, prueba una conversación real:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "prueba-001",
    "messages": [{"role": "user", "content": "¿Cuánto cuesta la primera consulta?"}]
  }'
```

La respuesta debe incluir información real del cliente extraída de los documentos.

Si la respuesta dice "No tengo información confirmada sobre eso", significa que:
- El documento no tiene esa información → añádela
- El fragmento es demasiado pequeño para encontrarse → revisa el fichero

Haz esta prueba con al menos 20 preguntas reales antes de continuar.

---

## FASE 6 — Desplegar el backend en Railway

### Paso 6.1 — Subir el código a GitHub

Railway despliega desde GitHub. Primero sube el código:

```bash
# Desde la carpeta del backend
git init
git add .
git commit -m "Bot B - [nombre cliente] - setup inicial"
```

Luego crea un repositorio **privado** en GitHub:
1. Ve a [github.com](https://github.com) → **New repository**
2. Nombre: `bot-b-[nombre-cliente]`
3. Selecciona **Private** (importante — tiene las keys en .gitignore)
4. **No** marques "Initialize this repository"
5. Copia los comandos que te da GitHub para subir el código y ejecútalos en la terminal

> ⚠️ Verifica que `.env` está en `.gitignore` antes de hacer push.
> El fichero `.env` nunca debe subirse a GitHub.

---

### Paso 6.2 — Crear el proyecto en Railway

1. Entra en [railway.app](https://railway.app)
2. Haz clic en **New Project**
3. Selecciona **Deploy from GitHub repo**
4. Conecta tu cuenta de GitHub si no lo has hecho
5. Selecciona el repositorio `bot-b-[nombre-cliente]`
6. Railway detecta automáticamente que es Node.js y lo despliega

---

### Paso 6.3 — Añadir las variables de entorno en Railway

Railway no tiene tu `.env` — tienes que añadir las variables manualmente:

1. En tu proyecto de Railway, ve a la pestaña **Variables**
2. Haz clic en **Add Variable** para cada variable del `.env`:

```
ANTHROPIC_API_KEY    = sk-ant-XXXXXXXXXX
SUPABASE_URL         = https://XXXX.supabase.co
SUPABASE_SERVICE_KEY = eyJXXXXXX
VOYAGE_API_KEY       = pa-XXXXXXXXXX
TENANT_ID            = nombre-cliente
EMPRESA_NOMBRE       = Nombre Empresa
SMTP_HOST            = smtp.gmail.com
SMTP_PORT            = 587
SMTP_USER            = email@cliente.com
SMTP_PASS            = contraseña_de_aplicacion
EMAIL_EQUIPO         = equipo@cliente.com
ALLOWED_ORIGINS      = https://cliente.com
```

3. Railway redespliega automáticamente al añadir variables

---

### Paso 6.4 — Obtener la URL pública del backend

1. En Railway, ve a la pestaña **Settings** → **Networking**
2. Haz clic en **Generate Domain**
3. Railway te da una URL como: `https://bot-b-cliente.up.railway.app`
4. Guarda esta URL — la necesitas para el widget

---

### Paso 6.5 — Verificar el despliegue

Abre en el navegador: `https://bot-b-cliente.up.railway.app/health`

Debe responder:
```json
{"status":"ok","tenant":"nombre-cliente"}
```

Si ves un error, ve a la pestaña **Logs** de Railway para ver qué falla.

---

## FASE 7 — Widget: instalar en la web del cliente

### Paso 7.1 — Servir el widget desde Railway (más sencillo)

Añade este código al final de `src/index.js` para servir el widget como fichero estático:

```javascript
const path = require('path');
app.use('/widget', express.static(path.join(__dirname, '../../widget')));
```

Así el widget estará disponible en:
`https://bot-b-cliente.up.railway.app/widget/widget.js`

Redespliega subiendo el cambio a GitHub:
```bash
git add src/index.js
git commit -m "servir widget como estático"
git push
```

---

### Paso 7.2 — Preparar el snippet

Abre `widget/snippet.html` y sustituye los valores:

```html
<script
  src="https://bot-b-cliente.up.railway.app/widget/widget.js"
  data-api-url="https://bot-b-cliente.up.railway.app"
  data-bot-nombre="Asistente de [Empresa]"
  data-color="#0066cc"
  defer
></script>
```

Cambia `#0066cc` por el color de marca del cliente (en formato hex).

---

### Paso 7.3 — Instalar en la web del cliente

Igual que en el Bot A (Fase 3, Paso 3.2) según la plataforma:

**WordPress:**
Plugins → Insert Headers and Footers → Scripts in Footer → pegar snippet → Guardar

**Wix:**
Settings → Custom Code → Add Custom Code → Body end → All pages → pegar → Guardar

**Shopify:**
Online Store → Themes → Edit code → theme.liquid → antes de `</body>` → pegar → Guardar

**HTML estático:**
Antes de `</body>` en el fichero principal → guardar → subir al servidor

---

### Paso 7.4 — Actualizar ALLOWED_ORIGINS

1. Ve a Railway → Variables
2. Edita `ALLOWED_ORIGINS` con el dominio exacto del cliente:
   ```
   https://cliente.com,https://www.cliente.com
   ```
   (con y sin www, separados por coma)
3. Railway redespliega automáticamente

---

### Paso 7.5 — Pruebas obligatorias

- [ ] Abre la web del cliente en incógnito → el widget aparece
- [ ] El aviso "asistente virtual automatizado — sistema de IA" aparece antes del primer mensaje
- [ ] El botón "Entendido" cierra el aviso y no vuelve a aparecer
- [ ] Escribe una pregunta real del sector → el bot responde con información del cliente
- [ ] Escribe "¿eres humano?" → el bot responde que es una IA
- [ ] Escribe algo fuera de ámbito → el bot redirige amablemente
- [ ] Proporciona un email en el chat → llega la notificación al equipo
- [ ] El usuario recibe email de confirmación
- [ ] El lead aparece en Supabase (Table Editor → leads)
- [ ] La conversación aparece en Supabase (Table Editor → conversations)
- [ ] Latencia media < 3 segundos (cronométrala en 5 preguntas)
- [ ] Prueba en móvil (iOS Safari + Android Chrome)

---

## FASE 8 — Legal

### Paso 8.1 — Documentos a firmar

Los mismos que en Bot A más:

1. **Contrato con cláusulas adicionales de IA:**
   - Cláusula AI Act (identificación como IA)
   - Cláusula anti-alucinaciones (el bot puede equivocarse)
   - Limitación de responsabilidad por contenido generado por IA

2. **DPAs adicionales que debes haber aceptado:**
   - Anthropic: console.anthropic.com → Settings → Privacy → DPA
   - Supabase: supabase.com/privacy (descarga el PDF)
   - Voyage AI: voyageai.com/terms (si manejas datos sensibles)

3. **Para sectores sensibles:** antes de desplegar, realiza o contrata el EIPD.

### Paso 8.2 — System prompt: aprobación del cliente

El system prompt (`src/services/systemPrompt.js`) es lo que define cómo se comporta el bot.
El cliente debe aprobarlo por escrito antes de que el bot esté activo:

1. Copia el contenido de `buildSystemPrompt` del fichero
2. Envíalo al cliente en un email o PDF
3. Guarda la respuesta del cliente como justificante de aprobación

### Paso 8.3 — Textos en la web del cliente

Igual que Bot A, más:
- La política de privacidad del cliente debe mencionar a **Anthropic** como subencargado
- El primer mensaje del bot ya incluye "soy un sistema de inteligencia artificial"
  (está en el widget y en el system prompt — no modificar)

---

## FASE 9 — Entrega

### Paso 9.1 — Checklist final

Recorre `checklist-bot-b.md` punto por punto.
No entregues hasta que todos los puntos estén marcados.

### Paso 9.2 — Actualización futura de la base de conocimiento

Cuando el cliente cambie precios, servicios u horarios, ejecutas:

```bash
# Actualiza los ficheros .txt en la carpeta conocimiento/
# Luego ejecuta de nuevo:
node scripts/upload-knowledge.js ./conocimiento/
```

El script borra los fragmentos anteriores del mismo fichero y carga los nuevos.
No afecta al resto de la base de conocimiento.

### Paso 9.3 — Primera factura

- Setup: [importe acordado] €
- Mantenimiento mensual: [importe acordado] €/mes
- Coste de operación: [importe real de Railway + Supabase + Anthropic del mes] €/mes

---

## PROBLEMAS FRECUENTES Y SOLUCIONES

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| `node -v` dice "command not found" | Node.js no instalado | Descarga en nodejs.org versión LTS |
| `npm install` da errores | Node desactualizado | Actualiza Node a versión 18 o superior |
| `/health` no responde en Railway | Variables de entorno mal configuradas | Revisa la pestaña Logs de Railway |
| El bot responde "no tengo información" a todo | Base de conocimiento vacía o mal cargada | Ejecuta de nuevo `upload-knowledge.js` y verifica en Supabase → Table Editor → knowledge_chunks |
| El widget no carga en la web | CORS bloqueando | Verifica que `ALLOWED_ORIGINS` incluye el dominio exacto con `https://` |
| El email no llega | SMTP mal configurado | Verifica SMTP_HOST, SMTP_USER y que usas contraseña de aplicación (no la contraseña normal) |
| Railway para el servicio | Plan gratuito agotado | Añade tarjeta en Railway o revisa el consumo del mes |
| La respuesta del bot tarda más de 5 segundos | Modelo demasiado grande o RAG lento | Verifica que usas Haiku (no Sonnet) en `claude.js`. Si el RAG es lento, revisa el índice HNSW en Supabase |
| Error "Invalid API Key" en los logs | Key de Anthropic errónea o expirada | Genera una nueva key en console.anthropic.com |
