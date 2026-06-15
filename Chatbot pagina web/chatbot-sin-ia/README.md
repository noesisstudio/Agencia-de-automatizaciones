# Bot A — Flujos predefinidos (sin IA)

Stack: **Voiceflow + Make.com + CRM del cliente**

Coste operativo: 5–70 €/mes | Setup que cobras: 600–1.000 € | Mantenimiento: 100–200 €/mes

---

## Estructura de carpetas

```
bot-a/
├── 1-widget-embed/
│   ├── snippet.html          ← Código a pegar en la web del cliente
│   └── chatbot-custom.css    ← CSS de personalización del widget Voiceflow
├── 2-textos-legales/
│   └── textos-widget.md      ← Textos RGPD/LSSI listos para copiar
├── 3-make-webhook/
│   ├── webhook-receiver.js   ← Receptor opcional entre Voiceflow y Make
│   ├── package.json
│   └── .env.example
├── 4-documentos-legales/
│   └── plantilla-contrato-servicios.md
└── 5-checklist-entrega/
    └── checklist-bot-a.md
```

---

## Orden de implementación para cada cliente

**Día 1 — Setup Voiceflow**
1. Crear proyecto en [voiceflow.com](https://voiceflow.com) (plan Creator: 0–50 €/mes)
2. Construir el árbol de decisión con los flujos del cliente
3. Configurar el primer mensaje: "Hola, soy el asistente virtual de [Empresa]…"
4. Añadir el texto de recogida de datos antes del nodo de captura de email/tel
5. Activar el widget: Settings → Integrations → Web Chat → publicar
6. Copiar el Project ID

**Día 1 — Integración Make.com**
1. Crear escenario en Make: Webhooks → Custom Webhook → copiar URL
2. Configurar en Voiceflow: Settings → Integrations → añadir webhook con esa URL
3. Mapear los campos (nombre, email, teléfono) a los módulos de Make:
   - Módulo HubSpot / Pipedrive / Google Sheets → crear contacto
   - Módulo Email → enviar confirmación al usuario
   - Módulo Email → notificar al equipo del cliente
4. Probar con un lead real

**Día 2 — Embed en la web del cliente**
1. Abrir `1-widget-embed/snippet.html` y sustituir `TU_PROJECT_ID`
2. Pegar el snippet antes del `</body>` de la web del cliente
3. Enlazar `chatbot-custom.css` con los colores del cliente y subir al dominio
4. Verificar en Lighthouse que no hay impacto de rendimiento

**Día 2 — Legal**
1. Pegar los textos de `2-textos-legales/textos-widget.md` en la web del cliente
2. Actualizar la política de privacidad del cliente
3. Añadir la cookie `chatbot_notice_accepted` al banner de cookies
4. Firmar contrato y DPA

**Entrega**
- Recorrer `5-checklist-entrega/checklist-bot-a.md` punto por punto
- Enviar guía de uso al cliente

---

## Receptor de webhook (opcional)

El fichero `3-make-webhook/webhook-receiver.js` solo es necesario si:
- Quieres validar el payload de Voiceflow antes de que llegue a Make, o
- El cliente tiene un backend propio y prefieres enrutar desde allí.

Si Voiceflow conecta directamente con Make mediante webhook personalizado,
este servidor no hace falta.

Para desplegarlo en Railway:
```bash
# Desde la carpeta 3-make-webhook/
npm start
# O en Railway: New Project → Deploy from repo → variables de entorno del .env.example
```
