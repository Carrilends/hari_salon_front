<template>
  <section
    class="estado-acceso"
    data-test="estado-acceso"
    :data-tono="tono"
    :aria-busy="ocupado ? 'true' : undefined"
    aria-labelledby="estado-acceso-titulo"
  >
    <div
      class="estado-acceso__circulo"
      :class="`estado-acceso__circulo--${tono}`"
      aria-hidden="true"
    >
      <slot name="icono" />
    </div>
    <p
      v-if="antetitulo"
      class="estado-acceso__antetitulo"
      data-test="estado-antetitulo"
    >
      {{ antetitulo }}
    </p>
    <h1
      id="estado-acceso-titulo"
      ref="encabezado"
      class="estado-acceso__titulo"
      tabindex="-1"
    >
      {{ titulo }}
    </h1>
    <div class="estado-acceso__texto"><slot /></div>
    <div v-if="$slots.acciones" class="estado-acceso__acciones">
      <slot name="acciones" />
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Un único estado de pantalla completa para el acceso (decisión A14): «Revisa
 * tu correo», «Este enlace ya no sirve», «Correo confirmado» y «Verificando tu
 * correo…» comparten marco —círculo de 76 px, antetítulo opcional, título en
 * Marcellus, texto y acciones—. Las acciones las pone la página con las clases
 * comunes del armazón (`.acceso-boton`, `.acceso-secundario`).
 */
import { onMounted, ref } from 'vue';

withDefaults(
  defineProps<{
    tono: 'oro' | 'tinta' | 'peligro';
    titulo: string;
    antetitulo?: string;
    ocupado?: boolean;
  }>(),
  { antetitulo: '', ocupado: false }
);

const encabezado = ref<HTMLElement | null>(null);

// El estado sustituye a un formulario: el botón que tenía el foco desaparece y
// el foco caería en <body>. Se lleva al título para que un lector de pantalla
// anuncie la pantalla nueva.
onMounted(() => {
  encabezado.value?.focus();
});
</script>

<style scoped lang="scss">
.estado-acceso {
  width: 100%;
  max-width: 380px;
  margin: auto;
  padding: 24px 8px;
  box-sizing: border-box;
  text-align: center;
  font-family: var(--m-font-sans);
  color: var(--m-tinta);
}

.estado-acceso__circulo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 76px;
  margin: 0 auto 22px;
  box-sizing: border-box;
  border-radius: 50%;
}

.estado-acceso__circulo--oro {
  border: var(--m-filete-grosor) solid var(--m-oro);
  color: var(--m-oro-profundo);
}

/* El oro claro sí es legible aquí: va sobre tinta (5,7:1). */
.estado-acceso__circulo--tinta {
  background: var(--m-tinta);
  color: var(--m-oro);
}

.estado-acceso__circulo--peligro {
  border: var(--m-filete-grosor) solid var(--m-peligro);
  color: var(--m-peligro);
}

.estado-acceso__antetitulo {
  margin: 0 0 10px;
  font-size: 10.5px;
  letter-spacing: var(--m-tracking-etiqueta);
  text-transform: uppercase;
  color: var(--m-oro-profundo);
}

.estado-acceso__titulo {
  margin: 0 0 12px;
  font-family: var(--m-font-display);
  font-size: 28px;
  font-weight: 400;
  line-height: 1.15;
  color: var(--m-tinta);
}

/* Foco programático (tabindex="-1"): no se alcanza con el teclado. */
.estado-acceso__titulo:focus {
  outline: none;
}

.estado-acceso__texto {
  margin: 0 0 26px;
  font-size: 14px;
  line-height: 1.65;
  color: var(--m-piedra);
}

.estado-acceso__texto :slotted(p) {
  margin: 0;
}

.estado-acceso__texto :slotted(strong) {
  font-weight: 500;
  color: var(--m-tinta);
}

.estado-acceso__acciones {
  display: flex;
  flex-direction: column;
  align-items: stretch;
}
</style>
