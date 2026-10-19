// Robot de la imagen del Pacífico (sección "El Niño"). Lo corre la misma tarea que el robot de la lluvia
// (.github/workflows/lluvia.yml), después de la lluvia, para que una falla acá nunca la afecte.
// Baja de la NASA (GIBS) la temperatura del mar comparada con lo normal (GHRSST MUR), la misma imagen que mostraba
// la página, y la deja en la rama datos como pacifico.jpg, con su fecha en pacifico.json. Así cada visita la lee de GitHub
// (rápido) y no le pide a la NASA que la arme otra vez.
// Se renueva cada 7 días (CADA_D): la temperatura del mar cambia despacio y el ONI es mensual.
// La NASA publica con 1 o 2 días de atraso, y un día sin publicar devuelve una imagen transparente: primero se pide un pedacito
// de 4x2 puntos en medio del Pacífico y se mira si tiene algo (ayer, anteayer… hasta 4 días).
// Si la NASA falla, queda la imagen anterior con su fecha y se anota el error; se vuelve a intentar a las 6 horas (REINTENTO_H).
// Uso: node robot/pacifico.js carpeta-anterior carpeta-salida   (en cada una: pacifico.json y pacifico.jpg)
const fs = require('fs'), path = require('path'), zlib = require('zlib');

const CADA_D = 7, REINTENTO_H = 6, DIAS_ATRAS = [1, 2, 3, 4];
const PAC = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=GHRSST_L4_MUR_Sea_Surface_Temperature_Anomalies&STYLES=&SRS=EPSG:4326';
const pacUrl = (dia, bbox, w, h, f) => PAC + '&BBOX=' + bbox + '&WIDTH=' + w + '&HEIGHT=' + h + '&FORMAT=image/' + f + '&TIME=' + dia;
// Igual que la página: Pacífico y Sudamérica, 870x390, tierra gris.
const urlPrueba = dia => pacUrl(dia, '-170,-5,-120,5', 4, 2, 'png');
const urlImagen = dia => pacUrl(dia, '-180,-40,-35,25', 870, 390, 'jpeg') + '&TRANSPARENT=FALSE&BGCOLOR=0x8C978B';
const diaAntes = (ahora, n) => new Date(ahora.getTime() - n * 864e5).toISOString().slice(0, 10);
const esJpeg = b => Buffer.isBuffer(b) && b.length > 10000 && b[0] === 0xff && b[1] === 0xd8;

// ¿El PNG tiene algún punto que no sea transparente? Lee el PNG sin librerías (solo zlib, que viene con Node).
function pngTieneAlgo(b) {
  if (!Buffer.isBuffer(b) || b.length < 33 || b.toString('latin1', 1, 4) !== 'PNG') throw new Error('la prueba no es un PNG');
  let i = 8, w, h, prof, tipo, entrelazado, trns = null; const idat = [];
  while (i + 8 <= b.length) {
    const n = b.readUInt32BE(i), t = b.toString('latin1', i + 4, i + 8), d = b.subarray(i + 8, i + 8 + n);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); prof = d[8]; tipo = d[9]; entrelazado = d[12]; }
    else if (t === 'tRNS') trns = d;
    else if (t === 'IDAT') idat.push(d);
    else if (t === 'IEND') break;
    i += 12 + n;
  }
  if (!w || !idat.length) throw new Error('PNG incompleto');
  if (entrelazado) throw new Error('PNG entrelazado: no se puede leer');
  const canales = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[tipo];
  if (!canales) throw new Error('PNG de tipo ' + tipo);
  // Sin canal de transparencia ni tRNS: todo se ve.
  if ((tipo === 0 || tipo === 2) && !trns) return true;
  const bits = canales * prof, bpp = Math.max(1, bits >> 3), fila = Math.ceil(w * bits / 8);
  const crudo = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(fila * h);
  let prev = Buffer.alloc(fila);
  for (let y = 0; y < h; y++) {
    const f = crudo[y * (fila + 1)], src = crudo.subarray(y * (fila + 1) + 1, (y + 1) * (fila + 1)), cur = px.subarray(y * fila, (y + 1) * fila);
    for (let x = 0; x < fila; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, u = prev[x], c = x >= bpp ? prev[x - bpp] : 0;
      let p;
      if (f === 0) p = 0; else if (f === 1) p = a; else if (f === 2) p = u; else if (f === 3) p = (a + u) >> 1;
      else if (f === 4) { const q = a + u - c, pa = Math.abs(q - a), pb = Math.abs(q - u), pc = Math.abs(q - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? u : c; }
      else throw new Error('PNG con filtro ' + f);
      cur[x] = (src[x] + p) & 255;
    }
    prev = cur;
  }
  // Valor de una muestra (canal k del punto x de la fila y), para cualquier profundidad.
  const muestra = (y, x, k) => {
    if (prof >= 8) { const o = y * fila + (x * canales + k) * (prof >> 3); return px[o]; }   // en 16 bits alcanza el byte alto
    const bit = x * prof, byte = px[y * fila + (bit >> 3)];
    return (byte >> (8 - prof - (bit & 7))) & ((1 << prof) - 1);
  };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (tipo === 6 || tipo === 4) { if (muestra(y, x, canales - 1) > 0) return true; }
    else if (tipo === 3) { const k = muestra(y, x, 0); if (!trns || k >= trns.length || trns[k] > 0) return true; }
    else {   // gris o color con un color marcado como transparente
      const clave = []; for (let k = 0; k < canales; k++) clave.push(prof === 16 ? trns[2 * k] : trns.readUInt16BE(2 * k));
      for (let k = 0; k < canales; k++) if (muestra(y, x, k) !== clave[k]) return true;
    }
  }
  return false;
}

