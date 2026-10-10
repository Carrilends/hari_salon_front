<template>
  <q-page class="pagina-404" data-test="pagina-404">
    <div class="pagina-404__cuerpo">
      <p class="pagina-404__antetitulo">
        <span>Error 404</span>
        <span class="pagina-404__filete" aria-hidden="true" />
      </p>
      <h1 class="pagina-404__titulo">Esta página no existe</h1>
      <p class="pagina-404__texto">
        El enlace puede estar mal escrito o la página se movió.
        <span class="pagina-404__texto-largo">
          Estos caminos sí llevan a algún sitio:
        </span>
      </p>
      <router-link to="/" class="pagina-404__inicio" data-test="ir-al-inicio">
        o vuelve al inicio →
      </router-link>

      <ul class="pagina-404__atajos">
        <li class="pagina-404__hueco">
          <router-link
            to="/services"
            class="pagina-404__atajo pagina-404__atajo--enlace m-tarjeta-pulsable"
            data-test="atajo-servicios"
          >
            <StrokeIcon class="pagina-404__icono" nombre="tijeras" :tamano="26" />
            <span class="pagina-404__atajo-cuerpo">
              <span class="pagina-404__atajo-titulo">Servicios</span>
              <span class="pagina-404__atajo-texto pagina-404__atajo-texto--largo">
                La carta completa: cortes, color, uñas y barbería, con sus precios.
              </span>
              <span class="pagina-404__atajo-texto pagina-404__atajo-texto--corto">
                La carta y sus precios
              </span>
            </span>
            <span class="pagina-404__ir" aria-hidden="true">
              <span class="pagina-404__ir-texto">Ir&nbsp;</span>→
            </span>
          </router-link>
        </li>
        <li class="pagina-404__hueco">
          <router-link
            to="/preguntas-frecuentes"
            class="pagina-404__atajo pagina-404__atajo--enlace m-tarjeta-pulsable"
            data-test="atajo-preguntas"
          >
            <StrokeIcon class="pagina-404__icono" nombre="ayuda" :tamano="26" />
            <span class="pagina-404__atajo-cuerpo">
              <span class="pagina-404__atajo-titulo">Preguntas frecuentes</span>
              <span class="pagina-404__atajo-texto pagina-404__atajo-texto--largo">
                Cómo reservar, cambiar una cita, los avisos y el horario.
              </span>
              <span class="pagina-404__atajo-texto pagina-404__atajo-texto--corto">
                Reservas, cambios y avisos
              </span>
            </span>
            <span class="pagina-404__ir" aria-hidden="true">
              <span class="pagina-404__ir-texto">Ir&nbsp;</span>→
            </span>
          </router-link>
        </li>
        <li class="pagina-404__hueco">
          <div
            class="pagina-404__atajo pagina-404__atajo--whatsapp"
            data-test="atajo-whatsapp"
          >
            <StrokeIcon class="pagina-404__icono" nombre="whatsapp" :tamano="26" />
            <span class="pagina-404__atajo-cuerpo">
              <span class="pagina-404__atajo-titulo">¿Buscabas algo concreto?</span>
              <span class="pagina-404__atajo-texto">
                Pregúntanos y te respondemos desde el salón.
              </span>
            </span>
            <a
              class="pagina-404__whatsapp m-boton"
              data-test="whatsapp-404"
              :href="enlaceWhatsApp"
              target="_blank"
              rel="noopener noreferrer"
            >
              <StrokeIcon nombre="whatsapp" :tamano="20" />
              Escríbenos por WhatsApp
            </a>
          </div>
        </li>
      </ul>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import StrokeIcon from 'src/components/shared/StrokeIcon.vue';
import { useSeo } from 'src/composables/seo/useSeo';
import { WHATSAPP_PHONE } from 'src/constants/whatsapp-phone';
import { buildWhatsAppUrl } from 'src/helpers/whatsappBooking';

/**
 * La 404 (R3, tablero Error404B): vive dentro de `MainLayout`, así que lleva
 * la cabecera del portal (con su único «Reservar»). Tres atajos —Servicios,
 * Preguntas frecuentes y WhatsApp— en todos los anchos: la barra fija con
 * WhatsApp solo existe en el inicio. `noindex` y sin canónica.
 */
defineOptions({ name: 'ErrorNotFound' });

const MENSAJE_WHATSAPP =
  'Hola, estaba en el portal de la Peluquería Marlene y no encontré lo que buscaba.';

const enlaceWhatsApp = buildWhatsAppUrl(WHATSAPP_PHONE, MENSAJE_WHATSAPP);

useSeo({
  title: 'Página no encontrada | Peluquería Marlene',
  description:
    'Esta página no existe. Desde aquí puedes ir a los servicios, a las preguntas frecuentes o escribir al salón.',
  noindex: true,
});
</script>

<style scoped lang="scss">
/**
 * Tablero Error404B: tinta de arriba abajo (la página tapa la foto de fondo
 * del armazón), antetítulo en oro con su filete, titular en Marcellus y tres
 * tarjetas de carbón con filete de oro. El rosa del enlace al inicio es el
 * único acento; el verde de WhatsApp es la excepción de marca de siempre.
 */
.pagina-404 {
  background: var(--m-tinta);
  color: var(--m-hueso);
  font-family: var(--m-font-sans);
}

