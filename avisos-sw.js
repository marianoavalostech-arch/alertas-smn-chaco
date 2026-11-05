// Ríos y Clima del Chaco: service worker SOLO para mostrar los avisos de alertas del SMN (Firebase Cloud Messaging).
// No intercepta pedidos (no tiene "fetch") ni guarda páginas: el sitio se abre siempre desde internet, como siempre.
// Se registra con un alcance propio (/avisos-sw/) que no cubre ninguna página. No carga código de afuera.
// Lo registra la página solo cuando alguien toca "Avisarme" (y se borra con "Dejar de avisarme").
'use strict';
const SITIO = self.location.origin + '/';

// Llega un aviso: se muestra siempre (también con el sitio abierto). El texto lo arma el script de Google.
self.addEventListener('push', e => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (x) { p = {}; }
  const n = p.notification || {}, d = p.data || {};
  const loc = /^\d{1,2}$/.test(String(d.loc || '')) ? String(d.loc) : '';
  const titulo = String(n.title || 'Alerta del SMN').slice(0, 120);
  e.waitUntil(self.registration.showNotification(titulo, {
    body: String(n.body || 'Tocá para ver qué hacer.').slice(0, 600),
    icon: SITIO + 'iconos/icono-192.png',
    badge: SITIO + 'iconos/badge-96.png',   // ícono blanco de la barra de arriba del teléfono
    // Sin "tag": cada aviso queda aparte en la lista del teléfono. Así un aviso nuevo (por ejemplo, una amarilla por viento
    // para mañana) no tapa a uno anterior que sigue vigente (una naranja por tormentas para hoy). Cada aviso trae solo lo nuevo.
    lang: 'es',
    data: { url: SITIO + (loc ? '?loc=' + loc : '') }
  }));
});

// Al tocar el aviso: abre el sitio (o la app) en esa localidad. Si ya está abierto, lo usa.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const d = e.notification.data || {}, url = typeof d.url === 'string' && d.url.indexOf(SITIO) === 0 ? d.url : SITIO;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(l => {
    const w = l.find(c => c.url.indexOf(SITIO) === 0 && 'navigate' in c);
    if (w) return w.navigate(url).then(c => (c || w).focus()).catch(() => self.clients.openWindow(url));
    return self.clients.openWindow(url);
  }));
});

// Se instala y queda activo enseguida (no hay páginas que cuidar).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
