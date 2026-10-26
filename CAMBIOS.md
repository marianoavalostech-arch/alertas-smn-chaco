# Historial de cambios

Lo más nuevo va arriba. Cada renglón es una subida a `main`.

## 26/10/2026 (la app de Google Play reconoce al sitio)

- **`.well-known/assetlinks.json`**: une la app de Google Play (`com.marianoavalos.riosyclimachaco`) con el sitio, para que abra a pantalla completa, sin la barra de dirección de Chrome. Lleva las dos huellas SHA-256 de Play Console: la clave de firma de apps de Google (`6A:35:…:87:18`) y la clave de carga de PWABuilder (`B1:64:…:57:88`). Armado con `herramientas/assetlinks.js`. No cambia nada de lo que se ve en el sitio.
- **Pruebas**: si el archivo está, tiene que ser del paquete de la app y tener las dos huellas.
- README: sección "App en Google Play" al día.

## 24/10/2026 (en el celular: todo más compacto, "↑ Índice" que no tapa, las tarjetas del clima a la vista al tocar un municipio y la altura del río destacada)

Pedido de Mariano: aplicar los cambios propuestos para el celular y destacar un poco la altura del río en la franja de arriba.
- **Altura del río destacada en la franja de arriba** (`.rbAlt`, en `rioDato`): "7,23 m" va más grande (1,3 veces) y en negrita, sin color de alarma; también en la del Paraguay. Solo la altura de hoy, no la del pronóstico. El texto no cambia: el menú de la computadora la sigue mostrando ("En rojo · 7,23 m").
- **Al tocar un municipio en el mapa** (`asomarTarjetas`): si las tarjetas del clima quedaron debajo de la pantalla, la página baja lo justo para verlas enteras, sin tapar más de un tercio del mapa. Solo con el dedo y al elegir (no al quitar). Dentro del portal se lo pide al portal, con lo que el portal avisa de su pantalla; en la computadora no se mueve. En un teléfono de 360 px con el mapa arriba: baja unos 100 px y se ven el mapa entero y las tres tarjetas.
- **"↑ Índice" que no tapa** (`botonIndice`): se esconde mientras se baja leyendo y vuelve al subir un poco, después de un salto (índice, "Ver el río", botones, Atrás; `SALTO`) y al final de la página. Antes quedaba siempre en la esquina y tapaba texto o el botón "Mostrar todo".
- **Encabezado más bajo**: el nombre en un renglón (205 → 142 px).
- **Índice más apretado**: botones de 36 px (224 → 159 px).
- **Tarjetas de "¿Qué está pasando?" en renglones**: el dibujo a la izquierda y el nombre al lado, de a dos (659 → 406 px). Desde 360 px de ancho; en pantallas más angostas no entran y quedan como antes. Abiertas, igual que antes.
- **Vista previa de las secciones cerradas más corta**: 5 rem en vez de 7,5 (1.670 → 1.430 px); se sigue viendo que hay contenido.
- Medido en un teléfono de 360 px con los datos del 24/10: la página pasó de 8.202 a 7.581 px. De 600 px para arriba (tablet y computadora) no cambia nada (mismo alto a 600, 768 y 1280 px). Revisado en un navegador real con la regla del navegador: sin desbordes de 320 a 1280 px, sin errores, axe sin errores; en la copia del portal (shortcode 1.3), el toque en el mapa hace bajar al portal y las tarjetas quedan enteras debajo de su encabezado.
- Huella nueva del código. 79 pruebas.

## 24/10/2026 (revisión general: más liviano, listo para Google Play y mejor para leer en el celular)

Pedido de Mariano: revisar todo el proyecto para optimizarlo sin cambiar el funcionamiento, dejarlo listo para publicar en Google Play y que ande bien en el portal de Gobierno Abierto, en la computadora y en el celular, con buena navegación y liviano.
- **Pronóstico por hora a pedido** (`iniciarGrilla`): `grilla.json` (unos 11 KB) se pide recién cuando "Lluvia hora por hora" está a unos 2500 px de la pantalla, cuando se abre o cuando un enlace lleva a ella; dentro del portal, con lo que el portal avisa de su pantalla (`A.cercaPortal`). Con la sección cerrada, su vista previa se dibuja cuando el teléfono queda libre (`pintarAnimPronto`), no junto con los demás datos. El enlace "Ver a qué hora llueve hoy y mañana" deja elegida la localidad aunque el pronóstico todavía no haya llegado. La renovación de cada 30 minutos lo pide solo si ya se pidió. Al abrir la página: 11 KB menos, un tercio menos de memoria y unos 80 ms menos de trabajo en un celular lento (medido con la CPU 4 veces más lenta). Se ve igual que antes.
- **Contador de visitas al terminar de cargar**: la imagen de GoatCounter demoraba el fin de la carga (con un GoatCounter lento, la página "terminaba" de cargar 1,5 s después; ahora a los 0,15 s en la misma prueba). También empieza antes la imagen del Pacífico, que espera ese momento.
- **Conexión anticipada con GitHub** (`<link rel="preconnect" href="https://raw.githubusercontent.com" crossorigin>`): mientras baja la página ya se abre la conexión con el lugar de las copias de los datos; en una red de celular, los datos llegan unos cientos de milisegundos antes.
- **Fondo sin `background-attachment: fixed`**: el degradado es de costado y se ve igual; en Android, Chrome ya no tiene que repintar el fondo en cada movimiento al bajar la página.
- **Íconos guardados una semana** en el navegador (`/iconos/*` y `/icono.svg` en `netlify.toml`): no se vuelven a pedir en cada visita.
- **Google Play**: política de privacidad propia (`privacidad.html`, sin código, con la letra y los colores del sitio), enlazada desde "Acerca de este sitio"; la app de Play se reconoce (`desdePlay`: Chrome la abre con origen `android-app://…`): no ofrece "Instalar app" y el contador la anota como `/desde-play`; `herramientas/assetlinks.js` arma `.well-known/assetlinks.json` cuando estén el nombre del paquete y las huellas de la firma (una prueba controla su forma); categoría `weather` en `manifest.webmanifest`. Sección "App en Google Play" en el README.
- **Para leer mejor en el celular**: las etiquetas "alerta amarilla / naranja / roja" con el texto en un tono más oscuro del mismo color (`--amarillo-txt`, `--naranja-txt`, `--rojo-txt`; el amarillo sobre blanco tenía contraste 2,4 y ahora 5,8; el borde no cambia); en la franja y en "Alertas oficiales del SMN", "con posible granizo" y el nivel pasan al renglón de abajo en vez de apretarse en una columna; el título de cada renglón de "Riesgo por localidad" sin justificar (quedaban huecos grandes); los nombres de "En verde" del alto de los demás botones (40 px).
- **Accesibilidad**: las dos tablas que se desplazan de costado se pueden recorrer con el teclado (`tabindex="0"`, con nombre). La revisión automática (axe) queda sin errores.
- Revisado en un navegador real con la regla del navegador y los datos del 24/10: sin desbordes de costado de 320 a 1440 px, sin errores en la consola, y en una copia del portal con el código del shortcode 1.3 (marco del alto entero en el celular, acomodo de computadora, "Ver el río" deja el título a 80 px, la política de privacidad abre en una pestaña nueva).
- README: corregido lo que pasa sin señal (el teléfono muestra que no hay conexión; lo guardado se usa cuando una fuente no responde).
- Huella nueva del código. 78 pruebas.

## 24/10/2026 (en el celular, botones de colores y etiqueta del SMN más chicos en el mapa)

Pedido de Mariano: en el celular, al tocar una localidad del mapa, los botones de colores ("qué significa cada color") quedaban muy grandes y tapaban las tarjetas del clima.
- **Botones de colores** (`.leyenda`, menos de 600 px): más chicos y en un solo renglón (Verde, Amarillo, Naranja, Rojo), con "Borde punteado: alerta del SMN" debajo. **"Sin datos" se esconde en el celular cuando ningún municipio está en gris** (`.leyenda.sinGris`, en `colorearMapa`); aparece solo si hay alguno, o si ese filtro está elegido. El significado del gris sigue en "¿Qué significa cada color?". La leyenda pasó de unos 115 a 50 px de alto.
- **Etiqueta del SMN en el detalle del mapa** (`#mInfo .smnChip`, menos de 600 px): letra más chica y uno o dos renglones ("Tormentas con posible granizo" y debajo "ALERTA AMARILLA"); antes eran tres.
- Entre las dos cosas, las tarjetas del clima suben unos 120 px. En la computadora y en la tablet no cambia nada.
- Huella nueva del código. 73 pruebas.

## 23/10/2026 ("Todo el Chaco" al ir a "Lluvia hora por hora" desde un municipio que no está en la lista)

Pedido de Mariano: si el municipio elegido no está en "Lluvia en", que quede "Todo el Chaco".
- El enlace "Ver a qué hora llueve hoy y mañana ↓" del detalle del mapa elige "Todo el Chaco" (`elegirLoc(-1)`) cuando el municipio no es una de las 6 localidades ni del Gran Resistencia. Antes quedaba elegida la última localidad que se había mirado.
- Huella nueva del código. 73 pruebas.

## 23/10/2026 (enlaces a "Lluvia hora por hora" y "Tormentas" sin cortar)

Pedido de Mariano: arreglar "Tor-mentas" cortado y sumar un enlace a "Lluvia hora por hora" donde sirva, sin que moleste ni se repita.
- **Etiqueta de la alerta** (`.smnChip`): sin guiones ni justificado (`hyphens:none`, `text-align:left`), aunque el párrafo de alrededor sí lo esté. Arregla "Tor-mentas" en el detalle del mapa y en cualquier otro lugar donde aparezca.
- **Detalle del mapa**: al final de la letra chica de las tarjetas, "Ver a qué hora llueve hoy y mañana ↓" (`a.aHora`, `#t-anim`). Abre la sección si está cerrada y baja hasta ella (también en el portal, con el mismo mecanismo de "Ver el río"). En las 6 localidades del semáforo y el Gran Resistencia, además deja elegida esa localidad en "Lluvia en" (`data-hora`, `elegirLoc`), con su resumen ("En Resistencia se espera lluvia mañana, a ratos entre…").
- **Alertas oficiales del SMN**: "Ver a qué hora llega la lluvia, hora por hora ↓", solo cuando hay alerta por tormentas o lluvias.
- No se agregan en "Lluvias: últimos 7 días…" (está justo arriba de "Lluvia hora por hora") ni en "Riesgo por localidad" (repetiría el del mapa).
- Huella nueva del código. 73 pruebas.

## 23/10/2026 (3 tarjetas grandes en vez de 7 recuadros)

