# Historial de cambios

Lo más nuevo va arriba. Cada renglón es una subida a `main`.

## 13/11/2026 (Limpieza antes de producción)

Pedido de Mariano: sacar todo lo que no hace falta.
- **Cartel del SMN de arriba, fuera del todo** (estaba escondido desde el 13/11 y su código seguía corriendo para darle el nivel y el día al menú lateral). Fuera `#smnBanda`, `pintarBanda`, `ordenBandas` y sus estilos. El menú lateral ahora lee `SMN_LADO` (`resumenSmn`). La sección "Alertas oficiales del SMN" y la franja del río no cambian. Probado en la nube con datos reales (1366 y 390 px): "Alerta naranja · mañana" y "En rojo · 6,59 m" en el menú, sin errores.
- **Este historial, más corto**: octubre queda en un renglón por subida (el detalle está en git).
- En la carpeta de Mariano (no se publica): fuera los 6 `.tar` y los parches de `privado/`, los shortcodes viejos 1.1 y 1.2 y las ramas locales `avisos` y `respaldo-12-11`.
- 93 pruebas. Huella nueva del código.

## 13/11/2026 (Revisión antes de pasar a producción en Google Play)

Revisión completa de seguridad, lógica y redacción. No aparecieron fallas graves; se ajustaron detalles:
- **Seguridad, por las dudas**: `esc()` ahora también escapa `>` y `'`. `FORMA.puertos` y `FORMA.localidades` controlan todos los campos (río y nombre como texto, situación 0 a 2 o vacía, cambio en 24 h como número o vacío): un dato con otra forma se descarta en lugar de dibujarse. Probado con el `servidor.json` real (25 estaciones, 13 localidades).
- **Política de privacidad**: los avisos ya no figuran como "en prueba: solo los ven quienes prueban la app" sino "por ahora se ofrecen solo en la app de Google Play" (vale para la prueba cerrada y para producción).
- **Redacción**: "Que nadie se bañe ahí"; "un punto cada 10 km, más o menos"; la descripción de la página (la que muestran Google y WhatsApp) dice "alertas oficiales por municipio" en lugar de "riesgo por municipio".
- Revisado sin cambios: cabeceras de `netlify.toml`, `avisos-sw.js`, los robots, los flujos de GitHub, el script de Google (no cambió: no hay que volver a pegarlo), enlaces con `rel="noopener"`, historial del repositorio sin claves ni direcciones internas. 93 pruebas. Huella nueva del código.

## 13/11/2026 (Lluvia hora por hora: tu localidad y los 70 municipios)

Pedido de Mariano: más información de las localidades y que la elección sea automática, según la localidad elegida como tuya.
- **Elección automática**: "Lluvia en" muestra tu localidad (`autoLoc()` = `miLocGuardada()`); sin localidad, "Todo el Chaco". Si se elige otra a mano (lista o puntos del mapa, `A.aMano`), queda esa en la visita. Al elegir otra localidad como tuya, la sección pasa a mostrarla.
- **Los 70 municipios** en la lista, por nombre (antes 6 ciudades). `A.loc` es el número del municipio (`lugA(i)`: el punto de la ciudad si está entre las 6 del mapa; si no, el centro del municipio). Si no es una de las 6, el mapa lo marca con su punto y su nombre (`#aMarca`).
- **Más información**: la frase de la localidad suma cuánto llueve en total de acá a mañana a la noche ("En total, unos 21 mm…"). Con "Todo el Chaco", en cuántos municipios se espera lluvia y dónde y cuándo lo más fuerte (`resumenChaco`).
- **La barra va a la primera hora con lluvia** (`irPrimera`, pedido de Mariano): al abrir la sección o cuando cambia la elección automática, si ahora no llueve en la localidad elegida (o en ningún municipio, con "Todo el Chaco"), la barra salta a la primera hora con lluvia prevista de acá en adelante; si ya llueve o no se espera nada, queda en "ahora". Elegir a mano sigue llevando a la hora más fuerte.
- Probado en la nube con datos reales (390 px): con Barranqueras, sin localidad, cambiando tu localidad desde la portada y eligiendo a mano. Sin errores. 93 pruebas. Huella nueva del código.

## 13/11/2026 (tu localidad abre su tarjeta)

Pedido de Mariano: al tocar el recuadro de tu localidad en la portada del celular, ver la tarjeta de la localidad y no el mapa.
- El recuadro grande (`data-pver`) elige la localidad y baja a su tarjeta (`verSec($('mInfo')||$('t-mapa'))`), como al tocar un aviso. "Cambiar" sigue igual.
- Probado en la nube con datos reales (390 px): la tarjeta queda arriba de todo, entera. 93 pruebas. Huella nueva del código.

## 13/11/2026 (script: pluviómetros que no llegaban y errores sin direcciones)

Revisión antes de subir: `servidor.json` de las 13:51 no traía `pluvio`, y en `errores` figuraba la dirección interna del pedido que falló.
- **Pluviómetros**: la primera vez se piden 40 días (uno por pedido). Un solo día que no respondía ("Address unavailable") tiraba los 40. Ahora `leerExtras` usa los días que respondieron (`normPluvio` salta los que faltan) y anota "N de M pedidos sin respuesta". Solo falla si no responde ninguno.
- **Errores sin direcciones** (`sinDirecciones`): `servidor.json` es público y las direcciones de los datos oficiales no se publican (decisión del 13/11). Los errores cambian cualquier dirección por "(dirección)".
- Pruebas nuevas para los dos casos (93). Hay que pegar el script en script.google.com (SHA-256 nuevo).

## 13/11/2026 (portada: tu localidad en dos botones y criterio de las alertas)

Pedidos de Mariano: separar "ver en el mapa" de "cambiar la localidad", y poder cambiar entre Monitoreo del Niño y Servicio Meteorológico desde la portada.
- **Tu localidad, en dos botones** (celular, con localidad guardada; `.pLocFila`): el recuadro grande lleva directo a la localidad en el mapa (`data-pver`); al lado, "Cambiar" (`data-pcambiar`, ícono de flechas) abre la lista. Si se pueden pedir avisos, abre la ventana completa (avisos y "Elegir otra localidad"). Sin localidad guardada sigue "¿Dónde vivís? · Elegir". El nombre usa todo el ancho y debajo van el nivel y la lluvia de hoy. Después de elegir desde la lista, en el celular la ventana se cierra (el recuadro ya lleva al mapa); en la computadora vuelve a abrirse con "Ver … en el mapa".
- **Criterio de las alertas en la portada** (`pModo`, `.pModo`, `data-pmodo`): debajo de tu localidad, "Monitoreo del Niño | Serv. Meteorológico", como los botones del mapa pero más bajo. Toca el botón del mapa (misma lógica; se recuerda en `anc-modo-mapa`) y cambia el nivel de tu localidad, el recuadro del Mapa y el mapa. No aparece si nunca se pudo leer el Monitoreo (cálculo de antes).
- El último recuadro que llena su renglón se cuenta solo entre los recuadros de sección (`a.pT:last-of-type:nth-of-type(3n+1)` a lo ancho, `3n+2` de a dos).
- Probado en la nube con datos reales a 390 y 320 px (letra grande, "Presidencia Roque Sáenz Peña") y sin localidad; con avisos de prueba, "Cambiar" abre la ventana completa. Sin errores. 93 pruebas. Huella nueva del código.

