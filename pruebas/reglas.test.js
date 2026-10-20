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

prueba('instalar app: archivo de instalación, íconos y botón solo cuando el navegador lo ofrece', () => {
  const man = JSON.parse(fs.readFileSync(path.join(raiz, 'manifest.webmanifest'), 'utf8'));
  assert.strictEqual(man.short_name, 'Ríos y Clima'); assert.strictEqual(man.display, 'standalone'); assert.strictEqual(man.start_url, '/');
  const tam = f => { const b = fs.readFileSync(path.join(raiz, f)); assert.strictEqual(b.toString('latin1', 1, 4), 'PNG', f); return b.readUInt32BE(16) + 'x' + b.readUInt32BE(20); };
  for (const i of man.icons) assert.strictEqual(tam(i.src), i.sizes, i.src);
  for (const t of ['192x192 any', '512x512 any', '512x512 maskable']) assert.ok(man.icons.some(i => i.sizes + ' ' + i.purpose === t), 'falta ícono ' + t);
  assert.strictEqual(tam('iconos/icono-apple-180.png'), '180x180');
  assert.ok(html.includes('<link rel="manifest" href="manifest.webmanifest">') && html.includes('<link rel="apple-touch-icon" href="iconos/icono-apple-180.png">'));
  const toml = fs.readFileSync(path.join(raiz, 'netlify.toml'), 'utf8');
  assert.ok(toml.includes("manifest-src 'self'"), 'la regla del navegador tiene que dejar leer el archivo de instalación');
  assert.ok(html.includes('@media screen and (hover:hover) and (pointer:fine){html:not(.emb) #instalar,html:not(.emb) #instalar[hidden]{display:none!important}}'), 'Instalar app y Compartir no se ven en la computadora');
  assert.ok(/\.emb \.instalar\{display:none!important\}/.test(html) && /@media print\{\.instalar\{display:none!important\}\}/.test(html), 'nunca en el portal ni al imprimir');
  assert.ok(!/serviceWorker|caches\./.test(codigo), 'no guarda el sitio en el celular: abre siempre la página publicada');
  // armado: sin ofrecimiento del navegador no se ve nada; con el ofrecimiento aparece el botón y al tocarlo pide instalar
  const ev = {}, evBtn = {}, caja = { hidden: true }, btn = { hidden: true, at: {}, setAttribute(k, v) { this.at[k] = v }, addEventListener: (t, f) => { evBtn[t] = f } }, ios = { hidden: true };
  const donde = { innerHTML: 'en la barra de Safari' }, abrir = { hidden: true };
  Object.assign(elementos, { instalar: caja, btnInstalar: btn, instIos: ios, instIosDonde: donde, instIosAbrir: abrir });
  const antes = sitio.addEventListener; sitio.addEventListener = (t, f) => { ev[t] = f };
  try {
    S('instalarApp()');
    assert.ok(caja.hidden && btn.hidden && ios.hidden, 'sin ofrecimiento no se muestra nada');
    let pidio = false, frenado = false;
    ev.beforeinstallprompt({ preventDefault: () => { frenado = true }, prompt: () => { pidio = true }, userChoice: Promise.resolve({ outcome: 'accepted' }) });
    assert.ok(frenado && !btn.hidden && !caja.hidden && ios.hidden, 'con ofrecimiento aparece el botón');
    evBtn.click(); assert.ok(pidio, 'el botón pide instalar');
    ev.appinstalled(); assert.ok(caja.hidden, 'instalada, se oculta');
    // iPhone: el mismo botón abre y cierra los pasos (Apple no deja instalar desde la página)
    caja.hidden = btn.hidden = ios.hidden = true; sitio.navigator = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1' };
    S('instalarApp()'); assert.ok(!btn.hidden && !caja.hidden && ios.hidden && btn.at['aria-expanded'] === 'false', 'en iPhone, el botón con los pasos cerrados');
    assert.ok(abrir.hidden && donde.innerHTML.includes('Safari'), 'en Safari no hace falta abrir otro navegador');
    evBtn.click(); assert.ok(!ios.hidden && btn.at['aria-expanded'] === 'true', 'al tocarlo se ven los pasos');
    evBtn.click(); assert.ok(ios.hidden && btn.at['aria-expanded'] === 'false', 'al tocarlo otra vez se cierran');
    assert.ok(/Agregar a pantalla de inicio<\/strong> o <strong>Agregar a inicio/.test(html) && html.includes('<strong>⋯</strong>'), 'los pasos nombran las dos formas de la opción y el menú ⋯');
    // Chrome en iPhone: Compartir del navegador; con iOS anterior a 16.4, primero abrir en Safari
    caja.hidden = btn.hidden = ios.hidden = true; sitio.navigator = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) CriOS/130.0 Mobile/15E148 Safari/604.1' };
    S('instalarApp()'); assert.ok(abrir.hidden && donde.innerHTML.includes('Chrome'), 'Chrome con iOS 17: desde el mismo Chrome');
    sitio.navigator = { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) CriOS/120.0 Mobile/15E148 Safari/604.1' };
    S('instalarApp()'); assert.ok(!abrir.hidden && donde.innerHTML.includes('Safari'), 'Chrome con iOS 16.3: abrir en Safari');
    // abierto desde el ícono: nada
    caja.hidden = ios.hidden = true; sitio.navigator.standalone = true;
    S('instalarApp()'); assert.ok(caja.hidden && ios.hidden, 'abierto como app no se ofrece');
  } finally { sitio.addEventListener = antes; delete sitio.navigator; delete elementos.instalar; delete elementos.btnInstalar; delete elementos.instIos; delete elementos.instIosDonde; delete elementos.instIosAbrir; }
});

prueba('contador de visitas: GoatCounter con una imagen de 1 píxel, solo el conteo, sin cargar código de afuera', () => {
  const toml = fs.readFileSync(path.join(raiz, 'netlify.toml'), 'utf8');
  const csp = /Content-Security-Policy = "([^"]+)"/.exec(toml)[1];
  const regla = n => (new RegExp(n + ' ([^;]+)').exec(csp) || [, ''])[1];
  assert.ok(regla('img-src').includes('https://riosyclimachaco.goatcounter.com'), 'la imagen del contador tiene que estar permitida');
  assert.ok(!regla('script-src').includes('goatcounter') && !regla('connect-src').includes('goatcounter'), 'no se carga su código ni se conecta de otra forma');
  assert.ok(!/<script[^>]+src=/.test(html), 'ningún script de afuera');
  assert.ok(/Privacidad:<\/b>[^]*?GoatCounter<\/a>, sin cookies ni datos de quien visita\./.test(html) && /y a GoatCounter, solo para sumar la visita\./.test(html), 'Privacidad lo cuenta');
  const pedidos = [];
  const antes = { location: sitio.location };
  Object.assign(sitio, {
    location: { protocol: 'https:', hash: '' }, screen: { width: 390, height: 844 }, devicePixelRatio: 3, URLSearchParams, URL,
    Image: class { set src(u) { pedidos.push(new URL(u)) } }
  });
  sitio.document.referrer = 'https://l.facebook.com/l.php?u=algo&fbclid=123'; sitio.document.title = 'Ríos y Clima del Chaco';
  try {
    S('contarVisita()');
    assert.strictEqual(pedidos.length, 1);
    const v = pedidos[0];
    assert.strictEqual(v.origin + v.pathname, 'https://riosyclimachaco.goatcounter.com/count');
    assert.strictEqual(v.searchParams.get('p'), '/'); assert.ok(!v.searchParams.has('e'));
    assert.deepStrictEqual([...v.searchParams.keys()].sort(), ['p', 'rnd'], 'solo el conteo: sin título, de dónde se llegó ni pantalla');
    S("contador('instalar-app-boton',true)");
    assert.strictEqual(pedidos[1].searchParams.get('e'), 'true'); assert.strictEqual(pedidos[1].searchParams.get('p'), 'instalar-app-boton');
    sitio.location = { protocol: 'file:', hash: '' }; S('contarVisita()');
    assert.strictEqual(pedidos.length, 2, 'fuera del sitio publicado no cuenta');
  } finally {
    sitio.location = antes.location; for (const k of ['screen', 'devicePixelRatio', 'URLSearchParams', 'URL', 'Image']) delete sitio[k];
    delete sitio.document.referrer; delete sitio.document.title;
  }
});

prueba('Hidroalerta Vilelas: enlace en el detalle de Puerto Vilelas y debajo del río, sin pedirle datos', () => {
  const v = S('VILELAS');
  assert.ok(v.includes('href="https://hidrometro.concejovilelas.com/#publica"') && v.includes('rel="noopener"'));
  assert.ok(/m\[0\]==='Puerto Vilelas'\?'<p>[^']*'\+VILELAS/.test(codigo), 'falta en el detalle del municipio');
  assert.ok(/\+lineaYacy\(\)\+RIO_LEER\(\)\+\(pf\.length\?RIO_PRONO\(\):''\)\n\s*\+'<p class="meta">[^']*'\+VILELAS/.test(codigo), 'falta debajo del río');
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
  // Desde el 17/10/2026 el rojo mira solo hoy y los 2 días siguientes; el amarillo, los 7 días
  const n3 = (cayo, viene, max, viene3, max3) => S(`nivelLluvia({cayo:${cayo},viene:${viene},max:${max},viene3:${viene3},max3:${max3}})`);
  assert.strictEqual(n3(16, 130, 115, 10, 5), 1);     // caso real de La Leonesa, 17/10: 115 mm a 6 días → amarillo
  assert.strictEqual(n3(0, 130, 40, 120, 40), 2);     // 120 mm en 3 días → rojo
  assert.strictEqual(n3(0, 90, 85, 85, 85), 2);       // 80 mm o más en un día dentro de los 3 → rojo
  assert.strictEqual(n3(100, 90, 30, 70, 30), 2);     // cayeron 100 y vienen 70 en 3 días → rojo
  assert.strictEqual(n3(100, 90, 30, 69, 30), 1);
  assert.strictEqual(n3(0, 50, 30, 20, 10), 0);       // el amarillo no cambia
  assert.ok(S(`rojoLejos({cayo:16,viene:130,max:115,viene3:10,max3:5})`) && !S(`rojoLejos({cayo:0,viene:130,max:85,viene3:120,max3:85})`));
  assert.ok(S('ROJO_LEJOS').includes('más de 3 días') && /cuenta solo la lluvia prevista para hoy y los 2 días siguientes/.test(html));
});