Pedido de Mariano: acotar a 3 días y acomodar el diseño para que se vean bien la temperatura y la lluvia.
- **Hoy y los 2 días siguientes** (`DIAS_TARJ = 3`, los mismos que cubren las alertas del SMN). El texto desplegable sigue hablando de los 7 días de lluvia, que son los que usa el color.
- **Tarjeta más grande**: día en palabras ("Hoy", "Sábado") y fecha, ícono grande y la palabra del tiempo ("Poca lluvia", "Nublado", "Despejado"…), **máxima y mínima** grandes con sus rótulos "Máx" y "Mín", y debajo de una línea punteada la **lluvia** en mm, en azul. Con alerta del SMN: el ícono y el fenómeno del SMN ("Tormentas"), un cartelito "Alerta amarilla" (o naranja, o roja) y el borde de arriba de su color. Sin temperaturas en la copia: igual, sin la fila de máxima y mínima.
- Letra chica: "Pronóstico de Open-Meteo. Las alertas son del SMN."
- Huella nueva del código. 73 pruebas.

## 23/10/2026 (temperatura y tipo de tiempo en los recuadros de los días)

Pedido de Mariano: agregar los grados a los recuadros de los días.
- **Robot de la lluvia** (`robot/lluvia.js`): la misma consulta a Open-Meteo pide además `temperature_2m_max`, `temperature_2m_min` y `weather_code` (`urlTiempo`: le suma las variables a la dirección del script de Google, que no se cambia; si esa dirección cambiara de forma, pide solo la lluvia como antes). Se guardan en `lluvia.json` como `tmax`, `tmin` (grados enteros) y `cod` (código del tiempo de la OMM), alineados con `dias`, para las 6 localidades y los 70 municipios (`tiempo`). Mismos 2 pedidos por hora que antes. Si llegan mal, la lluvia se guarda igual, sin ellos. La copia del script de Google (`servidor.json`) no los trae.
- **Recuadros** (`diasInfo`): ícono del tiempo, máxima (negrita), mínima y mm de lluvia. Ícono (`icoDia`): con 1 mm o más manda la lluvia (⛈️ si Open-Meteo prevé tormenta, 🌦️ de 1 a 9 mm, 🌧️ desde 10); con menos, el cielo (☀️ despejado, 🌤️ mayormente despejado, ⛅ parcialmente nublado, ☁️ nublado o llovizna de décimas, 🌫️ niebla). Con alerta del SMN ese día, su ícono y su color, como antes. Sin temperaturas en la copia, se muestra como antes (solo lluvia).
- La copia de los municipios guardada en el navegador incluye las temperaturas (`MEM`, `M.dMun`).
- Pruebas nuevas del robot (pide las variables en la misma consulta, redondea, y si llegan mal guarda la lluvia igual). Huella nueva del código. 73 pruebas.

## 23/10/2026 (recuadros de los próximos días y texto desplegable en el detalle del mapa)

Pedido de Mariano: en el detalle de un municipio, recuadros de los días siguientes con íconos según el pronóstico, además de la alerta, y el texto de abajo desplegable de forma que se note que sigue.
- **Recuadros de hoy y los 6 días siguientes** (`diasInfo`), debajo del renglón del SMN: día ("Hoy", "Sáb 24"…), ícono y mm de lluvia prevista. Íconos solo por la lluvia (no hay datos de sol, nubes ni temperatura): 🌤️ sin lluvia (menos de 1 mm), 🌦️ poca (1 a 9), 🌧️ lluvia (10 o más). Si el SMN tiene alerta ese día para el municipio, va su ícono (⛈️ tormentas, etc.) y el borde de arriba con el color del nivel. Cada recuadro dice todo en palabras para lectores de pantalla.
- **Misma lluvia que usa el color**: en las localidades del semáforo y el Gran Resistencia, la de `lluvia.json`; en el resto, la de cada municipio (`M.mmMun`, guardada en `estimar`). Sin recuadros si el dato es viejo o falta.
- **Texto desplegable** (`.mDet`): el color y su explicación, el río y la lluvia medida empiezan cortados con el mismo desvanecido de las secciones plegables y el botón "Seguir leyendo" / "Leer menos"; tocar el texto desvanecido también lo abre. Si el texto entra entero, no se corta. Al elegir otro municipio vuelve a cerrarse. Al imprimir sale entero.
- Huella nueva del código. 71 pruebas.

## 23/10/2026 (alerta del SMN arriba en el detalle del mapa)

Pedido de Mariano: al tocar un municipio en el mapa (por ejemplo Resistencia), el aviso del SMN quedaba al final, después del río y de la lluvia medida.
- El renglón "SMN" (⛈️ Tormentas, alerta amarilla, día y franjas, o "Sin alertas oficiales…") va ahora arriba, debajo del nombre y la superficie (`pintarInfo`, `smnInfo`). El resto del detalle no cambia.
- Huella nueva del código. 71 pruebas.

## 23/10/2026 (Yacyretá en tono neutro)

Mariano: que no sea alarmista; título "Yacyretá" a secas y lo medido y lo estimado en lenguaje neutro.
- Título "Yacyretá (m³ de agua por segundo)"; dos cuadritos: "Sale de la represa" y "Normal para <mes>". Se saca la comparación en palabras ("cerca del triple…", `yacyVsNormal`).
- "Medido ayer, jueves 22/10. Esa agua tarda unos 3 días en llegar a Barranqueras; el INA la incluye en su pronóstico."
- Desde 25.000 m³/s, sin la palabra "evacuación": "Para el río junto a la represa, el INA considera alto un caudal desde 25.000 m³ por segundo. Para la costa del Chaco valen los niveles de Barranqueras." (`yacyNivel`).
- Huella nueva del código. 71 pruebas.

## 23/10/2026 (secciones de los ríos más livianas y Yacyretá más clara)

Pedido de Mariano: revisar que se entienda y que no haya demasiado texto; mejorar la comprensión y el diseño de Yacyretá.
- **Fecha debajo del número, en palabras de todos los días** (`medidoTxt`): "Medido ayer, jueves 22/10.", "Medido hoy a las 5 h." (Bermejo) o "Medido el martes 20/10." si es más vieja.
- **La fecha no se repite en la letra chica**: abajo queda solo "El INA la cargó el 22/10, 10:31 h." (`lecturaTxt`).
- **Cuadritos sin "En 3 días"** (ya lo dice "Está creciendo: subió… en 3 días") y **"Máximo del período" solo si no es la lectura de hoy** (cuando el río ya bajó del pico). En los tres ríos.
- **Yacyretá en una cajita** (`.yacy`): primero lo que significa ("Suelta cerca del triple de lo normal para octubre"), después el número con lo normal del mes ("33.800 m³ de agua por segundo (lo normal: unos 13.100)") y la fecha; "Esa agua tarda unos 3 días en llegar a Barranqueras. El INA ya la cuenta en su pronóstico."; los niveles del INA junto a la represa en una sola frase (`yacyNivel`). Sin gráfico, sin cambiar colores. Texto alineado a la izquierda (justificado dejaba huecos).
- Huella nueva del código. 71 pruebas.

## 23/10/2026 (fecha de la lectura debajo del número de cada río)

Mariano: después de publicar `f10485c` seguía sin ver la fecha, porque quedaba en la letra chica del final de cada sección, debajo del gráfico.
- **Debajo del número grande de cada río, la fecha de la lectura** (`lecturaCorta`, clase `.lectura`): "Lectura del jueves 22/10." en el Paraná y el Paraguay; "Lectura del viernes 23/10 a las 5 h." en el Bermejo, que trae la hora real. La letra chica del final queda igual.
- Huella nueva del código. 71 pruebas.

## 23/10/2026 (fecha de la última lectura de los ríos)

Pregunta de Mariano: si cada lectura del río se informa con su fecha y hora. El Paraná y el Paraguay decían "Última lectura: 22/10, 00:00 h": el INA guarda esas series como un dato por día y les pone la medianoche como hora, que no es la de la medición (Prefectura mide a la mañana).
- **Paraná y Paraguay: solo el día y cuándo lo cargó el INA** (`lecturaTxt`): "Última lectura: la del 22/10 (el INA la cargó el 22/10, 10:31 h)." El Paraguay suma el "cargó el", que antes no se mostraba.
- **Bermejo, con su hora**: es una estación automática y la hora es real ("Última lectura: 23/10, 05:00 h.").
- Huella nueva del código. 71 pruebas.

## 23/10/2026 (explicación de los colores más clara y corta)

Pedido de Mariano: que "¿Qué significa cada color?" y "¿Cómo se decide el color?" se entiendan mejor y sean más cortos. **Solo textos: ningún cálculo cambia.**
- Se saca la frase "las zonas ribereñas solo miran el río", que contradecía al resto (la costa toma el color más alto entre lluvia y río).
- La tabla aclara que alcanza con una de las tres columnas y que lo caído son los últimos 7 días.
- La alerta del SMN cuenta para hoy y los 2 días siguientes; siempre queda el color más alto entre lluvia, SMN y río (antes solo se decía para la costa).
- El Paraguay y el Bermejo pasan a la lista de lo que no pinta el mapa (sus números quedan en su sección).
- Los municipios que siguen al Paraná se nombran una sola vez, en "¿Qué significa cada color?"; Barranqueras y Puerto Vilelas, junto con los demás que llegan a rojo.
- 71 pruebas.

## 21/10/2026 (sin teléfonos por municipio)

Pedido de Mariano: se sacan los teléfonos de la municipalidad del detalle de Resistencia y Barranqueras (`TEL_MUN`, `telMun`); queda como antes, con los teléfonos de toda la provincia en "Teléfonos". Isla del Cerrito hasta rojo sigue.
- 71 pruebas.

## 21/10/2026 (teléfonos dentro del portal)

Mariano: dentro del portal de Gobierno Abierto, tocar un número sigue sin abrir la llamada, aunque el marco ya tiene `allow-top-navigation-to-custom-protocols` (fragmento 1.4, comprobado el 21/10 a las 12:05).
- **Dentro del portal, los enlaces `tel:` se abren como ventana nueva** (`telDesdePortal`: al tocar, el enlace pasa a `target="_blank"`). El marco sí deja abrir ventanas que salen de sus límites (`allow-popups-to-escape-sandbox`), y desde ahí el teléfono pasa la llamada. Fuera del portal no cambia nada. Los WhatsApp ya se abrían así.
- Huella nueva del código. 72 pruebas.

## 21/10/2026 (Isla del Cerrito hasta rojo y teléfonos municipales)

