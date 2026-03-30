<template>
  <q-dialog
    v-model="dialog"
    :maximized="maximized"
    :transition-show="maximized ? 'slide-up' : 'scale'"
    :transition-hide="maximized ? 'slide-down' : 'scale'"
  >
    <q-card
      class="contact-dialog relative-position"
      :class="{ 'contact-dialog--maximized': maximized }"
      flat
      bordered
    >
      <q-btn
        v-close-popup
        class="contact-dialog__close"
        icon="close"
        flat
        round
        dense
        color="grey-7"
        aria-label="Cerrar"
      />

      <q-card-section class="contact-dialog__schedule">
        <div class="schedule-layout">
          <div class="schedule-layout__img">
            <q-img
              src="src/assets/places/hair_salon.jpg"
              :ratio="4 / 3"
              fit="cover"
              class="schedule-img rounded-borders"
              spinner-color="primary"
              spinner-size="28px"
            />
          </div>
          <div class="schedule-layout__content">
            <div class="schedule-title">Horarios de atención</div>
            <div class="schedule-block">
              <div class="schedule-block__label">Lunes a viernes</div>
              <div class="schedule-block__hours">8:00 a. m. – 9:00 p. m.</div>
            </div>
            <div class="schedule-block">
              <div class="schedule-block__label">
                Sábado, domingo y festivos
              </div>
              <div class="schedule-block__hours">9:00 a. m. – 7:00 p. m.</div>
            </div>
          </div>
        </div>
      </q-card-section>

      <q-separator class="contact-dialog__sep" />

      <q-card-section class="contact-dialog__footer">
        <div class="footer-title">Contáctanos</div>
        <p class="footer-tagline">
          Peluquería Pecas está a tu servicio
        </p>
        <div class="contact-row">
          <a class="contact-phone" href="tel:+573208977471">
            +57 320 897 74 71
          </a>
          <q-btn
            class="whatsapp-btn"
            tag="a"
            href="https://wa.me/573208977471"
            target="_blank"
            rel="noopener noreferrer"
            round
            unelevated
            color="positive"
            icon="lab la-whatsapp"
            size="md"
            aria-label="Abrir WhatsApp"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import {
  DialogEmits,
  useDialog,
} from 'src/composables/dialogs/useDialogService';
import { useDialogMaximizedBelow } from 'src/composables/dialogs/useDialogMaximizedBelow';

const props = defineProps<{ dialog: boolean }>();
const emit = defineEmits<DialogEmits>();

const { dialog } = useDialog(props, emit);
const { maximized } = useDialogMaximizedBelow();

defineOptions({
  name: 'ourContact',
});
</script>

<style scoped lang="scss">
.contact-dialog {
  width: min(100%, 520px);
  max-height: min(90vh, 640px);
  overflow: auto;
  border-radius: 20px;
  background: #fdfaf8;
  border-color: rgba(61, 61, 61, 0.08);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

.contact-dialog__close {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
}

.contact-dialog__schedule {
  padding: 2.25rem 1.5rem 1.5rem;
}

.schedule-layout {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1.25rem 1.5rem;
}

.schedule-layout__img {
  flex: 1 1 140px;
  max-width: 220px;
  min-width: 120px;
}

.schedule-img {
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
}

.schedule-layout__content {
  flex: 1 1 200px;
  min-width: 0;
}

.schedule-title {
  font-size: 1.125rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #3d3d3d;
  margin-bottom: 1.125rem;
  line-height: 1.35;
}

.schedule-block {
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
}

.schedule-block__label {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8a8580;
  margin-bottom: 0.25rem;
}

.schedule-block__hours {
  font-size: 1rem;
  font-weight: 600;
  color: #c2185b;
  line-height: 1.45;
}

.contact-dialog__sep {
  background: rgba(61, 61, 61, 0.08);
}

.contact-dialog__footer {
  padding: 1.25rem 1.5rem 1.5rem;
  background: linear-gradient(
    165deg,
    #f8f4f6 0%,
    #f0e8ec 55%,
    #e8dfe5 100%
  );
}

.footer-title {
  font-size: 1rem;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 0.35rem;
}

.footer-tagline {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #5c5652;
}

.contact-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
}

.contact-phone {
  font-size: 1.125rem;
  font-weight: 600;
  color: #2c2c2c;
  text-decoration: none;
  letter-spacing: 0.02em;
  transition: color 0.2s ease;

  &:hover {
    color: #ad1457;
  }
}

.whatsapp-btn {
  box-shadow: 0 2px 10px rgba(37, 211, 102, 0.35);
}

.contact-dialog--maximized {
  width: 100%;
  max-width: 100%;
  height: 100%;
  min-height: 100%;
  max-height: none;
  border-radius: 0;
  display: flex;
  flex-direction: column;
  box-shadow: none;
  overflow: hidden;

  .contact-dialog__schedule {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .contact-dialog__footer {
    flex-shrink: 0;
  }
}
</style>
