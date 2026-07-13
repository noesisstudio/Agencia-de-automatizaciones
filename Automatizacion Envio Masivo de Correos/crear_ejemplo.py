"""Genera contactos_ejemplo.xlsx con el formato que espera enviar_correos.py."""
from openpyxl import Workbook

wb = Workbook()
ws = wb.active
ws.title = "contactos"
ws.append(["nombre", "empresa", "email", "estado", "fecha_envio"])
ws.append(["María García", "Clínica Ejemplo SL", "maria@ejemplo.com", "", ""])
ws.append(["Carlos Ruiz", "Talleres Ruiz", "carlos@ejemplo.com", "", ""])

wb.save("contactos_ejemplo.xlsx")
print("Creado contactos_ejemplo.xlsx")
