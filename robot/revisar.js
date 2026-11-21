// Revisión de valores imposibles (21/11/2026). La usa robot/servidor.js antes de guardar servidor.json en la rama "datos".
// La página ya controla la forma de cada dato (FORMA); acá se controla que cada número sea posible.
// Lo que no puede ser (un río a 45 m, un pluviómetro con 999 mm, un salto de más de 1 m en un día) se saca:
//  - en listas (lecturas, estaciones, pluviómetros, localidades) se saca solo ese renglón;
//  - en tablas que tienen que estar completas (lluvia prevista, pronósticos) se saca el dato entero,
//    y la página sigue mostrando lo último bueno que tiene guardado.
// Cada cosa sacada queda anotada en "revision" con una clave fija (sin el valor ni la hora), para avisar por correo
// solo cuando aparece un problema nuevo y no cada hora mientras dure.
'use strict';
const R = {
  rio: [-2, 15],          // Paraná en Barranqueras, Paraguay en Puerto Bermejo, Bermejo en El Colorado (m)
  salto: 1,               // Paraná y Paraguay: más de 1 m de diferencia con el día anterior y el siguiente es un error
  puerto: [-5, 60],       // estaciones hora por hora (incluye Iguazú, que pasa de 20 m)
  prono: [-2, 15],        // pronósticos del INA (m)
  mmDia: [0, 500],        // lluvia de un día: prevista, de pluviómetro o de estación (mm)
  mm3: [0, 800],          // lluvia de 3 días de las estaciones (mm)
  lat: [-28.5, -23.9],    // localidades con alerta: dentro del Chaco y alrededores
  lon: [-63.6, -58.1]
};
const entre = (v, [a, b]) => typeof v === 'number' && isFinite(v) && v >= a && v <= b;
const FECHA = /^\d{4}-\d\d-\d\d$/;