## 13/11/2026 ("Ver … en el mapa" de tu localidad, arreglado)

Aviso de Mariano: "desapareció el botón que lleva al mapa".
- **Falla**: desde `a75634c`, el segundo parámetro de `abrirLoc` se llamaba `elegir` y tapaba la función `elegir()`. Al tocar "Ver … en el mapa" en la ventana "Tu localidad" daba error ("elegir is not a function"): la ventana se cerraba y no iba al mapa. Ahora el parámetro se llama `enLista`, y una prueba controla que no vuelva a pasar.
- **Después de elegir o cambiar la localidad** desde la lista ("Elegir", "Elegir mi localidad", "Cambiar"), la ventana vuelve a abrirse con "Ver … en el mapa" (y los avisos, si corresponde). Antes se cerraba y el botón no aparecía.
- Probado en la nube con datos reales a 390 y 1366 px: elegir, ver en el mapa, el renglón de la computadora y "Cambiar", sin errores. 93 pruebas. Huella nueva del código.

## 13/11/2026 (portada del celular más baja)

Pedido de Mariano: que las secciones de arriba se ajusten mejor en el celular.
- Los renglones de la portada ya no toman todos el alto del más alto (`grid-auto-rows:1fr` → `auto`). Los recuadros de a 3 siguen parejos con un alto mínimo que alcanza para un nombre en 2 renglones; "Tu localidad" y "Datos y Acerca" (a lo ancho) toman solo lo que necesitan. "Datos y Acerca" queda en un renglón: ícono, nombre y "Fuentes" a la derecha.
- Menos espacio entre los bloques en el celular (`.wrap`, 12 px).
- Nombre largo de tu localidad en pantallas angostas: letra un poco menor y corte con guion ("Presiden-cia"), no en cualquier letra.
- Resultado a 390 px: la portada termina en 726 px (antes 829); entra entera en la primera pantalla de un celular común. Computadora sin cambios. 93 pruebas; misma huella.

## 13/11/2026 (tu localidad primera y a lo ancho en el celular)

Pedido de Mariano: que en el celular la localidad elegida se vea más.
- En la portada, el recuadro de tu localidad va primero y ocupa todo el ancho (`.pLoc`): ícono más grande, "Tu localidad", el nombre en grande y, a la derecha, el nivel en palabras con un punto de color ("Sin alerta", "Alerta amarilla", "Alerta naranja", "Alerta roja"; sigue el botón elegido del mapa) y la lluvia de hoy. Con alerta, el recuadro toma su color como antes.
- Sin localidad: "Tu localidad · ¿Dónde vivís? · Elegir", con borde punteado.
- Los otros 10 recuadros van de a 3; el último ("Datos y Acerca") ocupa el renglón entero.
- Pruebas al día (93). Huella nueva del código.

## 13/11/2026 ("Acerca de este sitio" y política de privacidad al día)

Pedido de Mariano: revisar "Acerca de" con los cambios nuevos y redactar bien la privacidad.
- **"Acerca de este sitio"**: dice qué es en una frase y nombra las fuentes de hoy (primero el Centro de Monitoreo del Gobierno del Chaco, con enlace; también Prefectura y Yacyretá, que faltaban). "No es un sitio oficial" con su propio renglón: iniciativa ciudadana, sin fines comerciales, no reemplaza al SMN ni a Defensa Civil. La privacidad pasa de un párrafo largo a tres puntos (cookies y contador, lo que se guarda en el dispositivo, a qué se conecta) y suma la mochila, que faltaba.
- **`privacidad.html`** (fecha nueva): secciones nuevas "Si escribís" (el correo o el usuario de GitHub, solo para responder; no se guardan), "Tus derechos" (Ley 25.326: saber, corregir y borrar; como no se guardan datos personales, casi todo lo maneja cada uno; reclamo ante la Agencia de Acceso a la Información Pública) y "Responsable y contacto". Suma los desplegables y la marca de prueba de los avisos entre lo que se guarda, que los avisos están en prueba, que los servidores de los servicios pueden estar fuera de la Argentina y que dentro del portal la página que rodea al sitio es del Gobierno. "Chicos y chicas" pasa a "Menores de edad"; la ✕ de "Tu localidad" está en su renglón, arriba del mapa.
- Pruebas al día (93). El código de la página no cambia (misma huella).

## 13/11/2026 (elegir tu localidad, a la vista)

Pedido de Mariano: "elegir mi localidad queda escondida".
- **Computadora y tablet**: el renglón de tu localidad está siempre arriba del mapa. Sin localidad guardada: "📍 ¿Dónde vivís? Elegí tu localidad y la vas a tener a mano cada vez que entres." con el botón "Elegir mi localidad". Con localidad: suma "Cambiar". Antes, sin localidad guardada no había nada a la vista (solo el botón al final de la tarjeta del municipio). Al olvidarla (✕) vuelve la invitación.
- **Celular**: sin localidad guardada, el recuadro de la portada dice "Tu localidad · Elegir" con borde punteado (antes mostraba "Resistencia" y parecía un dato más).
- "Elegir", "Elegir mi localidad" y "Cambiar" abren la ventana directo en la lista con buscador ("Elegí tu localidad" o "Cambiar tu localidad"). Al elegir, se actualizan el renglón, la portada y la tarjeta abierta.
- Fuera `MILOC` (el renglón ya no se esconde en la visita sin localidad). Pruebas al día (93). Huella nueva del código.

## 13/11/2026 (lluvia medida en pluviómetros y cita del Centro de Monitoreo)

Pedido de Mariano: usar las estaciones del tablero del Monitoreo del Niño y citar la fuente (con permiso).
- **Script de Google**: lee los pluviómetros oficiales, los últimos 7 días (`normPluvio`; dirección en la propiedad `FUENTE_PLUVIOMETROS`). `leerExtras` acepta fuentes con varias direcciones. `diagnosticoDatos` muestra también `oficial`, `puertos`, `localidades` y `pluvio`. **Pegado en script.google.com el 13/11 (SHA-256 igual al del repositorio) y propiedad cargada.**
- **Tarjeta del municipio**: si el municipio tiene pluviómetro, "Lluvia medida en el pluviómetro de …: N mm en los últimos 7 días (… mm el …)" o "sin lluvia registrada en los últimos 7 días", en lugar de la estimación y de la estación automática. Sin pluviómetro, sigue como antes.
- **Cita de la fuente**: "Centro de Monitoreo del Gobierno del Chaco", con enlace al tablero, en "¿De dónde sale?" (Municipios con alerta oficial), en "De dónde salen los datos" (alerta por municipio, localidades, estaciones de los ríos, lectura por hora del Paraná y pluviómetros) y al pie de la tarjeta.
- `herramientas/csp.js`: ya no da error cuando la huella está al día.
- Pruebas al día (93). Huella nueva del código.

## 13/11/2026 (tarjeta del municipio más simple)

