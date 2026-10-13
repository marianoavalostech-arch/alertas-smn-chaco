# Ríos y Clima del Chaco

Sitio que junta en un solo lugar las alertas oficiales del SMN, la lluvia, la altura de los ríos Paraná (Barranqueras), Paraguay (Puerto Bermejo) y Bermejo (El Colorado) y el estado de El Niño, explicados en lenguaje sencillo para los 70 municipios del Chaco.

Sitio publicado: https://panel-alertas-chaco.netlify.app/

Antes se llamó "Alerta Niño Chaco" y "Tiempo y Ríos del Chaco".

Es un sitio informativo. No reemplaza los alertas oficiales del Servicio Meteorológico Nacional ni de Defensa Civil.

## Cómo funciona

```
SMN (canal CAP) ─┐
INA (ríos y pronóstico) ─┤
GloFAS (caudal) ─┼─> Script de Google (cada hora) ──> dirección pública (JSON) ─┐
NOAA (índice ONI) ─┘        │                                                    ├─> index.html
                            └─ lanza ─> Robot en GitHub ─> rama "datos" ─────────┘
Open-Meteo (lluvia) ────────────────────────┘              (lluvia.json)
```

- **Script de Google** (`apps-script/`): cada hora lee las alertas del SMN, se queda con las que tocan al Chaco y guarda además una copia de los ríos (Paraná, Paraguay y Bermejo), el pronóstico del INA para el Paraná, el caudal y el ONI. Publica todo como JSON.
- **Robot de la lluvia** (`robot/lluvia.js`, tarea `.github/workflows/lluvia.yml`): Open-Meteo rechaza los pedidos que salen de Google, así que la lluvia la pide GitHub y la deja en `lluvia.json`, en la rama `datos`. El script de Google lo lanza en cada renovación; el horario propio de GitHub queda de respaldo.
- **Sitio** (`index.html`): una sola página, sin nada que compilar. Lee las dos copias. Si una copia tiene más de 2 horas, consulta los ríos, el pronóstico y el caudal directamente; la lluvia nunca se pide desde la página. Lo último que funcionó queda guardado en el dispositivo.

Si una fuente falla, las demás siguen y se muestra el último dato bueno con su fecha y hora.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | El sitio completo: estilos, mapa y reglas. |
| `apps-script/alertas-smn-apps-script.gs` | Script de Google. También define los centros de los municipios, que el robot reutiliza. |
| `robot/lluvia.js` | Robot de la lluvia. |
| `herramientas/puntos.js` | Genera los puntos interiores de cada municipio (`PUNTOS` en el script). Solo hace falta si cambia el mapa. |
| `pruebas/reglas.test.js` | Pruebas de las reglas del sitio, del script y del robot. |
| `.github/workflows/` | Tareas de GitHub: `pruebas.yml` (en cada subida) y `lluvia.yml` (robot). |
| `netlify.toml` | Publicación y cabeceras de seguridad. |
| `CAMBIOS.md` | Historial de cambios. |
| `LICENSE` | Licencia MIT del código. |

## Pruebas

Hace falta Node 22 o más nuevo. No hay nada que instalar.

```
node pruebas/reglas.test.js
```

No consultan ninguna fuente. GitHub las corre solas en cada subida a `main`.

## Publicar

