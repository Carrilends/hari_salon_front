import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue';
import { useQueryClient } from '@tanstack/vue-query';
import { queryKeys } from 'src/api/query-keys';
import type {
  WorkerAvailabilityEntry,
  WorkerAvailabilityResponse,
} from 'src/api/workers-api';
import { useBookStore } from 'src/stores/book-store';
import { useAuthStore } from 'src/stores/auth-store';
import { useWorkerAvailability } from 'src/composables/booking/useWorkerAvailability';
import { useOcupacionDeLaTira } from 'src/composables/booking/useOcupacionDeLaTira';
import { enviarReserva } from 'src/composables/booking/enviarReserva';
import {
  diasDeLaTira,
  huecosDelDia,
  rangoDeLaTira,
  type DiaDeTira,
  type HuecoDeHora,
} from 'src/helpers/reserva-huecos';
import {
  armarSolicitud,
  hayErrores,
  validarDatos,
  type ErroresDatos,
} from 'src/helpers/reserva-envio';
import {
  fechaHoraWhatsApp,
  fechaLarga,
  franjaTexto,
  horaCorta,
  sumarMinutos,
} from 'src/helpers/reserva-texto';
import {
  getSalonNowParts,
  type SalonNowParts,
} from 'src/helpers/businessHours';
import { effectiveServiceUnitPrice } from 'src/helpers/service-promotion';
import {
  buildWhatsAppUrl,
  generateBookingWhatsAppMessage,
} from 'src/helpers/whatsappBooking';
import { WHATSAPP_PHONE } from 'src/constants/whatsapp-phone';
import type {
  AvisoDisponibilidad,
  CitaElegida,
  ResumenExito,
} from 'src/components/reserva/tipos';

export type PasoReserva = 'servicios' | 'cuando' | 'datos' | 'exito';

export const MENSAJE_ERROR_ENVIO =
  'No pudimos registrar tu reserva. Revisa tu conexión e inténtalo de nuevo: tus datos siguen aquí.';

/**
 * Tras cambiar de paso, «Continuar» no hace nada durante este tiempo. El pie
 * tiene un solo botón que en «Tus datos» pasa a ser «Confirmar reserva»: sin
 * esta pausa, un doble toque en «Cuándo» confirmaría sin que la clienta llegue
 * a ver «Tus datos».
 */
export const PAUSA_TRAS_CAMBIO_DE_PASO_MS = 400;

export const MENSAJE_SESION_CERRADA =
  'Tu sesión se cerró. Escribe tus datos para reservar, o entra de nuevo.';

export const MENSAJE_HORA_PASADA = 'Esa hora ya pasó. Elige otra.';

/** `'HH:mm'` → minuto del día. */
const minutoDe = (h: string) => {
  const [horas, minutos] = h.split(':').map(Number);
  return horas * 60 + minutos;
};

