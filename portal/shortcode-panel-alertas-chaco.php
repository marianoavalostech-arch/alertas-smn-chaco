/**
 * GOBIERNO ABIERTO CHACO
 * Integración del Panel de Alertas v1.1
 *
 * v1.1 (20/10/2026): avisa al panel qué parte se ve de la pantalla
 * ("viewport"), así en la computadora se acomoda como el sitio original,
 * con el menú de la izquierda que acompaña lo que se baja. Al saltar a
 * una sección deja lugar para el encabezado fijo del portal.
 *
 * Shortcode: [panel_alertas_chaco]
 *
 * No incluir <?php en Code Snippets.
 */

if ( ! defined( 'ABSPATH' ) ) {
    return;
}

if ( ! function_exists( 'ga_panel_alertas_chaco_shortcode_v1' ) ) {

    function ga_panel_alertas_chaco_shortcode_v1() {

        static $bridge_registered = false;

        $handle = 'ga-panel-alertas-chaco-bridge';

        // Registrar el JavaScript únicamente cuando se utiliza
        // el shortcode. Se imprime en el pie de la página.
        if ( ! wp_script_is( $handle, 'registered' ) ) {
            wp_register_script(
                $handle,
                false,
                array(),
                '1.0.0',
                true
            );
        }

        wp_enqueue_script( $handle );

        if ( ! $bridge_registered ) {

            $bridge_registered = true;

            $bridge_js = <<<'JS'
(function () {
  'use strict';

  const APP_ORIGIN =
    'https://panel-alertas-chaco.netlify.app';

  const CHANNEL = 'ga-panel-alertas-chaco-v1';

  const FRAME_SELECTOR =
    'iframe[data-ga-panel-alertas-chaco]';

  function getFrames() {
    return document.querySelectorAll(FRAME_SELECTOR);
  }

  // Hasta dónde tapa la pantalla el encabezado fijo del portal.
  function headerBottom() {
    const h = document.querySelector('.elementor-location-header');
    if (!h) return 0;
    const b = h.getBoundingClientRect().bottom;
    return b > 0 ? b : 0;
  }

  // Avisar al panel qué parte de él se ve en la pantalla.
  function sendViewport(frame) {
    if (!frame.contentWindow) return;

    frame.contentWindow.postMessage(
      {
        channel: CHANNEL,
        type: 'viewport',
        top: frame.getBoundingClientRect().top,
        height: window.innerHeight,
        header: headerBottom()
      },
      APP_ORIGIN
    );
  }

  let viewportPending = false;

  function scheduleViewport() {
    if (viewportPending) return;
    viewportPending = true;
    window.requestAnimationFrame(function () {
      viewportPending = false;
      getFrames().forEach(sendViewport);
    });
  }

  window.addEventListener('scroll', scheduleViewport, { passive: true });
  window.addEventListener('resize', scheduleViewport);

  function requestHeight(frame) {
    if (!frame.contentWindow) return;

    frame.contentWindow.postMessage(
      {
        channel: CHANNEL,
        type: 'request-height'
      },
      APP_ORIGIN
    );
  }

  function start() {
    getFrames().forEach(function (frame) {
      frame.addEventListener('load', function () {
        requestHeight(frame);
        sendViewport(frame);
      });

      requestHeight(frame);
      sendViewport(frame);
    });
  }

  // Recibir mensajes exclusivamente de la aplicación.
  window.addEventListener('message', function (event) {

    if (event.origin !== APP_ORIGIN) return;

    const data = event.data;

    if (
      !data ||
      typeof data !== 'object' ||
      data.channel !== CHANNEL
    ) {
      return;
    }

    const frames = getFrames();

    for (const frame of frames) {

      // Comprobar que el mensaje procede de este iframe.
      if (event.source !== frame.contentWindow) continue;

      // Ajustar la altura al contenido real.
      if (data.type === 'height') {

        if (
          typeof data.height !== 'number' ||
          !Number.isFinite(data.height)
        ) {
          return;
        }

        // Validación de seguridad; no es una altura fija.
        if (data.height < 200 || data.height > 60000) {
          return;
        }

        const nextHeight = Math.ceil(data.height);

        const current = Math.round(
          frame.getBoundingClientRect().height
        );

        if (Math.abs(current - nextHeight) >= 2) {
          frame.style.height = nextHeight + 'px';
        }

        scheduleViewport();

        return;
      }

      // Navegación hacia secciones internas de Netlify.
      if (data.type === 'scroll-to') {

        if (
          typeof data.y !== 'number' ||
          !Number.isFinite(data.y)
        ) {
          return;
        }

        const maxY = frame.getBoundingClientRect().height;

        if (data.y < 0 || data.y > maxY + 50) {
          return;
        }

        const pageY =
          window.scrollY +
          frame.getBoundingClientRect().top +
          data.y;

        const header = document.querySelector('.elementor-location-header');
        const offset = (header ? header.offsetHeight : 0) + 12;

        window.scrollTo({
          top: Math.max(0, pageY - offset),
          behavior: 'smooth'
        });

        return;
      }
    }
  });

  if (document.readyState === 'loading') {

    document.addEventListener(
      'DOMContentLoaded',
      start,
      { once: true }
    );

  } else {
    start();
  }

}());
JS;

            wp_add_inline_script(
                $handle,
                $bridge_js,
                'after'
            );
        }

        $frame_id = wp_unique_id( 'ga-panel-alertas-' );

        $src = 'https://panel-alertas-chaco.netlify.app/';

        return sprintf(
            '<div class="ga-panel-alertas-wrapper" ' .
            'style="width:100%%;max-width:100%%;' .
            'min-width:0;margin:0;padding:0;">' .

            '<iframe ' .
            'id="%1$s" ' .
            'data-ga-panel-alertas-chaco="1" ' .
            'src="%2$s" ' .

            'title="Panel interactivo de ríos, clima y ' .
            'alertas de la provincia del Chaco" ' .

            'loading="lazy" ' .

            'referrerpolicy="strict-origin-when-cross-origin" ' .

            'sandbox="allow-scripts allow-same-origin ' .
            'allow-forms allow-popups ' .
            'allow-popups-to-escape-sandbox" ' .

            'allow="clipboard-write; web-share" ' .

            'style="display:block;width:100%%;' .
            'max-width:100%%;height:min(85vh,850px);' .
            'border:0;margin:0;padding:0;"' .

            '></iframe></div>',

            esc_attr( $frame_id ),
            esc_url( $src )
        );
    }

    add_shortcode(
        'panel_alertas_chaco',
        'ga_panel_alertas_chaco_shortcode_v1'
    );
}