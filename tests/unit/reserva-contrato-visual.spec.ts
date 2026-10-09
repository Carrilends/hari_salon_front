/**
 * Guarda de fuente del cajón de reserva (plan 1 de las vistas). El CSS no
 * existe en Jest, así que los hechos de estilo y de marcado se leen del
 * fuente: solo tokens, marcado llano, foco visible, color al pasar solo con
 * puntero fino, Safari 13.1, y nada de avisos flotantes ni de WhatsApp que se
 * abra solo.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '../../src');
const leer = (ruta: string) => readFileSync(join(SRC, ruta), 'utf8');

const COMPONENTES = [
  'components/reserva/CajonReserva.vue',
  'components/reserva/IndicadorPasos.vue',
  'components/reserva/PasoServicios.vue',
  'components/reserva/PasoCuando.vue',
  'components/reserva/PasoDatos.vue',
  'components/reserva/PantallaExito.vue',
  'components/reserva/TiraDeDias.vue',
  'components/reserva/FichasDeHora.vue',
  'components/reserva/FichasDeEstilista.vue',
  'components/dialogs/bookingDialog.vue',
];

const CODIGO = [
  'components/reserva/tipos.ts',
  'composables/booking/useCajonReserva.ts',
  'composables/booking/enviarReserva.ts',
  'composables/booking/useOcupacionDeLaTira.ts',
  'helpers/reserva-huecos.ts',
  'helpers/reserva-texto.ts',
  'helpers/reserva-envio.ts',
];

const TOKENS = leer('css/tokens.scss');

const estilosDe = (fuente: string) => {
  const desde = fuente.indexOf('<style');
  return desde === -1 ? '' : fuente.slice(desde);
};

const plantillaDe = (fuente: string) => fuente.split('<script')[0];

/** Los estilos sin los bloques de puntero fino (equilibrando llaves). */
const sinPunteroFino = (css: string) => {
  const consulta = '@media (hover: hover) and (pointer: fine)';
  let resto = css;
  let desde = resto.indexOf(consulta);
  while (desde !== -1) {
    let nivel = 0;
    let i = resto.indexOf('{', desde);
    for (; i < resto.length; i += 1) {
      if (resto[i] === '{') nivel += 1;
      if (resto[i] === '}') nivel -= 1;
      if (nivel === 0) break;
    }
    resto = resto.slice(0, desde) + resto.slice(i + 1);
    desde = resto.indexOf(consulta);
  }
  return resto;
};

