# Checklist de entrega — Bot A (flujos predefinidos)

Rellenar para cada proyecto antes de darlo por entregado.
Cliente: _______________  Fecha entrega: _______________  Responsable: _______________

---

## TÉCNICO

### Widget
- [ ] Snippet pegado en la web del cliente (antes del `</body>`)
- [ ] Widget visible y se abre correctamente en escritorio
- [ ] Widget visible y se abre correctamente en móvil (iOS Safari + Android Chrome)
- [ ] Aviso legal "asistente virtual" aparece la primera vez
- [ ] Aviso desaparece al hacer clic en "Entendido" y no vuelve a aparecer
- [ ] Lighthouse score de la página no cae más de 5 puntos tras instalar el widget
- [ ] CSS personalizado cargado correctamente (colores de marca del cliente)

### Flujos de conversación
- [ ] Nodo de bienvenida muestra "soy un asistente virtual"
- [ ] Todos los flujos principales probados de principio a fin:
  - [ ] Flujo de información general (horarios, precios, ubicación...)
  - [ ] Flujo de captación de leads (nombre + email + teléfono)
  - [ ] Flujo de reserva / cita (si aplica)
  - [ ] Flujo de escalada a humano
- [ ] Casos borde probados:
  - [ ] El usuario escribe texto libre fuera del árbol → respuesta de fallback amable
  - [ ] El usuario pregunta "¿eres humano?" → respuesta honesta
  - [ ] El usuario deja el chat a medias → sesión no bloquea el flujo
- [ ] Texto informativo RGPD aparece antes de pedir datos personales

### Integraciones (Make.com)
- [ ] Lead de prueba recibido correctamente en el escenario de Make
- [ ] Contacto creado en el CRM del cliente con todos los campos
- [ ] Email de confirmación enviado al usuario (desde el email del cliente)
- [ ] Notificación enviada al equipo del cliente (email o Slack)
- [ ] Escalada a humano activa la notificación correcta (WhatsApp / email / tarea CRM)

---

## LEGAL

- [ ] Contrato de servicios firmado por ambas partes
- [ ] DPA firmado por ambas partes
- [ ] DPA de Voiceflow revisado y aceptado por el cliente
- [ ] DPA de Make.com revisado y aceptado por el cliente
- [ ] DPA del CRM revisado y aceptado (si aplica)
- [ ] Aviso "asistente virtual automatizado" visible en el widget
- [ ] Texto RGPD de recogida de datos incluido en el flujo (antes de pedir email/tel)
- [ ] Política de privacidad del cliente actualizada con mención al chatbot
- [ ] Cookie `chatbot_notice_accepted` añadida al banner de cookies del cliente
- [ ] Para sectores regulados: anotar aquí el sector y las restricciones añadidas:
  Sector: _____________  Restricciones: _____________

---

## ENTREGA AL CLIENTE

- [ ] Documento entregado: "Guía de uso y actualización del chatbot" (explicar cómo
      solicitar cambios en los flujos, contacto de soporte, SLA)
- [ ] Acceso al panel de Voiceflow concedido al cliente (solo lectura) si lo pide
- [ ] Primera factura enviada

---

## NOTAS DEL PROYECTO

```
(Anotar cualquier decisión especial, excepción o pendiente)
```
