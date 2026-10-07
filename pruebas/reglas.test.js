// Pruebas de las reglas del sitio y del script de Google.
// Uso, desde la carpeta del repositorio:  node pruebas/reglas.test.js
// No consulta ninguna fuente: carga el código con un navegador simulado y revisa las cuentas.
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const raiz = path.join(__dirname, '..');
let ok = 0;
const prueba = (nombre, f) => { f(); ok++; console.log('bien  ' + nombre); };

/* ---------- sitio ---------- */
// Elemento simulado: acepta cualquier uso sin hacer nada.
const nada = new Proxy(function () {}, {
  get: (t, p) => p === Symbol.iterator ? function* () {} : p === Symbol.toPrimitive ? () => '' : p === 'length' ? 0 : nada,
  apply: () => nada, set: () => true
});
const html = fs.readFileSync(path.join(raiz, 'index.html'), 'utf8');
const codigo = /<script>\n([\s\S]*)<\/script>/.exec(html)[1];
const sitio = vm.createContext({
  document: { getElementById: () => nada, addEventListener() {}, hidden: false },
  addEventListener() {}, matchMedia: () => ({ matches: false }), performance: { now: () => 0 },
  requestAnimationFrame() {}, cancelAnimationFrame() {}, setInterval() {}, setTimeout() {}, clearTimeout() {},
  fetch: () => Promise.reject(new Error('sin red')), localStorage: { getItem: () => null, setItem() {} },
  AbortController, Intl, console, Promise, JSON, Math, Date, Number, String, Array, Map, Error
});
vm.runInContext(codigo, sitio);
const S = c => vm.runInContext(c, sitio);

prueba('umbrales de lluvia', () => {
  const n = (cayo, viene, max) => S(`nivelLluvia({cayo:${cayo},viene:${viene},max:${max}})`);
  assert.strictEqual(n(0, 0, 0), 0);
  assert.strictEqual(n(0, 49, 34), 0);
  assert.strictEqual(n(0, 50, 0), 1);
  assert.strictEqual(n(0, 10, 35), 1);
  assert.strictEqual(n(60, 0, 0), 1);
  assert.strictEqual(n(45, 45, 0), 1);
  assert.strictEqual(n(0, 100, 0), 2);
  assert.strictEqual(n(0, 10, 70), 2);
  assert.strictEqual(n(80, 60, 0), 2);
  assert.strictEqual(n(80, 59, 0), 1);
});

prueba('suma de lluvia: lo caído es antes de hoy, lo que viene incluye hoy', () => {
  const r = S(`sumarLluvia(['2026-10-05','2026-10-06','2026-10-07','2026-10-08'],[10,20,5,40],'2026-10-07')`);
  assert.strictEqual(r.cayo, 30); assert.strictEqual(r.viene, 45);
  assert.strictEqual(r.max, 40); assert.strictEqual(r.maxDia, '2026-10-08');
});

prueba('río: colores según altura, tendencia y alerta de la APA', () => {
  const rio = (hoy, obs) => S(`hoy='${hoy}';LISTO=true;D.rio={datos:{obs:${JSON.stringify(obs)}},vivo:true,t:new Date()};riesgoRio()`);
  // Fuera de las fechas de la alerta de la APA cargada (y de sus 30 días de aviso)
  assert.strictEqual(rio('2027-03-10', [['2027-03-07', 4.0], ['2027-03-10', 4.0]]).c, 'verde');
  assert.strictEqual(rio('2027-03-10', [['2027-03-07', 5.5], ['2027-03-10', 5.7]]).c, 'amarillo');   // cerca y creciendo
  assert.strictEqual(rio('2027-03-10', [['2027-03-07', 5.7], ['2027-03-10', 5.7]]).c, 'verde');      // cerca pero estable
  assert.strictEqual(rio('2027-03-10', [['2027-03-10', 6.1]]).c, 'amarillo');
  assert.strictEqual(rio('2027-03-10', [['2027-03-10', 6.5]]).c, 'rojo');
  assert.strictEqual(rio('2027-03-10', [['2027-03-06', 6.6]]).c, 'gris');                             // lectura de hace 4 días
  // Con la alerta de la APA vigente no baja de amarillo
  const a = S('APA');
  assert.strictEqual(rio(a.fecha, [[a.fecha, 3.0]]).c, 'amarillo');
});

