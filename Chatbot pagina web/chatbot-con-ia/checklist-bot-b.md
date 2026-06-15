# Checklist de entrega — Bot B (con IA)

Cliente: _______________  Fecha entrega: _______________  Responsable: _______________

---

## TÉCNICO

### Supabase
- [ ] Extensión pgvector activada
- [ ] Tablas `knowledge_chunks`, `conversations`, `leads` creadas
- [ ] Función `match_knowledge` creada y probada
- [ ] RLS activado en las tres tablas

### Base de conocimiento
- [ ] Documentos del cliente recopilados (FAQs, precios, horarios, política, catálogo)
- [ ] Script `upload-knowledge.js` ejecutado sin errores
- [ ] Búsqueda semántica probada con 20+ preguntas reales del sector
- [ ] Preguntas que NO supo responder documentadas → añadir al conocimiento

### Backend
- [ ] Variables de entorno configuradas en Railway
- [ ] `ALLOWED_ORIGINS` incluye el dominio exacto del cliente
- [ ] `/health` responde correctamente
- [ ] Endpoint `/api/chat` probado con Postman o similar
- [ ] Latencia media de respuesta < 3 segundos
- [ ] Fallback de error funcionando (respuesta amable si falla Claude)

### Widget
- [ ] `widget.js` accesible desde el dominio del cliente o CDN
- [ ] Snippet pegado antes del `</body>` de la web del cliente
- [ ] Aviso "asistente virtual automatizado — sistema de IA" visible al abrir el chat
- [ ] Botón "Entendido" oculta el aviso y lo recuerda (localStorage)
- [ ] Colores de marca del cliente configurados
- [ ] Probado en escritorio (Chrome, Firefox, Safari)
- [ ] Probado en móvil (iOS Safari, Android Chrome)

### Integraciones
- [ ] Lead guardado en Supabase al detectar email/teléfono
- [ ] Email de confirmación al usuario funcionando (desde el SMTP del cliente)
- [ ] Notificación al equipo del cliente funcionando
- [ ] Registro de conversaciones verificado en Supabase

### IA y calidad
- [ ] System prompt revisado y aprobado por escrito por el cliente
- [ ] Instrucción anti-alucinaciones presente en el system prompt
- [ ] Identificación como IA en el primer mensaje del bot
- [ ] Si el usuario pregunta "¿eres humano?" → responde honestamente
- [ ] Respuestas revisadas para los 50 casos más probables del sector
- [ ] Alerta de gasto configurada en Anthropic (console.anthropic.com → Billing → Usage alerts)

---

## LEGAL

### Documentos
- [ ] Contrato de servicios firmado (con cláusula AI Act + anti-alucinaciones + limitación responsabilidad IA)
- [ ] DPA firmado con el cliente
- [ ] DPA de Anthropic aceptado y guardado como PDF
- [ ] DPA de Supabase aceptado y guardado como PDF
- [ ] DPA de Railway aceptado (si aplica)
- [ ] Para clientes sensibles: EIPD realizado antes del despliegue

### Web del cliente
- [ ] Aviso "asistente virtual — sistema de IA" visible en el widget antes de la primera respuesta
- [ ] Política de privacidad del cliente actualizada (mención al chatbot + Anthropic como subencargado)
- [ ] `cb_legal_accepted` (localStorage) añadida al banner de cookies del cliente

### System prompt
- [ ] Identificación como IA incluida (obligatoria AI Act)
- [ ] Instrucción anti-alucinaciones incluida
- [ ] Restricciones del sector incluidas si aplica:
  - Salud: sin diagnósticos ni recomendaciones de tratamiento
  - Legal: sin asesoramiento jurídico vinculante
  - Financiero: sin asesoramiento de inversión
  - Menores: sin recopilación de datos de menores

---

## ENTREGA AL CLIENTE

- [ ] System prompt entregado al cliente en PDF para su aprobación por escrito
- [ ] Guía de uso entregada (cómo solicitar actualización de la base de conocimiento)
- [ ] Explicado al cliente que los cambios en precios/servicios deben comunicarse para actualizar el bot
- [ ] Primera factura enviada
