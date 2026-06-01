# Email comercial B2B (Openix)

Módulo **independiente** del chatbot para generar **borradores** de respuesta a leads por email. La IA no envía correos: el comercial revisa, edita y envía manualmente (human-in-the-loop).

## Arranque rápido

1. Doble clic en `start-email-comercial.command` (macOS), o:
   ```bash
   cd backend && python3 -m venv .venv && source .venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env   # ANTHROPIC_API_KEY obligatoria para borradores
   python run.py
   ```
2. Panel: [http://127.0.0.1:8020/panel/](http://127.0.0.1:8020/panel/)
3. API: [http://127.0.0.1:8020/docs](http://127.0.0.1:8020/docs)

Puerto **8020** (chatbot usa 8000, FacturAI 8010).

## Estructura

```text
Automatizacion Email Comercial/
├── start-email-comercial.command
├── panel/                    ← UI web (empresas, docs, probar borrador)
├── backend/
│   ├── app/
│   │   ├── api/routes_draft.py
│   │   ├── api/routes_empresas.py
│   │   ├── services/draft_engine.py
│   │   └── services/knowledge_store.py
│   └── data/empresas/{id}/
│       ├── meta.json
│       └── knowledge.md
```

## API principal

| Método | Ruta | Uso |
|--------|------|-----|
| `GET` | `/health` | Estado y clave Anthropic |
| `GET` | `/empresas` | Listar empresas |
| `POST` | `/empresas` | Crear empresa |
| `PUT` | `/empresas/{id}/knowledge` | Guardar documentación Markdown |
| `POST` | `/empresas/{id}/draft` | Generar borrador JSON |

### Ejemplo webhook (Make)

```bash
curl -X POST "http://127.0.0.1:8020/empresas/openix/draft" \
  -H "Content-Type: application/json" \
  -d '{
    "lead_name": "María García",
    "lead_company": "Clínica Ejemplo SL",
    "sales_rep_name": "Carlos Ruiz",
    "incoming_email_body": "Hola, ¿integráis WhatsApp Business API con Make y cumplís RGPD?",
    "email_subject": "Consulta automatización"
  }'
```

Respuesta (`ok: true`):

```json
{
  "analysis": {
    "detected_language": "es",
    "key_technical_questions": ["..."],
    "confidence_score": "High"
  },
  "email_draft": {
    "subject_line": "Re: Consulta automatización",
    "body": "..."
  },
  "disclaimer": "BORRADOR — Revisar y enviar manualmente..."
}
```

## Reglas de producto

- Solo borradores; nunca envío automático al cliente.
- Respuestas basadas en `knowledge.md` (RAG por secciones).
- Si falta información en la documentación, el cuerpo incluye el placeholder acordado en el prompt del sistema.

## Empresa demo

`openix` viene precargada en `backend/data/empresas/openix/`.