prueba('suma de lluvia: lo caído es antes de hoy, lo que viene incluye hoy', () => {
  const r = S(`sumarLluvia(['2026-10-05','2026-10-06','2026-10-07','2026-10-08'],[10,20,5,40],'2026-10-07')`);
  assert.strictEqual(r.cayo, 30); assert.strictEqual(r.viene, 45);
  assert.strictEqual(r.max, 40); assert.strictEqual(r.maxDia, '2026-10-08');
  const t = S(`sumarLluvia(['2026-10-16','2026-10-17','2026-10-18','2026-10-19','2026-10-20','2026-10-21'],[3,1,2,4,50,9],'2026-10-17')`);
  assert.strictEqual(t.viene, 66); assert.strictEqual(t.viene3, 7); assert.strictEqual(t.max3, 4); assert.strictEqual(t.max, 50);   // hoy y 2 días más
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
  // Cada fecha prevista lleva su altura más probable y su rango (como el 19/10/2026: 7,23 m entre 7,00 y 7,80; 6,37 m entre 5,80 y 6,60)
  const pr = (f) => ({ emitido: '2027-03-08T03:00:00.000Z', p: f });
  gr = graf([['2027-03-08', 6.5], ['2027-03-10', 6.8]], pr([['2027-03-08', 6.5, 6.5, 6.5], ['2027-03-12', 7, 7.23, 7.8], ['2027-03-17', 5.8, 6.37, 6.6]]));
  assert.ok(/class="rioPrev"[^>]*>7,23 m</.test(gr) && /class="rioRango"[^>]*>7,00 a 7,80</.test(gr) && /class="rioPrev"[^>]*>6,37 m</.test(gr) && /class="rioRango"[^>]*>5,80 a 6,60</.test(gr), 'cada fecha con su altura y su rango');
  assert.ok(gr.includes('Previsto por el INA y su rango') && gr.includes('id="d-rio-prono"'), 'leyenda y explicación del pronóstico');
  gr = graf([['2027-03-08', 6.5], ['2027-03-10', 6.8]], pr([['2027-03-12', 7, 7.1, 7.3], ['2027-03-17', 7.2, 7.4, 7.6]]));
  assert.strictEqual((gr.match(/class="rioPrev"/g) || []).length, 2); assert.ok(gr.includes('>7,40 m<') && gr.includes('>7,20 a 7,60<'));
  gr = graf([['2027-03-08', 6.5], ['2027-03-10', 6.8]], pr([['2027-03-12', 6.5, 6.6, 6.7], ['2027-03-17', 6, 6.2, 6.4]]));
  assert.ok(gr.includes('>6,60 m<') && gr.includes('>6,20 m<'), 'también cuando el pronóstico baja');
  gr = graf([['2027-03-08', 6.5], ['2027-03-10', 6.8]]);
  assert.ok(!gr.includes('rioPrev') && !gr.includes('d-rio-prono'), 'sin pronóstico, ni números previstos ni explicación');
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
  // Pide a los navegadores que no lo oscurezcan solos (modo oscuro automático de Chrome)
  assert.ok(html.includes('<meta name="color-scheme" content="only light">') && html.includes(':root{color-scheme:only light}'), 'solo claro: sin oscurecido automático');
  // En el mapa, el amarillo es más claro que en el resto del sitio, para que no se confunda con el naranja
  assert.ok(/--amarillo-mapa:#f0c419/.test(html) && codigo.includes("k.c==='amarillo'?'amarillo-mapa'") && codigo.includes("c==='amarillo'?'amarillo-mapa'") && /data-c="amarillo"[^>]*><i style="background:var\(--amarillo-mapa\)/.test(html), 'amarillo claro en el mapa, sus puntos y la leyenda');
  // El Paraguay no tiene naranja (no hay pronóstico en Puerto Bermejo)
  const py = codigo.slice(codigo.indexOf('function riesgoParaguay'), codigo.indexOf('/* ---------- pantalla'));
  assert.ok(py.length > 100 && !py.includes("'naranja'"));
  S(`D.prono={datos:null}`);
});

prueba('mapa: la costa del Paraná toma el color más alto entre la lluvia y el río; los demás municipios con zonas bajas lo siguen hasta su techo', () => {
  const idx = n => S(`GEO.mun.findIndex(m=>m[0]==='${n}')`);
  const B = idx('Barranqueras'), V = idx('Puerto Vilelas'), C = idx('Isla del Cerrito'), F = idx('Fontana'), R = idx('Resistencia');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(S('RIBERA'))), ['Barranqueras', 'Puerto Vilelas']);
  assert.ok([B, V, C, F, R].every(i => i >= 0));
  const col = (lluvia, obs, prono, dia = '2026-10-13') => JSON.parse(S(`hoy='${dia}';LISTO=true;SMN=SMN_VACIO;
    D.rio={datos:{obs:${JSON.stringify(obs)}},vivo:true,t:new Date()};D.prono=${prono ? `{datos:${JSON.stringify(prono)},vivo:true,t:new Date()}` : '{datos:null}'};
    M.R=${lluvia ? `LOCS.map(()=>({c:'${lluvia}',et:ETQ['${lluvia}'],por:'x'}))` : '[]'};
    M.est=${lluvia ? `Object.fromEntries(GEO.mun.map((m,i)=>[i,{c:'${lluvia}',ll:{cayo:0,viene:0,max:0}}]))` : '{}'};M.tEst=Date.now();M.todos=${lluvia ? "'listo'" : "''"};
    JSON.stringify([${B},${V},${C},${F},${R}].map(i=>{const k=colorDe(i);return [k.c,k.tipo,!!k.rio]}))`));
  const obs13 = [['2026-10-06', 4.27], ['2026-10-10', 4.88], ['2026-10-13', 5.27]];
  const pr13 = { emitido: '2026-10-13T03:00:00.000Z', p: [['2026-10-13', 5.2, 5.3, 5.4], ['2026-10-20', 6.75, 7.3, 7.55]] };
  // Caso real del 13/10: el renglón del Paraná en naranja pinta la costa; Fontana y Resistencia siguen con su lluvia
  assert.deepStrictEqual(col('verde', obs13, pr13), [['naranja', 'gran', true], ['naranja', 'gran', true], ['naranja', 'est', true], ['verde', 'gran', false], ['naranja', 'seg', true]]);
  // La lluvia en rojo gana al naranja del río
  assert.deepStrictEqual(col('rojo', obs13, pr13).map(x => x[0] + x[2]), ['rojofalse', 'rojofalse', 'rojofalse', 'rojofalse', 'rojofalse']);
  // Río en verde: no cambia nada
  assert.deepStrictEqual(col('amarillo', [['2026-10-13', 4.0]]).slice(0, 3).map(x => x[0] + x[2]), ['amarillofalse', 'amarillofalse', 'amarillofalse']);
  // Río sobre la evacuación: rojo aunque la lluvia esté en amarillo
  assert.deepStrictEqual(col('amarillo', [['2026-10-13', 6.6]]).map(x => x[0]), ['rojo', 'rojo', 'naranja', 'amarillo', 'naranja']);   // Isla del Cerrito y Resistencia, con techo
  // Caso real del 17/10: río sobre la alerta (6,08 m) y el INA prevé pasar la evacuación (7,23 m): renglón en rojo, como el comunicado oficial
  const obs17 = [['2026-10-11', 5.01], ['2026-10-14', 5.4], ['2026-10-16', 6.08]];
  const pr17 = { emitido: '2026-10-16T03:00:00.000Z', p: [['2026-10-16', 6.08, 6.08, 6.08], ['2026-10-20', 7, 7.23, 7.8]] };
  assert.deepStrictEqual(col('verde', obs17, pr17, '2026-10-17').map(x => x[0]), ['rojo', 'rojo', 'naranja', 'verde', 'naranja']);   // Isla del Cerrito y Resistencia con su techo
  const rr = JSON.parse(S(`JSON.stringify(riesgoRio())`));
  assert.ok(rr.pr && rr.por.includes('queda en rojo'), rr.por);
  assert.ok(JSON.parse(S(`JSON.stringify(rioInfo(colorDe(${B})))`)).includes('El rojo sale de la altura de hoy y de lo que prevé el INA'));
  // El detalle de Resistencia (localidad del semáforo) dice el color del mapa (naranja por el río) y aparte el de la lluvia
  const inf = {}; elementos.mInfo = inf; S(`M.sel=${R};pintarInfo();M.sel=-1`); delete elementos.mInfo;
  assert.ok(inf.innerHTML.includes('<b>Naranja</b>') && !inf.innerHTML.includes('<b>Verde</b>'), 'el color grande es el del mapa: ' + inf.innerHTML.slice(0, 300));
  assert.ok(inf.innerHTML.includes('Por la lluvia, su semáforo está en verde.') && inf.innerHTML.includes('Naranja por el río Paraná'), inf.innerHTML.slice(0, 400));
  col('verde', [['2026-10-17', 4.0]], null, '2026-10-17'); const inf2 = {}; elementos.mInfo = inf2; S(`M.sel=${R};pintarInfo();M.sel=-1`); delete elementos.mInfo;
  assert.ok(inf2.innerHTML.includes('Localidad del semáforo') && inf2.innerHTML.includes('<b>Verde</b>'), 'sin el río, como siempre: ' + inf2.innerHTML.slice(0, 200));
  // Río sobre la alerta, pero el pronóstico no pasa la evacuación: sigue amarillo
  assert.strictEqual(col('verde', obs17, { emitido: '2026-10-16T03:00:00.000Z', p: [['2026-10-20', 6.0, 6.3, 6.45]] }, '2026-10-17')[0][0], 'amarillo');
  // Sin datos de lluvia todavía, el río igual pinta la costa
  assert.deepStrictEqual(col(null, obs13, pr13).slice(0, 3).map(x => x[0] + x[1]), ['naranjario', 'naranjario', 'naranjario']);
  // Leyenda con el naranja, aclarando que no es una alerta del SMN
  assert.ok(/data-c="naranja"[^<]*<i style="background:var\(--naranja\)[^>]*><\/i>Naranja<\/button>/.test(html) && /<li data-c="naranja"><b>Naranja:<\/b> solo en la costa del Paraná[^<]*No es una alerta del SMN\.<\/li>/.test(html), 'leyenda');
  assert.ok(/<li data-c="amarillo"><b>Amarillo:<\/b> [^<]*el Paraná alto[^<]*<\/li>/.test(html) && /<li data-c="rojo"><b>Rojo:<\/b> [^<]*el Paraná muy alto[^<]*<\/li>/.test(html), 'la leyenda nombra al río también en amarillo y en rojo');
  assert.ok(!html.includes('cuando el pronóstico del INA prevé pasar el nivel de evacuación. No es'), 'el naranja ya no dice solo lo del pronóstico');
  assert.ok(!html.includes('Es la única forma de que el mapa muestre rojo por el río') && !html.includes('nunca a rojo'), 'sin los textos de antes del 17/10');
  assert.strictEqual(S('ETQ.naranja'), 'Naranja');
  assert.ok(/#mInfo\.naranja\{border-color:var\(--naranja\)\}/.test(html), 'borde del detalle');
  // Colonia Benítez: con el Paraná fuera del verde sigue al río, también en rojo (San Pedro Pescador y Puerto Antequeras, fuera del cordón de defensa)
  const CB = idx('Colonia Benítez'); assert.ok(CB >= 0);
  const RP = JSON.parse(JSON.stringify(S('RIBERA_PISO')));
  assert.deepStrictEqual(Object.keys(RP).map(n => n + ':' + RP[n].t), ['Resistencia:naranja', 'Margarita Belén:naranja', 'Colonia Benítez:rojo', 'Isla del Cerrito:naranja', 'La Leonesa:amarillo', 'Las Palmas:amarillo', 'Puerto Bermejo:amarillo', 'General Vedia:amarillo', 'Basail:amarillo']);
  assert.ok(Object.keys(S('RIBERA_PISO')).every(n => idx(n) >= 0), 'todos están en el mapa');
  const cb = (lluvia, obs, prono) => { col(lluvia, obs, prono); return JSON.parse(S(`(k=>JSON.stringify([k.c,!!k.rio,!!k.piso,rioInfo(k)]))(colorDe(${CB}))`)); };
  let r = cb('verde', obs13, pr13);   // río en naranja (caso real del 13/10): Colonia Benítez llega a naranja
  assert.deepStrictEqual(r.slice(0, 3), ['naranja', true, true]);
  assert.ok(r[3].includes('Naranja por el río Paraná') && r[3].includes('San Pedro Pescador') && r[3].includes('Puerto Antequeras') && r[3].includes('#t-rio') && !r[3].includes('defensas'), r[3]);
  // Los demás municipios con zonas bajas: amarillo con su propia aclaración
  for (const [n, z] of [['La Leonesa', 'río Paraguay'], ['Puerto Bermejo', 'Puerto Bermejo Viejo'], ['Basail', 'zona rural'], ['General Vedia', 'Bermejo'], ['Las Palmas', 'río Paraguay']]) {
    const q = JSON.parse(S(`(k=>JSON.stringify([k.c,!!k.rio,rioInfo(k)]))(colorDe(${idx(n)}))`));
    assert.deepStrictEqual(q.slice(0, 2), ['amarillo', true], n);   // río en naranja: techo amarillo
    assert.ok(q[2].includes(z) && q[2].includes('alertas oficiales') && !q[2].includes('San Pedro'), n + ': ' + q[2]);
  }
  assert.strictEqual(JSON.parse(S(`JSON.stringify(colorDe(${idx('Basail')}).c)`)), 'amarillo');
  r = cb('verde', [['2026-10-13', 6.6]]);   // río en rojo: Colonia Benítez también en rojo, por su costa
  assert.deepStrictEqual(r.slice(0, 2), ['rojo', true]);
  assert.ok(r[3].includes('Rojo por el río Paraná') && r[3].includes('fuera del cordón de defensa') && !r[3].includes('el agua del río queda afuera'), r[3]);
  assert.deepStrictEqual(cb('rojo', obs13, pr13).slice(0, 2), ['rojo', false]);                // la lluvia en rojo gana
  assert.deepStrictEqual(cb('amarillo', obs13, pr13).slice(0, 2), ['naranja', true]);          // amarillo por lluvia: el río la sube a naranja
  assert.deepStrictEqual(cb('verde', [['2026-10-13', 4.0]]).slice(0, 2), ['verde', false]);     // río en verde: nada
  assert.deepStrictEqual(cb(null, obs13, pr13).slice(0, 2), ['naranja', true]);                // sin lluvia todavía
  // Fontana no sigue al río; Resistencia, Margarita Belén e Isla del Cerrito, hasta naranja (también con el río en rojo); Resistencia dice lo de las defensas
  assert.deepStrictEqual(col('verde', [['2026-10-13', 6.6]]).slice(2).map(x => x[0]), ['naranja', 'verde', 'naranja']);
  assert.deepStrictEqual(col('verde', obs13, pr13).slice(3).map(x => x[0]), ['verde', 'naranja']);
  assert.strictEqual(JSON.parse(S(`JSON.stringify(colorDe(GEO.mun.findIndex(m=>m[0]==='Margarita Belén')).c)`)), 'naranja');
  const rs = JSON.parse(S(`JSON.stringify(rioInfo(colorDe(${R})))`));
  assert.ok(rs.includes('fuera de las defensas') && rs.includes('el agua del río queda afuera') && !rs.includes('no hace falta hacer nada'), rs);
  S(`D.prono={datos:null};M.R=[];M.est={};M.todos=''`);
});

prueba('celulares lentos: formatos armados una sola vez, la página no salta al cargar y el ícono liviano', () => {
  // Armar un formato de fecha o de número en cada uso trababa la página casi un segundo en un celular lento
  assert.ok(!/new Intl\.\w+\([^)]*\)\.format\(/.test(codigo) && !codigo.includes('toLocaleString('), 'ningún formato se arma en cada uso');
  assert.strictEqual(S("nf(1234.5,1)"), '1.234,5'); assert.strictEqual(S("nf(6.8,2)"), '6,80'); assert.strictEqual(S("nf(38000)"), '38.000');
  assert.strictEqual(S("fFechaHora(new Date('2026-10-18T22:51:00Z'))"), '18/10, 19:51 h');
  assert.strictEqual(S("diaAR(new Date('2026-10-19T02:30:00Z'))"), '2026-10-18'); assert.strictEqual(S("fDiaLargo('2026-10-21')"), 'miércoles 21/10');
  // El lugar del botón Compartir queda reservado hasta que corre el código (el botón sigue empezando oculto), y el del mapa también
  assert.ok(html.includes('@media screen{html:not(.emb) #instalar[hidden]{display:flex!important;visibility:hidden}html:not(.emb) #instalar[hidden] #btnCompartir{display:inline-flex!important}}'), 'lugar reservado para Compartir');
  const base = S('BASE'), ar = /#mapa\{[^}]*aspect-ratio:(\d+)\/(\d+)\}/.exec(html);
  assert.ok(ar && Number(ar[1]) === base.w && Number(ar[2]) === base.h, 'el lugar del mapa tiene la misma forma que BASE (si cambia BASE, cambiar aspect-ratio)');
  // El botón "Instalar app" usa el ícono liviano (el mismo dibujo que los íconos de la app), que ya está en caché como ícono de la pestaña
  assert.ok(html.includes('<img src="icono.svg" alt="" width="28" height="28">Instalar app') && html.includes('<link rel="icon" href="icono.svg"'), 'ícono liviano en el botón');
  assert.ok(fs.statSync(path.join(raiz, 'icono.svg')).size < 3000, 'icono.svg es liviano');
});

prueba('publicar: Netlify corre las pruebas antes de publicar, con Node 22', () => {
  const toml = fs.readFileSync(path.join(raiz, 'netlify.toml'), 'utf8');
  assert.ok(/\[build\]\s+publish = "\."\s+command = "node pruebas\/reglas\.test\.js"/.test(toml), 'si una prueba falla, Netlify no publica');
  assert.ok(/\[build\.environment\]\s+NODE_VERSION = "22"/.test(toml), 'Node 22 en Netlify');
});

prueba('accesibilidad y textos: parte principal de la página y la llave de la luz solo sin pisar agua', () => {
  assert.strictEqual((html.match(/<main>/g) || []).length, 1); assert.strictEqual((html.match(/<\/main>/g) || []).length, 1);
  assert.ok(html.indexOf('<main>') < html.indexOf('class="aviso info"') && html.indexOf('</main>') < html.indexOf('<footer>') && html.indexOf('</header>') < html.indexOf('<main>'), 'el encabezado y el pie quedan afuera');
  assert.ok(/main\{display:flex;flex-direction:column;gap:16px/.test(html), 'mismo espacio entre secciones que antes');
  assert.strictEqual((html.match(/si podés llegar sin pisar agua, bajá la llave de la luz/g) || []).length, 2, 'lluvia fuerte y crecida del río');
  assert.ok(!html.includes('<b>Si entra agua a tu casa:</b> bajá la llave'), 'sin la versión anterior');
});

prueba('navegación: índice arriba del mapa, botón para volver al índice, Atrás vuelve adonde estaba y botones grandes en las franjas', () => {
  // Índice: debajo de las franjas, antes del mapa; cada botón lleva a una sección que existe
  const i0 = html.indexOf('id="indice"');
  assert.ok(i0 > html.indexOf('id="rioBanda"') && i0 > html.indexOf('id="smnBanda"') && i0 < html.indexOf('id="t-mapa"'), 'debajo de las franjas y arriba del mapa');
  const nav = html.slice(i0, html.indexOf('</nav>', i0)), destinos = [...nav.matchAll(/href="#(t-[a-z]+)"/g)].map(m => m[1]);
  assert.deepStrictEqual(destinos, ['t-mapa', 't-smn', 't-hacer', 't-tel', 't-sem', 't-rio', 't-otros', 't-lluvia', 't-nino', 't-acerca']);
  for (const d of destinos) assert.ok(html.includes('id="' + d + '"'), 'falta la sección ' + d);
  // Índice lateral (computadora, desde 1100 px): mismos destinos que el de arriba, que en esa pantalla se esconde junto con "↑ Índice";
  // en el celular, en el portal y al imprimir no se ve; el mapa va al lado de su detalle
  const l0 = html.indexOf('id="lado"'), lado = html.slice(l0, html.indexOf('</nav>', l0));
  assert.ok(l0 > html.indexOf('<header') && l0 < html.indexOf('</header>'), 'el índice lateral va en la columna del nombre del sitio');
  assert.deepStrictEqual([...lado.matchAll(/href="#(t-[a-z]+)"/g)].map(m => m[1]), destinos, 'mismos destinos que el índice de arriba');
  assert.ok(/\.lado\{display:none\}/.test(html) && html.includes('@media screen and (min-width:1100px){'), 'solo en pantallas anchas y en pantalla (no al imprimir)');
  const ancho = html.slice(html.indexOf('@media screen and (min-width:1100px){'));
  assert.ok(ancho.includes('html:is(:not(.emb),.embPc) .lado{display:flex') && ancho.includes('html:is(:not(.emb),.embPc) .indice,html:is(:not(.emb),.embPc) .aIndice{display:none!important}'), 'en el portal solo si el portal avisa su pantalla (embPc); arriba se esconde el otro índice');
  assert.ok(ancho.includes('section[aria-labelledby="t-mapa"]>#mapa{grid-column:1'), 'mapa al lado de su detalle');
  assert.ok(/function indiceLateral\(\)\{\s*const nav=\$\('lado'\);if\(!nav\|\|typeof innerHeight/.test(codigo) && codigo.includes("setAttribute('aria-current','location')"), 'marca la sección actual (también en el portal, con lo que se ve de su pantalla)');
  assert.ok(/a\[href\^="#t-"\][^\n]*abrirSec/.test(codigo), 'los enlaces del índice abren la sección cerrada');
  // Computadora (19/10): columna fija con nombre, Compartir e índice; franjas de a dos; río al lado de sus datos; tarjetas en 2 filas; secciones cerradas de a dos
  assert.ok(ancho.includes('html:is(:not(.emb),.embPc) .cab{grid-column:1;grid-row:1/span 2;position:sticky'), 'nombre del sitio e índice en la columna fija');
  assert.ok(ancho.includes('>:is(#smnBanda,#rioBanda){grid-column:auto') && ancho.includes('main>section.plegable.cerrada:not(.solo){grid-column:auto}'), 'franjas y secciones cerradas de a dos');
  assert.ok(ancho.includes('#rio .rioCuerpo{display:grid') && html.includes('.rioCuerpo,.rioGraf,.rioLado{display:contents}'), 'el río al lado de sus datos; en el celular igual que antes');
  assert.ok(ancho.includes('.hSit{grid-template-columns:repeat(5,minmax(0,1fr))}'), 'tarjetas de "¿Qué está pasando?" en dos filas');
  assert.ok(/function iniciarMarcasLado\(\)\{\s*if\(typeof MutationObserver/.test(codigo) && codigo.includes("i.className='ladoPt'"), 'puntos de color en el índice lateral');
  // Dentro del portal en la computadora (20/10): con el aviso del portal (viewport) el sitio se acomoda como el original y el menú acompaña lo que se baja; sin aviso, una columna como antes
  assert.ok(codigo.includes("d.channel===CANAL&&d.type==='viewport'||d.tipo==='rios-y-clima:vista'") && codigo.includes("if(e.origin!==PORTAL||e.source!==window.parent||!d)return;") && codigo.includes("classList.toggle('embPc',f)"), 'solo hace caso al portal; recién con su aviso usa el acomodo de computadora');
  assert.ok(codigo.includes("VISTA.fijo&&PC_EMB()") && codigo.includes("FIJO&&VISTA?altoFijo():") && ancho.includes('html.embPc{scrollbar-width:none}'), 'en el portal en la computadora: marco del alto de la pantalla y el sitio se desplaza por dentro (menú fijo sin saltos)');
  assert.ok(codigo.includes("if(dy>0&&d>1){e.preventDefault();pasarAlPortal(Math.min(dy,d))}") && codigo.includes("{channel:CANAL,type:'scroll-by',dy,smooth:!!suave},PORTAL"), 'mientras el marco no llegó arriba, la rueda mueve la página del portal; solo al portal');
  assert.ok(codigo.includes("if(AVISAR_ALTO)AVISAR_ALTO();\n}") && codigo.includes("else if(dy<0&&si<=0||dy>0&&si>=mx-1){e.preventDefault();pasarAlPortal(dy)}") && codigo.includes("if(si>1&&si<mx-1&&Math.abs(d)>1)pasarAlPortal(d)},250)") && ancho.includes('html.embPc .cab{min-height:0;scrollbar-width:none}'), 'sin avisos en ronda; arriba de todo o al final la rueda pasa al portal; quieto, se acomoda; menú sin alto mínimo en el portal');
  // Menú lateral (19/10, mediodía): ocupa el alto de la pantalla, íconos, renglón con el estado (el río nunca dice "alerta"), barrita de avance y "↑ Arriba" (el 911 se sacó del pie el 20/10)
  assert.ok(ancho.includes('height:calc(100vh - 32px)') && html.includes('<span class="ladoProg" aria-hidden="true"><i id="ladoProg"></i></span>') && html.includes('.ladoPie{display:none}'), 'alto completo, avance y pie solo en computadora');
  assert.ok(html.includes('<div id="t-tel">') && html.includes('· <a href="#t-tel">Más teléfonos</a> ·') && html.includes('<div class="ladoFila"><button class="btn" type="button" id="ladoArriba">↑ Arriba</button></div>') && !html.includes('ladoTel'), 'Teléfonos lleva directo a los números');
  assert.ok(codigo.includes("x.tagName!=='H2'?x:"), 'en el índice lateral, Teléfonos se marca desde donde empiezan los números y no tapa a Qué hacer');
  assert.ok((lado.match(/class="ladoIco" aria-hidden="true"/g) || []).length === 10 && (lado.match(/class="ladoSub"/g) || []).length === 10, 'un ícono y un renglón por destino');
  assert.ok(/alt\[m\[1\]\]='En '\+m\[2\]/.test(codigo) && codigo.includes("'Alerta '+fem[nS]"), 'el renglón del río dice el color y la altura; el del SMN, la alerta');
  // "↑ Índice": empieza oculto, aparece al bajar; nunca en el portal ni al imprimir
  assert.ok(/<a class="aIndice" id="aIndice" href="#indice" hidden>/.test(html));
  assert.ok(html.includes('.emb .aIndice,.emb .indice{display:none}') && html.includes('@media print{.indice,.aIndice,.bAcc{display:none!important}}'));
  assert.ok(codigo.includes('seguro(botonIndice)'));
  // Saltos con botón: dejan marca en el historial (Atrás vuelve), salvo en el portal
  assert.ok(/function marcarSalto\(\)\{if\(EMB\)return;try\{history\.pushState/.test(codigo));
  for (const t of ["{marcarSalto();verSec($('t-mapa'))}", 'function irSec(id){abrirSec(id,true,false);marcarSalto();verSec($(id))}',
    "if(i>=0){elegir(i,true);marcarSalto();verSec($('t-mapa'))}", 'd.open=true;marcarSalto();verSec(d)'])
    assert.ok(codigo.includes(t), 'falta la marca en: ' + t);
  // Buscador: al encontrar el municipio cierra el teclado y baja hasta el mapa
  assert.ok(codigo.includes("elegir(i,true);$('mBuscar').blur()") && /if\(t<-4\|\|t>8\)\{marcarSalto\(\);verSec\(\$\('t-mapa'\)\)\}/.test(codigo));
  // Franjas: las acciones son botones de 44 px, no enlaces chicos dentro del texto
  assert.ok(html.includes('.bBtn{display:inline-flex;align-items:center;min-height:44px'));
  assert.ok(codigo.includes('<a class="btn bBtn" href="#t-smn">Ver días y horarios</a>') && codigo.includes('<button type="button" class="btn bBtn" data-h="rio">Qué hacer</button><a class="btn bBtn" href="'));
});

prueba('secciones de arriba compactas: lo principal a la vista y el detalle desplegable', () => {
  // Cartel informativo en una línea, siempre a la vista (no es un desplegable)
  const av = /<div class="aviso info" role="note" data-corto>([\s\S]*?)<\/div>/.exec(html);
  assert.ok(av, 'cartel corto');
  assert.ok(av[1].includes('<b>Sitio informativo:</b> no reemplaza las alertas del SMN ni los avisos oficiales.') && av[1].includes('href="tel:911"') && av[1].includes('href="#t-tel"') && av[1].includes('href="https://www.smn.gob.ar/alertas"'));
  assert.ok(!/<details[^>]*>[^]*?Sitio informativo/.test(html.slice(0, html.indexOf('id="smnBanda"'))), 'el cartel no se esconde');
  // Mapa: leyenda corta con los mismos botones; las explicaciones en "¿Qué significa cada color?"
  const mapa = html.slice(html.indexOf('id="t-mapa"'), html.indexOf('id="t-smn"'));
  for (const c of ['verde', 'amarillo', 'naranja', 'rojo', 'gris']) assert.ok(mapa.includes('<button class="ley" type="button" data-c="' + c + '"'), 'botón ' + c);
  assert.ok(/<details class="det" id="d-colores">\s*<summary>¿Qué significa cada color\?<\/summary>/.test(mapa) && mapa.includes('Colonia Benítez lo sigue hasta rojo'));
  assert.ok(mapa.indexOf('id="mapa"') < mapa.indexOf('d-colores') && mapa.indexOf('id="mInfo"') < mapa.indexOf('d-colores') && mapa.indexOf('d-colores') < mapa.indexOf('id="mEstado"'), 'el mapa, el detalle y la fecha quedan a la vista');
  // Qué hacer: "Ahora en el Chaco", teléfonos y tarjetas a la vista; colores del SMN y fuentes en "Más información"
  const hacer = html.slice(html.indexOf('id="t-hacer"'), html.indexOf('id="t-sem"')), mas = hacer.indexOf('id="d-hacer-mas"');
  assert.ok(mas > hacer.indexOf('id="hHoy"') && mas > hacer.indexOf('href="tel:+543624448000"') && mas > hacer.indexOf('id="h-mochila"'));
  assert.ok(hacer.indexOf('class="hNiv"') > mas && hacer.indexOf('SINAGIR') > mas && hacer.lastIndexOf('</details>') > hacer.indexOf('SINAGIR'));
  // Desplegables: se recuerdan, se abren al imprimir y "Ver días y horarios" abre los del SMN
  assert.ok(codigo.includes('seguro(iniciarPlegables);seguro(iniciarDesplegables);') && codigo.includes("addEventListener('beforeprint',()=>{DET_IMPR=true;"));
  assert.ok(codigo.includes("if(id==='t-smn'&&a.classList.contains('bBtn'))document.querySelectorAll('#smn details.det').forEach(d=>{d.open=true});"));
  // SMN: una línea por fenómeno con su color más alto; día, horario y municipios al desplegar
  S("hoy='2026-10-19'");
  S(`SMN={emitido:new Date().toISOString(),capturado:new Date().toISOString(),leidas:5,fechas:['2026-10-19','2026-10-20','2026-10-21'],areas:GEO.mun.map((m,i)=>i),alertas:{}}`);
  S("SMN.alertas[0]=[['2026-10-21',41,0,0,3,0,1]];SMN.alertas[1]=[['2026-10-21',41,0,0,3,0,1],['2026-10-20',41,0,0,4,0,0]]");
  const el = { style: {} }, bd = {}; Object.assign(elementos, { smn: el, smnBanda: bd }); S('pintarSMN()'); delete elementos.smn; delete elementos.smnBanda;
  const T = S('GEO.mun.length'), h = el.innerHTML;
  assert.strictEqual((h.match(/class="smnGrupo"/g) || []).length, 1, 'un bloque por fenómeno');
  assert.ok(h.includes('<p class="smnLinea">Para mañana y el miércoles 21/10 · 2 de ' + T + ' municipios.</p>'), h.slice(0, 600));
  assert.ok(/class="smnChip n4"/.test(h) && h.includes('alerta naranja</small>'), 'el color más alto a la vista');
  assert.ok(/<details class="det" data-ev="41"><summary>Ver horarios y municipios<\/summary>/.test(h) && h.indexOf('municipios: ') > h.indexOf('Ver horarios'), 'los municipios al desplegar');
  S("SMN_ABIERTOS.add('41');pintarSMN()"); S('SMN_ABIERTOS.clear();SMN=SMN_VACIO');
});

prueba('franja del río arriba de todo: desde amarillo, con el color y el texto del renglón; primero la más grave', () => {
  const fr = {}, sb = { hidden: true, className: '' }; let orden = '';
  sb.before = () => { orden = 'río primero' }; sb.after = () => { orden = 'SMN primero' };
  Object.assign(elementos, { rioBanda: fr, smnBanda: sb });
  const poner = (dia, obs, prono, py) => S(`hoy='${dia}';LISTO=true;D.rio={datos:{obs:${JSON.stringify(obs)}},vivo:true,t:new Date()};
    D.prono=${prono ? `{datos:${JSON.stringify(prono)},vivo:true,t:new Date()}` : '{datos:null}'};
    D.paraguay={datos:{obs:${JSON.stringify(py || [[dia, 3.0]])}},vivo:true,t:new Date()};pintarRioBanda()`);
  // Caso real del 18/10: 6,80 m en Barranqueras, sobre la evacuación; el INA prevé 7,23 m para el 20/10
  const pr16 = { emitido: '2026-10-16T03:00:00.000Z', p: [['2026-10-16', 6.08, 6.08, 6.08], ['2026-10-20', 7, 7.23, 7.8], ['2026-10-27', 5.8, 6.37, 6.6]] };
  poner('2026-10-18', [['2026-10-15', 5.61], ['2026-10-16', 6.08], ['2026-10-17', 6.5], ['2026-10-18', 6.8]], pr16);
  assert.strictEqual(fr.hidden, false); assert.strictEqual(fr.className, 'n5', 'rojo, como el renglón');
  for (const t of ['Río Paraná en rojo</b> · 6,80 m en Barranqueras (evacuación: 6,50 m)</p>', 'Islas y costa fuera de las defensas. ' + S('DEFENSAS_CORTA'), 'data-h="rio"', 'href="#t-rio"'])
    assert.ok(fr.innerHTML.includes(t), 'falta: ' + t + '\n' + fr.innerHTML);
  // Corta (19/10): sin el texto largo del renglón ni el pronóstico cuando el color no sale de él
  assert.ok(!fr.innerHTML.includes('superó el nivel') && !fr.innerHTML.includes('INA'), 'franja corta: ' + fr.innerHTML);
  assert.ok(!/alerta (roja|naranja|amarilla)|alerta del río/i.test(fr.innerHTML), 'no dice "alerta": los colores salen del INA');
  // Naranja por el pronóstico (caso del 13/10): lo dice así y el pronóstico no se repite
  poner('2026-10-13', [['2026-10-06', 4.27], ['2026-10-10', 4.88], ['2026-10-13', 5.27]], { emitido: '2026-10-13T03:00:00.000Z', p: [['2026-10-13', 5.2, 5.3, 5.4], ['2026-10-20', 6.75, 7.3, 7.55]] });
  assert.strictEqual(fr.className, 'n4');
  assert.ok(fr.innerHTML.includes('Río Paraná en naranja</b> · 5,27 m en Barranqueras (alerta: 6,00 m), creciendo · el INA prevé 7,30 m para el 20/10</p>') && (fr.innerHTML.match(/7,30 m/g) || []).length === 1, fr.innerHTML);
  // Ríos en verde: no hay franja
  poner('2026-10-18', [['2026-10-18', 4.0]], null);
  assert.strictEqual(fr.hidden, true);
  // Paraguay cerca de la alerta y creciendo: amarillo, con su zona y su sección, sin la frase de las defensas
  poner('2026-10-18', [['2026-10-18', 4.0]], null, [['2026-10-15', 5.7], ['2026-10-18', 6.1]]);
  assert.ok(!fr.hidden && fr.className === 'n3' && fr.innerHTML.includes('Río Paraguay en amarillo') && fr.innerHTML.includes('Puerto Bermejo a Isla del Cerrito')
    && fr.innerHTML.includes('href="#t-otros"') && !fr.innerHTML.includes(S('DEFENSAS_CORTA')), fr.innerHTML);
  assert.ok(!S('DEFENSAS_CORTA').includes('no hace falta') && S('DEFENSAS_CORTA').includes('seguí los avisos oficiales'), 'la frase corta no dice menos que lo oficial');
  // Con la franja del SMN también a la vista: primero la más grave (si son iguales, la del SMN)
  sb.hidden = false; sb.className = 'n5'; S('ordenBandas()'); assert.strictEqual(orden, 'SMN primero');
  sb.className = 'n3'; poner('2026-10-18', [['2026-10-18', 6.8]], null); assert.strictEqual(orden, 'río primero');
  for (const k of ['rioBanda', 'smnBanda']) delete elementos[k];
  S(`D.prono={datos:null};D.paraguay={datos:null};D.rio={datos:null}`);
  // Se pinta con lo demás, debajo del cartel informativo y antes del mapa; "Ahora en el Chaco" usa el mismo título y la misma zona
  assert.ok(codigo.includes("seguro(pintarRioBanda,['rio','prono','paraguay'])"));
  assert.ok(html.indexOf('class="aviso info"') < html.indexOf('id="rioBanda"') && html.indexOf('id="smnBanda"') < html.indexOf('id="rioBanda"') && html.indexOf('id="rioBanda"') < html.indexOf('id="t-mapa"'));
  assert.ok(codigo.includes("txt:'<b>'+rioTit(rio,r)+'</b> · '+RIO_ZONA[rio]"));
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

prueba('SMN: la franja dice para qué día es la alerta y muestra solo hoy y 2 días más, como la página del SMN', () => {
  S("hoy='2026-10-18'");
  assert.strictEqual(S("smnDiasTxt(new Set(['2026-10-20']))"), 'el martes 20/10');
  assert.strictEqual(S("smnDiasTxt(new Set(['2026-10-19','2026-10-18']))"), 'hoy y mañana');
  S(`SMN={emitido:'2026-10-18T20:00:00Z',capturado:new Date().toISOString(),fechas:['2026-10-18','2026-10-19','2026-10-20','2026-10-21'],areas:GEO.mun.map(()=>0),alertas:{0:[['2026-10-20',41,0,0,3,0,1],['2026-10-21',41,0,0,3,0,1]]}}`);
  assert.strictEqual(S('smnDe(0).map(a=>a.dia).join()'), '2026-10-20', 'el cuarto día queda afuera');
  S("SMN.alertas={0:[['2026-10-21',37,0,0,4,0,0]]}");
  assert.strictEqual(S('smnDe(0).length'), 0);
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

  // Robot del Pacífico: PNG armados acá (transparente = día sin publicar), NASA simulada
  const pc = require('../robot/pacifico.js'), zl = require('zlib');
  const crc = b => { let c = ~0; for (const x of b) { c ^= x; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; } return ~c >>> 0; };
  const trozo = (t, d) => { const l = Buffer.alloc(4), r = Buffer.alloc(4), td = Buffer.concat([Buffer.from(t, 'latin1'), d]); l.writeUInt32BE(d.length); r.writeUInt32BE(crc(td)); return Buffer.concat([l, td, r]); };
  // png(tipo, profundidad, filas de bytes ya armadas, tRNS opcional), 4x2, filtro 1 (Sub) en la segunda fila para probar el desfiltrado
  const png = (tipo, prof, filas, trns) => {
    const ih = Buffer.alloc(13); ih.writeUInt32BE(4, 0); ih.writeUInt32BE(2, 4); ih[8] = prof; ih[9] = tipo;
    const bpp = Math.max(1, ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[tipo] * prof) >> 3);
    const datos = Buffer.concat(filas.map((f, y) => { const b = Buffer.from(f); if (y === 0) return Buffer.concat([Buffer.from([0]), b]);
      const s = Buffer.from(b.map((v, x) => (v - (x >= bpp ? b[x - bpp] : 0)) & 255)); return Buffer.concat([Buffer.from([1]), s]); }));
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), trozo('IHDR', ih), ...(trns ? [trozo('PLTE', Buffer.alloc(6)), trozo('tRNS', Buffer.from(trns))] : []), trozo('IDAT', zl.deflateSync(datos)), trozo('IEND', Buffer.alloc(0))]);
  };
  const rgbaVacio = png(6, 8, [Array(16).fill(0), Array(16).fill(0)]);
  const rgbaAlgo = png(6, 8, [Array(16).fill(0), [0, 0, 0, 0, 0, 0, 0, 0, 200, 30, 10, 255, 0, 0, 0, 0]]);
  const palVacio = png(3, 8, [[0, 0, 0, 0], [0, 0, 0, 0]], [0, 255]), palAlgo = png(3, 8, [[0, 0, 0, 0], [0, 0, 1, 0]], [0, 255]);
  const pal2Algo = png(3, 2, [[0b00000000], [0b00000100]], [0, 255]);   // 2 bits por punto: el tercero de la fila 2 es el color 1
  const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(80000, 7)]);
  let nasa = [], publicados = new Set(['2026-10-17']);
  global.fetch = async url => { nasa.push(url); const d = /TIME=([\d-]+)/.exec(url)[1];
    const b = url.includes('FORMAT=image/png') ? (publicados.has(d) ? rgbaAlgo : rgbaVacio) : jpg;
    return { ok: true, arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.length) }; };
  const p1 = await pc.armarPacifico(null, new Date('2026-10-19T15:00:00Z'));
  const pedidos1 = nasa.length; nasa = [];
  const p2 = await pc.armarPacifico(p1.salida, new Date('2026-10-25T15:00:00Z'));            // 6 días: no pide
  publicados = new Set();
  const p3 = await pc.armarPacifico(p1.salida, new Date('2026-10-26T16:00:00Z'));            // 7 días y la NASA sin imágenes: queda la anterior
  const p4 = await pc.armarPacifico(p3.salida, new Date('2026-10-26T20:00:00Z'));            // 4 horas después: no reintenta
  publicados = new Set(['2026-10-24']);
  const p5 = await pc.armarPacifico(p3.salida, new Date('2026-10-26T22:30:00Z'));            // 6 horas y media: reintenta y la consigue
  global.fetch = async () => ({ ok: false, status: 503 });
  const p6 = await pc.armarPacifico(null, new Date('2026-10-19T15:00:00Z'));                 // falla sin anterior: no hay archivo
  global.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(10) });
  const p7 = await pc.armarPacifico(null, new Date('2026-10-19T15:00:00Z'));                 // respuesta rota
  global.fetch = real;
  prueba('robot del Pacífico: imagen de la NASA cada 7 días, salta los días sin publicar y si falla queda la anterior', () => {
    assert.strictEqual(pc.CADA_D, 7);
    assert.strictEqual(pc.pngTieneAlgo(rgbaVacio), false); assert.strictEqual(pc.pngTieneAlgo(rgbaAlgo), true);
    assert.strictEqual(pc.pngTieneAlgo(palVacio), false); assert.strictEqual(pc.pngTieneAlgo(palAlgo), true); assert.strictEqual(pc.pngTieneAlgo(pal2Algo), true);
    assert.strictEqual(p1.bien, true); assert.strictEqual(p1.salida.json.dia, '2026-10-17', 'ayer (18/10) sin publicar: usa el 17/10');
    assert.strictEqual(pedidos1, 3, 'dos pruebas chicas y la imagen');
    assert.deepStrictEqual(Object.keys(p1.salida.json).sort(), ['dia', 'error', 'fuente', 'img', 't']); assert.strictEqual(p1.salida.json.img, 'pacifico.jpg');
    assert.ok(p1.salida.jpg.equals(jpg));
    assert.strictEqual(p2.pidio, false); assert.strictEqual(nasa.length, 7, 'p3: 4 pruebas sin imagen; p5: 2 pruebas y la imagen');
    assert.strictEqual(p3.bien, false); assert.strictEqual(p3.salida.json.dia, '2026-10-17'); assert.ok(/últimos 4 días/.test(p3.salida.json.error)); assert.ok(p3.salida.jpg.equals(jpg));
    assert.strictEqual(p4.pidio, false); assert.strictEqual(p4.salida.json.dia, '2026-10-17');
    assert.strictEqual(p5.bien, true); assert.strictEqual(p5.salida.json.dia, '2026-10-24'); assert.strictEqual(p5.salida.json.error, null); assert.strictEqual(p5.salida.json.intento, undefined);
    assert.strictEqual(p6.salida, null); assert.strictEqual(p6.error, 'HTTP 503');
    assert.strictEqual(p7.bien, false); assert.strictEqual(p7.salida, null);
    // Mismo recorte y tamaño que pedía la página
    assert.ok(pc.urlImagen('2026-10-17').includes('BBOX=-180,-40,-35,25&WIDTH=870&HEIGHT=390&FORMAT=image/jpeg&TIME=2026-10-17&TRANSPARENT=FALSE&BGCOLOR=0x8C978B'));
    assert.ok(html.includes("pacUrl(d,'-180,-40,-35,25',870,390,'jpeg')+'&TRANSPARENT=FALSE&BGCOLOR=0x8C978B'"));
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
  const deAyer = S(`({vivo:D.lluvia.vivo,robot:!!D.lluvia.robot,cambioDia:D.lluvia.cambioDia})`);
  S(`hoy=diaAR(new Date());LLU_P=Promise.resolve(null);delete D.lluvia;M.todos=null`);
  await S(`cargar('lluvia')`);
  const sinCopia = S(`({datos:D.lluvia.datos,error:!!D.lluvia.error})`);
  await S(`cargarTodos()`);
  prueba('lluvia: nunca se consulta Open-Meteo desde la página, y la copia atrasada se usa con su hora', () => {
    assert.deepStrictEqual(JSON.parse(JSON.stringify(atrasada)), { vivo: true, robot: false, horas: 3 });
    assert.deepStrictEqual(JSON.parse(JSON.stringify(deAyer)), { vivo: false, robot: true, cambioDia: true }, 'recién pasada la medianoche: copia de ayer con menos de 2 horas');
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

prueba('Yacyretá: el último valor en una frase (sin gráfico) y cómo pesa en el pronóstico; explicaciones del río', () => {
    const l = (h, obs) => S(`hoy='${h}';D.yacy={datos:{obs:${JSON.stringify(obs)}},vivo:true,t:new Date()};lineaYacy()`);
    const o = [['2026-10-06', 21800], ['2026-10-12', 27200], ['2026-10-13', 32830]];
    assert.strictEqual(l('2026-10-13', o), '<p><b>Río arriba, Yacyretá</b> suelta unos 32.800 m³ de agua por segundo: cerca del triple de lo normal para octubre. Esa agua llega a Barranqueras en unos 3 días, y el INA la tiene en cuenta en su pronóstico.</p>'
      + '<p>El INA marca para lo que suelta Yacyretá alerta desde 25.000 y evacuación desde 30.000: hoy está por encima de la evacuación. Esos niveles son para el río junto a la represa; para la costa del Chaco valen los de Barranqueras.</p>'
      + '<p class="meta">Fuente: Entidad Binacional Yacyretá, vía INA. Lectura del 13/10.</p>');
    // niveles del INA para Yacyretá: solo se nombran desde la alerta, y nunca cambian colores
    assert.deepStrictEqual(JSON.parse(S('JSON.stringify(YACY_NIVEL)')), { alerta: 25000, evac: 30000 });
    assert.strictEqual(S(`yacyNivel(24900,'hoy')`), '');
    assert.ok(S(`yacyNivel(27000,'el 12/10')`).includes('el 12/10 está por encima de la alerta.'));
    assert.ok(S(`yacyNivel(30000,'hoy')`).includes('hoy está por encima de la evacuación.'));
    assert.ok(!/YACY_NIVEL/.test(codigo.slice(codigo.indexOf('function riesgoRio'), codigo.indexOf('function riesgoRio') + 3000)), 'no entra en el color del río');
    assert.ok(l('2026-10-14', o).includes('soltaba el 13/10 unos 32.800'));      // el dato de hoy todavía no está
    assert.strictEqual(S('YACY_NORMAL.length'), 12);
    assert.strictEqual(l('2026-10-18', o), '');                                    // más de 4 días: no se muestra
    assert.strictEqual(S(`D.yacy={datos:null};lineaYacy()`), '');
    assert.ok(!/graficoYacy|yacySvg/.test(codigo), 'sin gráfico de Yacyretá');
    const vn = (v, n) => S(`yacyVsNormal(${v},${n})`);
    assert.deepStrictEqual([vn(9000, 13100), vn(13000, 13100), vn(18000, 13100), vn(26000, 13100), vn(36200, 13100), vn(50000, 13100)],
      ['menos de lo normal', 'parecido a lo normal', 'bastante más de lo normal', 'cerca del doble de lo normal', 'cerca del triple de lo normal', 'más del triple de lo normal']);
    // dónde está el río respecto de sus niveles, en centímetros
    const sit = h => S(`rioSit(${h},NIVEL)`);
    assert.strictEqual(sit(6.98), 'Está 48 cm arriba del nivel de evacuación (6,50 m).');
    assert.strictEqual(sit(6.5), 'Llegó al nivel de evacuación (6,50 m).');
    assert.strictEqual(sit(6.2), 'Está 20 cm arriba del nivel de alerta (6,00 m). Le faltan 30 cm para el de evacuación (6,50 m).');
    assert.strictEqual(sit(5.4), 'Le faltan 60 cm para el nivel de alerta (6,00 m) y 1,10 m para el de evacuación (6,50 m).');
    assert.strictEqual(sit(7.6), 'Está 1,10 m arriba del nivel de evacuación (6,50 m).');
    // dos desplegables cerrados: cómo leer los números y cómo calcula el INA la altura de los próximos días
    const leer = S('RIO_LEER()'), prono = S('RIO_PRONO()');
    assert.ok(leer.startsWith('<details class="det" id="d-rio-numeros"><summary>¿Cómo leer estos números?</summary>'));
    for (const t of ['regla del puerto de Barranqueras', 'Alerta (6,00 m)', 'Evacuación (6,50 m)', 'unos 9,50 m']) assert.ok(leer.includes(t), t);
    assert.ok(prono.startsWith('<details class="det" id="d-rio-prono"><summary>¿Cómo calcula el INA la altura de los próximos días?</summary>'));
    for (const t of ['lo que suelta Yacyretá', 'unos 3 días', 'deja pasar el agua que le llega', 'Iguazú', 'río Paraguay', 'lluvia prevista', 'altura más probable', 'el rango', 'martes y los viernes', 'no calcula nada propio']) assert.ok(prono.includes(t), t);
    assert.ok(!/alerta naranja/.test(leer + prono), 'el río nunca dice "alerta naranja"');
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
  prueba('robot de la copia: avisa si la copia del script de Google tiene más de 6 horas (el script puede estar detenido)', () => {
    const ahora = new Date('2026-10-14T20:00:00Z');
    assert.strictEqual(sv.AVISO_H, 6);
    assert.strictEqual(sv.atrasada(copiaSv('2026-10-14T15:00:00Z'), ahora), false, '5 horas: todavía no avisa');
    assert.strictEqual(sv.atrasada(copiaSv('2026-10-14T13:30:00Z'), ahora), true, 'seis horas y media: avisa');
    assert.strictEqual(sv.atrasada(null, ahora), true, 'sin ninguna copia: avisa');
    const yml = fs.readFileSync(path.join(raiz, '.github', 'workflows', 'lluvia.yml'), 'utf8');
    assert.ok(/id: copia\n/.test(yml) && yml.includes("if: steps.copia.outputs.atrasada == 'si'"), 'la tarea lee el aviso del robot y termina con error');
    assert.ok(yml.indexOf('name: Guardar en la rama datos') < yml.indexOf('steps.copia.outputs.atrasada'), 'primero guarda la copia, después avisa');
  });
  prueba('tareas de GitHub: herramientas fijadas por huella y en versiones que corren con Node 24', () => {
    for (const f of ['lluvia.yml', 'pruebas.yml']) {
      const y = fs.readFileSync(path.join(raiz, '.github', 'workflows', f), 'utf8');
      const usos = [...y.matchAll(/uses: ([\w.-]+\/[\w.-]+)@(\S+)(?: # v(\d+)\S*)?/g)];
      assert.ok(usos.length >= 2, f + ': usa checkout y setup-node');
      for (const [, n, ref, v] of usos) {
        assert.ok(/^[0-9a-f]{40}$/.test(ref), f + ': ' + n + ' fijada por huella');
        assert.ok(Number(v) >= 5, f + ': ' + n + ' en la versión 5 o más nueva (corren con Node 24)');
      }
    }
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
    assert.ok(codigo.includes("e.origin===PORTAL&&e.source===window.parent&&d&&(d.tipo==='rios-y-clima:hola'||d.channel===CANAL&&d.type==='request-height'))enviar(true)"), 'si el portal pregunta (su código arrancó tarde), le vuelve a mandar el alto; solo al portal');
    assert.ok(codigo.includes("CANAL='ga-panel-alertas-chaco-v1'") && codigo.includes("{channel:CANAL,type:'height',height:a},PORTAL") && codigo.includes("{channel:CANAL,type:'scroll-to',y},PORTAL"), 'habla también el segundo canal del portal: alto y saltos, solo al portal');
    assert.ok(!/\son[a-z]+=["']/i.test(html) && !html.includes('javascript:'), 'sin código suelto en el HTML (la regla no lo dejaría correr)');
    const hosts = [...new Set([...codigo.matchAll(/'(https:\/\/[a-z0-9.-]+)\//g)].map(m => m[1]))].filter(u => !/smn\.gob\.ar|concejovilelas|goatcounter|wa\.me|panel-alertas-chaco/.test(u));   // smn, concejovilelas, wa.me y la dirección del sitio (para compartir) son enlaces; el contador va por img-src (su propia prueba)
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
    assert.ok(html.includes('<a href="https://wa.me/5493644377044" target="_blank" rel="noopener" class="hDc hWa"><b>SECHEEP por WhatsApp</b>'), 'botón de WhatsApp de SECHEEP (canal oficial, secheep.gob.ar)');
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
    // ninguna tarjeta de "¿Qué está pasando?" se abre sola (Mariano, 19/10): solo con el botón "Qué hacer" o tocándola
    assert.ok(!/\.open\s*=\s*true/.test(S('pintarHacer.toString()')), 'pintarHacer no abre tarjetas');
    assert.ok(hh.innerHTML.includes(S('DEFENSAS')) && S('DEFENSAS').includes('avisos oficiales') && !S('DEFENSAS').includes('no hace falta'), 'la franja dice que el agua del río queda afuera de las defensas y que valen los avisos oficiales');
    assert.ok(/<details id="h-rio"[\s\S]*?dentro de las defensas, el agua del río queda afuera/.test(html) && !/no hace falta hacer nada/.test(html));
    assert.ok(!/se conecta a Google, GitHub, el INA, Open-Meteo/.test(html), 'privacidad al día');
    // sin alertas y con el informe al día: "no hay"; con el informe viejo o vacío del canal: no se puede confirmar
    S('riesgoRio=()=>({c:"verde"});SMN.alertas={};SMN.areas.forEach(a=>{SMN.alertas[a]=[]})');
    H = S('hacerHoy()'); assert.strictEqual(H.filas.length, 0); assert.strictEqual(H.smn, 'ok');
    S('SMN.leidas=0'); assert.strictEqual(S('hacerHoy()').smn, 'duda');
    S('SMN.leidas=5;SMN.capturado=new Date(Date.now()-4*36e5).toISOString()'); assert.strictEqual(S('hacerHoy()').smn, 'duda');
  });
  prueba('cartel de datos viejos: corto, y sin cartel recién pasada la medianoche', () => {
    const b = { hidden: true, innerHTML: '' }; elementos.bannerCaptura = b;
    const antes = S('({l:D.lluvia,r:D.rio,listo:LISTO})');
    const con = (h, extra) => { S(`LISTO=true;delete D.rio;D.lluvia={datos:{},vivo:false,robot:true,t:new Date(Date.now()-${h}*36e5)${extra || ''}};pintarBanner()`); return b; };
    try {
      assert.ok(con(0.7, ',cambioDia:true').hidden, 'a las 00:30 con la copia de las 23:52 no hay cartel');
      con(3); assert.ok(!b.hidden && b.innerHTML.startsWith('<b>Datos del ') && b.innerHTML.endsWith('Todavía no llegaron más nuevos.'));
      con(40); assert.ok(b.innerHTML.startsWith('<b>Atención: estos datos no son de hoy</b>') && b.innerHTML.includes('No se usan para el color del semáforo.'));
      assert.ok(b.innerHTML.length < 130, 'frase corta');
    } finally { delete elementos.bannerCaptura; vm.runInContext('D.lluvia=__a.l;D.rio=__a.r;LISTO=__a.listo', Object.assign(sitio, { __a: antes })); delete sitio.__a; }
  });
  // Botón Compartir (con navegador simulado): se prueba primero y después se revisa el resultado.
  let errComp = null;
  {
    const ev = {}, evCop = {}, caja = { hidden: true }, atr = {};
    const btn = { hidden: true, addEventListener: (t, f) => { ev[t] = f }, setAttribute: (k, v) => { atr[k] = v } };
    const opc = { hidden: true }, wa = {}, cop = { addEventListener: (t, f) => { evCop[t] = f } }, aviso = { textContent: '' };
    Object.assign(elementos, { instalar: caja, btnCompartir: btn, compOpc: opc, compWa: wa, compCopiar: cop, compAviso: aviso });
    const antesMM = sitio.matchMedia;
    await (async () => {
      // computadora: sin menú del teléfono, el botón muestra WhatsApp y copiar enlace
      let copiado = null;
      sitio.navigator = { clipboard: { writeText: async t => { copiado = t } } };
      S('compartirSitio()');
      assert.ok(!btn.hidden && !caja.hidden, 'el botón se ve');
      assert.ok(wa.href.startsWith('https://wa.me/?text=') && decodeURIComponent(wa.href.split('text=')[1]).endsWith(' https://panel-alertas-chaco.netlify.app/'), 'WhatsApp con la frase y la dirección');
      await ev.click(); assert.ok(!opc.hidden && atr['aria-expanded'] === 'true', 'aparecen las opciones');
      await evCop.click(); assert.strictEqual(copiado, 'https://panel-alertas-chaco.netlify.app/'); assert.ok(aviso.textContent.startsWith('Enlace copiado'));
      await ev.click(); assert.ok(opc.hidden && aviso.textContent === '', 'se cierran');
      // celular: abre el menú de compartir del teléfono y no muestra las opciones
      let compartido = null; opc.hidden = true;
      sitio.navigator = { share: async d => { compartido = d } }; sitio.matchMedia = q => ({ matches: /coarse/.test(q) });
      S('compartirSitio()'); await ev.click();
      assert.ok(compartido && compartido.url === 'https://panel-alertas-chaco.netlify.app/' && compartido.title === 'Ríos y Clima del Chaco', 'menú del teléfono con la dirección');
      assert.ok(opc.hidden, 'sin opciones extra');
      // si la persona cierra el menú del teléfono, no pasa nada más
      sitio.navigator = { share: async () => { const e = new Error('cancelado'); e.name = 'AbortError'; throw e } };
      S('compartirSitio()'); await ev.click(); assert.ok(opc.hidden);
    })().catch(e => { errComp = e });
    sitio.matchMedia = antesMM; delete sitio.navigator;
    for (const k of ['instalar', 'btnCompartir', 'compOpc', 'compWa', 'compCopiar', 'compAviso']) delete elementos[k];
  }
  prueba('compartir: menú del teléfono en el celular, WhatsApp o copiar en la computadora, y la imagen nueva para las redes', () => {
    assert.ok(html.includes('compartir.png?v=7'), 'la imagen nueva lleva otro número para que las redes no muestren la vieja');
    const b = fs.readFileSync(path.join(raiz, 'compartir.png'));
    assert.strictEqual(b.readUInt32BE(16) + 'x' + b.readUInt32BE(20), '1200x630', 'tamaño que piden WhatsApp y Facebook');
    assert.ok(fs.existsSync(path.join(raiz, 'herramientas', 'compartir.py')), 'el guion que dibuja la imagen');
    assert.ok(/id="btnCompartir"[^>]*hidden/.test(html), 'empieza oculto: aparece cuando corre el código');
    if (errComp) throw errComp;
  });
  prueba('El Niño: la consulta a la NASA espera a que termine de cargar la página, para que no quede "cargando"', () => {
    const f = html.slice(html.indexOf('function iniciarPacifico'), html.indexOf('function pintarBanner'));
    assert.ok(/readyState==='complete'/.test(f) && /addEventListener\('load'/.test(f) && /\.then\(\(\)=>fetch\(PAC_COPIA/.test(f), 'la copia (y si falta, la NASA) se piden después del evento de carga');
    assert.ok(!/const dia=buscarDiaPac\(\)/.test(f) && !/const dia=fetch/.test(f), 'no se pide antes de que cargue');
  });
  prueba('El Niño: la página usa la imagen que guarda el robot y, si falta o es vieja, la de la NASA', () => {
    const ahora = Date.parse('2026-10-19T15:00:00Z'), c = j => S(`pacCopia(${JSON.stringify(j)},${ahora})`);
    assert.strictEqual(c({ dia: '2026-10-17', img: 'pacifico.jpg' }), '2026-10-17');
    assert.strictEqual(c({ dia: '2026-10-01', img: 'pacifico.jpg' }), '2026-10-01', 'con 18 días todavía sirve');
    assert.strictEqual(c({ dia: '2026-09-25', img: 'pacifico.jpg' }), null, 'con más de 21 días el robot se detuvo: se va a la NASA');
    assert.strictEqual(c({ dia: '2026-10-17', img: 'otra.jpg' }), null);
    assert.strictEqual(c({ dia: 'ayer', img: 'pacifico.jpg' }), null);
    assert.strictEqual(c(null), null);
    const f = html.slice(html.indexOf('function mostrarPac'), html.indexOf('function iniciarPacifico'));
    assert.ok(/DATOS_URL\+'pacifico\.jpg\?d='\+d/.test(f), 'la imagen guardada lleva la fecha, para no ver una vieja');
    assert.ok(/if\(copia\)buscarDiaPac\(\)/.test(f), 'si la copia no carga, se busca en la NASA');
    const toml = fs.readFileSync(path.join(raiz, 'netlify.toml'), 'utf8');
    assert.ok(/img-src [^;]*https:\/\/raw\.githubusercontent\.com/.test(toml), 'la regla del navegador deja mostrar imágenes de la rama datos');
    const yml = fs.readFileSync(path.join(raiz, '.github', 'workflows', 'lluvia.yml'), 'utf8');
    assert.ok(yml.includes('node robot/pacifico.js pacifico-anterior salida') && yml.includes('git add pacifico.json pacifico.jpg'), 'el robot corre y guarda los dos archivos');
  });
  prueba('lluvia: gráfico grande con la fecha y los milímetros de cada día, y botones para elegir la localidad', () => {
    assert.ok(html.includes("+'<div class=\"llLocs\" id=\"llLocs\" role=\"group\"") && html.includes('<div id="llGrafCaja"></div>'), 'botones de localidad y lugar del gráfico');
    assert.ok(html.includes('td.barras svg{display:block;width:102px;height:28px;margin-left:auto}'), 'las barritas de la tabla no se agrandan en la computadora');
    const g = S(`(()=>{const a=D.lluvia,h=hoy;hoy='2026-10-20';D.lluvia={vivo:true,t:new Date(),datos:{dias:['2026-10-18','2026-10-19','2026-10-20','2026-10-21'],mm:LOCS.map((l,i)=>[0,1.4,0,i?3:16.8])}};
      const r=grafLluvia(0);D.lluvia=a;hoy=h;return r})()`);
    assert.ok(g.includes('<span class="llD">Hoy</span><span class="llN">20<span class="m">/10</span></span>'), 'hoy marcado con su fecha');
    assert.ok(g.includes('<span class="llD">mié</span><span class="llN">21<span class="m">/10</span></span>') && g.includes('<span class="llV">17</span>'), 'cada día con su nombre, su fecha y los mm');
    assert.ok(g.includes('>Llovió</span>') && g.includes('style="grid-column:3/-1">Se espera</span>'), 'lo caído y lo que se espera, separados');
    assert.ok(g.includes('aria-label="Resistencia, lluvia día por día: 18/10 0,0 mm; 19/10 1,4 mm; 20/10 0,0 mm; 21/10 16,8 mm."'), 'el lector de pantalla lee todos los días');
  });
  prueba('riesgo por localidad: "Ver en el mapa" y "Ver el río" son píldoras como los nombres de "En verde"', () => {
    assert.ok(html.includes('.vermapa{grid-column:2;justify-self:start;margin-top:4px;display:inline-flex;align-items:center;gap:6px;min-height:40px;') && html.includes('border-radius:999px;border:1.5px solid currentColor;background:var(--card);color:var(--ink);text-decoration:none'), 'con borde, fondo y sin subrayado');
    assert.ok(html.includes('<span class="vmIco" aria-hidden="true">📍</span>Ver en el mapa</button>') && html.includes('href="#t-rio"><span class="vmIco" aria-hidden="true">🌊</span>Ver el río</a>') && html.includes('href="#t-otros"><span class="vmIco" aria-hidden="true">🏞️</span>Ver el río</a>'), 'con ícono, que el lector de pantalla no lee');
  });
  prueba('al volver a la app o a la pestaña: más de 6 horas guardada o día nuevo, se abre entera; más de 10 minutos, renueva los datos', () => {
    const c = html.slice(html.indexOf('function alVolver(){'), html.indexOf("addEventListener('pageshow'"));
    assert.ok(c.includes('if(document.hidden){OCULTA=OCULTA||Date.now();return}') && c.includes('(t&&Date.now()-t>6*36e5)||diaAR(new Date())!==DIA_ABIERTA)){location.reload();return}'), 'recarga entera después de 6 horas o al cambiar el día');
    assert.ok(c.includes('if(!EMB&&') && c.includes('if(Date.now()-ULT>10*60e3)renovar();'), 'en el portal no recarga; con más de 10 minutos renueva los datos');
    assert.ok(html.includes("document.addEventListener('visibilitychange',alVolver);") && html.includes("addEventListener('pageshow',e=>{if(e.persisted){OCULTA=OCULTA||ULT;alVolver()}});"), 'también al volver con el botón Atrás');
  });
  console.log('\n' + ok + ' pruebas bien.');
})();
