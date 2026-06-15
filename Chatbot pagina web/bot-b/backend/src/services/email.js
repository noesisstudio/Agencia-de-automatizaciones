// Email (mock para desarrollo)
// En producción, configurar SMTP real

async function enviarConfirmacionUsuario(data) {
  console.log('📧 Confirmación enviada a:', data.email);
  return { success: true };
}

async function notificarEquipo(data) {
  console.log('📧 Notificación al equipo:', data.email);
  return { success: true };
}

module.exports = {
  enviarConfirmacionUsuario,
  notificarEquipo,
};
