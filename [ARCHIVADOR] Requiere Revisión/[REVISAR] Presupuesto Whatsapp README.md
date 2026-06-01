# Presupuesto por WhatsApp

Bot **guiado por menú**: el cliente elige servicios con números (`1`, `2`, `3`…), escribe **LISTO** y recibe un **presupuesto con IVA**. Los precios salen de un `catalogo.json` (datos fijos, sin inventar cifras con IA).

> **Producto distinto** del [chatbot conversacional](../Automatizacion%20Chatbot/README.md) (preguntas libres con documentos) y de [FacturAI](../Automatizacion%20Facturas/README.md).

---

## Cuándo usar este módulo

| Usar Presupuesto WhatsApp | Usar Chatbot (Automatizacion Chatbot) |
|--------------------------|--------------------------------------|
| Tarifas cerradas en catálogo | FAQs, horarios, explicaciones largas |
| Flujo: elegir líneas + total | Pregunta → respuesta en texto libre |
| Mismo número si combinas ambos* | Subida de PDF/Markdown de conocimiento |

\*En un mismo número de WhatsApp solo conviene un webhook; en producción suele desplegarse un producto por número o un router que distinga intención.

---

## Estructura

```text
Presupuesto Whatsapp/
├── motor_presupuesto.py      # Lógica: menú, LISTO, IVA, AYUDA, REINICIAR
├── almacen_sesiones.py         # Estado por teléfono (wa_id)
├── catalogo_ejemplo.json     # Demo Openix
├── data/
│   └── sesiones.json         # Sesiones globales (demo)
├── index.html                # Enlaces al simulador y arquitectura
├── simulador.html            # Probar menú sin Meta
├── arquitectura.html         # Diagrama Meta vs BuilderBot
└── README.md
```

La API de prueba está en el backend del chatbot: **`POST /presupuesto/simular`** (puerto **8000**).

---

## Flujo para el cliente final

1. Escribe cualquier mensaje o `presupuesto` → ve el **catálogo numerado**.
2. Responde **`1`**, **`2`**… → se añaden servicios.
3. Escribe **`LISTO`** → recibe subtotal, IVA y total.
4. **`AYUDA`** / **`REINICIAR`** en cualquier momento.

---

## Catálogo JSON

Archivo de referencia: `catalogo_ejemplo.json`

```json
{
  "empresa": "Mi empresa",
  "moneda": "EUR",
  "iva_porcentaje": 21,
  "mensaje_bienvenida_extra": "Cuando termines, escribe LISTO.",
  "servicios": [
    {
      "id": "1",
      "titulo": "Consulta inicial",
      "precio": 80,
      "detalle": "30 minutos"
    }
  ]
}
```

---

## Arranque y prueba

### 1. API (compartida con el chatbot)

```bash
cd "../Automatizacion Chatbot/chatbot-backend"
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Simulador en el navegador

Abre `simulador.html` (si `file://` falla):

```bash
cd "Presupuesto Whatsapp"
python3 -m http.server 8765
# http://127.0.0.1:8765/simulador.html
```

Ajusta la URL de la API a `http://127.0.0.1:8000` si el simulador lo pide.

### 3. Prueba con curl

```bash
curl -s -X POST http://127.0.0.1:8000/presupuesto/simular \
  -H "Content-Type: application/json" \
  -d '{"wa_id":"34600000000","texto":"presupuesto"}'
```

---

## Meta WhatsApp

El **webhook conversacional** del chatbot está en `/whatsapp/webhook` (ver [README del chatbot](../Automatizacion%20Chatbot/README.md)).

Para usar **solo** presupuesto por WhatsApp en producción haría falta apuntar el webhook al motor de presupuesto o unificar rutas; hoy el webhook principal sirve al **chatbot con documentos**.

---

## ¿BuilderBot?

Este repo usa **Meta WhatsApp Cloud API** directa en Python. **BuilderBot** no está integrado (otro stack Node.js).

---

## Más información

- [PROYECTO.md](../PROYECTO.md) — mapa del monorepo
- [Automatizacion Chatbot/README.md](../Automatizacion%20Chatbot/README.md) — chat con IA y panel `/panel/`
