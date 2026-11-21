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

// Cambios bruscos (21/11/2026): datos posibles pero raros, que pueden ser un error o una fuente alterada.
// No se sacan (pueden ser reales): solo se avisa por correo para que alguien los mire.
// Se compara con la copia anterior; la clave lleva la fecha o la lectura, así cada cambio avisa una sola vez.
const B = {
  municipios: 10,    // municipios que cambian de nivel oficial de una lectura a la siguiente
  saltos: 3,         // municipios que saltan 2 niveles o más de una vez
  rioDia: 0.5,       // Paraná o Paraguay: 50 cm o más de un día al otro (más de 1 m ya se saca)
  rioHora: 0.3,      // Paraná por hora: 30 cm o más en 6 horas o menos
  mm: 200            // lluvia de un día en un pluviómetro o en 24 h en una estación
};
function comparar(nueva, anterior) {
  const d = (nueva && nueva.datos) || {}, a = (anterior && anterior.datos) || {}, out = [];
  const avisar = (clave, detalle) => out.push({ clave: 'brusco:' + clave, detalle });

  // Nivel oficial por municipio: muchos cambios juntos o saltos grandes.
  const on = d.oficial, oa = a.oficial;
  if (on && oa && on.mun && oa.mun && on.t !== oa.t) {
    const cambian = Object.keys(on.mun).filter(m => m in oa.mun && on.mun[m] !== oa.mun[m]);
    const saltan = cambian.filter(m => Math.abs(on.mun[m] - oa.mun[m]) >= 2);
    if (cambian.length >= B.municipios || saltan.length >= B.saltos)
      avisar('oficial:' + on.t, 'el nivel oficial cambió en ' + cambian.length + ' municipios a la vez (' + saltan.length + ' saltaron 2 niveles o más): ' +
        cambian.slice(0, 8).map(m => m + ' ' + oa.mun[m] + '→' + on.mun[m]).join(', ') + (cambian.length > 8 ? '…' : ''));
  }

  // Ríos día por día: el último día contra el anterior.
  for (const k of ['rio', 'paraguay']) {
    const o = d[k] && d[k].obs; if (!Array.isArray(o) || o.length < 2) continue;
    const [f1, v1] = o[o.length - 2], [f2, v2] = o[o.length - 1];
    if (Date.parse(f2) - Date.parse(f1) <= 864e5 && Math.abs(v2 - v1) >= B.rioDia)
      avisar(k + ':' + f2, (k === 'rio' ? 'el Paraná' : 'el Paraguay') + ' cambió ' + Math.round(Math.abs(v2 - v1) * 100) + ' cm de un día al otro (' + v1 + ' → ' + v2 + ' m, ' + f2 + ')');
  }

  // Paraná hora por hora en Barranqueras, contra la lectura de la copia anterior.
  const pn = d.puertos, pa = a.puertos;
  if (pn && pa && typeof pn.v === 'number' && typeof pa.v === 'number' && pn.hora && pa.hora && pn.hora !== pa.hora) {
    const h = (Date.parse(pn.hora) - Date.parse(pa.hora)) / 36e5;
    if (h > 0 && h <= 6 && Math.abs(pn.v - pa.v) >= B.rioHora)
      avisar('puertos:' + pn.hora, 'el Paraná por hora cambió ' + Math.round(Math.abs(pn.v - pa.v) * 100) + ' cm en ' + Math.round(h) + ' h (' + pa.v + ' → ' + pn.v + ' m)');
  }

  // Lluvia muy fuerte en un pluviómetro o en una estación.
  if (d.pluvio && Array.isArray(d.pluvio.lug)) for (const x of d.pluvio.lug) x[3].forEach((v, i) => {
    if (v >= B.mm) avisar('pluvio:' + x[0] + ':' + d.pluvio.dias[i], 'el pluviómetro de ' + x[0] + ' marca ' + v + ' mm el ' + d.pluvio.dias[i]);
  });
  if (d.medida && Array.isArray(d.medida.e)) for (const x of d.medida.e) {
    if (x[4] >= B.mm) avisar('medida:' + x[0] + ':' + String(x[3]).slice(0, 10), 'la estación ' + x[0] + ' marca ' + x[4] + ' mm en 24 h');
  }

  return { claves: [...new Set(out.map(o => o.clave))].sort(), detalle: out.map(o => o.detalle).slice(0, 50) };
}