async function pedir(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(90000) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return Buffer.from(await r.arrayBuffer());
}

// anterior = { json, jpg } (lo que hay en la rama datos, o null). Devuelve { json, jpg } para guardar, o null si no hay nada.
async function armarPacifico(anterior, ahora) {
  const prev = anterior && anterior.json && /^\d{4}-\d\d-\d\d$/.test(anterior.json.dia) && esJpeg(anterior.jpg) ? anterior : null;
  if (prev) {
    const t = Date.parse(prev.json.t), intento = Date.parse(prev.json.intento);
    if (ahora - t < CADA_D * 864e5) return { salida: prev, pidio: false, bien: true };
    if (prev.json.error && ahora - intento < REINTENTO_H * 36e5) return { salida: prev, pidio: false, bien: true };
  }
  try {
    let dia = null;
    for (const n of DIAS_ATRAS) { const d = diaAntes(ahora, n); if (pngTieneAlgo(await pedir(urlPrueba(d)))) { dia = d; break; } }
    if (!dia) throw new Error('la NASA no tiene imagen de los últimos ' + DIAS_ATRAS.length + ' días');
    const jpg = await pedir(urlImagen(dia));
    if (!esJpeg(jpg)) throw new Error('la imagen no llegó entera');
    return { salida: { json: { fuente: 'NASA GIBS, GHRSST MUR', dia, t: ahora.toISOString(), img: 'pacifico.jpg', error: null }, jpg }, pidio: true, bien: true };
  } catch (e) {
    const error = String(e.message || e);
    return { salida: prev ? { json: { ...prev.json, error, intento: ahora.toISOString() }, jpg: prev.jpg } : null, pidio: true, bien: false, error };
  }
}

module.exports = { CADA_D, urlPrueba, urlImagen, pngTieneAlgo, armarPacifico };
if (require.main === module) (async () => {
  const [, , dirAnt, dirSal] = process.argv;
  let anterior = null;
  try { anterior = { json: JSON.parse(fs.readFileSync(path.join(dirAnt, 'pacifico.json'), 'utf8')), jpg: fs.readFileSync(path.join(dirAnt, 'pacifico.jpg')) }; } catch (e) {}
  const r = await armarPacifico(anterior, new Date());
  console.log(!r.pidio ? 'Pacífico: la imagen guardada es del ' + r.salida.json.dia + '; no toca renovarla.'
    : r.bien ? 'Pacífico: imagen nueva del ' + r.salida.json.dia + '.' : 'Pacífico: la NASA no respondió (' + r.error + ')' + (r.salida ? '; queda la del ' + r.salida.json.dia + '.' : '.'));
  if (r.salida) {
    fs.writeFileSync(path.join(dirSal, 'pacifico.jpg'), r.salida.jpg);
    fs.writeFileSync(path.join(dirSal, 'pacifico.json'), JSON.stringify(r.salida.json));
  }
  if (!r.bien) process.exit(1);
})();
