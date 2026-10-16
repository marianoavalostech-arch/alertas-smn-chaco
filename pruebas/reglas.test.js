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
const elementos = {};   // elementos de la página que una prueba quiere mirar
const sitio = vm.createContext({
  document: { getElementById: id => elementos[id] || nada, querySelectorAll: () => [], addEventListener() {}, hidden: false },
  addEventListener() {}, location: { hash: '' }, matchMedia: () => ({ matches: false }), performance: { now: () => 0 },
  requestAnimationFrame() {}, cancelAnimationFrame() {}, setInterval() {}, setTimeout() {}, clearTimeout() {},
  fetch: () => Promise.reject(new Error('sin red')), localStorage: { getItem: () => null, setItem() {} },
  AbortController, Intl, console, Promise, JSON, Math, Date, Number, String, Array, Map, Error
});
vm.runInContext(codigo, sitio);
const S = c => vm.runInContext(c, sitio);

prueba('correo de contacto: no está escrito en el HTML y se arma al cargar', () => {
  assert.ok(!html.includes('marianoavalos.tech@'), 'el correo no tiene que estar escrito tal cual');
  const a = {}; elementos.correo = a; S('armarCorreo()'); delete elementos.correo;
  assert.strictEqual(a.textContent, 'marianoavalos.tech@gmail.com');
  assert.ok(a.href.startsWith('mailto:marianoavalos.tech@gmail.com?subject='));
});

prueba('Hidroalerta Vilelas: enlace en el detalle de Puerto Vilelas y debajo del río, sin pedirle datos', () => {
  const v = S('VILELAS');
  assert.ok(v.includes('href="https://hidrometro.concejovilelas.com/#publica"') && v.includes('rel="noopener"'));
  assert.ok(/m\[0\]==='Puerto Vilelas'\?'<p>[^']*'\+VILELAS/.test(codigo), 'falta en el detalle del municipio');
  assert.ok(/lineaYacy\(\)\n\s*\+'<p class="meta">[^']*'\+VILELAS/.test(codigo), 'falta debajo del río');
  assert.ok(!/fetch\([^)]*concejovilelas/.test(codigo), 'la página no le pide datos');
});

