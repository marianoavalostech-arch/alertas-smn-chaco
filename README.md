# Ríos y Clima del Chaco

Sitio que junta en un solo lugar las alertas oficiales del SMN, la lluvia (prevista y medida en estaciones), la altura y el pronóstico de los ríos Paraná (Barranqueras), Paraguay (Puerto Bermejo; pronóstico en Formosa y Puerto Pilcomayo) y Bermejo (El Colorado) y el estado de El Niño, explicados en lenguaje sencillo para los 70 municipios del Chaco.

Sitio publicado: https://panel-alertas-chaco.netlify.app/

Antes se llamó "Alerta Niño Chaco" y "Tiempo y Ríos del Chaco".

Es un sitio informativo. No reemplaza los alertas oficiales del Servicio Meteorológico Nacional ni de Defensa Civil.

## Cómo funciona

```
SMN (canal CAP) ─┐
INA (ríos, Yacyretá, pronósticos y lluvia medida) ─┤
                 ├─> Script de Google (cada hora) ──> dirección pública (JSON) ─┐ (respaldo)
NOAA (índice ONI) ─┘        │                     │ copia                        ├─> index.html
                            └─ lanza ─> Robot en GitHub ─> rama "datos" ─────────┘
Open-Meteo (lluvia) ────────────────────────┘   (lluvia.json, grilla.json, servidor.json)
NASA GIBS (satélite GOES-East) ──────────────────────────────────────────────────> index.html (mapa animado)
```

