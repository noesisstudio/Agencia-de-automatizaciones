# Reporte de auditoría documental

**Fecha:** 2026-05-18  
**Alcance:** 51 archivos (.md, .html, .txt, .json, .pdf, .command) fuera de `node_modules`, `.venv`, `.git`  
**Regla aplicada:** Sin eliminación permanente ni modificación del contenido de archivos archivados.

---

## Resumen ejecutivo

| Categoría | Cantidad |
|-----------|----------|
| Duplicados exactos tratados | 2 |
| Documentos movidos a revisión | 5 |
| Datos de prueba archivados | 1 carpeta |
| Problemas detectados sin mover | 4 |
| Acciones reversibles | 100 % |

---

## 1. Duplicados (conservada la copia más reciente o canónica)

| Archivo original | Problema | Justificación | Acción |
|------------------|----------|---------------|--------|
| `Automatizacion Facturas/.vscode/extensions.json` | Duplicado exacto | Mismo hash SHA-256 que `.vscode/extensions.json` (46 bytes) | **Movido** a `[ARCHIVADOR] Duplicados/Automatizacion Facturas — extensions.json`. Se conserva `.vscode/extensions.json` en la raíz. |
| `Presupuesto Whatsapp/data/tenants/demo/sesiones.json` | Duplicado exacto | Contenido `{}` idéntico a `Presupuesto Whatsapp/data/sesiones.json` | **Movido** a `[ARCHIVADOR] Duplicados/Presupuesto Whatsapp — demo-sesiones.json`. Se conserva `data/sesiones.json`. |

---

## 2. Documentos incompletos, deficientes o desactualizados

| Archivo original | Problema | Justificación | Acción |
|------------------|----------|---------------|--------|
| `Presupuesto Whatsapp/README.md` | Deficiente / desactualizado | Listaba `index.html`, `simulador.html`, `arquitectura.html`, `configuracion.html`, `generador_config.py`, `almacen_sesiones.py` y puerto 8020 que **no existen** en disco | **Movido** a `[ARCHIVADOR] Requiere Revisión/[REVISAR] Presupuesto Whatsapp README.md`. Creado **nuevo** stub mínimo en la ruta original (no sobrescribe el archivado). |
| `Automatizacion Chatbot/Agencia_Estrategia.md` | Desactualizado | Habla de webhook “esqueleto” y RAG pendiente; no describe `panel/`, `knowledge_store.py` ni `/bot/tenants` | **Movido** a `[ARCHIVADOR] Requiere Revisión/[REVISAR] Agencia_Estrategia.md` |
| `Automatizacion Chatbot/web-frontend/README.md` | Plantilla sin adaptar | Texto genérico de `create-next-app`, no documenta Openix | **Movido** a `[ARCHIVADOR] Requiere Revisión/[REVISAR] web-frontend README (plantilla Next.js).md` |
| `Presupuesto Whatsapp/Guia-Presupuesto-WhatsApp.pdf` | Desactualizado | Anterior a la reorganización chatbot / presupuesto y a los README de mayo 2026 | **Movido** a `[ARCHIVADOR] Requiere Revisión/[REVISAR] Guia-Presupuesto-WhatsApp.pdf` |

---

## 3. Datos de prueba (no documentación de producto)

| Archivo original | Problema | Justificación | Acción |
|------------------|----------|---------------|--------|
| `Presupuesto Whatsapp/data/tenants/test-flow/` | Artefacto de prueba | Catálogo y `tarifas.txt` generados en tests automatizados | **Carpeta movida** a `[ARCHIVADOR] Requiere Revisión/test-flow (datos de prueba)` |

---

## 4. Detectado pero no movido (requiere decisión humana)

| Elemento | Problema | Recomendación |
|----------|----------|----------------|
| `Automatizacion Chatbot/chatbot-backend/app/core/prompts.py` | **Código roto:** falta `CHATBOT_SYSTEM_PROMPT` importado por `chat_engine.py` | Restaurar constante (acción de código, no de archivo documental). **Corregido** en la misma sesión de auditoría para no dejar la API caída. |
| `Automatizacion Chatbot/chatbot-backend/app/utils/document_loader.py` | Stub obsoleto | Apunta a `data/knowledge_base` inexistente; sustituido por `knowledge_store.py`. Archivar o eliminar en tarea de código. |
| Archivos HTML faltantes en `Presupuesto Whatsapp/` | Referenciados pero ausentes | `simulador.html`, `configuracion.html`, `index.html`, `arquitectura.html`, `start-presupuesto-whatsapp.command` — recuperar de git o actualizar solo README stub. |
| `.vscode/settings.json` y `launch.json` | Similares entre raíz y `Automatizacion Facturas/.vscode/` | **No son duplicados exactos** (tamaños distintos). Revisar manualmente si se quiere unificar configuración VS Code. |

---

## 5. Documentos en buen estado (muestra)

- `PROYECTO.md` — alineado con arquitectura actual  
- `Automatizacion Chatbot/README.md` — guía completa del chatbot  
- `Automatizacion Chatbot/chatbot-backend/README.md` — referencia rápida  
- `Automatizacion Chatbot/panel/*.html` — panel operativo  
- `Pagina web/*.html` — sitio corporativo (archivos grandes por CSS embebido, no duplicados)  
- `Automatizacion Facturas/README.md` — coherente con FacturAI  

---

## 6. Cómo revertir

1. Mover de vuelta desde `[ARCHIVADOR] Duplicados/` y `[ARCHIVADOR] Requiere Revisión/` a la ruta original.  
2. Borrar el stub `Presupuesto Whatsapp/README.md` si se restaura el README archivado.  
3. Consultar `_MANIFIESTO_AUDITORIA.txt` en la carpeta de revisión para rutas exactas.

---

*Auditoría realizada sin borrado permanente ni edición del contenido de los archivos movidos.*