Pedidos de Mariano.
- **Isla del Cerrito sigue al Paraná hasta rojo** (antes, hasta naranja): el comunicado del Comité Provincial de Emergencia del 18/10 la pone en alerta roja, fuera del cordón de defensa, junto con Barranqueras, Puerto Vilelas, Puerto Antequeras y San Pedro Pescador. El sitio mostraba menos que lo oficial. Textos de "¿Qué significa cada color?" y "¿Cómo se decide el color?" al día.
- **Teléfonos de la municipalidad en el detalle del municipio** (`TEL_MUN`, `telMun`), solo donde el municipio los publicó: **Resistencia**, Defensa Civil municipal 362 516-2913 y 362 529-9957 (también WhatsApp; resistencia.gob.ar, 27/01/2025; sin el horario, que puede haber cambiado), y **Barranqueras**, 362 573-0601 y 362 573-0602 (nota de la Municipalidad del 20/10/2026). Siempre con el 911. Los demás municipios no publican un teléfono confiable en la web: no se inventa ninguno.
- Huella nueva del código. 71 pruebas.

## 21/10/2026 (tu localidad)

Pedido de Mariano: que el sitio, y sobre todo la app instalada, recuerde tu municipio.
- **"📍 Tu localidad"**: la última localidad que elegís en el mapa (tocándola, con el buscador o con "Ver en el mapa") queda guardada **solo en ese navegador o en la app instalada** (`anc-mi-localidad`); no se manda a ningún lado ni usa el GPS.
- Al volver a abrir el sitio aparece un renglón arriba del índice (debajo de las franjas) con el nombre, su color de hoy, **"Ver en el mapa"** (abre su detalle) y **✕** para olvidarla. Si al abrir no había ninguna guardada, el renglón no aparece en esa visita, para que la página no salte mientras se mira el mapa.
- También dentro del portal. Nunca al imprimir. La frase de Privacidad lo cuenta.
- Huella nueva del código. 70 pruebas.

## 21/10/2026 (diseño nuevo de Lluvia hora por hora)

Pedido de Mariano: más prolijo, barritas más anchas para tocar y las localidades más a mano.
- **Reproductor agrupado** en un recuadro de fondo suave: ▶, los días, la lista de localidades, las barritas y la barra de colores van juntos.
- **Días como selector unido** (Ayer · Hoy · Mañana); el elegido, con el degradado del sitio.
- **Las barritas muestran un solo día** (24 horas): son casi 3 veces más anchas y fáciles de tocar. Debajo, 0 h · 6 h · 12 h · 18 h. Al reproducir, a la medianoche pasan solas al día siguiente.
- **"Lluvia en: [Todo el Chaco ▾]"**: una lista desplegable adentro del reproductor, arriba de las barritas, en lugar de los 7 botones de abajo. Al elegir una localidad, el mapa y las barritas van a su hora más fuerte.
- **La frase de la localidad, destacada** con borde de color; la casilla del satélite y la fuente, en letra chica al pie.
- Huella nueva del código. 69 pruebas.

## 21/10/2026 (botones de colores del mapa y barritas más grandes)

Pedidos de Mariano.
- **Mapa: los botones de colores van pegados debajo del mapa**, antes de la lista de municipios. Antes, con muchos municipios de un color (52 en amarillo el 21/10), la lista empujaba los botones más de una pantalla hacia abajo y no se podía cambiar de color sin bajar. En la computadora quedan arriba de la columna de la derecha.
- **Lluvia hora por hora: barritas más altas** (de 66 a 100 px), más fáciles de leer y de tocar. La barra de colores sigue a la vista.
- **"¿Cuándo llueve en…?": las barritas siguen a la localidad elegida.** Con Resistencia elegida, muestran la lluvia de Resistencia (la misma de la frase); antes mostraban siempre lo más fuerte de la provincia, y la barrita más alta podía decir "12 mm" mientras la frase decía "2 mm". Botón nuevo **"Todo el Chaco"** (primero, elegido al abrir) para volver a la provincia; tocar de nuevo la localidad elegida también vuelve.
- **"No es un radar…" pasa adentro de "¿Qué muestra este mapa?"**, al principio, en una sola frase con la explicación del modelo. Queda a la vista la última actualización con su fuente.
- Huella nueva del código (`sha256-NISWh5oK…`). 69 pruebas.

## 20/10/2026 (relojito, barritas y leyenda de colores en Lluvia hora por hora)

Pedidos de Mariano.
- **Arriba de la barrita elegida, un relojito con la hora** ("10 h"), con una puntita sobre la barrita. Se va corriendo mientras se reproduce o se arrastra, y no se sale del gráfico en los bordes.
- **Barritas más claras**: las horas sin lluvia quedan vacías, la hora elegida lleva una franja violeta suave detrás, "ahora" es una línea fina y lisa (y su nombre sube al renglón de los días cuando entra), y arriba de la barrita más alta dice cuánto llueve ahí ("4 mm").
- **Leyenda de colores nueva**: "Lluvia en una hora", la escala de colores de "finita" a "fuerte" con los milímetros en cada corte (1, 3, 7, 15 mm) y, debajo, "tormenta prevista" y "nubes".
- Comentario del código corregido: la lluvia que pide el script de Google llega algunas horas y queda de respaldo.
- Huella nueva del código. 68 pruebas.

## 20/10/2026 (Lluvia hora por hora más compacta e índice completo)

Pedido de Mariano.
- **Lluvia hora por hora**: primero la hora y el mapa; debajo, en un renglón, ▶ y los días. **Las barritas sirven para elegir la hora** (se tocan o se arrastran; con el teclado, las flechas): ya no hay una barra aparte ni la aclaración de las barritas (pasa a "¿Qué muestra este mapa?"). Leyenda en un renglón, localidades más chicas y la hora sin cero adelante ("5 h"). En la computadora, el mapa a la izquierda y los controles a la derecha. La sección ocupa bastante menos.
- **Índice**: se suman "Lluvia por hora" y "Datos y Acerca" (lleva a "De dónde salen los datos", justo antes de Acerca). Quedan 11 destinos. El menú de la izquierda se aprieta un poco en notebooks para que entre entero.
- **Renglón del río en "Riesgo por localidad"**: dice cuánto pasó el nivel en centímetros, como la sección del río ("63 cm arriba del nivel de evacuación (6,50 m)"), en lugar de "superó el nivel de evacuación".
- Huella nueva del código. 66 pruebas.

## 20/10/2026 (menos repeticiones en "Ahora en el Chaco")

Pedido de Mariano.
- **El renglón de cada alerta del SMN es corto**: solo el fenómeno y el día ("⛈️ Tormentas, mañana"), con su botón "Qué hacer". El color, el granizo o las ráfagas y los municipios ya están en la sección del SMN, justo arriba. El recuadro sigue con el color más alto y la tarjeta, con su etiqueta ("Alerta amarilla").
- **En la computadora, los renglones van uno al lado del otro** (también dentro del portal); en el celular, uno debajo del otro, como antes.
- **Sin la frase de las defensas debajo de los renglones**: ya está en la franja del río, en el renglón del semáforo y en la tarjeta "Crecida del río", que abre el botón "Qué hacer" del río.
- Huella nueva del código. 64 pruebas.

## 20/10/2026 (Lluvia hora por hora)

Pedido de Mariano.
- **Tira de barritas** debajo del deslizador: una por hora, más alta cuanto más fuerte la lluvia prevista en algún lugar del Chaco, con los días separados y la marca "ahora". Tocar una lleva el mapa a esa hora: se ve de un vistazo cuándo viene lo fuerte.
- **"¿Cuándo llueve en…?"**: botones con las 6 localidades (también se tocan en el mapa). Una frase dice en qué horas se espera lluvia ahí de acá a mañana a la noche, lo más fuerte y si hay tormentas previstas en la zona; el mapa va a la hora más fuerte.
- **Colores de la lluvia más separados** (y en la leyenda) y **nubosidad prevista en un gris tenue**, para que la lluvia se vea mejor. Las nubes del satélite no cambian.
- El texto largo del final pasa a un desplegable **"¿Qué muestra este mapa?"**; a la vista queda una línea.
- **Párrafos justificados** en todas las secciones, con cortes de palabra para que no queden huecos grandes en el celular (salvo las franjas de arriba, "Ahora en el Chaco" y el renglón del correo).
- Huella nueva del código. 64 pruebas.

## 20/10/2026 ("Instalar app" dentro del portal)

Pedido de Mariano.
- **En el celular, dentro del portal**, el enlace "Abrir en una pestaña nueva" pasa a ser un botón **"Instalar app"** (con el ícono). El teléfono no deja instalar desde el marco del portal, así que abre el sitio en una pestaña nueva ya preparado: en iPhone con los pasos abiertos; en Android con el botón "Instalar app" resaltado (un toque y pregunta el teléfono) y, si el navegador no lo ofrece en 5 segundos, una línea con dónde buscar el ícono o cómo instalar desde el menú ⋮.
- **En la computadora, dentro del portal**, ya no hay enlace.
- Evento nuevo en el contador: `instalar-desde-portal`. Huella nueva del código. 63 pruebas.

## 20/10/2026 (dentro del portal de Gobierno Abierto)

Pedidos de Mariano.
- **Sin barra propia**: dentro del portal, el marco toma el alto entero del sitio y se baja y se sube con la página del portal, también cuando el portal carga su parte tarde.
- **En la computadora, como el sitio original**: el marco ocupa la pantalla debajo del encabezado del portal y el sitio se desplaza por dentro, con el menú de la izquierda fijo (la primera versión movía el menú con lo que se bajaba y saltaba); mientras el marco no llegó arriba, o ya se pasó, la rueda del mouse mueve la página del portal. Marca la sección a la vista. Sin el aviso del portal, una columna. En el celular, sin cambios.
- **Ajustes después de probarlo en el portal**: el menú de la izquierda entra entero también en pantallas bajas (notebooks: más compacto desde 620 px de alto y sin alto mínimo dentro del portal); con un giro rápido de la rueda, al llegar arriba de todo o al final del sitio sigue moviendo la página del portal, y si al detenerse el marco quedó corrido, se acomoda solo; el sitio ya no le manda avisos al portal cuando no cambió nada.
- **Fondo**: dentro del portal también lleva el degradado del sitio (antes, transparente).
- **Los detalles de la instalación en el portal ya no están en el repositorio**: los tiene el responsable del sitio.
- Huella nueva del código. 62 pruebas.

## 20/10/2026 (Instalar app y Compartir solo en el celular; gráfico de lluvia con fechas; botones del riesgo por localidad; 911 fuera del menú lateral)