/** ¿La hora elegida de ese día ya empezó, según el reloj del servidor? */
function yaPaso(
  fecha: string,
  h: string,
  datos: WorkerAvailabilityResponse
): boolean {
  return (
    fecha.replace(/\//g, '-') === datos.salonNow.ymd &&
    minutoDe(h) <= datos.salonNow.minOfDay
  );
}

/** La hora del salón según el servidor, si ya respondió la ocupación. */
function ahoraDelServidor(
  salonNow: { ymd: string; minOfDay: number } | undefined
): SalonNowParts | null {
  if (!salonNow) return null;
  return {
    ymd: salonNow.ymd,
    qDate: salonNow.ymd.replace(/-/g, '/'),
    minOfDay: salonNow.minOfDay,
  };
}

/**
 * El estado del cajón de reserva (spec §1 de las vistas restantes): los
 * pasos, lo elegido, la comprobación de disponibilidad al confirmar y el
 * éxito. Las piezas visuales son presentacionales; todo lo que decide vive
 * aquí, y lo que se manda al backend, en `reserva-envio.ts`.
 *
 * Contiene el `wa.me` del salón (`WHATSAPP_PHONE`), pero nunca lo abre: lo
 * deja en el resumen para el botón opcional del éxito (B5).
 */
export function useCajonReserva(abierto: Ref<boolean>) {
  const bolsa = useBookStore();
  const auth = useAuthStore();
  const queryClient = useQueryClient();

  const paso = ref<PasoReserva>('servicios');
  const fecha = ref<string | null>(null);
  const hora = ref<string | null>(null);
  const estilistaId = ref<string | null>(null);
  const nombre = ref('');
  const telefono = ref('');
  const consentimiento = ref(false);
  const errores = ref<ErroresDatos>({});
  const enviando = ref(false);
  const errorEnvio = ref<string | null>(null);
  const aviso = ref<AvisoDisponibilidad | null>(null);
  const resumen = ref<ResumenExito | null>(null);
  /** La hora que falló, para «Probar sin preferencia». */
  let horaFallida: string | null = null;
  /** Cuándo cambió el paso por última vez (abrir el cajón cuenta). */
  let ultimoCambioDePaso = abierto.value ? Date.now() : -Infinity;

  // `getSalonNowParts` solo usa `Intl`: es seguro en `setup` (también en SSG).
  const ahora = ref<SalonNowParts>(getSalonNowParts());
  const rango = computed(() => rangoDeLaTira(ahora.value));

  const ocupacion = useOcupacionDeLaTira(rango, abierto);
  const disponibilidadQuery = useWorkerAvailability(
    computed(() => fecha.value ?? ''),
    abierto
  );

  const lineas = computed(() => bolsa.bookings);
  const cantidad = computed(() => bolsa.totalBookingQuantity);
  const total = computed(() => bolsa.bookingsCost);
  const duracion = computed(() => bolsa.bookingsDuration);
  const conSesion = computed(() => auth.isLoggedIn);
  const cuenta = computed(() => ({
    nombre: auth.fullname,
    correo: auth.email,
  }));

  const dias = computed(() =>
    diasDeLaTira(
      ahoraDelServidor(ocupacion.data.value?.salonNow) ?? ahora.value,
      ocupacion.data.value?.byDate,
      duracion.value
    )
  );

  const disponibilidad = computed<WorkerAvailabilityResponse | undefined>(
    () => disponibilidadQuery.data.value
  );

  const estilistas = computed<WorkerAvailabilityEntry[]>(() =>
    (disponibilidad.value?.workers ?? []).filter((w) => w.assignable)
  );

  const huecosCon = (
    datos: WorkerAvailabilityResponse | undefined,
    id: string | null
  ): HuecoDeHora[] => {
    if (!fecha.value || !datos) return [];
    return huecosDelDia({
      fecha: fecha.value,
      duracionMin: duracion.value,
      disponibilidad: datos,
      estilistaId: id,
    });
  };

  const huecos = computed(() =>
    huecosCon(disponibilidad.value, estilistaId.value)
  );

  const cargandoHuecos = computed(
    () =>
      Boolean(fecha.value) &&
      !disponibilidad.value &&
      !disponibilidadQuery.isError.value
  );

  const errorHuecos = computed(
    () =>
      Boolean(fecha.value) &&
      disponibilidadQuery.isError.value &&
      !disponibilidad.value
  );

  const horaLibre = (h: string | null, lista: HuecoDeHora[] = huecos.value) =>
    h !== null && lista.some((hueco) => hueco.hora === h && hueco.libre);

  const nombreEstilista = (
    id: string | null,
    lista: WorkerAvailabilityEntry[] = disponibilidad.value?.workers ?? []
  ) => (id === null ? null : lista.find((w) => w.id === id)?.name ?? null);

  const puedeContinuar = computed(() => {
    if (enviando.value || cantidad.value === 0) return false;
    if (paso.value === 'cuando') return horaLibre(hora.value);
    return true;
  });

  const cita = computed<CitaElegida>(() => {
    const f = fecha.value ?? '';
    const h = hora.value;
    const estilista = nombreEstilista(estilistaId.value);
    return {
      cuando: h ? `${fechaLarga(f)} · ${horaCorta(h)}` : fechaLarga(f),
      detalle: h
        ? `Hasta las ${horaCorta(sumarMinutos(h, duracion.value))} · ${
            estilista ? `con ${estilista}` : 'sin preferencia de estilista'
          }`
        : '',
      servicios: lineas.value.map((l) => l.service.name).join(' · '),
    };
  });

  /** La línea del pie en «Cuándo»: lo elegido hasta ahora. */
  const lineaResumen = computed(() => {
    if (!fecha.value) return '';
    const estilista = nombreEstilista(estilistaId.value);
    const partes = [fechaLarga(fecha.value)];
    if (hora.value) {
      partes.push(
        franjaTexto(hora.value, duracion.value),
        estilista ?? 'Sin preferencia'
      );
    } else {
      if (estilista) partes.push(estilista);
      partes.push(aviso.value ? 'elige otra hora' : 'elige una hora');
    }
    return partes.join(' · ');
  });

  function reiniciar() {
    paso.value = 'servicios';
    resumen.value = null;
    aviso.value = null;
    errorEnvio.value = null;
    horaFallida = null;
  }

  // Abrir empieza siempre en la bolsa (conservando lo elegido); cerrar en el
  // éxito deja el cajón limpio para la próxima reserva.
  watch(abierto, (estaAbierto) => {
    if (estaAbierto) {
      // El cajón no se deja cerrar mientras registra; si aun así algo lo
      // cerró y la reserva quedó, el éxito se ve al abrir: la bolsa ya se
      // vació y es la única confirmación que tiene la clienta.
      if (paso.value === 'exito' && resumen.value) return;
      ahora.value = getSalonNowParts();
      paso.value = 'servicios';
      // Aunque ya estuviera en «servicios»: abrir también es cambiar de paso.
      ultimoCambioDePaso = Date.now();
      errorEnvio.value = null;
      return;
    }
    if (paso.value === 'exito') reiniciar();
  });

  // Síncrono: dos llamadas seguidas a `continuar()` en el mismo evento ya
  // deben ver el cambio de la primera.
  watch(
    paso,
    () => {
      ultimoCambioDePaso = Date.now();
    },
    { flush: 'sync' }
  );

  watch(fecha, () => {
    hora.value = null;
    aviso.value = null;
    horaFallida = null;
  });

  // Una hora que deja de caber (otra estilista, bolsa más larga, datos
  // nuevos) no se queda elegida en silencio.
  watch(huecos, () => {
    if (hora.value !== null && !horaLibre(hora.value)) hora.value = null;
  });

  // Una estilista que se queda sin tiempo vuelve a «Sin preferencia».
  watch([estilistas, duracion], () => {
    if (estilistaId.value === null || !disponibilidad.value) return;
    const elegida = estilistas.value.find((w) => w.id === estilistaId.value);
    if (!elegida || elegida.availableMinutes < duracion.value) {
      estilistaId.value = null;
    }
  });

  watch(cantidad, (n) => {
    if (n === 0 && (paso.value === 'cuando' || paso.value === 'datos')) {
      paso.value = 'servicios';
    }
  });

  /**
   * ¿Le queda hoy alguna hora en la que quepa la bolsa antes del cierre? Se
   * mira con el reloj, sin esperar a la ocupación: mientras esta no llega,
   * todos los días son «desconocida» y, a las 19:50, hoy pasaría por bueno.
   * La rejilla es la de `huecosDelDia`: cada 30 min desde la apertura, y solo
   * las horas posteriores al minuto actual.
   */
  function hoyQuedaHueco(dia: DiaDeTira, minutoActual: number): boolean {
    const cierra = minutoDe(dia.horario.cierra);
    for (
      let t = minutoDe(dia.horario.abre);
      t + duracion.value <= cierra;
      t += 30
    ) {
      if (t > minutoActual) return true;
    }
    return false;
  }

  function primerDiaConHueco(): string | null {
    const reloj =
      ahoraDelServidor(ocupacion.data.value?.salonNow) ?? ahora.value;
    return (
      dias.value.find(
        (d) =>
          d.disponibilidad !== 'sin-hueco' &&
          !(d.esHoy && !hoyQuedaHueco(d, reloj.minOfDay))
      )?.fecha ?? null
    );
  }

  function continuar() {
    if (!puedeContinuar.value) return;
    if (Date.now() - ultimoCambioDePaso < PAUSA_TRAS_CAMBIO_DE_PASO_MS) return;
    if (paso.value === 'servicios') {
      const sigueEnLaTira = dias.value.some((d) => d.fecha === fecha.value);
      if (!fecha.value || !sigueEnLaTira) fecha.value = primerDiaConHueco();
      paso.value = 'cuando';
      return;
    }
    if (paso.value === 'cuando') {
      paso.value = 'datos';
      return;
    }
    if (paso.value === 'datos') void confirmar();
  }

  function atras() {
    if (paso.value === 'cuando') paso.value = 'servicios';
    else if (paso.value === 'datos') paso.value = 'cuando';
  }

  function irACuando() {
    if (cantidad.value > 0) paso.value = 'cuando';
  }

  function elegirFecha(f: string) {
    fecha.value = f;
  }

  function elegirHora(h: string) {
    if (!horaLibre(h)) return;
    hora.value = h;
    aviso.value = null;
    horaFallida = null;
  }

  function elegirEstilista(id: string | null) {
    estilistaId.value = id;
  }

  function quitarServicio(id: string) {
    bolsa.removeBooking(id);
  }

  function reintentarHuecos() {
    void disponibilidadQuery.refetch();
  }

  async function refrescarDisponibilidad(): Promise<
    WorkerAvailabilityResponse | undefined
  > {
    try {
      const respuesta = await disponibilidadQuery.refetch();
      return respuesta.data ?? undefined;
    } catch {
      return undefined;
    }
  }

  /** B6: de vuelta a «Cuándo», con el aviso en línea y sin la hora que falló. */
  function irACambio(
    elegida: { id: string | null; nombre: string | null },
    horaElegida: string
  ) {
    aviso.value = {
      texto: elegida.nombre
        ? `La disponibilidad cambió y ya no hay tiempo suficiente con ${
            elegida.nombre
          } a las ${horaCorta(horaElegida)}.`
        : `La disponibilidad cambió y ya no queda hueco a las ${horaCorta(
            horaElegida
          )}.`,
      ofrecerSinPreferencia: elegida.id !== null,
    };
    horaFallida = horaElegida;
    hora.value = null;
    paso.value = 'cuando';
  }

  /**
   * La hora empezó mientras la clienta escribía: no es que otra la tomara, así
   * que no se nombra a la estilista ni se ofrece «Probar sin preferencia».
   * Igual que en B6: de vuelta a «Cuándo», sin la hora y con todo lo demás.
   */
  function irAHoraPasada() {
    aviso.value = { texto: MENSAJE_HORA_PASADA, ofrecerSinPreferencia: false };
    horaFallida = null;
    hora.value = null;
    paso.value = 'cuando';
  }

  function elegirOtraHora() {
    aviso.value = null;
    horaFallida = null;
  }

  function probarSinPreferencia() {
    const anterior = horaFallida;
    estilistaId.value = null;
    aviso.value = null;
    horaFallida = null;
    if (
      anterior &&
      horaLibre(anterior, huecosCon(disponibilidad.value, null))
    ) {
      hora.value = anterior;
    }
  }

  function armarResumen(
    f: string,
    h: string,
    estilista: string | null,
    sesion: boolean
  ): ResumenExito {
    const mensaje = generateBookingWhatsAppMessage({
      bookings: lineas.value,
      bookingsCost: total.value,
      bookingsDuration: duracion.value,
      formattedDateTime: fechaHoraWhatsApp(f, h),
      stylistName: estilista ?? undefined,
    });
    return {
      fechaTexto: fechaLarga(f),
      franja: franjaTexto(h, duracion.value),
      estilista,
      lineas: lineas.value.map((l) => ({
        nombre: l.service.name,
        cantidad: l.quantity,
        precio: effectiveServiceUnitPrice(l.service) * l.quantity,
      })),
      total: total.value,
      conSesion: sesion,
      avisoPorWhatsApp: telefono.value.trim() !== '',
      urlWhatsApp: buildWhatsAppUrl(WHATSAPP_PHONE, mensaje),
    };
  }

  async function invalidar() {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.workerAvailability.all,
    });
    await queryClient.invalidateQueries({ queryKey: queryKeys.occupancy.all });
    await queryClient.invalidateQueries({
      queryKey: queryKeys.reservations.me,
    });
  }

  async function confirmar() {
    if (enviando.value) return;
    errorEnvio.value = null;
    errores.value = validarDatos({
      conSesion: conSesion.value,
      nombre: nombre.value,
      telefono: telefono.value,
      consentimiento: consentimiento.value,
    });
    if (hayErrores(errores.value)) return;
    if (!fecha.value || !hora.value) {
      paso.value = 'cuando';
      return;
    }

    // Todo lo que se va a usar se fija ahora: los vigilantes pueden cambiar
    // la estilista o la hora mientras se espera a la red.
    const f = fecha.value;
    const h = hora.value;
    const elegida = {
      id: estilistaId.value,
      nombre: nombreEstilista(estilistaId.value),
    };
    const sesion = conSesion.value
      ? { nombre: auth.fullname, correo: auth.email }
      : null;

    enviando.value = true;
    try {
      // 1. ¿Sigue libre? Con la disponibilidad de ahora mismo, no la de
      //    cuando se eligió. Si la recarga falla, decide el servidor.
      const fresca = await refrescarDisponibilidad();
      if (fresca) {
        const libres = huecosDelDia({
          fecha: f,
          duracionMin: duracion.value,
          disponibilidad: fresca,
          estilistaId: elegida.id,
        });
        if (!horaLibre(h, libres)) {
          if (yaPaso(f, h, fresca)) irAHoraPasada();
          else irACambio(elegida, h);
          return;
        }
      }

      const solicitud = armarSolicitud({
        fecha: f,
        hora: h,
        serviceIds: lineas.value.map((l) => l.service.id),
        estilistaId: elegida.id,
        sesion,
        nombre: nombre.value,
        telefono: telefono.value,
      });
      if (!solicitud) {
        errorEnvio.value = MENSAJE_ERROR_ENVIO;
        return;
      }

      const resultado = await enviarReserva(solicitud, sesion !== null);

      if (resultado.tipo === 'creada') {
        resumen.value = armarResumen(
          f,
          h,
          elegida.nombre ??
            nombreEstilista(resultado.reserva.workerId, fresca?.workers),
          sesion !== null
        );
        // Primero el paso: así vaciar la bolsa no lo devuelve a «Tus servicios».
        paso.value = 'exito';
        bolsa.clearBookings();
        nombre.value = '';
        telefono.value = '';
        consentimiento.value = false;
        errores.value = {};
        fecha.value = null;
        estilistaId.value = null;
        void invalidar();
        return;
      }

      if (resultado.tipo === 'hora-pasada') {
        await refrescarDisponibilidad();
        void queryClient.invalidateQueries({
          queryKey: queryKeys.occupancy.all,
        });
        irAHoraPasada();
        return;
      }

      if (resultado.tipo === 'conflicto') {
        await refrescarDisponibilidad();
        void queryClient.invalidateQueries({
          queryKey: queryKeys.occupancy.all,
        });
        irACambio(elegida, h);
        return;
      }

      errorEnvio.value =
        resultado.tipo === 'sesion-cerrada'
          ? MENSAJE_SESION_CERRADA
          : MENSAJE_ERROR_ENVIO;
    } finally {
      enviando.value = false;
    }
  }

  // Volver a la pestaña con el cajón abierto: lo que se ve puede haber
  // cambiado mientras tanto. `document` solo se toca al montar (SSG).
  const alVolver = () => {
    if (!abierto.value || document.visibilityState !== 'visible') return;
    void ocupacion.refetch();
    if (fecha.value) void disponibilidadQuery.refetch();
  };

  onMounted(() => {
    document.addEventListener('visibilitychange', alVolver);
  });

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', alVolver);
  });

  return {
    paso,
    fecha,
    hora,
    estilistaId,
    nombre,
    telefono,
    consentimiento,
    errores,
    enviando,
    errorEnvio,
    aviso,
    resumen,
    lineas,
    cantidad,
    total,
    duracion,
    conSesion,
    cuenta,
    dias,
    estilistas,
    huecos,
    cargandoHuecos,
    errorHuecos,
    cita,
    lineaResumen,
    puedeContinuar,
    continuar,
    atras,
    irACuando,
    elegirFecha,
    elegirHora,
    elegirEstilista,
    quitarServicio,
    reintentarHuecos,
    confirmar,
    elegirOtraHora,
    probarSinPreferencia,
  };
}
