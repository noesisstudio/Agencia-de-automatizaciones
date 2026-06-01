# Generador de Propuestas Noesis — Cómo funciona

## Visión general

Este widget es un **formulario interactivo** que vive dentro del chat de Claude. Cuando lo rellenas y pulsas el botón, no genera el documento él solo — lo que hace es construir un **prompt muy detallado y personalizado** con todos tus datos, y enviarlo a Claude para que redacte la propuesta completa.

---

## Flujo paso a paso

```
[Tú rellenas el formulario]
        ↓
[El widget construye un prompt con tus datos]
        ↓
[sendPrompt() lo envía al chat como si lo hubieras escrito tú]
        ↓
[Claude recibe el prompt y redacta la propuesta]
```

---

## Los campos del formulario

### Bloque 1 — Cliente

| Campo | Para qué sirve |
|---|---|
| **Nombre / empresa** | Personaliza el encabezado y el tono de la propuesta |
| **Sector** | Adapta el lenguaje y los ejemplos al contexto del cliente |
| **Idioma** | Define el idioma de redacción: español, català o english |

### Bloque 2 — Diagnóstico

| Campo | Para qué sirve |
|---|---|
| **Problema principal** | Es el núcleo de la propuesta. Cuanto más específico, mejor resultado |
| **Servicio recomendado** | Orienta la solución propuesta hacia uno de los tres productos de Noesis |

### Bloque 3 — Inversión estimada

| Campo | Para qué sirve |
|---|---|
| **Impl. mín / máx** | Rango de precio de la Fase 1 (implementación) |
| **Mensual mín / máx** | Rango de la cuota de mantenimiento mensual |

---

## Qué hace el botón "Generar propuesta"

Al pulsar el botón, el widget ejecuta una función JavaScript que:

1. **Recoge** todos los valores de los campos.
2. **Valida** que no haya ninguno vacío (si falta alguno, avisa con una alerta).
3. **Construye** un prompt largo y estructurado con las instrucciones de tono, los datos del cliente y la estructura de 5 secciones que debe tener la propuesta.
4. **Llama a `sendPrompt()`** — una función especial del chat que envía ese texto al chat como si fuera un mensaje tuyo.

---

## La estructura de la propuesta generada

Claude redactará siempre las mismas 5 secciones, adaptadas a los datos que hayas introducido:

1. **Contexto y diagnóstico inicial** — reconoce el problema del cliente y explica el coste real de esa fricción.
2. **La solución propuesta** — describe el sistema digital adaptado al sector.
3. **Metodología de trabajo** — presenta las 5 fases de Noesis (Observem → Quantifiquem → Dissenyem → Implementem → Mesurem).
4. **Inversión estimada** — desglosa los rangos de precio con las aclaraciones necesarias.
5. **Siguientes pasos** — propone la reunión de diagnóstico operativo.

---

## Consejos para mejores resultados

> **El campo más importante es "Problema principal".** Cuanto más concreto y específico lo describas, más personalizada y convincente será la propuesta.

- ❌ Malo: *"No organizan bien las citas"*
- ✅ Bueno: *"Gestionan las citas por WhatsApp y teléfono. Hay cancelaciones de último momento sin aviso, huecos sin cubrir y la recepcionista dedica más de 2 horas al día a confirmar manualmente."*

---

## Personalización posterior

Una vez Claude genere la propuesta en el chat, puedes pedirle ajustes directamente:

- *"Hazla más corta"*
- *"Añade un apartado de garantías"*
- *"Cambia el tono, que suene más informal"*
- *"Tradúcela al inglés"*

---

*Generado por Noesis · Sistema de arquitectura operativa*
