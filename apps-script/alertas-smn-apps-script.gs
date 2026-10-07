/**
 * Alertas del SMN para el Chaco: script de Google Apps Script.
 *
 * Lee el canal oficial de alertas del Servicio Meteorológico Nacional (formato CAP),
 * se queda con las que tocan a los municipios del Chaco y publica el resultado como JSON.
 *
 * Además guarda una copia horaria de los otros datos del sitio (lluvia, río, caudal y ONI), en "datos".
 * El sitio usa esa copia si tiene menos de 2 horas; si no, consulta cada fuente directamente.
 * Si una de esas fuentes falla, se conserva la copia anterior y las alertas del SMN no se ven afectadas.
 * Para ver qué fuentes responden desde Google: ejecutar diagnosticoDatos().
 *
 * Uso:
 *  1. Ejecutar una vez la función instalar(): hace la primera lectura y programa la renovación cada hora.
 *  2. Implementar > Nueva implementación > Aplicación web > Acceso: "Cualquier persona".
 *     La dirección que entrega es la que lee el mapa.
 */

var FEED = 'https://ssl.smn.gob.ar/CAP/AR.php';
var AJUSTE_H = 3;                   // corrección horaria del canal (ver leerCap)
var DIAS = 4;                       // hoy y los tres días siguientes
var TZ = 'America/Argentina/Buenos_Aires';

// Punto central de cada municipio [lat, lon], en el mismo orden que GEO.mun en el mapa.
var CENTROS = [[-26.58,-60.73],[-27.48,-58.92],[-27.87,-59.18],[-26.85,-60.8],[-26.8,-59.44],[-27.64,-59.96],[-27.12,-61.31],[-27.88,-61.54],[-26.57,-59.62],[-27.01,-60.13],[-27.31,-58.85],[-26.92,-59.41],[-27.29,-59.13],[-26.7,-59.62],[-26.44,-60.91],[-27.75,-60.89],[-26.85,-61.07],[-27.69,-59.57],[-24.65,-61.65],[-27.8,-60.45],[-27.42,-59.05],[-25.04,-61.99],[-27.41,-61.63],[-27.41,-61.47],[-27.27,-61.37],[-26.52,-59.28],[-26.82,-58.73],[-27.62,-61.33],[-27.3,-58.68],[-25.92,-60.66],[-27.17,-60.68],[-26.73,-58.94],[-27.1,-59.49],[-26.99,-58.85],[-27.08,-60.62],[-27.07,-59.33],[-27.23,-59.19],[-26.42,-59.68],[-27.26,-59.47],[-26.94,-61.26],[-26.62,-59.78],[-27.12,-58.68],[-26.04,-61.47],[-26.68,-59.97],[-27.11,-59.23],[-27.09,-59.02],[-25.48,-61.04],[-24.99,-61.55],[-26.68,-60.63],[-26.64,-59.04],[-26.02,-59.97],[-26.4,-61.14],[-27.04,-59.77],[-26.18,-59.68],[-26.79,-60.46],[-26.89,-58.52],[-26.71,-58.64],[-27.38,-59.3],[-27.71,-58.91],[-26.66,-60.17],[-27.59,-59.14],[-27.61,-60.35],[-27.34,-60.7],[-27.85,-61.12],[-25.33,-62.58],[-26.32,-60.45],[-27.68,-60.76],[-27.26,-60.37],[-25.69,-60.32],[-25.35,-60.61]];

// Localidades del semáforo [lat, lon], en el mismo orden que LOCS en el sitio.
var LOCS = [[-27.45,-58.99],[-26.79,-60.44],[-27.57,-60.71],[-25.95,-60.62],[-27.21,-61.19],[-27.09,-61.08]];
var TRIM = { DJF: 'dic-feb', JFM: 'ene-mar', FMA: 'feb-abr', MAM: 'mar-may', AMJ: 'abr-jun', MJJ: 'may-jul', JJA: 'jun-ago', JAS: 'jul-sep', ASO: 'ago-oct', SON: 'sep-nov', OND: 'oct-dic', NDJ: 'nov-ene' };

