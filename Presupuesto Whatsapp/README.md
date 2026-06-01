# Presupuesto WhatsApp

Bot **solo presupuestos**: menú numerado, **LISTO**, IVA. Sin IA ni documentos.

La API vive en el backend del chatbot (`Automatizacion Chatbot/chatbot-backend`), prefijo **`/presupuesto`**.

## Endpoints

| Método | Ruta | Uso |
|--------|------|-----|
| `GET/POST` | `/presupuesto/webhook` | Meta WhatsApp (apunta aquí el número de presupuestos) |
| `POST` | `/presupuesto/simular` | Probar sin Meta |
| `POST` | `/presupuesto/send-test` | Enviar mensaje de prueba |
| `GET` | `/presupuesto/health` | Estado del módulo |
| `PUT` | `/presupuesto/tenants/{id}/catalogo` | Subir tarifas del cliente |

## Catálogo por cliente

`Automatizacion Chatbot/chatbot-backend/data/tenants/{id}/catalogo.json`

Demo global: `chatbot-backend/data/catalogo_ejemplo.json` (copia de `catalogo_ejemplo.json` en esta carpeta).

## Prueba rápida

```bash
curl -s -X POST http://127.0.0.1:8000/presupuesto/simular \
  -H "Content-Type: application/json" \
  -d '{"wa_id":"34600000000","texto":"presupuesto","tenant_id":"openix"}'
```

## Meta

- Chat con IA → `/whatsapp/webhook`
- Solo presupuestos → `/presupuesto/webhook`

Mismas variables `META_*` en `.env`. Ver [Automatizacion Chatbot/README.md](../Automatizacion%20Chatbot/README.md).