prueba('secciones contraíbles: las principales siempre abiertas, las contraíbles empiezan cerradas, nada se pide con la sección cerrada', () => {
  const sec = id => (new RegExp('<section aria-labelledby="' + id + '"([^>]*)>').exec(html) || [])[1];
  for (const id of ['t-mapa', 't-smn', 't-hacer', 't-sem', 't-rio']) assert.ok(!/plegable/.test(sec(id)), id + ' no se puede cerrar');
  for (const id of ['t-otros', 't-lluvia', 't-anim', 't-nino', 't-fuentes', 't-acerca']) assert.ok(/class="plegable" data-cerrada data-pista="[^"]{10,80}"$/.test(sec(id)), id + ' empieza cerrada y dice qué tiene');
  assert.ok(/\.pleg\[aria-expanded="true"\]>\.tt>small\{display:none\}/.test(html), 'la pista se oculta al abrir');
  assert.ok(codigo.includes("const conSat=k=>abierta('t-anim')&&"), 'sin satélite con la animación cerrada');
  assert.ok(/if\(abierta\('t-nino'\)\)ir\(\);else alAbrir\('t-nino'/.test(codigo), 'el mapa del Pacífico espera a que se abra');
  assert.ok(/a\[href\^="#t-"\][^\n]*abrirSec/.test(codigo), 'los enlaces abren la sección');
  assert.strictEqual(S('abierta("t-otros")'), true, 'sin iniciar, todo cuenta como abierto');
});

prueba('umbrales de lluvia', () => {
  const n = (cayo, viene, max) => S(`nivelLluvia({cayo:${cayo},viene:${viene},max:${max}})`);
  assert.strictEqual(n(0, 0, 0), 0);
  assert.strictEqual(n(0, 69, 44), 0);
  assert.strictEqual(n(80, 0, 0), 0);      // lo ya caído, solo, no alcanza
  assert.strictEqual(n(0, 70, 0), 1);
  assert.strictEqual(n(0, 10, 45), 1);
  assert.strictEqual(n(60, 60, 0), 1);     // suman 120
  assert.strictEqual(n(0, 120, 0), 2);
  assert.strictEqual(n(0, 10, 80), 2);
  assert.strictEqual(n(100, 70, 0), 2);
  assert.strictEqual(n(100, 69, 0), 1);
});

prueba('suma de lluvia: lo caído es antes de hoy, lo que viene incluye hoy', () => {
  const r = S(`sumarLluvia(['2026-10-05','2026-10-06','2026-10-07','2026-10-08'],[10,20,5,40],'2026-10-07')`);
  assert.strictEqual(r.cayo, 30); assert.strictEqual(r.viene, 45);
  assert.strictEqual(r.max, 40); assert.strictEqual(r.maxDia, '2026-10-08');
});

prueba('río: colores según altura, tendencia y pronóstico del INA', () => {
  const rio = (hoy, obs, prono) => S(`hoy='${hoy}';LISTO=true;D.rio={datos:{obs:${JSON.stringify(obs)}},vivo:true,t:new Date()};
    D.prono=${prono ? `{datos:${JSON.stringify(prono)},vivo:true,t:new Date()}` : '{datos:null}'};riesgoRio()`);
  // Gráfico: las defensas de la ciudad (9,50 m) van como marca arriba mientras el río y el pronóstico están debajo de 8 m; desde 8 m, como línea
  const graf = (obs, prono) => { const e = { style: {} }; elementos.rio = e; rio('2027-03-10', obs, prono); S('pintarRio()'); delete elementos.rio; return e.innerHTML };
  let gr = graf([['2027-03-07', 5.5], ['2027-03-10', 5.6]]);
  assert.ok(gr.includes('class="defMarca"') && gr.includes('Defensas de la ciudad: unos 9,50 m') && !gr.includes('var(--titulo)" stroke-width'), 'lejos: solo la marca');
  gr = graf([['2027-03-07', 7.9], ['2027-03-10', 8.1]]);
  assert.ok(!gr.includes('class="defMarca"') && gr.includes('stroke="var(--titulo)"') && gr.includes('no protegen las islas ni la costa de afuera'), 'cerca: línea y leyenda');
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
  // Naranja: el valor más probable del INA llega a 6,50 m y el río todavía no (desde el 13/10/2026)
  assert.strictEqual(rio('2026-10-08', bajo, p('2026-10-06', [['2026-10-13', 6.4, 6.7, 7]])).c, 'naranja');
  assert.strictEqual(rio('2026-10-08', bajo, p('2026-10-06', [['2026-10-13', 6.0, 6.49, 7]])).c, 'amarillo');   // solo el más alto del rango pasa 6,50
  assert.strictEqual(rio('2026-10-08', bajo, p('2026-10-06', [['2026-10-13', 6.0, 6.5, 6.8]])).c, 'naranja');    // justo 6,50
  assert.strictEqual(rio('2026-10-08', [['2026-10-03', 4.0]], p('2026-10-06', [['2026-10-13', 6.4, 6.7, 7]])).c, 'naranja');   // lectura vieja, pronóstico al día
  assert.strictEqual(rio('2026-10-08', [['2026-10-08', 6.6]], p('2026-10-06', [['2026-10-13', 6.4, 6.7, 7]])).c, 'rojo');      // el río ya pasó 6,50
  assert.strictEqual(rio('2026-10-15', [['2026-10-15', 4.4]], p('2026-10-06', [['2026-10-20', 6.4, 6.7, 7]])).c, 'verde');     // pronóstico de hace 9 días: no se usa
  // Caso real del 13/10/2026: 5,27 m creciendo; INA 7,30 m para el 20/10 (entre 6,75 y 7,55)
  const dia13 = rio('2026-10-13', [['2026-10-06', 4.27], ['2026-10-10', 4.88], ['2026-10-13', 5.27]],
    p('2026-10-13', [['2026-10-13', 5.2, 5.3, 5.4], ['2026-10-20', 6.75, 7.3, 7.55], ['2026-10-27', 5.9, 6.39, 6.9]]));
  assert.strictEqual(dia13.c, 'naranja'); assert.strictEqual(dia13.et, 'Naranja');
  assert.ok(dia13.por.includes('7,30 m para el 20/10 (entre 6,75 y 7,55)') && dia13.por.includes('pasaría el nivel de evacuación (6,50 m)'), dia13.por);
  assert.ok(!/alerta naranja/i.test(dia13.por), 'no se presenta como alerta oficial');
  // Amarillo por pronóstico: nombra el nivel que alcanza el valor más alto del rango
  assert.ok(rio('2026-10-08', bajo, p('2026-10-06', [['2026-10-13', 6.0, 6.3, 6.6]])).por.includes('puede alcanzar el nivel de evacuación (6,50 m)'));
  assert.ok(rio('2026-10-08', bajo, real).por.includes('puede alcanzar el nivel de alerta (6,00 m)'));
  // Con el río arriba de la alerta y el pronóstico sin llegar a la evacuación, no repite "puede alcanzar el nivel de alerta"
  const arriba = rio('2026-10-08', [['2026-10-08', 6.2]], p('2026-10-06', [['2026-10-13', 6.0, 6.2, 6.4]]));
  assert.strictEqual(arriba.c, 'amarillo'); assert.ok(!arriba.por.includes('puede alcanzar'), arriba.por);
  // El semáforo pone el naranja entre el rojo y el amarillo, con su color
  assert.ok(codigo.includes("ORD={rojo:0,naranja:1,amarillo:2,gris:3,verde:4}"), 'orden del semáforo');
  assert.ok(/\.sem li\.naranja\{background:var\(--naranja-bg\)\}/.test(html) && /\.naranja \.luz\{background:var\(--naranja\)/.test(html), 'color del renglón naranja');
  assert.strictEqual((html.match(/--naranja:#[0-9a-f]{6}/g) || []).length, 1, 'naranja definido una vez (siempre claro)');
  assert.ok(!/prefers-color-scheme:\s*dark\)\s*\{/.test(html), 'sin modo oscuro: el sitio es siempre claro, como el portal');
  // El Paraguay no tiene naranja (no hay pronóstico en Puerto Bermejo)
  const py = codigo.slice(codigo.indexOf('function riesgoParaguay'), codigo.indexOf('/* ---------- pantalla'));
  assert.ok(py.length > 100 && !py.includes("'naranja'"));
  S(`D.prono={datos:null}`);
});

prueba('mapa: la costa del Paraná toma el color más alto entre la lluvia y el río', () => {
  const idx = n => S(`GEO.mun.findIndex(m=>m[0]==='${n}')`);
  const B = idx('Barranqueras'), V = idx('Puerto Vilelas'), C = idx('Isla del Cerrito'), F = idx('Fontana'), R = idx('Resistencia');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(S('RIBERA'))), ['Barranqueras', 'Puerto Vilelas', 'Isla del Cerrito']);
  assert.ok([B, V, C, F, R].every(i => i >= 0));
  const col = (lluvia, obs, prono) => JSON.parse(S(`hoy='2026-10-13';LISTO=true;SMN=SMN_VACIO;
    D.rio={datos:{obs:${JSON.stringify(obs)}},vivo:true,t:new Date()};D.prono=${prono ? `{datos:${JSON.stringify(prono)},vivo:true,t:new Date()}` : '{datos:null}'};
    M.R=${lluvia ? `LOCS.map(()=>({c:'${lluvia}',et:ETQ['${lluvia}'],por:'x'}))` : '[]'};
    M.est=${lluvia ? `Object.fromEntries(GEO.mun.map((m,i)=>[i,{c:'${lluvia}',ll:{cayo:0,viene:0,max:0}}]))` : '{}'};M.tEst=Date.now();M.todos=${lluvia ? "'listo'" : "''"};
    JSON.stringify([${B},${V},${C},${F},${R}].map(i=>{const k=colorDe(i);return [k.c,k.tipo,!!k.rio]}))`));
  const obs13 = [['2026-10-06', 4.27], ['2026-10-10', 4.88], ['2026-10-13', 5.27]];
  const pr13 = { emitido: '2026-10-13T03:00:00.000Z', p: [['2026-10-13', 5.2, 5.3, 5.4], ['2026-10-20', 6.75, 7.3, 7.55]] };
  // Caso real del 13/10: el renglón del Paraná en naranja pinta la costa; Fontana y Resistencia siguen con su lluvia
  assert.deepStrictEqual(col('verde', obs13, pr13), [['naranja', 'gran', true], ['naranja', 'gran', true], ['naranja', 'est', true], ['verde', 'gran', false], ['verde', 'seg', false]]);
  // La lluvia en rojo gana al naranja del río
  assert.deepStrictEqual(col('rojo', obs13, pr13).slice(0, 3).map(x => x[0] + x[2]), ['rojofalse', 'rojofalse', 'rojofalse']);
  // Río en verde: no cambia nada
  assert.deepStrictEqual(col('amarillo', [['2026-10-13', 4.0]]).slice(0, 3).map(x => x[0] + x[2]), ['amarillofalse', 'amarillofalse', 'amarillofalse']);
  // Río sobre la evacuación: rojo aunque la lluvia esté en amarillo
  assert.deepStrictEqual(col('amarillo', [['2026-10-13', 6.6]]).slice(0, 3).map(x => x[0]), ['rojo', 'rojo', 'rojo']);
  // Sin datos de lluvia todavía, el río igual pinta la costa
  assert.deepStrictEqual(col(null, obs13, pr13).slice(0, 3).map(x => x[0] + x[1]), ['naranjario', 'naranjario', 'naranjario']);
  // Leyenda con el naranja, aclarando que no es una alerta del SMN
  assert.ok(/data-c="naranja"[^<]*<i style="background:var\(--naranja\)[^>]*><\/i>Naranja: solo en la costa del Paraná[^<]*No es una alerta del SMN<\/button>/.test(html), 'leyenda');
  assert.strictEqual(S('ETQ.naranja'), 'Naranja');
  assert.ok(/#mInfo\.naranja\{border-color:var\(--naranja\)\}/.test(html), 'borde del detalle');
  S(`D.prono={datos:null};M.R=[];M.est={};M.todos=''`);
});

prueba('río Paraguay en Puerto Bermejo: colores según altura y tendencia', () => {
  const par = (hoy, obs) => S(`hoy='${hoy}';LISTO=true;D.paraguay={datos:{obs:${JSON.stringify(obs)}},vivo:true,t:new Date()};riesgoParaguay()`);
  assert.strictEqual(par('2027-03-10', [['2027-03-07', 3.6], ['2027-03-10', 3.6]]).c, 'verde');
  assert.strictEqual(par('2027-03-10', [['2027-03-07', 5.8], ['2027-03-10', 6.1]]).c, 'amarillo');   // cerca y creciendo
  assert.strictEqual(par('2027-03-10', [['2027-03-07', 6.1], ['2027-03-10', 6.1]]).c, 'verde');      // cerca pero estable
  assert.strictEqual(par('2027-03-10', [['2027-03-10', 6.5]]).c, 'amarillo');
  assert.strictEqual(par('2027-03-10', [['2027-03-10', 7.0]]).c, 'rojo');
  assert.strictEqual(par('2027-03-10', [['2027-03-06', 7.2]]).c, 'gris');                             // lectura de hace 4 días
  assert.strictEqual(S(`D.paraguay={datos:null};riesgoParaguay()`).c, 'gris');
  // El Bermejo no tiene niveles oficiales: se pinta sin la cuenta de "le faltan"
  const b = S(`hoy='2027-03-10';LISTO=true;D.bermejo={datos:{obs:[['2027-03-07',2.2],['2027-03-10',2.5]],hora:'2027-03-10T12:00:00Z'},vivo:true,t:new Date()};bloqueOtro('bermejo')`);
  assert.ok(b.includes('no publica niveles de alerta')); assert.ok(b.includes('creciendo')); assert.ok(!b.includes('NaN'));
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
  const d = min => S(`delServidor('yacy',{datos:{yacy:{t:new Date(Date.now()-${min}*60e3).toISOString(),obs:[['2026-10-07',20000]]}}})`);
  assert.ok(d(30));
  assert.strictEqual(d(130), null);
  assert.strictEqual(S(`delServidor('yacy',{datos:{yacy:{t:new Date().toISOString(),obs:[['a',1]]}}})`), null);
  assert.strictEqual(S(`delServidor('yacy',{datos:{yacy:{t:new Date().toISOString(),obs:[['2026-10-07',-5]]}}})`), null);
  assert.strictEqual(S(`delServidor('yacy',{})`), null);
  assert.strictEqual(S(`delServidor('yacy',null)`), null);
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

prueba('lluvia: la copia del servidor tiene que ser de hoy', () => {
  const dias = h => Array.from({ length: 14 }, (_, i) => S(`masDias('${h}',${i - 7})`));
  const copia = h => S(`hoy='2026-10-07';delServidor('lluvia',{datos:{lluvia:{t:new Date().toISOString(),dias:${JSON.stringify(dias(h))},mm:LOCS.map(()=>Array(14).fill(1))}}})`);
  assert.ok(copia('2026-10-07'));
  assert.strictEqual(copia('2026-10-06'), null);
});

prueba('SMN: si el informe lleva más de 3 horas sin renovar, se avisa', () => {
  const m = h => S(`SMN={capturado:new Date(Date.now()-${h}*36e5).toISOString()};smnMeta()`);
  assert.ok(!m(1).includes('sin renovar'));
  assert.ok(m(5).includes('sin renovar'));
  S('SMN=SMN_VACIO');
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

prueba('pronóstico del INA: lo que arma el script lo acepta el sitio', () => {
  const f = (dia, valor, qualifier) => ({ timestart: dia + 'T03:00:00.000Z', timeend: dia + 'T03:00:00.000Z', valor, qualifier });
  const crudo = { id: 1, forecast_date: '2026-10-06T03:00:00.000Z', cal_id: 289, series: [{ series_id: 3523, pronosticos: [
    f('2026-10-20', 5.55, 'medio'), f('2026-10-13', 5.7, 'superior'), f('2026-10-13', 4.9, 'inferior'), f('2026-10-13', 5.34, 'medio'),
    f('2026-10-20', 6, 'superior'), f('2026-10-27', 99, 'medio'), f('2026-10-27', 5.8, 'superior'), f('2026-11-03', 5.1, 'medio')] }] };
  const g = JSON.parse(JSON.stringify(gs.normProno(crudo)));
  assert.strictEqual(g.emitido, '2026-10-06T03:00:00.000Z');
  // ordenado por fecha; sin mínimo o máximo se usa el valor central; un valor imposible descarta esa fecha
  assert.deepStrictEqual(g.p, [['2026-10-13', 4.9, 5.34, 5.7], ['2026-10-20', 5.55, 5.55, 6], ['2026-11-03', 5.1, 5.1, 5.1]]);
  assert.ok(S(`FORMA.prono(${JSON.stringify(g)})`));
  assert.strictEqual(S(`FORMA.prono({emitido:'2026-10-06T03:00:00.000Z',p:[['2026-10-13',4.9,'5.34',5.7]]})`), false);
  assert.strictEqual(S(`FORMA.prono({p:[['2026-10-13',4.9,5.34,5.7]]})`), false);
  assert.throws(() => gs.normProno({ forecast_date: '2026-10-06T03:00:00.000Z', series: [] }));
  assert.throws(() => gs.normProno({ series: [{ pronosticos: [f('2026-10-13', 5, 'medio')] }] }));
});

prueba('script: si una fuente falla queda la copia anterior y las demás siguen', () => {
  const lluvia = n => JSON.stringify(Array.from({ length: n }, () => ({ daily: { time: ['2026-10-07'], precipitation_sum: [null] } })));
  const pedir = url => url.indexOf('ina.gob.ar') >= 0 ? { codigo: 500, texto: '' }
    : url.indexOf('noaa') >= 0 ? { codigo: 200, texto: 'no es la tabla' }
    : { codigo: 200, texto: lluvia(url.split('latitude=')[1].split('&')[0].split(',').length) };
  const d = JSON.parse(JSON.stringify(gs.leerExtras('2026-10-07', new Date('2026-10-07T12:00:00Z'), { rio: { obs: [['2026-10-06', 4.6]], t: 'antes' } }, pedir)));
  assert.strictEqual(d.lluvia.mm.length, 6); assert.strictEqual(d.municipios.mm.length, 70);
  assert.strictEqual(d.lluvia.mm[0][0], 0);
  assert.strictEqual(d.rio.t, 'antes'); assert.ok(d.errores.rio); assert.ok(d.errores.oni); assert.strictEqual(d.oni, undefined);
  assert.ok(d.errores.prono); assert.strictEqual(d.prono, undefined);
  assert.strictEqual(d.lluvia.t, '2026-10-07T12:00:00.000Z'); assert.ok(d.errores.yacy);
});

prueba('script: si falla el canal del SMN quedan las alertas anteriores y lo demás se renueva', () => {
  const pedir = url => url.indexOf('/series/937/') >= 0 ? { codigo: 200, texto: '[{"timestart":"2026-10-07T03:00:00.000Z","valor":20000}]' } : { codigo: 500, texto: '' };
  const antes = { capturado: 'antes', alertas: { 0: [] }, datos: { rio: { t: 'antes' } } };
  const r = gs.juntar(antes, '2026-10-07', new Date('2026-10-07T12:00:00Z'), () => { throw new Error('canal caído'); }, pedir);
  assert.ok(r.falla); assert.strictEqual(r.datos.capturado, 'antes');
  assert.strictEqual(r.datos.datos.yacy.t, '2026-10-07T12:00:00.000Z'); assert.strictEqual(r.datos.datos.rio.t, 'antes');
  const b = gs.juntar(antes, '2026-10-07', new Date('2026-10-07T12:00:00Z'), () => ({ capturado: 'ahora', leidas: 3 }), pedir);
  assert.strictEqual(b.falla, null); assert.strictEqual(b.datos.capturado, 'ahora'); assert.ok(b.datos.datos.yacy);
});

prueba('script: una alerta que no cubre el centro del municipio igual lo alcanza por sus puntos interiores', () => {
  const { puntos, leerGeo, anillos, dentro } = require('../herramientas/puntos.js'), mun = leerGeo().mun;
  const P = JSON.parse(JSON.stringify(vm.runInContext('PUNTOS', gs)));
  assert.deepStrictEqual(P, puntos(mun));   // si cambia el mapa hay que volver a generar los puntos
  P.forEach((pts, i) => pts.forEach(q => assert.ok(anillos(mun[i][1]).some(a => dentro(q, a)), 'punto fuera de ' + mun[i][0])));
  // Un cuadro chico alrededor de un punto interior, lejos del centro
  const m = P.findIndex((pts, i) => pts.some(q => Math.abs(q[0] - gs.CENTROS[i][0]) > 0.15)), q = P[m].find(q => Math.abs(q[0] - gs.CENTROS[m][0]) > 0.15);
  const cuadro = [[q[0] - .02, q[1] - .02], [q[0] - .02, q[1] + .02], [q[0] + .02, q[1] + .02], [q[0] + .02, q[1] - .02]];
  assert.strictEqual(gs.dentro(gs.CENTROS[m], cuadro), false);
  assert.strictEqual(gs.tocaMunicipio(m, [cuadro]), true);
  assert.strictEqual(gs.tocaMunicipio(m, [[[-10, -10], [-10, -9], [-9, -9]]]), false);
});

prueba('script: la corrección de 3 horas del canal del SMN se decide sola', () => {
  const xml = (onset, expires) => '<alert><status>Actual</status><sent>2026-10-08T08:55:55-03:00</sent><info><event>Tormentas</event><severity>Severe</severity>' +
    `<onset>2026-10-08T${onset}-03:00</onset><expires>2026-10-08T${expires}-03:00</expires><area><polygon>-20,-70 -20,-50 -35,-50 -35,-70</polygon></area></info></alert>`;
  const armar = (xmls, previo) => JSON.parse(JSON.stringify(gs.armarConAjuste(xmls, '2026-10-08', new Date('2026-10-08T13:00:00Z'), previo)));
  // Como viene hoy el canal: 15 a 21 rotulado -03:00 son las 12 a 18 de Argentina. Se corrige: solo la tarde.
  const hoy = armar([xml('15:00:00', '20:59:59'), xml('15:00:00', '20:59:59'), xml('09:00:00', '14:59:59')]);
  assert.deepStrictEqual(hoy.ajuste, { alineadas: 3, corridas: 0, horas: 3 });
  assert.deepStrictEqual(hoy.alertas[0][0].slice(2, 6), [0, 4, 4, 0]);
  // Si el SMN arregla el canal, las mismas alertas llegan rotuladas 12 a 18 y 6 a 12: se dejan como vienen y el resultado es el mismo.
  const arreglado = armar([xml('12:00:00', '17:59:59'), xml('12:00:00', '17:59:59'), xml('06:00:00', '11:59:59')]);
  assert.deepStrictEqual(arreglado.ajuste, { alineadas: 0, corridas: 3, horas: 0 });
  assert.deepStrictEqual(arreglado.alertas, hoy.alertas);
  // Con pocos casos no se decide: sigue lo que se venía usando.
  assert.strictEqual(armar([xml('12:00:00', '17:59:59')]).ajuste.horas, 3);
  assert.strictEqual(armar([xml('12:00:00', '17:59:59')], 0).ajuste.horas, 0);
  assert.strictEqual(armar([], 0).ajuste.horas, 0);
  assert.strictEqual(armar([xml('13:20:00', '17:59:59')]).ajuste.alineadas, 0);   // comienzos fuera de hora justa no cuentan
  // Y vuelve a corregir si el canal vuelve a venir corrido.
  assert.strictEqual(armar([xml('15:00:00', '20:59:59'), xml('21:00:00', '23:59:59'), xml('09:00:00', '14:59:59')], 0).ajuste.horas, 3);
});

prueba('sitio y script: lo que está escrito dos veces coincide', () => {
  // Lectura del río
  const crudo = [{ timestart: '2026-10-06T03:00:00.000Z', valor: 4.5 }, { timestart: '2026-10-05T15:00:00.000Z', valor: 4.4 },
    { timestart: '2026-10-06T15:00:00.000Z', valor: 4.6, timeupdate: '2026-10-06T16:00:00.000Z' }, { timestart: '2026-10-07T01:00:00.000Z', valor: 4.7 }, { timestart: '2026-10-07T12:00:00.000Z', valor: 99 }];
  const rs = JSON.parse(JSON.stringify(gs.normRio(crudo)));
  assert.deepStrictEqual(rs.obs, [['2026-10-05', 4.4], ['2026-10-06', 4.7]]);   // en hora argentina, la última lectura de cada día; 99 es imposible
  assert.ok(S(`FORMA.rio(${JSON.stringify(rs)})`), 'el sitio acepta lo que arma el script');
  // Lluvia: un día suelto sin dato cuenta como 0; si faltan más de 3, no se usa (no se puede decir que no llovió)
  const ll = v => [{ daily: { time: ['2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'], precipitation_sum: v } }];
  assert.deepStrictEqual(JSON.parse(JSON.stringify(gs.normLluvia(ll([1, null, 2, 0, 0]), 1).mm)), [[1, 0, 2, 0, 0]]);
  assert.throws(() => gs.normLluvia(ll([null, null, null, null, 1]), 1));
  // Lectura de lo que suelta Yacyretá
  const yc = [{ timestart: '2026-10-12T03:00:00.000Z', valor: 27200 }, { timestart: '2026-10-11T03:00:00.000Z', valor: 23800.4 },
    { timestart: '2026-10-13T03:00:00.000Z', valor: 32800, timeupdate: 'x' }, { timestart: '2026-10-10T03:00:00.000Z', valor: -1 }, { timestart: '2026-10-09T03:00:00.000Z', valor: null }];
  const ys = JSON.parse(JSON.stringify(gs.normYacy(yc)));
  assert.deepStrictEqual(ys.obs, [['2026-10-11', 23800], ['2026-10-12', 27200], ['2026-10-13', 32800]]);
  assert.ok(S(`FORMA.yacy(${JSON.stringify(ys)})`)); assert.throws(() => gs.normYacy([{ timestart: '2026-10-10T03:00:00.000Z', valor: 0 }]));
  // Números de fenómeno
  ['Tormentas', 'Lluvias', 'Nevadas', 'Viento', 'Viento Zonda', 'Temperaturas extremas calor', 'Temperaturas extremas frío', 'Niebla', 'Humo', 'Polvo']
    .forEach(n => assert.ok(S(`SMN_EV[${gs.idEvento(n)}]`), n));
  // Tabla "¿Cómo se decide el color?": los números del texto son los umbrales del cálculo
  const fila = c => new RegExp('<td><b>' + c + '</b></td><td>(\\d+) mm o más</td><td>(\\d+) mm o más</td><td>([^<]+)</td>').exec(html);
  const n = (cayo, viene, max) => S(`nivelLluvia({cayo:${cayo},viene:${viene},max:${max}})`);
  const [, r7, r1, rc] = fila('Rojo'), [, a7, a1, ac] = fila('Amarillo'), nums = t => t.match(/\d+/g).map(Number);
  assert.strictEqual(n(0, +r7, 0), 2); assert.strictEqual(n(0, r7 - 1, 0), 1);
  assert.strictEqual(n(0, 0, +r1), 2); assert.strictEqual(n(0, 0, r1 - 1), 1);
  assert.strictEqual(n(...nums(rc), 0), 2); assert.strictEqual(n(nums(rc)[0] - 1, nums(rc)[1], 0), 1);
  assert.strictEqual(n(0, +a7, 0), 1); assert.strictEqual(n(0, a7 - 1, 0), 0);
  assert.strictEqual(n(0, 0, +a1), 1); assert.strictEqual(n(0, 0, a1 - 1), 0);
  assert.strictEqual(n(nums(ac)[0] - 45, 45, 0), 1); assert.strictEqual(n(nums(ac)[0] - 46, 45, 0), 0);
});

prueba('lluvia medida: el script suma lo caído por estación, descarta lo viejo o imposible y controla con las vecinas', () => {
  const ahora = new Date('2026-10-13T12:00:00Z'), h = n => new Date(ahora.getTime() - n * 36e5).toISOString();
  const o = (serie, hrs, valor) => ({ series_id: serie, timestart: h(hrs), timeend: h(hrs), valor });
  // Una lectura por hora durante 4 días, con lluvia en algunas horas: { horas atrás: mm }
  const horaria = (serie, lluvia, desde = 1, hasta = 96) => Array.from({ length: hasta - desde + 1 }, (_, i) => o(serie, desde + i, (lluvia || {})[desde + i] || 0));
  const crudo = [
    ...horaria(39058, { 3: 2, 10: 1.5, 26: 4, 70: 5, 80: 9 }), o(39058, 3, 2),   // Charadai, con una lectura repetida
    ...horaria(39083, { 5: 12 }),                                                 // Los Gansos
    ...horaria(39082),                                                            // La Horqueta: siempre 0, con dos vecinas que midieron más de 10 mm
    ...horaria(39140, { 2: 30 }),                                                 // Cote Lai: 30 mm, mucho más que sus vecinas
    ...horaria(33262, { 4: 1 }),                                                  // Laguna Blanca
    ...horaria(39077),                                                            // El 38 Norte: 0, vecina de Charadai y Cote Lai
    o(43703, 1, 0), ...horaria(43703, {}, 48, 96), o(43703, 2, -1), o(43703, 3, 999), o(43703, 4, 151), o(43703, 5, null),   // Castelli: faltan lecturas, valores imposibles
    o(33892, 30, 7),                                                              // Las Lomitas: última lectura de hace 30 horas
    o(99999, 1, 5)                                                                // serie que no está en la lista
  ];
  const m = JSON.parse(JSON.stringify(gs.normMedida(crudo, ahora))), por = Object.fromEntries(m.e.map(x => [x[0], x]));
  assert.deepStrictEqual(m.e.map(x => x[0]), ['Castelli', 'Laguna Blanca', 'Cote Lai', 'Charadai', 'Los Gansos']);   // de norte a sur
  assert.deepStrictEqual(m.dudosas.map(x => x[0]).sort(), ['El 38 Norte', 'La Horqueta']);
  const ch = por.Charadai;
  assert.strictEqual(ch[3], h(1)); assert.strictEqual(ch[4], 3.5); assert.strictEqual(ch[5], 12.5); assert.strictEqual(ch[6], 0);   // 24 h y 3 días antes de la última lectura
  assert.strictEqual(por['Cote Lai'][6], 2);                 // mucho más que las vecinas (Charadai y Laguna Blanca; El 38 Norte ya no cuenta)
  assert.strictEqual(por['Los Gansos'][6], 0);               // 12 mm: no llega a 20
  assert.deepStrictEqual(por.Castelli.slice(4), [0, 0, 1]);  // faltan lecturas; los valores imposibles no suman
  assert.throws(() => gs.normMedida([o(33892, 30, 7)], ahora));
  assert.throws(() => gs.normMedida({ rows: [] }, ahora));
  // Sin dos vecinas con lluvia no se descarta a nadie por marcar 0
  assert.deepStrictEqual(JSON.parse(JSON.stringify(gs.normMedida(horaria(39082), ahora))).e[0].slice(4), [0, 0, 0]);
  // Un solo pedido con todas las estaciones, desde 4 días antes
  const u = gs.urlMedida(ahora);
  assert.ok(u.startsWith('https://alerta.ina.gob.ar/a5/obs/puntual/observaciones?tipo=puntual&series_id='));
  assert.strictEqual(u.split('series_id=')[1].split('&')[0].split(',').length, gs.MEDIDA.length);
  assert.ok(u.includes('timestart=2026-10-09T11:00:00Z&timeend=2026-10-13T13:00:00Z'));
  assert.strictEqual(new Set(gs.MEDIDA.map(x => x[0])).size, gs.MEDIDA.length);
  gs.MEDIDA.forEach(x => assert.ok(x[2] > -28.2 && x[2] < -24 && x[3] > -63.7 && x[3] < -58.2 && x[1].length > 2, x[1]));
  // La copia pasa la revisión de forma del sitio
  assert.ok(S(`FORMA.medida(${JSON.stringify(Object.assign({ t: ahora.toISOString() }, m))})`));
  assert.strictEqual(S(`FORMA.medida({t:'${ahora.toISOString()}',e:[['X',-27,-59,'nada',1,2,0]]})`), false);
  assert.strictEqual(S(`FORMA.medida({t:'${ahora.toISOString()}',e:[['X',-27,-59,'${h(1)}',-1,2,0]]})`), false);
  assert.strictEqual(S(`FORMA.medida({t:'${ahora.toISOString()}',e:[['X',-27,-59,'${h(1)}',1,2,7]]})`), false);
  assert.strictEqual(S(`FORMA.medida({t:'${ahora.toISOString()}',e:[]})`), false);
});

prueba('lluvia medida: el detalle del municipio usa la estación más cercana, reciente y a menos de 50 km', () => {
  const h = n => new Date(Date.now() - n * 36e5).toISOString();
  const i = S(`GEO.mun.findIndex(m=>m[0]==='Charadai')`), [lat, lon] = S(`[GEO.mun[${i}][2],GEO.mun[${i}][3]]`);
  const pon = e => S(`LISTO=true;D.medida={datos:${JSON.stringify({ t: h(0), e })},vivo:true,t:new Date()};medidaInfo(${i})`);
  const cerca = ['Cerca', lat + 0.05, lon, h(2), 2.4, 30, 0], lejos = ['Lejos', lat + 0.3, lon, h(2), 1, 1, 0], vieja = ['Vieja', lat, lon, h(30), 50, 50, 0];
  let t = pon([lejos, cerca, vieja]);
  assert.ok(t.includes('estación Cerca, a 6 km: '), t); assert.ok(t.includes('2,4 mm en 24 horas y 30 mm en 3 días'), t);
  assert.ok(t.includes('no se usa para el color'));
  assert.ok(!t.includes('Ojo') && !t.includes('Faltan lecturas'));
  t = pon([['Con avisos', lat, lon, h(1), 25, 25, 3]]);
  assert.ok(t.includes('<b>Ojo:</b> las estaciones vecinas midieron mucho menos') && t.includes('Faltan lecturas de esta estación'), t);
  t = pon([vieja, ['Muy lejos', lat + 1, lon, h(1), 5, 5, 0]]);
  assert.ok(t.includes('no hay una estación con datos de las últimas 24 horas a menos de 50 km'), t);
  // En una localidad del semáforo se mide desde la ciudad, no desde el centro del municipio
  const r = S(`MUNI[0]`), lr = S(`[LOCS[0].lat,LOCS[0].lon]`);
  t = S(`D.medida={datos:${JSON.stringify({ t: h(0), e: [['Junto a la ciudad', lr[0] + 0.1, lr[1], h(1), 4, 9, 0]] })},vivo:true,t:new Date()};medidaInfo(${r})`);
  assert.ok(t.includes('estación Junto a la ciudad, a 11 km de Resistencia: 4 mm'), t);
  assert.strictEqual(S(`D.medida={datos:null,error:true};medidaInfo(${i})`).includes('no se pudo consultar'), true);
  assert.strictEqual(S(`delete D.medida;medidaInfo(${i})`), '');
});

prueba('pronóstico del Paraguay: el script lo arma por puerto, el sitio lo acepta y se muestra sin cambiar colores', () => {
  const f = (dia, valor, qualifier) => ({ timestart: dia + 'T03:00:00.000Z', timeend: dia + 'T03:00:00.000Z', valor, qualifier });
  const serie = (id, base) => ({ series_id: id, pronosticos: [f('2026-10-13', base, 'main'), f('2026-10-13', base - 0.1, 'inferior'), f('2026-10-13', base + 0.1, 'superior'),
    f('2026-10-20', base + 1.6, 'main'), f('2026-10-20', base + 1, 'inferior'), f('2026-10-20', base + 2.2, 'superior')] });
  const crudo = { id: 1, forecast_date: '2026-10-12T12:00:00.000Z', cal_id: 312, series: [serie(1525, 2.4), serie(3127, 3.3), serie(1, 9)] };
  const g = JSON.parse(JSON.stringify(gs.normPronoPy(crudo)));
  assert.deepStrictEqual(Object.keys(g).sort(), ['emitido', 'formosa', 'pilcomayo']);
  assert.deepStrictEqual(g.formosa[1].map(v => typeof v === 'number' ? Math.round(v * 100) / 100 : v), ['2026-10-20', 4.3, 4.9, 5.5]);
  assert.ok(S(`FORMA.pronoPy(${JSON.stringify(g)})`));
  assert.strictEqual(S(`FORMA.pronoPy({emitido:'2026-10-12T12:00:00.000Z'})`), false);
  assert.throws(() => gs.normPronoPy({ forecast_date: '2026-10-12T12:00:00.000Z', series: [serie(1, 3)] }));
  const ver = (dia, d) => S(`hoy='${dia}';D.pronoPy={datos:${JSON.stringify(d)},vivo:true,t:new Date()};pronoPyInfo()`);
  let t = ver('2026-10-13', g);
  assert.ok(t.includes('<b>Puerto Formosa:</b> 3,30 m previsto para el 13/10; llegaría a 4,90 m el 20/10 (entre 4,30 y 5,50 m)'), t);
  assert.ok(!t.includes('class="aviso"') && !t.includes('Atención'));
  // Cerca de la alerta de Puerto Pilcomayo (5,35 m) y por encima
  const alto = JSON.parse(JSON.stringify(g)); alto.pilcomayo[1][3] = 5.0;
  assert.ok(ver('2026-10-13', alto).includes('<b>Atención:</b> en Puerto Pilcomayo'));
  alto.pilcomayo[1][3] = 5.4;
  assert.ok(ver('2026-10-13', alto).includes('El pronóstico para Puerto Pilcomayo puede llegar al nivel de alerta'));
  assert.ok(ver('2026-10-21', Object.assign({}, g, { emitido: '2026-10-18T12:00:00.000Z' })).includes('no trae fechas próximas'));
  assert.ok(ver('2026-10-25', g).includes('tiene más de 7 días'));
  S(`delete D.pronoPy;hoy=diaAR(new Date())`);
});

prueba('pronóstico del Paraná: con 3 días o más avisa que no incluye lo que pasó río arriba después', () => {
  const f = (em, h) => S(`hoy='${h}';pronoAtraso({emitido:'${em}'})`);
  assert.strictEqual(f('2026-10-09', '2026-10-11'), '');
  assert.strictEqual(f('2026-10-09', '2026-10-12'), ' Es del 9/10: no incluye lo que pasó río arriba después.');
  assert.strictEqual(f('2026-10-09', '2026-10-13'), ' Es del 9/10: no incluye lo que pasó río arriba después.');
  S(`hoy=diaAR(new Date())`);
});

prueba('aviso: lluvia sin renovar por más de 24 horas, en el sitio y por correo', () => {
  const lluvia = h => S(`D.lluvia={datos:{},vivo:true,t:new Date(Date.now()-${h}*36e5)};lluviaAtraso()`);
  assert.strictEqual(lluvia(5), ''); assert.strictEqual(lluvia(23), '');
  assert.ok(lluvia(25).includes('sin renovar desde')); assert.ok(!/robot|clave|GitHub/i.test(lluvia(25)));
  S(`delete D.lluvia`);
  const ahora = new Date('2026-10-08T12:00:00Z'), hace = h => new Date(ahora - h * 36e5).toISOString();
  assert.strictEqual(gs.decidirAviso(hace(2), ahora, false), '');
  assert.strictEqual(gs.decidirAviso(hace(25), ahora, false), 'avisar');
  assert.strictEqual(gs.decidirAviso(hace(30), ahora, true), '');          // ya se avisó: no se repite
  assert.strictEqual(gs.decidirAviso(hace(1), ahora, true), 'limpiar');    // volvió la lluvia
  assert.strictEqual(gs.decidirAviso('basura', ahora, false), '');
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

  // Robot de la grilla (mapa animado), con Open-Meteo simulado
  const gr = require('../robot/grilla.js'), np = gr.G.nlat * gr.G.nlon;
  const horas = Array.from({ length: 72 }, (_, k) => '2026-10-' + String(11 + Math.floor(k / 24)) + 'T' + String(k % 24).padStart(2, '0') + ':00');
  const resp = Array.from({ length: np }, (_, i) => ({ hourly: { time: horas, precipitation: horas.map((_, k) => i === 5 && k === 30 ? 12.64 : 0.04),
    cloud_cover: horas.map(() => 87), weather_code: horas.map((_, k) => i === 5 && k === 30 ? 95 : 3) } }));
  let pedidosGrilla = [];
  global.fetch = async url => { pedidosGrilla.push(url); return { ok: true, json: async () => resp }; };
  const g1 = await gr.armarGrilla(null, new Date('2026-10-12T12:00:00Z'));
  const g2 = await gr.armarGrilla(g1.salida, new Date('2026-10-12T14:00:00Z'));    // 2 horas después: no pide
  const g3 = await gr.armarGrilla(g1.salida, new Date('2026-10-12T15:00:00Z'));    // 3 horas después: pide
  global.fetch = async () => ({ ok: false, status: 429 });
  const g4 = await gr.armarGrilla(g1.salida, new Date('2026-10-12T18:00:00Z'));    // falla: queda la anterior
  const g5 = await gr.armarGrilla(null, new Date('2026-10-12T18:00:00Z'));         // falla sin anterior: no hay archivo
  global.fetch = real;
  prueba('robot de la grilla: forma compacta, cada 3 horas, y si falla queda la anterior', () => {
    assert.strictEqual(np, 208);
    assert.strictEqual(pedidosGrilla.length, 2); assert.strictEqual(pedidosGrilla[0].split('latitude=')[1].split('&')[0].split(',').length, 208);
    const d = g1.salida.datos;
    assert.strictEqual(d.h0, '2026-10-11T00:00'); assert.strictEqual(d.n, 72);
    assert.strictEqual(d.p[5][30], 126); assert.strictEqual(d.p[0][0], 0); assert.strictEqual(d.nube[0][0], 9);
    assert.deepStrictEqual(d.torm, [[30, 5]]);
    assert.strictEqual(g2.pidio, false); assert.strictEqual(g3.pidio, true); assert.strictEqual(g3.salida.datos.t, '2026-10-12T15:00:00.000Z');
    assert.strictEqual(g4.bien, false); assert.strictEqual(g4.salida.datos.t, '2026-10-12T12:00:00.000Z'); assert.strictEqual(g4.salida.error, 'HTTP 429');
    assert.strictEqual(g5.salida, null);
    // El sitio acepta esa forma y rechaza una rota
    assert.strictEqual(S(`FORMA.grilla(${JSON.stringify(d)})`), true);
    assert.strictEqual(S(`FORMA.grilla(${JSON.stringify({ ...d, p: d.p.slice(1) })})`), false);
    assert.strictEqual(S(`FORMA.grilla(${JSON.stringify({ ...d, torm: [[99, 5]] })})`), false);
    assert.strictEqual(S(`FORMA.grilla(${JSON.stringify({ ...d, h0: 'ayer' })})`), false);
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
    setProperties: (o, borrar) => { if (borrar) for (const k in props) delete props[k]; Object.assign(props, o); },
    deleteProperty: k => { delete props[k]; }, setProperty: (k, v) => { props[k] = v; } }) };
  gs.UrlFetchApp = { fetch: (u, o) => { pedidos.push({ u, o }); return { getResponseCode: () => 204, getContentText: () => '' }; } };
  gs.ContentService = { createTextOutput: t => ({ setMimeType: () => t }), MimeType: {} };
  const lanzado = vm.runInContext('lanzarRobot()', gs);
  vm.runInContext(`guardar('x'.repeat(20000)); guardar(JSON.stringify({a:1}))`, gs);   // el segundo guardado es más corto: no deben quedar partes del primero
  const publico = vm.runInContext('doGet()', gs);
  delete props.GITHUB_TOKEN;
  const sinClave = vm.runInContext('lanzarRobot()', gs);
  // Correo de aviso: uno solo por caída, y otra vez disponible cuando la lluvia vuelve
  const correos = []; let copiaT = '2026-10-06T12:00:00Z';
  gs.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ datos: { lluvia: { t: copiaT } } }) }) };
  gs.MailApp = { sendEmail: (a, asunto, texto) => correos.push({ a, asunto, texto }) };
  gs.Session = { getEffectiveUser: () => ({ getEmail: () => 'yo@ejemplo.com' }) };
  gs.Utilities = { formatDate: () => '6/10 09:00' };
  const dia8 = "new Date('2026-10-08T12:00:00Z')";
  const pasos = [vm.runInContext(`avisarLluvia(${dia8},'sin clave')`, gs), vm.runInContext(`avisarLluvia(${dia8},'sin clave')`, gs)];
  copiaT = '2026-10-08T11:00:00Z'; pasos.push(vm.runInContext(`avisarLluvia(${dia8},'bien')`, gs));
  copiaT = '2026-10-06T12:00:00Z'; pasos.push(vm.runInContext(`avisarLluvia(${dia8},'bien')`, gs));
  delete props.avisoLluvia;
  prueba('script: correo cuando la lluvia no se renueva, una sola vez por caída', () => {
    assert.deepStrictEqual(pasos, ['avisar', '', 'limpiar', 'avisar']); assert.strictEqual(correos.length, 2);
    assert.strictEqual(correos[0].a, 'yo@ejemplo.com'); assert.ok(correos[0].texto.includes('sin clave'));
  });
  prueba('script: lanza el robot de la lluvia y no pierde ni muestra la clave', () => {
    assert.strictEqual(lanzado, 'bien'); assert.strictEqual(pedidos.length, 1);
    assert.ok(pedidos[0].u.endsWith('/actions/workflows/lluvia.yml/dispatches'));
    assert.strictEqual(pedidos[0].o.headers.Authorization, 'Bearer clave-de-prueba');
    assert.strictEqual(JSON.parse(pedidos[0].o.payload).ref, 'main');
    assert.strictEqual(publico, '{"a":1}'); assert.ok(!publico.includes('clave'));
    assert.deepStrictEqual(Object.keys(props).sort(), ['p0', 'partes']);
    assert.strictEqual(sinClave, 'sin clave'); assert.strictEqual(pedidos.length, 1);
  });
  prueba('mapa del Pacífico: la explicación sigue al ONI', () => {
  const e = {}; elementos.pacNino = e;
  const con = v => { S(`ONI[ONI.length-1][2]=${v};pintarNino()`); return e.textContent; };
  const orig = S('ONI[ONI.length-1][2]');
  assert.ok(con(2.1).includes('es El Niño'));
  assert.ok(con(0.2).startsWith('Cuando hay El Niño'));
  assert.ok(con(-0.8).includes('La Niña'));
  con(orig); delete elementos.pacNino;
});

prueba('Yacyretá: una sola línea informativa debajo del gráfico del río', () => {
    const l = (h, obs) => S(`hoy='${h}';D.yacy={datos:{obs:${JSON.stringify(obs)}},vivo:true,t:new Date()};lineaYacy()`);
    const o = [['2026-10-06', 21800], ['2026-10-12', 27200], ['2026-10-13', 32830]];
    assert.strictEqual(l('2026-10-13', o), '<p><b>Río arriba:</b> la represa de Yacyretá está soltando unos 32.800 m³ de agua por segundo. Lo normal en octubre es unos 13.100, y una semana antes soltaba 21.800. Esa agua tarda unos 3 días en llegar a Barranqueras.</p><p class="meta">Fuente: Entidad Binacional Yacyretá, vía INA. Lectura del 13/10.</p>');
    assert.ok(l('2026-10-14', o).includes('soltaba el 13/10 unos 32.800'));      // el dato de hoy todavía no está
    assert.ok(!l('2026-10-13', o.slice(1)).includes('una semana antes') && l('2026-10-13', o.slice(1)).includes('es unos 13.100. Esa'));   // sin lectura de hace una semana, no compara
    assert.strictEqual(S('YACY_NORMAL.length'), 12);
    assert.strictEqual(l('2026-10-18', o), '');                                    // más de 4 días: no se muestra
    assert.strictEqual(S(`D.yacy={datos:null};lineaYacy()`), '');
  });

  // Muchas visitas: la página nunca consulta las fuentes; usa la copia de GitHub, el script de respaldo o lo guardado
  S(`var llamadas=[];fetch=u=>{llamadas.push(String(u));return Promise.reject(new Error('sin red'))}`);
  const copiaRio = h => `{robot:{t:new Date(Date.now()-${h}*36e5).toISOString()},datos:{rio:{t:new Date(Date.now()-${h}*36e5).toISOString(),obs:[[diaAR(new Date()),5.1]],hora:null,act:null}}}`;
  S(`hoy=diaAR(new Date());SRV_P=Promise.resolve(${copiaRio(5)});delete D.rio;localStorage.getItem=()=>null`);
  await S(`cargar('rio')`);
  const rioViejo = S(`({h:D.rio.datos.obs[0][1],vivo:D.rio.vivo,robot:!!D.rio.robot,horas:Math.round((Date.now()-D.rio.t)/36e5)})`);
  // Lo guardado en el dispositivo es más nuevo que la copia: se usa eso
  S(`localStorage.getItem=k=>k==='anc:rio'?JSON.stringify({t:new Date(Date.now()-36e5).toISOString(),datos:{obs:[[diaAR(new Date()),5.3]],hora:null,act:null}}):null;delete D.rio`);
  await S(`cargar('rio')`);
  const rioMem = S(`({h:D.rio.datos.obs[0][1],vivo:D.rio.vivo})`);
  S(`localStorage.getItem=()=>null;SRV_P=Promise.resolve(null);delete D.rio`);
  await S(`cargar('rio')`);
  const rioNada = S(`({datos:D.rio.datos,error:!!D.rio.error})`);
  // Medida: la copia vieja cuenta como al día (cada estación lleva su hora)
  S(`SRV_P=Promise.resolve({robot:{t:new Date(Date.now()-5*36e5).toISOString()},datos:{medida:{t:new Date(Date.now()-5*36e5).toISOString(),e:[['X',-27,-59,new Date().toISOString(),1,2,0]]}}});delete D.medida`);
  await S(`cargar('medida')`);
  const medidaVieja = S(`D.medida.vivo`);
  prueba('muchas visitas: la página nunca consulta al INA ni a Open-Meteo; con la copia vieja muestra su hora', () => {
    for (const f of ['alerta.ina.gob.ar', 'api.open-meteo.com', 'cpc.ncep.noaa.gov', 'ssl.smn.gob.ar/CAP']) assert.ok(!codigo.includes(f), 'la página no tiene la dirección de ' + f);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(rioViejo)), { h: 5.1, vivo: false, robot: true, horas: 5 });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(rioMem)), { h: 5.3, vivo: false });
    assert.strictEqual(rioNada.datos, null); assert.ok(rioNada.error);
    assert.strictEqual(medidaVieja, true);
    assert.strictEqual(S('llamadas.length'), 0, 'no pidió nada');
  });

  // Copia de GitHub primero; el script solo si la copia falta o es vieja
  const pide = async (gh, sc) => S(`llamadas=[];getJSON=u=>{llamadas.push(u.includes('raw.githubusercontent.com')?'github':u.includes('script.google.com')?'script':u);
      const r=u.includes('raw.githubusercontent.com')?${gh}:${sc};return r?Promise.resolve(r):Promise.reject(new Error('falla'))};
    leerCopias().then(j=>({de:j&&j.de,llamadas}))`);
  const ct = (de, h) => `{de:'${de}',robot:{t:new Date(Date.now()-${h}*36e5).toISOString()},capturado:new Date().toISOString(),datos:{}}`;
  const c1 = await pide(ct('github', 0.5), ct('script', 0));
  const c2 = await pide(ct('github', 3), ct('script', 0));
  const c3 = await pide(ct('github', 3), 'null');
  const c4 = await pide('null', ct('script', 0));
  const c5 = await pide(`{error:'x'}`, `{error:'y'}`);
  const c6 = await pide(ct('github', 3), ct('script', 5));
  prueba('copias: primero GitHub; el script de Google solo si la copia de GitHub falta o tiene más de 2 horas', () => {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(c1)), { de: 'github', llamadas: ['github'] });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(c2)), { de: 'script', llamadas: ['github', 'script'] });
    assert.strictEqual(c3.de, 'github');      // el script no responde: queda la copia vieja
    assert.strictEqual(c4.de, 'script');
    assert.strictEqual(c5.de, undefined);     // una respuesta de error no se usa
    assert.strictEqual(c6.de, 'github');      // el script trae algo más viejo: queda la de GitHub
  });

  // Robot de la copia del servidor
  const sv = require('../robot/servidor.js');
  const copiaSv = (t, extra) => Object.assign({ robot: { t }, capturado: t, fechas: ['2026-10-14'], areas: [0], alertas: {}, datos: { rio: {} } }, extra || {});
  const correr = async (anterior, respuesta) => { global.fetch = async () => respuesta instanceof Error ? Promise.reject(respuesta)
      : { ok: true, text: async () => typeof respuesta === 'string' ? respuesta : JSON.stringify(respuesta) };
    const r = await sv.armarCopia(anterior, 'https://script.google.com/macros/s/x/exec', 1); global.fetch = real; return r; };
  const ant = copiaSv('2026-10-14T12:00:00Z');
  const s1 = await correr(ant, copiaSv('2026-10-14T13:00:00Z'));
  const s2 = await correr(ant, copiaSv('2026-10-14T11:00:00Z'));
  const s3 = await correr(ant, '<html>error</html>');
  const s4 = await correr(ant, { error: 'algo' });
  const s5 = await correr(null, new Error('sin red'));
  const s6 = await correr(ant, copiaSv('2026-10-14T13:00:00Z', { areas: 'x' }));
  prueba('robot de la copia: guarda solo una copia completa y más nueva; si no, queda la anterior', () => {
    assert.strictEqual(s1.salida.robot.t, '2026-10-14T13:00:00Z'); assert.ok(s1.bien);
    assert.strictEqual(s2.salida, ant); assert.ok(s2.bien);
    for (const x of [s3, s4, s6]) { assert.strictEqual(x.salida, ant); assert.strictEqual(x.bien, false); }
    assert.strictEqual(s5.salida, null); assert.strictEqual(s5.bien, false);
    assert.strictEqual(sv.urlScript(), S('SMN_URL'), 'la dirección del script sale de la página');
    assert.ok(S(`copiaVale(${JSON.stringify(s1.salida)})`), 'la página acepta lo que guarda el robot');
  });

  // Script: lanza el robot después de guardar y no publica el texto de error de GitHub
  const orden = [], guardado = () => JSON.parse(vm.runInContext('leerGuardado()', gs));
  props.GITHUB_TOKEN = 'clave-de-prueba';
  gs.UrlFetchApp = { fetch: () => ({ getResponseCode: () => 401, getContentText: () => '{"message":"Bad credentials","detalle":"texto largo de GitHub"}' }) };
  const avisos = []; gs.console = { warn: m => avisos.push(m), log() {}, error() {} };
  const malo = vm.runInContext('lanzarRobot()', gs);
  const orig = { juntar: gs.juntar, lanzarRobot: gs.lanzarRobot, avisarLluvia: gs.avisarLluvia };
  gs.Utilities = { formatDate: () => '2026-10-14' };
  vm.runInContext(`juntar=function(){return {datos:{fuente:'prueba',robot:{t:'viejo',estado:'bien'}},falla:null}};
    lanzarRobot=function(){__orden.push('robot:'+JSON.parse(leerGuardado()).robot.t);return 'GitHub respondió 401'};
    avisarLluvia=function(){__orden.push('aviso')}`, Object.assign(gs, { __orden: orden }));
  vm.runInContext(`guardar(JSON.stringify({robot:{t:'antes',estado:'bien'}}))`, gs);
  vm.runInContext('actualizar()', gs);
  const final = guardado();
  Object.assign(gs, orig); gs.console = console; delete props.GITHUB_TOKEN;
  prueba('script: lanza el robot después de guardar y no publica el texto de error de GitHub', () => {
    assert.strictEqual(malo, 'GitHub respondió 401');
    assert.ok(avisos.some(a => a.includes('Bad credentials')), 'el detalle queda en el registro');
    assert.ok(orden[0].startsWith('robot:') && orden[0] !== 'robot:antes', 'cuando se lanza el robot ya está guardado lo nuevo');
    assert.strictEqual(orden[1], 'aviso');
    assert.strictEqual(final.robot.estado, 'GitHub respondió 401');
    assert.ok(!JSON.stringify(final).includes('Bad credentials'));
  });

  prueba('regla del navegador (CSP): la huella del código está al día y cubre todas las fuentes que usa la página', () => {
    const toml = fs.readFileSync(path.join(raiz, 'netlify.toml'), 'utf8'), csp = (/Content-Security-Policy = "([^"]+)"/.exec(toml) || [])[1];
    assert.ok(csp, 'falta la regla en netlify.toml');
    const h = require('../herramientas/csp.js').huella(html), regla = n => (new RegExp('(?:^|; )' + n + ' ([^;]+)').exec(csp) || [])[1] || '';
    assert.strictEqual(regla('script-src'), h, 'la huella quedó vieja: correr  node herramientas/csp.js');
    assert.ok(/default-src 'none'/.test(csp) && /object-src 'none'/.test(csp) && /base-uri 'none'/.test(csp));
    assert.strictEqual(regla('frame-ancestors'), "'self' https://gobiernoabierto.chaco.gob.ar", 'solo el portal de Gobierno Abierto puede mostrar el sitio en su página');
    assert.ok(!/X-Frame-Options *=/.test(toml), 'X-Frame-Options no deja nombrar al portal: no tiene que estar');
    assert.strictEqual(regla('font-src'), "'self'", 'la letra se sirve desde el propio sitio');
    for (const l of ['kanit-700.woff2', 'manrope-wght.woff2']) assert.ok(fs.existsSync(path.join(raiz, 'fuentes', l)) && html.includes('url(fuentes/' + l + ')'), 'falta la letra ' + l);
    assert.ok(codigo.includes("PORTAL='https://gobiernoabierto.chaco.gob.ar'") && !/postMessage\([^)]*'\*'/.test(codigo), 'los avisos al portal van solo al portal');
    assert.ok(!/\son[a-z]+=["']/i.test(html) && !html.includes('javascript:'), 'sin código suelto en el HTML (la regla no lo dejaría correr)');
    const hosts = [...new Set([...codigo.matchAll(/'(https:\/\/[a-z0-9.-]+)\//g)].map(m => m[1]))].filter(u => !/smn\.gob\.ar|concejovilelas/.test(u));   // esos dos son enlaces
    for (const u of hosts) assert.ok(regla('connect-src').split(' ').includes(u), u + ' falta en connect-src');
    assert.ok(regla('connect-src').includes('https://script.googleusercontent.com'), 'el script de Google redirige ahí');
    assert.ok(/Permissions-Policy = "camera=\(\), microphone=\(\), geolocation=\(\)/.test(toml));
  });
  prueba('qué hacer: lo que rige hoy lleva a su tarjeta, el río nunca dice "alerta naranja" y sin informe al día no dice que no hay alertas', () => {
    // cada fenómeno del SMN y cada botón tiene su tarjeta, con las recomendaciones adentro
    const tarj = [...html.matchAll(/<details id="h-(\w+)" data-h="\1" name="hacer">/g)].map(m => m[1]);
    assert.deepStrictEqual(tarj, ['torm', 'viento', 'lluvia', 'rio', 'baja', 'calor', 'frio', 'niebla', 'mochila']);
    for (const t of Object.values(S('HACER_EV'))) assert.ok(tarj.includes(t), t + ' sin tarjeta');
    for (const ev of Object.keys(S('SMN_EV'))) assert.ok(S('HACER_EV')[ev], 'el fenómeno ' + ev + ' del SMN no tiene qué hacer');
    for (const m of html.matchAll(/data-h="(\w+)"/g)) assert.ok(tarj.includes(m[1]), m[1]);
    assert.strictEqual((html.match(/<input type="checkbox" value="\w+">/g) || []).length, 12, 'mochila con 12 cosas');
    for (const n of ['911', '100', '107', '+543624448000', '08007777589']) assert.ok(html.includes('href="tel:' + n + '"'), n);
    // escenario: alerta naranja por tormentas con granizo mañana en un municipio, calor amarillo hoy en toda la provincia, Paraná en naranja
    const hoy = S('hoy'), man = S('masDias(hoy,1)'), T = S('GEO.mun.length');
    const areas = Array.from({ length: T }, (_, i) => 'a' + i), alertas = {};
    areas.forEach(a => { alertas[a] = [[hoy, 101, 3, 3, 3, 3, 0]] });
    alertas.a0.push([man, 41, 0, 0, 4, 4, 1]);
    S('horaAR=()=>0;riesgoParaguay=()=>({c:"verde"});riesgoRio=()=>({c:"naranja"})');
    S('SMN=' + JSON.stringify({ emitido: new Date().toISOString(), capturado: new Date().toISOString(), fechas: [hoy, man], areas, alertas, leidas: 5 }));
    let H = S('hacerHoy()');
    assert.strictEqual(H.smn, 'ok');
    assert.strictEqual(JSON.stringify(H.filas.map(f => [f.t, f.niv])), '[["torm",4],["rio",4],["calor",3]]');
    assert.ok(H.filas[0].txt.includes('Alerta naranja por tormentas, con posible granizo') && H.filas[0].txt.includes('mañana') && H.filas[0].txt.includes('1 de ' + T + ' municipios'));
    assert.ok(H.filas[1].txt.includes('naranja según el pronóstico del INA') && !/alerta naranja/i.test(H.filas[1].txt), 'el río no es una alerta del SMN');
    assert.ok(H.filas[2].txt.includes('Alerta amarilla por calor extremo') && H.filas[2].txt.includes('hoy') && H.filas[2].txt.includes('toda la provincia'));
    assert.ok(H.marcas.get('viento'), 'con granizo también se marca la tarjeta del viento');
    // el Paraná fuera del verde tranquiliza a quien vive dentro de las defensas, en la franja y en su tarjeta
    const hh = {}; elementos.hHoy = hh; S('pintarHacer()'); delete elementos.hHoy;
    assert.ok(hh.innerHTML.includes(S('DEFENSAS')), 'la franja dice que dentro de las defensas no hace falta hacer nada');
    assert.ok(/<details id="h-rio"[\s\S]*?dentro de las defensas, no hace falta hacer nada/.test(html));
    assert.ok(!/se conecta a Google, GitHub, el INA, Open-Meteo/.test(html), 'privacidad al día');
    // sin alertas y con el informe al día: "no hay"; con el informe viejo o vacío del canal: no se puede confirmar
    S('riesgoRio=()=>({c:"verde"});SMN.alertas={};SMN.areas.forEach(a=>{SMN.alertas[a]=[]})');
    H = S('hacerHoy()'); assert.strictEqual(H.filas.length, 0); assert.strictEqual(H.smn, 'ok');
    S('SMN.leidas=0'); assert.strictEqual(S('hacerHoy()').smn, 'duda');
    S('SMN.leidas=5;SMN.capturado=new Date(Date.now()-4*36e5).toISOString()'); assert.strictEqual(S('hacerHoy()').smn, 'duda');
  });
  console.log('\n' + ok + ' pruebas bien.');
})();
