// Renueva alertas-smn.json con las alertas oficiales del SMN para el Chaco.
// Abre la página del SMN con un navegador, toma el token que la página guarda y pide las alertas de cada zona.
// Si el SMN bloquea el acceso, termina con error y deja el archivo anterior sin tocar.
const { chromium } = require('playwright');
const fs = require('fs');

const ARCHIVO = 'alertas-smn.json';
// Zona de alertas del SMN de cada municipio, en el mismo orden que GEO.mun en index.html.
const AREAS = [793,792,792,793,793,793,793,793,793,793,792,793,792,793,791,793,793,793,794,793,792,794,793,793,793,793,792,793,792,791,793,793,792,792,793,792,792,793,792,793,793,792,791,793,792,792,794,794,793,793,793,791,793,793,793,792,817,792,792,793,792,793,793,793,794,791,793,793,791];
const API = 'https://ws1.smn.gob.ar/v1';

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    locale: 'es-AR', timezoneId: 'America/Argentina/Buenos_Aires', viewport: { width: 1366, height: 768 },
  });
  await ctx.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => undefined }); });
  const page = await ctx.newPage();

  let status = 0;
  try {
    const r = await page.goto('https://www.smn.gob.ar/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    status = r ? r.status() : 0;
  } catch (e) { console.error('No se pudo abrir la página del SMN:', e.message); }

  let token = null, titulo = '';
  for (let i = 0; i < 30 && !token; i++) {
    try { titulo = await page.title(); token = await page.evaluate(() => { try { return localStorage.getItem('token'); } catch (e) { return null; } }); } catch (e) {}
    if (!token) await page.waitForTimeout(2000);
  }
  console.log('Respuesta del SMN:', status, '| título:', titulo);
  if (!token) {
    await browser.close();
    console.error(/just a moment|attention required|cloudflare|un momento/i.test(titulo)
      ? 'BLOQUEADO: el SMN (Cloudflare) no dejó pasar a este navegador.'
      : 'La página cargó pero no entregó el token.');
    process.exit(1);
  }

  // Los pedidos se hacen desde la propia página del SMN, igual que lo hace su mapa de alertas.
  const zonas = [...new Set(AREAS)];
  const res = await page.evaluate(async ({ API, zonas, token }) => {
    const out = {};
    for (const z of zonas) {
      const r = await fetch(API + '/warning/alert/area/' + z, { headers: { Authorization: 'JWT ' + token, Accept: 'application/json' } });
      out[z] = r.ok ? await r.json() : { error: r.status };
    }
    return out;
  }, { API, zonas, token });
  await browser.close();

  const alertas = {}, fechas = new Set(); let emitido = null;
  for (const z of zonas) {
    const j = res[z];
    if (!j || j.error || !Array.isArray(j.warnings)) { console.error('La zona', z, 'no respondió bien:', JSON.stringify(j).slice(0, 200)); process.exit(1); }
    if (!emitido || new Date(j.updated) > new Date(emitido)) emitido = j.updated;
    alertas[z] = [];
    for (const w of j.warnings) {
      fechas.add(w.date);
      for (const e of w.events) {
        if (e.max_level >= 3) { const l = e.levels || {}; alertas[z].push([w.date, e.id, l.early_morning || 0, l.morning || 0, l.afternoon || 0, l.night || 0]); }
      }
    }
  }
  if (!emitido || !fechas.size) { console.error('El SMN respondió sin fechas ni informe.'); process.exit(1); }

  const nuevo = { emitido, capturado: new Date().toISOString().slice(0, 16) + ':00Z', fechas: [...fechas].sort(), areas: AREAS, alertas };
  let viejo = null; try { viejo = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); } catch (e) {}
  const igual = viejo && viejo.emitido === nuevo.emitido && JSON.stringify(viejo.alertas) === JSON.stringify(nuevo.alertas) && JSON.stringify(viejo.fechas) === JSON.stringify(nuevo.fechas);
  if (igual) { console.log('Sin cambios: el informe del SMN sigue siendo el del', emitido); return; }
  fs.writeFileSync(ARCHIVO, JSON.stringify(nuevo));
  console.log('Guardado: informe del', emitido, '| zonas con alerta:', zonas.filter(z => alertas[z].length).join(', ') || 'ninguna');
})().catch(e => { console.error(e); process.exit(1); });