Pedido de Mariano: quitar "¿A qué hora llueve?" de la tarjeta y revisar el texto de "Seguir leyendo".
- Fuera el enlace "¿A qué hora llueve? ↓" (`a.aHora`, `data-hora` y su manejo). "Lluvia hora por hora" sigue en el menú y en la portada.
- "Seguir leyendo" en otro orden: primero lo oficial (con el Monitoreo del Niño elegido, su alerta va arriba de todo), después el SMN con su horario, la lluvia, la lluvia medida y al final de dónde sale el pronóstico.
- Lluvia: solo lo que cayó ("llovieron 11 mm en los últimos 7 días (estimado)"); sin "se esperan … (… mm en la semana)", que repetía las tarjetas de los días y hablaba de 7 días para adelante.
- "Sin alerta en el Monitoreo del Niño (consultado el …)" pasa a "(última lectura: …)", como en el resto del sitio.
- Estación de lluvia: "Es una estación automática: el dato puede tener errores y no cambia el color." (antes "Red Hidrológica Nacional, vía INA: dato sin revisar").
- Sin la superficie del municipio.
- Pruebas al día (92). Huella nueva del código.

## 13/11/2026 (sin la sección de Lluvias y sitio reacomodado)

Pedido de Mariano: quitar la sección "Lluvias: últimos 7 días y pronóstico a 7 días" y reacomodar el sitio.
- Fuera la sección (tabla de las 6 localidades y gráfico día por día), su renglón en el menú lateral y en el índice de arriba ("Lluvias"), y el recuadro "Lluvia prevista" de la portada del celular. Fuera el código y los estilos que solo usaba ella (`pintarLluvia`, `grafLluvia`, `pintarGrafLluvia`, `LLU_SEL`, `lluviaAtraso`, `pLluvia`, `.ll*`, `td.barras`).
- La lluvia de `lluvia.json` se sigue leyendo: la usan la tarjeta de cada municipio, el recuadro de tu localidad, la hora de los datos de la portada y el cálculo de antes. El cartel de datos viejos de arriba sigue avisando si la lluvia queda sin renovar.
- Portada del celular: 11 recuadros; el último ("Datos y Acerca") ocupa los dos lugares que quedan en su renglón.
- Computadora: "Ríos Paraguay y Bermejo" va a lo ancho, debajo del Paraná (`data-ancha`); de a dos, "Lluvia hora por hora" con "El Niño" y "De dónde salen los datos" con "Acerca".
- "De dónde salen los datos": el renglón "Lluvias" pasa a "Lluvia prevista (tarjeta de cada municipio y portada del celular)".
- Pruebas al día (92). Huella nueva del código.

## 13/11/2026 (sección, mapa y localidades dicen lo mismo)

Decisión de Mariano, después de revisar con los datos del 13/11 (la sección y el mapa coinciden: 3 rojo, 3 naranja, 6 amarillo; las 13 localidades caen dentro de su municipio):
- Tocar un nombre de "Municipios con alerta oficial" vuelve el mapa a "Monitoreo del Niño" si había quedado en "Servicio Meteorológico" (solo si hay dato del Monitoreo). Antes, Colonia Benítez figuraba naranja en la lista y amarilla en el mapa.
- Tarjeta del municipio: si alguna localidad tiene un nivel más alto que su municipio, la frase "El nivel de cada localidad puede ser distinto del de su municipio: salen de informes distintos." (`.mLocN`). Hoy: Colonia Benítez (Puerto Antequeras en rojo).
- "Localidades con alerta" suma también las de municipios sin alerta en el Monitoreo, después de las demás y por nombre.
- Pruebas al día (92). Huella nueva del código.

## 13/11/2026 ("Municipios con alerta oficial" más corta y municipios del SMN que se tocan)

Pedido de Mariano: la sección ocupaba casi tres pantallas en el celular (una tarjeta por municipio, cada una con "Ver en el mapa"), y lo único que no estaba en otro lado eran las localidades con alerta.
- Un renglón por nivel (rojo, naranja, amarillo) con borde y fondo del color, la cantidad y los nombres de los municipios (`.sGr`); cada nombre se toca para verlo en el mapa (`.sMun`, mismo `data-m` de antes). Sin los 12 botones "Ver en el mapa". En pantallas de hasta 480 px el nivel va en su propio renglón; los separadores no quedan al comienzo de un renglón (`.sIt`).
- Debajo, cuántos municipios no tienen alerta y la última lectura, como antes.
- **Localidades con alerta** en un desplegable cerrado (`#d-sem-loc`, `semLoc`; recordado como los demás y abierto al imprimir), agrupadas por municipio, con un punto del color de cada una (el nivel también se lee con lector de pantalla), la fecha del informe y la aclaración: "El nivel de cada localidad puede ser distinto del de su municipio: salen de informes distintos." Siguen también en la tarjeta del municipio.
- Con los datos del 13/11: de unos 1.700 px a unos 570 px a 390 px de ancho (con el título y "¿De dónde sale?").
- **Alertas oficiales del SMN**, igual de uso: en "Ver horarios y municipios", cada municipio se toca (`smnNombres`, `data-ms`, subrayado del color de la alerta) y lleva al mapa con su tarjeta abierta; si el mapa estaba en "Monitoreo del Niño", pasa a "Servicio Meteorológico" (como tocar el botón, queda recordado) para que el color coincida con la alerta que se estaba mirando. La sección no cambia de tamaño.
- El semáforo de antes (sin el Monitoreo) no cambia. Prueba al día (92 pruebas). Huella nueva del código.

## 13/11/2026 (portada del celular como botonera)

Pedido de Mariano: "Actualizar" ocupaba un renglón entero del encabezado, "El Chaco hoy" no parecía una botonera y los recuadros parecían etiquetas.
- "Actualizar" (solo en la app) pasa, en el celular, a un botoncito redondo junto a "Datos de las … h" (`.pRef`, gira mientras actualiza); en la tablet sigue en el encabezado. El encabezado queda con Compartir y Letra en un renglón. Función nueva `esApp()`.
- El título de la portada pasa de "El Chaco hoy" a **"Ir a…"** (pedido de Mariano: así no hace falta aclarar que se toca); el botón de la esquina pasa de "↑ Índice" a **"↑ Ir a…"**, igual que el título al que lleva.
- Recuadros: flechita arriba a la derecha, borde de abajo tipo tecla que se hunde al tocar, más sombra, nombre en azul oscuro y dato en violeta, ícono en un cuadradito de color lleno (violeta; celeste en los ríos; amarillo, naranja o rojo con alerta). Mismo tamaño: la portada no crece.
- Prueba al día. Huella nueva del código.

## 13/11/2026 ("Municipios con alerta oficial")

