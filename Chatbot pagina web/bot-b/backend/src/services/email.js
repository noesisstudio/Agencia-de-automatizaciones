const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const EMPRESA = process.env.EMPRESA_NOMBRE || 'la empresa';
const FROM = `${EMPRESA} <${process.env.SMTP_USER}>`;

async function enviarConfirmacionUsuario({ nombre, email }) {
  if (!email) return;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Hemos recibido tu consulta — ${EMPRESA}`,
    html: `
      <p>Hola ${nombre || 'usuario'},</p>
      <p>Hemos recibido tu consulta y nuestro equipo te contactará lo antes posible.</p>
      <p>Gracias por contactar con ${EMPRESA}.</p>
    `,
  });
}

async function notificarEquipo({ nombre, email, telefono, consulta }) {
  if (!process.env.EMAIL_EQUIPO) return;
  await transporter.sendMail({
    from: FROM,
    to: process.env.EMAIL_EQUIPO,
    subject: `Nuevo lead del chatbot — ${nombre || 'Sin nombre'}`,
    html: `
      <h3>Nuevo contacto desde el chatbot</h3>
      <ul>
        <li><b>Nombre:</b> ${nombre || '—'}</li>
        <li><b>Email:</b> ${email || '—'}</li>
        <li><b>Teléfono:</b> ${telefono || '—'}</li>
        <li><b>Consulta:</b> ${consulta || '—'}</li>
      </ul>
    `,
  });
}

module.exports = { enviarConfirmacionUsuario, notificarEquipo };
