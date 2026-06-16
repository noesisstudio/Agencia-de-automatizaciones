# Diferencias legales: Bot por base de datos vs Bot con IA

Los dos chatbots de WhatsApp se venden distinto **porque legalmente no son lo mismo**.
Esto justifica que uno sea más barato que el otro.

---

## Resumen rápido

| | **Bot por base de datos** (sin IA) | **Bot con IA** (Claude) |
|---|---|---|
| Cómo responde | Respuestas pre-escritas que tú controlas | Las genera la IA en el momento |
| Riesgo de respuesta incorrecta | Casi nulo | Existe (hay que mitigarlo) |
| ¿Es "sistema de IA" según el AI Act? | Normalmente **no** | **Sí** |
| Obligación de avisar "esto es una IA" | Recomendable | **Obligatoria** (AI Act, Art. 50) |
| Datos que salen a terceros | Meta (WhatsApp) + tu base de datos | Meta + tu BD + **Anthropic (IA)** |
| Transferencia internacional de datos | No (si tu BD está en UE) | **Sí** (el mensaje viaja a Anthropic) |
| Complejidad legal | Baja | Media |
| **Precio recomendado** | **Más barato** | Más caro |

---

## Lo que necesitan LOS DOS (GDPR)

El número de WhatsApp y el nombre son **datos personales**. Por tanto, en ambos casos:

1. **Aviso de privacidad** accesible (enlace en el primer mensaje o en la web del cliente).
2. **Base legal** para tratar los datos: normalmente el **consentimiento** (el usuario escribe el primero) o el interés legítimo para atención al cliente.
3. **Derechos del usuario**: acceso, rectificación, supresión. Un email de contacto basta.
4. **Minimización**: guardar solo lo necesario (teléfono, mensaje, respuesta) y un **plazo de conservación** (ej. borrar conversaciones a los 12 meses).
5. **No tratar datos sensibles** (salud, religión…) sin consentimiento explícito. Si el sector lo toca (clínicas), derivar a humano.

> Meta exige además: política de privacidad del negocio, que el usuario inicie la conversación (opt-in), y respetar la ventana de 24 h para mensajes de servicio.

---

## Lo que añade SOLO el bot con IA

1. **Transparencia de IA (AI Act, Art. 50):** hay que dejar claro que se habla con un sistema automático. Ej. primer mensaje: *"Hola, soy el asistente virtual (IA) de [empresa]."*
2. **Transferencia internacional:** el texto del usuario se envía a **Anthropic** (proveedor con sede en EEUU). Hay que:
   - Tener el **DPA** de Anthropic firmado (se acepta en console.anthropic.com).
   - Declarar en el aviso de privacidad que se usa "Claude de Anthropic" para generar respuestas.
3. **Riesgo de alucinación:** la IA puede inventar. Se mitiga con:
   - Instrucción anti-alucinaciones en el system prompt.
   - Aviso de que las respuestas pueden contener errores y que para temas importantes se confirme con el equipo.
   - Escalado a humano cuando no sepa.
4. **No decisiones automatizadas con efecto legal:** un bot informativo no puede, por sí solo, denegar/conceder algo con efecto jurídico (eso sube de categoría de riesgo). Para informar está bien; para decidir, lo revisa una persona.

---

## Cómo se traduce en precio

- **Bot por BD:** menos cumplimiento, sin coste por mensaje de IA, sin transferencia internacional → **setup más bajo y mantenimiento más barato**. Ideal para FAQs, horarios, precios fijos, "¿dónde estáis?", "¿abrís hoy?".
- **Bot con IA:** más valor (entiende lenguaje libre), más cumplimiento y coste por mensaje → **precio mayor**. Ideal para negocios con muchas preguntas distintas o catálogo amplio.

Orientación de precios (ajústalos a tu mercado):

| | Setup | Mantenimiento/mes |
|---|---|---|
| Bot por BD (sin IA) | 600 – 1.200 € | 100 – 200 € |
| Bot con IA | 1.500 – 3.500 € | 250 – 500 € |

---

> Esto es una guía operativa, no asesoramiento jurídico. Para clientes grandes o
> sectores regulados (salud, legal, finanzas), revisa los textos con un abogado
> especializado en protección de datos.
