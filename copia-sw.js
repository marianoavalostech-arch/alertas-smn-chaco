// Ríos y Clima del Chaco: copia guardada del sitio para cuando no se puede conectar (18/11/2026).
// Siempre pide primero la página a internet: con conexión se ve la última versión, como siempre, y se guarda una copia.
// Solo si internet falla o no contesta en 8 segundos, muestra la copia guardada en el teléfono, marcada para que la página
// ponga arriba la franja "Sin conexión con el sitio". No toca los datos (vienen de GitHub y la página guarda lo último bueno)
// ni nada de otros sitios: solo la página y sus letras e íconos. Es aparte del de los avisos (avisos-sw.js).
// Para apagarlo: reemplazar este archivo por uno que borre las copias y se dé de baja (ver README, "Copia guardada").
'use strict';
const CACHE = 'rios-copia-1', ESPERA = 8000;
const BASE = ['/', '/fuentes/manrope-wght.woff2', '/fuentes/kanit-700.woff2', '/icono.svg', '/manifest.webmanifest'];
const ARCHIVO = p => p === '/icono.svg' || p === '/manifest.webmanifest' || /^\/(fuentes|iconos)\/[\w.-]+$/.test(p);

// Guarda una respuesta con la hora en que llegó (sin las cabeceras de tamaño y compresión, que ya no valen).
async function guardar(c, clave, r) {
  const h = new Headers(r.headers);
  h.delete('content-length'); h.delete('content-encoding');
  h.set('x-guardada', new Date().toISOString());
  await c.put(clave, new Response(await r.blob(), { status: 200, statusText: 'OK', headers: h }));
}

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => Promise.all(BASE.map(u =>
  fetch(u, { cache: 'no-cache' }).then(r => r.ok && r.type === 'basic' ? guardar(c, u, r) : null).catch(() => null)))).then(() => self.skipWaiting())));

self.addEventListener('activate', e => e.waitUntil(caches.keys()
  .then(l => Promise.all(l.filter(n => n.indexOf('rios-copia-') === 0 && n !== CACHE).map(n => caches.delete(n))))
  .then(() => self.clients.claim())));

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== self.location.origin) return;            // datos, contador y todo lo de afuera: como siempre
  if (r.mode === 'navigate') e.respondWith(pagina(e, u));
  else if (ARCHIVO(u.pathname)) e.respondWith(archivo(e, u));
});

// La página: primero internet; si falla o tarda más de 8 segundos, la copia guardada (si hay).
async function pagina(e, u) {
  const clave = u.pathname === '/index.html' ? '/' : u.pathname;
  let guardando = null;                                     // la copia se guarda aparte: la página llega sin esperarla
  const red = fetch(e.request).then(r => {
    if (r.ok && r.type === 'basic' && /text\/html/.test(r.headers.get('content-type') || '')) {
      const k = r.clone(); guardando = caches.open(CACHE).then(c => guardar(c, clave, k));
    }
    return r;
  });
  e.waitUntil(red.then(() => guardando).catch(() => null));
  let t;
  const tarde = new Promise(ok => { t = setTimeout(ok, ESPERA, null); });
  let r = null;
  try { r = await Promise.race([red, tarde]); } catch (x) { r = null; }
  clearTimeout(t);
  if (r && r.status < 500 && r.status !== 429) return r;   // 429: el límite de pedidos de Netlify (netlify.toml); se muestra la copia
  const copia = await copiaDe(clave);
  if (copia) return copia;
  return r || red;                                          // sin copia: lo de siempre (esperar o el aviso del navegador)
}

// La copia, con la hora en que se guardó en <body data-copia="…"> para que la página muestre la franja.
async function copiaDe(clave) {
  const c = await caches.open(CACHE), res = await c.match(clave);
  if (!res) return null;
  const g = String(res.headers.get('x-guardada') || '').replace(/[^\dTZ:.-]/g, '');
  const txt = (await res.text()).replace('<body>', '<body data-copia="' + g + '">');
  return new Response(txt, { status: 200, statusText: 'OK', headers: res.headers });
}

// Letras, íconos y el archivo de instalación: salen de la copia al instante (cambian muy poco) y se renuevan de fondo.
// Así, con internet colgado, no frenan la página. Si todavía no hay copia, de internet.
async function archivo(e, u) {
  const c = await caches.open(CACHE), g = await c.match(u.pathname);
  const red = fetch(e.request).then(async res => {
    if (res.ok && res.type === 'basic') await guardar(c, u.pathname, res.clone());
    return res;
  });
  if (g) { e.waitUntil(red.catch(() => null)); return g; }
  return red;
}
