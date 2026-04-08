import type Service from 'src/interfaces/service';

export function serviceIsOnPromotion(service: Service): boolean {
  const pct = Number(service.porcentageDiscount ?? 0);
  return Boolean(service.havePromotion) && pct > 0;
}

/** Precio unitario después del descuento (el campo `price` del API es el precio base). */
export function effectiveServiceUnitPrice(service: Service): number {
  const base = Number(service.price || 0);
  if (!serviceIsOnPromotion(service)) return base;
  const pct = Math.min(100, Math.max(0, Number(service.porcentageDiscount ?? 0)));
  return Math.round(base * (1 - pct / 100));
}

export function promotionPercentDisplay(service: Service): number {
  return Math.round(Number(service.porcentageDiscount ?? 0));
}
