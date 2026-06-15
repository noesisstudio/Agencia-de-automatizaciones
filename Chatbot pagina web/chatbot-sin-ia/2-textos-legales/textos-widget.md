# Textos legales del widget — Bot A

Plantillas listas para copiar y pegar.
Sustituir los campos entre [corchetes] con los datos reales del cliente.

---

## 1. Aviso de asistente virtual (widget — primer mensaje)

Pegar como primer bloque de texto en el nodo de bienvenida de Voiceflow:

```
Hola, soy el asistente virtual de [Nombre Empresa].
Soy un sistema automatizado, no una persona real.

¿En qué puedo ayudarte hoy?
```

---

## 2. Texto informativo de recogida de datos

Pegar en el nodo de Voiceflow justo ANTES de pedir nombre/email/teléfono:

```
Antes de continuar, te informo de que los datos que facilites
serán tratados por [Razón Social del Cliente], con CIF [CIF],
para gestionar tu consulta.

Puedes ejercer tus derechos de acceso, rectificación y supresión
escribiendo a [email de privacidad del cliente].

Más información en nuestra política de privacidad:
[URL política de privacidad]

Al continuar, aceptas este tratamiento.
```

---

## 3. Aviso de cookies / localStorage (para el banner del cliente)

Añadir esta entrada en el gestor de cookies del cliente (Cookiebot, Usercentrics, etc.):

| Campo          | Valor                                              |
|----------------|----------------------------------------------------|
| Nombre         | `chatbot_notice_accepted`                          |
| Tipo           | localStorage                                       |
| Duración       | Persistente (hasta borrado manual)                 |
| Propósito      | Funcional — recuerda que el usuario vio el aviso   |
| Proveedor      | [Nombre del cliente]                               |
| Categoría      | Necesarias / Funcionales                           |

---

## 4. Mención en la Política de Privacidad del cliente

Añadir un párrafo nuevo en la sección "¿Quién recopila sus datos?" o similar:

```
ASISTENTE VIRTUAL (CHATBOT)

En nuestra página web disponemos de un asistente virtual automatizado
proporcionado por [Nombre Agencia] con la finalidad de atender consultas
de usuarios de forma ágil y eficiente.

Cuando interactúas con el asistente virtual puedes facilitar datos de
carácter personal (nombre, correo electrónico, teléfono). Estos datos son
tratados por [Nombre del Cliente], siendo [Nombre Agencia] encargado del
tratamiento conforme al acuerdo de encargado firmado entre ambas partes.

Los datos no se ceden a terceros salvo obligación legal o para la
prestación del propio servicio (Voiceflow Inc., Make s.r.o.).

Puedes ejercer tus derechos enviando un correo a: [email privacidad].
```

---

## 5. Checklist legal antes de activar el bot

- [ ] Nodo de bienvenida incluye "soy un sistema automatizado"
- [ ] Texto de recogida de datos visible antes de pedir email/teléfono
- [ ] Política de privacidad del cliente actualizada (sección chatbot)
- [ ] Cookie `chatbot_notice_accepted` en el banner del cliente
- [ ] DPA firmado con el cliente (ver plantilla en `../3-documentos-legales/`)
- [ ] Voiceflow DPA revisado y aceptado (voiceflow.com/legal)
- [ ] Make DPA revisado y aceptado (make.com/en/legal)