Netlify publica la rama `main` tal cual está. Cada subida a `main` es una publicación. La rama `datos` no publica nada.

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
  "robot":     { "t": hora, "estado": "bien" | "sin clave" | error },
  "datos":     { "rio", "paraguay", "bermejo", "prono", "caudal", "oni", "errores" }
}
```

Cada fila de alerta es `[día, fenómeno, madrugada, mañana, tarde, noche, extra]`:

- **fenómeno:** 41 tormentas, 37 lluvias, 42 nevadas, 39 viento, 47 zonda, 101 calor, 102 frío, 103 niebla, 104 humo, 105 polvo.
- **franjas:** nivel en cada franja de 6 horas: 0 sin alerta, 3 amarilla, 4 naranja, 5 roja.
- **extra:** 1 granizo, 2 ráfagas, 3 los dos.

Cada río (`rio` = Paraná, `paraguay`, `bermejo`) trae `obs` (lista de `[día, altura en m]`, una lectura por día: la última de ese día), `hora` (hora de la última lectura), `act` (cuándo la cargó el INA) y `t` (hora de la consulta). `prono` es solo del Paraná: `emitido` y `p` (lista de `[día, mínimo, más probable, máximo]`).

`lluvia.json` (rama `datos`): `{ "datos": { "lluvia", "municipios", "errores" } }`. Cada uno trae `dias` (14 fechas: 7 pasadas y 7 por venir), `mm` (una lista por punto) y `t` (hora de la consulta).

## Reglas del color

**Lluvia** (`nivelLluvia`, igual para las 6 localidades y los 70 municipios). "Cayó" son los 7 días anteriores a hoy; "viene" es hoy y los 6 días siguientes.

| Color | Viene en 7 días | En un solo día | Con lo ya caído |
|---|---|---|---|
| Rojo | 120 mm o más | 80 mm o más | cayeron 100 y vienen 70 |
| Amarillo | 70 mm o más | 45 mm o más | cayó + viene suman 120 |

**Alerta del SMN:** es un piso. Amarilla o naranja → al menos amarillo; roja → rojo.

**Ríos** (renglones propios en el semáforo; no cambian el color del mapa):

| Río | Estación (serie INA) | Amarillo | Rojo |
|---|---|---|---|
| Paraná | Barranqueras (20) | 6,00 m, a menos de 50 cm y creciendo, o el máximo del pronóstico del INA llega a 6,00 | 6,50 m |
| Paraguay | Puerto Bermejo (58) | 6,50 m, o a menos de 50 cm y creciendo | 7,00 m |
| Bermejo | El Colorado (6697) | sin color: el INA no publica niveles | — |

Una lectura de 4 días o más deja el renglón en gris.

**Para sumar otro río:** agregarlo en `OTROS` (`index.html`), en `fuentesExtra` (script de Google, misma dirección: lo controla una prueba) y en las listas de `cargar` y `pintar`. El catálogo de series está en `https://alerta.ina.gob.ar/a5/obs/puntual/series?var_id=2&format=json` (los niveles oficiales vienen en `estacion.nivel_alerta` y `estacion.nivel_evacuacion`).

## Si algo falla

| Qué se ve | Dónde mirar |
|---|---|
| Alertas del SMN sin renovar | Registro de ejecuciones del script de Google. Ejecutar `diagnostico()`. |
| Correo o aviso "La lluvia está sin renovar", o mapa en gris | GitHub, pestaña Actions, tarea "Lluvia". Ejecutar `probarRobot()` en Google: si no dice `bien`, revisar la clave. |
| Algún río, el caudal o El Niño sin dato | Ejecutar `diagnosticoDatos()` en Google: dice qué fuente no responde. |
| Las pruebas fallan en GitHub | Correrlas en la computadora con `node pruebas/reglas.test.js`. |

## Limitaciones conocidas

- Los umbrales de lluvia son orientativos: no están validados por ningún organismo. Se ajustaron el 12/10/2026 con la lluvia diaria de 1991 a 2026 de las 6 localidades del semáforo (archivo de Open-Meteo), aplicando la regla como si el pronóstico hubiera sido perfecto: el amarillo sale unas 5 veces por año en el interior y 8 en Resistencia, el rojo 1 o 2, y enero de 2019 queda en rojo en todas. Ese archivo es un modelo de unos 25 km que suaviza los picos, y no hay una lista oficial de inundaciones para validar día por día.
- Ríos: series de altura del INA. 20 = Paraná en Barranqueras (alerta 6,00 / evacuación 6,50 m), 58 = Paraguay en Puerto Bermejo (6,50 / 7,00 m), 6697 = Bermejo en El Colorado (estación automática, sin niveles oficiales: solo informativo). El INA publica pronóstico solo para Barranqueras. Las zonas ribereñas tienen renglón propio en el semáforo y no cambian el color del mapa.
- Un municipio entra en una alerta del SMN si la zona alertada cubre su punto central o alguno de sus puntos interiores (uno cada unos 10 km, a más de 4 km del borde). Si la zona apenas roza el borde, puede no figurar. Doce municipios chicos solo tienen el punto central.
- El canal del SMN rotula las horas como hora argentina, pero corresponden a UTC. El script las corrige 3 horas (`AJUSTE_H`), verificado contra el mapa del SMN el 6/10/2026. En cada lectura controla que el comienzo de las alertas caiga en las franjas del SMN (0, 6, 12 y 18 h); si la mayoría cae 3 horas antes, el SMN arregló su canal y el script deja de corregir solo (`ajuste.horas` pasa a 0). Necesita al menos 3 alertas en el país para decidir; con menos, sigue con lo que venía usando.
- La lluvia es una estimación por modelo en un punto por municipio, no una medición con pluviómetro.
- El mapa no muestra el estado de los ríos. No se incluyen los avisos a muy corto plazo del SMN.

## Fuentes

Servicio Meteorológico Nacional (alertas), Instituto Nacional del Agua y Prefectura Naval Argentina (río), Open-Meteo (lluvia), GloFAS / Copernicus (caudal), NOAA (ONI), Instituto Geográfico Nacional y OpenStreetMap (límites).

## Licencia

El código está bajo licencia MIT (ver `LICENSE`), © 2026 Mariano Avalos. Los datos que muestra el sitio pertenecen a cada fuente y siguen sus propias condiciones de uso.
