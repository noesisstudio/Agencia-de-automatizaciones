# 🚀 Master Plan - Agencia de Automatización con IA (AAA)

## 1. Contexto y Visión
Estamos construyendo la infraestructura principal para una agencia de automatizaciones. Nuestro producto inicial es un **Sistema de Chatbots Multi-canal con RAG** (Retrieval-Augmented Generation). 
El sistema ingerirá documentos de clientes (manuales, FAQs, PDFs) y responderá preguntas de manera inteligente, sin alucinar, a través de dos canales principales:
- Un widget para páginas Web.
- WhatsApp (vía Meta Cloud API).

## 2. Stack Tecnológico
- **Backend:** Python + FastAPI (Alto rendimiento, asíncrono y auto-documentado).
- **IA / LLM:** Anthropic Claude (API Messages); RAG con LangChain cuando se integre.
- **Base de Datos Vectorial:** Supabase (pgvector) o Pinecone (pendiente de integrar).
- **Integraciones HTTP:** `httpx` hacia Anthropic y la API de Meta (WhatsApp).

## 2b. Repositorio actual (implementado)
- **`chatbot-backend`:** API FastAPI (`/web/chat`, webhook WhatsApp esqueleto, Claude).
- **`chatbot-widget`:** script embebible (`dist/widget.js`) para instalar en webs de clientes.
- **`web-frontend`:** plantilla Next.js opcional; redundante si solo usas el widget.

## 3. Estructura de Carpetas del Proyecto
El código debe ser modular y escalable (preparado para manejar múltiples clientes en el futuro). Construye la siguiente estructura:

```text
/chatbot-backend
├── app/
│   ├── main.py                 # Instancia de FastAPI y registro de routers
│   ├── api/
│   │   ├── routes_web.py       # Endpoints dedicados al chat web
│   │   └── routes_whatsapp.py  # Webhooks para la verificación y mensajes de Meta
│   ├── core/
│   │   ├── config.py           # Gestión de variables de entorno (Pydantic Settings)
│   │   └── prompts.py          # Centralización de Ingeniería de Prompts (System Prompts)
│   ├── services/
│   │   ├── ai_engine.py        # Lógica de LangChain y RAG (Modelos, Cadenas)
│   │   └── whatsapp_bot.py     # Funciones para formatear y enviar mensajes a Meta API
│   ├── utils/
│   │   ├── document_loader.py  # Script para procesar los archivos de la carpeta data/
│   │   └── logger.py           # Configuración de logs para depuración y rastreo de errores
├── data/
│   └── knowledge_base/         # Carpeta local para depositar PDFs, TXT y manuales de clientes
├── requirements.txt            # Dependencias del proyecto
├── .env.example                # Plantilla de variables de entorno