Pedidos de Mariano.
- **"Instalar app" y "Compartir" solo en celulares y tablets**: en la computadora (con mouse) no se ven. Se decide por el tipo de pantalla (`@media (hover:hover) and (pointer:fine)`), no por el ancho: un celular acostado o una tablet los siguen mostrando. En el portal y al imprimir siguen sin verse.
- **Gráfico de lluvia con fechas**: en Lluvias, debajo de la tabla, un gráfico grande de una localidad (botones para elegirla), con los milímetros de cada día y abajo el día y la fecha ("Hoy", "mié 21/10"…). Grises lo que llovió, azules lo que se espera. En la computadora, las barritas de la tabla ya no se estiran.
- **Riesgo por localidad**: "Ver en el mapa" y "Ver el río" pasan de texto subrayado a botones redondeados como los nombres de "En verde", con ícono (📍, 🌊, 🏞️) y 40 px de alto para tocarlos fácil. Al pasar el mouse por el renglón, el botón se levanta un poco.
- **La app instalada se pone al día sola**: al volver a la app (o a la pestaña) después de más de 6 horas, o si cambió el día, la página se vuelve a abrir entera y trae también la versión nueva del sitio. Con más de 10 minutos, como antes, renueva solo los datos. Dentro del portal no se recarga.
- **Sin el botón "911 Emergencias"** en el pie del menú lateral de la computadora: queda solo "↑ Arriba". El 911 sigue en el cartel de arriba y en "Teléfonos". Más adelante se pueden agregar ahí enlaces a otros sitios o redes.

## 19/10/2026, tarde (Teléfonos en el índice; explicación del Paraná y de Yacyretá)

Pedidos de Mariano.
- **"Teléfonos" en el índice**: en el de arriba y en el menú lateral de la computadora (📞), después de "Qué hacer". Lleva directo a los números (`#t-tel`), igual que "Más teléfonos" del cartel de arriba. En el menú lateral se marca desde donde empiezan los números. El pie del menú queda en un renglón (911 y "↑ Arriba"), para que en notebooks de 768 px de alto siga entrando entero.
- **Paraná, la frase de la situación en centímetros**: "Está 48 cm arriba del nivel de evacuación (6,50 m)." en vez de "Superó el nivel de evacuación". Igual para el Paraguay.
- **Pronóstico del INA con sus números en el gráfico**: cada fecha prevista lleva escrita su altura más probable y, debajo, su rango (hoy: 7,23 m, de 7,00 a 7,80, el 20/10; 6,37 m, de 5,80 a 6,60, el 27/10). La leyenda dice "Previsto por el INA y su rango".
- **Textos más cortos y dos desplegables** al costado del gráfico (debajo en el celular), cerrados: "¿Cómo leer estos números?" (la altura es lo que marca la regla del puerto; alerta, evacuación y defensas) y "¿Cómo calcula el INA la altura de los próximos días?" (sigue el agua que ya viene bajando: lo que suelta Yacyretá, que llega en unos 3 días, el Iguazú, el río Paraguay y la lluvia prevista; altura más probable y rango; lo renueva martes y viernes; el sitio no calcula nada propio).
- **Yacyretá**: solo el último valor, en una frase: "suelta unos 36.200 m³ de agua por segundo: cerca del triple de lo normal para octubre. Esa agua llega a Barranqueras en unos 3 días, y el INA la tiene en cuenta en su pronóstico." Sin gráfico propio. No cambia ningún color.
- **Niveles del INA para Yacyretá** (pedido de Mariano): desde 25.000 m³/s aparece "El INA marca para lo que suelta Yacyretá alerta desde 25.000 y evacuación desde 30.000: hoy está por encima de la evacuación. Esos niveles son para el río junto a la represa; para la costa del Chaco valen los de Barranqueras." Valores del informe diario del INA (16/10/2026); el INA no los publica en sus datos, así que están fijos en el código. No cambia colores.
- Huella nueva del código. 59 pruebas (la de navegación cuenta 10 destinos; la del gráfico del río controla los números y el rango de cada fecha prevista; la de Yacyretá, la frase, la situación en centímetros y los dos desplegables).

## 19/10/2026, tarde (botón de WhatsApp de SECHEEP)

Pedido de Mariano: en los teléfonos, un botón para escribirle a SECHEEP por WhatsApp.
- **Botón nuevo "SECHEEP por WhatsApp"** (364-4377044), debajo del 0800: abre WhatsApp con ese número (`wa.me/5493644377044`). Es el WhatsApp oficial de SECHEEP (figura en secheep.gob.ar y en sus avisos contra estafas). Ícono de globito de mensaje en verde, para no confundirlo con los de llamar. El título dice "Tocá para llamar o escribir".
- En la tarjeta "Viento fuerte y granizo", el aviso de cables caídos suma el WhatsApp.
- Desde 600 px de ancho los teléfonos van en dos filas de tres (antes, una fila de cinco). En el celular, igual que antes, con el botón nuevo a lo ancho.
- Huella nueva del código. 59 pruebas (la de "Qué hacer" controla el botón).

## 19/10/2026, tarde (imagen del Pacífico guardada en GitHub, renovada cada 7 días)

Pedido de Mariano: guardar la imagen de la NASA y traerla cada tantos días, en vez de que cada visita se la pida a la NASA.
- **Robot nuevo** (`robot/pacifico.js`, en la tarea "Lluvia"): cada 7 días baja de la NASA la imagen de la sección El Niño (temperatura del mar comparada con lo normal) y la guarda en la rama `datos` (`pacifico.jpg` y `pacifico.json` con su fecha). Busca el último día publicado (hasta 4 días atrás). Si la NASA falla, queda la anterior y reintenta a las 6 horas. No publica ni gasta créditos de Netlify.
- **La página la lee de GitHub**: carga más rápido y la NASA ya no recibe un pedido por visita. Si la copia falta, no carga o tiene más de 21 días, la pide a la NASA como antes. La imagen puede tener hasta una semana y unos días (lo dice "De dónde salen los datos"; la fecha sigue debajo de la imagen).
- Regla del navegador: deja mostrar imágenes de raw.githubusercontent.com. Privacidad: a la NASA solo por el satélite (y el Pacífico si falta la copia). Las imágenes del satélite del mapa animado no cambian.
- Huella nueva del código. 59 pruebas (nuevas: el robot con imágenes armadas, días sin publicar, cada 7 días, falla y reintento; la página con la copia, la copia vieja y la vuelta a la NASA).

## 19/10/2026, tarde (la página ya no queda "cargando" en la computadora)

Aviso de Mariano: en la PC el navegador se quedaba cargando.
- **Causa**: la prueba chica de la imagen del Pacífico (El Niño, NASA GIBS) se pedía apenas abría la página. La NASA tardó 47 segundos en contestar (19/10) y, mientras tanto, el navegador seguía mostrando que la página cargaba, aunque los datos ya estaban (llegaban en milisegundos).
- **Arreglo**: esa prueba se lanza recién cuando la página terminó de cargar (`iniciarPacifico`). La imagen aparece igual al abrir la sección El Niño. Probado con una NASA que tarda 20 s: antes, más de 30 s "cargando"; ahora, 0,3 s.
- Huella nueva del código. 57 pruebas (una nueva controla que la consulta a la NASA espere a la carga).

## 19/10/2026, tarde (botón "Instalar app" también en iPhone)

Pedido de Mariano: que en iPhone haya lo mismo que en Android.
- **En iPhone y iPad aparece el botón "Instalar app"**, como en Android. Apple no deja que una página se instale sola, así que el botón abre (y al tocarlo de nuevo cierra) los pasos: 1) tocar **Compartir** (el cuadrado con la flecha) en la barra de Safari, o dentro de **⋯** si no se ve; 2) elegir **Agregar a pantalla de inicio** o **Agregar a inicio**; 3) tocar **Agregar**. Reemplaza la línea suelta de antes.
- Según el navegador (`pasosIos`): en Chrome dice que Compartir está arriba, al lado de la dirección; con Chrome, Edge o Firefox en un iOS anterior a 16.4 (que no dejan agregar a inicio) suma primero "Abrí esta página en Safari".
- Abrir los pasos cuenta como `instalar-app-boton` en GoatCounter (el mismo evento que en Android). Nada cambia en Android, la computadora, el portal ni al imprimir.
- Huella nueva del código. 56 pruebas (la de instalar app controla el botón en iPhone, abrir y cerrar, y los textos de Safari y Chrome).

## 19/10/2026, mediodía (computadora: índice junto al nombre y mejor uso del espacio)

Pedido de Mariano: mejorar la vista en computadora, integrar mejor el índice y aprovechar los espacios. Solo desde 1100 px de ancho; en el celular, la tablet, el portal y al imprimir no cambia nada (comprobado: la captura del celular a 390 px queda idéntica, píxel por píxel).
- **El índice va junto al nombre del sitio**: el encabezado pasa a la columna de la izquierda, fija al bajar, con el nombre, Compartir y debajo "En esta página". El contenido empieza arriba de todo y el mapa se ve sin bajar.
- **Puntos de color en el índice** (`marcasLado`): al lado de "Alertas del SMN", "Río Paraná" y "Otros ríos", con el color de su franja de arriba, mientras la franja está a la vista.
- **Menú lateral rediseñado** (pedido de Mariano, 09:27): ocupa todo el alto de la pantalla; cada destino lleva su ícono en un círculo; la sección donde estás se pinta con el degradé del sitio y al pasar el mouse el renglón se corre un poco; debajo de "Alertas del SMN" y de los ríos va un renglón corto con el estado ("Alerta amarilla · miércoles 21/10", "En rojo · 6,80 m"; el río nunca dice "alerta"); una barrita muestra cuánto de la página bajaste; abajo, botón **911 Emergencias**, "Teléfonos" y "↑ Arriba". En pantallas bajas (laptops de 768 px) se achica para entrar sin barra (sin el subtítulo; sin los renglones cortos por debajo de 740 px).
- **Franjas del SMN y del río una al lado de la otra** (cuando están las dos).
- **Mapa más grande** (1,45 a 1 con su detalle).
- **Río Paraná: el gráfico a la izquierda y a su derecha** Yacyretá, Hidroalerta Vilelas y las fuentes (`.rioCuerpo`).
- **Teléfonos y tarjetas de "¿Qué está pasando?" en 5 columnas**: las 9 tarjetas entran en dos filas (Mochila ocupa dos lugares).
- **"Riesgo por localidad" usa todo el ancho.**
- **Secciones cerradas de a dos** (`acomodarPlegables`): la que se abre pasa a lo ancho; una que quedaría sola, también. Al abrir o cerrar con un toque, la pantalla sigue a la sección para que no salte.
- A 1440 px la página pasa de unos 5.360 a 4.080 px de alto. Probado con Chromium a 1440, 1280, 1100, 1024 y 390 px con datos reales y la regla del navegador de `netlify.toml`, sin avisos ni desbordes. Huella nueva del código. 56 pruebas (la de navegación controla la columna fija, las franjas y secciones de a dos, el río, las tarjetas y los puntos).

