// Archivo de "Digital Asset Links" para la app de Google Play (aplicación web de confianza, TWA).
// Le dice a Android que la app y el sitio son del mismo dueño: así la app abre el sitio a pantalla completa,
// sin la barra de dirección de Chrome arriba. Sin este archivo la app igual funciona, pero se ve esa barra.
//
// Uso, cuando ya existe la app en Play Console:
//   node herramientas/assetlinks.js <nombre-del-paquete> <huella-SHA-256> [otra huella]
// Las huellas (32 pares de letras y números separados por ":") salen de Play Console → la app → Prueba y lanzamiento
// → Configuración → Integridad de la app → Firma de apps: la del "Certificado de la clave de firma de apps" y la del
// "Certificado de la clave de carga". La de la clave de carga también viene en el archivo assetlinks.json que entrega PWABuilder.
// Escribe .well-known/assetlinks.json (Netlify publica esa carpeta). Las pruebas revisan que tenga la forma correcta.
// Si el sitio cambia de dirección, este archivo tiene que estar también en la dirección nueva (y hay que volver a armar la app).
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');

const PAQUETE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/i;
const HUELLA = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const RELACION = 'delegate_permission/common.handle_all_urls';

// Pasa una huella a la forma que pide Android: mayúsculas y con ":" (acepta minúsculas o sin los dos puntos).
function normalizar(h) {
  const s = String(h).trim().toUpperCase().replace(/[^0-9A-F]/g, '');
  return s.length === 64 ? s.match(/../g).join(':') : String(h).trim();
}

function armar(paquete, huellas) {
  const lista = [...new Set(huellas.map(normalizar))];
  const j = [{ relation: [RELACION], target: { namespace: 'android_app', package_name: paquete, sha256_cert_fingerprints: lista } }];
  const error = revisar(j);
  if (error) throw new Error(error);
  return j;
}

// Devuelve '' si el archivo está bien, o qué le falta.
function revisar(j) {
  if (!Array.isArray(j) || !j.length) return 'tiene que ser una lista con al menos una entrada';
  for (const e of j) {
    if (!e || !Array.isArray(e.relation) || !e.relation.includes(RELACION)) return 'falta la relación ' + RELACION;
    const t = e.target;
    if (!t || t.namespace !== 'android_app') return 'el destino tiene que ser una app de Android (android_app)';
    if (!PAQUETE.test(t.package_name || '')) return 'nombre de paquete no válido: ' + t.package_name;
    if (!Array.isArray(t.sha256_cert_fingerprints) || !t.sha256_cert_fingerprints.length) return 'faltan las huellas';
    for (const h of t.sha256_cert_fingerprints) if (!HUELLA.test(h)) return 'huella no válida (32 pares separados por ":"): ' + h;
  }
  return '';
}

module.exports = { armar, revisar, normalizar };

if (require.main === module) {
  const [paquete, ...huellas] = process.argv.slice(2);
  if (!paquete || !huellas.length) {
    console.error('Uso: node herramientas/assetlinks.js <nombre-del-paquete> <huella-SHA-256> [otra huella]');
    process.exit(1);
  }
  const j = armar(paquete, huellas), dir = path.join(raiz, '.well-known');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'assetlinks.json'), JSON.stringify(j, null, 2) + '\n');
  console.log('Listo: .well-known/assetlinks.json para ' + paquete + ' con ' + j[0].target.sha256_cert_fingerprints.length + ' huella(s).');
}
