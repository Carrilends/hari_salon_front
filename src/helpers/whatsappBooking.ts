import type { BookingLine } from 'src/interfaces/booking';
import { formatCopDisplay } from 'src/helpers/price-display';
import {
  effectiveServiceUnitPrice,
  promotionPercentDisplay,
  serviceIsOnPromotion,
} from 'src/helpers/service-promotion';

export function buildWhatsAppUrl(phoneNumber: string, message: string): string {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return hours === 1 ? '1 hora' : `${hours} horas`;
  return `${hours}h ${mins}min`;
}

export function generateBookingWhatsAppMessage(params: {
  bookings: BookingLine[];
  bookingsCost: number;
  /** Minutos totales estimados; si se omite se trata como 0. */
  bookingsDuration?: number;
  formattedDateTime: string;
  stylistName?: string;
}): string {
  const { bookings, bookingsCost, formattedDateTime } = params;
  const bookingsDuration = params.bookingsDuration ?? 0;

  const servicesList = bookings
    .map((line) => {
      const principalImage = line.service.images?.find((img) => img.isPrincipal);
      const imageUrl = principalImage?.url || '';
      const qty = line.quantity > 1 ? ` (×${line.quantity})` : '';
      const hasPromo = serviceIsOnPromotion(line.service);
      const promoInfo = hasPromo
        ? ` [PROMO -${promotionPercentDisplay(line.service)}% | ${formatCopDisplay(
            effectiveServiceUnitPrice(line.service)
          )} c/u]`
        : '';

      if (imageUrl) return `• ${line.service.name}${qty}${promoInfo}: ${imageUrl}`;
      return `• ${line.service.name}${qty}${promoInfo}`;
    })
    .join('\n');

  const durationLine = bookingsDuration > 0
    ? `\n*Tiempo Aprox.:* ${formatDuration(bookingsDuration)}\n`
    : '';

  const stylistLine = params.stylistName
    ? `\n*Estilista:* ${params.stylistName}`
    : '';

  return `*Reserva - Hari Salon*

*Servicios reservados:*
${servicesList}

*Costo Total:* ${formatCopDisplay(bookingsCost)} COP${durationLine}${stylistLine}
*Fecha y Hora:* ${formattedDateTime}`;
}

