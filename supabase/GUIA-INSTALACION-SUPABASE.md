# Guía de Instalación y Configuración del Chatbot en Supabase

Esta guía detalla los pasos exactos para configurar la base de datos **multi-tenant** en Supabase, registrar clientes y conectar el sistema con n8n usando el método de **fallback directo** (derivación por teléfono/email sin IA).

---

## Paso 1: Crear el proyecto en Supabase
1. Ve a [Supabase.com](https://supabase.com) y regístrate o inicia sesión.
2. Crea un nuevo proyecto:
   * **Name**: `Chatbots WhatsApp` (o el nombre de tu agencia).
   * **Database Password**: Genera una contraseña segura y guárdala.
   * **Region**: Selecciona una región cercana a tus clientes (ej. `EU (Frankfurt)` o `EU (Ireland)` para cumplir con la GDPR en Europa).
   * **Plan**: Selecciona el plan **Free** (Gratuito).

---

## Paso 2: Crear la estructura de tablas
Una vez dentro del panel de tu proyecto en Supabase:
1. En la barra lateral izquierda, haz clic en **SQL Editor**.
2. Haz clic en **New query** (o en el botón `+` arriba a la izquierda).
3. Abre el archivo [chatbot_sin_ia.sql](file:///Users/xagri/Documents/GitHub/Agencia%20de%20automatizaciones/Agencia-de-automatizaciones/supabase/chatbot_sin_ia.sql) de tu repositorio, copia todo su contenido y pégalo en el editor de Supabase.
4. Haz clic en el botón **Run** (abajo a la derecha).
5. Deberías ver el mensaje: *"Success. No rows returned."*
   > *Nota: Esto habrá creado las tablas `tenants`, `respuestas`, `conversaciones` y `leads` con sus índices y políticas de seguridad (RLS).*

---

## Paso 3: Registrar un Cliente (Tenant)
Para dar de alta a tu primer cliente, usaremos la tabla `tenants`.

1. En la barra lateral izquierda de Supabase, ve a **Table Editor**.
2. Selecciona la tabla `tenants`.
3. Haz clic en **Insert row** (Insertar fila) y rellena los datos del negocio:
   * **nombre**: `Nombre del Cliente` (ej: `Taller Mecánico Pérez`).
   * **phone_number_id**: El ID de teléfono que te da Meta en su panel de desarrolladores (ej: `109283746561928`).
   * **meta_access_token**: El Token de Acceso Permanente generado en Meta para este número.
   * **mensaje_bienvenida**: `¡Hola! Bienvenido al asistente virtual de Taller Pérez. ¿En qué podemos ayudarte?`
   * **mensaje_fallback**: `Lo siento, no he entendido tu consulta. Si quieres hablar con nuestro equipo directly, puedes contactarnos por estas vías:`
   * **email_contacto**: `info@tallerperez.com`
   * **telefono_contacto**: `910 11 22 33` (teléfono fijo de contacto).
4. Haz clic en **Save** (Guardar).
5. **Copia el ID (UUID)** generado automáticamente para este cliente (ej. `a1b2c3d4-e5f6...`), ya que lo necesitarás en el siguiente paso.

---

## Paso 4: Cargar las Respuestas del Cliente
Ahora configuraremos las palabras clave y respuestas que usará el bot para este cliente específico.

1. En el **Table Editor**, selecciona la tabla `respuestas`.
2. Haz clic en **Insert row** y rellena los campos:
   * **tenant_id**: Pega el **ID (UUID)** del cliente que copiaste en el Paso 3.
   * **palabras_clave**: Palabras que activarán esta respuesta separadas por comas (ej: `horario, horas, abrís, abierto`).
   * **respuesta**: La respuesta que enviará el bot (ej: `Nuestro horario es de Lunes a Viernes de 8:00 a 14:00 y de 16:00 a 19:00. Sábados cerrado.`).
   * **prioridad**: `10` (Usa números para ordenar; a mayor número, antes se evalúa la coincidencia).
   * **activo**: `true`.
3. Haz clic en **Save**. Repite el proceso para todas las preguntas frecuentes del cliente (precios, dirección, cita previa, etc.).

---

## Paso 5: Obtener las credenciales para n8n
Para conectar tu flujo único de n8n con Supabase necesitas dos datos:

1. Ve a **Settings** (icono de engranaje en la esquina inferior izquierda de Supabase).
2. Selecciona la sección **API**.
3. Copia los siguientes valores:
   * **Project URL**: Es la URL base de tu base de datos (ej: `https://xyzabc.supabase.co`).
   * **`service_role` API Key**: Haz clic en *Reveal* y cópiala. **MUY IMPORTANTE**: Esta clave tiene permisos de administrador. Nunca la expongas públicamente. Úsala solo dentro de las credenciales de n8n.
