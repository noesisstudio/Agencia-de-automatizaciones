# Noesis Web - Publicacion de prueba

Esta web es estatica. Para probarla fuera del ordenador puedes subir la carpeta `noesis-web` a un hosting estatico.

## Opcion rapida: Netlify Drop

1. Entra en https://app.netlify.com/drop
2. Arrastra la carpeta `noesis-web`.
3. Netlify generara una URL publica temporal.
4. Revisa `index.html`, `contacto.html`, `portal.html`, `portal-dashboard.html`, `aviso-legal.html`, `privacidad.html` y `cookies.html`.

## Opcion ordenada: Vercel

1. Crea un repositorio con la carpeta del proyecto.
2. En Vercel, importa el repositorio.
3. Framework preset: Other.
4. Build command: vacio.
5. Output directory: `noesis-web`.

## Antes de usar con clientes reales

- Completar datos fiscales en `aviso-legal.html` y `privacidad.html`.
- Sustituir el formulario `mailto:` por un backend, Formspree, Netlify Forms o CRM propio.
- Cambiar el portal demo por autenticacion real.
- Alojar documentos de facturacion en zona privada, no como enlaces publicos.
- Revisar textos legales con asesor/a.
- Configurar dominio, SSL y correo profesional.