describe('el cajón de reserva · color', () => {
  it.each(COMPONENTES)('%s no lleva hexadecimales ni rgba sueltos', (ruta) => {
    const fuente = leer(ruta);

    expect(fuente).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(estilosDe(fuente)).not.toMatch(/rgba?\(/);
  });

  it.each(COMPONENTES)('%s solo usa tokens que existen', (ruta) => {
    const usados = Array.from(
      new Set(
        Array.from(leer(ruta).matchAll(/var\(--(m-[\w-]+)\)/g)).map((m) => m[1])
      )
    );

    for (const token of usados) {
      expect(TOKENS).toContain(`--${token}:`);
    }
  });

  it.each(COMPONENTES)(
    '%s no pone el oro claro como texto sobre claro',
    (ruta) => {
      // `color: var(--m-oro)` solo es válido sobre tinta: se permite en la
      // cabecera del cajón, en el indicador de pasos, en el sello del éxito y
      // en lo que ya es tinta macizo (elegidos, botones tinta).
      const PERMITIDOS =
        /(cajon__cuenta|cajon__cerrar|cajon__continuar|pasos__|exito__sello|exito__principal|tira__dia--elegido|cuando__aviso-boton)/;
      const reglas = Array.from(
        estilosDe(leer(ruta)).matchAll(/([^{}]+)\{([^{}]*)\}/g)
      ).filter((r) => /(^|\s|;)color: var\(--m-oro\);/.test(r[2]));

      for (const regla of reglas) {
        expect(regla[1]).toMatch(PERMITIDOS);
      }
    }
  );
});

describe('el cajón de reserva · marcado llano', () => {
  it.each(COMPONENTES)(
    '%s no usa componentes de Quasar salvo q-dialog',
    (ruta) => {
      expect(plantillaDe(leer(ruta))).not.toMatch(/<q-(?!dialog\b)[a-z-]+/);
    }
  );

  it.each([...COMPONENTES, ...CODIGO])(
    '%s no lanza avisos flotantes ni diálogos de Quasar',
    (ruta) => {
      const fuente = leer(ruta);

      expect(fuente).not.toMatch(/\$q\./);
      expect(fuente).not.toMatch(/useQuasar/);
    }
  );

  it.each([...COMPONENTES, ...CODIGO])(
    '%s nunca abre WhatsApp por su cuenta (B5)',
    (ruta) => {
      expect(leer(ruta)).not.toMatch(/window\.open/);
    }
  );

  it.each(COMPONENTES)('%s: cada botón declara su tipo', (ruta) => {
    const botones = plantillaDe(leer(ruta)).match(/<button\b[^>]*>/g) ?? [];

    for (const boton of botones) {
      expect(boton).toMatch(/type="button"/);
    }
  });

  it('el envoltorio no conserva nada de la administración ni del segundo diálogo', () => {
    const envoltorio = leer('components/dialogs/bookingDialog.vue');
    const cajon = leer('components/reserva/CajonReserva.vue');
    const estado = leer('composables/booking/useCajonReserva.ts');

    for (const fuente of [envoltorio, cajon, estado]) {
      expect(fuente).not.toMatch(/fetchAllReservations|deleteReservation/);
      expect(fuente).not.toMatch(/Administración de reservas/);
      expect(fuente).not.toMatch(/q-date|q-time/);
    }
  });
});

describe('el cajón de reserva · accesibilidad y puntero', () => {
  it.each(COMPONENTES.filter((r) => leer(r).includes('<button')))(
    '%s tiene foco visible',
    (ruta) => {
      expect(estilosDe(leer(ruta))).toMatch(/:focus-visible/);
    }
  );

  it.each(COMPONENTES)('%s solo pinta :hover con puntero fino', (ruta) => {
    expect(sinPunteroFino(estilosDe(leer(ruta)))).not.toMatch(/:hover/);
  });

  it('los controles del cajón miden al menos el área táctil', () => {
    for (const ruta of [
      'components/reserva/FichasDeHora.vue',
      'components/reserva/TiraDeDias.vue',
      'components/reserva/PasoServicios.vue',
      'components/reserva/CajonReserva.vue',
    ]) {
      expect(estilosDe(leer(ruta))).toMatch(/var\(--m-tactil-min\)/);
    }
  });
});

describe('el cajón de reserva · Safari 13.1 y SSG', () => {
  it.each(COMPONENTES)('%s no usa inset ni :has()', (ruta) => {
    const estilos = estilosDe(leer(ruta));

    expect(estilos).not.toMatch(/(^|\s|;)inset:/);
    expect(estilos).not.toMatch(/:has\(/);
  });

  it('100dvh solo justo después de un 100vh', () => {
    const estilos = estilosDe(leer('components/reserva/CajonReserva.vue'));

    expect(estilos).toMatch(/height: 100vh;\s*height: 100dvh;/);
    expect(estilos.match(/100dvh/g)).toHaveLength(1);
  });

  it('el cajón no consulta la ventana en setup: usa useConsultaMedios', () => {
    const cajon = leer('components/reserva/CajonReserva.vue');

    expect(cajon).toMatch(/useConsultaMedios\('\(max-width: 699px\)', false\)/);
    expect(cajon).not.toMatch(/matchMedia/);
    expect(cajon).not.toMatch(/useDialogMaximizedBelow/);
  });

  it('el estado solo toca document al montar', () => {
    const estado = leer('composables/booking/useCajonReserva.ts');
    const usos = estado.match(/document\./g) ?? [];

    // addEventListener, removeEventListener y visibilityState: los tres en
    // `onMounted`/`onUnmounted` o en el manejador.
    expect(usos).toHaveLength(3);
    expect(estado).toMatch(
      /onMounted\(\(\) => \{\s*document\.addEventListener/
    );
  });
});

describe('el cajón de reserva · estados nunca solo por color', () => {
  it('las fichas de hora agotadas van tachadas', () => {
    const css = estilosDe(leer('components/reserva/FichasDeHora.vue'));

    expect(css).toMatch(
      /\.horas__ficha:disabled\s*\{[^{}]*text-decoration:\s*line-through;/
    );
  });

  it('los días sin horas llevan el número tachado', () => {
    const css = estilosDe(leer('components/reserva/TiraDeDias.vue'));

    expect(css).toMatch(
      /\.tira__dia:disabled\s+\.tira__numero\s*\{[^{}]*text-decoration:\s*line-through;/
    );
  });
});
