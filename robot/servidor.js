// Robot de la copia del servidor: lo corre la misma tarea que el robot de la lluvia (.github/workflows/lluvia.yml).
// Baja el resultado del script de Google (alertas del SMN, ríos, pronósticos, Yacyretá, lluvia medida y ONI)
// y lo deja tal cual en servidor.json, en la rama "datos". La página lee primero esa copia: GitHub la entrega
// a muchas visitas a la vez, y así el script de Google y las fuentes (INA, SMN) no reciben un pedido por cada visita.
// Si el script no responde, responde algo roto o una copia más vieja que la anterior, queda la anterior.
// Uso: node robot/servidor.js anterior.json servidor.json
const fs = require('fs'), path = require('path');

// La dirección del script sale de la página, para no tenerla escrita en dos lugares.
function urlScript() {
  const m = /const SMN_URL='(https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec)'/.exec(fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'));
  if (!m) throw new Error('no se encontró la dirección del script en index.html');
  return m[1];
}

// Hora de la copia: la de la última corrida del script (la misma que usa la página).
function hora(j) {
  const t = new Date(j && j.robot && j.robot.t);
  return isNaN(t) ? null : t;
}

// El script de Google corre cada hora. Si la copia que queda tiene más de AVISO_H horas (o no hay ninguna),
// el script puede haberse detenido: la tarea termina marcada con error y GitHub le avisa por correo a quien la mantiene.
// Sin esto nadie se entera, porque el robot copia lo mismo ("sin novedades") y el correo del script lo manda el propio script.
const AVISO_H = 6;
function atrasada(j, ahora, horas = AVISO_H) {
  const t = hora(j);
  return !t || ahora - t > horas * 36e5;
}

// Forma mínima: la misma revisión que hace la página antes de usarla, más las alertas.
function vale(j) {
  return !!j && typeof j === 'object' && !Array.isArray(j) && !j.error && !!hora(j) &&
    !!j.datos && typeof j.datos === 'object' && Array.isArray(j.areas) && Array.isArray(j.fechas) &&
    !!j.alertas && typeof j.alertas === 'object' && !isNaN(new Date(j.capturado));
}

async function pedir(url, pausa) {
  let error;
  for (let i = 0; i < 2; i++) {
    if (i) await new Promise(r => setTimeout(r, pausa));
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) { error = new Error('HTTP ' + r.status); continue; }
      const texto = await r.text();
      if (texto.length > 1e6) throw new Error('respuesta demasiado grande');
      return JSON.parse(texto);
    } catch (e) { error = e; }
  }
  throw error;
}

// Devuelve { salida, bien, motivo }. salida es lo que se guarda (null si no hay nada que guardar).
async function armarCopia(anterior, url, pausa) {
  const prev = vale(anterior) ? anterior : null;
  let j;
  try { j = await pedir(url, pausa); } catch (e) { return { salida: prev, bien: false, motivo: String(e.message || e) }; }
  if (!vale(j)) return { salida: prev, bien: false, motivo: 'respuesta sin la forma esperada' };
  if (prev && hora(j) <= hora(prev)) return { salida: prev, bien: true, motivo: 'sin novedades' };
  return { salida: j, bien: true, motivo: 'copia renovada' };
}

module.exports = { urlScript, hora, vale, armarCopia, atrasada, AVISO_H };
if (require.main === module) (async () => {
  let anterior = null;
  try { anterior = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')); } catch (e) {}
  const r = await armarCopia(anterior, urlScript(), 15000);
  console.log('Copia del servidor: ' + r.motivo + '.');
  if (r.salida) fs.writeFileSync(process.argv[3], JSON.stringify(r.salida));
  // La tarea de GitHub lee "atrasada" y, después de guardar, termina con error (así llega el aviso por correo).
  if (atrasada(r.salida, new Date())) {
    console.log('Atención: la copia del script de Google tiene más de ' + AVISO_H + ' horas. Puede estar detenido: mirar en script.google.com sus Ejecuciones y Activadores.');
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, 'atrasada=si\n');
  }
  if (!r.bien) process.exit(1);
})();