// Mismos números que usa el mapa: 3 = amarillo, 4 = naranja, 5 = rojo.
var NIVEL = { minor: 2, moderate: 3, severe: 4, extreme: 5 };

/* ---------- funciones puras (sin servicios de Google) ---------- */

function idEvento(nombre) {
  var n = String(nombre || '').toLowerCase();
  if (n.indexOf('zonda') >= 0) return 47;
  if (n.indexOf('tormenta') >= 0) return 41;
  if (n.indexOf('lluvia') >= 0) return 37;
  if (n.indexOf('nev') >= 0) return 42;
  if (n.indexOf('viento') >= 0) return 39;
  return 0;
}

function etiqueta(xml, tag) {
  var m = new RegExp('<(?:\\w+:)?' + tag + '[^>]*>([\\s\\S]*?)</(?:\\w+:)?' + tag + '>').exec(xml);
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}

// Devuelve los datos útiles de un mensaje CAP, o null si no sirve.
function leerCap(xml) {
  var estado = etiqueta(xml, 'status'), tipo = etiqueta(xml, 'msgType');
  if (estado && estado !== 'Actual') return null;
  if (tipo === 'Cancel') return null;
  var nivel = NIVEL[etiqueta(xml, 'severity').toLowerCase()] || 0;
  var desde = new Date(etiqueta(xml, 'onset') || etiqueta(xml, 'effective') || etiqueta(xml, 'sent'));
  var hasta = new Date(etiqueta(xml, 'expires'));
  if (isNaN(desde) || isNaN(hasta)) return null;
  // El canal rotula las horas como -03:00 pero corresponden a UTC: se corrigen 3 horas (verificado contra el mapa del SMN el 6/10/2026).
  desde = new Date(desde.getTime() - AJUSTE_H * 3600000); hasta = new Date(hasta.getTime() - AJUSTE_H * 3600000);
  var poligonos = [], re = /<(?:\w+:)?polygon[^>]*>([\s\S]*?)<\/(?:\w+:)?polygon>/g, m;
  while ((m = re.exec(xml))) {
    var pts = m[1].trim().split(/\s+/).map(function (p) { var c = p.split(','); return [Number(c[0]), Number(c[1])]; })
      .filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); });
    if (pts.length >= 3) poligonos.push(pts);
  }
  // La hora de emisión viene con el mismo corrimiento que las demás.
  var env = new Date(etiqueta(xml, 'sent'));
  var enviado = isNaN(env) ? '' : new Date(env.getTime() - AJUSTE_H * 3600000).toISOString();
  return { ev: idEvento(etiqueta(xml, 'event')), nivel: nivel, desde: desde, hasta: hasta, enviado: enviado, poligonos: poligonos };
}

