/**
 * El texto legal de la política (S4: «el texto legal no cambia»), copiado del
 * `PrivacyPolicyPage.vue` vigente el 2026-10-09 —versión 1.1—, sin etiquetas y
 * con los espacios colapsados. Cada pieza es un `<p>` o un `<li>` de las
 * secciones, en orden. La versión 1.2 (2026-10-10) solo corrigió el teléfono.
 * La 1.5 (2026-10-28) añade la eliminación de la cuenta desde «Mi cuenta» en los derechos del titular: qué se borra, qué se conserva, la gestión de la cita por WhatsApp y que nadie usa los datos para otra finalidad sin autorización expresa.
 * La 1.4 (2026-10-28) añade a Cloudinary, Netlify y Railway, cambia «transferencia» por «transmisión», quita el Decreto 587 de 2016 y deja de prometer avisos por correo a la clienta. La 1.3 (plan 06, F7) dice que el asistente contesta también en la línea de
 * WhatsApp del negocio: qué ven Meta y Gemini, y que el teléfono de contacto
 * del responsable ya no es el de WhatsApp.
 *
 * Aquí se fija la forma del teléfono, no sus dígitos: que sea el de
 * `SALON_PHONE` lo fija `PrivacyPolicyPage.spec.ts`. Si la política cambia de
 * verdad, este fichero cambia con ella.
 */
export type PiezaLegal = { etiqueta: 'p' | 'li'; texto: string | RegExp };

export const TITULOS_SECCIONES = [
  'Responsable del tratamiento',
  'Marco legal aplicable',
  'Datos que se recolectan',
  'Finalidades del tratamiento',
  'Encargados del tratamiento y transmisión internacional',
  'Derechos del titular',
  'Ejercicio de los derechos',
  'Medidas de seguridad',
  'Consentimiento informado',
  'Vigencia',
];

