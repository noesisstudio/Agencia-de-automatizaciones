# Marco legal completo — Agencia de chatbots

> Documento interno de la agencia · Versión 1.0 · Junio 2026
> Revisar cuando cambien las normativas o el stack tecnológico.

---

## Índice

1. [Tu agencia como empresa](#1-tu-agencia-como-empresa)
2. [La cadena legal en cada proyecto](#2-la-cadena-legal-en-cada-proyecto)
3. [Documentos que necesitas por proyecto](#3-documentos-que-necesitas-por-proyecto)
4. [DPAs de subencargados que tienes que aceptar tú](#4-dpas-de-subencargados-que-tienes-que-aceptar-tú)
5. [Las normas concretas y sus sanciones](#5-las-normas-concretas-y-sus-sanciones)
6. [Los 5 errores que más sanciones generan](#6-los-5-errores-que-más-sanciones-generan)
7. [Empresas con datos sensibles](#7-empresas-con-datos-sensibles)
8. [Herramientas y su riesgo legal](#8-herramientas-y-su-riesgo-legal)
9. [Lista de tareas — qué hacer esta semana](#9-lista-de-tareas--qué-hacer-esta-semana)

---

## 1. Tu agencia como empresa

Antes de pensar en los clientes, tu agencia tiene que estar en regla. Esto es lo primero y lo que más se olvida.

### 1.1 Registro de Actividades de Tratamiento (RAT)

Documento interno obligatorio por ley si tratas datos de forma habitual. La AEPD te lo puede pedir en una inspección sin previo aviso. No es un formulario oficial — es un documento tuyo (Word, Notion, PDF) que tiene que existir y estar actualizado.

Qué incluyes en el RAT:

```
Nombre y datos de contacto de tu agencia
Actividades de tratamiento:

  1. Gestión de clientes de la agencia
     - Datos: nombre, email, teléfono, razón social, CIF
     - Finalidad: gestión comercial y prestación del servicio
     - Base legal: ejecución de contrato (art. 6.1.b RGPD)
     - Conservación: duración del contrato + 5 años (obligaciones mercantiles)
     - Destinatarios: ninguno salvo obligación legal

  2. Prestación del servicio de chatbot (encargado del tratamiento)
     - Datos: nombre, email, teléfono de usuarios finales del cliente
     - Finalidad: prestar el servicio técnico de chatbot al cliente
     - Base legal: contrato de encargo (art. 28 RGPD)
     - Conservación: la que marque el DPA con cada cliente
     - Subencargados: ver lista en sección 4

Medidas de seguridad:
     - Acceso por contraseña a todas las plataformas
     - 2FA activado en Railway, Supabase, Anthropic, Voiceflow
     - Variables de entorno nunca en el código, siempre en .env
     - Repositorio privado
```

### 1.2 Política de privacidad en tu propia web

Si openix.es tiene formulario de contacto, ya estás recogiendo datos propios. Necesitas:
- Política de privacidad propia (no la del cliente)
- Aviso legal con los datos mercantiles de la agencia
- Banner de cookies si usas Google Analytics u otras

### 1.3 Seguridad mínima obligatoria

- 2FA activado en todas las plataformas (Railway, Supabase, Anthropic, Voiceflow, Make)
- Contraseñas únicas por servicio (gestor de contraseñas)
- Variables de entorno en `.env`, nunca en el código ni en el repositorio
- Repositorio de código privado (nunca público con credenciales reales)
- Política de retención: definir cuándo se borran los datos y cumplirlo

---

## 2. La cadena legal en cada proyecto

Cuando instalas un chatbot para un cliente, la cadena de responsabilidad es esta:

```
Usuario final
     │  deja sus datos en el chat
     ▼
Cliente tuyo  ←─── RESPONSABLE del tratamiento
     │              Decide para qué se usan los datos
     │              Es quien responde ante el usuario y la AEPD
     ▼
Tu agencia  ←───── ENCARGADO del tratamiento
     │              Trata los datos solo por encargo del cliente
     │              Responde ante el cliente, no directamente ante el usuario
     ▼
Railway / Supabase / Voiceflow / Anthropic  ←── SUBENCARGADOS
                                                  Procesan datos por tu encargo
                                                  Sus condiciones blindadas
```

**Lo que esto significa en la práctica:**

Si la AEPD investiga una queja de un usuario, va primero contra el cliente (el responsable). El cliente puede entonces reclamarte a ti si no cumpliste lo firmado. Tú puedes intentar reclamar a Railway o Anthropic, pero sus condiciones están blindadas.

El contrato + DPA con el cliente es tu escudo. Sin ellos, no tienes protección.

---

## 3. Documentos que necesitas por proyecto

### 3.1 Para Bot A y Bot B

**Documento 1 — Contrato de servicios**

Qué tiene que incluir obligatoriamente:
- Descripción técnica exacta del servicio (qué bot, qué flujos, qué integraciones, qué NO incluye)
- Definición de roles: agencia como encargado técnico, cliente como responsable legal
- Cláusula de limitación de responsabilidad:
  - Tú respondes de: errores técnicos de implementación
  - Tú NO respondes de: información incorrecta del cliente, mal uso del cliente, reclamaciones de usuarios por contenido del bot
- Procedimiento de actualización de contenidos: quién actualiza qué y en qué plazo
- SLA de soporte (tiempo de respuesta a incidencias)
- Precio de setup + mantenimiento mensual + coste de operación repercutido
- Duración y condiciones de resolución

**Documento 2 — DPA (Acuerdo de Encargado del Tratamiento)**

Obligatorio siempre que el chatbot recoja cualquier dato personal. Nombre + email + teléfono ya es dato personal. Firmarlo antes de desplegar, nunca después.

Qué tiene que incluir obligatoriamente (art. 28 RGPD):
- Identificación de responsable (cliente) y encargado (tu agencia)
- Descripción del tratamiento: qué datos, para qué, cuánto tiempo
- Instrucción de tratar datos solo según instrucciones del cliente
- Confidencialidad del personal con acceso
- Medidas de seguridad técnicas y organizativas
- Lista completa de subencargados con sus DPAs (ver sección 4)
- Compromiso de ayudar al cliente a ejercer derechos de los usuarios
- Procedimiento en caso de brecha: notificación al cliente en máximo 72 horas
- Compromiso de devolver o destruir los datos al finalizar el contrato
- Derecho del cliente a auditar el cumplimiento

**Documento 3 — Textos legales para la web del cliente**

Entregar al cliente para que los instale en su web antes de activar el bot:

*Aviso en el widget (primer mensaje del bot):*
```
Hola, soy el asistente virtual de [Empresa], un sistema automatizado.
¿En qué puedo ayudarte?
```

*Texto de recogida de datos (antes de pedir email/teléfono):*
```
Antes de continuar, tus datos serán tratados por [Empresa]
para gestionar tu consulta. Más información en nuestra
política de privacidad: [enlace]
```

*Entrada en el banner de cookies:*
```
Nombre: chatbot_notice_accepted
Tipo: localStorage
Duración: Persistente
Propósito: Funcional — recuerda que el usuario vio el aviso del chatbot
Proveedor: [Nombre del cliente]
```

*Párrafo para la política de privacidad del cliente:*
```
ASISTENTE VIRTUAL: Disponemos de un asistente virtual automatizado
proporcionado por [Nombre Agencia] para atender consultas. Los datos
facilitados son tratados por [Cliente] siendo [Agencia] encargado del
tratamiento. Subencargados: [lista]. Puedes ejercer tus derechos en [email].
```

### 3.2 Solo para Bot B (con IA)

**Documento 4 — Cláusula AI Act en el contrato**

Añadir al contrato de servicios:
```
El cliente se compromete a mantener en todo momento el mensaje de identificación
del asistente como sistema de inteligencia artificial en el primer mensaje de la
conversación, conforme al Reglamento UE 2024/1689 (AI Act). La modificación o
eliminación de dicha identificación por parte del cliente exime a la agencia de
cualquier responsabilidad derivada del incumplimiento.
```

**Documento 5 — EIPD (Evaluación de Impacto en Protección de Datos)**

Solo obligatorio en sectores sensibles (salud, menores, datos financieros masivos).
No lo tienes que redactar tú necesariamente — puedes contratar un consultor de privacidad.
Coste estimado: 300–800 € dependiendo del consultor y la complejidad.

Cuándo es obligatorio:
- Cualquier clínica o centro sanitario
- Centros educativos con datos de menores
- Despachos de abogados con datos penales o de procedimientos
- Cualquier tratamiento de datos de categorías especiales (art. 9 RGPD) a escala

---

## 4. DPAs de subencargados que tienes que aceptar tú

Antes de usar cualquier herramienta con datos de clientes, tienes que haber aceptado su DPA. No vale con que exista — tienes que haberlo aceptado activamente y guardado el justificante.

**Importante:** acepta solo los DPAs de las herramientas que realmente uses en cada proyecto. No tiene sentido aceptar el DPA de Anthropic si ese proyecto es Bot A (sin IA).

### Bot A — DPAs necesarios

| Herramienta | Cuándo aplica | Dónde aceptas el DPA | Riesgo si no lo haces |
|------------|--------------|---------------------|----------------------|
| **Voiceflow** | Siempre en Bot A | voiceflow.com/legal | ALTO |
| **Railway** | Si despliegas el webhook receiver | railway.app/legal/privacy | BAJO — solo infraestructura |
| **Make** | Si lo usas para integraciones | make.com/en/legal | MEDIO |
| **n8n self-hosted** | Si lo usas para integraciones | No aplica — tú lo controlas | NINGUNO |
| **Brevo** | Si lo usas para emails | brevo.com/legal | BAJO — empresa francesa, UE |
| **Pipedrive** | Si lo usas como CRM | pipedrive.com/en/privacy | BAJO — empresa estonia, UE |
| **HubSpot** | Si lo usas como CRM | hubspot.com/legal/dpa | MEDIO — empresa americana |

### Bot B — DPAs necesarios (además de los del Bot A que uses)

| Herramienta | Cuándo aplica | Dónde aceptas el DPA | Riesgo si no lo haces |
|------------|--------------|---------------------|----------------------|
| **Anthropic (Claude)** | Siempre en Bot B | anthropic.com → Settings → Privacy → DPA | MUY ALTO — transferencia internacional sin base legal |
| **Supabase** | Si lo usas para RAG o almacenamiento | supabase.com/privacy | MEDIO |

---

## 5. Las normas concretas y sus sanciones

### 5.1 RGPD (Reglamento UE 2016/679) — La más importante

**Aplica a:** Bot A y Bot B

**Qué te obliga:**
- Recoger solo los datos necesarios (minimización)
- Informar al usuario en el momento de la recogida: quién trata sus datos, para qué, cuánto tiempo, derechos
- Tener base legal para cada tratamiento (contrato, consentimiento, interés legítimo)
- No usar los datos para finalidades distintas a las declaradas
- Guardar los datos solo el tiempo necesario y luego borrarlos
- Notificar brechas de seguridad a la AEPD en máximo 72 horas
- Para transferencias fuera de la UE: usar solo proveedores con DPA y base legal válida

**Sanciones:**
- Infracciones leves: hasta 40.000 €
- Infracciones graves: hasta 10.000.000 € o 2% de la facturación global anual
- Infracciones muy graves: hasta 20.000.000 € o 4% de la facturación global anual

**La realidad:** la AEPD va primero a por empresas grandes. A una agencia pequeña llegan por denuncia de un usuario o de un competidor. Con los documentos en regla, el riesgo real es muy bajo.

### 5.2 LOPDGDD (Ley Orgánica 3/2018) — Desarrollo español del RGPD

**Aplica a:** Bot A y Bot B

**Qué añade al RGPD en la práctica:**
- Datos de menores: edad mínima de consentimiento 14 años en España (no 16 como en otros países)
- Para menores de 14: consentimiento parental obligatorio
- Sectores con obligación de DPD (Delegado de Protección de Datos): hospitales, centros educativos, entidades que traten datos sensibles a gran escala. Tu agencia probablemente no necesita DPD, pero tus clientes de sectores regulados sí.

### 5.3 LSSI (Ley 34/2002) — La más fácil de cumplir

**Aplica a:** Bot A y Bot B

**Qué te obliga:**
- Identificar el bot como sistema automatizado si el usuario lo pregunta
- El bot no puede hacerse pasar por humano
- Si usas un nombre humano para el bot (ej. "Laura"), añadir siempre "asistente virtual"

**Sanciones:**
- Infracciones leves: hasta 30.000 €
- En la práctica: la AEPD raramente sanciona esto solo, suele ir acompañado de una infracción RGPD

**Cómo la cumples:** con el primer mensaje del bot y la instrucción en el system prompt (Bot B).

### 5.4 AI Act UE (Reglamento 2024/1689) — Solo Bot B

**Aplica a:** Bot B únicamente

**Clasificación:** los chatbots de atención al cliente son sistemas de IA de **riesgo limitado**.

**Qué te obliga:**
- El usuario tiene que saber que habla con IA antes de empezar la conversación
- La identificación tiene que ser clara y visible, no en letra pequeña ni en los términos
- Si el usuario pregunta si es humano, el bot tiene que responder honestamente
- No se puede diseñar el bot para que engañe al usuario sobre su naturaleza

**Cuándo aplica plenamente:** agosto 2026, pero las obligaciones de transparencia se aplican ya.

**Sanciones:**
- Hasta 15.000.000 € o 3% de la facturación global anual

**Riesgo agravado:** si el bot está tan bien entrenado que el usuario cree que habla con una persona y toma decisiones importantes (contrata un servicio, da datos bancarios, toma una decisión médica), puede ser vulneración grave.

### 5.5 Ley de Cookies (transposición Directiva ePrivacy)

**Aplica a:** Bot A y Bot B

**Qué te obliga:**
- Cualquier cookie o localStorage que use el widget tiene que aparecer en el banner del cliente
- Si el usuario no acepta las cookies, el widget no puede guardar nada en su navegador
- Las cookies de sesión (que expiran al cerrar el navegador) son menos problemáticas que las persistentes

**En la práctica:** con la entrada `chatbot_notice_accepted` en el banner del cliente ya cumples para el widget.

### 5.6 Ley de Consumidores

**Aplica a:** Bot A y Bot B

**Qué te obliga:**
- Si el bot muestra precios o condiciones de servicio, tienen que ser veraces y completas
- Un precio incorrecto o una condición que no se cumple genera derecho de reclamación del usuario

**Cómo lo gestionas:** en el contrato con el cliente, cláusula que les hace responsables de mantener actualizada la información del bot. El bot nunca debe dar precios sin un disclaimer de "consultar condiciones actuales".

---

## 6. Los 5 errores que más sanciones generan

### Error 1 — Desplegar el bot sin DPA firmado ⚠️ MUY GRAVE

Si algo sale mal y no tienes DPA, no tienes cobertura legal ninguna. Es el error más grave y el más común porque parece papeleo y se deja para después.

**Regla:** primero firmas el DPA, luego despliegas. Nunca al revés.

### Error 2 — No actualizar la política de privacidad del cliente ⚠️ GRAVE

El chatbot recoge datos. Si la política de privacidad del cliente no lo menciona, hay una inconsistencia que es fácil de demostrar en una inspección. El usuario tiene derecho a saber que existe el chatbot y cómo trata sus datos.

**Regla:** antes de la entrega, la política de privacidad del cliente tiene que mencionar el chatbot y los subencargados.

### Error 3 — Usar herramientas americanas sin declararlas ⚠️ GRAVE

Si usas OpenAI, Zapier, HubSpot o cualquier servicio americano y no está declarado en el DPA como subencargado, tienes una transferencia internacional de datos sin base legal. Eso es infracción grave del RGPD.

**Regla:** toda herramienta que toque datos de usuarios del cliente tiene que estar en la lista de subencargados del DPA firmado con el cliente.

### Error 4 — No poner el aviso de asistente virtual ⚠️ MODERADO

Si el primer mensaje del bot no lo identifica como sistema automatizado y un usuario se queja de que creyó hablar con una persona, tienes un problema de LSSI y potencialmente de AI Act.

**Regla:** el primer mensaje siempre empieza con "soy el asistente virtual de [Empresa]".

### Error 5 — Guardar datos indefinidamente ⚠️ MODERADO

Si los leads se guardan en Supabase y nunca se borran, estás violando el principio de limitación del plazo de conservación del RGPD. La AEPD considera que guardar datos sin plazo definido es en sí mismo una infracción.

**Regla:** define en el DPA con cada cliente cuánto tiempo guardas los datos (ejemplo: 12 meses desde la última interacción) y crea una tarea periódica para borrarlos.

---

## 7. Empresas con datos sensibles

La referencia legal es el artículo 9 del RGPD (categorías especiales) y el artículo 10 (datos penales).

### Riesgo MUY ALTO — n8n self-hosted obligatorio + EIPD antes de desplegar

| Sector | Por qué son sensibles |
|--------|----------------------|
| Clínicas médicas (cualquier especialidad) | Datos de salud — art. 9 RGPD |
| Psicólogos y psiquiatras | Datos de salud + salud mental |
| Nutricionistas y dietistas | Datos de salud |
| Clínicas de fertilidad / ginecología | Datos de salud + vida sexual |
| Fisioterapeutas y podólogos | Datos de salud |
| Farmacias | Datos de salud (medicación) |
| Clínicas de estética médica (bótox, rellenos) | Datos de salud |
| Centros de salud mental / adicciones | Datos de salud + categoría agravada |
| Residencias de mayores | Datos de salud + personas vulnerables |
| Centros de discapacidad | Datos de salud + personas vulnerables |

### Riesgo ALTO — n8n recomendado + contrato muy blindado

| Sector | Por qué son sensibles |
|--------|----------------------|
| Despachos de abogados | Secreto profesional + posibles datos penales (art. 10) |
| Asesorías fiscales y laborales | Datos financieros + datos de empleados |
| Gestorías | Datos fiscales, nóminas, vida laboral |
| Notarías y registros | Datos patrimoniales y jurídicos |
| Seguridad privada | Datos de incidentes, posibles datos penales |
| Colegios y guarderías | Datos de menores — protección máxima LOPDGDD |
| Academias infantiles | Datos de menores |
| Psicopedagogos y logopedas | Datos de salud + menores |

### Riesgo MEDIO — Make con DPA cuidado + advertir al cliente

| Sector | Por qué son sensibles |
|--------|----------------------|
| Agencias de RRHH y headhunters | Datos laborales, CV, referencias |
| Centros deportivos y gimnasios | Pueden tener datos de salud (lesiones) |
| Aseguradoras y corredurías | Datos financieros + posibles datos de salud |
| ONGs y asociaciones | Pueden tener datos de ideología, religión o salud |
| Partidos políticos | Datos de afiliación — categoría especial art. 9 |
| Sindicatos | Datos de afiliación — categoría especial art. 9 |

### Riesgo BAJO — Make con DPA estándar es suficiente

| Sector | Por qué es más seguro |
|--------|----------------------|
| Restaurantes y bares | Solo nombre + email + teléfono para reservas |
| Hoteles (sin spa médico) | Datos de reserva estándar |
| Academias de adultos (idiomas, oposiciones) | Datos académicos normales |
| Autoescuelas | Datos académicos + carnet de conducir |
| Tiendas físicas e ecommerce | Datos de compra estándar |
| Fontaneros, electricistas, reformas | Nombre + dirección + teléfono |
| Peluquerías y barberías | Solo datos de contacto para cita |
| Inmobiliarias (sin gestión de hipotecas) | Datos de contacto + preferencias |
| Talleres mecánicos | Datos del vehículo + datos de contacto |

### La regla rápida

> ¿Lo que el usuario puede contarle al chatbot podría aparecer en su historial médico, expediente judicial o declaración de la renta?
> - **Sí** → n8n self-hosted + EIPD + contrato muy blindado
> - **No sé / puede que sí** → n8n de precaución o Make con restricciones
> - **No** → Make con DPA estándar

### Trampas frecuentes — sectores que parecen seguros pero no lo son

- **Gimnasios** que hacen seguimiento de lesiones o condición física → datos de salud
- **Academias infantiles** → datos de menores aunque sea solo el nombre del niño
- **Clínicas de estética** sin procedimientos médicos → si hacen láser o procedimientos invasivos, son datos de salud
- **Coaches y psicólogos sin título** que se anuncian como "bienestar" → siguen manejando datos de salud mental

---

## 8. Herramientas y su riesgo legal

### Por qué no puedes eliminar el 100% de las dependencias

Toda tu infraestructura depende de algo:

| Lo que usas | Depende de |
|-------------|-----------|
| Railway | Amazon AWS (subyacente) |
| Supabase | Amazon AWS |
| Voiceflow | Sus propios servidores |
| Claude API | Anthropic |
| El dominio del cliente | El registrador |

No existe la independencia total. La pregunta correcta es: **¿qué dependencias son aceptables y cómo me protejo si fallan?**

### Comparativa de herramientas de integración

| | Make | n8n self-hosted | Código directo (webhook + Nodemailer) |
|--|------|----------------|--------------------------------------|
| Complejidad | Baja | Media | Baja |
| Riesgo RGPD | Medio | Muy bajo | Muy bajo |
| Coste | 9–16 €/mes | ~5 €/mes (Railway) | 0 € extra |
| Mantenimiento | Ninguno | Servidor | Ninguno |
| Para clientes sensibles | No ideal | Sí | Sí |

### Arquitectura recomendada sin dependencias innecesarias

Para clientes con datos sensibles:

```
Voiceflow → webhook receiver (Railway, tú lo controlas)
                ↓
         Supabase (guarda el lead — fuente de verdad)
                ↓
         SMTP del cliente (email confirmación + notificación)
                ↓ (opcional y secundario)
         CRM del cliente (si cae, el lead ya está en Supabase)
```

Sin Make. Sin n8n. Sin terceros que no sean necesarios.

### Regla para elegir herramienta por cliente

| Tipo de cliente | Integración recomendada |
|----------------|------------------------|
| Restaurante, academia, tienda | Make directo |
| Clínica, despacho, colegio | Código directo + Supabase + SMTP del cliente |
| Cliente grande con auditorías | n8n self-hosted |

---

## 9. Lista de tareas — qué hacer esta semana

### Urgente — antes de tocar cualquier cliente

- [ ] Crear el RAT (Registro de Actividades de Tratamiento) de la agencia
- [ ] Verificar que openix.es tiene política de privacidad propia actualizada
- [ ] Activar 2FA en todas las plataformas que ya usas: Railway, Voiceflow, Make
- [ ] Aceptar el DPA de Voiceflow (lo necesitas desde el primer Bot A)
- [ ] Aceptar el DPA de Anthropic solo cuando vayas a desplegar el primer Bot B

### Por cada proyecto nuevo — antes de desplegar

- [ ] Contrato de servicios firmado por ambas partes
- [ ] DPA firmado por ambas partes
- [ ] DPAs de subencargados aceptados y guardados como PDF
- [ ] Textos legales entregados al cliente e instalados en su web
- [ ] Aviso "asistente virtual" en el primer mensaje del bot
- [ ] Texto de recogida de datos antes de pedir email/teléfono
- [ ] Política de privacidad del cliente actualizada
- [ ] Cookie del widget en el banner del cliente

### Para clientes con datos sensibles — antes de empezar el proyecto

- [ ] Identificar si necesita EIPD (salud, menores, datos penales → sí)
- [ ] Usar solo herramientas europeas o self-hosted
- [ ] Si necesita EIPD: contratar consultor de privacidad o realizarlo antes del despliegue
- [ ] Añadir cláusula de sectores regulados en el contrato

### Mantenimiento periódico de la agencia

- [ ] Revisar y actualizar el RAT cada 6 meses o cuando cambies el stack
- [ ] Revisar los DPAs de subencargados cuando actualices herramientas
- [ ] Borrar datos de clientes según los plazos definidos en cada DPA
- [ ] Cuando cambie una normativa (AI Act, nuevas guías AEPD): revisar este documento

---

*Documento elaborado para uso interno de la agencia.*
*Ante dudas en casos concretos, consultar con un abogado especializado en protección de datos.*
*Última revisión: Junio 2026*
