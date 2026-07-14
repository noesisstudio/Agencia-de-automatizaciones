# Procesos automatizables para gestorías — según el software que usan

> Documento de producto para la campaña de gestorías (julio 2026).
> Objetivo: saber qué ofrecer en la demo según el programa que use cada despacho.

---

## 1. El software que usan las gestorías españolas (y cómo de abierto es)

| Software | Implantación | ¿API para automatizar? | Dificultad |
|---|---|---|---|
| **A3 / a3innuva (Wolters Kluwer)** | La más alta en despachos | ✅ Sí — portal oficial [a3developers](https://a3developers.wolterskluwer.es/) con API Conectia (OAuth + API Key), módulos de contabilidad, nómina y factura. SDK público en GitHub (Importia) | Media |
| **Sage Despachos Connected** | Muy alta | ⚠️ Sin API pública (confirmado en su foro oficial). Integraciones solo vía partners/ISV homologados o por importación de ficheros | Alta |
| **Holded** | Creciente en asesorías pequeñas/medianas | ✅ Sí — API REST moderna y pública con API Key. La más fácil de integrar | Baja |
| **Monitor Informática (miConta, miNomina...)** | Media, muy nicho gestorías | ⚠️ Limitada, principalmente import/export de ficheros | Alta |
| **Contasol (Software DELSOL)** | Media (gratuito, muy extendido) | ⚠️ Sin API pública; importación por ficheros (formatos propios/Excel) | Media |
| **SAP Business One** *(de la foto)* | Baja en gestorías, alta en sus clientes pymes industriales | ✅ Sí — Service Layer REST. **Módulo ya construido** en `Automatizacion SAP Business One/` | Media |

**De la foto de partners**: SAP ya está cubierto. AWS/Azure/GCP son infraestructura
(donde alojamos, no qué integramos). Salesforce/ServiceNow/Workday/Databricks/Snowflake
son de empresa grande, no del día a día de una gestoría española — no priorizar.

**Conclusión estratégica**: priorizar **a3innuva** (el más implantado Y con API oficial)
y **Holded** (el más fácil; asesorías jóvenes). Para Sage/Contasol/Monitor, la
automatización se hace "por fuera" (ficheros de importación + RPA ligero), que también
es vendible pero con más mantenimiento.

---

## 2. Procesos automatizables (ordenados por demanda y viabilidad)

### P1 — Entrada automática de facturas de cliente 🥇
**El dolor nº 1 que ya usamos en la campaña de correos.**
- Flujo: cliente envía factura (email/WhatsApp/carpeta) → IA extrae datos (ya lo hace FacturAI) → se genera el **asiento/factura en el programa del despacho**.
- Con a3innuva: API de contabilidad (Conectia) o SDK Importia.
- Con Holded: API REST directa (`/documents`).
- Con Sage/Contasol: generar fichero de importación en su formato + dejarlo listo para importar (semi-automático).
- **Ya tenemos el 70%**: FacturAI extrae; falta el conector de salida por software.

### P2 — Recepción y clasificación de documentación de clientes
- Flujo: buzón de email del despacho → IA clasifica (factura / nómina / requerimiento AEAT / DNI / otros) → guarda en la carpeta/expediente del cliente correcto + registro en Excel/Sheets.
- No depende del software contable → **vendible a cualquier gestoría desde el día 1**.
- Base ya existente: `Automatizacion Email Comercial/` (clasificación con IA).

### P3 — Conciliación bancaria asistida
- Flujo: extracto bancario (Norma 43/CSV) → matching automático contra facturas registradas → informe de diferencias.
- Con Holded/a3innuva: subir movimientos por API. Con el resto: informe Excel de conciliación.

### P4 — Avisos automáticos a clientes del despacho
- Flujo: calendario fiscal (IVA trimestral, IRPF, sociedades...) → recordatorios automáticos por email/WhatsApp a cada cliente con lo que tiene que aportar y cuándo.
- Reutiliza: envío masivo de correos (ya construido) + bot WhatsApp (ya construido).
- **Demo inmediata posible** — es combinar dos piezas que ya tenemos.

### P5 — Solicitud y persecución de documentación pendiente
- Flujo: lista de documentos pendientes por cliente → recordatorio automático cada X días hasta que el documento llega (se detecta en el buzón) → aviso al gestor.
- Es el "cobrador del frac" de la documentación: ahorra llamadas infinitas.

### P6 — Informes periódicos para el cliente final
- Flujo: datos del programa (por API o export) → resumen mensual claro (facturación, gastos, impuestos previstos) → email automático al cliente del despacho.
- Fideliza al cliente del despacho; la gestoría lo vende como servicio premium.

---

## 3. Qué ofrecer en cada demo según software

- "¿Usáis **a3innuva**?" → P1 completo por API (impacto máximo).
- "¿Usáis **Holded**?" → P1 + P3 + P6 por API (rápido de montar).
- "¿Usáis **Sage Despachos**?" → P1 semi-automático (fichero de importación) + P2/P4/P5 (independientes del software).
- "¿Otro / no sé?" → P2 + P4 (funcionan con cualquier programa, cero riesgo técnico).

## 4. Siguiente paso técnico propuesto

1. **Conector a3innuva** (alta prioridad): darse de alta en [a3developers](https://a3developers.wolterskluwer.es/), pedir credenciales Conectia (API Key + Client OAuth) y montar el módulo `FacturAI → a3innuva Contabilidad`. El registro de desarrollador lo tiene que iniciar Xavier (requiere cuenta de empresa).
2. **Conector Holded** (rápido): se puede construir ya contra una cuenta trial gratuita de Holded.
3. **P4 (avisos fiscales)**: combinable hoy mismo con lo existente; buen "producto de entrada" barato.