- **Script de Google** (`apps-script/`): cada hora lee las alertas del SMN, se queda con las que tocan al Chaco y guarda además una copia de los ríos (Paraná, Paraguay y Bermejo), los pronósticos del INA para el Paraná y el Paraguay, la lluvia medida en estaciones, lo que suelta la represa de Yacyretá y el ONI. Publica todo como JSON.
- **Robot de la lluvia** (`robot/lluvia.js`, tarea `.github/workflows/lluvia.yml`): Open-Meteo rechaza los pedidos que salen de Google, así que la lluvia la pide GitHub y la deja en `lluvia.json`, en la rama `datos`. El script de Google lo lanza en cada renovación; el horario propio de GitHub queda de respaldo.
- **Copia del script** (`robot/servidor.js`, en la misma tarea): baja la respuesta del script de Google y la deja tal cual en `servidor.json`, en la rama `datos`. Solo la guarda si está completa y es más nueva que la anterior; si no, queda la anterior. El script lanza el robot después de guardar, así la copia sale con lo recién leído. GitHub entrega esa copia a muchas visitas a la vez: así ni el script ni las fuentes reciben un pedido por cada visita.
- **Grilla del mapa animado** (`robot/grilla.js`, en la misma tarea, después de la lluvia): lluvia, nubosidad y tormentas previstas hora por hora para ayer, hoy y mañana, en 208 puntos cada 0,5° (el Chaco y unos 100 km alrededor). Se renueva cada 3 horas como mucho, para cuidar el límite gratuito de Open-Meteo. Si falla, no insiste, queda la anterior y la lluvia se guarda igual.
- **Sitio** (`index.html`): una sola página, sin nada que compilar. Lee primero las copias de la rama `datos` (`servidor.json` y `lluvia.json`); el script de Google queda de respaldo, solo si `servidor.json` falta o tiene más de 2 horas (`leerCopias`). **La página nunca consulta las fuentes** (INA, SMN, Open-Meteo, NOAA): con muchas visitas a la vez podrían bloquear o caerse. Si la copia es vieja, se muestra igual con su hora y los avisos de siempre (franja "Estás viendo datos guardados", aviso del SMN sin renovar a las 3 horas; con más de 36 horas la lluvia no se usa para el color). Solo las imágenes de la NASA (Pacífico y satélite) se piden desde cada navegador. Lo último que funcionó queda guardado en el dispositivo. Seis secciones se pueden cerrar tocando el título (`plegable`; todas empiezan cerradas, con `data-cerrada`: Paraguay y Bermejo, Lluvias, Lluvia hora por hora, El Niño, De dónde salen los datos y Acerca); el botón "Mostrar" va relleno con el degradado violeta-rosa del portal ("Ocultar", con borde, cuando está abierta) y, cerrada, una línea debajo del título dice qué hay adentro (`data-pista`) y se ve el comienzo del contenido, que se desvanece, con "Mostrar todo" debajo (`.vista`, contenido `inert`; tocar la sección la abre); lo que cierra cada persona queda en su navegador (`anc-plegadas`). El mapa, las alertas, "Qué hacer", el riesgo por localidad y el Paraná no se pueden cerrar. Con su sección cerrada no se bajan la imagen del Pacífico ni las del satélite.
- **Informar sin alarmar** (revisión del 15/10/2026): cuando el Paraná sale del verde, la franja "Ahora en el Chaco", el renglón del semáforo y el detalle de Barranqueras, Puerto Vilelas e Isla del Cerrito agregan que dentro de las defensas del Gran Resistencia no hace falta hacer nada (`DEFENSAS`); los renglones de los ríos llevan un ícono de agua (≈) en lugar de signos de exclamación; el cartel "Este sitio es informativo" va en azul (`.aviso.info`), no en un color del semáforo; El Niño aclara que es una tendencia de la temporada, no un aviso. En el gráfico del Paraná, las defensas (`NIVEL.defensa`, 9,50 m) van como una marca arriba del gráfico mientras el río y el pronóstico están debajo de 8 m, para no aplastar la escala; desde 8 m pasan a ser una línea dentro del gráfico, con su renglón en la leyenda.
- **"Qué hacer ante una alerta"**: arriba, "Ahora en el Chaco" (`hacerHoy`, `pintarHacer`) junta lo que rige —alertas del SMN de hoy en adelante y Paraná o Paraguay fuera del verde— con un botón "Qué hacer" que abre su tarjeta; sin informe del SMN al día no dice que no hay alertas, y el naranja del Paraná se nombra "según el pronóstico del INA". Teléfonos como botones `tel:` (911, 100, 107, Defensa Civil y SECHEEP 0800-7777-589); el de Defensa Civil llama solo al número principal y el texto pide el interno 103, porque agregar el interno al enlace no funciona en los celulares. Nueve tarjetas `<details name="hacer">` (una abierta por vez): tormenta, viento y granizo, lluvia fuerte, crecida del río, cuando baja el agua, calor, frío, niebla/humo/polvo y mochila; la del río (a la que llevan el Paraná y el Paraguay fuera del verde) empieza diciendo que dentro de las defensas no hace falta hacer nada; cada fenómeno del SMN tiene su tarjeta (`HACER_EV`, una prueba lo controla). La mochila se tilda y queda en el navegador (`anc-mochila`). Textos resumidos del SINAGIR, el Ministerio de Salud y la Agencia Nacional de Seguridad Vial, con enlaces al pie de la sección, escritos para la gente de la costa y de los barrios: palabras de todos los días, cosas que hay en cualquier casa (sin compras especiales) y situaciones del Chaco (moto, pesca, animales, brasero, garrafa, pozo ciego).
- **Instalar app** (`instalarApp`, `manifest.webmanifest`): el sitio se puede poner como una app más en la pantalla del celular o de la computadora, con su ícono (degradado del portal, semáforo, sol con nube y el río en celeste) y el nombre "Ríos y Clima". En el encabezado aparece el botón "Instalar app" solo cuando el navegador lo ofrece (Android y computadora con Chrome o Edge); en iPhone y iPad no hay botón y una línea explica "Compartir → Agregar a inicio". No se ve dentro del portal, al imprimir, ni si el sitio ya se abrió desde el ícono. **No guarda el sitio en el celular** (no hay *service worker*): la app abre siempre la página publicada, con sus datos y avisos de siempre; sin señal muestra lo último guardado, igual que en el navegador. No manda avisos ni pide permisos.
- **Contador de visitas** (`contador`, `contarVisita`): solo cuenta, en GoatCounter (https://riosyclimachaco.goatcounter.com, cuenta de Mariano), un contador de código abierto sin cookies que no guarda la dirección de internet. No se carga su código: la página pide una imagen de 1 píxel a `…/count` con lo único que hace falta para contar, qué se abrió (`p`), más un número al azar para que no quede en caché; sin título, sin de dónde se llegó y sin tamaño de pantalla. En el tablero, tres páginas: `/` (navegador), `/desde-la-app` (abierto desde el ícono) y `/en-el-portal` (dentro de Gobierno Abierto); y dos eventos: `instalar-app-boton` (tocó "Instalar app") y `app-instalada`. Solo cuenta en el sitio publicado (https); los navegadores automáticos van marcados como robot. Lo que el navegador manda siempre (dirección de internet y tipo de navegador) GoatCounter lo usa en memoria para no contar dos veces la misma visita; en su configuración se apaga lo que no hace falta guardar (navegador, sistema, país, idioma, pantalla, de dónde se llegó).

Si una fuente falla, las demás siguen y se muestra el último dato bueno con su fecha y hora.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | El sitio completo: estilos, mapa y reglas. |
| `apps-script/alertas-smn-apps-script.gs` | Script de Google. También define los centros de los municipios, que el robot reutiliza. |
| `robot/lluvia.js` | Robot de la lluvia. |
| `robot/grilla.js` | Grilla de lluvia por hora para el mapa animado. |
| `robot/servidor.js` | Copia de la respuesta del script de Google en la rama `datos` (`servidor.json`). |
| `herramientas/csp.js` | Pone en `netlify.toml` la huella del código de la página (regla del navegador). Correrlo después de cada cambio en `index.html`. |
| `herramientas/iconos.py` | Dibuja los íconos de la app (`iconos/`) con Python y Pillow: `python3 herramientas/iconos.py`. Mismo dibujo que `icono.svg`; si se cambia uno, cambiar el otro. |
| `herramientas/puntos.js` | Genera los puntos interiores de cada municipio (`PUNTOS` en el script). Solo hace falta si cambia el mapa. |
| `pruebas/reglas.test.js` | Pruebas de las reglas del sitio, del script y del robot. |
| `.github/workflows/` | Tareas de GitHub: `pruebas.yml` (en cada subida) y `lluvia.yml` (robot). |
| `netlify.toml` | Publicación y cabeceras de seguridad (regla del navegador con la huella del código, `Permissions-Policy`, quién puede mostrar el sitio dentro de su página). |
| `fuentes/kanit-700.woff2` y `fuentes/manrope-wght.woff2` | Letras del portal nuevo de Gobierno Abierto, guardadas en el sitio: Kanit en los títulos y Manrope en el texto. Licencias en `fuentes/OFL.txt`. |
| `icono.svg` | Ícono de la pestaña del navegador. |
| `iconos/` | Íconos de la app: 192 y 512 px con esquinas redondeadas, 512 px "maskable" (fondo hasta el borde, para que Android le dé su forma) y 180 px para iPhone. |
| `manifest.webmanifest` | Datos para instalar el sitio como app: nombre, colores e íconos. |
| `CAMBIOS.md` | Historial de cambios. |
| `LICENSE` | Licencia MIT del código. |

## Pruebas

Hace falta Node 22 o más nuevo. No hay nada que instalar.

```
node pruebas/reglas.test.js
```

No consultan ninguna fuente. GitHub las corre solas en cada subida a `main`.

Después de cambiar `index.html`, correr antes `node herramientas/csp.js`: actualiza la huella del código en `netlify.toml`. Si se olvida, una prueba falla y avisa; si se publicara con la huella vieja, el navegador no correría el código de la página.

## Publicar

Netlify publica la rama `main` tal cual está. Cada subida a `main` es una publicación. La rama `datos` no publica nada.

## Seguridad

- **Aspecto**: el del portal nuevo de Gobierno Abierto (https://gobiernoabierto.chaco.gob.ar/inicio/): títulos en Kanit, texto en Manrope, azul marino `#0b3158`, degradado violeta-rosa (`--degrade`: `#5059bc` → `#8d58e8` → `#f26df9`) en el encabezado y los botones, fondo lavanda-rosado muy suave (`--fondo`) y tarjetas blancas redondeadas. `--water` (azul) queda solo para el agua: ríos del mapa y gráficos; botones y enlaces usan `--acento` (violeta). Los colores del semáforo y del mapa no cambian. **Siempre claro** (sin modo oscuro, como el portal): encabezado blanco con la franja del degradado arriba, texto casi negro `#1d2333` con peso 500, marino solo en los títulos; lo que se toca lleva borde violeta (`--borde-boton`), fondo blanco que baja a lila (`--fondo-boton`), sombra (`--sombra-boton`) y un pequeño salto al tocarlo; teléfonos con ícono, tarjetas de "Qué hacer" con el dibujo en un círculo. Los íconos son SVG dentro del estilo (`data:`, permitido por `img-src`).
- La página no carga código ni letras de otros sitios. La regla del navegador (`Content-Security-Policy` en `netlify.toml`) solo deja correr el `<script>` de la página (por su huella) y solo deja conectarse a `raw.githubusercontent.com`, `script.google.com`, `script.googleusercontent.com` y `gibs.earthdata.nasa.gov`; `manifest-src 'self'` deja leer el archivo para instalar la app. Las visitas se cuentan con una imagen de GoatCounter (`img-src https://riosyclimachaco.goatcounter.com`), sin cargar su código. Sin formularios ni cookies. La app instalada no agrega permisos ni guarda código aparte: es la misma página. Solo el propio sitio y el portal de Gobierno Abierto lo pueden mostrar dentro de su página (`frame-ancestors`).
- Todo dato que llega se revisa antes de usarlo (`FORMA`, `smnVale`, `copiaVale`); los textos de afuera se escriben con `esc`.
- La clave de GitHub (`GITHUB_TOKEN`) queda en las propiedades del script de Google; la dirección pública no la devuelve, y si GitHub rechaza la clave solo se publica el número de error (el detalle queda en el registro del script).
- Las tareas de GitHub usan sus herramientas fijadas por huella; `pruebas.yml` solo puede leer.
- Revisión completa del 14/10/2026 (cuentas, verificación en dos pasos, vistas previas de Netlify, dominio propio): informe en las notas del proyecto en Claude (`claude/revision-seguridad-oficial-14-10.md`).

## Dentro del portal de Gobierno Abierto

El sitio se puede mostrar dentro de una página de https://gobiernoabierto.chaco.gob.ar (en un marco, `iframe`). La regla del navegador (`frame-ancestors` en `netlify.toml`) solo deja hacerlo al propio sitio y a ese portal; cualquier otra página que lo intente ve el marco vacío.

Dentro del portal la página se da cuenta sola (o con `?embebido=1` en la dirección): fondo transparente, siempre en claro (el portal es blanco), sin márgenes propios y con un enlace "Abrir en una pestaña nueva". Le avisa al portal su alto cada vez que cambia (al llegar los datos o al abrir una sección) para que el marco no tenga barra propia, y le pide que baje cuando se toca un enlace interno ("Qué hacer ante una alerta", "Ver el río", los botones del semáforo). Esos avisos van solo al portal (`PORTAL` en `index.html`).

Para ponerlo, quien administra el portal agrega un bloque HTML (en Elementor, el widget "HTML") con esto:

```html
<iframe id="rios-y-clima" src="https://panel-alertas-chaco.netlify.app/?embebido=1"
  title="Ríos y Clima del Chaco: alertas, lluvias y ríos" style="width:100%;border:0;height:1800px;display:block"></iframe>
<script>
(function(){
  var f=document.getElementById('rios-y-clima'), ORIGEN='https://panel-alertas-chaco.netlify.app';
  window.addEventListener('message',function(e){
    if(e.origin!==ORIGEN||e.source!==f.contentWindow)return;
    var d=e.data||{};
    if(d.tipo==='rios-y-clima:alto'&&d.alto>300)f.style.height=Math.ceil(d.alto)+'px';
    if(d.tipo==='rios-y-clima:ir'&&typeof d.y==='number')
      window.scrollTo({top:f.getBoundingClientRect().top+window.scrollY+d.y-90,behavior:'smooth'});
  });
})();
</script>
```

El `-90` deja lugar para el menú fijo del portal; se ajusta si tapa el título. Sin el `<script>` el sitio igual se ve, con un alto fijo de 1800 px y barra propia. Si el sitio se muda a un dominio del Gobierno, cambiar `ORIGEN` en ese bloque y, si cambia el portal, `PORTAL` en `index.html` y `frame-ancestors` en `netlify.toml` (hay una prueba que lo controla).

## Instalar el script de Google

1. Crear un proyecto en https://script.google.com y pegar el contenido de `apps-script/alertas-smn-apps-script.gs`.
2. Ejecutar una vez la función `instalar()`: hace la primera lectura y programa la renovación cada hora.
3. Implementar > Nueva implementación > Aplicación web > Acceso: "Cualquier persona".
4. Copiar la dirección que entrega en `SMN_URL`, dentro de `index.html`.

Cada vez que cambia el archivo `.gs` hay que pegarlo de nuevo en Google y crear una nueva versión de la implementación.

### Clave de GitHub para el robot

Sin la clave el script no lanza el robot y el resto funciona igual.

1. En GitHub: Settings > Developer settings > Fine-grained tokens. Acceso solo a este repositorio, permiso **Actions: lectura y escritura**, nada más.
2. En el script de Google: Configuración del proyecto > Propiedades del script, con el nombre `GITHUB_TOKEN`.
3. Probarla ejecutando `probarRobot()`: tiene que decir `bien`.

La clave tiene vencimiento. Cuando vence, la lluvia deja de renovarse cada hora: hay que crear una nueva y reemplazarla.

### Correo de aviso

Si la lluvia lleva más de 24 horas sin renovarse, el script manda un correo a la cuenta de Google dueña del script, una sola vez por caída, y el sitio muestra un aviso en la sección de lluvias. Para dar el permiso de enviar correo hay que ejecutar una vez `probarCorreo()`: Google pide autorización y llega un correo de prueba. Las horas se cambian en `HORAS_AVISO`.

## Formato de los datos

Respuesta del script de Google:

```
{
  "emitido":   hora de emisión de la alerta más nueva,
  "capturado": hora de la última lectura del canal,
  "fechas":    ["AAAA-MM-DD", ...]        hoy y los tres días siguientes,
  "areas":     [0, 1, ... 69]             un lugar por municipio, en el orden de GEO.mun,
  "alertas":   { "0": [fila, ...], ... },
  "leidas": n, "fallas": n,
  "ajuste":    { "alineadas": n, "corridas": n, "horas": 3 | 0 }   corrección de horas que se usó en esta lectura,
  "robot":     { "t": hora de la corrida, "estado": "bien" | "sin clave" | "GitHub respondió <número>" | "error al lanzar" },
  "datos":     { "rio", "paraguay", "bermejo", "prono", "pronoPy", "medida", "yacy", "oni", "errores" }
}
```

Cada fila de alerta es `[día, fenómeno, madrugada, mañana, tarde, noche, extra]`:

- **fenómeno:** 41 tormentas, 37 lluvias, 42 nevadas, 39 viento, 47 zonda, 101 calor, 102 frío, 103 niebla, 104 humo, 105 polvo.
- **franjas:** nivel en cada franja de 6 horas: 0 sin alerta, 3 amarilla, 4 naranja, 5 roja.
- **extra:** 1 granizo, 2 ráfagas, 3 los dos.

Cada río (`rio` = Paraná, `paraguay`, `bermejo`) trae `obs` (lista de `[día, altura en m]`, una lectura por día: la última de ese día), `hora` (hora de la última lectura), `act` (cuándo la cargó el INA) y `t` (hora de la consulta). `prono` es el del Paraná en Barranqueras: `emitido` y `p` (lista de `[día, mínimo, más probable, máximo]`).

`yacy` es lo que suelta la represa de Yacyretá (serie 937 del INA, en m³/s): `obs` (lista de `[día, caudal]`, una lectura por día, redondeada), `hora` y `t`. El sitio lo muestra en una sola línea debajo del gráfico del Paraná, comparado con lo normal del mes (`YACY_NORMAL` en `index.html`: mediana de las lecturas diarias de 2011 a 2025; entre 11.000 en septiembre y 13.600 en noviembre) y con la lectura de una semana antes. Que esa agua tarde unos 3 días en llegar a Barranqueras salió de comparar, de 2010 a 2026, los cambios diarios de la descarga con los del caudal en Corrientes (serie 868) y la altura en Barranqueras: la relación más fuerte se da a los 3 días. Solo informativo.

`pronoPy` es el pronóstico del INA para el Paraguay (calibrado 312): `emitido` y una lista con la misma forma que `p` para cada puerto que venga, `formosa` (serie 3127) y `pilcomayo` (serie 1525). Solo informativo.

`medida` es la lluvia medida: `e`, lista de `[nombre, lat, lon, última lectura, mm en 24 h, mm en 3 días, avisos]`, una por estación con una lectura de las últimas 24 horas, de norte a sur; `dudosas`, lista de `[nombre, motivo]` de las que se descartaron; y `t`. Cada lectura del INA es la lluvia caída desde la lectura anterior (casi todas cada hora; algunas cada 4, 6 o 12 horas); las 24 horas y los 3 días se cuentan hacia atrás desde la última lectura de cada estación. La lista de estaciones está en `MEDIDA` (script de Google): las de la red SAT (`sat2`) con lluvia a intervalo nativo (`var_id` 27) en el Chaco y alrededores, sacadas de `https://alerta.ina.gob.ar/a5/obs/puntual/series?var_id=27&geom=-63.7,-28.2,-58.2,-24`. Se piden todas juntas en un solo pedido (`observaciones?tipo=puntual&series_id=…`, unos 500 KB). Comparadas el 13/10/2026 con la lluvia diaria del INA de cada estación, coincidieron en 223 de 274 días.

Controles de la lluvia medida (`normMedida`; "vecinas" son las estaciones a menos de 50 km, `MEDIDA_VECINAS`, con lecturas hasta la misma hora y que no fueron descartadas):

| Control | Qué pasa |
|---|---|
| Lectura suelta mayor a 150 mm (`MEDIDA_MAX`), negativa o vacía | Se ignora esa lectura. |
| Marcó 0 en 3 días y al menos dos vecinas midieron 10 mm o más | Se descarta la estación (pluviómetro trabado) y va a `dudosas`; el sitio usa la siguiente más cercana. |
| Faltan lecturas en las últimas 24 horas (menos de 3/4 de las que suele mandar) | Aviso 1: "puede haber llovido más". |
| Midió 20 mm o más en 24 horas y todas las vecinas (al menos dos) menos de la quinta parte | Aviso 2: "puede ser una tormenta muy local o un error". No se descarta, porque las tormentas locales son reales. |

Se calibraron con enero a marzo de 2026 (unos 2.200 días-estación): la regla del 0 encontró sobre todo pluviómetros que estuvieron trabados todo el verano (Colonia Benítez midió 1 mm en el trimestre, el pluviómetro 10 de los Bajos Submeridionales, 3 mm), y el aviso 2 salió en 11 de 97 días con 20 mm o más. `diagnosticoDatos()` lista las estaciones con aviso y las descartadas.

`lluvia.json` (rama `datos`): `{ "datos": { "lluvia", "municipios", "errores" } }`. Cada uno trae `dias` (14 fechas: 7 pasadas y 7 por venir), `mm` (una lista por punto) y `t` (hora de la consulta).

`grilla.json` (rama `datos`): `{ "datos": { lat0, lon0, paso, nlat, nlon, h0, n, p, nube, torm, t }, "error" }`. Los puntos van fila por fila desde el norte (`lat0`) y de oeste a este (`lon0`), cada `paso` grados. `h0` es la primera hora (hora argentina) y `n` la cantidad de horas (72). `p[punto][hora]` es la lluvia en décimas de mm, `nube[punto][hora]` la nubosidad en decenas de % (0 a 10) y `torm` la lista de `[hora, punto]` con tormenta prevista (código de tiempo 95 a 99). `error` dice por qué no se pudo renovar, si pasó.

**Mapa animado:** las nubes de las horas pasadas son imágenes del satélite GOES-East (capa `GOES-East_ABI_GeoColor` del servicio GIBS de la NASA), pedidas por el navegador del visitante. La NASA tarda casi una hora en publicarlas; mientras tanto devuelve una imagen negra, que el sitio descarta (se usa la nubosidad prevista).

## Reglas del color

**Lluvia** (`nivelLluvia`, igual para las 6 localidades y los 70 municipios). "Cayó" son los 7 días anteriores a hoy; "viene" es hoy y los 6 días siguientes.

| Color | Viene en 7 días | En un solo día | Con lo ya caído |
|---|---|---|---|
| Rojo | 120 mm o más | 80 mm o más | cayeron 100 y vienen 70 |
| Amarillo | 70 mm o más | 45 mm o más | cayó + viene suman 120 |

**Alerta del SMN:** es un piso. Amarilla o naranja → al menos amarillo; roja → rojo.

**Cómo se muestra el semáforo** (`pintarSemaforo`): primero los renglones en rojo, naranja (solo el Paraná), amarillo y gris, con su explicación; las localidades y zonas ribereñas en verde van juntas en un solo renglón, con un botón por nombre que abre su detalle. Si todo está en verde, ese renglón dice "Todo en verde".

**Solo informativos (no cambian ningún color):** la lluvia medida en estaciones (detalle de cada municipio: la estación más cercana a su centro, o a la ciudad en las 6 localidades del semáforo, a menos de 50 km y con datos de las últimas 24 horas; `MEDIDA_KM`, `MEDIDA_H`) y el pronóstico del Paraguay en Formosa y Puerto Pilcomayo (aviso si el máximo del rango llega a menos de 50 cm de su nivel de alerta, o lo supera; no se usa si tiene más de 7 días).

**Ríos** (renglones propios en el semáforo; el del Paraná también pinta la costa en el mapa, ver abajo):

| Río | Estación (serie INA) | Amarillo | Naranja | Rojo |
|---|---|---|---|---|
| Paraná | Barranqueras (20) | 6,00 m, a menos de 50 cm y creciendo, o el máximo del rango del pronóstico del INA llega a 6,00 | el valor más probable del pronóstico del INA llega a 6,50 m y el río todavía no | 6,50 m |
| Paraguay | Puerto Bermejo (58) | 6,50 m, o a menos de 50 cm y creciendo | — (sin pronóstico) | 7,00 m |
| Bermejo | El Colorado (6697) | sin color: el INA no publica niveles | — | — |

**Naranja del Paraná** (desde el 13/10/2026, `casoProno`): cubre el hueco entre "puede llegar a la alerta" y "ya pasó la evacuación". Sale solo del pronóstico oficial del INA (valor más probable, la fila `p[2]` más alta entre las fechas que faltan) y del nivel oficial de evacuación; no usa Yacyretá ni cálculos propios. El rojo sigue saliendo solo de lo que mide el río. Los textos dicen "según el pronóstico del INA" y nunca "alerta naranja", porque no es una alerta oficial (las del río las declara la APA). El Paraguay no tiene naranja porque en Puerto Bermejo el INA no publica pronóstico. Con el río arriba de la alerta, el pronóstico solo agrega texto si su máximo llega a la evacuación.

**Costa del Paraná en el mapa** (desde el 14/10/2026, `RIBERA` y `colorDe`): Barranqueras, Puerto Vilelas e Isla del Cerrito toman el color más alto entre el suyo (lluvia con el piso del SMN) y el renglón del Paraná (amarillo, naranja o rojo; el gris y el verde del río no cambian nada). Es la única forma de que el mapa muestre naranja; la leyenda lo aclara ("Naranja: solo en la costa del Paraná, cuando el pronóstico del INA prevé pasar el nivel de evacuación. No es una alerta del SMN"). El detalle del municipio explica que el color sigue al río. Fontana y Resistencia no se pintan: la ciudad está dentro de las defensas. El Paraguay no pinta el mapa.

Una lectura de 4 días o más deja el renglón en gris.

El pronóstico del Paraná no se usa si tiene más de 7 días (ni para el amarillo ni para el naranja). Si tiene 3 días o más, el detalle del río agrega "Es del dd/m: no incluye lo que pasó río arriba después" (`pronoAtraso`); no cambia el color.

**Para sumar otro río:** agregarlo en `OTROS` (`index.html`), en `fuentesExtra` (script de Google, misma dirección: lo controla una prueba) y en las listas de `cargar` y `pintar`. El catálogo de series está en `https://alerta.ina.gob.ar/a5/obs/puntual/series?var_id=2&format=json` (los niveles oficiales vienen en `estacion.nivel_alerta` y `estacion.nivel_evacuacion`).

## Si algo falla

| Qué se ve | Dónde mirar |
|---|---|
| Alertas del SMN sin renovar | Registro de ejecuciones del script de Google. Ejecutar `diagnostico()`. Si el script anda, mirar en GitHub, pestaña Actions, tarea "Lluvia", el paso "Copiar el resultado del script de Google". |
| Página en blanco o sin nada que funcione | La huella de `netlify.toml` no coincide con el código: correr `node herramientas/csp.js` y publicar. |
| Correo o aviso "La lluvia está sin renovar", o mapa en gris | GitHub, pestaña Actions, tarea "Lluvia". Ejecutar `probarRobot()` en Google: si no dice `bien`, revisar la clave. |
| Algún río, un pronóstico, Yacyretá, El Niño o la lluvia medida sin dato | Ejecutar `diagnosticoDatos()` en Google: dice qué fuente no responde. |
| Mapa animado viejo o "No disponible" | `https://raw.githubusercontent.com/marianoavalostech-arch/alertas-smn-chaco/datos/grilla.json`: el campo `error` dice qué falló. |
| Las pruebas fallan en GitHub | Correrlas en la computadora con `node pruebas/reglas.test.js`. |

## Limitaciones conocidas

- Los umbrales de lluvia son orientativos: no están validados por ningún organismo. Se ajustaron el 12/10/2026 con la lluvia diaria de 1991 a 2026 de las 6 localidades del semáforo (archivo de Open-Meteo), aplicando la regla como si el pronóstico hubiera sido perfecto: el amarillo sale unas 5 veces por año en el interior y 8 en Resistencia, el rojo 1 o 2, y enero de 2019 queda en rojo en todas. Ese archivo es un modelo de unos 25 km que suaviza los picos, y no hay una lista oficial de inundaciones para validar día por día.
- Ríos: series de altura del INA. 20 = Paraná en Barranqueras (alerta 6,00 / evacuación 6,50 m), 58 = Paraguay en Puerto Bermejo (6,50 / 7,00 m), 6697 = Bermejo en El Colorado (estación automática, sin niveles oficiales: solo informativo). El INA publica pronóstico de corto plazo para Barranqueras, Puerto Formosa y Puerto Pilcomayo; no para Puerto Bermejo ni para el Bermejo. Las zonas ribereñas tienen renglón propio en el semáforo; el del Paraná también pinta la costa en el mapa.
- Un municipio entra en una alerta del SMN si la zona alertada cubre su punto central o alguno de sus puntos interiores (uno cada unos 10 km, a más de 4 km del borde). Si la zona apenas roza el borde, puede no figurar. Doce municipios chicos solo tienen el punto central.
- El canal del SMN rotula las horas como hora argentina, pero corresponden a UTC. El script las corrige 3 horas (`AJUSTE_H`), verificado contra el mapa del SMN el 6/10/2026. En cada lectura controla que el comienzo de las alertas caiga en las franjas del SMN (0, 6, 12 y 18 h); si la mayoría cae 3 horas antes, el SMN arregló su canal y el script deja de corregir solo (`ajuste.horas` pasa a 0). Necesita al menos 3 alertas en el país para decidir; con menos, sigue con lo que venía usando.
- La lluvia que decide el color es una estimación por modelo en un punto por municipio, no una medición con pluviómetro.
- La lluvia medida viene de estaciones automáticas sin revisar: puede tener errores y huecos. Los controles atrapan el pluviómetro trabado en 0 solo cuando llueve en las vecinas, y no detectan una estación que mide de menos. No hay estaciones públicas con datos en la ciudad de Resistencia ni en Sáenz Peña; para Resistencia la más cercana es la de Corrientes. Las estaciones del SMN y del INTA que tiene el INA no son públicas, y los datos abiertos del SMN no traen milímetros de lluvia.
- El mapa animado no es un radar: la lluvia, también la de las horas pasadas, es del modelo, en puntos cada unos 50 km. Las tormentas son las que prevé el modelo, no rayos medidos.
- El mapa muestra el Paraná solo en Barranqueras, Puerto Vilelas e Isla del Cerrito; el Paraguay y el Bermejo no lo cambian. No se incluyen los avisos a muy corto plazo del SMN.
- Contador de visitas: los bloqueadores de publicidad y algunos navegadores con protección contra rastreo no dejan pasar la imagen del contador, así que cuenta de menos. Es una referencia, no un número exacto.
- Instalar app: el botón solo aparece donde el navegador lo permite (Chrome y Edge en Android y computadora). En iPhone y iPad se instala a mano (Compartir → Agregar a inicio); Firefox en computadora no instala sitios. Cada navegador decide cuándo ofrecerlo: puede no aparecer en la primera visita.
- Puerto Vilelas: el detalle del municipio y la sección del Paraná enlazan a Hidroalerta Vilelas (hidrometro.concejovilelas.com, Sala de Situación de la Municipalidad), que informa caminos cortados, estaciones de bombeo (las N° 9, 10 y 11 de APA y una municipal) y avisos por barrio. Sus datos se cargan a mano y no son públicos para otros sitios (la base pide iniciar sesión), por eso la página no los lee: solo enlaza. Se podrían mostrar si el municipio publica un archivo abierto con el estado de las bombas y da permiso.

## Fuentes

Servicio Meteorológico Nacional (alertas), Instituto Nacional del Agua y Prefectura Naval Argentina (ríos y pronósticos), Entidad Binacional Yacyretá, vía INA (agua que suelta la represa), Red Hidrológica Nacional de la Secretaría de Recursos Hídricos, vía INA (lluvia medida), Open-Meteo (lluvia), NASA GIBS y NOAA (satélite GOES-East), NOAA (ONI), NASA GIBS (mapa del Pacífico: temperatura del mar comparada con lo normal, GHRSST MUR), Instituto Geográfico Nacional y OpenStreetMap (límites).

## Contacto

En el sitio, "Acerca de este sitio" da el correo marianoavalos.tech@gmail.com y el enlace a los issues de GitHub. El correo no está escrito en el HTML: lo arma `armarCorreo()` al cargar la página (hay una prueba que controla que no aparezca escrito tal cual). Para cambiarlo, editar esa función y la prueba.

## Licencia

El código está bajo licencia MIT (ver `LICENSE`), © 2026 Mariano Avalos. Los datos que muestra el sitio pertenecen a cada fuente y siguen sus propias condiciones de uso. Las letras Kanit y Manrope (`fuentes/`) son de The Kanit Project Authors y The Manrope Project Authors, con licencia SIL Open Font License 1.1 (`fuentes/OFL.txt`).