// Fuentes sin renovar (21/11/2026): si una fuente lleva más de VIEJA_H horas sin una lectura buena, se avisa por correo.
// Se mira "t" de cada dato, que el script pone cuando la lee bien (si falla, queda la copia anterior con su "t" viejo).
// No se mira la fecha del informe: la APA y el Centro de Monitoreo no publican los fines de semana y avisaría cada lunes.
// La lluvia prevista no se mira acá: la trae el robot de la lluvia (lluvia.json); en el script siempre falla por Open-Meteo.
const VIEJA_H = 48;
// El correo sale solo de lunes a viernes desde las 11 (hora de Argentina, decisión de Mariano del 21/11): sirve para avisar
// al Centro de Monitoreo o a la APA, y eso solo se puede en días hábiles. Fuera de ese horario no se suman fuentes nuevas a la
// lista (las que ya estaban siguen, así no vuelve a avisar), y a las 11 del siguiente día hábil aparecen y sale el correo.
const HORA_AVISO = 11;
function habil(ahora) { const a = new Date(ahora - 3 * 36e5); const d = a.getUTCDay(); return d >= 1 && d <= 5 && a.getUTCHours() >= HORA_AVISO; }
const NOMBRES = { oficial: 'nivel oficial por municipio (Centro de Monitoreo)', localidades: 'localidades con alerta (APA)', puertos: 'ríos hora por hora (APA)',
  pluvio: 'pluviómetros (Centro de Monitoreo)', rio: 'Paraná (INA)', paraguay: 'Paraguay (INA)', bermejo: 'Bermejo (INA)', prono: 'pronóstico del Paraná (INA)',
  pronoPy: 'pronóstico del Paraguay (INA)', medida: 'lluvia medida en estaciones (INA)', yacy: 'Yacyretá (INA)' };
function viejas(copia, ahora = Date.now(), anterior = null, horas = VIEJA_H) {
  const d = (copia && copia.datos) || {}, err = d.errores || {}, out = [];
  const antes = new Set((anterior && anterior.revision && anterior.revision.viejas && anterior.revision.viejas.claves) || []), enHorario = habil(ahora);
  for (const k of Object.keys(NOMBRES)) {
    const t = d[k] && Date.parse(d[k].t);
    if (!t || isNaN(t)) continue;   // nunca se leyó: no hay con qué comparar
    const h = (ahora - t) / 36e5;
    if (h > horas && (enHorario || antes.has('vieja:' + k))) out.push({ clave: 'vieja:' + k, detalle: NOMBRES[k] + ': ' + Math.floor(h) + ' h sin una lectura buena' + (err[k] ? ' (' + String(err[k]).slice(0, 80) + ')' : '') });
  }
  return { claves: out.map(o => o.clave).sort(), detalle: out.map(o => o.detalle) };
}

// Claves que no estaban en la copia anterior: solo por esas se avisa (campo: 'claves' para lo sacado, 'cambios' para lo brusco, 'viejas' para lo sin renovar).
function nuevas(copia, anterior, campo = 'claves') {
  const lista = (j) => { const r = j && j.revision; return (r && (campo === 'claves' ? r.claves : r[campo] && r[campo].claves)) || []; };
  const antes = new Set(lista(anterior));
  return lista(copia).filter(c => !antes.has(c));
}

module.exports = { revisar, comparar, viejas, nuevas, habil, R, B, VIEJA_H, HORA_AVISO };