## 19/10/2026, mañana (tarjetas cerradas, pico del Paraná, índice lateral y pantalla ancha)

Pedidos de Mariano, todo en una sola subida.
- **Las tarjetas de "¿Qué está pasando?" ya no se despliegan solas.** Antes, con algo fuera del verde (hoy, el Paraná en rojo), la tarjeta más grave se abría sola al cargar y ocupaba media pantalla. Ahora todas empiezan cerradas; las que rigen siguen marcadas con su color y su etiqueta ("Río rojo", "Alerta amarilla"), y se abren tocándolas o con el botón "Qué hacer" de "Ahora en el Chaco" y de las franjas.
- **Gráfico del Paraná:** el punto más alto del pronóstico del INA lleva su altura escrita (hoy, "7,23 m" para el 20/10), además del último (6,37 m). Solo si es más alto que la lectura de hoy y no es el último punto (`rioPico`). Antes se veía solo tocando el gráfico.
- **Índice lateral en computadora** (desde 1100 px de ancho; `#lado`, `indiceLateral`): a la izquierda, fijo al bajar, con los mismos 9 destinos que el índice de arriba ("En esta página"). Marca en violeta la sección que está en la pantalla. En esa pantalla no se ven el índice de arriba ni "↑ Índice". Abre las secciones cerradas como los otros enlaces.
- **Página más ancha en computadora** (desde 1100 px): la columna pasa de 720 a unos 1.000 px. El mapa va a la izquierda y su detalle, la leyenda y "¿Qué significa cada color?" a la derecha, así se ven juntos sin bajar. El gráfico del río crece a 640 px. Los párrafos largos quedan en unos 88 caracteres por renglón para que se lean bien.
- En el celular, en la tablet (menos de 1100 px), dentro del portal y al imprimir no cambia nada. Probado con Chromium a 1440, 1280, 1100, 1024 y 390 px, con datos reales, sin avisos de la regla del navegador. Huella nueva del código. 56 pruebas (la de "Qué hacer" controla que no se abran solas; la del río, el número del pico; la de navegación, el índice lateral).

## 19/10/2026, mañana (secciones de arriba más cortas)

Pedido de Mariano: lo principal a la vista y el detalle desplegable, para llegar antes al río.
- **Cartel informativo en una línea:** "Sitio informativo: no reemplaza las alertas del SMN ni los avisos oficiales. Emergencias: 911 · Más teléfonos · Alertas oficiales del SMN" (el 911 se toca para llamar). Sigue siempre a la vista.
- **Mapa:** la leyenda queda en botones cortos (Verde, Amarillo, Naranja, Rojo, Sin datos y el borde punteado), que siguen resaltando los municipios de ese color. Lo que significa cada color y el párrafo de la costa del Paraná pasan a "¿Qué significa cada color?" (`#d-colores`).
- **Alertas del SMN:** una línea por fenómeno con su color más alto, para qué días y cuántos municipios ("Para el miércoles 21/10 · 20 de 70 municipios"). Los días, horarios, niveles y municipios, en "Ver horarios y municipios". "Ver días y horarios" de la franja los abre.
- **Qué hacer:** "Ahora en el Chaco", los teléfonos y las tarjetas quedan igual. "Qué significa cada color del SMN" y las fuentes pasan a "Más información" (`#d-hacer-mas`).
- **Franja del río más corta** (de unos 262 a 188 px en el celular, con el Paraná en rojo): tres renglones. Primero el color y el dato ("≈ Río Paraná en rojo · 6,80 m en Barranqueras (evacuación: 6,50 m)"; `rioDato`); el pronóstico del INA aparece solo si el color sale de él ("… · el INA prevé 7,30 m para el 20/10"). Después la zona con la frase de las defensas, ahora más corta (`DEFENSAS_CORTA`: "Dentro de las defensas el agua queda afuera; seguí los avisos oficiales."). Después los botones. El texto completo sigue en el renglón, en "Ahora en el Chaco" y en la sección del río.
- Cada navegador recuerda qué desplegables abrió (`anc-desplegables`; los del SMN, mientras la página está abierta). Al imprimir se ven todos abiertos. Huella nueva del código. 56 pruebas (1 nueva).

## 19/10/2026, mañana (navegación: índice, volver al índice, Atrás y botones grandes)

Revisión de navegabilidad del 19/10 (Chromium como celular, 390 × 844, datos reales): la página mide unas 10 pantallas y el río Paraná quedaba en la pantalla 7 sin atajos.
- **Índice** debajo de las franjas y arriba del mapa (`#indice`): Mapa, Alertas del SMN, Qué hacer, Por localidad, Río Paraná, Otros ríos, Lluvias, El Niño y Acerca. Abre la sección si está cerrada. No cambia el orden de las secciones.
- **Botón "↑ Índice"** en la esquina (`#aIndice`, `botonIndice`): aparece cuando el índice ya quedó arriba fuera de la pantalla.
- **El botón Atrás vuelve adonde estabas:** "↑ Volver al mapa", "Ver en el mapa" y los nombres en verde del semáforo, las etiquetas de los ríos y los botones "Qué hacer" no dejaban marca en el historial, y Atrás sacaba del sitio. Ahora dejan una (`marcarSalto`), como los enlaces. En el portal no.
- **Buscar un municipio muestra el resultado:** antes el mapa y el detalle quedaban debajo de la pantalla; ahora la página baja hasta el mapa y se cierra el teclado.
- **Botones grandes en las franjas:** "Qué hacer", "Ver el río" y "Ver días y horarios" eran enlaces de 21-22 px de alto; ahora son botones de 44 px (`.bBtn`).
- Nada de esto se ve en el portal ni al imprimir. Huella nueva del código. 55 pruebas (1 nueva).

## 18/10/2026, noche (franja del río arriba de todo)

- **Franja del río arriba de todo** (pedido de Mariano): cuando el Paraná o el Paraguay salen del verde (desde amarillo), debajo del cartel "Este sitio es informativo" y antes del mapa aparece una franja con el color de su renglón y el mismo aspecto que la del SMN (`pintarRioBanda`, `#rioBanda`). Con los datos del 18/10: "≈ Río Paraná en rojo · islas y costa fuera de las defensas. El Paraná está en 6,80 m en Barranqueras: superó el nivel de evacuación (6,50 m). El INA prevé 7,23 m para el 20/10. Dentro de las defensas del Gran Resistencia el agua del río queda afuera. Seguí los avisos oficiales. Qué hacer · Ver el río".
- Usa el mismo texto del renglón, el título de "Ahora en el Chaco" (`rioTit`, que ahora comparten) y la zona (`RIO_ZONA`). La frase de las defensas va en corto (`DEFENSAS_CORTA`). No dice "alerta": los colores salen del INA. Si también está la franja del SMN, va primero la más grave (`ordenBandas`).
- Como la del SMN, aparece cuando corre el código o llegan los datos: mientras está, la página baja un poco al cargar (medido con el río en rojo, a 390 px: 0,16).
- Huella nueva del código. 54 pruebas (1 nueva).

## 18/10/2026, noche (`4aac9e4` y `24d3f87`: revisión integral: el mapa nombra al río, la página carga más rápido y Netlify corre las pruebas antes de publicar)

- **La leyenda del mapa nombra al río.** Con el Paraná en 6,80 m (18/10), Barranqueras, Puerto Vilelas y Colonia Benítez estaban en rojo por el río y la leyenda decía "Rojo: lluvia muy fuerte o alerta roja del SMN". Ahora el amarillo dice "… o el Paraná alto en la costa y zonas bajas", el naranja "… por la altura del río y el pronóstico del INA" (antes: "cuando el pronóstico del INA prevé pasar el nivel de evacuación", que no vale con el río ya sobre 6,50 m) y el rojo "… o el Paraná muy alto en la costa".
- **Detalle de Resistencia:** decía "Verde" (su semáforo, por la lluvia) con el mapa en naranja por el río. Ahora el color grande es el del mapa ("Lluvia y río Paraná", "Naranja") y abajo dice "Por la lluvia, su semáforo está en verde." Solo cambia cuando sigue al río (rama `seg` con `k.rio` en `pintarInfo`).
- **Textos al día con las reglas del 17/10:** "¿Cómo se decide el color?" ya no dice que Barranqueras y Puerto Vilelas son "la única forma" de rojo por el río (Colonia Benítez también llega), y "De dónde salen los datos" ya no dice que el pronóstico del Paraná "nunca" da rojo.
- **Más rápida en celulares lentos:** los formatos de fecha y número (`nf`, `diaAR`, `fFechaHora`, `fDiaLargo`, `horaAR` y la hora del mapa animado) se arman una sola vez; armarlos en cada uso trababa la página. Medido en Chromium como celular lento (procesador 4 veces más lento) con los datos del 18/10: el bloqueo al cargar baja de 0,9-1,2 s a 0,12 s y cada repintado de 110 a 14 ms. Los textos en pantalla no cambian.
- **La página ya no salta al cargar:** el botón Compartir aparecía cuando corría el código y empujaba todo unos 54 px. Ahora su lugar queda reservado (invisible) hasta entonces, y el del mapa también (`aspect-ratio` en `#mapa`, igual a `BASE`). El botón sigue empezando oculto. Medido a 390 y 412 px de ancho: de 0,36-0,38 a 0, con la misma captura.
- **Ícono liviano en "Instalar app":** el botón usaba el PNG de 192 px (22,9 KB), que se bajaba en cada visita aunque el botón casi nunca se vea. Ahora usa `icono.svg` (el mismo dibujo, 0,9 KB, ya en caché como ícono de la pestaña): unos 23 KB menos en la primera visita (≈ 15 %).
- **Netlify corre las pruebas antes de publicar** (`command = "node pruebas/reglas.test.js"` y `NODE_VERSION = "22"` en `netlify.toml`): si alguna falla, no publica y queda la versión anterior. Una publicación fallida no gasta créditos.
- **Accesibilidad y textos:** `<main>` alrededor del contenido (el encabezado y el pie quedan afuera; mismo espacio entre secciones). En "Lluvia fuerte" y "Crecida del río", "bajá la llave de la luz" pasa a "si podés llegar sin pisar agua, bajá la llave de la luz".
- **Robot y tareas de GitHub** (`4aac9e4`, `[skip netlify]`): `actions/checkout` v7.0.1 y `actions/setup-node` v7.1.0, fijadas por huella (GitHub avisaba en cada corrida que las v4.4.0 piden Node 20). Si la copia del script de Google tiene más de 6 horas, la corrida de "Lluvia" termina con error después de guardar y GitHub avisa por correo, porque el script puede estar detenido (`atrasada` en `robot/servidor.js`).
- Huella nueva del código. 53 pruebas (5 nuevas). El script de Google no cambia.

