"""Genera contactos_gestorias.xlsx con gestorías reales de Vic, Sabadell, Terrassa,
Zaragoza e Igualada (nombres obtenidos de Páginas Amarillas / Empresite / Gestorias.es /
Gestorías24, julio 2026). Las columnas email/estado/fecha_envio se dejan vacías para
rellenar el email manualmente antes de enviar."""
from openpyxl import Workbook

GESTORIAS = [
    # (empresa, ciudad)
    ("Gestoria Ferrer S.L.P.", "Vic"),
    ("MC Associats", "Vic"),
    ("Gestoria Pujols S.C.P.", "Vic"),
    ("Gestoria Martí Albó", "Vic"),
    ("Josep M. Galobardes SL", "Vic"),
    ("Jaume Morato Vila S.L.", "Vic"),
    ("Costa Patrimonial S.L.", "Vic"),
    ("Pere Isern Assessor S.L.", "Vic"),
    ("Gestión Documental JM", "Vic"),

    ("Bufete Vidal & Sánchez, S.L.", "Sabadell"),
    ("Gestoria Piqué S.L.", "Sabadell"),
    ("Marimon Assessors", "Sabadell"),
    ("Gestoria Boronat SLP", "Sabadell"),
    ("Asesoria Gest Sabadell", "Sabadell"),
    ("AM Gestoria Assessoria", "Sabadell"),
    ("Assessoria Millan", "Sabadell"),
    ("Gestoria Inmobiliaria Thisac", "Sabadell"),
    ("Gabinete Contable Vallès S.L.", "Sabadell"),
    ("TS Gestió - Gestoría y Asesoría", "Sabadell"),
    ("Croman Asesoría Sabadell", "Sabadell"),
    ("Serveis d'Empresa Sabadell", "Sabadell"),
    ("Gestoría Morillas-Azogue & Asociados SL", "Sabadell"),

    ("Assessoria Administrativa Amela SLP", "Terrassa"),
    ("Tràmit Vallès Gestoria Administrativa SL", "Terrassa"),
    ("Gestoria Lexitus Vallès S.L.", "Terrassa"),
    ("Gestoria Riera SL", "Terrassa"),
    ("Gestoria Santaló SLP", "Terrassa"),
    ("Gestoria Multi-Gest SLP", "Terrassa"),
    ("Gestoria Gil Sellarès S.L.", "Terrassa"),
    ("Gestoria Can Roca S.L.", "Terrassa"),
    ("Gestoria i Assessoria Vilanova SLP", "Terrassa"),
    ("Gestoria F. Gómez S.C.P.", "Terrassa"),
    ("Nord RCR Assessors S.L.", "Terrassa"),
    ("Asesoria Juridico Administrativa SL", "Terrassa"),

    ("Gestoria Beclan Asesores", "Zaragoza"),
    ("Gestoria Cuevas", "Zaragoza"),
    ("Entre Trámites", "Zaragoza"),
    ("Dc3 Asesores Legales y Gestores Tributarios", "Zaragoza"),
    ("CGB Asesores", "Zaragoza"),
    ("Ortín & Asociados", "Zaragoza"),
    ("GD Asesoría Zaragoza", "Zaragoza"),
    ("Cross Asesores", "Zaragoza"),
    ("Conat Consultores", "Zaragoza"),
    ("Mir Gestoría Administrativa", "Zaragoza"),
    ("Gestoría Continente", "Zaragoza"),
    ("M&D Gestoría", "Zaragoza"),
    ("Ignacio Ballesta Asesores", "Zaragoza"),
    ("J. M. Pardo - Gestoría Administrativa", "Zaragoza"),
    ("Gestoría Botos", "Zaragoza"),

    ("Gestoria Galtes", "Igualada"),
    ("Oliva & Miguel Gestió", "Igualada"),
    ("Gestoria Fàbregas", "Igualada"),
    ("Gestoria Bernadas", "Igualada"),
    ("Grup Carles, Gestió i Projectes", "Igualada"),
    ("Asesoría Alex Julien", "Igualada"),
    ("Casas Gestió", "Igualada"),
]

wb = Workbook()
ws = wb.active
ws.title = "gestorias"
ws.append(["nombre", "empresa", "ciudad", "email", "estado", "fecha_envio"])
for empresa, ciudad in GESTORIAS:
    ws.append([f"equip de {empresa}", empresa, ciudad, "", "", ""])

wb.save("contactos_gestorias.xlsx")
print(f"Creado contactos_gestorias.xlsx con {len(GESTORIAS)} gestorías.")
