# Historial de cambios

Lo más nuevo va arriba. Cada renglón es una subida a `main`.

## 13/10/2026 (sin publicar)

- **Naranja para la zona ribereña del Paraná**: el renglón pasa a naranja cuando el valor más probable del pronóstico del INA para Barranqueras llega a 6,50 m (el nivel de evacuación) y el río todavía no. Antes quedaba en amarillo y decía "puede alcanzar el nivel de alerta" aunque el INA preveía pasar también la evacuación (el 13/10: 7,30 m para el 20/10, entre 6,75 y 7,55). El rojo sigue saliendo solo de lo que mide el río; el amarillo, igual que antes. El recuadro del río, en naranja, dice "El pronóstico del INA prevé pasar el nivel de evacuación". Cuando solo el máximo del rango llega a 6,50 m, el amarillo nombra la evacuación en vez de la alerta. No es una alerta oficial y el texto no la llama así. No cambia el mapa ni el Paraguay. En el semáforo, el orden queda rojo, naranja, amarillo, gris; el círculo del rojo pasa a "!!!" y el del naranja es "!!". Las alertas naranjas del SMN usan el mismo color, ahora también ajustado al modo oscuro. Prueba del río ampliada (36 en total).

## 13/10/2026 (`30b6561`: incluye `b34190b`)

- **Secciones contraíbles empiezan cerradas**: "Ríos Paraguay y Bermejo", "Lluvias", "Lluvia hora por hora" y "El Niño" ahora arrancan cerradas, igual que "De dónde salen los datos" y "Acerca". La página abre más corta y liviana: el satélite y el mapa del Pacífico se bajan recién al abrir su sección. Quien ya abrió o cerró una sección la sigue viendo como la dejó. Los enlaces "Ver el río" y los botones del semáforo abren la sección.
- **Desplegables más claros**: "Mostrar" y "Ocultar" ahora son un botón con borde celeste (antes, texto gris que se confundía con las aclaraciones). Con la sección cerrada, una línea gris debajo del título dice qué hay adentro (por ejemplo, "Mapa animado de la lluvia, con satélite"); al abrirla desaparece.

## 13/10/2026 (`edcefad`: incluye `e326d30` y `7a776c6`)

- **Secciones contraíbles**: "Ríos Paraguay y Bermejo", "Lluvias", "Lluvia hora por hora" y "El Niño" se pueden cerrar tocando el título (empiezan abiertas); "De dónde salen los datos" y "Acerca de este sitio" empiezan cerradas. El mapa, las alertas del SMN, "Qué hacer", el riesgo por localidad y el Paraná quedan siempre abiertos. Lo que cada persona abre o cierra queda guardado en su navegador. Los enlaces a una sección ("Ver el río", el río en el mapa, una dirección con `#t-…`) la abren si está cerrada. Con El Niño cerrado no se baja la imagen del Pacífico, y con "Lluvia hora por hora" cerrada no se bajan las imágenes del satélite (al cerrarla se detiene). Al imprimir se ve todo. Prueba nueva (36 en total).
- **Enlace a Hidroalerta Vilelas** (Sala de Situación de la Municipalidad de Puerto Vilelas): en el detalle de Puerto Vilelas del mapa y debajo del gráfico del Paraná, para ver caminos cortados, estaciones de bombeo y avisos por barrio. Solo enlace: sus datos no son públicos para otros sitios. Prueba nueva (35 en total).
- **Mapa del Pacífico carga antes**: la consulta chica que busca el último día publicado se hace apenas abre la página, y la imagen se pide cuando la sección está a unos 2500 px (antes, 600 px). En el celular empieza a bajar más o menos a mitad de la página, para que al llegar a El Niño ya esté. Pedido de Mariano: tardaba un poco en aparecer.

## 13/10/2026 (aviso de pronóstico atrasado, mapa del Pacífico y limpieza)

- **Mapa del Pacífico** en "¿Cómo está El Niño?": imagen de la NASA (GIBS, datos GHRSST MUR) con la temperatura del mar comparada con lo normal, del Pacífico ecuatorial y Sudamérica, con un punto en el Chaco, barra de colores (de 3 °C más frío a 3 °C más caliente) y fecha. Pesa unos 90 KB y se pide recién cuando la sección está por verse. La NASA la publica con 1 o 2 días de atraso: la página prueba primero ayer y, si todavía no está, los días anteriores (hasta 4). Si no hay imagen, no se muestra nada. La frase que explica la imagen sigue al ONI: con El Niño señala la mancha caliente; sin El Niño o con La Niña dice qué buscar. Prueba nueva (34 en total).
- Debajo, enlace a earth.nullschool.net para ver el mismo dato en un mapa que se mueve (pesa más; en inglés).
- **Pronóstico del Paraná atrasado**: si el pronóstico del INA para Barranqueras tiene 3 días o más, el detalle del río agrega "Es del dd/m: no incluye lo que pasó río arriba después" (por ejemplo, una suba de lo que suelta Yacyretá posterior al pronóstico). No cambia ningún color. Prueba nueva (33 en total).
- Limpieza: renglones de `907caf5` y `dfbadfe` ordenados bajo su fecha en este historial.