Decisión de Mariano: la sección "Riesgo por localidad" pasa a ser la lista del Monitoreo del Niño y deja de depender del botón del mapa (las alertas del SMN ya tienen su sección más arriba, con cuántos municipios y cuáles).
- Título **"Municipios con alerta oficial"**; en el índice, el menú lateral y la portada, "Con alerta oficial".
- Siempre los municipios con alerta en el Monitoreo, del nivel más alto al más bajo, con sus localidades con alerta y "Ver en el mapa"; al final, cuántos no tienen y cuándo se consultó (`semOfi`, reemplaza a `semModo`). Ya no muestra las 6 ciudades con el SMN.
- Sin el dato del Monitoreo de menos de 24 horas: un renglón gris que lo avisa y, debajo, el semáforo de antes de las 6 ciudades con los ríos (clase `semCalc` en `#secSem`). La portada, en ese caso, vuelve a "Riesgo en 6 ciudades".
- Portada: "Con alerta oficial: 12 de 70" con el color más alto, elija lo que elija el mapa.
- "¿Cómo se decide el color?" pasa a "¿De dónde sale?", con una frase; la tabla de colores queda solo para el semáforo de antes (`.sOfi`, `.sCalc`).
- **Monitoreo sin renovar** (decisión de Mariano): el mapa sigue con la última lectura del Monitoreo del Niño aunque tenga más de 24 horas (`ofiDatos` sin tope de tiempo; el script de Google ya guarda el último dato bueno con su hora). Debajo de los botones y al final de la sección: "Última lectura: <fecha y hora>" (antes "Consultado el"). El cálculo de antes queda solo si nunca se pudo leer el Monitoreo, con textos sin "como antes" ("No se pudo leer el Monitoreo del Niño…", "el color lo calcula este sitio"). "De dónde salen los datos" al día.
- **Localidades con alerta**: también con la última lectura aunque tenga días, con la fecha del informe (`locDatos` sin tope de tiempo); solo se dejan de mostrar si la fuente dice que el informe no está vigente.
- **Sin el cartel del SMN de arriba** (decisión de Mariano): la alerta ya está en la portada del celular, el menú lateral, el botón "Servicio Meteorológico" del mapa, la tarjeta de cada municipio y la sección "Alertas oficiales del SMN". `#smnBanda` se sigue armando (oculto) porque el menú lateral toma de ahí el nivel y el día. La franja del río sigue igual; en la computadora va a todo lo ancho.
- **Textos repetidos o viejos** (revisión de redacción del 13/11): debajo del mapa queda una sola frase de "Tocá un municipio…"; en el Paraná, el pronóstico sin una segunda "Última actualización"; franjas del SMN en palabras ("a la mañana y a la tarde", `frTxt`; antes "mañana, tarde", que se confundía con el día siguiente); portada "Lluvia prevista: Hasta 150 mm" (antes "Lluvias, 7 días: 150 mm", que se leía como caído); "De dónde salen los datos" al día con el Monitoreo del Niño (la lluvia no da color, el pronóstico del Paraná no cambia el mapa, el Monitoreo sigue con su última lectura) y sin la frase suelta del mapa; sin jerga ("renglón del Paraguay", "Localidad del semáforo" → "Lluvia y alertas del SMN", "serie diaria vía INA"); "Tocá el gráfico" sin "pasá el mouse"; tabla de Lluvias con "Por día" (no se corta a 390 px).
- Sin justificar en columnas angostas (renglones de las listas, municipios del SMN, consejos de "Qué hacer", Lluvia hora por hora) y, al saltar a una sección, el título con 14 px de aire arriba (`scroll-margin-top`).
- Mapa: "¿Qué significa cada color?" solo aparece con el cálculo de antes (`details.vCalc`). Con el Monitoreo o el SMN el color es el nivel oficial tal cual y la frase debajo de los botones ya lo dice; se sacan las listas de cada modo.
- Prueba al día (92 pruebas). Huella nueva del código.

## 13/11/2026 (mapa: Monitoreo del Niño o Servicio Meteorológico)

Decisión de Mariano: el mapa muestra solo criterios oficiales, sin cálculo propio, y se elige cuál.
- Arriba del mapa, dos botones: **Monitoreo del Niño** (de entrada) y **Servicio Meteorológico** (`.modo`, `MODO`, `iniciarModo`, `pintarModo`). La elección queda guardada en el dispositivo (`anc-modo-mapa`).
- Cada botón es una tarjetita con su ícono (en la computadora) y, en chico, cuántos municipios tienen alerta con ese criterio, con un punto del color más alto (`mEstNino`, `mEstSmn`): con el Monitoreo elegido se ve igual que hay alerta del SMN, sin sumar otro cartel. En el celular van centrados, sin ícono, del mismo alto. Frase de abajo más corta.
- Monitoreo del Niño: cada municipio toma el nivel de alerta que informa el Monitoreo (`ofiNivel`); ni la lluvia ni el SMN cambian el color. Servicio Meteorológico: la alerta más alta del SMN para hoy y los 2 días siguientes (`pisoSMN`); sin informe confirmado, gris. La lluvia de Open-Meteo ya no da color en ninguno de los dos.
- Si el dato del Monitoreo lleva más de 24 horas sin renovarse, vuelve el cálculo de antes (`colorCalc`: lluvia, SMN y, en la costa, el Paraná) con un aviso debajo de los botones.
- "Riesgo por localidad" según el modo (`semModo`): con el Monitoreo, los municipios con alerta (del nivel más alto al más bajo, con sus localidades con alerta) y cuántos no tienen; con el SMN, las 6 ciudades con el fenómeno, el día y el horario.
- Tarjeta del municipio: arriba el criterio del mapa y después el otro (sin el cuadrito de la lluvia); "Seguir leyendo" con el criterio, la alerta del SMN y la lluvia como información. Portada: "Riesgo por localidad" con cuántos municipios tienen alerta en el Monitoreo; con el SMN, las luces de las 6 ciudades. Los puntos de las 6 ciudades toman el color de su municipio. El borde punteado del SMN no va con el Monitoreo.
- Textos por modo (clases `vNino`, `vSmn`, `vCalc` y `m-…` en `<html>`): "¿Qué significa cada color?" y "¿Cómo se decide el color?". Debajo del mapa: "Lluvia de cada municipio: Open-Meteo" (antes "Fuente: Open-Meteo", que se leía como la fuente del color).
- Privacidad (frase y `privacidad.html`) al día. Prueba nueva de los dos modos (92 pruebas). Huella nueva del código. Los avisos al celular no cambian (solo alertas del SMN).

## 12/11/2026 (tarjeta del municipio más corta)

Pedido de Mariano: la tarjeta quedaba muy larga (Resistencia, con alerta del SMN y alerta oficial). En el celular baja de unos 780 a unos 550 px.
- La alerta del SMN se dice una vez arriba: el cuadrito "Alerta del SMN" lleva el nivel, el ícono y el día ("Amarilla · ⛈️ sáb 14/11"); ya no va el renglón aparte del SMN. La etiqueta del día con alerta queda en su renglón.
- Los tres días van en renglones iguales (ícono, día, máxima / mínima, mm); hoy, con una raya violeta a la izquierda.
- Debajo de los días, solo "¿A qué hora llueve? ↓"; la fuente del pronóstico pasa adentro de "Seguir leyendo" (`fuenteTxt`, `DIAS_FTE`).
- "Seguir leyendo" sin el pedazo de texto difuminado: solo el botón (al imprimir sale todo).
- Texto de adentro más corto: la lluvia sola (`lluviaTxt`), la alerta del SMN con su horario (`smnDetTxt`) y la alerta oficial en una frase. Arreglado: decía "Por la lluvia, su semáforo está en amarillo" cuando la lluvia estaba en verde y el amarillo venía del SMN. `pisoTxt`: "por eso está en amarillo" (antes "el color no baja de").
- Pruebas al día. Huella nueva del código.

