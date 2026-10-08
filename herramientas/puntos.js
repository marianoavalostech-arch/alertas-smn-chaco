// Genera los puntos interiores de cada municipio que usa el script de Google para saber si una alerta del SMN lo toca.
// Salen de los límites del mapa (GEO.mun en index.html): una grilla cada 0,1° (unos 10 km), dejando 0,04° (unos 4 km) de margen
// respecto del borde, para que una zona alertada dibujada sobre el límite no alcance al municipio vecino.
// Uso, si cambia el mapa:  node herramientas/puntos.js   y pegar el renglón que imprime en apps-script/alertas-smn-apps-script.gs
const fs = require('fs'), path = require('path');
const PASO = 0.1, MARGEN = 0.04;

// Anillos [lat, lon] de un contorno del mapa (décimas de unidad: x = (lon + 63,7) * 1000, y = (-24 - lat) * 1120).
function anillos(d) {
  const out = []; let x = 0, y = 0, actual = null;
  for (const t of d.match(/[Mlz]|-?\d+(?:\.\d+)?/g)) {
    if (t === 'M') { actual = []; out.push(actual); x = y = null; continue; }
    if (t === 'l' || t === 'z') continue;
    const n = Number(t);
    if (actual.pend == null) { actual.pend = n; continue; }
    if (x == null) { x = actual.pend; y = n; } else { x += actual.pend; y += n; }
    actual.pend = null; actual.push([-24 - y / 1120, x / 1000 - 63.7]);
  }
  return out;
}
function dentro(pt, pol) {
  const x = pt[1], y = pt[0]; let ok = false;
  for (let i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    const xi = pol[i][1], yi = pol[i][0], xj = pol[j][1], yj = pol[j][0];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
}
const r2 = v => Math.round(v * 100) / 100;

function puntos(mun) {
  return mun.map(m => {
    const A = anillos(m[1]), en = p => A.some(a => dentro(p, a)), out = [];
    const lats = A.flat().map(p => p[0]), lons = A.flat().map(p => p[1]);
    for (let la = Math.ceil(Math.min(...lats) / PASO) * PASO; la <= Math.max(...lats); la += PASO)
      for (let lo = Math.ceil(Math.min(...lons) / PASO) * PASO; lo <= Math.max(...lons); lo += PASO)
        if ([[0, 0], [MARGEN, 0], [-MARGEN, 0], [0, MARGEN], [0, -MARGEN]].every(q => en([la + q[0], lo + q[1]]))) out.push([r2(la), r2(lo)]);
    return out;
  });
}
function leerGeo() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  return JSON.parse(/^const GEO=(\{.*\});?\s*$/m.exec(html)[1]);
}
module.exports = { puntos, anillos, dentro, leerGeo };
if (require.main === module) console.log('var PUNTOS = ' + JSON.stringify(puntos(leerGeo().mun)) + ';');
