/**
 * Enlace *click-to-chat* (`wa.me`) a la línea de WhatsApp del negocio, con un
 * texto prellenado para empezar la conversación.
 *
 * Desde el plan 06 (F7) en esa línea contesta el asistente, así que los textos
 * invitan a conversar («Hola, quiero pedir una cita…»). El mensaje con el
 * resumen de la reserva (`generateBookingWhatsAppMessage`) se eliminó: la
 * reserva ya está en el sistema, y mandárselo al asistente se leería como otra.
 */
export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}