## 12/11/2026 (alerta oficial por municipio, localidades con alerta y más estaciones)

Decisión de Mariano.
- Script de Google: lee el nivel de alerta oficial de cada municipio (`normOficial`, solo el nivel), la lectura por hora de los puertos (`normPuertos`, `aplicarPuerto`) y las localidades con alerta (`normLocalidades`). Las direcciones van en las propiedades del script, no en el repositorio.
- Mapa: con el dato oficial al día, ese nivel reemplaza al cálculo con el Paraná (`ofiNivel`, `colorDe`); sin él (o con más de 24 horas), sigue el cálculo de antes. Tarjeta del municipio con el cuadrito "Oficial", un párrafo que lo explica y "Localidades con alerta" (`locInfo`, `munDeLL`).
- Río Paraná: "Medido hoy a las 12 h" con la lectura por hora. "Ríos Paraguay y Bermejo": desplegable "Más estaciones, hora por hora" (`estacionesHora`).
- Textos: leyenda, "¿Cómo se decide el color?", "De dónde salen los datos". Pruebas nuevas, entre ellas una que controla que no haya direcciones de esas fuentes en el repositorio. Huella nueva del código.
- Colores del mapa (relleno, puntitos, leyenda, tarjeta y "¿Cómo se decide?") con los tonos de las alertas oficiales: verde #2ea043, amarillo #f5c400, naranja #f07c00, rojo #e5302f (`--*-mapa`, `cMapa`). Los textos y etiquetas siguen con sus tonos de buen contraste.

## 12/11/2026 (tocar el mapa no cambia tu localidad)

Pedido de Mariano: tocar el mapa interactivo no tiene que cambiar la localidad predeterminada.
- `elegir` ya no guarda la localidad (tampoco el buscador del mapa ni la lista del semáforo).
- Tarjeta del municipio: botón "📍 Que sea mi localidad" (`miLocInfo`, `hacerMiLoc`); si ya es la tuya, "📍 Es tu localidad". Al tocarlo aparece arriba el renglón "Tu localidad" y cambia el recuadro de la portada. No en el portal ni al imprimir.
- Siguen eligiéndola: la ventana "Tu localidad" del celular y tocar un aviso.
- Frase de Privacidad y `privacidad.html` al día. Pruebas al día. Huella nueva del código.

## 12/11/2026 ("¿Cómo se decide el color?" más claro)

Pedido de Mariano: la explicación no quedaba bien (una tabla de una sola fila y párrafos largos).
- En "Riesgo por localidad", la tabla y los párrafos pasan a una tarjetita por color (rojo, naranja, amarillo, verde, `.regCol`) con lo que lo da, marcado SMN, Río o Lluvia (`.rcE`), una frase arriba (`.regIntro`: depende del SMN y, en la costa, del Paraná) y dos notas cortas (`.regNotas`). Texto sintético; mismas reglas y mismos milímetros (el detalle del Paraná sigue en su sección).
- La prueba que ata los milímetros del texto al cálculo (`nivelLluvia`) lee las tarjetitas y controla que la lluvia no figure en naranja, amarillo ni verde.

## 12/11/2026 (la alerta naranja del SMN pinta naranja)

Decisión de Mariano (12/11, tarde): el mapa y el semáforo toman el color del SMN tal cual. Reemplaza la del 23/10 (alerta naranja → amarillo). Así coinciden con los avisos al celular, que ya usaban el color del SMN.
- `pisoSMN` da la posición en `NIVELES` (amarilla 1, naranja 2, roja 3); `colorDe` y `riesgo` usan los cuatro colores. El semáforo de las 6 localidades ya mostraba renglones naranjas (los usaba el Paraná).
- Textos: leyenda (Amarillo: alerta amarilla; Naranja: alerta naranja del SMN o el Paraná en la costa) y "¿Cómo se decide el color?". La frase del SMN dice "por eso el color no baja de naranja".
- Tarjeta del municipio: en las 6 localidades del semáforo, el cuadrito "Lluvia" muestra solo la lluvia (antes mostraba el color con el piso del SMN y podía decir "Lluvia: Naranja" por una alerta de tormentas).
- Pruebas al día. Huella nueva del código.

## 12/11/2026 (el amarillo sigue el criterio del SMN)

Decisión de Mariano (12/11): el amarillo por lluvia sale solo de la alerta del SMN. Ese día Los Frentones estaba en amarillo sin ninguna alerta oficial, por 72 mm previstos en 7 días (casi todo a 5 o 6 días).
- `nivelLluvia` da solo verde o rojo; el rojo no cambia (hoy y los 2 días siguientes: 120 mm, 80 mm en un día, o 100 caídos y 70 por venir). Amarillo: alerta amarilla o naranja del SMN, o el Paraná en la costa.
- Textos: leyenda del mapa, "¿Cómo se decide el color?" (tabla solo con el rojo), "De dónde salen los datos", el renglón "En verde" y la frase de la lluvia de cada municipio (`txtViene`: lo de hoy y los 2 días siguientes, con la semana entre paréntesis). `ROJO_LEJOS`: "por ahora no cambia el color".
- Pruebas: los casos que antes eran amarillos por lluvia ahora son verdes; ninguna combinación de lluvia da amarillo. Huella nueva del código.

## 05/11/2026 (ventana "Tu localidad" sin cortes)

Pedido de Mariano (5/11): con el bloque de avisos, la ventana "Tu localidad" se veía cortada. Abría ya bajada (sin el título ni la ✕: `scrollIntoView` de la lista movía también la ventana) y la lista terminaba a mitad de renglón.
- Título y ✕ fijos arriba; la ventana abre siempre desde arriba; lo de abajo se corre dentro de `#dLocCuerpo`. La lista se corre sola hasta la localidad elegida sin mover la ventana, con borde y sombras arriba y abajo que muestran que sigue.
- Con avisos (`conAv`), dos partes: "Ver … en el mapa", avisos y "Elegir otra localidad ›"; ese botón pasa al buscador con la lista a todo lo alto ("Otra localidad", "‹" para volver). Sin avisos, todo junto como antes. Probado a 320, 360 y 390 px, y con letra grande. Huella nueva del código.

## 05/11/2026 (primer aviso real: al tocarlo, directo a la ficha)

Primer aviso real (5/11, 15:52): Mariano se anotó desde Firefox en su celular (en Chrome no se puede mientras la app de Play 1.0.0 tenga las notificaciones apagadas: Android le pasa ese bloqueo a Chrome), se corrió `probarAviso()` (Firebase 200) y el aviso llegó y abrió Resistencia.
- **Al tocar un aviso, la página baja directo a la ficha de la localidad** (`#mInfo`, con 10 px de margen arriba), no al principio del mapa, que dejaba la ficha abajo en el celular (pedido de Mariano). Huella nueva del código.

## 05/11/2026 (los avisos se acumulan)

Decisión de Mariano (5/11, 15:27): cada aviso queda aparte en la lista de notificaciones del teléfono, en lugar de reemplazar al anterior de la misma localidad. Como cada aviso trae solo lo nuevo, si reemplazaba, una alerta amarilla nueva (por ejemplo, viento para mañana) tapaba a una naranja que seguía vigente (tormentas para hoy).
- `avisos-sw.js` muestra el aviso sin `tag` ni `renotify`. El script de Google no cambia (su `tag` en `webpush.notification` no se usa, porque el aviso lo muestra el service worker). La prueba del service worker controla que no lleve `tag`. 89 pruebas.