prueba('SMN: piso del color y franjas que ya pasaron', () => {
  S(`hoy='2026-10-07';SMN={emitido:'2026-10-07T03:00:00Z',capturado:'2026-10-07T03:00:00Z',fechas:['2026-10-07','2026-10-08'],
     areas:GEO.mun.map((m,i)=>i),alertas:{0:[['2026-10-07',41,3,3,0,0]],1:[['2026-10-08',37,0,0,5,0]],2:[['2026-10-07',41,0,4,0,0]]}}`);
  S('horaAR=()=>5');
  assert.strictEqual(S('pisoSMN(0).n'), 1);            // amarilla: piso amarillo
  assert.strictEqual(S('pisoSMN(1).n'), 2);            // roja: rojo
  assert.strictEqual(S('pisoSMN(2).n'), 1);            // naranja: piso amarillo (decisión tomada)
  assert.strictEqual(S('pisoSMN(3)'), null);
  S('horaAR=()=>7');                                   // terminó la madrugada, sigue la mañana
  assert.deepStrictEqual(Array.from(S('smnDe(0)[0].fr')), ['mañana']);
  S('horaAR=()=>13');                                  // la alerta de hoy ya pasó
  assert.strictEqual(S('pisoSMN(0)'), null);
  assert.strictEqual(S('pisoSMN(2)'), null);
  assert.strictEqual(S('pisoSMN(1).n'), 2);            // la de mañana sigue
});

prueba('copia del servidor: solo si es reciente y tiene la forma esperada', () => {
  const d = (min, extra) => S(`delServidor('caudal',{datos:{caudal:{t:new Date(Date.now()-${min}*60e3).toISOString(),dias:['2026-10-07'],q:[1]${extra || ''}}}})`);
  assert.ok(d(30));
  assert.strictEqual(d(130), null);
  assert.strictEqual(S(`delServidor('caudal',{datos:{caudal:{t:new Date().toISOString(),dias:['a','b'],q:[1]}}})`), null);
  assert.strictEqual(S(`delServidor('caudal',{})`), null);
  assert.strictEqual(S(`delServidor('caudal',null)`), null);
});

prueba('El Niño: el dato del servidor no puede ser más viejo que el cargado a mano', () => {
  const u = S('ONI[ONI.length-1]');
  S(`SRV={datos:{oni:{t:new Date().toISOString(),v:[['2020','ene-mar',0.1],['2020','feb-abr',0.2],['2020','mar-may',0.3]]}}}`);
  assert.strictEqual(S('oniServidor()'), null);
  S(`SRV={datos:{oni:{t:new Date().toISOString(),v:[['2020','ene-mar',0.1],['2020','feb-abr',0.2],['${u[0]}','${u[1]}',${u[2]}]]}}}`);
  assert.ok(S('oniServidor()'));
  S(`SRV={datos:{oni:{t:new Date().toISOString(),v:[['2020','ene-mar',0.1],['2020','feb-abr',0.2],['2099','<b>','x']]}}}`);
  assert.strictEqual(S('oniServidor()'), null);
});

/* ---------- script de Google ---------- */
const gs = vm.createContext({ console, JSON, Math, Date, Number, String, Array, Error, RegExp, isFinite, isNaN });
vm.runInContext(fs.readFileSync(path.join(raiz, 'apps-script', 'alertas-smn-apps-script.gs'), 'utf8'), gs);

prueba('script: los centros coinciden con los municipios del mapa', () => {
  const mun = S('GEO.mun.map(m=>[m[2],m[3]])'), cen = vm.runInContext('CENTROS', gs);
  assert.strictEqual(cen.length, mun.length);
  cen.forEach((c, i) => { assert.ok(Math.abs(c[0] - mun[i][0]) < 0.011 && Math.abs(c[1] - mun[i][1]) < 0.011, 'municipio ' + i); });
  assert.deepStrictEqual(JSON.parse(JSON.stringify(vm.runInContext('LOCS', gs))), JSON.parse(JSON.stringify(S('LOCS.map(l=>[l.lat,l.lon])'))));
});

prueba('script: punto dentro de un polígono', () => {
  const cuadro = [[-26, -61], [-26, -59], [-28, -59], [-28, -61]];
  assert.strictEqual(gs.dentro([-27, -60], cuadro), true);
  assert.strictEqual(gs.dentro([-25, -60], cuadro), false);
});

