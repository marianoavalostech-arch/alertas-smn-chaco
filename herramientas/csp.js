// Regla del navegador (Content-Security-Policy) de netlify.toml: le dice al navegador que solo corra el código de la página
// y que solo se conecte a las fuentes conocidas. Si alguien lograra meter código en la página, el navegador no lo ejecutaría.
// El código de la página se identifica por su huella (SHA-256): cada vez que cambia index.html, la huella cambia.
// Uso, después de cambiar index.html:  node herramientas/csp.js
// Escribe la huella nueva en netlify.toml. Las pruebas (pruebas/reglas.test.js) fallan si quedó vieja.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const raiz = path.join(__dirname, '..');

// Huella del único <script> de la página, en el formato que pide la regla.
function huella(html) {
  const m = /<script>([\s\S]*?)<\/script>/.exec(html);
  if (!m || html.split('<script').length !== 2) throw new Error('la página tiene que tener un solo <script>, sin src');
  return "'sha256-" + crypto.createHash('sha256').update(m[1], 'utf8').digest('base64') + "'";
}

module.exports = { huella };
if (require.main === module) {
  const h = huella(fs.readFileSync(path.join(raiz, 'index.html'), 'utf8'));
  const f = path.join(raiz, 'netlify.toml'), toml = fs.readFileSync(f, 'utf8');
  const nuevo = toml.replace(/script-src '[^']+'/, 'script-src ' + h);
  if (nuevo === toml && !toml.includes('script-src ' + h)) throw new Error('no se encontró script-src en netlify.toml');
  fs.writeFileSync(f, nuevo);
  console.log('Huella del código de la página: ' + h + (nuevo === toml ? ' (ya estaba al día).' : ' (netlify.toml actualizado).'));
}