## 18/10/2026, noche (`7e4a5c3`: alertas del SMN: hoy y 2 días más, como la página del SMN)

- **Las alertas del SMN se muestran solo para hoy y los 2 días siguientes** (`SMN_DIAS`, `smnTope`, en `smnDe`), igual que smn.gob.ar/alertas. El canal CAP trae un cuarto día, que la página del SMN todavía no muestra: al abrir el enlace, la alerta no aparecía. Ese día ya no cuenta para la franja, la lista, "Ahora en el Chaco", el detalle de cada municipio ni el piso del color del mapa; entra solo cuando la página del SMN también lo muestra. "Informe para los días…" también corta en 3 días. Pedido de Mariano.
- Se quita el aviso "La página del SMN muestra solo hoy y los 2 días siguientes…" (`smnLejos`) de la subida anterior: ya no hace falta. La franja sigue diciendo para qué día es.
- Línea nueva en "Acerca de este sitio". Huella nueva del código. Prueba de la franja al día (48 pruebas). Con los datos del 18/10 a las 19:51: "Sin alertas del SMN para el Chaco entre el 18/10 y el 20/10" (la tormenta del 21/10 aparece el lunes).

## 18/10/2026, noche (subido en `cf1f0b5`: la franja del SMN dice para qué día es la alerta)

- **La franja de arriba ya no dice "Alertas del SMN vigentes".** Ahora dice para qué día es: "Alerta del SMN para hoy", "para mañana" o "para el miércoles 21/10" (`smnDiasTxt`). Caso real del 18/10: el SMN emitió alerta amarilla por tormentas con posible granizo para el miércoles 21 a la tarde en el este del Chaco, y la franja parecía decir que era para ahora.
- **Aviso cuando la página del SMN todavía no muestra la alerta.** La página de alertas del SMN muestra solo hoy y los 2 días siguientes, pero el canal CAP que lee el script trae un día más. Si hay una alerta más lejos, después del enlace "Ver las alertas en el SMN" se aclara: "La página del SMN muestra solo hoy y los 2 días siguientes: la alerta del miércoles 21/10 se va a ver ahí desde el lunes 19/10" (`smnLejos`). Comprobado el 18/10 a las 20:25 en smn.gob.ar/alertas (solo botones Domingo 18, Lunes 19 y Martes 20) y en el canal CAP (tormenta, polígono del este del Chaco, desde el 21/10 a las 15:00).
- Huella nueva del código. Prueba nueva (48 pruebas). Pedido de Mariano.

## 17/10/2026, tarde (`0588be9`, `5dd2919`, `ac583fd` y `8d5cab1`: tocar el río en el mapa ya no lleva de golpe a su sección, etiquetas de los ríos y "Volver al mapa")

- **En el celular, tocar cerca de la costa ya no lleva al río sin querer.** El río tiene una franja invisible para que sea fácil tocarlo, y al querer ver un municipio de la costa (Barranqueras, Puerto Vilelas, Isla del Cerrito…) el dedo caía a veces sobre ella y la página bajaba sola a la sección del río. Ahora: si a menos de unos 8 píxeles del toque hay un municipio, se elige el municipio (`munCerca`); si no, el río queda marcado en el mapa y el cuadro de abajo dice "Río Paraná" (o Paraguay, o Bermejo), con el botón "Ver el río Paraná ↓" y la aclaración "Si querías ver un municipio, tocalo un poco más adentro del mapa" (`verRio`). La página solo baja con ese botón. Con el mouse pasa lo mismo, sin la búsqueda del municipio cercano. La ✕ o Escape quitan el cuadro. Huella nueva del código. 47 pruebas bien. Probado en Chromium como celular (390 px, toques reales) con los datos del 17/10: tocando sobre el Paraná o 5 px afuera se elige el municipio; 12 px afuera aparece el cuadro del río; nunca salta sola. Pedido de Mariano.
- **Etiquetas azules para ir al río** (segundo ajuste, pedido de Mariano: con el cambio anterior costaba tocar el río): los nombres "Río Paraná", "Río Paraguay" y "Río Bermejo" pasan a ser etiquetas azules con letra blanca y flecha ("Río Paraná ↓"), afuera de la provincia (Paraná abajo a la derecha, Paraguay y Bermejo arriba a la derecha), con zona de toque un poco más grande que la etiqueta. Tocarlas lleva directo a la sección del río. Del tamaño de los nombres de los municipios (la primera versión era más grande; Mariano: "¿no son muy grandes?"). El mapa es un poco más alto (`BASE.h` 496) para que la del Paraná entre debajo del río. La línea que une la etiqueta del Paraguay con el río se alargó. Probado en Chromium como celular: las tres llevan a su sección; los toques sobre el borde siguen abriendo el municipio.

- **Botón "↑ Volver al mapa"** arriba a la derecha en la sección del Paraná y en "Ríos Paraguay y Bermejo" (en esta, debajo de Ocultar, porque el título es el botón que la abre y la cierra). Lleva al mapa. No se imprime. Probado en Chromium como celular: los dos llevan al mapa. Pedido de Mariano.

## 17/10/2026, tarde (`a57ec68`: el rojo por lluvia mira solo 3 días)

- **El rojo por lluvia mira solo hoy y los 2 días siguientes** (antes, los 7 días). El amarillo sigue mirando los 7 días. Motivo: un pronóstico para dentro de 4 días o más cambia mucho; el 17/10 La Leonesa, Colonia Benítez e Isla del Cerrito salían en rojo por lluvia prevista para el 22 y 23/10 (La Leonesa: 115 mm el 23). Con los datos del 17/10 14:40, cuatro municipios pasan de rojo a amarillo por lluvia: La Leonesa, Las Palmas, Colonia Benítez e Isla del Cerrito (en los tres días próximos no se prevé lluvia; lo fuerte es del 21 al 23/10). En el mapa, Colonia Benítez sigue en rojo e Isla del Cerrito en naranja por el Paraná; La Leonesa y Las Palmas quedan en amarillo. Las 6 localidades del semáforo no cambian. Si con los 7 días sería rojo, el detalle agrega "Lo más fuerte llega en más de 3 días: por ahora queda en amarillo, y pasa a rojo si el pronóstico se mantiene cuando se acerque". `sumarLluvia` suma `viene3` y `max3`. Vale para las 6 localidades del semáforo y los 70 municipios. "¿Cómo se decide el color?" lo explica. Huella nueva del código. Pruebas de umbrales y de suma al día (47). Pedido de Mariano.

## 17/10/2026, tarde (`f6d8301`, `cd9e935` y `07b76ad`: amarillo más claro en el mapa, "solo claro" y techos de la costa revisados)

- **Techos de la costa revisados con el texto completo del comunicado del Comité Provincial de Emergencia del 17/10** (el que publicaron los diarios): **Isla del Cerrito pasa de amarillo a naranja** (en la placa de Instagram figuraba en amarillo; en el texto, en naranja) y **Colonia Benítez puede llegar a rojo** (antes, hasta naranja), porque la alerta roja fuera del cordón de defensa incluye San Pedro Pescador y Puerto Antequeras, que son de Colonia Benítez. Cuando las versiones difieren se toma la más alta, para no mostrar menos que lo oficial. El color sigue saliendo solo del INA. Textos debajo del mapa, "¿Cómo se decide el color?" y detalle de Colonia Benítez al día. Huella nueva del código (`sha256-C/Jil5Ja/PDcmBJag4Bf7yJ3GRIyL3uSKujCALbB37Y=`). Prueba de la costa al día (47 pruebas).

- **Pide a los navegadores que no lo oscurezcan solos**: en algunos celulares los colores se veían oscuros por el modo oscuro automático del navegador. Ahora la página declara "solo claro" (`color-scheme: only light`, en el encabezado y en los estilos), que es lo que pide Chrome para no tocarla. Samsung Internet con su modo oscuro prendido puede oscurecerla igual (no da forma de evitarlo). La huella del código no cambia. Prueba nueva dentro de la del naranja (siguen 47). Pedido de Mariano.

