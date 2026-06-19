# Guía del Chatbot Multi-Tenant con Supabase y n8n

Esta guía explica detalladamente **cómo funciona** la arquitectura profesional multi-tenant (un solo flujo para muchos clientes) y **cómo instalarlo** paso a paso.

---

## 1. ¿Cómo funciona el sistema? (El flujo de datos)

En lugar de tener un flujo de n8n y un Google Sheet por cada cliente, esta arquitectura centraliza todo en **un único flujo de n8n** y **un único proyecto de Supabase**.

El flujo funciona así ante cada mensaje:

```
Usuario                     Meta (WhatsApp)            n8n (Workflow único)          Supabase (BD)
   │                              │                             │                           │
   │─── Envía mensaje "hola" ────>│                             │                           │
   │                              │── Webhook (POST) c/msg ───>│                           │
   │                              │    y phone_number_id        │                           │
   │                              │                             │─── 1. Busca Tenant ─────>│
   │                              │                             │    por phone_number_id    │
   │                              │                             │<── Devuelve Token, etc. ──│
   │                              │                             │                           │
   │                              │                             │─── 2. Busca respuestas ──>│
   │                              │                             │    del Tenant             │
   │                              │                             │<── Devuelve keywords ─────│
   │                              │                             │                           │
   │                              │                             │ [Compara msg con keywords]│
   │                              │<── 3. Envía respuesta ──────│                           │
   │                              │    (usando Token de Tenant) │                           │
   │<── Entrega mensaje ──────────│                             │                           │
   │                              │                             │─── 4. Guarda conversa ───>│
```

### Ventajas de este modelo
* **Mantenimiento cero**: Si mejoras el flujo en n8n, la mejora se aplica automáticamente a todos tus clientes.
* **Aislamiento de datos**: Aunque todo está en la misma base de datos, cada cliente tiene su `tenant_id` y puedes limitar qué ve cada uno (gracias a las políticas RLS de Supabase).
* **Escalabilidad**: Dar de alta un cliente nuevo no requiere tocar n8n; solo añades una fila en la base de datos de Supabase.

---

## 2. Guía de Instalación Paso a Paso

### Paso 1: Configurar Supabase

1. Ve a [Supabase](https://supabase.com/) y crea un proyecto gratuito.
2. Abre tu proyecto, ve a la sección **SQL Editor** y haz clic en **New query**.
3. Pega el SQL que define las tablas multi-tenant (el contenido de `supabase/chatbot_sin_ia.sql`) y pulsa **Run**.
4. ¡Listo! Ya tienes creadas las tablas `tenants`, `respuestas` y `conversaciones` preparadas.

### Paso 2: Crear el Tenant y sus Respuestas de prueba

Para poder probar el sistema, necesitas registrar tu primera empresa (Tenant) en Supabase:

1. Ve al **Table Editor** en Supabase, entra en la tabla `tenants` y haz clic en **Insert row**.
2. Rellena los datos:
   * `nombre`: Nombre del negocio (ej. `Panadería Central`).
   * `phone_number_id`: El identificador numérico de WhatsApp de Meta (lo obtienes en el panel de desarrolladores de Meta).
   * `meta_access_token`: El Token de Acceso Permanente (System User Token) de ese número en Meta.
   * `mensaje_fallback`: Mensaje de error por defecto (ej: *"No te he entendido. ¿Me lo repites?"*).
3. Ve a la tabla `respuestas` e inserta las respuestas para esta empresa:
   * `tenant_id`: El UUID que se generó automáticamente para tu tenant anterior.
   * `palabras_clave`: `horario, abrir, hora`
   * `respuesta`: `Abrimos de lunes a sábado de 9:00 a 20:00.`
   * `activo`: `true`

### Paso 3: Configurar el workflow de n8n

Necesitas configurar n8n para que interactúe con Supabase:

1. **Crear credenciales de Supabase en n8n**:
   * En n8n, ve a **Credentials** -> **Add Credential** -> **Header Auth**.
   * Crea una llamada `Supabase API Key` con:
     * Name: `apikey`
     * Value: Tu `service_role` key de Supabase (la encuentras en Supabase -> Settings -> API -> Project API Keys).
2. **Importar el Workflow**:
   * Puedes importar tu archivo `.json` de n8n en tu lienzo.
   * Modifica el nodo **Buscar respuesta (BD)** para que haga dos llamadas HTTP a la API REST de Supabase en lugar de leer Google Sheets.

#### Detalle de los nodos HTTP en n8n:

**Nodo 1: Buscar Tenant**
* **Method**: `GET`
* **URL**: `https://TU_PROYECTO.supabase.co/rest/v1/tenants?phone_number_id=eq.{{ $json.phone_number_id }}&select=id,mensaje_fallback,meta_access_token&limit=1`
* **Authentication**: Header Auth (selecciona la credencial que creaste en el paso anterior).

**Nodo 2: Obtener Respuestas**
* **Method**: `GET`
* **URL**: `https://TU_PROYECTO.supabase.co/rest/v1/respuestas?tenant_id=eq.{{ $('Buscar Tenant').item.json.id }}&activo=eq.true&select=palabras_clave,respuesta`
* **Authentication**: Header Auth.

**Nodo 3: Enviar WhatsApp (Graph API)**
* Modifica la URL para usar el token dinámico de la base de datos:
  * **Method**: `POST`
  * **URL**: `https://graph.facebook.com/v21.0/{{ $('Extraer datos').item.json.phone_number_id }}/messages`
  * **Headers**: `Authorization: Bearer {{ $('Buscar Tenant').item.json.meta_access_token }}`
  * **Body**: El JSON habitual con la respuesta elegida.

**Nodo 4: Registrar conversación (Opcional pero recomendado)**
* **Method**: `POST`
* **URL**: `https://TU_PROYECTO.supabase.co/rest/v1/conversaciones`
* **Authentication**: Header Auth.
* **Body (JSON)**:
  ```json
  {
    "tenant_id": "{{ $('Buscar Tenant').item.json.id }}",
    "telefono": "{{ $('Extraer datos').item.json.from }}",
    "nombre": "{{ $('Extraer datos').item.json.nombre }}",
    "mensaje": "{{ $('Extraer datos').item.json.text }}",
    "respuesta": "{{ $('Buscar coincidencia').item.json.respuesta }}"
  }
  ```

---

## 3. Pruebas y Validación

Una vez activo en n8n:
1. Envía un mensaje desde tu WhatsApp al número configurado.
2. n8n recibirá el webhook, consultará a Supabase usando el ID de teléfono, encontrará el cliente, buscará la respuesta correcta y te la enviará de vuelta.
3. Podrás ver el registro en tiempo real en la tabla `conversaciones` de Supabase.