## 05/11/2026 (avisos al celular por alertas del SMN, en prueba para los verificadores)

Decisión de Mariano: avisos al celular solo por alertas del SMN, con Firebase Cloud Messaging, mandados por el script de Google. Primero solo para los verificadores de la prueba cerrada de Google Play.
- **Script de Google**: `avisarAlertas` en cada renovación (aislada: nunca frena la renovación y no avisa si el canal del SMN falló), con `decidirAvisos` y `aplicarMarcas` (nuevas o que suben de nivel, hoy y los 2 días siguientes, regla de la noche igual para todos (de 22 a 7 solo lo de hoy o de mañana antes del mediodía; lo demás a las 7), primera vez sin mandar, reintento si Firebase falla y correo una vez por caída), `textoAviso` y `mensajeFcm` (título, una línea por alerta, abre `?loc=<n>`), `doPost`/`anotar` con `revisarPedido`, `pedidosTemas` (API nueva de temas) y tope diario `contarPedido` con `LockService`, y `probarAviso()`. `MUNICIPIOS` y `EV_NOMBRE` iguales a los del sitio (una prueba lo controla). Nuevo `apps-script/appsscript.json` con todos los permisos, también `firebase.messaging`. Propiedad `AVISOS = no` para apagarlos.
- **Página**: bloque "🔔 Avisos de alertas del SMN" en la ventana "Tu localidad", con "Avisarme", "También las alertas amarillas", "Pasar los avisos a …" y "Dejar de avisarme"; en tablets, botón "🔔 Avisarme" en "Tu localidad". Solo en celulares y tablets, fuera del portal y, mientras `AVISOS_TODOS=false`, solo en la app de Play o con `?avisos=1` (queda recordado). Biblioteca de Firebase 12.19.0 copiada en `firebase/`, cargada solo al tocar los botones. `avisos-sw.js`, solo para mostrar avisos (sin `fetch`, alcance `/avisos-sw/`). Al abrir con `?loc=<n>` (al tocar un aviso), la localidad queda elegida y se muestra en el mapa. Confirmación semanal de la anotación. El contador suma `avisos-alta`, `avisos-cambio`, `avisos-baja` y `aviso-tocado`.
- **Sin casilla "de noche"** (Mariano, 5/11): la regla de la noche es automática e igual para todos, y cuenta como urgente también lo que empieza mañana de 6 a 12 (si no, una alerta de las 6 llegaba a las 7, ya vigente). Dos temas por localidad en lugar de cuatro.
- **Puesta en marcha (5/11, 10:00 a 10:35)**: pantalla de permisos del proyecto `rios-y-clima-chaco` configurada y **"En producción"** (página principal, política de privacidad y dominio `panel-alertas-chaco.netlify.app`); script vinculado al proyecto **755067985516**, código y `appsscript.json` pegados e idénticos (SHA-256 `b8b458cb…` y `9044b038…`; Google guarda el manifiesto sin el salto de línea final), autorizado por Mariano; `diagnostico()`, `probarRobot()`, `probarCorreo()`, `probarAviso()` (Firebase respondió 200) y `actualizar()` ("primera vez: 0 avisos") bien; implementación web **Versión 6**, misma dirección. Probado: la lectura del sitio responde y un pedido falso a `doPost` vuelve rechazado (`"error":"id"`).
- **Cómo se ve el aviso** (pedido de Mariano, 5/11 10:39): circulito del color del SMN y dibujito del fenómeno en el título (los mismos del sitio, `EV_ICO` = `SMN_ICO`, una prueba lo controla); con varias alertas, uno por renglón. Ícono blanco para la barra de arriba del teléfono (`iconos/badge-96.png`, dibujado en `herramientas/iconos.py`). Script en Google: **versión 7** (10:42, SHA-256 `72cebdc0…`), misma dirección.
- **Primera publicación frenada por Netlify** (5/11 10:43, `0a67ace`): su control de secretos marcó la clave pública de Firebase (`AIza…`) de `index.html`. Se agregó `SECRETS_SCAN_SMART_DETECTION_OMIT_VALUES` con esa clave en `netlify.toml` (no es secreta: está limitada al sitio en Google Cloud). La publicación fallida no gastó créditos.
- **Regla del navegador**: `'self'` en `script-src`, `worker-src 'self'` y Firebase en `connect-src`; `herramientas/csp.js` respeta el `'self'`. `avisos-sw.js` sin caché. Privacidad en la página y en `privacidad.html` (sección "Avisos al celular").
- Probado en Chromium con la regla del navegador y los datos del 5/11: la biblioteca carga, el service worker se registra sin controlar la página, sin señal de avisos (en la nube) muestra "No se pudo anotar" sin romper nada, y `?loc=1` abre Barranqueras en el mapa. 7 pruebas nuevas: 89. **No probado todavía con Firebase de verdad** (hace falta un celular). Huella nueva del código.

## 05/11/2026 (Qué hacer en el celular)

Pedido de Mariano: al ir a "Qué hacer" desde el celular, los teléfonos quedaban en el medio y tapaban los consejos.
- **En el celular (menos de 600 px, fuera del portal)**, dentro de "Qué hacer" van primero "Ahora en el Chaco" y "¿Qué está pasando?", y después los **teléfonos de emergencia** (que ya tienen su recuadro en la portada; tocarlo sigue llevando a ellos). Solo cambia el orden con CSS (`order`); en la computadora y en el portal queda igual. Sin cambios en el código ni en la huella.

## 04/11/2026 (portada del celular)

