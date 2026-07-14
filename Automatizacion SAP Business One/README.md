# Automatización SAP Business One — Entrada de facturas de proveedor

Módulo para crear **borradores de factura de proveedor** en SAP Business One a
partir de datos extraídos de la factura (pensado para encadenar con
`Automatizacion Facturas/` (FacturAI): PDF → IA extrae datos → borrador en SAP).

**Regla de producto**: nunca se contabiliza directo. Se crea un *Draft* que el
gestor revisa y contabiliza desde el cliente SAP (human-in-the-loop, igual que
el resto de automatizaciones de la agencia).

## Qué necesita el cliente para poder instalarlo

SAP Business One **9.0 o superior** con **Service Layer** habilitado (estándar
en instalaciones HANA; disponible también para SQL Server desde la v10). Del
cliente solo hacen falta:

1. URL del Service Layer (ej. `https://su-servidor:50000/b1s/v1`)
2. Base de datos de empresa (CompanyDB)
3. Un usuario SAP con permisos de compras

Si el cliente tiene una versión antigua sin Service Layer, la alternativa es la
DI API (COM) — consultar antes de vender.

## Estructura

```text
Automatizacion SAP Business One/
├── sap_client.py               ← cliente del Service Layer (login, búsquedas, borradores)
├── crear_factura_proveedor.py  ← flujo: JSON de factura → borrador en SAP
├── factura_ejemplo.json        ← formato de entrada esperado
└── .env.example                ← credenciales (copiar a .env)
```

## Demo sin SAP (para enseñar a clientes)

```bash
.venv\Scripts\python.exe crear_factura_proveedor.py --json factura_ejemplo.json --dry-run
```

Muestra el documento exacto que se crearía en SAP, sin necesitar servidor.

## Contra un SAP real

```bash
copy .env.example .env    # rellenar con los datos del cliente
.venv\Scripts\python.exe crear_factura_proveedor.py --json factura.json
```

El flujo: busca el proveedor por NIF (`FederalTaxID`) → construye el documento
(tipo servicio si no hay códigos de artículo) → `POST /Drafts`.

## Puntos a ajustar en cada instalación

- **Cuenta contable de las líneas de servicio** (`AccountCode`): cada empresa
  tiene su plan contable; el valor por defecto es un placeholder que hay que
  mapear en la implantación (por proveedor o por tipo de gasto).
- **Códigos de IVA** (`VatGroup`): `S1` es el habitual para IVA soportado
  general en localizaciones españolas, pero verificar en cada cliente.
- **Alta automática de proveedores nuevos**: no incluida de serie (decisión
  deliberada); se puede añadir como extra.

## Roadmap natural del producto

1. ✅ Factura de proveedor (este módulo)
2. Pedidos de venta desde email/formulario
3. Extracción de informes (ventas, stock, cartera de cobros) a Excel/email
4. Conector n8n/Make para flujos visuales
