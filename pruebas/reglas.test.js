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

prueba('río: colores según altura, tendencia y pronóstico del INA', () => {
  const rio = (hoy, obs, prono) => S(`hoy='${hoy}';LISTO=true;D.rio={datos:{obs:${JSON.stringify(obs)}},vivo:true,t:new Date()};
    D.prono=${prono ? `{datos:${JSON.stringify(prono)},vivo:true,t:new Date()}` : '{datos:null}'};riesgoRio()`);
  // Sin pronóstico
  assert.strictEqual(rio('2027-03-10', [['2027-03-07', 4.0], ['2027-03-10', 4.0]]).c, 'verde');
  assert.strictEqual(rio('2027-03-10', [['2027-03-07', 5.5], ['2027-03-10', 5.7]]).c, 'amarillo');   // cerca y creciendo
  assert.strictEqual(rio('2027-03-10', [['2027-03-07', 5.7], ['2027-03-10', 5.7]]).c, 'verde');      // cerca pero estable
  assert.strictEqual(rio('2027-03-10', [['2027-03-10', 6.1]]).c, 'amarillo');
  assert.strictEqual(rio('2027-03-10', [['2027-03-10', 6.5]]).c, 'rojo');
  assert.strictEqual(rio('2027-03-10', [['2027-03-06', 6.6]]).c, 'gris');                             // lectura de hace 4 días
  // Con pronóstico: cuenta el valor más alto del rango, solo en fechas que faltan y si no es viejo
  const p = (emitido, filas) => ({ emitido: emitido + 'T03:00:00.000Z', p: filas });
  const bajo = [['2026-10-08', 4.4]];
  const real = p('2026-10-06', [['2026-10-06', 4.27, 4.27, 4.27], ['2026-10-13', 4.9, 5.34, 5.7], ['2026-10-20', 5.2, 5.55, 6]]);
  assert.strictEqual(rio('2026-10-08', bajo, real).c, 'amarillo');                                     // el máximo toca 6,00 m
  assert.ok(rio('2026-10-08', bajo, real).por.includes('20/10'));
  assert.strictEqual(rio('2026-10-08', bajo, p('2026-10-06', [['2026-10-13', 4.9, 5.34, 5.7], ['2026-10-20', 5.2, 5.55, 5.99]])).c, 'verde');
  assert.strictEqual(rio('2026-10-12', [['2026-10-12', 4.4]], p('2026-10-09', [['2026-10-10', 5, 6.2, 6.4], ['2026-10-20', 5, 5.5, 5.9]])).c, 'verde');   // la fecha alta ya pasó
  assert.strictEqual(rio('2026-10-15', [['2026-10-15', 4.4]], p('2026-10-06', [['2026-10-20', 5.2, 6.2, 6.4]])).c, 'verde');   // pronóstico de hace 9 días: no se usa
  assert.strictEqual(rio('2026-10-08', [['2026-10-03', 4.0]], real).c, 'amarillo');                    // lectura vieja, pero el pronóstico avisa
  assert.strictEqual(rio('2026-10-08', [['2026-10-08', 6.6]], real).c, 'rojo');                        // el rojo sale solo de la lectura
  assert.strictEqual(rio('2026-10-08', bajo, p('2026-10-06', [['2026-10-13', 6.4, 6.7, 7]])).c, 'amarillo');   // el pronóstico solo llega a amarillo
  S(`D.prono={datos:null}`);
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

prueba('datos raros: no pasan la revisión de forma y no traban la página', () => {
  assert.ok(S(`FORMA.rio({obs:[['2026-10-06',4.27]],hora:'2026-10-06T12:00:00Z',act:null})`));
  assert.strictEqual(S(`FORMA.rio({obs:[['2026-10-06',4.27]],hora:'basura'})`), false);
  assert.strictEqual(S(`FORMA.rio({obs:[['ayer',4.27]]})`), false);
  assert.strictEqual(S(`FORMA.rio({obs:[['2026-10-06','4']]})`), false);
  // Una sección que falla no corta a las demás, y el dato que la rompió se descarta
  S(`D.rio={datos:{obs:[['2026-10-06',4.27]]},vivo:true,t:new Date()};var pasos=0;seguro(()=>{pasos++;if(D.rio.datos)throw new Error('x')},['rio'])`);
  assert.strictEqual(S('pasos'), 2); assert.strictEqual(S('D.rio.datos'), null);
});

prueba('lluvia: la copia del servidor tiene que ser de hoy, y no se inventa un cero si faltan datos', () => {
  const dias = h => Array.from({ length: 14 }, (_, i) => S(`masDias('${h}',${i - 7})`));
  const copia = h => S(`hoy='2026-10-07';delServidor('lluvia',{datos:{lluvia:{t:new Date().toISOString(),dias:${JSON.stringify(dias(h))},mm:LOCS.map(()=>Array(14).fill(1))}}})`);
  assert.ok(copia('2026-10-07'));
  assert.strictEqual(copia('2026-10-06'), null);
  assert.strictEqual(S(`mmDe({daily:{precipitation_sum:[1,null,2]}})`)[1], 0);
  assert.throws(() => S(`mmDe({daily:{precipitation_sum:[null,null,null,null,1]}})`));
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
  assert.deepStrictEqual(JSON.parse(JSON.stringify(j.alertas[0])), [['2026-10-07', 41, 0, 0, 4, 0, 0]]);
  // Si la descripción nombra granizo y ráfagas, queda anotado (1 + 2) en el último lugar.
  const c2 = gs.leerCap(xml.replace('<event>', '<description>Tormentas con granizo de diversos tamaños y ráfagas intensas.</description><event>'));
  assert.strictEqual(c2.extra, 3);
  assert.strictEqual(gs.armar([c, c2], '2026-10-07', new Date('2026-10-07T13:00:00Z')).alertas[0][0][6], 3);
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

prueba('pronóstico del INA: el script y el sitio lo leen igual', () => {
  const f = (dia, valor, qualifier) => ({ timestart: dia + 'T03:00:00.000Z', timeend: dia + 'T03:00:00.000Z', valor, qualifier });
  const crudo = { id: 1, forecast_date: '2026-10-06T03:00:00.000Z', cal_id: 289, series: [{ series_id: 3523, pronosticos: [
    f('2026-10-20', 5.55, 'medio'), f('2026-10-13', 5.7, 'superior'), f('2026-10-13', 4.9, 'inferior'), f('2026-10-13', 5.34, 'medio'),
    f('2026-10-20', 6, 'superior'), f('2026-10-27', 99, 'medio'), f('2026-10-27', 5.8, 'superior'), f('2026-11-03', 5.1, 'medio')] }] };
  const g = JSON.parse(JSON.stringify(gs.normProno(crudo)));
  assert.strictEqual(g.emitido, '2026-10-06T03:00:00.000Z');
  // ordenado por fecha; sin mínimo o máximo se usa el valor central; un valor imposible descarta esa fecha
  assert.deepStrictEqual(g.p, [['2026-10-13', 4.9, 5.34, 5.7], ['2026-10-20', 5.55, 5.55, 6], ['2026-11-03', 5.1, 5.1, 5.1]]);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(S(`NORM.prono(${JSON.stringify(crudo)})`))), g);
  assert.ok(S(`FORMA.prono(${JSON.stringify(g)})`));
  assert.strictEqual(S(`FORMA.prono({emitido:'2026-10-06T03:00:00.000Z',p:[['2026-10-13',4.9,'5.34',5.7]]})`), false);
  assert.strictEqual(S(`FORMA.prono({p:[['2026-10-13',4.9,5.34,5.7]]})`), false);
  assert.throws(() => gs.normProno({ forecast_date: '2026-10-06T03:00:00.000Z', series: [] }));
  assert.throws(() => gs.normProno({ series: [{ pronosticos: [f('2026-10-13', 5, 'medio')] }] }));
  assert.throws(() => S(`NORM.prono({message:'error'})`));
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
  assert.ok(d.errores.prono); assert.strictEqual(d.prono, undefined);
  assert.strictEqual(d.caudal.t, '2026-10-07T12:00:00.000Z');
});

prueba('script: si falla el canal del SMN quedan las alertas anteriores y lo demás se renueva', () => {
  const pedir = url => url.indexOf('flood-api') >= 0 ? { codigo: 200, texto: '{"daily":{"time":["2026-10-07"],"river_discharge":[17000]}}' } : { codigo: 500, texto: '' };
  const antes = { capturado: 'antes', alertas: { 0: [] }, datos: { rio: { t: 'antes' } } };
  const r = gs.juntar(antes, '2026-10-07', new Date('2026-10-07T12:00:00Z'), () => { throw new Error('canal caído'); }, pedir);
  assert.ok(r.falla); assert.strictEqual(r.datos.capturado, 'antes');
  assert.strictEqual(r.datos.datos.caudal.t, '2026-10-07T12:00:00.000Z'); assert.strictEqual(r.datos.datos.rio.t, 'antes');
  const b = gs.juntar(antes, '2026-10-07', new Date('2026-10-07T12:00:00Z'), () => ({ capturado: 'ahora', leidas: 3 }), pedir);
  assert.strictEqual(b.falla, null); assert.strictEqual(b.datos.capturado, 'ahora'); assert.ok(b.datos.datos.caudal);
});

(async () => {
  // Robot de la lluvia, con Open-Meteo simulado: los municipios fallan y queda la copia anterior
  const { armar } = require('../robot/lluvia.js'), real = global.fetch;
  const dia = Array.from({ length: 14 }, (_, i) => '2026-10-' + String(i + 1).padStart(2, '0'));
  global.fetch = async url => { const n = url.split('latitude=')[1].split('&')[0].split(',').length;
    return n > 6 ? { ok: false, status: 429 } : { ok: true, json: async () => Array.from({ length: n }, () => ({ daily: { time: dia, precipitation_sum: dia.map(() => 2) } })) }; };
  const r = await armar({ datos: { municipios: { t: 'antes' } } }, new Date('2026-10-08T12:00:00Z'), 1);
  global.fetch = real;
  prueba('robot de la lluvia: mismo formato que la copia del servidor, y si falla queda lo anterior', () => {
    assert.strictEqual(r.bien, 1); assert.strictEqual(r.salida.datos.errores.municipios, 'HTTP 429');
    assert.strictEqual(r.salida.datos.municipios.t, 'antes');
    assert.ok(S(`hoy='2026-10-08';var real=Date.now;Date.now=()=>new Date('2026-10-08T12:30:00Z').getTime();var x=delServidor('lluvia',${JSON.stringify(r.salida)});Date.now=real;x`));
  });

  // La página nunca le pide la lluvia a Open-Meteo: usa la copia del robot aunque esté atrasada
  S(`var llamadas=[];fetch=u=>{llamadas.push(String(u));return Promise.reject(new Error('sin red'))};
     var copiaRobot=h=>{const t=new Date(Date.now()-h*36e5),d0=diaAR(t),dias=Array.from({length:14},(_,i)=>masDias(d0,i-7));
       return {datos:{lluvia:{t:t.toISOString(),dias,mm:LOCS.map(()=>Array(14).fill(1))}}}};`);
  S(`hoy=diaAR(new Date(Date.now()-3*36e5));LLU_P=Promise.resolve(copiaRobot(3));SRV_P=Promise.resolve(null);delete D.lluvia`);
  await S(`cargar('lluvia')`);
  const atrasada = S(`({vivo:D.lluvia.vivo,robot:!!D.lluvia.robot,horas:Math.round((Date.now()-D.lluvia.t)/36e5)})`);
  S(`hoy=masDias(diaAR(new Date()),1);LLU_P=Promise.resolve(copiaRobot(0));delete D.lluvia`);
  await S(`cargar('lluvia')`);
  const deAyer = S(`({vivo:D.lluvia.vivo,robot:!!D.lluvia.robot})`);
  S(`hoy=diaAR(new Date());LLU_P=Promise.resolve(null);delete D.lluvia;M.todos=null`);
  await S(`cargar('lluvia')`);
  const sinCopia = S(`({datos:D.lluvia.datos,error:!!D.lluvia.error})`);
  await S(`cargarTodos()`);
  prueba('lluvia: nunca se consulta Open-Meteo desde la página, y la copia atrasada se usa con su hora', () => {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(atrasada)), { vivo: true, robot: false, horas: 3 });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(deAyer)), { vivo: false, robot: true });
    assert.strictEqual(sinCopia.datos, null); assert.ok(sinCopia.error);
    assert.strictEqual(S(`M.todos`), 'error');
    assert.deepStrictEqual(S(`llamadas.filter(u=>u.includes('api.open-meteo.com'))`).length, 0);
  });

  // Script: lanza el robot con la clave guardada, la clave sobrevive al guardado y no sale por la dirección pública
  const props = { GITHUB_TOKEN: 'clave-de-prueba' }, pedidos = [];
  gs.PropertiesService = { getScriptProperties: () => ({
    getProperty: k => props[k] == null ? null : props[k], getProperties: () => Object.assign({}, props),
    setProperties: (o, borrar) => { if (borrar) for (const k in props) delete props[k]; Object.assign(props, o); } }) };
  gs.UrlFetchApp = { fetch: (u, o) => { pedidos.push({ u, o }); return { getResponseCode: () => 204, getContentText: () => '' }; } };
  gs.ContentService = { createTextOutput: t => ({ setMimeType: () => t }), MimeType: {} };
  const lanzado = vm.runInContext('lanzarRobot()', gs);
  vm.runInContext(`guardar(JSON.stringify({a:1}))`, gs);
  const publico = vm.runInContext('doGet()', gs);
  delete props.GITHUB_TOKEN;
  const sinClave = vm.runInContext('lanzarRobot()', gs);
  prueba('script: lanza el robot de la lluvia y no pierde ni muestra la clave', () => {
    assert.strictEqual(lanzado, 'bien'); assert.strictEqual(pedidos.length, 1);
    assert.ok(pedidos[0].u.endsWith('/actions/workflows/lluvia.yml/dispatches'));
    assert.strictEqual(pedidos[0].o.headers.Authorization, 'Bearer clave-de-prueba');
    assert.strictEqual(JSON.parse(pedidos[0].o.payload).ref, 'main');
    assert.strictEqual(publico, '{"a":1}'); assert.ok(!publico.includes('clave'));
    assert.strictEqual(sinClave, 'sin clave'); assert.strictEqual(pedidos.length, 1);
  });
  console.log('\n' + ok + ' pruebas bien.');
})();