Pedido de Mariano: la portada del boceto, solo en el celular, para llegar rápido a cada sección.
- **Portada** arriba de todo en pantallas de menos de 600 px: 12 recuadros chicos, de a 3 por renglón, cada uno con el nombre de la sección y un solo dato del momento (Paraná 6,90 m ↓, Mapa "4 en rojo", SMN "Ninguna", tu localidad o Resistencia con la lluvia de hoy, Qué hacer, Teléfonos, Por localidad, Lluvias, Lluvia por hora, Paraguay y Bermejo, El Niño, Datos y Acerca). Tocar un recuadro lleva a su sección. Fuera del verde, borde y punto del color. El Paraná va primero cuando sale del verde. Entra en una pantalla.
- **Diseño** (pedido de Mariano: más atractivo): "El Chaco hoy" con el día arriba; íconos en cuadraditos de color suave (celeste en los ríos); fuera del verde, borde, fondo e ícono del color; Teléfonos en azul marino. "Riesgo en 6 ciudades" con un puntito de color por ciudad y un ícono de semáforo (antes "Por localidad", que no se entendía). El Niño dice "Datos". Al elegir otra localidad en el mapa, la portada la muestra.
- **Centrados** los íconos y los textos de cada recuadro, **todos del mismo alto** y más bajos (ícono de 28 px, dato en un renglón; "Lluvia por hora" dice "48 horas"). Con una alerta del SMN el recuadro dice "Alerta del SMN" con el nivel ("Amarilla", "Naranja" o "Roja") y toma ese color.
- **Cartel de arriba más corto en el celular**: queda solo "Sitio informativo: no reemplaza las alertas del SMN ni los avisos oficiales."; el 911, "Más teléfonos" y el enlace al SMN ya están en la portada. En la computadora y en el portal sigue entero.
- **Teléfonos con el teléfono en verde** y fondo blanco como los demás recuadros (el azul marino no resaltaba). **Efectos al tocar**: el recuadro se achica un poco, se abre un brillo desde el centro (verde en Teléfonos) y el ícono salta; al abrir, los recuadros entran uno detrás de otro (solo la primera vez); en la computadora se levantan al pasar el mouse. Íconos con brillo y sombra suave, raya de colores debajo de "El Chaco hoy". Sin movimientos si el teléfono pide reducirlos.
- **Transiciones leves** en todo el sitio: los desplegables y "Seguir leyendo" se estiran o encogen en vez de saltar (`deslizar`); al elegir otro municipio la tarjeta aparece con un fundido corto (`.cambia`); desde la portada la pantalla baja deslizando hasta la sección; todos los botones se achican apenas al tocarlos; las tarjetas de "¿Qué está pasando?" y los desplegables con flecha se abren con un fundido. Duran menos de 0,4 s, solo mueven o desvanecen, y no hay ninguna si el teléfono pide reducir movimientos (`conMov`).
- **Hora de los datos** debajo del día en "El Chaco hoy" ("Datos de las 22:52 h", con la hora de la lluvia; con más de 3 horas, en naranja: "Sin renovar: datos de las…").
- **Mientras cargan los datos**, cada recuadro muestra una barrita gris con brillo en lugar de "…": la portada no salta cuando llegan los números.
- **Botón "Letra"** (A+) junto a Compartir, en celulares y tablets: agranda el texto un octavo en todo el sitio y el teléfono lo recuerda (`anc-letra`, contado en Privacidad y en `privacidad.html`). No en el portal.
- **Botón "Actualizar"**, solo en la app instalada o la de Google Play (no tienen barra para recargar): vuelve a pedir los datos, con el ícono girando y aviso para el lector de pantalla.
- **Tu localidad más fácil de cambiar**: al tocar su recuadro se abre una ventana con "Ver … en el mapa" (lo de antes) y una lista de los 70 municipios con buscador; elegir uno lo guarda y la portada se actualiza. Si el navegador no tiene ventanas, va al mapa como antes.
- Una primera versión con gráfico del río, mapa chico y textos quedaba muy larga (casi dos pantallas): se dejó un dato por recuadro; el detalle sigue en cada sección.
- En el celular, la portada reemplaza la franja del río, "Tu localidad" y el índice "Ir a:"; "↑ Índice" sube hasta ella. La franja del SMN y el resto de la página no cambian. En la computadora, en el portal y al imprimir no cambia nada.
- Revisado con la regla del navegador y los datos del 4/11 a 320 y 360 px y en la computadora: sin errores; axe sin errores en la portada. Una prueba nueva. Huella nueva del código. 81 pruebas.

## 04/11/2026 (desplegables de los ríos)

Revisión de los desplegables con Mariano (en el celular se veía raro el Paraguay plegado).
- **Ríos Paraguay y Bermejo cerrada**: el botón "↑ Volver al mapa" ya no aparece en la vista previa (ahí no se podía tocar: abría la sección) y deja ver el río y su altura. Con la sección abierta sigue donde estaba.
- **Río Paraná**: sigue siempre abierta (es lo más consultado y la regla es lo principal), pero más corta: Yacyretá pasa a un desplegable cerrado, después de "¿Cómo leer estos números?" y "¿Cómo calcula el INA…?", con el título "Yacyretá: sale 29.300 m³ de agua por segundo"; adentro, la misma cajita. En un teléfono de 360 px la sección pasa de unos 1.840 a 1.530 px; en la computadora, de 1.450 a 1.080.
- Huella nueva del código. 80 pruebas (la de Yacyretá, al día con el desplegable).

## 04/11/2026 (tarjeta del municipio más corta)

Mariano lo probó en el sitio: la regla del río queda bien, pero la tarjeta del municipio era muy larga.
- **Días siguientes en renglones**: jueves y viernes van cada uno en un renglón (ícono, día, máxima / mínima y mm de lluvia); la palabra del tiempo y la fecha siguen en el texto para lectores de pantalla. Una alerta del SMN ese día sigue con su etiqueta y su color.
- **Cuadritos en píldoras** ("Lluvia ● Amarillo", "SMN ● Sin alertas", "Río Paraná ● Rojo"). Sin alertas confirmadas del SMN va la píldora "SMN: Sin alertas" en lugar del renglón "SMN Sin alertas oficiales en el informe del…"; con alertas, o si el informe no se pudo confirmar o es viejo, el renglón sigue.
- **La superficie pasa a "Seguir leyendo"** y la vista previa de ese texto es más corta.
- Nombre del municipio un poco más chico en pantallas angostas, para que no se corte.
- **Textos más cortos** (pedido de Mariano: "resume lo que veas extenso, pero que se entienda"): el botón dice "¿A qué hora llueve? ↓"; en "Seguir leyendo", el renglón "Costa del Paraná · Rojo" ya no se repite (lo dice la píldora), la explicación del río en la costa va en dos frases ("En la costa, el color sigue al río Paraná… Vale para la costa y las islas fuera de las defensas, que protegen la ciudad hasta unos 9,50 m. Seguí los avisos oficiales."), los municipios con techo en una frase menos, el Gran Resistencia dice "Por la lluvia está en amarillo, como todo el Gran Resistencia" y la nota de la lluvia medida queda en "Estación automática (Red Hidrológica Nacional, vía INA): dato sin revisar, no se usa para el color.". Dentro de la tarjeta ese texto va más chico y sin justificar.
- En un teléfono de 360 px la tarjeta cerrada pasa de unos 790 a 500 px. Revisado a 320, 360, 412 y 1280 px con la regla del navegador; axe sin errores. 80 pruebas.

## 04/11/2026 (más visual: regla del puerto en el Paraná y tarjeta del municipio)

Pedido de Mariano: ir haciendo el sitio más visual y menos para leer, sin romper nada; empezar por la regla del río y la tarjeta de la localidad del boceto.
- **Regla del puerto en la sección del Paraná** (`reglaRio`): la escala de Barranqueras dibujada, con el agua a la altura de la última lectura, las marcas de alerta, evacuación y defensas, y un corchete que muestra cuánto pasó la alerta o la evacuación. Al lado, el número grande, la fecha, la frase de situación y la tendencia (sin justificar, para que no queden huecos). Debajo, "Las marcas valen para la zona ribereña fuera de las defensas…". El gráfico, Yacyretá, los desplegables y las fuentes no cambian. Solo el gráfico se lee con el dedo, la regla no.
- **Pronóstico del INA en tarjetas** ("Lo que prevé el INA"): una por fecha, con la altura más probable y el rango, cuando no hay aviso. Los avisos de "prevé pasar el nivel de evacuación" y "puede llegar" quedan igual.
- **Detalle de un municipio como tarjeta azul marino** (`#mInfo.tarj`): nombre en grande, "Rojo en el mapa" y cuadritos de dónde sale el color (`porQue`: la lluvia, la alerta del SMN si sube el color y el Paraná en la costa, con el techo de cada municipio). Hoy en una tarjeta ancha; los 2 días siguientes debajo, de a dos. "Ver a qué hora llueve hoy y mañana" como botón. El texto completo sigue en "Seguir leyendo". La lista del filtro de color y el aviso al tocar un río quedan como antes.
- Revisado con la regla del navegador y los datos del 4/11 a 320, 360, 412 y 1280 px y en una copia del portal: sin errores ni desbordes nuevos; axe sin errores en las dos partes. Casos probados: río a 2,40, 6,20, 6,90 y 10,40 m, sin pronóstico, municipio del interior con alerta naranja del SMN, filtro de color y río tocado.
- **Pruebas**: una nueva (regla en todos los rangos, corchete, tarjetas del pronóstico, cuadritos del color con y sin río, con alerta del SMN y sin datos). Huella nueva del código. 80 pruebas.