.pagina-404__cuerpo {
  box-sizing: border-box;
  max-width: 1280px;
  margin: 0 auto;
  /* Abajo, sitio para el flotante del asistente. */
  padding: 84px 96px calc(48px + var(--m-flotante-despeje));
}

.pagina-404__antetitulo {
  display: flex;
  align-items: baseline;
  gap: 18px;
  margin: 0 0 18px;
  font-size: 11px;
  letter-spacing: var(--m-tracking-marca);
  text-transform: uppercase;
  color: var(--m-oro);
}

.pagina-404__filete {
  flex: 1 1 auto;
  height: var(--m-filete-grosor);
  background: var(--m-filete-oscuro);
}

.pagina-404__titulo {
  margin: 0 0 14px;
  font-family: var(--m-font-display);
  font-size: 58px;
  font-weight: 400;
  line-height: 1.05;
}

.pagina-404__texto {
  max-width: 600px;
  margin: 0 0 18px;
  font-size: 16px;
  line-height: 1.7;
  color: var(--m-piedra-clara);
}

.pagina-404__inicio {
  display: inline-flex;
  align-items: center;
  min-height: var(--m-tactil-min);
  margin-bottom: 34px;
  font-size: 14.5px;
  color: var(--m-rosa);
  text-decoration: none;
  border-bottom: var(--m-filete-grosor) solid var(--m-filete-rosa-oscuro);
}

.pagina-404__atajos {
  display: flex;
  gap: 22px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pagina-404__hueco {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
}

.pagina-404__atajo {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 12px;
  box-sizing: border-box;
  min-height: 290px;
  padding: 26px 26px 24px;
  background: var(--m-carbon);
  border: var(--m-filete-grosor) solid var(--m-filete-oscuro);
  border-radius: var(--m-radio-tarjeta);
  color: var(--m-hueso);
  text-decoration: none;
}

.pagina-404__icono {
  flex: 0 0 auto;
  color: var(--m-oro);
}

.pagina-404__atajo-cuerpo {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pagina-404__atajo-titulo {
  font-family: var(--m-font-display);
  font-size: 22px;
  color: var(--m-hueso);
}

.pagina-404__atajo-texto {
  display: block;
  font-size: 14px;
  line-height: 1.6;
  color: var(--m-piedra-clara);
}

.pagina-404__atajo-texto--corto {
  display: none;
}

/* Oro sobre carbón: 4,75:1 (medido). */
.pagina-404__ir {
  margin-top: auto;
  font-size: 11.5px;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  color: var(--m-oro);
}

.pagina-404__whatsapp {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  margin-top: auto;
  border-radius: var(--m-radio-pildora);
  background: var(--m-whatsapp);
  color: var(--m-whatsapp-texto);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: var(--m-tracking-nav);
  text-transform: uppercase;
  text-decoration: none;
}

.pagina-404__inicio:focus-visible,
.pagina-404__atajo--enlace:focus-visible,
.pagina-404__whatsapp:focus-visible {
  outline: 2px solid var(--m-hueso);
  outline-offset: 3px;
}

/* Por debajo de 900 px tres columnas no caben: filas, como en el móvil. */
@media (max-width: 899px) {
  .pagina-404__atajos {
    flex-direction: column;
    gap: 10px;
  }

  .pagina-404__atajo {
    flex-direction: row;
    align-items: center;
    gap: 14px;
    min-height: 76px;
    padding: 14px 16px;
  }

  .pagina-404__atajo-cuerpo {
    flex: 1 1 auto;
    gap: 2px;
  }

  .pagina-404__atajo-titulo {
    font-size: 18px;
  }

  .pagina-404__atajo-texto {
    font-size: 12.5px;
    line-height: 1.5;
  }

  .pagina-404__atajo-texto--largo {
    display: none;
  }

  .pagina-404__atajo-texto--corto {
    display: block;
  }

  .pagina-404__ir {
    margin-top: 0;
  }

  .pagina-404__ir-texto {
    display: none;
  }

  .pagina-404__atajo--whatsapp {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
}

@media (max-width: 699px) {
  .pagina-404__cuerpo {
    padding: 30px var(--m-banda-margen-movil)
      calc(32px + var(--m-flotante-despeje));
  }

  .pagina-404__antetitulo {
    font-size: 10px;
    margin-bottom: 12px;
  }

  .pagina-404__titulo {
    margin-bottom: 10px;
    font-size: 34px;
    line-height: 1.08;
  }

  .pagina-404__texto {
    margin-bottom: 8px;
    font-size: 14.5px;
    line-height: 1.65;
  }

  .pagina-404__texto-largo {
    display: none;
  }

  .pagina-404__inicio {
    margin-bottom: 18px;
  }
}

/**
 * Realce al pasar (solo puntero fino): el COLOR. El hundido de las tarjetas lo
 * da `.m-tarjeta-pulsable`; el del verde, `.m-boton` (`app.scss`).
 */
@media (hover: hover) and (pointer: fine) {
  .pagina-404__atajo--enlace:hover {
    border-color: var(--m-oro);
  }

  .pagina-404__inicio:hover {
    border-bottom-color: var(--m-rosa);
  }

  .pagina-404__whatsapp:hover {
    background: var(--m-whatsapp-realce);
  }
}
</style>
