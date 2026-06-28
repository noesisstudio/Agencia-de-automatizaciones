# Bot CON IA — una clave de Anthropic por cliente (multi-tenant)

Un único workflow de n8n sirve a todos tus clientes. Cada cliente tiene **su propia
clave de Anthropic, su modelo y su conocimiento**, guardados en Supabase (no en n8n
ni en git). Dar de alta un cliente = **insertar una fila**.

## Cómo funciona

```
WhatsApp → n8n: Extraer datos (saca phone_number_id)
        → Buscar Tenant (Supabase): trae clave + modelo + conocimiento + token Meta del cliente
        → Construir prompt: arma el system con el CONOCIMIENTO del cliente
        → Claude: llama con x-api-key = clave del cliente, modelo del cliente
        → Enviar respuesta: con el token de Meta del cliente
```

El cliente se identifica por `phone_number_id` (el número de WhatsApp Business de
cada empresa), igual que en el bot SIN IA.

## Instalación (una vez)

1. **Base de datos**: en Supabase → SQL Editor, ejecuta en orden:
   1. `supabase/chatbot_sin_ia.sql` (si no lo tienes ya — crea `tenants` con RLS)
   2. `supabase/chatbot_con_ia.sql` (añade `anthropic_api_key`, `anthropic_model`, `conocimiento`)

2. **Credencial de Supabase en n8n**: Credentials → Add → **Header Auth**
   - Name: `apikey`
   - Value: tu **service_role** key (Supabase → Settings → API → Project API Keys)
   - Llámala `Supabase API Key`.

3. **Importa** `Meta WhatsApp Chatbot - CON IA.json` en n8n.

4. En el nodo **Buscar Tenant (Supabase)**:
   - Selecciona la credencial `Supabase API Key`.
   - En la URL, sustituye `TU_PROYECTO` por el subdominio de tu proyecto Supabase.

5. (Region UE) Crea el proyecto Supabase en **Frankfurt** para cumplir RGPD: las
   conversaciones guardan teléfono y texto (dato personal).

## Dar de alta un cliente nuevo (sin tocar n8n)

En Supabase → Table Editor → `tenants` → Insert row (o por SQL — ver ejemplo al final
de `supabase/chatbot_con_ia.sql`):

| Columna | Qué poner |
|---|---|
| `nombre` | Nombre del negocio |
| `phone_number_id` | ID del número de WhatsApp del cliente (panel de Meta) |
| `meta_access_token` | Token permanente de Meta **de ese cliente** |
| `anthropic_api_key` | Clave de Anthropic **de ese cliente** |
| `anthropic_model` | `claude-sonnet-4-6` (o el que prefieras) |
| `conocimiento` | El conocimiento del negocio (horarios, productos, precios…) |

Cambiar la clave de un cliente = editar `anthropic_api_key` en su fila.

## Seguridad / RGPD

- Las claves **no están en n8n ni en git**: viven en Supabase, las lee solo n8n con la
  service_role. La RLS aísla a cada cliente; el `revoke` del SQL impide leer los
  secretos con la clave anon.
- Si un cliente no está en `tenants`, el workflow lanza un error claro
  ("Cliente no configurado en Supabase…") visible en las ejecuciones de n8n.

## ⚠️ Rota el token de Meta que estaba filtrado

Los JSON de los workflows tenían un **token de Meta real escrito dentro** (ya lo he
quitado y sustituido por un marcador). Ese token estuvo en el repositorio, así que
**debes invalidarlo y generar uno nuevo**:

1. Meta for Developers → tu app → WhatsApp → genera un **nuevo** token permanente
   (System User Token) e invalida el anterior.
2. Guarda el nuevo token en la columna `meta_access_token` del cliente en Supabase.