- **El amarillo del mapa es más claro** (#f0c419 en lugar de #d99a00) en los municipios, los puntos de las localidades y la muestra de la leyenda: con la transparencia del mapa, el amarillo de antes se veía parecido al naranja. El resto del sitio (letras, bordes, semáforo) sigue con el amarillo de siempre, que se lee mejor sobre blanco. Huella nueva del código. La prueba del naranja controla también el amarillo del mapa (siguen 47). Probado en Chromium con la regla del navegador y los datos del 17/10. Pedido de Mariano.

## 17/10/2026 (`e234741`, `6c0c635` y `d0cc059`: el mapa sigue los colores del comunicado oficial por la crecida del Paraná)

- **Con el renglón del Paraná fuera del verde, más municipios siguen al río hasta un techo**, como en el comunicado oficial del Gobierno del Chaco y del Comité de Emergencia del 17/10 (alerta roja por la crecida del Paraná): **Resistencia, Margarita Belén y Colonia Benítez hasta naranja; Isla del Cerrito, La Leonesa, Las Palmas, Puerto Bermejo, General Vedia y Basail hasta amarillo**. Barranqueras y Puerto Vilelas siguen al río sin techo. Isla del Cerrito antes seguía al río sin techo; Colonia Benítez llegaba solo a amarillo. El color sigue saliendo solo del INA; el sitio no copia el comunicado. Cambia la decisión del 14/10 de no pintar Resistencia (pedido de Mariano).
- Cada uno tiene su aclaración en el detalle (`RIBERA_PISO`: nombre → techo y aclaración): costa fuera de las defensas, bajos cerca del Paraguay (que con el Paraná alto baja más lento), Puerto Bermejo Viejo, la zona rural en Basail. Dice "<color> por el río Paraná (…), no por la lluvia", que las alertas oficiales por la crecida incluyen zonas del municipio y que valen los avisos del Gobierno, del municipio y de Defensa Civil.
- **Sin "no hace falta hacer nada"**: la frase de las defensas (`DEFENSAS`) dice "Dentro de las defensas del Gran Resistencia el agua del río queda afuera: protegen hasta unos 9,50 m. Igual, seguí los avisos oficiales.", y la tarjeta "Crecida del río" empieza con "Si vivís dentro de las defensas, el agua del río queda afuera". En el detalle del naranja de la costa: "El naranja sale de lo que prevé el INA, no de una alerta del SMN".
- **Rojo del Paraná también por pronóstico**: si el río ya pasó la alerta (6,00 m) y el valor más probable del INA llega a la evacuación (6,50 m), el renglón queda en rojo (antes, naranja hasta que el río medido llegara a 6,50 m). Con los datos de hoy (6,08 m; INA 7,23 m para el 20/10) Barranqueras y Puerto Vilelas quedan en rojo, como en el comunicado. "Ahora en el Chaco": "rojo según la altura de hoy y el pronóstico del INA".
- Textos debajo del mapa y en "¿Cómo se decide el color?" al día. Huella nueva del código. Pruebas de la costa y de "Qué hacer" al día (47; la de la costa suma el caso del 17/10). Probado en Chromium con la regla del navegador y los datos del 17/10 12:51: sin rechazos. Pedido de Mariano.

## 16/10/2026, noche (`ae6820e`: Colonia Benítez sigue al Paraná, como mucho en amarillo; desde el 17/10, hasta naranja)

- **Colonia Benítez pasa al menos a amarillo cuando el renglón del Paraná no está en verde** (`RIBERA_PISO` en `colorDe`). Por el río nunca pasa de amarillo; la lluvia o una alerta del SMN sí pueden subirla. Motivo: con la crecida de octubre se inunda su costa (San Pedro Pescador, Antequera) y se corta la ruta provincial 63, pero el pueblo está en zona más alta. Margarita Belén, Fontana y Resistencia siguen sin mirar el río.
- El detalle del municipio dice "Amarillo por el río Paraná (…), no por la lluvia", con el estado del río, que es por la costa (San Pedro Pescador, Antequera y la ruta 63), que el pueblo está en zona más alta y que para caminos cortados y evacuaciones valen los avisos del municipio y de Defensa Civil. Sin la frase de las defensas (Colonia Benítez no está dentro). También se actualizaron el texto debajo del mapa y "¿Cómo se decide el color?".
- Huella nueva del código. La prueba de la costa suma Colonia Benítez (amarillo con el río en naranja o en rojo, la lluvia en rojo gana, río verde no cambia nada, sin lluvia igual pinta; Margarita Belén no cambia). 47 pruebas. Probado en Chromium con la regla del navegador y los datos del 16/10 21:51 (Paraná 6,08 m, INA 7,23 m para el 20/10): Colonia Benítez en amarillo, Margarita Belén y Resistencia en verde, sin rechazos. Pedido de Mariano.

## 16/10/2026 (`5d542a5` y `0c1dccf`: botón "Compartir", imagen nueva y cartel de datos viejos)

- **Botón "Compartir"** en el encabezado, al lado de "Instalar app", con el mismo estilo (borde violeta) y un ícono de tres puntos unidos. En el celular abre el menú de compartir del teléfono (WhatsApp, Facebook, mensajes…); en la computadora muestra "Enviar por WhatsApp" y "Copiar enlace". Comparte la dirección del sitio con una frase corta y tranquila. No manda nada automático. Se ve también en la app instalada; no dentro del portal ni al imprimir.
- **Imagen nueva para las redes** (`compartir.png?v=7`, antes `?v=6` con los colores viejos): fondo lavanda-rosado, franja del degradado, tarjeta blanca con el ícono de la app, título en Kanit, subtítulo y dirección del sitio. La dibuja el guion nuevo `herramientas/compartir.py`. WhatsApp y otras redes pueden tardar en mostrar la nueva en enlaces ya compartidos.
- En iPhone la línea de instalar dice "tocá el botón Compartir de Safari (el cuadrado con la flecha)", para no confundirlo con el botón del sitio.
- **Cartel de datos viejos más corto**: "**Datos del 15/10, 23:52 h.** Todavía no llegaron más nuevos." (antes: "Estás viendo datos guardados. No hay datos más nuevos. Se muestran los de la última copia disponible…"). Con más de 36 horas: "**Atención: estos datos no son de hoy** (son del …). No se usan para el color del semáforo."
- **Sin cartel recién pasada la medianoche**: entre las 00:00 y la corrida siguiente (cerca de la 1) la copia de lluvia de las 23:52 tiene menos de 40 minutos, pero es "de ayer" para contar los días; antes salía el cartel de datos guardados. Ahora, si la copia tiene menos de 2 horas, no aparece (el semáforo se sigue calculando con su día hasta la copia nueva). Lo notó Mariano el 16/10 a las 00:30.
- El contador suma el evento `compartir` (solo cuántas veces se toca el botón). Huella nueva del código. Pruebas nuevas (47): cartel corto y sin cartel a la medianoche; botón en computadora y celular, WhatsApp con la frase y la dirección, copiar enlace, imagen de 1200 × 630 y su número nuevo. Probado con la regla del navegador en Chromium (computadora, Android simulado, iPhone y portal): sin bloqueos. Pedido de Mariano.

## 15/10/2026 (`50db23a`, `a6f0597`, `376983f` y `c03ddf5`: contador de visitas)

- **Cuenta las visitas** con GoatCounter (cuenta de Mariano: riosyclimachaco.goatcounter.com): gratis, código abierto, sin cookies. No se carga su script (la regla del navegador solo deja correr el código propio): la página pide una imagen de 1 píxel con **solo qué se abrió**: el sitio (`/`), la app (`/desde-la-app`) o dentro del portal (`/en-el-portal`), y dos eventos (tocó "Instalar app" y la instaló). Sin título, sin de dónde se llegó y sin tamaño de pantalla: a Mariano le interesan solo los conteos.
- **Privacidad** al día, en una frase: "Cuenta cuántas veces se abre la página con GoatCounter, sin cookies ni datos de quien visita"; GoatCounter también figura en la lista de conexiones. La regla del navegador suma la cuenta solo en `img-src`. Huella nueva. Prueba nueva (45): controla que solo viajen la página y el número al azar. Probado en Chromium con la regla del navegador: los pedidos salen y no hay rechazos. Pedido de Mariano.

## 15/10/2026 (`53920da`: botón "Instalar app")

- **El sitio se puede instalar como app**: queda como un ícono más en la pantalla del celular o de la computadora y se abre a pantalla completa, sin la barra del navegador. Pensado para la gente que no usa favoritos pero sí toca íconos.
- **Ícono nuevo** (elegido por Mariano): degradado violeta-rosa del portal, semáforo a la izquierda, sol detrás de una nube y el río en celeste. También pasa a ser el ícono de la pestaña (`icono.svg`). Los PNG de `iconos/` los dibuja `herramientas/iconos.py`.
- **Botón "Instalar app"** en el encabezado, con el ícono, solo cuando el navegador lo ofrece (Android y computadora, Chrome o Edge). En iPhone y iPad, en su lugar, una línea: "Para tenerlo como app: tocá Compartir y después Agregar a inicio". Nada de esto se ve dentro del portal, al imprimir ni si ya se abrió como app.
- **No guarda el sitio en el celular** (sin *service worker*): la app es la misma página publicada, con los mismos datos y avisos; no manda notificaciones ni pide permisos. Así no puede mostrar datos viejos como si fueran de hoy (la idea de abrir sin señal se había descartado el 14/10).
- Archivo nuevo `manifest.webmanifest` (nombre "Ríos y Clima", colores e íconos) servido con su tipo; la regla del navegador suma `manifest-src 'self'`. Huella nueva del código. Prueba nueva (44): archivo, tamaños de los íconos, regla del navegador, que no haya *service worker* y que el botón aparezca solo con el ofrecimiento del navegador, en iPhone la explicación, y nada si ya es app. Probado en Chromium con la regla del navegador y datos reales: Chrome lo da por instalable, sin errores. Pedido de Mariano.

## 15/10/2026 (`105bab5`, `bb26d5c`, `4d88132` y `9c4bdc2`: siempre claro, como el portal)

- **Sin modo oscuro**: el sitio ya no se vuelve azul marino cuando el celular o la computadora tienen el tema oscuro. Queda siempre claro, como el portal de Gobierno Abierto (que no tiene modo oscuro).
- **Encabezado blanco** con la franja del degradado violeta-rosa arriba y el título en marino (antes, bloque azul). La barra del navegador del celular toma el fondo claro (`theme-color` `#f7f5fa`, antes `#0b3158`).
- **Letras que se leen bien**: texto casi negro `#1d2333` y un poco más grueso (antes azul marino); textos secundarios en gris oscuro `#454c5c`; enlaces en negrita. El marino queda para los títulos y el azul solo para el agua. El semáforo y el mapa no cambian.
- **Botones que resaltan**: todo lo que se toca (botones del mapa, buscador, leyenda, teléfonos, tarjetas de "Qué hacer", "Mostrar todo") lleva borde violeta `--borde-boton` `#a9a3dd`, fondo blanco y sombra suave; los números de los teléfonos van en violeta.
- **Botones con más forma**: fondo blanco que baja a lila, borde violeta, sombra suave y un pequeño salto al tocarlos. Los botones con degradado ("Mostrar", "Qué hacer") llevan un brillo violeta. Teléfonos con un ícono de teléfono en un círculo con el degradado (Defensa Civil y SECHEEP con el ícono a la izquierda). Tarjetas de "¿Qué está pasando?" con el dibujo dentro de un círculo con un tono suave propio de cada situación (lila tormenta, celeste lluvia, agua río, verde cuando baja, durazno calor, hielo frío, gris niebla, rosa mochila), un aro fino del mismo color y un brillo arriba. Botones del mapa, "Mostrar todo" y nombres en verde del semáforo redondeados; buscador redondeado con lupa. Los íconos van dibujados dentro del estilo (no se piden afuera). Con "reducir movimiento" activado en el teléfono, no saltan.
- Solo cambia el estilo: la huella del código sigue igual. La prueba del naranja ahora controla que haya un solo juego de colores y ningún modo oscuro (siguen 43). Pedido de Mariano.

## 15/10/2026 (`95b5543`: aspecto del portal nuevo de Gobierno Abierto)

- **Estilo del portal nuevo** (https://gobiernoabierto.chaco.gob.ar/inicio/, todavía no público; antes se había tomado el portal anterior, en azul): títulos en **Kanit** y texto en **Manrope**, guardadas en `fuentes/` (licencia OFL); azul marino `#0b3158`; encabezado en degradado del marino al violeta con la barrita violeta-rosa debajo del título; botones "Mostrar" y "Qué hacer" con el degradado violeta-rosa del portal; fondo lavanda-rosado muy suave; secciones más redondeadas, con sombra suave; enlaces en violeta.
- El azul queda solo para el agua (ríos del mapa y gráficos del río). Los colores del semáforo y del mapa no cambian. Modo oscuro con los mismos tonos; dentro del portal, siempre claro y con fondo transparente.
- Solo cambia el estilo: la huella del código sigue igual. La prueba de la regla del navegador ahora controla las dos letras (siguen 43). Se quitó la letra Montserrat, que ya no se usa. Pedido de Mariano.

## 15/10/2026 (`97d1d35`: defensas de la ciudad en el gráfico del Paraná)

- **Marca de las defensas**: arriba del gráfico del Paraná, una línea punteada azul con el texto "↑ Defensas de la ciudad: unos 9,50 m, más arriba de lo que muestra el gráfico. No protegen las islas ni la costa de afuera." No estira la escala, así se siguen leyendo bien la alerta (6,00 m) y la evacuación (6,50 m).
- Si el río o el valor más alto del pronóstico del INA llegan a 8 m, las defensas pasan a ser una línea dentro del gráfico (la escala se estira hasta 9,80 m) con su renglón en la leyenda.
- Dato aproximado (estudio de la UNNE), como ya decía el sitio. No cambia colores ni reglas. Huella nueva del código. La prueba del río controla los dos casos (sigue en 43). Pedido de Mariano.

## 15/10/2026 (`1385213`: informar sin alarmar)

- **Tranquilidad junto al aviso del río**: cuando el Paraná sale del verde, "Ahora en el Chaco", el renglón del semáforo y el detalle de los municipios de la costa dicen "Dentro de las defensas del Gran Resistencia no hace falta hacer nada: protegen hasta unos 9,50 m". Antes estaba solo dentro de la sección del río.
- **Detalle de Barranqueras y Puerto Vilelas**: con el color del río dice "Costa del Paraná" y aclara que por la lluvia comparten el semáforo del Gran Resistencia y en qué color está (antes decía "Gran Resistencia · Naranja" con Resistencia en verde).
- **Ícono de los ríos**: los renglones de los ríos fuera del verde llevan ≈ en lugar de "!!".
- **Tarjetas separadas**: "Lluvia fuerte" y "Crecida del río" (nueva, 🌊). El Paraná y el Paraguay llevan a la del río, que empieza diciendo que dentro de las defensas no hace falta hacer nada. Nueve tarjetas; la mochila va a lo ancho.
- **Cartel "Este sitio es informativo"** en azul, no en amarillo (el amarillo es un color del semáforo).
- **El Niño**: agrega que es una tendencia de la temporada, no un aviso; lo que vale día a día son las alertas del SMN.
- **Privacidad al día**: el navegador se conecta a GitHub (copias de los datos), a Google solo si las copias están atrasadas, y a la NASA para las imágenes; no al SMN, INA, Open-Meteo ni NOAA.
- No cambian colores ni reglas. Huella nueva del código. Prueba de "Qué hacer" ampliada (sigue en 43). Pedido de Mariano, a partir de la revisión del sitio con el Paraná en naranja.

## 15/10/2026 (`766bebc` y `53e41d9`: textos de "Qué hacer" pensados para la gente de la costa y los barrios; teléfonos)

- **Redacción más cercana**: palabras de todos los días (salita, garrafa, frazada, plata, abuelos), ejemplos que la gente tiene en la casa y situaciones del Chaco: moto y bici, pesca y canoa, chicos jugando en zanjas, animales (gallinas, chanchos, caballos), pozo ciego o letrina, tereré, quema de basura y pastizales, audios de WhatsApp sin origen. Cables caídos: avisar a SECHEEP o al municipio.
- **Mochila**: sin chocolate (se derrite con el calor); comida que no se echa a perder (galletitas, pan, latas de picadillo o atún, abrelatas), DNI y libreta de vacunas en bolsa de nylon, teléfonos anotados en papel, muda de ropa y frazada, pañales y leche si hay bebé. Sigue con 12 cosas y lo ya tildado se conserva.
- **Agua segura sin comprar agua envasada**: hervirla 3 minutos o 2 gotas de lavandina por litro y esperar media hora (Ministerio de Salud). **Brasero**: nunca dormir con él adentro; prenderlo y apagarlo afuera. Después del agua: no andar descalzo en el barro; ratas y víboras.
- **Teléfonos**: el botón de Defensa Civil llama solo al (0362) 444-8000 y el texto dice "Cuando atiendan, pedí el interno 103" (con el interno dentro del enlace, la llamada no salía). Nuevo botón **SECHEEP 0800-7777-589** (cortes de luz y cables caídos), también en el consejo de cables caídos. Datos de Mariano.
- Los tres colores del SMN, con qué hacer concreto en el naranja (preparar la mochila, guardar lo que se vuele, escuchar la radio o al municipio). No cambia colores, reglas ni código (la huella sigue igual). Pedido de Mariano.

## 15/10/2026 (`b077390`: "Qué hacer ante una alerta", más legible e interactiva)

- **"Ahora en el Chaco"**: arriba de la sección, una franja dice qué rige (alertas del SMN de hoy en adelante, con día y cantidad de municipios; Paraná o Paraguay fuera del verde) y cada renglón tiene un botón "Qué hacer" que abre la tarjeta que corresponde. Sin nada vigente y con el informe del SMN al día: "Hoy no hay alertas del SMN para el Chaco". Si el informe está viejo o el canal no listó alertas, no dice que no hay: avisa que no se pudo confirmar. El naranja del Paraná dice "según el pronóstico del INA", nunca "alerta naranja". Usa los datos que la página ya tiene (`hacerHoy`, `pintarHacer`); no pide nada nuevo.
- **Tarjetas por situación con ícono** (se abre una por vez): Tormenta y rayos; Viento fuerte y granizo; Lluvia fuerte y crecida del río; Cuando baja el agua; y nuevas: **Calor extremo, Frío extremo, Niebla, humo o polvo** (el sitio ya mostraba esas alertas del SMN pero no decía qué hacer) y **Mochila y plan familiar**. La tarjeta de lo que rige queda marcada ("Alerta naranja", "Río naranja") y la más grave se abre sola una vez. (Desde el 19/10/2026 ya no se abre sola.) Cada consejo empieza con la idea clave en negrita.
- **Mochila para tildar** (12 cosas, según el kit del SINAGIR): lo tildado queda solo en ese navegador (`anc-mochila`).
- **Teléfonos como botones** que llaman al tocarlos: 911, 100, 107 y Defensa Civil (0362) 444-8000, interno 103.
- Los tres colores del SMN, como tarjetas con su color. Al imprimir se ven todas las tarjetas abiertas.
- Fuentes nuevas: SINAGIR (ola de calor, ola polar, niebla, kit de emergencias, plan familiar) y Ministerio de Salud (humo). Prueba nueva (43 en total). Pedido de Mariano.

## 15/10/2026 (`40552f6`: aspecto del portal)

- **Se puede mostrar dentro del portal de Gobierno Abierto del Chaco**: antes el sitio no dejaba que ninguna página lo mostrara en un marco (`X-Frame-Options: DENY`, `frame-ancestors 'none'`). Ahora lo permite solo a gobiernoabierto.chaco.gob.ar (y a sí mismo).
- **Aspecto alineado con el portal**: encabezado azul marino con los triángulos celeste y violeta del logo de Gobierno Abierto; títulos en Montserrat (la letra del portal, guardada en el sitio: no se pide a Google); azul y grises del portal; secciones con una sombra suave. Los colores del semáforo y del mapa no cambian. El modo oscuro sigue fuera del portal, con los mismos tonos.
- Regla del navegador: `font-src 'self'`. Prueba de la regla ampliada (sigue en 42).

## 15/10/2026 (`2d086f1`)

- **Textos más calmos en "Qué hacer ante una alerta"**: los tres colores ya no citan textual al SMN ("peligrosos para la sociedad, la vida, los bienes y el ambiente", "emergencias o desastres"); lo dicen con palabras simples y sin comillas, subiendo de a un escalón (algunos daños o cortes por un rato → daños → daños importantes), con qué hacer en cada caso. El rojo sigue siendo serio. Debajo, enlace a las definiciones completas en el sitio del SMN. Pedido de Mariano: no alarmar. No cambia colores ni reglas.
- **Desplegables más visibles**: el botón "Mostrar" de las secciones cerradas es más grande y va relleno de celeste (abierta, "Ocultar" con borde). Con la sección cerrada se ve el comienzo de lo que hay adentro, que se va desvaneciendo, y debajo "Mostrar todo"; tocar en cualquier parte de la sección la abre. Siguen empezando cerradas y, cerradas, no bajan las imágenes del Pacífico ni del satélite. Al imprimir se ve todo. Pedido de Mariano.

## 14/10/2026 (`8851810`: seguridad y muchas visitas)

- **La página ya no consulta las fuentes**: lee primero una copia en GitHub (`servidor.json`, rama `datos`) que arma el robot cada hora con la respuesta del script de Google. El script queda de respaldo, solo si esa copia falta o tiene más de 2 horas. Si los datos son viejos se muestran con su hora y los avisos de siempre, en lugar de pedirle los ríos, los pronósticos y Yacyretá al INA desde cada navegador. Con muchas visitas a la vez, ni el INA ni el script de Google reciben un pedido por cada visita.
- **El script lanza el robot al final de la corrida**, para que la copia salga con lo recién leído; si GitHub rechaza la clave, solo publica el número de error.
- **Regla del navegador** (`Content-Security-Policy`): solo corre el código de la página y solo se conecta a GitHub, Google y la NASA. `Permissions-Policy` apaga cámara, micrófono, ubicación y pagos. `herramientas/csp.js` actualiza la huella del código.
- Tareas de GitHub fijadas por huella; `pruebas.yml` solo lee. Se quitó de la página el código que consultaba al INA. 42 pruebas (antes 37).

## 14/10/2026 (`d1f9034`)

- **El mapa pinta la costa del Paraná con el color del río**: Barranqueras, Puerto Vilelas e Isla del Cerrito toman el color más alto entre su lluvia (con el piso del SMN) y el renglón "Zona ribereña del Paraná". Con el pronóstico del INA de hoy (7,30 m para el 20/10) quedan en naranja. Si el río pasa los 6,50 m, en rojo. Fontana y Resistencia siguen solo con la lluvia (están dentro de las defensas). La leyenda suma "Naranja: solo en la costa del Paraná, cuando el pronóstico del INA prevé pasar el nivel de evacuación. No es una alerta del SMN"; el detalle del municipio explica por qué tiene ese color, y "¿Cómo se decide el color?" lo cuenta. Pedido de Mariano. Prueba nueva (37 en total).

## 13/10/2026 (`97fa6b2`)

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
