// Robot de la lluvia: lo corre GitHub (.github/workflows/lluvia.yml), lanzado cada hora por el script de Google.
// Pide a Open-Meteo la lluvia (y desde el 23/10/2026 la temperatura máxima y mínima y el tipo de tiempo) de las 6 localidades
// y de los 70 municipios y escribe lluvia.json,
// con la misma forma que la copia del script de Google: { datos: { lluvia, municipios, errores } }.
// Uso: node robot/lluvia.js anterior.json lluvia.json
// Los puntos y las funciones salen del script de Google, para no tener la lista de municipios en dos lugares.
const fs = require('fs'), path = require('path'), vm = require('vm');
const gs = vm.createContext({ console, JSON, Math, Date, Number, String, Array, Error, RegExp, isFinite, isNaN });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'alertas-smn-apps-script.gs'), 'utf8'), gs);
const espera = ms => new Promise(r => setTimeout(r, ms));

// Hasta 3 intentos por pedido: Open-Meteo a veces rechaza (429) a servidores compartidos.
async function pedir(url, pausa) {
  let error;
  for (let i = 0; i < 3; i++) {
    if (i) await espera(pausa);
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (r.ok) return await r.json();
      error = new Error('HTTP ' + r.status);
    } catch (e) { error = e; }
  }
  throw error;
}

// Temperaturas y tipo de tiempo del día (agregado el 23/10/2026): vienen en la misma consulta que la lluvia, sin pedidos de más.
// La dirección sale del script de Google (que no se cambia); acá solo se le suman las variables. Si la dirección cambiara de forma,
// se pide como antes, solo la lluvia. tmax/tmin en grados enteros y cod (código del tiempo de la OMM), alineados con dias.
// Si faltan o llegan mal, la lluvia se guarda igual, sin ellos.
const VARS = 'daily=precipitation_sum,temperature_2m_max,temperature_2m_min,weather_code&';
function urlTiempo(pts) {
  const u = gs.urlLluvia(pts);
  return u.includes('daily=precipitation_sum&') ? u.replace('daily=precipitation_sum&', VARS) : u;
}
function tiempo(j, n) {
  try {
    const col = k => j.map(x => {
      const v = x && x.daily && x.daily[k];
      if (!Array.isArray(v) || v.length !== n) throw new Error('formato');
      return v.map(y => y == null || !isFinite(Number(y)) ? null : Math.round(Number(y)));
    });
    return { tmax: col('temperature_2m_max'), tmin: col('temperature_2m_min'), cod: col('weather_code') };
  } catch (e) { return {}; }
}

// Si una de las dos consultas falla, queda la anterior con su hora. Devuelve también cuántas salieron bien.
async function armar(anterior, ahora, pausa) {
  const previo = (anterior && anterior.datos) || {}, datos = { errores: {} };
  let bien = 0;
  for (const [k, pts] of [['lluvia', gs.LOCS], ['municipios', gs.CENTROS]]) {
    try {
      const j = await pedir(urlTiempo(pts), pausa);
      const d = JSON.parse(JSON.stringify(gs.normLluvia(j, pts.length)));
      Object.assign(d, tiempo(j, d.dias.length));
      d.t = ahora.toISOString(); datos[k] = d; bien++;
    } catch (e) {
      datos.errores[k] = String(e.message || e);
      if (previo[k]) datos[k] = previo[k];
    }
  }
  return { salida: { fuente: 'Open-Meteo', datos }, bien };
}

module.exports = { armar, tiempo, urlTiempo };
if (require.main === module) (async () => {
  let anterior = null;
  try { anterior = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) {}
  const r = await armar(anterior, new Date(), 20000);
  console.log('Consultas bien: ' + r.bien + ' de 2. Errores: ' + JSON.stringify(r.salida.datos.errores));
  fs.writeFileSync(process.argv[3], JSON.stringify(r.salida));
  if (!r.bien) process.exit(1);   // la corrida queda marcada como fallida, pero el archivo conserva lo anterior y el error
})();
