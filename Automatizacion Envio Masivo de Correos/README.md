# Envío masivo de correos personalizados

Script que toma una plantilla HTML y un Excel de contactos, rellena los
marcadores (`{{nombre}}`, `{{empresa}}`, ...) por fila y envía cada correo por
SMTP (pensado para el correo de Hostinger, pero vale para cualquier SMTP).

El propio Excel funciona como registro: cada fila enviada se marca en la
columna `estado` como `enviado` (con `fecha_envio`), así que puedes cortar el
proceso a mitad y reanudarlo otro día sin duplicar envíos.

## Instalación

```bash
cd "Automatizacion Envio Masivo de Correos"
python -m venv .venv
# Windows: .venv\Scripts\activate   |   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env   # macOS/Linux: cp .env.example .env
```

Rellena `.env` con tu correo de Hostinger:

```
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=tucorreo@tudominio.com
SMTP_PASS=tu_contraseña
FROM_NAME=Tu Nombre
DELAY_SECONDS=8
```

> Si tu plan usa otro servidor de correo (Titan), comprueba el host/puerto
> exactos en hPanel → Emails → Configuración de correo → "Conectar dispositivos".

## Preparar los datos

1. **Excel de contactos** (`.xlsx`), primera fila con encabezados. Necesita
   como mínimo una columna `email`; el resto de columnas (`nombre`,
   `empresa`, etc.) son las que puedes usar como marcadores en la plantilla.
   Genera uno de ejemplo con:

   ```bash
   python crear_ejemplo.py
   ```

2. **Plantilla** en HTML (ver `plantilla_ejemplo.html`), usando `{{columna}}`
   para cada dato que quieras sustituir por fila.

## Uso

Probar primero el renderizado sin enviar nada ni tocar el Excel:

```bash
python enviar_correos.py --excel contactos_ejemplo.xlsx --template plantilla_ejemplo.html \
  --asunto "{{nombre}}, automatiza {{empresa}} con IA" --dry-run
```

Enviarte un único correo de prueba a ti mismo (usa los datos de la fila 2):

```bash
python enviar_correos.py --excel contactos_ejemplo.xlsx --template plantilla_ejemplo.html \
  --asunto "{{nombre}}, automatiza {{empresa}} con IA" --prueba-a tu@correo.com
```

Envío real, con límite por tanda (recomendado, ver aviso más abajo):

```bash
python enviar_correos.py --excel contactos.xlsx --template plantilla.html \
  --asunto "{{nombre}}, automatiza {{empresa}} con IA" --limite 100
```

Vuelve a ejecutar el mismo comando otro día: las filas ya marcadas como
`enviado` se saltan automáticamente.

## Avisos importantes

- **Límites de envío de Hostinger**: los planes de correo aplican límites por
  hora/día (varían según plan). Usa `--limite` para trocear el envío en
  tandas y `DELAY_SECONDS` (por defecto 6s) para espaciar los correos y no
  parecer spam. Si tienes dudas de tu límite exacto, consúltalo en hPanel.
- **Legal (LSSICE/RGPD)**: para prospección comercial por email en España
  necesitas identificarte claramente en el correo (empresa/NIF) y ofrecer una
  forma sencilla de darse de baja (ver el pie en `plantilla_ejemplo.html`).
  Revisa `RGPD-QUE-HACER.md` en la raíz del repo.
- El `From` del correo siempre es el buzón autenticado (`SMTP_USER`); la
  mayoría de proveedores rechazan o marcan como spam correos con remitente
  distinto al que hace login.
