"""Crea un BORRADOR de factura de proveedor en SAP Business One a partir de un JSON
con los datos extraídos de la factura (formato de salida de FacturAI o similar).

Flujo: JSON -> localizar proveedor en SAP por NIF -> construir documento ->
POST /Drafts (borrador, nunca contabiliza directo; el gestor revisa en SAP).

Uso:
    python crear_factura_proveedor.py --json factura_ejemplo.json --dry-run
    python crear_factura_proveedor.py --json factura.json            (contra SAP real)
"""
import argparse
import json
import sys

from sap_client import SapClient, SapClientError


def construir_payload(datos, card_code):
    lineas = []
    for linea in datos["lineas"]:
        item = {
            "Quantity": linea["cantidad"],
            "UnitPrice": linea["precio_unitario"],
            "VatGroup": linea.get("codigo_iva"),
        }
        if linea.get("codigo_articulo"):
            item["ItemCode"] = linea["codigo_articulo"]
            item["ItemDescription"] = linea["descripcion"]
        else:
            # Línea de servicio (sin artículo de inventario): requiere cuenta contable.
            # AccountCode debe ajustarse al plan contable del cliente.
            item["ItemDescription"] = linea["descripcion"]
            item["AccountCode"] = linea.get("cuenta_contable", "_SYS00000000001")
        lineas.append(item)

    payload = {
        "CardCode": card_code,
        "DocDate": datos["fecha_factura"],
        "DocDueDate": datos.get("fecha_vencimiento", datos["fecha_factura"]),
        "NumAtCard": datos["numero_factura"],
        "Comments": datos.get("comentario", ""),
        "DocumentLines": lineas,
    }
    # Sin artículos de inventario -> documento de tipo servicio
    if all(not l.get("codigo_articulo") for l in datos["lineas"]):
        payload["DocType"] = "dDocument_Service"
    return payload


def main():
    parser = argparse.ArgumentParser(description="JSON de factura -> borrador de factura de proveedor en SAP B1")
    parser.add_argument("--json", required=True, help="Ruta al JSON con los datos de la factura")
    parser.add_argument("--dry-run", action="store_true",
                        help="Modo demo: muestra el documento que se crearía sin conectar a SAP")
    args = parser.parse_args()

    with open(args.json, encoding="utf-8") as f:
        datos = json.load(f)

    if args.dry_run:
        payload = construir_payload(datos, card_code="(se buscará por NIF: %s)" % datos["proveedor_nif"])
        payload["DocObjectCode"] = "oPurchaseInvoices"
        print("[DRY-RUN] Documento que se enviaría a POST /Drafts del Service Layer:\n")
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        total = sum(l["cantidad"] * l["precio_unitario"] for l in datos["lineas"])
        print(f"\nTotal (sin IVA): {total:.2f}")
        return

    client = SapClient().login()
    try:
        proveedor = client.buscar_proveedor_por_nif(datos["proveedor_nif"])
        if not proveedor:
            sys.exit(f"No existe proveedor con NIF {datos['proveedor_nif']} en SAP. "
                     f"Crea primero la ficha del proveedor (o pídeme que automatice también el alta).")

        print(f"Proveedor encontrado: {proveedor['CardCode']} - {proveedor['CardName']}")
        payload = construir_payload(datos, card_code=proveedor["CardCode"])
        resultado = client.crear_borrador_factura_proveedor(payload)
        print(f"Borrador creado en SAP con DocEntry {resultado.get('DocEntry')}. "
              f"Pendiente de revisión y contabilización por el gestor.")
    except SapClientError as e:
        sys.exit(f"Error de SAP: {e}")
    finally:
        client.logout()


if __name__ == "__main__":
    main()