## Octubre de 2026 (resumen)

Un renglón por subida. El detalle de cada una está en el historial de git (`git log`) y en la versión de este archivo anterior al 13/11/2026.

- **26/10** la app de Google Play reconoce al sitio
- **24/10** en el celular: todo más compacto, "↑ Índice" que no tapa, las tarjetas del clima a la vista al tocar un municipio y la altura del río destacada
- **24/10** revisión general: más liviano, listo para Google Play y mejor para leer en el celular
- **24/10** en el celular, botones de colores y etiqueta del SMN más chicos en el mapa
- **23/10** "Todo el Chaco" al ir a "Lluvia hora por hora" desde un municipio que no está en la lista
- **23/10** enlaces a "Lluvia hora por hora" y "Tormentas" sin cortar
- **23/10** 3 tarjetas grandes en vez de 7 recuadros
- **23/10** temperatura y tipo de tiempo en los recuadros de los días
- **23/10** recuadros de los próximos días y texto desplegable en el detalle del mapa
- **23/10** alerta del SMN arriba en el detalle del mapa
- **23/10** Yacyretá en tono neutro
- **23/10** secciones de los ríos más livianas y Yacyretá más clara
- **23/10** fecha de la lectura debajo del número de cada río
- **23/10** fecha de la última lectura de los ríos
- **23/10** explicación de los colores más clara y corta
- **21/10** sin teléfonos por municipio
- **21/10** teléfonos dentro del portal
- **21/10** Isla del Cerrito hasta rojo y teléfonos municipales
- **21/10** tu localidad
- **21/10** diseño nuevo de Lluvia hora por hora
- **21/10** botones de colores del mapa y barritas más grandes
- **20/10** relojito, barritas y leyenda de colores en Lluvia hora por hora
- **20/10** Lluvia hora por hora más compacta e índice completo
- **20/10** menos repeticiones en "Ahora en el Chaco"
- **20/10** Lluvia hora por hora
- **20/10** "Instalar app" dentro del portal
- **20/10** dentro del portal de Gobierno Abierto
- **20/10** Instalar app y Compartir solo en el celular; gráfico de lluvia con fechas; botones del riesgo por localidad; 911 fuera del menú lateral
- **19/10** tarde (Teléfonos en el índice; explicación del Paraná y de Yacyretá)
- **19/10** tarde (botón de WhatsApp de SECHEEP)
- **19/10** tarde (imagen del Pacífico guardada en GitHub, renovada cada 7 días)
- **19/10** tarde (la página ya no queda "cargando" en la computadora)
- **19/10** tarde (botón "Instalar app" también en iPhone)
- **19/10** mediodía (computadora: índice junto al nombre y mejor uso del espacio)
- **19/10** mañana (tarjetas cerradas, pico del Paraná, índice lateral y pantalla ancha)
- **19/10** mañana (secciones de arriba más cortas)
- **19/10** mañana (navegación: índice, volver al índice, Atrás y botones grandes)
- **18/10** noche (franja del río arriba de todo)
- **18/10** noche (`4aac9e4` y `24d3f87`: revisión integral: el mapa nombra al río, la página carga más rápido y Netlify corre las pruebas antes de publicar)
- **18/10** noche (`7e4a5c3`: alertas del SMN: hoy y 2 días más, como la página del SMN)
- **18/10** noche (subido en `cf1f0b5`: la franja del SMN dice para qué día es la alerta)
- **17/10** tarde (`0588be9`, `5dd2919`, `ac583fd` y `8d5cab1`: tocar el río en el mapa ya no lleva de golpe a su sección, etiquetas de los ríos y "Volver al mapa")
- **17/10** tarde (`a57ec68`: el rojo por lluvia mira solo 3 días)
- **17/10** tarde (`f6d8301`, `cd9e935` y `07b76ad`: amarillo más claro en el mapa, "solo claro" y techos de la costa revisados)
- **17/10** `e234741`, `6c0c635` y `d0cc059`: el mapa sigue los colores del comunicado oficial por la crecida del Paraná
- **16/10** noche (`ae6820e`: Colonia Benítez sigue al Paraná, como mucho en amarillo; desde el 17/10, hasta naranja)
- **16/10** `5d542a5` y `0c1dccf`: botón "Compartir", imagen nueva y cartel de datos viejos
- **15/10** `50db23a`, `a6f0597`, `376983f` y `c03ddf5`: contador de visitas
- **15/10** `53920da`: botón "Instalar app"
- **15/10** `105bab5`, `bb26d5c`, `4d88132` y `9c4bdc2`: siempre claro, como el portal
- **15/10** `95b5543`: aspecto del portal nuevo de Gobierno Abierto
- **15/10** `97d1d35`: defensas de la ciudad en el gráfico del Paraná
- **15/10** `1385213`: informar sin alarmar
- **15/10** `766bebc` y `53e41d9`: textos de "Qué hacer" pensados para la gente de la costa y los barrios; teléfonos
- **15/10** `b077390`: "Qué hacer ante una alerta", más legible e interactiva
- **15/10** `40552f6`: aspecto del portal
- **15/10** `2d086f1`: Textos más calmos en "Qué hacer ante una alerta"
- **14/10** `8851810`: seguridad y muchas visitas
- **14/10** `d1f9034`: El mapa pinta la costa del Paraná con el color del río
- **13/10** `97fa6b2`: Naranja para la zona ribereña del Paraná
- **13/10** `30b6561`: incluye `b34190b`
- **13/10** `edcefad`: incluye `e326d30` y `7a776c6`
- **13/10** aviso de pronóstico atrasado, mapa del Pacífico y limpieza
- **13/10** `dfbadfe`: Yacyretá en lugar de GloFAS
- **13/10** `907caf5`: Contacto por correo en "Acerca de este sitio"
- **13/10** `c66cc62`: Semáforo más corto
- **13/10** `1886b22`: Lluvia medida en estaciones
- **12/10** noche, `527bb9d`: Sección nueva "Lluvia hora por hora
- **12/10** noche, `89be500`: Mapa
- **12/10** noche: Umbrales de lluvia nuevos, ajustados con la lluvia de 1991 a 2026
- **12/10** Licencia MIT (`LICENSE`)

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