prueba('script: alerta CAP con la corrección de 3 horas y franjas', () => {
  const xml = '<alert><status>Actual</status><msgType>Alert</msgType><sent>2026-10-07T09:00:00-03:00</sent><info><event>Tormentas</event><severity>Severe</severity>' +
    '<onset>2026-10-07T15:00:00-03:00</onset><expires>2026-10-07T21:00:00-03:00</expires><area><polygon>-20,-70 -20,-50 -35,-50 -35,-70</polygon></area></info></alert>';
  const c = gs.leerCap(xml);
  assert.strictEqual(c.nivel, 4); assert.strictEqual(c.ev, 41);
  const j = gs.armar([c], '2026-10-07', new Date('2026-10-07T13:00:00Z'));
  // 15 a 21 rotulado -03:00 son en realidad las 12 a 18 de Argentina: solo la tarde
  assert.deepStrictEqual(JSON.parse(JSON.stringify(j.alertas[0])), [['2026-10-07', 41, 0, 0, 4, 0]]);
  assert.strictEqual(j.areas.length, 70);
});

prueba('script: tabla ONI de la NOAA', () => {
  const t = 'SEAS  YR   TOTAL   ANOM\n DJF 2026  26.10  -0.40\n JFM 2026  26.50  -0.10\n FMA 2026  27.30   0.11\n MAM 2026  27.90   0.46\n' +
    ' AMJ 2026  28.30   0.95\n MJJ 2026  28.50   1.39\n JJA 2026  28.60   1.80\n JAS 2026  28.80   2.16\n';
  const o = JSON.parse(JSON.stringify(gs.leerOni(t)));
  assert.strictEqual(o.v.length, 6);
  assert.deepStrictEqual(o.v[5], ['2026', 'jul-sep', 2.16]);
  assert.deepStrictEqual(o.v[0], ['2026', 'feb-abr', 0.11]);
  assert.throws(() => gs.leerOni('<html>error</html>'));
});

prueba('script: río, una lectura por día en hora de Argentina', () => {
  const r = JSON.parse(JSON.stringify(gs.normRio([
    { timestart: '2026-10-06T03:00:00.000Z', valor: 4.5 }, { timestart: '2026-10-05T03:00:00.000Z', valor: 4.4 },
    { timestart: '2026-10-06T15:00:00.000Z', valor: 4.6, timeupdate: '2026-10-06T16:00:00.000Z' }, { timestart: '2026-10-06T16:00:00.000Z', valor: 99 }
  ])));
  assert.deepStrictEqual(r.obs, [['2026-10-05', 4.4], ['2026-10-06', 4.6]]);
  assert.strictEqual(r.hora, '2026-10-06T15:00:00.000Z');
  assert.throws(() => gs.normRio([]));
});

prueba('script: si una fuente falla queda la copia anterior y las demás siguen', () => {
  const lluvia = n => JSON.stringify(Array.from({ length: n }, () => ({ daily: { time: ['2026-10-07'], precipitation_sum: [null] } })));
  const pedir = url => url.indexOf('ina.gob.ar') >= 0 ? { codigo: 500, texto: '' }
    : url.indexOf('flood-api') >= 0 ? { codigo: 200, texto: '{"daily":{"time":["2026-10-07"],"river_discharge":[17000]}}' }
    : url.indexOf('noaa') >= 0 ? { codigo: 200, texto: 'no es la tabla' }
    : { codigo: 200, texto: lluvia(url.split('latitude=')[1].split('&')[0].split(',').length) };
  const d = JSON.parse(JSON.stringify(gs.leerExtras('2026-10-07', new Date('2026-10-07T12:00:00Z'), { rio: { obs: [['2026-10-06', 4.6]], t: 'antes' } }, pedir)));
  assert.strictEqual(d.lluvia.mm.length, 6); assert.strictEqual(d.municipios.mm.length, 70);
  assert.strictEqual(d.lluvia.mm[0][0], 0);
  assert.strictEqual(d.rio.t, 'antes'); assert.ok(d.errores.rio); assert.ok(d.errores.oni); assert.strictEqual(d.oni, undefined);
  assert.strictEqual(d.caudal.t, '2026-10-07T12:00:00.000Z');
});

console.log('\n' + ok + ' pruebas bien.');