function dentro(pt, pol) {
  var x = pt[1], y = pt[0], ok = false;
  for (var i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    var xi = pol[i][1], yi = pol[i][0], xj = pol[j][1], yj = pol[j][0];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
}

function sumarDias(dia, n) {
  var d = new Date(dia + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Arma el JSON que lee el mapa. hoy = 'AAAA-MM-DD' en hora de Argentina; ahora = Date.
function armar(caps, hoy, ahora) {
  var fechas = [], alertas = {}, emitido = null, i, k;
  for (i = 0; i < DIAS; i++) fechas.push(sumarDias(hoy, i));
  for (i = 0; i < CENTROS.length; i++) alertas[i] = [];
  caps.forEach(function (c) {
    if (!c || c.nivel < 3 || !c.poligonos.length) return;
    var tocados = [];
    for (var m = 0; m < CENTROS.length; m++) {
      if (c.poligonos.some(function (p) { return dentro(CENTROS[m], p); })) tocados.push(m);
    }
    if (!tocados.length) return;
    if (c.enviado && (!emitido || new Date(c.enviado) > new Date(emitido))) emitido = c.enviado;
    fechas.forEach(function (dia) {
      // Franjas de 6 horas en hora de Argentina (UTC-3): madrugada, mañana, tarde, noche.
      var niveles = [0, 0, 0, 0], alguna = false;
      for (k = 0; k < 4; k++) {
        var ini = new Date(dia + 'T' + ('0' + k * 6).slice(-2) + ':00:00-03:00');
        var fin = new Date(ini.getTime() + 6 * 3600000);
        if (c.desde < fin && c.hasta > ini) { niveles[k] = c.nivel; alguna = true; }
      }
      if (!alguna) return;
      tocados.forEach(function (m) {
        var lista = alertas[m], prev = null;
        for (var q = 0; q < lista.length; q++) if (lista[q][0] === dia && lista[q][1] === c.ev) prev = lista[q];
        if (!prev) lista.push([dia, c.ev].concat(niveles));
        else for (k = 0; k < 4; k++) prev[2 + k] = Math.max(prev[2 + k], niveles[k]);
      });
    });
  });
  var areas = []; for (i = 0; i < CENTROS.length; i++) areas.push(i);
  return {
    fuente: 'SMN, canal CAP',
    emitido: emitido || ahora.toISOString(),
    capturado: ahora.toISOString().slice(0, 16) + ':00Z',
    fechas: fechas, areas: areas, alertas: alertas
  };
}

function enlacesDelCanal(texto) {
  var vistos = {}, out = [], re = /https?:\/\/ssl\.smn\.gob\.ar\/feeds\/CAP\/xml_generados\/[^"'<>\s)\]]+\.xml/g, m;
  while ((m = re.exec(texto))) if (!vistos[m[0]]) { vistos[m[0]] = 1; out.push(m[0]); }
  return out;
}

/* ---------- copia horaria de lluvia, río, caudal y ONI (funciones puras) ---------- */

function urlLluvia(pts) {
  return 'https://api.open-meteo.com/v1/forecast?latitude=' + pts.map(function (p) { return p[0]; }).join(',') +
    '&longitude=' + pts.map(function (p) { return p[1]; }).join(',') +
    '&daily=precipitation_sum&past_days=7&forecast_days=7&timezone=America%2FArgentina%2FCordoba';
}

// Día en hora de Argentina (UTC-3, sin horario de verano) de una fecha con hora.
function diaAR(fecha) {
  var d = new Date(fecha);
  return isNaN(d) ? '' : new Date(d.getTime() - 3 * 3600000).toISOString().slice(0, 10);
}

// Lluvia de n puntos: { dias: [...], mm: [[...], ...] }, igual que la arma el sitio.
function normLluvia(j, n) {
  if (!Array.isArray(j) || j.length !== n) throw new Error('formato');
  var dias = j[0].daily.time;
  var mm = j.map(function (x) {
    var v = x.daily.precipitation_sum;
    if (!Array.isArray(v) || v.length !== dias.length) throw new Error('formato');
    if (v.filter(function (y) { return y == null; }).length > 3) throw new Error('faltan datos');
    return v.map(function (y) { return y == null ? 0 : Number(y); });
  });
  return { dias: dias, mm: mm };
}

// Río: una lectura por día (la última de cada día), sin valores imposibles.
function normRio(j) {
  var rows = (Array.isArray(j) ? j : (j && j.rows) || []).filter(function (r) {
    return r && r.valor != null && r.timestart && Number(r.valor) > -3 && Number(r.valor) < 12 && diaAR(r.timestart);
  }).sort(function (a, b) { return new Date(a.timestart) - new Date(b.timestart); });
  if (!rows.length) throw new Error('sin lecturas');
  var obs = [], pos = {};
  rows.forEach(function (r) {
    var dia = diaAR(r.timestart);
    if (pos[dia] == null) { pos[dia] = obs.length; obs.push([dia, Number(r.valor)]); } else obs[pos[dia]][1] = Number(r.valor);
  });
  var u = rows[rows.length - 1];
  return { obs: obs, act: u.timeupdate || null, hora: u.timestart };
}

function normCaudal(j) {
  var dias = j.daily.time, q = j.daily.river_discharge;
  if (!Array.isArray(dias) || !Array.isArray(q) || q.length !== dias.length) throw new Error('formato');
  return { dias: dias, q: q.map(Number) };
}

// Tabla ONI de la NOAA (texto con columnas SEAS YR TOTAL ANOM): devuelve los últimos 6 trimestres.
function leerOni(texto) {
  var v = [], re = /^\s*([A-Z]{3})\s+(\d{4})\s+-?\d+(?:\.\d+)?\s+(-?\d+(?:\.\d+)?)\s*$/gm, m;
  while ((m = re.exec(texto))) if (TRIM[m[1]] && Math.abs(Number(m[3])) < 5) v.push([m[2], TRIM[m[1]], Number(m[3])]);
  if (v.length < 6) throw new Error('formato');
  return { v: v.slice(-6) };
}

// Qué se pide y cómo se lee. hoy = 'AAAA-MM-DD' en hora de Argentina.
function fuentesExtra(hoy) {
  var json = function (f) { return function (t) { return f(JSON.parse(t)); }; };
  return [
    { k: 'lluvia', url: urlLluvia(LOCS), leer: json(function (j) { return normLluvia(j, LOCS.length); }) },
    { k: 'municipios', url: urlLluvia(CENTROS), leer: json(function (j) { return normLluvia(j, CENTROS.length); }) },
    { k: 'rio', url: 'https://alerta.ina.gob.ar/a5/obs/puntual/series/20/observaciones?timestart=' + sumarDias(hoy, -30) + '&timeend=' + sumarDias(hoy, 2) + '&format=json', leer: json(normRio) },
    { k: 'caudal', url: 'https://flood-api.open-meteo.com/v1/flood?latitude=-27.48&longitude=-58.93&daily=river_discharge&past_days=30&forecast_days=30', leer: json(normCaudal) },
    { k: 'oni', url: 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt', leer: leerOni }
  ];
}

// Pide cada fuente por separado. Si una falla, queda la copia anterior (con su hora) y se anota el error.
// pedir(url) devuelve { codigo, texto }.
function leerExtras(hoy, ahora, previo, pedir) {
  var out = {}, errores = {};
  fuentesExtra(hoy).forEach(function (f) {
    try {
      var r = pedir(f.url);
      if (r.codigo !== 200) throw new Error('HTTP ' + r.codigo);
      var d = f.leer(r.texto);
      d.t = ahora.toISOString();
      out[f.k] = d;
    } catch (e) {
      errores[f.k] = String(e.message || e);
      if (previo && previo[f.k]) out[f.k] = previo[f.k];
    }
  });
  out.errores = errores;
  return out;
}

/* ---------- parte que usa los servicios de Google ---------- */

function pedirUrl(url) {
  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  return { codigo: r.getResponseCode(), texto: r.getContentText() };
}

// Lee el canal del SMN y arma las alertas. Da error si el canal no responde bien.
function leerSmn(hoy, ahora) {
  var r = UrlFetchApp.fetch(FEED, { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('El canal del SMN respondió ' + r.getResponseCode());
  var texto = r.getContentText();
  if (texto.indexOf('CAP') < 0) throw new Error('El canal del SMN no devolvió un listado de alertas.');
  var urls = enlacesDelCanal(texto), caps = [], fallas = 0;
  for (var i = 0; i < urls.length; i += 40) {
    var tanda = UrlFetchApp.fetchAll(urls.slice(i, i + 40).map(function (u) { return { url: u, muteHttpExceptions: true }; }));
    tanda.forEach(function (x) { if (x.getResponseCode() === 200) caps.push(leerCap(x.getContentText())); else fallas++; });
  }
  // Si falló más de la cuarta parte, no se pisa el dato anterior: podría faltar justo una alerta del Chaco.
  if (urls.length && fallas > urls.length / 4) throw new Error('No se pudieron leer ' + fallas + ' de ' + urls.length + ' alertas.');
  var datos = armar(caps, hoy, ahora);
  datos.leidas = urls.length; datos.fallas = fallas;
  return datos;
}

// Junta las alertas con la copia horaria de las demás fuentes. Ninguna de las dos partes impide guardar la otra:
// si el canal del SMN falla, quedan las alertas anteriores (con su hora de lectura) y lluvia, río, caudal y ONI se renuevan igual.
// leer(hoy, ahora) devuelve las alertas o da error; pedir(url) devuelve { codigo, texto }.
function juntar(anterior, hoy, ahora, leer, pedir) {
  var falla = null, datos;
  anterior = anterior || {};
  try { datos = leer(hoy, ahora); } catch (e) { falla = e; datos = anterior; delete datos.error; }
  var previo = anterior.datos || {};
  try { datos.datos = leerExtras(hoy, ahora, previo, pedir); } catch (e) { datos.datos = previo; }
  return { datos: datos, falla: falla };
}

function actualizar() {
  var ahora = new Date(), hoy = Utilities.formatDate(ahora, TZ, 'yyyy-MM-dd'), anterior = {};
  try { anterior = JSON.parse(leerGuardado() || '{}'); } catch (e) {}
  var r = juntar(anterior, hoy, ahora, leerSmn, pedirUrl);
  guardar(JSON.stringify(r.datos));
  if (r.falla) throw r.falla;   // el fallo del canal queda en el registro de ejecuciones de Google
  return r.datos;
}

function guardar(json) {
  var p = PropertiesService.getScriptProperties(), n = Math.ceil(json.length / 8000), todo = { partes: String(n) };
  for (var i = 0; i < n; i++) todo['p' + i] = json.substr(i * 8000, 8000);
  p.setProperties(todo, true);
}

function leerGuardado() {
  var p = PropertiesService.getScriptProperties().getProperties(), n = Number(p.partes || 0), s = '';
  for (var i = 0; i < n; i++) s += p['p' + i] || '';
  return s;
}

// Dirección pública: devuelve el último resultado guardado.
function doGet() {
  var json = leerGuardado();
  if (!json) { try { json = JSON.stringify(actualizar()); } catch (e) { json = JSON.stringify({ error: String(e.message || e) }); } }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// Ejecutar una sola vez: primera lectura y renovación automática cada hora.
function instalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'actualizar') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('actualizar').timeBased().everyHours(1).create();
  var d = actualizar(), con = 0;
  for (var k in d.alertas) if (d.alertas[k].length) con++;
  Logger.log('Listo. Alertas leídas: ' + d.leidas + ' (fallaron ' + d.fallas + '). Municipios del Chaco con alerta: ' + con + ' de ' + CENTROS.length + '. Emitido: ' + d.emitido);
}

// Diagnóstico: muestra qué responde el canal del SMN a los servidores de Google.
function diagnostico() {
  var r = UrlFetchApp.fetch(FEED, { muteHttpExceptions: true });
  var t = r.getContentText();
  Logger.log('Código: ' + r.getResponseCode() + ' | tipo: ' + r.getHeaders()['Content-Type'] + ' | largo: ' + t.length + ' | enlaces CAP: ' + enlacesDelCanal(t).length);
  Logger.log('Inicio: ' + t.slice(0, 700));
}

// Diagnóstico de la copia horaria: muestra qué fuentes responden a los servidores de Google.
function diagnosticoDatos() {
  var ahora = new Date(), hoy = Utilities.formatDate(ahora, TZ, 'yyyy-MM-dd');
  var d = leerExtras(hoy, ahora, {}, pedirUrl);
  ['lluvia', 'municipios', 'rio', 'caudal', 'oni'].forEach(function (k) {
    Logger.log(k + ': ' + (d[k] ? 'bien' : 'FALLA: ' + d.errores[k]));
  });
  if (d.rio) Logger.log('Última lectura del río: ' + JSON.stringify(d.rio.obs[d.rio.obs.length - 1]));
  if (d.oni) Logger.log('ONI: ' + JSON.stringify(d.oni.v));
}
