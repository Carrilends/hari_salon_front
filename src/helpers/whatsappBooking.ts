import type { BookingLine } from 'src/interfaces/booking';
import { formatCopDisplay } from 'src/helpers/price-display';

export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}

export function generateBookingWhatsAppMessage(params: {
  bookings: BookingLine[];
  bookingsCost: number;
  formattedDateTime: string;
}): string {
  const { bookings, bookingsCost, formattedDateTime } = params;

  const servicesList = bookings
    .map((line) => {
      const principalImage = line.service.images?.find((img) => img.isPrincipal);
      const imageUrl = principalImage?.url || '';
      const qty = line.quantity > 1 ? ` (×${line.quantity})` : '';

      if (imageUrl) return `• ${line.service.name}${qty}: ${imageUrl}`;
      return `• ${line.service.name}${qty}`;
    })
    .join('\n');

  return `*Reserva - Hari Salon*

*Servicios reservados:*
${servicesList}

*Costo Total:* ${formatCopDisplay(bookingsCost)} COP

*Fecha y Hora:* ${formattedDateTime}`;
}

