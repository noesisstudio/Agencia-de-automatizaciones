# Chatbot Backend (FastAPI)

API del asistente Openix. Documentación completa en [../README.md](../README.md).

## Comandos

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- Panel: http://127.0.0.1:8000/panel/
- OpenAPI: http://127.0.0.1:8000/docs

## Datos por empresa

`data/tenants/{tenant_id}/knowledge.md` — contexto que lee Claude.

Borradores de email comercial B2B: módulo aparte [Automatización Email Comercial](../../Automatizacion%20Email%20Comercial/README.md) (puerto **8020**).
