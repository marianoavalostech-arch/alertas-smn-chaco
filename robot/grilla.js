// Robot de la grilla de lluvia por hora (mapa animado). Lo corre la misma tarea que el robot de la lluvia
// (.github/workflows/lluvia.yml), después de la lluvia, para que una falla de la grilla nunca la afecte.
// Pide a Open-Meteo, para una grilla cada 0,5° que cubre el Chaco y unos 100 km alrededor, la lluvia,
// la nubosidad y el código de tiempo de cada hora de ayer, hoy y mañana. Escribe grilla.json.
// Se renueva cada 3 horas como mucho (CADA_H): el pronóstico casi no cambia de una hora a otra y así se cuida el límite gratuito.
// Si Open-Meteo falla, no insiste: queda la grilla anterior con su hora y se anota el error.
// Uso: node robot/grilla.js anterior.json grilla.json
const fs = require('fs');

const G = { lat0: -23, lon0: -64.7, paso: 0.5, nlat: 13, nlon: 16 };   // de norte a sur y de oeste a este
const CADA_H = 3;

// Puntos de la grilla, fila por fila desde el norte: [lat, lon]
function puntos(g = G) {
  const p = [];
  for (let i = 0; i < g.nlat; i++) for (let j = 0; j < g.nlon; j++)
    p.push([+(g.lat0 - i * g.paso).toFixed(2), +(g.lon0 + j * g.paso).toFixed(2)]);
  return p;
}
function urlGrilla(g = G) {
  const p = puntos(g);
  return 'https://api.open-meteo.com/v1/forecast?latitude=' + p.map(x => x[0]).join(',') +
    '&longitude=' + p.map(x => x[1]).join(',') +
    '&hourly=precipitation,cloud_cover,weather_code&past_days=1&forecast_days=2&timezone=America%2FArgentina%2FBuenos_Aires';
}

// Respuesta de Open-Meteo → forma compacta:
// h0 = primera hora (hora argentina, "AAAA-MM-DDTHH:00"), n = cantidad de horas,
// p[punto][hora] = lluvia en décimas de mm, nube[punto][hora] = nubosidad en decenas de % (0 a 10),
// torm = lista de [hora, punto] con tormenta prevista (código de tiempo 95 a 99).
function normGrilla(j, g = G) {
  const np = g.nlat * g.nlon;
  if (!Array.isArray(j) || j.length !== np) throw new Error('formato');
  const t = j[0].hourly && j[0].hourly.time;
  if (!Array.isArray(t) || !t.length || !/^\d{4}-\d\d-\d\dT\d\d:00$/.test(t[0])) throw new Error('formato');
  const n = t.length, torm = [];
  const p = [], nube = [];
  j.forEach((x, k) => {
    const h = x.hourly || {}, pr = h.precipitation, cc = h.cloud_cover, wc = h.weather_code;
    if (![pr, cc, wc].every(a => Array.isArray(a) && a.length === n)) throw new Error('formato');
    if (pr.filter(v => v == null).length > 6) throw new Error('faltan datos');
    p.push(pr.map(v => v == null ? 0 : Math.max(0, Math.round(Number(v) * 10))));
    nube.push(cc.map(v => v == null ? 0 : Math.min(10, Math.max(0, Math.round(Number(v) / 10)))));
    wc.forEach((v, hh) => { if (v >= 95) torm.push([hh, k]); });
  });
  return { ...g, h0: t[0], n, p, nube, torm };
}

async function pedir(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

// Devuelve { salida, pidio, bien }. Si la anterior tiene menos de CADA_H horas (con 10 minutos de margen), se deja como está.
async function armarGrilla(anterior, ahora) {
  const prev = anterior && anterior.datos;
  if (prev && prev.t && !isNaN(new Date(prev.t)) && ahora - new Date(prev.t) < CADA_H * 36e5 - 10 * 60e3)
    return { salida: anterior, pidio: false, bien: true };
  try {
    const d = normGrilla(await pedir(urlGrilla()));
    d.t = ahora.toISOString();
    return { salida: { fuente: 'Open-Meteo', datos: d, error: null }, pidio: true, bien: true };
  } catch (e) {
    return { salida: prev ? { ...anterior, error: String(e.message || e) } : null, pidio: true, bien: false };
  }
}

module.exports = { G, puntos, urlGrilla, normGrilla, armarGrilla };
if (require.main === module) (async () => {
  let anterior = null;
  try { anterior = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) {}
  const r = await armarGrilla(anterior, new Date());
  console.log(r.pidio ? (r.bien ? 'Grilla renovada.' : 'Grilla: Open-Meteo no respondió (' + (r.salida && r.salida.error) + ').') : 'Grilla: la anterior tiene menos de ' + CADA_H + ' horas, no se pidió.');
  if (r.salida) fs.writeFileSync(process.argv[3], JSON.stringify(r.salida));
  if (!r.bien) process.exit(1);
})();