## 13/10/2026 (`dfbadfe`)

- **Yacyretá en lugar de GloFAS**: debajo del gráfico del Paraná, una sola línea dice cuánta agua suelta la represa de Yacyretá, cuánto es lo normal en ese mes (mediana de 2011 a 2025), cuánta soltaba una semana antes y que esa agua tarda unos 3 días en llegar a Barranqueras (Entidad Binacional Yacyretá, vía INA). Reemplaza el párrafo del caudal previsto por GloFAS, que era un cálculo global sin información de la represa. Solo informativo: no cambia ningún color.
- Script de Google: `yacy` (serie 937 del INA) reemplaza a `caudal` (GloFAS) en la copia horaria; `diagnosticoDatos()` muestra su última lectura. README, "De dónde salen los datos" y pruebas (32 en total).

## 13/10/2026 (`907caf5`)

- **Contacto por correo** en "Acerca de este sitio": marianoavalos.tech@gmail.com. La dirección no está escrita en el HTML: la arma la página al cargarse, para que los robots que juntan direcciones no la encuentren tan fácil. El enlace a GitHub queda como segunda opción. Una prueba nueva lo controla (31 en total).
- Correcciones chicas: "las alertas oficiales" (decía "los"); el teléfono de Defensa Civil marca solo el interno 103 en los celulares que lo permiten; "Acerca de" nombra también a la NASA y al IGN; en "De dónde salen los datos" los pronósticos de los ríos van junto a las alturas y "Cuando una fuente no responde" queda al final.

## 13/10/2026 (`c66cc62`)

- **Semáforo más corto**: arriba, con su explicación, solo lo que está en rojo, amarillo o gris (en ese orden); lo que está en verde va junto en un renglón, con un botón por nombre que abre su detalle. Si todo está en verde, dice "Todo en verde".
- **"Qué hacer ante una alerta" con recomendaciones por fenómeno**: tormentas y rayos; viento fuerte y granizo; lluvias fuertes, calles anegadas y crecida del río (con un punto para la costa fuera de las defensas); y cuando baja el agua. Resumidas del SINAGIR (argentina.gob.ar/sinagir) y del Ministerio de Salud de la Nación, con enlace a cada página. El enlace al SMN queda para ver el mapa de alertas del país.
- Renglón **"Teléfonos de emergencia en el Chaco"**: 911 (Policía), 100 (Bomberos) y 107 (emergencias médicas), y Defensa Civil de la Provincia: (0362) 444-8000, interno 103 (Mapa del Estado del Chaco).

## 13/10/2026 (`1886b22`)

- **Lluvia medida en estaciones**: el detalle de cada municipio muestra lo que llovió en la estación automática más cercana (red SAT de la Red Hidrológica Nacional, vía INA), a menos de 50 km y con datos de las últimas 24 horas: lo caído en 24 horas y en 3 días hasta su última lectura. En las 6 localidades del semáforo se mide desde la ciudad. Es solo informativo: no cambia ningún color.
- **Pronóstico del río Paraguay** en Puerto Formosa y Puerto Pilcomayo (INA, día por día a unos 8 días, con rango), en la sección "Ríos Paraguay y Bermejo", con sus niveles de alerta y aviso si el rango se acerca a ellos. Solo informativo: el renglón "Zona ribereña del Paraguay" sigue saliendo de la lectura en Puerto Bermejo, que no tiene pronóstico.
- Controles de la lluvia medida: se descarta la estación que marcó 0 en 3 días mientras dos vecinas midieron 10 mm o más (y se usa la siguiente más cercana); aviso si faltan lecturas o si midió mucho más que todas sus vecinas; se ignoran lecturas de más de 150 mm. Calibrados con enero a marzo de 2026.
- Script de Google: suma `pronoPy` (calibrado 312 del INA) y `medida` (51 estaciones en un solo pedido) a su copia horaria; `diagnosticoDatos()` los muestra, con las estaciones con aviso y las descartadas. La página nunca le pide la lluvia medida al INA: la toma de la copia del script.
- Textos de "De dónde salen los datos" y "¿Cómo se decide el color?", README y 3 pruebas nuevas (30 en total).
- Fuera del repositorio: el script de Google quedó con el código de `1886b22` y la app web pasó a la versión 4 (misma dirección).

## 12/10/2026 (noche, `527bb9d`)

- Sección nueva **"Lluvia hora por hora: ayer, hoy y mañana"**: mapa animado del Chaco y alrededores con la lluvia y las tormentas previstas por hora (Open-Meteo), botones de día, barra de horas y reproducir. En las horas pasadas, las nubes del satélite GOES-East (NASA); en las que vienen, la nubosidad prevista.
- Robot: `robot/grilla.js` arma `grilla.json` en la rama `datos`, cada 3 horas como mucho, después de la lluvia y sin afectarla si falla.