function revisar(copia) {
  const j = JSON.parse(JSON.stringify(copia)), d = j.datos || {}, fuera = [];
  const anotar = (clave, detalle) => fuera.push({ clave, detalle });

  // Ríos día por día: valores fuera de rango y picos sueltos.
  for (const k of ['rio', 'paraguay', 'bermejo']) {
    const o = d[k]; if (!o || !Array.isArray(o.obs)) continue;
    let obs = o.obs.filter(p => {
      const ok = Array.isArray(p) && entre(p[1], R.rio);
      if (!ok) anotar(k + ':' + (p && p[0]), 'altura imposible el ' + (p && p[0]) + ': ' + (p && p[1]));
      return ok;
    });
    if (k !== 'bermejo') obs = obs.filter((p, i) => {   // el Bermejo sube y baja rápido: no se le mira el salto
      const a = obs[i - 1], s = obs[i + 1], dif = q => Math.abs(q[1] - p[1]) > R.salto;
      const pico = !!a && dif(a) && (!s || dif(s));
      if (pico) anotar(k + ':' + p[0], 'salto de más de 1 m en un día el ' + p[0] + ': ' + a[1] + ' → ' + p[1] + ' m');
      return !pico;
    });
    if (obs.length) o.obs = obs; else delete d[k];
  }

  // Estaciones hora por hora.
  if (d.puertos && Array.isArray(d.puertos.est)) {
    d.puertos.est = d.puertos.est.filter(x => {
      const ok = Array.isArray(x) && entre(x[2], R.puerto);
      if (!ok) anotar('puertos:' + (x && x[0]), 'altura imposible en ' + (x && x[0]) + ': ' + (x && x[2]));
      return ok;
    });
    if (d.puertos.v != null && !entre(d.puertos.v, R.rio)) { anotar('puertos:v', 'altura imposible del Paraná por hora: ' + d.puertos.v); delete d.puertos.v; }
    if (!d.puertos.est.length) delete d.puertos;
  }

  // Pluviómetros oficiales.
  if (d.pluvio && Array.isArray(d.pluvio.lug)) {
    d.pluvio.lug = d.pluvio.lug.filter(x => {
      const ok = Array.isArray(x) && Array.isArray(x[3]) && x[3].every(v => entre(v, R.mmDia));
      if (!ok) anotar('pluvio:' + (x && x[0]), 'lluvia imposible en el pluviómetro de ' + (x && x[0]) + ': ' + JSON.stringify(x && x[3]));
      return ok;
    });
    if (!d.pluvio.lug.length) delete d.pluvio;
  }

  // Estaciones automáticas (lluvia medida).
  if (d.medida && Array.isArray(d.medida.e)) {
    d.medida.e = d.medida.e.filter(x => {
      const ok = Array.isArray(x) && entre(x[4], R.mmDia) && entre(x[5], R.mm3);
      if (!ok) anotar('medida:' + (x && x[0]), 'lluvia imposible en la estación ' + (x && x[0]) + ': ' + (x && x[4]) + ' / ' + (x && x[5]) + ' mm');
      return ok;
    });
    if (!d.medida.e.length) delete d.medida;
  }

  // Localidades con alerta: que caigan en el mapa.
  if (d.localidades && Array.isArray(d.localidades.loc)) {
    d.localidades.loc = d.localidades.loc.filter(x => {
      const ok = Array.isArray(x) && entre(x[2], R.lat) && entre(x[3], R.lon);
      if (!ok) anotar('localidades:' + (x && x[0]), 'localidad fuera del Chaco: ' + (x && x[0]) + ' (' + (x && x[2]) + ', ' + (x && x[3]) + ')');
      return ok;
    });
  }

  // Lluvia prevista: la tabla tiene que estar completa, así que si un valor es imposible se saca entera.
  for (const k of ['lluvia', 'municipios']) {
    const o = d[k]; if (!o || !Array.isArray(o.mm)) continue;
    if (!o.mm.every(f => Array.isArray(f) && f.every(v => entre(v, R.mmDia)))) { anotar(k, 'lluvia prevista imposible (Open-Meteo)'); delete d[k]; }
  }

  // Pronósticos del INA: fechas, rango y que el mínimo no supere al máximo.
  const filaOk = r => Array.isArray(r) && FECHA.test(r[0]) && r.slice(1, 4).every(v => entre(v, R.prono)) && r[1] <= r[2] + 0.01 && r[2] <= r[3] + 0.01;
  if (d.prono && Array.isArray(d.prono.p) && !d.prono.p.every(filaOk)) { anotar('prono', 'pronóstico del Paraná con valores imposibles'); delete d.prono; }
  if (d.pronoPy) for (const k of ['formosa', 'pilcomayo']) {
    if (Array.isArray(d.pronoPy[k]) && !d.pronoPy[k].every(filaOk)) { anotar('pronoPy:' + k, 'pronóstico del Paraguay (' + k + ') con valores imposibles'); delete d.pronoPy[k]; }
  }

  // Alertas del SMN: fechas AAAA-MM-DD y renglones solo con números.
  if (Array.isArray(j.fechas) && !j.fechas.every(f => FECHA.test(f))) { anotar('smn:fechas', 'fechas del SMN con formato raro'); j.fechas = j.fechas.filter(f => FECHA.test(f)); }
  if (j.alertas && typeof j.alertas === 'object') for (const a of Object.keys(j.alertas)) {
    const filas = j.alertas[a];
    if (!Array.isArray(filas)) { anotar('smn:' + a, 'alertas del SMN con formato raro'); delete j.alertas[a]; continue; }
    const buenas = filas.filter(r => Array.isArray(r) && FECHA.test(r[0]) && r.slice(1).every(v => v == null || (typeof v === 'number' && isFinite(v))));
    if (buenas.length < filas.length) { anotar('smn:' + a, 'alertas del SMN con formato raro (área ' + a + ')'); j.alertas[a] = buenas; }
  }

  const claves = [...new Set(fuera.map(f => f.clave))].sort();
  j.revision = { claves, detalle: fuera.map(f => f.detalle).slice(0, 50) };
  return j;
}

// Claves que no estaban en la copia anterior: solo por esas se avisa.
function nuevas(copia, anterior) {
  const antes = new Set((anterior && anterior.revision && anterior.revision.claves) || []);
  return ((copia && copia.revision && copia.revision.claves) || []).filter(c => !antes.has(c));
}

module.exports = { revisar, nuevas, R };