export const TEXTO_LEGAL: PiezaLegal[] = [
  {
    etiqueta: 'p',
    texto:
      'Peluquería Marlene, establecimiento de servicios de belleza ubicado en Carrera 3 #1-18, Sopó, Cundinamarca (Colombia), actúa como responsable del tratamiento de los datos personales recolectados a través de este portal web.',
  },
  { etiqueta: 'li', texto: 'NIT: 35413608' },
  { etiqueta: 'li', texto: 'Correo electrónico: lcarrionalvarez@gmail.com' },
  { etiqueta: 'li', texto: /^Teléfono: \+57 \d{3} \d{3} \d{4}$/ },
  {
    etiqueta: 'p',
    texto:
      'A través de estos canales el titular puede presentar consultas y reclamos para ejercer sus derechos sobre sus datos personales.',
  },
  {
    etiqueta: 'p',
    texto:
      'Esta política se rige por la Constitución Política de Colombia, la Ley 1581 de 2012 (Régimen General de Protección de Datos Personales), el Decreto 1377 de 2013 y demás normas concordantes.',
  },
  {
    etiqueta: 'p',
    texto:
      'Durante el registro y uso del portal, Peluquería Marlene recolecta los siguientes datos personales del titular:',
  },
  { etiqueta: 'li', texto: 'Nombre completo.' },
  { etiqueta: 'li', texto: 'Correo electrónico.' },
  {
    etiqueta: 'li',
    texto: 'Credenciales de acceso (contraseña, almacenada de forma cifrada).',
  },
  {
    etiqueta: 'li',
    texto:
      'Número de teléfono, solo si el titular lo aporta al reservar, para recibir los avisos de su cita por WhatsApp, o el número desde el que escribe a la línea de WhatsApp del negocio.',
  },
  {
    etiqueta: 'li',
    texto:
      'El texto de la conversación, si el titular decide usar el asistente, en el portal o en la línea de WhatsApp del negocio.',
  },
  {
    etiqueta: 'p',
    texto:
      'Adicionalmente, cuando el titular agenda una reserva, se procesan datos asociados a la cita (servicios, fecha y hora), los cuales se comunican al establecimiento a través del canal de WhatsApp del negocio para su confirmación.',
  },
  {
    etiqueta: 'p',
    texto: 'Los datos personales se utilizan para las siguientes finalidades:',
  },
  {
    etiqueta: 'li',
    texto:
      'Crear, autenticar y administrar la cuenta del usuario en el portal.',
  },
  {
    etiqueta: 'li',
    texto:
      'Permitir la gestión del perfil personal (actualización de nombre, correo electrónico y contraseña).',
  },
  {
    etiqueta: 'li',
    texto:
      'Asociar al usuario las reseñas que publique voluntariamente en la sección de testimonios.',
  },
  {
    etiqueta: 'li',
    texto:
      'Facilitar la coordinación de reservas a través del canal oficial de WhatsApp del establecimiento.',
  },
  {
    etiqueta: 'li',
    texto:
      'Enviar al titular los avisos de su cita —creación, cambio de hora, cancelación y confirmación— por WhatsApp, si aportó su teléfono. Por correo electrónico solo recibe la verificación de su cuenta y el restablecimiento de su contraseña.',
  },
  {
    etiqueta: 'li',
    texto:
      'Atender sus consultas sobre servicios, disponibilidad y reservas a través del asistente, en el portal o en la línea de WhatsApp del negocio, cuyo uso es voluntario.',
  },
  {
    etiqueta: 'li',
    texto:
      'Si el titular pide hablar con una persona en la línea de WhatsApp del negocio, y solo entonces, avisar a la responsable por WhatsApp con su nombre, su número y el motivo, para que lo contacte.',
  },
  {
    etiqueta: 'li',
    texto:
      'Cumplir con las obligaciones legales, contables y contractuales aplicables al negocio.',
  },
  {
    etiqueta: 'p',
    texto:
      'Para operar el portal, Peluquería Marlene se apoya en proveedores que tratan datos personales por cuenta y según las instrucciones del establecimiento, y no para finalidades propias. Varios de ellos están ubicados fuera de Colombia, de modo que existe una transmisión internacional de datos en los términos de la Ley 1581 de 2012 y del Decreto 1377 de 2013. Cada uno recibe únicamente lo imprescindible para su función:',
  },
  {
    etiqueta: 'li',
    texto:
      'Google — inicio de sesión con Google. Si el titular elige ese acceso, Google recibe su solicitud y devuelve su nombre, su correo y el identificador de su cuenta. El portal no le envía reservas ni historial.',
  },
  {
    etiqueta: 'li',
    texto:
      'Resend — correo transaccional. Recibe la dirección de correo para enviar la verificación de la cuenta y el restablecimiento de contraseña, y a la propietaria los avisos de las reservas (nueva, cambio de hora, cancelación y confirmación), con la fecha, el servicio, la estilista y el nombre y teléfono de quien reservó. A la clienta no le envía avisos de la cita.',
  },
  {
    etiqueta: 'li',
    texto:
      'Meta — mensajería por la API de WhatsApp Business. Recibe el número de teléfono y el contenido de los avisos de la cita: fecha, estilista y servicios. Si el titular escribe a la línea de WhatsApp del negocio, Meta transporta también esa conversación y, si pide hablar con una persona, el aviso a la responsable con su nombre, su número y el motivo. Los avisos de la cita no llevan el precio ni datos de terceros.',
  },
  {
    etiqueta: 'li',
    texto:
      'Google (Gemini) — proveedor del asistente conversacional. Recibe el texto de la conversación de quien habla con el asistente, en el portal o en la línea de WhatsApp del negocio, para redactar la respuesta. El portal no le envía el número desde el que se escribe.',
  },
  {
    etiqueta: 'li',
    texto:
      'TypeSafe — verificación de la reserva antes de crearla, para que el asistente no agende algo distinto de lo que se pidió. Recibe los últimos mensajes de la conversación y los nombres de los servicios con el día y la hora propuestos. No recibe el nombre del titular, ni su teléfono, ni el identificador de su cuenta, ni el identificador de su reserva.',
  },
  {
    etiqueta: 'li',
    texto:
      'Cloudinary — imágenes del catálogo. Guarda las fotos de los servicios y de las estilistas que sube la propietaria desde el panel de administración. No recibe datos de la clientela.',
  },
  {
    etiqueta: 'li',
    texto:
      'Netlify — alojamiento del portal. Sirve el sitio web al navegador de quien lo visita.',
  },
  {
    etiqueta: 'li',
    texto:
      'Railway — alojamiento de la API y de la base de datos, donde se guardan las cuentas y las reservas.',
  },
  {
    etiqueta: 'p',
    texto:
      'Estos proveedores están también ubicados fuera de Colombia y actúan como custodios: no emplean la información para ninguna finalidad propia.',
  },
  {
    etiqueta: 'p',
    texto:
      'El uso del asistente conversacional es voluntario: el titular puede reservar por el formulario del portal sin conversar con él. Quien escribe a la línea de WhatsApp del negocio conversa con el asistente. En los dos canales, la primera respuesta advierte de que se trata de un sistema automático y de que el mensaje se procesa con un proveedor ubicado fuera del país.',
  },
  {
    etiqueta: 'p',
    texto:
      'Conforme a la Ley 1581 de 2012 y al Decreto 1377 de 2013, el titular de los datos personales tiene derecho a:',
  },
  {
    etiqueta: 'li',
    texto:
      'Conocer los datos personales que sobre él reposan en el portal, así como sus finalidades.',
  },
  {
    etiqueta: 'li',
    texto:
      'Actualizar y rectificar los datos que sean parciales, inexactos, incompletos o induzcan a error.',
  },
  {
    etiqueta: 'li',
    texto:
      'Suprimir los datos tratados y revocar la autorización otorgada cuando no se respeten los principios, derechos y garantías constitucionales y legales.',
  },
  {
    etiqueta: 'li',
    texto: 'Solicitar prueba de la autorización otorgada para el tratamiento.',
  },
  {
    etiqueta: 'li',
    texto:
      'Presentar quejas ante la Superintendencia de Industria y Comercio (SIC) por infracciones al régimen de protección de datos.',
  },
  {
    etiqueta: 'p',
    texto:
      'La cuenta se puede eliminar desde «Mi cuenta», en la sección «Cerrar sesión», confirmando con la contraseña o, si se creó con Google, con el correo. Al eliminarla:',
  },
  {
    etiqueta: 'li',
    texto:
      'Se borran la cuenta, el acceso, las sesiones abiertas y las conversaciones con el asistente.',
  },
  {
    etiqueta: 'li',
    texto:
      'Se conservan las citas vigentes, con el nombre y un contacto, hasta que se cumplan o se cancelen; después, el historial hasta su borrado automático. Las reseñas se conservan sin el nombre.',
  },
  {
    etiqueta: 'p',
    texto:
      'Eliminar la cuenta no cancela las citas vigentes: para cambiarlas o cancelarlas después, el titular escribe al WhatsApp del salón. Ni el responsable ni los encargados del tratamiento usan estos datos para una finalidad distinta sin autorización expresa del titular.',
  },
  {
    etiqueta: 'p',
    texto:
      'Para ejercer los derechos descritos, el titular puede comunicarse con Peluquería Marlene a través del canal de contacto indicado en la sección 1. La respuesta a las consultas se dará en los términos y plazos establecidos por la ley.',
  },
  {
    etiqueta: 'p',
    texto:
      'Peluquería Marlene implementa medidas técnicas y administrativas razonables para proteger la confidencialidad, integridad y disponibilidad de los datos personales. En particular, las contraseñas se almacenan cifradas con algoritmos de hashing estándar y las sesiones se gestionan mediante tokens firmados.',
  },
  {
    etiqueta: 'p',
    texto:
      'El tratamiento de los datos personales recolectados a través del formulario de registro requiere la autorización previa, expresa e informada del titular, manifestada mediante una casilla de aceptación no premarcada. Sin este consentimiento, el portal no permite completar el registro.',
  },
  {
    etiqueta: 'p',
    texto:
      'La presente política se encuentra vigente desde la fecha indicada al inicio del documento y podrá actualizarse cuando los cambios normativos o funcionales del portal lo requieran. Las modificaciones se comunicarán a través de este mismo portal.',
  },
];