## 12/10/2026 (noche, `89be500`)

- Mapa: tocar el río Bermejo (la línea o su nombre) lleva a la sección "Ríos Paraguay y Bermejo". Antes era solo dibujo.

## 12/10/2026 (noche)

- Umbrales de lluvia nuevos, ajustados con la lluvia de 1991 a 2026: amarillo desde 70 mm en 7 días, 45 mm en un día o 120 mm entre lo caído y lo que viene; rojo desde 120 mm, 80 mm en un día, o 100 caídos y 70 por venir. Lo ya caído, solo, ya no pinta de amarillo.
- Ríos Paraguay (Puerto Bermejo) y Bermejo (El Colorado): sección nueva "Ríos Paraguay y Bermejo", renglón "Zona ribereña del Paraguay" en el semáforo (amarillo desde 6,50 m o a menos de 50 cm y creciendo, rojo desde 7,00 m) y el río Paraguay del mapa lleva a esa sección. El script de Google suma las dos series a su copia horaria.
- Textos aclarados: encabezado y descripción para compartir nombran los tres ríos; el mapa explica que su color no incluye los ríos; "De dónde salen los datos" separa Paraná de Paraguay y Bermejo, dice que no hay pronóstico para estos dos y de dónde salen los umbrales de lluvia. README con una sección "Reglas del color", el formato de los datos de los ríos y cómo sumar otro río.
- Nombre nuevo: **"Ríos y Clima del Chaco"** (antes "Tiempo y Ríos del Chaco"), en el título, el encabezado, la vista previa para compartir, el README y el asunto de los correos del script.
- Subtítulo nuevo: "Alertas, lluvias y ríos del Chaco" (antes hablaba de riesgo de inundación), en el encabezado, la descripción y la imagen para compartir (`compartir.png`, ahora `?v=6`).

## 12/10/2026

- Licencia MIT (`LICENSE`); "Acerca de este sitio" dice quién lo hace y menciona la licencia; el pie ya no dice "Prototipo". README al día.
- Node 22 en las tareas de GitHub (`lluvia.yml` y `pruebas.yml`) y este historial ordenado. No toca el sitio (`[skip netlify]`).
- Fuera del repositorio: el script de Google quedó con el código de `5fbffcc` (antes tenía el de `8c81ee2`), la app web pasó a la versión 2 (misma dirección) y se dio el permiso de correo con `probarCorreo()`. La descripción del repositorio en GitHub pasó a "Tiempo y Ríos del Chaco…", con la dirección del sitio.

## 8/10/2026 (tarde)

- `5fbffcc` Mejoras tras la auditoría 4:
  - Las alertas del SMN se asignan por varios puntos de cada municipio, no solo por el central.
  - La corrección de 3 horas del canal del SMN se decide sola en cada lectura: si el SMN arregla su canal, el script deja de corregir.
  - Aviso cuando el informe del SMN lleva más de 3 horas sin renovar.
  - Si la lluvia lleva más de 24 horas sin renovar: aviso en el sitio y correo a quien mantiene el script, con el motivo.
  - Secciones nuevas: "Qué hacer ante una alerta" y "Acerca de este sitio", con nota de privacidad.
  - El script de Google ya no reescribe la clave de GitHub al guardar los datos.
  - README, este historial y más pruebas (lo que está escrito dos veces en el sitio y en el script tiene que coincidir).

## 8/10/2026

- `c724ab0` Mejoras en la selección del mapa.
- `911a3f2` Mejoras del resumen.
- `8c81ee2` El pronóstico del río pasa a ser el del INA.
- `ff0ef4c` Robot de la lluvia en GitHub, lanzado por el script de Google.

## 7/10/2026

- `f97e165` El posible granizo va en cada día y horario, no en el título.
- `b0c0070` Alertas del SMN agrupadas por fenómeno.
- `8d28fc4` Tipo de alerta del SMN visible, con granizo y ráfagas.
- `e5b257b` Primera versión del robot de la lluvia.

## 6/10/2026

- `e7ad1aa` Mejoras tras la auditoría.
- `30cfc29` El Espinillo, municipio 70 en el mapa (con `2e6180c` y `33e99a5`: script y pruebas).
- `62095a3` Nuevo título "Tiempo y Ríos del Chaco" y ríos en el mapa.
- `ace1296` La alerta del SMN fija el color mínimo; los datos viejos van en gris.
- `2dda485` Nuevo orden de las secciones.
- `e228bec` Renovación automática y documentación.
- `42ec9c4` Sección del río mejorada.
- `6b3e4ca` Mapa con color liso (con `550dd40` y `3bea8ca`).
- `f0a9c23` Primera subida.
