/**
 * Alertas del SMN para el Chaco: script de Google Apps Script.
 *
 * Lee el canal oficial de alertas del Servicio Meteorológico Nacional (formato CAP),
 * se queda con las que tocan a los municipios del Chaco y publica el resultado como JSON.
 *
 * Además guarda una copia horaria de los otros datos del sitio (lluvia, ríos Paraná, Paraguay y Bermejo, pronósticos del Paraná y del Paraguay,
 * lluvia medida en estaciones, lo que suelta Yacyretá y ONI), en "datos".
 * El robot de GitHub copia este resultado a la rama "datos" (servidor.json) y el sitio lee primero esa copia; esta dirección queda de respaldo.
 * El sitio nunca consulta las fuentes directamente: si la copia es vieja, la muestra con su hora.
 * Si una de esas fuentes falla, se conserva la copia anterior y las alertas del SMN no se ven afectadas.
 * Para ver qué fuentes responden desde Google: ejecutar diagnosticoDatos().
 *
 * Robot de la lluvia: Open-Meteo rechaza los pedidos que salen de Google, así que la lluvia la consulta un robot en GitHub.
 * El horario propio de GitHub falla mucho, por eso este script lo lanza en cada renovación (lanzarRobot).
 * Necesita una clave de GitHub guardada en Configuración del proyecto > Propiedades del script, con el nombre GITHUB_TOKEN.
 * Sin esa clave no lanza nada y el resto funciona igual. Para probarla: ejecutar probarRobot().
 * Si la lluvia lleva más de 24 horas sin renovarse, el script manda un correo a la cuenta dueña del script, una sola vez por caída.
 * Para dar el permiso de enviar correo y probarlo: ejecutar probarCorreo().
 *
 * Avisos al celular (desde el 5/11/2026): cuando aparece una alerta del SMN nueva para un municipio, o sube de nivel, el script
 * le pide a Firebase Cloud Messaging que avise a los celulares anotados en esa localidad (avisarAlertas). La página anota cada
 * celular con un pedido a esta misma dirección (doPost). Ver "avisos al celular" más abajo. Para probarlo: ejecutar probarAviso().
 *
 * Control de las horas: el canal del SMN rotula las horas de vigencia como hora argentina, pero vienen en UTC, y por eso se corrigen 3 horas.
 * En cada lectura el script revisa si eso sigue siendo así (controlAjuste). Si el SMN arregla su canal, deja de corregir solo,
 * sin tocar nada. Lo que decidió queda publicado en "ajuste" (horas: 3 o 0).
 *
 * Uso:
 *  1. Ejecutar una vez la función instalar(): hace la primera lectura y programa la renovación cada hora.
 *  2. Implementar > Nueva implementación > Aplicación web > Acceso: "Cualquier persona".
 *     La dirección que entrega es la que lee el mapa.
 */

var FEED = 'https://ssl.smn.gob.ar/CAP/AR.php';
var AJUSTE_H = 3;                   // corrección horaria del canal mientras venga corrido (ver leerCap y controlAjuste)
var DIAS = 4;                       // hoy y los tres días siguientes
var TZ = 'America/Argentina/Buenos_Aires';
var REPO = 'marianoavalostech-arch/alertas-smn-chaco';   // repositorio del sitio, donde vive el robot de la lluvia
var HORAS_AVISO = 24;               // horas sin lluvia nueva para mandar el correo de aviso

// Punto central de cada municipio [lat, lon], en el mismo orden que GEO.mun en el mapa.
var CENTROS = [[-26.58,-60.73],[-27.48,-58.92],[-27.87,-59.18],[-26.85,-60.8],[-26.8,-59.44],[-27.64,-59.96],[-27.12,-61.31],[-27.88,-61.54],[-26.57,-59.62],[-27.01,-60.13],[-27.31,-58.85],[-26.92,-59.41],[-27.29,-59.13],[-26.7,-59.62],[-26.44,-60.91],[-27.75,-60.89],[-26.85,-61.07],[-27.69,-59.57],[-24.65,-61.65],[-27.8,-60.45],[-27.42,-59.05],[-25.04,-61.99],[-27.41,-61.63],[-27.41,-61.47],[-27.27,-61.37],[-26.52,-59.28],[-26.82,-58.73],[-27.62,-61.33],[-27.3,-58.68],[-25.92,-60.66],[-27.17,-60.68],[-26.73,-58.94],[-27.1,-59.49],[-26.99,-58.85],[-27.08,-60.62],[-27.07,-59.33],[-27.23,-59.19],[-26.42,-59.68],[-27.26,-59.47],[-26.94,-61.26],[-26.62,-59.78],[-27.12,-58.68],[-26.04,-61.47],[-26.68,-59.97],[-27.11,-59.23],[-27.09,-59.02],[-25.48,-61.04],[-24.99,-61.55],[-26.68,-60.63],[-26.64,-59.04],[-26.02,-59.97],[-26.4,-61.14],[-27.04,-59.77],[-26.18,-59.68],[-26.79,-60.46],[-26.89,-58.52],[-26.71,-58.64],[-27.38,-59.3],[-27.71,-58.91],[-26.66,-60.17],[-27.59,-59.14],[-27.61,-60.35],[-27.34,-60.7],[-27.85,-61.12],[-25.33,-62.58],[-26.32,-60.45],[-27.68,-60.76],[-27.26,-60.37],[-25.69,-60.32],[-25.35,-60.61]];

// Puntos interiores de cada municipio [lat, lon], además del central, para saber si una alerta lo toca aunque no cubra su centro.
// Los genera herramientas/puntos.js a partir de los límites del mapa. Los municipios chicos no tienen: usan solo el punto central.
var PUNTOS = [[[-26.6,-60.8],[-26.6,-60.7],[-26.5,-60.7]],[],[[-27.9,-59.3],[-27.9,-59.2],[-27.9,-59],[-27.8,-59.3],[-27.8,-59.2]],[[-27,-60.7],[-26.8,-60.9],[-26.8,-60.8],[-26.8,-60.7]],[[-26.8,-59.5]],[[-27.9,-60.1],[-27.9,-60],[-27.9,-59.9],[-27.9,-59.8],[-27.8,-60.1],[-27.8,-60],[-27.8,-59.9],[-27.8,-59.8],[-27.7,-60.1],[-27.7,-60],[-27.7,-59.9],[-27.7,-59.8],[-27.6,-60.1],[-27.6,-60],[-27.6,-59.9],[-27.6,-59.8],[-27.5,-60.1],[-27.5,-60],[-27.5,-59.9],[-27.5,-59.8],[-27.4,-60.1],[-27.4,-60],[-27.4,-59.9],[-27.4,-59.8]],[[-27.3,-61.1],[-27.3,-61],[-27.2,-61.2],[-27.1,-61.4],[-27.1,-61.3],[-27,-61.5],[-26.9,-61.6]],[[-27.9,-61.6],[-27.9,-61.5],[-27.9,-61.4],[-27.8,-61.6]],[],[],[[-27.3,-58.9],[-27.3,-58.8]],[[-26.9,-59.5],[-26.9,-59.4],[-26.9,-59.3]],[[-27.3,-59.1]],[],[[-26.6,-61],[-26.5,-60.9],[-26.4,-60.9]],[[-27.7,-60.9]],[[-27,-60.9],[-26.9,-61.1],[-26.9,-61],[-26.8,-61.2],[-26.8,-61.1],[-26.7,-61.2],[-26.7,-61.1]],[[-27.9,-59.6],[-27.9,-59.5],[-27.8,-59.6],[-27.8,-59.5],[-27.7,-59.6],[-27.7,-59.5],[-27.6,-59.6],[-27.6,-59.5],[-27.5,-59.6]],[[-25.2,-61],[-25.1,-61.1],[-25.1,-61],[-25.1,-60.9],[-25,-61.2],[-25,-61.1],[-25,-61],[-24.9,-61.3],[-24.9,-61.2],[-24.9,-61.1],[-24.8,-61.6],[-24.8,-61.5],[-24.8,-61.4],[-24.8,-61.3],[-24.8,-61.2],[-24.7,-61.8],[-24.7,-61.7],[-24.7,-61.6],[-24.7,-61.5],[-24.7,-61.4],[-24.7,-61.3],[-24.6,-62],[-24.6,-61.9],[-24.6,-61.8],[-24.6,-61.7],[-24.6,-61.6],[-24.5,-62.2],[-24.5,-62.1],[-24.5,-62],[-24.5,-61.9],[-24.5,-61.8],[-24.5,-61.7],[-24.5,-61.6],[-24.4,-62.2],[-24.4,-62.1],[-24.4,-62],[-24.4,-61.9],[-24.4,-61.8],[-24.3,-62.3],[-24.3,-62.2],[-24.3,-62.1],[-24.3,-62],[-24.2,-62.3],[-24.2,-62.2]],[[-27.9,-60.5],[-27.9,-60.4],[-27.9,-60.3],[-27.8,-60.5],[-27.8,-60.4],[-27.8,-60.3]],[],[[-25.4,-62.1],[-25.4,-62],[-25.4,-61.9],[-25.4,-61.8],[-25.4,-61.7],[-25.4,-61.6],[-25.4,-61.5],[-25.3,-62.1],[-25.3,-62],[-25.3,-61.9],[-25.3,-61.8],[-25.3,-61.7],[-25.3,-61.6],[-25.3,-61.5],[-25.2,-62.1],[-25.2,-62],[-25.2,-61.9],[-25.2,-61.8],[-25.2,-61.7],[-25.2,-61.6],[-25.2,-61.5],[-25.2,-61.4],[-25.1,-62.1],[-25.1,-62],[-25.1,-61.9],[-25.1,-61.8],[-25.1,-61.7],[-25,-62.1],[-25,-62],[-24.9,-62.1],[-24.9,-62],[-24.8,-62.2],[-24.8,-62.1],[-24.8,-62],[-24.7,-62.5],[-24.7,-62.4],[-24.7,-62.3],[-24.7,-62.2],[-24.7,-62.1],[-24.6,-62.4],[-24.6,-62.3]],[[-27.4,-61.6],[-27.3,-61.6]],[],[[-27.4,-61.3],[-27.4,-61.2],[-27.4,-61.1],[-27.3,-61.4],[-27.3,-61.3],[-27.2,-61.5],[-27.2,-61.4]],[[-26.7,-59.4],[-26.7,-59.3],[-26.6,-59.5],[-26.6,-59.4],[-26.6,-59.3],[-26.6,-59.2],[-26.5,-59.5],[-26.5,-59.4],[-26.5,-59.3],[-26.5,-59.2],[-26.5,-59.1],[-26.4,-59.5],[-26.4,-59.4],[-26.4,-59.3],[-26.4,-59.2],[-26.4,-59.1]],[[-26.9,-58.7],[-26.8,-58.8],[-26.8,-58.7]],[[-27.7,-61.5],[-27.7,-61.4],[-27.7,-61.3],[-27.6,-61.5],[-27.6,-61.4],[-27.6,-61.3],[-27.6,-61.2]],[],[[-26,-61.1],[-26,-61],[-26,-60.9],[-26,-60.8],[-26,-60.7],[-26,-60.6],[-26,-60.5],[-26,-60.4],[-26,-60.3],[-26,-60.2],[-25.9,-61.1],[-25.9,-61],[-25.9,-60.9],[-25.9,-60.8],[-25.9,-60.7],[-25.9,-60.6],[-25.9,-60.5],[-25.9,-60.4],[-25.9,-60.3],[-25.9,-60.2],[-25.8,-61.1],[-25.8,-61],[-25.8,-60.6],[-25.7,-60.6]],[],[[-26.8,-59.1],[-26.8,-59],[-26.7,-58.9],[-26.6,-58.8]],[[-27.1,-59.5]],[[-27.1,-58.8],[-27,-58.9],[-27,-58.8],[-26.9,-58.9]],[[-27.1,-60.6]],[],[],[[-26.4,-59.7],[-26.4,-59.6]],[[-27.3,-59.5]],[[-27.2,-61],[-27.1,-61.1],[-27.1,-61],[-27,-61.2],[-27,-61.1],[-26.9,-61.4],[-26.9,-61.3],[-26.8,-61.5],[-26.8,-61.4],[-26.7,-61.6],[-26.7,-61.5],[-26.7,-61.4]],[[-26.6,-59.8]],[[-27.2,-58.7],[-27.1,-58.7]],[[-26.6,-61.6],[-26.6,-61.5],[-26.5,-61.6],[-26.5,-61.5],[-26.4,-61.6],[-26.4,-61.5],[-26.4,-61.4],[-26.3,-61.6],[-26.3,-61.5],[-26.3,-61.4],[-26.2,-61.6],[-26.2,-61.5],[-26.2,-61.4],[-26.2,-61.3],[-26.2,-61.2],[-26.1,-61.6],[-26.1,-61.5],[-26.1,-61.4],[-26.1,-61.3],[-26,-61.6],[-26,-61.5],[-26,-61.4],[-26,-61.3],[-25.9,-61.6],[-25.9,-61.5],[-25.9,-61.4],[-25.9,-61.3],[-25.8,-61.6],[-25.8,-61.5],[-25.8,-61.4],[-25.8,-61.3],[-25.7,-61.6],[-25.7,-61.5],[-25.7,-61.4],[-25.7,-61.3],[-25.6,-61.6],[-25.6,-61.5],[-25.6,-61.4]],[[-27.2,-60.1],[-27.1,-60.2],[-26.9,-60.1],[-26.9,-60],[-26.8,-60.1],[-26.8,-60],[-26.7,-60],[-26.7,-59.9],[-26.6,-59.9],[-26.5,-59.9],[-26.4,-59.9]],[[-27.2,-59.3],[-27.1,-59.2],[-27,-59.2]],[[-27.2,-59],[-27.1,-59],[-27,-59]],[[-25.7,-61],[-25.7,-60.9],[-25.7,-60.8],[-25.6,-61.1],[-25.6,-61],[-25.6,-60.9],[-25.6,-60.8],[-25.5,-61.3],[-25.5,-61.2],[-25.5,-61.1],[-25.5,-61],[-25.5,-60.9],[-25.5,-60.8],[-25.4,-61.3],[-25.4,-61.2],[-25.4,-61.1],[-25.4,-61],[-25.4,-60.9],[-25.4,-60.8],[-25.3,-61.3],[-25.3,-61.2],[-25.3,-61.1],[-25.2,-61.3],[-25.2,-61.2]],[[-25.1,-61.5],[-25.1,-61.4],[-25.1,-61.3],[-25,-61.5],[-25,-61.4],[-24.9,-61.8],[-24.9,-61.7],[-24.9,-61.6]],[],[[-26.7,-59.1],[-26.6,-59]],[[-26.2,-60],[-26.1,-60],[-26.1,-59.9],[-26,-60],[-26,-59.9],[-25.9,-60],[-25.9,-59.9],[-25.8,-60]],[[-26.6,-61.3],[-26.6,-61.2],[-26.5,-61.3],[-26.5,-61.2],[-26.5,-61.1],[-26.4,-61.2],[-26.4,-61.1],[-26.3,-61],[-26.2,-61.1],[-26.2,-61]],[[-27.2,-59.9],[-27.2,-59.8],[-27.2,-59.7],[-27.2,-59.6],[-27.1,-59.9],[-27.1,-59.8],[-27.1,-59.7],[-27.1,-59.6],[-27,-59.9],[-27,-59.8],[-27,-59.7],[-26.9,-59.8],[-26.9,-59.7],[-26.8,-59.8]],[[-26.2,-59.8],[-26.2,-59.7],[-26.2,-59.6],[-26.2,-59.5]],[[-26.9,-60.6],[-26.9,-60.5],[-26.9,-60.4],[-26.8,-60.5],[-26.8,-60.4],[-26.7,-60.5],[-26.7,-60.4],[-26.6,-60.5]],[[-26.9,-58.5]],[],[[-27.4,-59.4],[-27.4,-59.3],[-27.4,-59.1]],[[-27.8,-58.9],[-27.7,-58.9]],[[-27,-60.3],[-26.9,-60.3],[-26.8,-60.2],[-26.7,-60.2],[-26.6,-60.1],[-26.5,-60.1],[-26.4,-60.1]],[[-27.8,-59.1],[-27.7,-59.2],[-27.7,-59.1],[-27.6,-59.3],[-27.6,-59.2],[-27.6,-59.1],[-27.5,-59.3],[-27.5,-59.2],[-27.5,-59.1]],[[-27.6,-60.4],[-27.6,-60.3]],[[-27.4,-60.8],[-27.4,-60.7],[-27.4,-60.6],[-27.3,-60.7],[-27.3,-60.6]],[[-27.9,-61.3],[-27.9,-61.2],[-27.9,-61.1],[-27.9,-61],[-27.8,-61.2],[-27.8,-61.1]],[[-25.6,-63.3],[-25.6,-63.2],[-25.6,-63.1],[-25.6,-63],[-25.6,-62.9],[-25.6,-62.8],[-25.6,-62.7],[-25.6,-62.6],[-25.6,-62.5],[-25.6,-62.4],[-25.6,-62.3],[-25.6,-62.2],[-25.6,-62.1],[-25.6,-62],[-25.6,-61.9],[-25.6,-61.8],[-25.5,-63.2],[-25.5,-63.1],[-25.5,-63],[-25.5,-62.9],[-25.5,-62.8],[-25.5,-62.7],[-25.5,-62.6],[-25.5,-62.5],[-25.5,-62.4],[-25.5,-62.3],[-25.4,-63.1],[-25.4,-63],[-25.4,-62.9],[-25.4,-62.8],[-25.4,-62.7],[-25.4,-62.6],[-25.4,-62.5],[-25.4,-62.4],[-25.4,-62.3],[-25.3,-63],[-25.3,-62.9],[-25.3,-62.8],[-25.3,-62.7],[-25.3,-62.6],[-25.3,-62.5],[-25.3,-62.4],[-25.3,-62.3],[-25.2,-62.9],[-25.2,-62.8],[-25.2,-62.7],[-25.2,-62.6],[-25.2,-62.5],[-25.2,-62.4],[-25.2,-62.3],[-25.1,-62.9],[-25.1,-62.8],[-25.1,-62.7],[-25.1,-62.6],[-25.1,-62.5],[-25.1,-62.4],[-25.1,-62.3],[-25,-62.8],[-25,-62.7],[-25,-62.6],[-25,-62.5],[-25,-62.4],[-25,-62.3],[-24.9,-62.7],[-24.9,-62.6],[-24.9,-62.5],[-24.9,-62.4],[-24.9,-62.3]],[[-26.5,-60.4],[-26.5,-60.3],[-26.4,-60.7],[-26.4,-60.6],[-26.4,-60.5],[-26.4,-60.4],[-26.4,-60.3],[-26.3,-60.7],[-26.3,-60.6],[-26.3,-60.5],[-26.3,-60.4],[-26.3,-60.3],[-26.2,-60.7],[-26.2,-60.6],[-26.2,-60.5],[-26.2,-60.4],[-26.2,-60.3],[-26.2,-60.2]],[[-27.9,-60.7],[-27.8,-60.7],[-27.7,-60.7],[-27.6,-60.8],[-27.6,-60.7],[-27.5,-60.9]],[[-27.4,-60.4],[-27.4,-60.3],[-27.3,-60.4],[-27.3,-60.3],[-27.2,-60.4],[-27.2,-60.3],[-27.1,-60.4]],[[-25.7,-60.5],[-25.7,-60.4],[-25.7,-60.3],[-25.7,-60.2],[-25.6,-60.3]],[[-25.6,-60.5],[-25.5,-60.5],[-25.5,-60.4],[-25.4,-60.6],[-25.4,-60.5],[-25.4,-60.4],[-25.3,-60.8],[-25.3,-60.7],[-25.3,-60.6],[-25.3,-60.5],[-25.2,-60.9],[-25.2,-60.8],[-25.2,-60.7]]];

// Localidades del semáforo [lat, lon], en el mismo orden que LOCS en el sitio.
var LOCS = [[-27.45,-58.99],[-26.79,-60.44],[-27.57,-60.71],[-25.95,-60.62],[-27.21,-61.19],[-27.09,-61.08]];
// Estaciones con lluvia medida: red SAT de la Red Hidrológica Nacional (estaciones automáticas, datos públicos del INA), en el Chaco y alrededores.
// [serie del INA (lluvia a intervalo nativo), nombre, lat, lon]. Salen de alerta.ina.gob.ar/a5/obs/puntual/series?var_id=27&geom=-63.7,-28.2,-58.2,-24 (red "sat2").
// Las que dejan de informar no molestan: solo se publican las que tienen una lectura de las últimas 24 horas.
var MEDIDA = [
  [6699, 'Puerto Velaz', -26.661, -58.634], [6788, 'Puerto Lavalle', -25.651, -60.128], [6914, 'El Colorado (río Bermejo, Formosa)', -26.334, -59.362],
  [31970, 'Corrientes (puerto)', -27.46, -58.833], [31976, 'Parque Nacional Copo (Santiago del Estero)', -25.923, -61.714], [33152, 'Las Palmas', -27.118, -58.643],
  [33262, 'Laguna Blanca', -27.263, -59.196], [33892, 'Las Lomitas (Formosa)', -24.712, -60.583], [38860, 'Laguna Yema (Formosa)', -24.256, -61.242],
  [39058, 'Charadai', -27.651, -59.858], [39059, 'El Colorado (Bajos Submeridionales)', -27.915, -62.178], [39062, 'Línea Paraná', -28.009, -60.646],
  [39063, 'Sachayoj (estación meteorológica)', -27.011, -62.058], [39065, 'El Aguará', -27.072, -60.076], [39066, 'El Caburé', -27.478, -60.998],
  [39067, 'Kilómetro 468', -28.087, -61.463], [39069, 'Las Piedritas', -26.824, -61.567], [39070, 'Lote 48 (La Montenegrina)', -26.912, -60.677],
  [39072, 'Palmar Norte', -27.165, -61.469], [39073, 'Pampa Hermosa', -26.637, -61.33], [39074, 'Tres Mojones', -28.028, -62.084],
  [39075, 'Pluviómetro 10 (sin nombre)', -26.907, -61.714], [39077, 'El 38 Norte', -27.779, -59.607], [39082, 'La Horqueta', -27.8, -60.232],
  [39083, 'Los Gansos', -27.834, -60.711], [39085, 'Nogués', -28.038, -59.697], [39086, 'Pampa Sandi', -26.927, -61.366],
  [39087, 'Pozo las Piedras', -27.166, -61.687], [39088, 'Sachayoj (pluviómetro)', -26.681, -61.819], [39123, 'Pampa del Indio', -25.933, -60.05],
  [39127, 'Parque Nacional El Impenetrable', -25.053, -61.044], [39135, 'Ibarreta (Formosa)', -25.204, -59.869], [39136, 'Pirané (Formosa)', -25.756, -59.117],
  [39137, 'Puente Lavalle', -25.676, -60.14], [39138, 'Posta Zalazar (Formosa)', -24.212, -60.197], [39139, 'Colonia Benítez', -27.324, -58.953],
  [39140, 'Cote Lai', -27.533, -59.576], [39141, 'La Escondida', -27.133, -59.473], [39142, 'Parque Nacional Chaco', -26.807, -59.607],
  [43703, 'Castelli', -25.934, -60.602], [43705, 'El Aybal (Formosa)', -24.367, -61.685], [43706, 'Corrientes (ICA)', -27.472, -58.822],
  [43711, 'Pampa del Cielo', -27.609, -61.68], [43715, 'Pozo del Tigre (Formosa)', -24.904, -60.323], [43722, 'Belgrano (Formosa)', -24.937, -59.019],
  [43726, 'Fuerte Esperanza', -25.163, -61.841], [43727, 'Río Muerto', -26.307, -61.66], [43754, 'Santos Lugares (Santiago del Estero)', -26.684, -63.556],
  [43782, 'General Pinedo', -27.325, -61.282], [43783, 'Granadero Gatica (Santiago del Estero)', -26.866, -62.667], [43796, 'San Martín 2 (Formosa)', -24.454, -59.669]
];
// Pronóstico del INA para el río Paraguay (calibrado 312): serie de cada puerto.
var PRONO_PY = { 1525: 'pilcomayo', 3127: 'formosa' };

var TRIM = { DJF: 'dic-feb', JFM: 'ene-mar', FMA: 'feb-abr', MAM: 'mar-may', AMJ: 'abr-jun', MJJ: 'may-jul', JJA: 'jun-ago', JAS: 'jul-sep', ASO: 'ago-oct', SON: 'sep-nov', OND: 'oct-dic', NDJ: 'nov-ene' };

// Mismos números que usa el mapa: 3 = amarillo, 4 = naranja, 5 = rojo.
var NIVEL = { minor: 2, moderate: 3, severe: 4, extreme: 5 };

/* ---------- funciones puras (sin servicios de Google) ---------- */

function idEvento(nombre) {
  var n = String(nombre || '').toLowerCase();
  if (n.indexOf('zonda') >= 0) return 47;
  if (n.indexOf('tormenta') >= 0) return 41;
  if (n.indexOf('lluvia') >= 0) return 37;
  if (n.indexOf('nev') >= 0) return 42;
  if (n.indexOf('viento') >= 0) return 39;
  // Números propios (el SMN no los publica): los mismos que SMN_EV en el sitio.
  if (n.indexOf('calor') >= 0) return 101;
  if (/fr\S{1,3}o\b/.test(n)) return 102;
  if (n.indexOf('niebla') >= 0 || n.indexOf('neblina') >= 0) return 103;
  if (n.indexOf('humo') >= 0) return 104;
  if (n.indexOf('polvo') >= 0) return 105;
  return 0;
}

function etiqueta(xml, tag) {
  var m = new RegExp('<(?:\\w+:)?' + tag + '[^>]*>([\\s\\S]*?)</(?:\\w+:)?' + tag + '>').exec(xml);
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}

// Devuelve los datos útiles de un mensaje CAP, o null si no sirve. horas = corrección a aplicar (si falta, AJUSTE_H).
function leerCap(xml, horas) {
  if (horas == null) horas = AJUSTE_H;
  var estado = etiqueta(xml, 'status'), tipo = etiqueta(xml, 'msgType');
  if (estado && estado !== 'Actual') return null;
  if (tipo === 'Cancel') return null;
  var nivel = NIVEL[etiqueta(xml, 'severity').toLowerCase()] || 0;
  var desde = new Date(etiqueta(xml, 'onset') || etiqueta(xml, 'effective') || etiqueta(xml, 'sent'));
  var hasta = new Date(etiqueta(xml, 'expires'));
  if (isNaN(desde) || isNaN(hasta)) return null;
  // El canal rotula las horas como -03:00 pero corresponden a UTC: se corrigen 3 horas (verificado contra el mapa del SMN el 6/10/2026).
  desde = new Date(desde.getTime() - horas * 3600000); hasta = new Date(hasta.getTime() - horas * 3600000);
  var poligonos = [], re = /<(?:\w+:)?polygon[^>]*>([\s\S]*?)<\/(?:\w+:)?polygon>/g, m;
  while ((m = re.exec(xml))) {
    var pts = m[1].trim().split(/\s+/).map(function (p) { var c = p.split(','); return [Number(c[0]), Number(c[1])]; })
      .filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); });
    if (pts.length >= 3) poligonos.push(pts);
  }
  // La hora de emisión viene con el mismo corrimiento que las demás.
  var env = new Date(etiqueta(xml, 'sent'));
  var enviado = isNaN(env) ? '' : new Date(env.getTime() - horas * 3600000).toISOString();
  // Lo que el SMN nombra en la descripción: 1 = granizo, 2 = ráfagas (se suman).
  var desc = etiqueta(xml, 'description').toLowerCase();
  var extra = (desc.indexOf('granizo') >= 0 ? 1 : 0) + (/r\S{1,3}faga/.test(desc) ? 2 : 0);   // la á puede llegar mal leída
  return { ev: idEvento(etiqueta(xml, 'event')), extra: extra, nivel: nivel, desde: desde, hasta: hasta, enviado: enviado, poligonos: poligonos };
}

// Control de la corrección de 3 horas. El SMN da sus alertas por franjas de 6 horas (0, 6, 12 y 18, hora argentina):
// corregido 3 horas, el comienzo de cada alerta tiene que caer en una de esas horas. Si la mayoría cae 3 horas antes (21, 3, 9 o 15),
// el canal ya viene con la hora bien y no hay que corregir. Con menos de 3 casos claros no se decide: sigue lo que se venía usando.
// caps = alertas leídas con la corrección de 3 horas; previo = horas usadas en la lectura anterior. Devuelve { alineadas, corridas, horas }.
function controlAjuste(caps, previo) {
  var alineadas = 0, corridas = 0;
  caps.forEach(function (c) {
    if (!c || c.desde.getTime() % 3600000) return;          // solo comienzos en hora justa
    var h = (c.desde.getUTCHours() + 21) % 24;              // hora argentina
    if (h % 6 === 0) alineadas++; else if (h % 6 === 3) corridas++;
  });
  var horas = corridas >= 3 && corridas > alineadas ? 0 : alineadas >= 3 && alineadas > corridas ? AJUSTE_H : (previo === 0 ? 0 : AJUSTE_H);
  return { alineadas: alineadas, corridas: corridas, horas: horas };
}

// Lee las alertas, decide la corrección horaria y arma el resultado con esa corrección.
function armarConAjuste(xmls, hoy, ahora, previo) {
  var caps = xmls.map(function (x) { return leerCap(x, AJUSTE_H); }), ajuste = controlAjuste(caps, previo);
  if (ajuste.horas !== AJUSTE_H) caps = xmls.map(function (x) { return leerCap(x, ajuste.horas); });
  var datos = armar(caps, hoy, ahora);
  datos.ajuste = ajuste;
  return datos;
}

// Un municipio entra en una alerta si la zona alertada cubre su punto central o alguno de sus puntos interiores.
function tocaMunicipio(m, poligonos) {
  var pts = [CENTROS[m]].concat(PUNTOS[m] || []);
  return poligonos.some(function (p) { return pts.some(function (q) { return dentro(q, p); }); });
}

function dentro(pt, pol) {
  var x = pt[1], y = pt[0], ok = false;
  for (var i = 0, j = pol.length - 1; i < pol.length; j = i++) {
    var xi = pol[i][1], yi = pol[i][0], xj = pol[j][1], yj = pol[j][0];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ok = !ok;
  }
  return ok;
}

function sumarDias(dia, n) {
  var d = new Date(dia + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Arma el JSON que lee el mapa. hoy = 'AAAA-MM-DD' en hora de Argentina; ahora = Date.
function armar(caps, hoy, ahora) {
  var fechas = [], alertas = {}, emitido = null, i, k;
  for (i = 0; i < DIAS; i++) fechas.push(sumarDias(hoy, i));
  for (i = 0; i < CENTROS.length; i++) alertas[i] = [];
  caps.forEach(function (c) {
    if (!c || c.nivel < 3 || !c.poligonos.length) return;
    var tocados = [];
    for (var m = 0; m < CENTROS.length; m++) {
      if (tocaMunicipio(m, c.poligonos)) tocados.push(m);
    }
    if (!tocados.length) return;
    if (c.enviado && (!emitido || new Date(c.enviado) > new Date(emitido))) emitido = c.enviado;
    fechas.forEach(function (dia) {
      // Franjas de 6 horas en hora de Argentina (UTC-3): madrugada, mañana, tarde, noche.
      var niveles = [0, 0, 0, 0], alguna = false;
      for (k = 0; k < 4; k++) {
        var ini = new Date(dia + 'T' + ('0' + k * 6).slice(-2) + ':00:00-03:00');
        var fin = new Date(ini.getTime() + 6 * 3600000);
        if (c.desde < fin && c.hasta > ini) { niveles[k] = c.nivel; alguna = true; }
      }
      if (!alguna) return;
      tocados.forEach(function (m) {
        var lista = alertas[m], prev = null;
        for (var q = 0; q < lista.length; q++) if (lista[q][0] === dia && lista[q][1] === c.ev) prev = lista[q];
        if (!prev) lista.push([dia, c.ev].concat(niveles, [c.extra || 0]));
        else { for (k = 0; k < 4; k++) prev[2 + k] = Math.max(prev[2 + k], niveles[k]); prev[6] = (prev[6] || 0) | (c.extra || 0); }
      });
    });
  });
  var areas = []; for (i = 0; i < CENTROS.length; i++) areas.push(i);
  return {
    fuente: 'SMN, canal CAP',
    emitido: emitido || ahora.toISOString(),
    capturado: ahora.toISOString().slice(0, 16) + ':00Z',
    fechas: fechas, areas: areas, alertas: alertas
  };
}

function enlacesDelCanal(texto) {
  var vistos = {}, out = [], re = /https?:\/\/ssl\.smn\.gob\.ar\/feeds\/CAP\/xml_generados\/[^"'<>\s)\]]+\.xml/g, m;
  while ((m = re.exec(texto))) if (!vistos[m[0]]) { vistos[m[0]] = 1; out.push(m[0]); }
  return out;
}

/* ---------- copia horaria de lluvia, ríos, Yacyretá y ONI (funciones puras) ---------- */

function urlLluvia(pts) {
  return 'https://api.open-meteo.com/v1/forecast?latitude=' + pts.map(function (p) { return p[0]; }).join(',') +
    '&longitude=' + pts.map(function (p) { return p[1]; }).join(',') +
    '&daily=precipitation_sum&past_days=7&forecast_days=7&timezone=America%2FArgentina%2FBuenos_Aires';
}

// Día en hora de Argentina (UTC-3, sin horario de verano) de una fecha con hora.
function diaAR(fecha) {
  var d = new Date(fecha);
  return isNaN(d) ? '' : new Date(d.getTime() - 3 * 3600000).toISOString().slice(0, 10);
}

// Lluvia de n puntos: { dias: [...], mm: [[...], ...] }, igual que la arma el sitio.
function normLluvia(j, n) {
  if (!Array.isArray(j) || j.length !== n) throw new Error('formato');
  var dias = j[0].daily.time;
  var mm = j.map(function (x) {
    var v = x.daily.precipitation_sum;
    if (!Array.isArray(v) || v.length !== dias.length) throw new Error('formato');
    if (v.filter(function (y) { return y == null; }).length > 3) throw new Error('faltan datos');
    return v.map(function (y) { return y == null ? 0 : Number(y); });
  });
  return { dias: dias, mm: mm };
}

// Río: una lectura por día (la última de cada día), sin valores imposibles.
function normRio(j) {
  var rows = (Array.isArray(j) ? j : (j && j.rows) || []).filter(function (r) {
    return r && r.valor != null && r.timestart && Number(r.valor) > -3 && Number(r.valor) < 12 && diaAR(r.timestart);
  }).sort(function (a, b) { return new Date(a.timestart) - new Date(b.timestart); });
  if (!rows.length) throw new Error('sin lecturas');
  var obs = [], pos = {};
  rows.forEach(function (r) {
    var dia = diaAR(r.timestart);
    if (pos[dia] == null) { pos[dia] = obs.length; obs.push([dia, Number(r.valor)]); } else obs[pos[dia]][1] = Number(r.valor);
  });
  var u = rows[rows.length - 1];
  return { obs: obs, act: u.timeupdate || null, hora: u.timestart };
}

// Pronóstico del INA para Barranqueras: por cada fecha, [día, mínimo, valor más probable, máximo] del rango previsto.
function normProno(j) {
  var q = { inferior: 1, medio: 2, superior: 3 }, pos = {}, filas = [];
  ((j && j.series) || []).forEach(function (s) {
    (s.pronosticos || []).forEach(function (p) {
      var v = Number(p.valor), dia = diaAR(p.timestart);
      if (p.valor == null || !(v > -3 && v < 12) || !dia) return;
      if (pos[dia] == null) { pos[dia] = filas.length; filas.push([dia, null, null, null]); }
      filas[pos[dia]][q[p.qualifier] || 2] = v;
    });
  });
  var p = filas.filter(function (r) { return r[2] != null; }).map(function (r) {
    var a = r[1] == null ? r[2] : r[1], c = r[3] == null ? r[2] : r[3];
    return [r[0], Math.min(a, r[2], c), r[2], Math.max(a, r[2], c)];
  }).sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
  if (!p.length || !j.forecast_date || isNaN(new Date(j.forecast_date))) throw new Error('sin pronóstico');
  return { emitido: j.forecast_date, p: p };
}

// Pronóstico del INA para el río Paraguay: una lista como la del Paraná para cada puerto que venga (Formosa y Puerto Pilcomayo).
function normPronoPy(j) {
  var out = { emitido: j && j.forecast_date }, hay = false;
  ((j && j.series) || []).forEach(function (s) {
    var k = PRONO_PY[s.series_id];
    if (!k) return;
    try { out[k] = normProno({ forecast_date: j.forecast_date, series: [s] }).p; hay = true; } catch (e) {}
  });
  if (!hay || isNaN(new Date(out.emitido))) throw new Error('sin pronóstico');
  return out;
}

// Lluvia medida: todas las estaciones de MEDIDA en un solo pedido, desde 4 días antes de ahora.
function urlMedida(ahora) {
  var h = function (ms) { return new Date(ms).toISOString().slice(0, 13) + ':00:00Z'; };
  return 'https://alerta.ina.gob.ar/a5/obs/puntual/observaciones?tipo=puntual&series_id=' + MEDIDA.map(function (m) { return m[0]; }).join(',') +
    '&timestart=' + h(ahora.getTime() - 97 * 3600000) + '&timeend=' + h(ahora.getTime() + 3600000);
}

// Distancia en km entre dos puntos [lat, lon] (alcanza para distancias cortas).
function km(a, b) {
  var r = Math.PI / 180, x = (b[1] - a[1]) * r * Math.cos((a[0] + b[0]) / 2 * r), y = (b[0] - a[0]) * r;
  return 6371 * Math.sqrt(x * x + y * y);
}

// Controles de la lluvia medida (probados con enero a marzo de 2026 y con el último mes):
var MEDIDA_MAX = 150;      // mm: una lectura suelta mayor se descarta por imposible
var MEDIDA_VECINAS = 50;   // km: estaciones vecinas para comparar

// Cada lectura es la lluvia caída desde la lectura anterior. Por estación: lo caído en las 24 horas y en los 3 días
// anteriores a su última lectura. Solo entran las estaciones con una lectura de las últimas 24 horas.
// Controles (las vecinas son las que están a menos de MEDIDA_VECINAS km y tienen lecturas hasta la misma hora):
//  - Se descarta la estación que marcó 0 en 3 días mientras al menos dos vecinas midieron 10 mm o más: suele ser un pluviómetro trabado.
//  - Aviso 1: faltan lecturas en las últimas 24 horas (menos de las tres cuartas partes de las que suele mandar). Puede haber llovido más.
//  - Aviso 2: midió 20 mm o más en 24 horas y todas las vecinas (al menos dos) menos de la quinta parte. Puede ser una tormenta muy local o un error.
// Devuelve { e: [[nombre, lat, lon, última lectura, mm en 24 h, mm en 3 días, avisos], ...] (de norte a sur), dudosas: [[nombre, motivo], ...] }.
function normMedida(j, ahora) {
  if (!Array.isArray(j)) throw new Error('formato');
  var H = 3600000, por = {}, est = [], e = [], dudosas = [];
  j.forEach(function (o) {
    var v = Number(o && o.valor), t = new Date(o && o.timestart);
    if (!o || o.valor == null || !(v >= 0 && v <= MEDIDA_MAX) || isNaN(t) || t > ahora.getTime() + H) return;
    (por[o.series_id] = por[o.series_id] || {})[t.getTime()] = v;   // una lectura repetida cuenta una sola vez
  });
  MEDIDA.forEach(function (m) {
    var s = por[m[0]];
    if (!s) return;
    var obs = Object.keys(s).map(function (t) { return [Number(t), s[t]]; }).sort(function (a, b) { return a[0] - b[0]; });
    var u = obs[obs.length - 1][0];
    if (ahora - u <= 24 * H) est.push({ m: m, obs: obs, u: u });
  });
  var suma = function (obs, desde, hasta) { return obs.reduce(function (a, x) { return a + (x[0] > desde && x[0] <= hasta ? x[1] : 0); }, 0); };
  var redondo = function (v) { return Math.round(v * 10) / 10; };
  var vecinas = function (a) {
    return est.filter(function (b) { return b !== a && !b.dudosa && b.u >= a.u - 3 * H && km([a.m[2], a.m[3]], [b.m[2], b.m[3]]) <= MEDIDA_VECINAS; });
  };
  // Primero se descartan los pluviómetros trabados en 0, para que no cuenten como vecinas en el otro control.
  est.forEach(function (a) {
    var u = a.u, v72 = vecinas(a).map(function (b) { return suma(b.obs, u - 72 * H, u); });
    if (suma(a.obs, u - 72 * H, u) === 0 && v72.filter(function (v) { return v >= 10; }).length >= 2) a.dudosa = true;
  });
  est.forEach(function (a) {
    if (a.dudosa) { dudosas.push([a.m[1], 'marcó 0 en 3 días y las vecinas midieron lluvia']); return; }
    var u = a.u, s24 = suma(a.obs, u - 24 * H, u), s72 = suma(a.obs, u - 72 * H, u);
    var v24 = vecinas(a).map(function (b) { return suma(b.obs, u - 24 * H, u); });
    var pasos = a.obs.slice(1).map(function (x, i) { return (x[0] - a.obs[i][0]) / H; }).sort(function (x, y) { return x - y; });
    var paso = pasos.length ? Math.max(1, pasos[Math.floor(pasos.length / 2)]) : 1;
    var n24 = a.obs.filter(function (x) { return x[0] > u - 24 * H; }).length, avisos = 0;
    if (n24 < 0.75 * 24 / paso) avisos |= 1;
    if (s24 >= 20 && v24.length >= 2 && Math.max.apply(null, v24) < s24 / 5) avisos |= 2;
    e.push([a.m[1], a.m[2], a.m[3], new Date(u).toISOString(), redondo(s24), redondo(s72), avisos]);
  });
  if (!e.length) throw new Error('ninguna estación con lecturas de las últimas 24 horas');
  e.sort(function (a, b) { return b[1] - a[1]; });
  return { e: e, dudosas: dudosas };
}

// Lo que suelta la represa de Yacyretá (serie 937 del INA, m³/s): una lectura por día (la última), redondeada, sin valores imposibles.
function normYacy(j) {
  var rows = (Array.isArray(j) ? j : (j && j.rows) || []).filter(function (r) {
    var v = Number(r && r.valor);
    return r && r.valor != null && r.timestart && v > 0 && v < 100000 && diaAR(r.timestart);
  }).sort(function (a, b) { return new Date(a.timestart) - new Date(b.timestart); });
  if (!rows.length) throw new Error('sin lecturas');
  var obs = [], pos = {};
  rows.forEach(function (r) {
    var dia = diaAR(r.timestart), v = Math.round(Number(r.valor));
    if (pos[dia] == null) { pos[dia] = obs.length; obs.push([dia, v]); } else obs[pos[dia]][1] = v;
  });
  return { obs: obs, hora: rows[rows.length - 1].timestart };
}

// Tabla ONI de la NOAA (texto con columnas SEAS YR TOTAL ANOM): devuelve los últimos 6 trimestres.
function leerOni(texto) {
  var v = [], re = /^\s*([A-Z]{3})\s+(\d{4})\s+-?\d+(?:\.\d+)?\s+(-?\d+(?:\.\d+)?)\s*$/gm, m;
  while ((m = re.exec(texto))) if (TRIM[m[1]] && Math.abs(Number(m[3])) < 5) v.push([m[2], TRIM[m[1]], Number(m[3])]);
  if (v.length < 6) throw new Error('formato');
  return { v: v.slice(-6) };
}

// Qué se pide y cómo se lee. hoy = 'AAAA-MM-DD' en hora de Argentina.
// Serie del INA, últimos 30 días. Alturas: 20 = Paraná en Barranqueras, 58 = Paraguay en Puerto Bermejo, 6697 = Bermejo en El Colorado.
// Caudal: 937 = lo que suelta la represa de Yacyretá.
function serieINA(n, hoy) {
  return 'https://alerta.ina.gob.ar/a5/obs/puntual/series/' + n + '/observaciones?timestart=' + sumarDias(hoy, -30) + '&timeend=' + sumarDias(hoy, 2) + '&format=json';
}

function fuentesExtra(hoy, ahora) {
  var json = function (f) { return function (t) { return f(JSON.parse(t)); }; };
  ahora = ahora || new Date();
  return [
    { k: 'lluvia', url: urlLluvia(LOCS), leer: json(function (j) { return normLluvia(j, LOCS.length); }) },
    { k: 'municipios', url: urlLluvia(CENTROS), leer: json(function (j) { return normLluvia(j, CENTROS.length); }) },
    { k: 'rio', url: serieINA(20, hoy), leer: json(normRio) },
    { k: 'paraguay', url: serieINA(58, hoy), leer: json(normRio) },
    { k: 'bermejo', url: serieINA(6697, hoy), leer: json(normRio) },
    { k: 'prono', url: 'https://alerta.ina.gob.ar/a5/sim/calibrados/289/corridas/last?estacion_id=20&includeProno=true', leer: json(normProno) },
    { k: 'pronoPy', url: 'https://alerta.ina.gob.ar/a5/sim/calibrados/312/corridas/last?includeProno=true', leer: json(normPronoPy) },
    { k: 'medida', url: urlMedida(ahora), leer: json(function (j) { return normMedida(j, ahora); }) },
    { k: 'yacy', url: serieINA(937, hoy), leer: json(normYacy) },
    { k: 'oni', url: 'https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt', leer: leerOni }
  ];
}

// Pide cada fuente por separado. Si una falla, queda la copia anterior (con su hora) y se anota el error.
// pedir(url) devuelve { codigo, texto }.
function leerExtras(hoy, ahora, previo, pedir) {
  var out = {}, errores = {};
  fuentesExtra(hoy, ahora).forEach(function (f) {
    try {
      var r = pedir(f.url);
      if (r.codigo !== 200) throw new Error('HTTP ' + r.codigo);
      var d = f.leer(r.texto);
      d.t = ahora.toISOString();
      out[f.k] = d;
    } catch (e) {
      errores[f.k] = String(e.message || e);
      if (previo && previo[f.k]) out[f.k] = previo[f.k];
    }
  });
  out.errores = errores;
  return out;
}

// Qué hacer con el correo de aviso de la lluvia. t = hora de la última copia; avisado = si ya se mandó el correo por esta caída.
// Devuelve 'avisar' (mandar el correo), 'limpiar' (la lluvia volvió: se puede volver a avisar la próxima vez) o ''.
function decidirAviso(t, ahora, avisado) {
  var d = new Date(t);
  if (isNaN(d)) return '';
  var viejo = ahora - d > HORAS_AVISO * 3600000;
  return viejo && !avisado ? 'avisar' : !viejo && avisado ? 'limpiar' : '';
}

/* ---------- avisos al celular: funciones puras ---------- */
// Avisos por alertas del SMN (decididos por Mariano el 5/11/2026). Los manda Firebase Cloud Messaging (FCM) con temas:
// cada celular está anotado en un solo tema de su localidad: m<n> (naranja y roja), m<n>a (también amarillas),
// m<n>n (naranja y roja, también de noche) o m<n>an (todo, también de noche). n = número del municipio (0 a 69).
// Firebase guarda quién está en cada tema: este script no guarda celulares, solo qué alerta ya avisó (propiedades "av").
// De noche (22 a 7 h), quien no pidió avisos de noche recibe en el momento solo lo que rige hoy o empieza en la madrugada
// siguiente (de 0 a 6 h); lo demás le llega a las 7. Las alertas salen del mismo resultado que el mapa (alertas[municipio]).
var FCM_PROYECTO = 'rios-y-clima-chaco';
var SITIO = 'https://panel-alertas-chaco.netlify.app/';
var TOPE_PEDIDOS = 3000;   // pedidos por día a la dirección para anotarse (doPost): cuida la cuota diaria del script
var MUNICIPIOS = ["Avia Terai","Barranqueras","Basail","Campo Largo","Capitán Solari","Charadai","Charata","Chorotis","Ciervo Petiso","Colonia Aborigen","Colonia Benítez","Colonia Elisa","Colonia Popular","Colonias Unidas","Concepción del Bermejo","Coronel Du Graty","Corzuela","Cote Lai","El Sauzalito","Enrique Urién","Fontana","Fuerte Esperanza","Gancedo","General Capdevila","General Pinedo","General San Martín","General Vedia","Hermoso Campo","Isla del Cerrito","Juan José Castelli","La Clotilde","La Eduvigis","La Escondida","La Leonesa","La Tigra","La Verde","Laguna Blanca","Laguna Limpia","Lapachito","Las Breñas","Las Garcitas","Las Palmas","Los Frentones","Machagai","Makallé","Margarita Belén","Miraflores","Misión Nueva Pompeya","Napenay","Pampa Almirón","Pampa del Indio","Pampa del Infierno","Presidencia de la Plaza","Presidencia Roca","Presidencia Roque Sáenz Peña","Puerto Bermejo","Puerto Eva Perón","Puerto Tirol","Puerto Vilelas","Quitilipi","Resistencia","Samuhú","San Bernardo","Santa Sylvina","Taco Pozo","Tres Isletas","Villa Ángela","Villa Berthet","Villa Río Bermejito","El Espinillo"];
// Nombre de cada fenómeno: los mismos que SMN_EV en el sitio.
var EV_NOMBRE = { 41: 'tormentas', 37: 'lluvias', 42: 'nevadas', 39: 'viento', 47: 'viento zonda', 101: 'calor extremo', 102: 'frío extremo', 103: 'niebla', 104: 'humo', 105: 'polvo' };
var COLOR_AVISO = { 3: 'amarilla', 4: 'naranja', 5: 'roja' };
var SUFIJOS = ['', 'a', 'n', 'an'];

function temaAviso(m, amarilla, noche) { return 'm' + m + (amarilla ? 'a' : '') + (noche ? 'n' : ''); }
function temaValido(t) { return typeof t === 'string' && /^m([0-9]|[1-6][0-9])a?n?$/.test(t); }
function esNoche(hora) { return hora >= 22 || hora < 7; }

// Alertas del resultado del mapa que se pueden avisar: amarilla o más, de hoy y los 2 días siguientes (como el sitio).
// Clave: municipio|día|fenómeno. urgente = rige hoy o empieza en la madrugada de mañana (de 0 a 6 h): sale aunque sea de noche.
function alertasParaAvisar(alertas, hoy) {
  var dias = [hoy, sumarDias(hoy, 1), sumarDias(hoy, 2)], out = {};
  Object.keys(alertas || {}).forEach(function (m) {
    if (!(+m >= 0 && +m < MUNICIPIOS.length)) return;
    (alertas[m] || []).forEach(function (a) {
      var i = dias.indexOf(a[0]); if (i < 0) return;
      var niv = Math.max(a[2] || 0, a[3] || 0, a[4] || 0, a[5] || 0); if (niv < 3) return;
      out[m + '|' + a[0] + '|' + a[1]] = { m: +m, dia: a[0], ev: a[1], nivel: niv, extra: a[6] || 0, franjas: [a[2] || 0, a[3] || 0, a[4] || 0, a[5] || 0], urgente: i === 0 || (i === 1 && a[2] >= 3) };
    });
  });
  return out;
}

// Decide qué avisar. estado = lo ya avisado {clave: [nivel avisado de día, nivel avisado a los de noche]} o null (primera vez).
// Avisa cuando una alerta es nueva o sube de nivel. La primera vez solo marca lo que ya estaba, sin mandar nada.
// Devuelve { mensajes: [{ m, temas, items, marcas }], estado } (estado sin lo de los mensajes: se marca con aplicarMarcas si salieron bien).
function decidirAvisos(alertas, hoy, hora, estado) {
  var act = alertasParaAvisar(alertas, hoy), noche = esNoche(hora), primera = !estado, base = {}, porMun = {}, k;
  estado = estado || {};
  for (k in estado) if (k.split('|')[1] >= hoy) base[k] = estado[k].slice();   // los días que ya pasaron se olvidan
  Object.keys(act).sort().forEach(function (k) {
    var a = act[k], ya = base[k] || [0, 0];
    if (primera) { base[k] = [a.nivel, a.nivel]; return; }
    var deDia = a.nivel > ya[0] && (!noche || a.urgente), deNoche = a.nivel > ya[1];
    if (!base[k]) base[k] = [0, 0];
    SUFIJOS.forEach(function (s) {
      var n = s.indexOf('n') >= 0;
      if (!(n ? deNoche : deDia) || (a.nivel < 4 && s.indexOf('a') < 0)) return;   // amarilla: solo a quienes la pidieron
      ((porMun[a.m] = porMun[a.m] || {})[s] = porMun[a.m][s] || []).push(k);
    });
  });
  var mensajes = [];
  Object.keys(porMun).forEach(function (m) {
    var grupos = {};   // temas que reciben exactamente lo mismo van en un solo mensaje
    SUFIJOS.forEach(function (s) { var l = porMun[m][s]; if (!l) return; var g = l.join(','); (grupos[g] = grupos[g] || []).push(s); });
    Object.keys(grupos).forEach(function (g) {
      var sufs = grupos[g], claves = g.split(','), marcas = [];
      claves.forEach(function (c) {
        if (sufs.some(function (s) { return s.indexOf('n') < 0; })) marcas.push([c, 0, act[c].nivel]);
        if (sufs.some(function (s) { return s.indexOf('n') >= 0; })) marcas.push([c, 1, act[c].nivel]);
      });
      mensajes.push({ m: +m, temas: sufs.map(function (s) { return 'm' + m + s; }), items: claves.map(function (c) { return act[c]; }), marcas: marcas });
    });
  });
  return { mensajes: mensajes, estado: base };
}

// Marca lo avisado por los mensajes que salieron bien. Si una alerta iba en un mensaje que falló, no se marca: se reintenta en la hora siguiente.
function aplicarMarcas(estado, mensajes, ok) {
  var fallo = {};
  mensajes.forEach(function (x, i) { if (!ok[i]) x.marcas.forEach(function (q) { fallo[q[0] + '#' + q[1]] = 1; }); });
  mensajes.forEach(function (x, i) {
    if (!ok[i]) return;
    x.marcas.forEach(function (q) { if (fallo[q[0] + '#' + q[1]]) return; var e = estado[q[0]] = estado[q[0]] || [0, 0]; e[q[1]] = Math.max(e[q[1]], q[2]); });
  });
  Object.keys(estado).forEach(function (k) { if (!estado[k][0] && !estado[k][1]) delete estado[k]; });
  return estado;
}

var FRANJA_TXT = ['de madrugada', 'a la mañana', 'a la tarde', 'a la noche'];
var DIA_SEM = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function lista(p) { return p.length < 2 ? p.join('') : p.slice(0, -1).join(', ') + ' y ' + p[p.length - 1]; }
// "hoy a la tarde y a la noche", "mañana todo el día", "el sábado 7/11 de madrugada"
function cuandoAviso(a, hoy) {
  var d = a.dia === hoy ? 'hoy' : a.dia === sumarDias(hoy, 1) ? 'mañana' : 'el ' + DIA_SEM[new Date(a.dia + 'T12:00:00Z').getUTCDay()] + ' ' + (+a.dia.slice(8)) + '/' + (+a.dia.slice(5, 7));
  var f = []; a.franjas.forEach(function (n, i) { if (n >= 3) f.push(FRANJA_TXT[i]); });
  return d + (f.length === 4 ? ' todo el día' : f.length ? ' ' + lista(f) : '');
}
function fenomeno(a) {
  var x = [], f = EV_NOMBRE[a.ev];
  if (a.extra & 1) x.push('posible granizo'); if (a.extra & 2) x.push('ráfagas');
  return (f ? ' por ' + f : '') + (x.length ? ' con ' + lista(x) : '');
}
// Texto del aviso: título corto y una línea por alerta, de la más grave a la más leve.
function textoAviso(m, items, hoy) {
  var l = items.slice().sort(function (a, b) { return b.nivel - a.nivel || (a.dia < b.dia ? -1 : a.dia > b.dia ? 1 : 0); }), mun = MUNICIPIOS[m];
  var titulo = l.length === 1 ? 'Alerta ' + COLOR_AVISO[l[0].nivel] + fenomeno(l[0]).replace(/ con .*/, '') + ' en ' + mun : 'Alertas del SMN en ' + mun;
  var cuerpo = l.map(function (a) { var c = COLOR_AVISO[a.nivel]; return c.charAt(0).toUpperCase() + c.slice(1) + fenomeno(a) + ': ' + cuandoAviso(a, hoy) + '.'; }).join('\n');
  return { titulo: titulo, cuerpo: cuerpo + '\nTocá para ver qué hacer.' };
}
// Mensaje para la API de FCM (v1). Varios temas van con una condición: Firebase no repite el aviso a quien está en más de uno.
// Al tocarlo se abre el sitio (o la app) en esa localidad: ?loc=<n>.
function mensajeFcm(x, hoy) {
  var t = textoAviso(x.m, x.items, hoy), msg = {
    notification: { title: t.titulo, body: t.cuerpo },
    data: { loc: String(x.m) },
    webpush: {
      headers: { Urgency: 'high', TTL: '43200' },
      notification: { icon: SITIO + 'iconos/icono-192.png', tag: 'smn-' + x.m, renotify: true, lang: 'es' },
      fcm_options: { link: SITIO + '?loc=' + x.m }
    }
  };
  if (x.temas.length === 1) msg.topic = x.temas[0];
  else msg.condition = x.temas.map(function (t) { return "'" + t + "' in topics"; }).join(' || ');
  return { message: msg };
}

// Revisa un pedido de la página para anotarse o borrarse. Devuelve { error } o el pedido limpio.
// q = { accion: 'alta' | 'baja', id: identificador que entrega Firebase, tema: 'm<n>[a][n]', antes: tema anterior (opcional) }
function revisarPedido(q) {
  if (!q || typeof q !== 'object') return { error: 'formato' };
  if (q.accion !== 'alta' && q.accion !== 'baja') return { error: 'accion' };
  if (typeof q.id !== 'string' || !/^[A-Za-z0-9_:-]{20,400}$/.test(q.id)) return { error: 'id' };
  if (!temaValido(q.tema)) return { error: 'tema' };
  if (q.antes != null && q.antes !== '' && !temaValido(q.antes)) return { error: 'antes' };
  return { accion: q.accion, id: q.id, tema: q.tema, antes: q.antes && q.antes !== q.tema ? q.antes : '' };
}
// Pedidos a Firebase para cumplir el pedido: anotar en el tema nuevo y borrar del anterior (o borrar, en la baja).
function pedidosTemas(v) {
  var base = 'https://fcm.googleapis.com/v1/projects/' + FCM_PROYECTO + '/registrations/' + encodeURIComponent(v.id) + '/topicSubscriptions';
  var l = [];
  if (v.accion === 'alta') l.push({ url: base + '?topicName=' + v.tema, method: 'post' });
  var borrar = v.accion === 'alta' ? v.antes : v.tema;
  if (borrar) l.push({ url: base + '/' + borrar + '?allowMissing=true', method: 'delete' });
  return l;
}
// Cuenta un pedido del día. cuenta = 'AAAA-MM-DD|n' guardado. Devuelve { cuenta, paso } (paso = false si ya se llegó al tope).
function contarPedido(cuenta, hoy) {
  var p = String(cuenta || '').split('|'), n = p[0] === hoy ? +p[1] || 0 : 0;
  if (n >= TOPE_PEDIDOS) return { cuenta: hoy + '|' + n, paso: false };
  return { cuenta: hoy + '|' + (n + 1), paso: true };
}

/* ---------- parte que usa los servicios de Google ---------- */

function pedirUrl(url) {
  var r = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  return { codigo: r.getResponseCode(), texto: r.getContentText() };
}

// Corrección usada en la lectura anterior (para cuando no hay casos suficientes para decidir).
function horasPrevias() {
  try { return JSON.parse(leerGuardado() || '{}').ajuste.horas; } catch (e) { return null; }
}

// Lee el canal del SMN y arma las alertas. Da error si el canal no responde bien.
function leerSmn(hoy, ahora) {
  var r = UrlFetchApp.fetch(FEED, { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) throw new Error('El canal del SMN respondió ' + r.getResponseCode());
  var texto = r.getContentText();
  if (texto.indexOf('CAP') < 0) throw new Error('El canal del SMN no devolvió un listado de alertas.');
  var urls = enlacesDelCanal(texto), xmls = [], fallas = 0;
  for (var i = 0; i < urls.length; i += 40) {
    var tanda = UrlFetchApp.fetchAll(urls.slice(i, i + 40).map(function (u) { return { url: u, muteHttpExceptions: true }; }));
    tanda.forEach(function (x) { if (x.getResponseCode() === 200) xmls.push(x.getContentText()); else fallas++; });
  }
  // Si falló más de la cuarta parte, no se pisa el dato anterior: podría faltar justo una alerta del Chaco.
  if (urls.length && fallas > urls.length / 4) throw new Error('No se pudieron leer ' + fallas + ' de ' + urls.length + ' alertas.');
  var datos = armarConAjuste(xmls, hoy, ahora, horasPrevias());
  datos.leidas = urls.length; datos.fallas = fallas;
  if (datos.ajuste.horas !== AJUSTE_H) console.warn('El canal del SMN ya no viene corrido: las horas se usan sin corregir.');
  return datos;
}

// Junta las alertas con la copia horaria de las demás fuentes. Ninguna de las dos partes impide guardar la otra:
// si el canal del SMN falla, quedan las alertas anteriores (con su hora de lectura) y lluvia, ríos, Yacyretá y ONI se renuevan igual.
// leer(hoy, ahora) devuelve las alertas o da error; pedir(url) devuelve { codigo, texto }.
function juntar(anterior, hoy, ahora, leer, pedir) {
  var falla = null, datos;
  anterior = anterior || {};
  try { datos = leer(hoy, ahora); } catch (e) { falla = e; datos = anterior; delete datos.error; }
  var previo = anterior.datos || {};
  try { datos.datos = leerExtras(hoy, ahora, previo, pedir); } catch (e) { datos.datos = previo; }
  return { datos: datos, falla: falla };
}

// El robot de GitHub se lanza después de guardar: así copia a la rama "datos" el resultado recién armado (servidor.json),
// que es lo que leen primero las visitas. Su estado se guarda en una segunda pasada (solo cambia ese campo).
function actualizar() {
  var ahora = new Date(), hoy = Utilities.formatDate(ahora, TZ, 'yyyy-MM-dd'), anterior = {};
  try { anterior = JSON.parse(leerGuardado() || '{}'); } catch (e) {}
  var r = juntar(anterior, hoy, ahora, leerSmn, pedirUrl);
  var antes = (anterior.robot && anterior.robot.estado) || 'sin dato';
  r.datos.robot = { t: ahora.toISOString(), estado: antes };
  guardar(JSON.stringify(r.datos));
  var robot;
  try { robot = lanzarRobot(); } catch (e) { robot = 'error al lanzar'; console.warn('Robot: ' + (e.message || e)); }   // nunca frena la renovación
  if (robot !== antes) { r.datos.robot.estado = robot; guardar(JSON.stringify(r.datos)); }
  try { avisarLluvia(ahora, robot); } catch (e) { console.warn('Aviso de la lluvia: ' + (e.message || e)); }   // nunca frena la renovación
  // Avisos al celular por alertas del SMN: solo con el canal recién leído (si falló, no se avisa con datos viejos).
  if (!r.falla) { try { console.log('Avisos al celular: ' + avisarAlertas(r.datos, ahora)); } catch (e) { console.warn('Avisos al celular: ' + (e.message || e)); } }   // nunca frena la renovación
  if (r.falla) throw r.falla;   // el fallo del canal queda en el registro de ejecuciones de Google
  return r.datos;
}

// Guarda el resultado en partes (p0, p1, ...). Solo toca esas propiedades: la clave de GitHub queda como está.
function guardar(json) {
  var p = PropertiesService.getScriptProperties(), n = Math.ceil(json.length / 8000), todo = { partes: String(n) };
  var antes = Number(p.getProperty('partes') || 0);
  for (var i = 0; i < n; i++) todo['p' + i] = json.substr(i * 8000, 8000);
  p.setProperties(todo, false);
  for (i = n; i < antes; i++) p.deleteProperty('p' + i);   // partes que sobran de un guardado más largo
}

function leerGuardado() {
  var p = PropertiesService.getScriptProperties().getProperties(), n = Number(p.partes || 0), s = '';
  for (var i = 0; i < n; i++) s += p['p' + i] || '';
  return s;
}

// Le pide a GitHub que ejecute ya el robot de la lluvia (.github/workflows/lluvia.yml).
// Devuelve 'bien', 'sin clave' o 'GitHub respondió <número>'. Ese texto se publica, así que no lleva el mensaje de GitHub:
// el detalle queda solo en el registro de ejecuciones. La clave nunca sale de este script.
function lanzarRobot() {
  var clave = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!clave) return 'sin clave';
  var r = UrlFetchApp.fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/lluvia.yml/dispatches', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + clave, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    payload: JSON.stringify({ ref: 'main' })
  });
  var c = r.getResponseCode();
  if (c === 204) return 'bien';
  console.warn('GitHub respondió ' + c + ': ' + r.getContentText().slice(0, 500));
  return 'GitHub respondió ' + c;
}

// Mira la copia de la lluvia que deja el robot. Si lleva más de HORAS_AVISO horas sin renovarse, manda un correo (uno solo por caída).
function avisarLluvia(ahora, robot) {
  var r = UrlFetchApp.fetch('https://raw.githubusercontent.com/' + REPO + '/datos/lluvia.json', { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return '';
  var t = JSON.parse(r.getContentText()).datos.lluvia.t, p = PropertiesService.getScriptProperties();
  var que = decidirAviso(t, ahora, p.getProperty('avisoLluvia') === '1');
  if (que === 'limpiar') p.deleteProperty('avisoLluvia');
  if (que === 'avisar') {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Ríos y Clima del Chaco: la lluvia no se renueva',
      'La última copia de la lluvia es del ' + Utilities.formatDate(new Date(t), TZ, 'd/M HH:mm') + ' h (hora argentina): lleva más de ' + HORAS_AVISO + ' horas sin renovarse.\n\n' +
      'Estado del robot al lanzarlo: ' + robot + '\n\n' +
      'Qué mirar: en GitHub, pestaña Actions, tarea "Lluvia". Si el estado no dice "bien", revisar la clave GITHUB_TOKEN en las propiedades del script.\n' +
      'https://github.com/' + REPO + '/actions\n\nEste correo se manda una sola vez. Cuando la lluvia vuelva a renovarse, el aviso queda listo para la próxima.');
    p.setProperty('avisoLluvia', '1');
  }
  return que;
}

/* ---------- avisos al celular: parte que usa los servicios de Google ---------- */
// El script está vinculado al proyecto de Firebase (Configuración del proyecto > Proyecto de Google Cloud: 755067985516),
// así que habla con Firebase con su propio permiso (ScriptApp.getOAuthToken, permiso firebase.messaging de appsscript.json):
// no hay ninguna clave secreta guardada. Para apagar los avisos sin tocar el código: propiedad del script AVISOS = no.

// Guarda un texto largo en partes (<nombre>0, <nombre>1, ... y <nombre>n con la cantidad): cada propiedad admite hasta 9 KB.
function guardarPartes(nombre, texto) {
  var p = PropertiesService.getScriptProperties(), n = Math.ceil(texto.length / 8000) || 1, todo = {};
  var antes = Number(p.getProperty(nombre + 'n') || 0);
  todo[nombre + 'n'] = String(n);
  for (var i = 0; i < n; i++) todo[nombre + i] = texto.substr(i * 8000, 8000);
  p.setProperties(todo, false);
  for (i = n; i < antes; i++) p.deleteProperty(nombre + i);
}
function leerPartes(nombre) {
  var p = PropertiesService.getScriptProperties().getProperties(), n = Number(p[nombre + 'n'] || 0), s = '';
  for (var i = 0; i < n; i++) s += p[nombre + i] || '';
  return s;
}

// Manda los mensajes a Firebase en tandas. Devuelve el código de respuesta de cada uno (200 = salió).
function mandarAvisos(mensajes, hoy) {
  var url = 'https://fcm.googleapis.com/v1/projects/' + FCM_PROYECTO + '/messages:send', clave = ScriptApp.getOAuthToken(), cods = [];
  for (var i = 0; i < mensajes.length; i += 40) {
    UrlFetchApp.fetchAll(mensajes.slice(i, i + 40).map(function (x) {
      return { url: url, method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        headers: { Authorization: 'Bearer ' + clave }, payload: JSON.stringify(mensajeFcm(x, hoy)) };
    })).forEach(function (r) {
      var c = r.getResponseCode(); cods.push(c);
      if (c !== 200) console.warn('Firebase respondió ' + c + ': ' + r.getContentText().slice(0, 300));
    });
  }
  return cods;
}

// Se llama en cada renovación, solo si el canal del SMN se leyó bien. Compara con lo ya avisado y manda lo nuevo.
// Si Firebase falla, manda un correo (uno solo por caída) y reintenta en la hora siguiente.
function avisarAlertas(datos, ahora) {
  var p = PropertiesService.getScriptProperties();
  if (p.getProperty('AVISOS') === 'no') return 'apagados';
  var hoy = Utilities.formatDate(ahora, TZ, 'yyyy-MM-dd'), hora = Number(Utilities.formatDate(ahora, TZ, 'H'));
  var txt = leerPartes('av'), estado = null;
  if (txt) try { estado = JSON.parse(txt); } catch (e) { estado = null; }
  var d = decidirAvisos(datos.alertas, hoy, hora, estado);
  var cods = d.mensajes.length ? mandarAvisos(d.mensajes, hoy) : [];
  var ok = cods.map(function (c) { return c === 200; }), fallas = ok.filter(function (x) { return !x; }).length;
  guardarPartes('av', JSON.stringify(aplicarMarcas(d.estado, d.mensajes, ok)));
  if (fallas && p.getProperty('avisoFcm') !== '1') {
    MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Ríos y Clima del Chaco: no salen los avisos al celular',
      'Firebase rechazó ' + fallas + ' de ' + cods.length + ' avisos (códigos: ' + cods.join(', ') + ').\n\n' +
      'El script vuelve a intentar en cada renovación. El detalle queda en el registro de ejecuciones (Ejecuciones, en el editor del script).\n' +
      'Qué mirar: que el script siga vinculado al proyecto de Firebase 755067985516 y que tenga el permiso de Firebase (ejecutar probarAviso()).\n\n' +
      'Este correo se manda una sola vez por caída.');
    p.setProperty('avisoFcm', '1');
  } else if (!fallas && cods.length) p.deleteProperty('avisoFcm');
  return (estado ? '' : 'primera vez: ') + d.mensajes.length + ' avisos, ' + fallas + ' con falla';
}

// Dirección para anotarse (la usa el botón "Avisarme" de la página). Recibe un JSON (ver revisarPedido) y responde { ok } o { ok: false, error }.
// Tope diario de pedidos (TOPE_PEDIDOS): si alguien llena la dirección de pedidos, no se gasta la cuota del script y el sitio se sigue renovando.
function doPost(e) {
  var r;
  try { r = anotar(JSON.parse(e.postData.contents)); } catch (x) { r = { ok: false, error: 'formato' }; }
  return ContentService.createTextOutput(JSON.stringify(r)).setMimeType(ContentService.MimeType.JSON);
}
function anotar(q) {
  var v = revisarPedido(q);
  if (v.error) return { ok: false, error: v.error };
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, error: 'ocupado' };
  try {
    var p = PropertiesService.getScriptProperties(), c = contarPedido(p.getProperty('pedidos'), Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'));
    if (!c.paso) return { ok: false, error: 'tope' };
    p.setProperty('pedidos', c.cuenta);
  } finally { lock.releaseLock(); }
  var clave = ScriptApp.getOAuthToken();
  var rs = UrlFetchApp.fetchAll(pedidosTemas(v).map(function (x) {
    return { url: x.url, method: x.method, muteHttpExceptions: true, headers: { Authorization: 'Bearer ' + clave } };
  }));
  var c0 = rs[0].getResponseCode();   // alta: 200 = anotado, 409 = ya estaba; baja: 200 = borrado
  if (c0 === 200 || (v.accion === 'alta' && c0 === 409)) return { ok: true };
  console.warn('Firebase respondió ' + c0 + ' al pedido de ' + v.accion + ': ' + rs[0].getContentText().slice(0, 300));
  return { ok: false, error: c0 === 400 || c0 === 404 ? 'id' : 'firebase' };
}

// Prueba: manda un aviso que dice "prueba" a quienes estén anotados en un municipio (por defecto, Resistencia),
// con cualquiera de las cuatro opciones. Sirve también para dar el permiso de Firebase la primera vez.
function probarAviso(m) {
  m = m == null ? MUNICIPIOS.indexOf('Resistencia') : m;
  var x = { m: m, temas: SUFIJOS.map(function (s) { return 'm' + m + s; }), items: [] }, j = mensajeFcm(x, '');
  j.message.notification = { title: 'Aviso de prueba de Ríos y Clima del Chaco', body: 'Si te llegó, los avisos funcionan. No es una alerta: no hay nada nuevo del SMN.' };
  var r = UrlFetchApp.fetch('https://fcm.googleapis.com/v1/projects/' + FCM_PROYECTO + '/messages:send', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, payload: JSON.stringify(j) });
  Logger.log('Aviso de prueba a ' + MUNICIPIOS[m] + ': Firebase respondió ' + r.getResponseCode() + ' ' + r.getContentText().slice(0, 300));
}

// Da el permiso de enviar correo (Google lo pide la primera vez) y manda uno de prueba a la cuenta dueña del script.
function probarCorreo() {
  var a = Session.getEffectiveUser().getEmail();
  MailApp.sendEmail(a, 'Ríos y Clima del Chaco: correo de prueba', 'Si llegó este correo, el aviso de la lluvia sin renovar va a funcionar.');
  Logger.log('Correo de prueba enviado a ' + a);
}

// Prueba de la clave: lanza el robot una vez y muestra qué respondió GitHub.
// Si dice 'bien', en un par de minutos aparece una corrida nueva en GitHub, pestaña Actions, tarea "Lluvia".
function probarRobot() {
  Logger.log('Robot de la lluvia: ' + lanzarRobot());
}

// Dirección pública: devuelve el último resultado guardado.
function doGet() {
  var json = leerGuardado();
  if (!json) { try { json = JSON.stringify(actualizar()); } catch (e) { json = JSON.stringify({ error: String(e.message || e) }); } }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

// Ejecutar una sola vez: primera lectura y renovación automática cada hora.
function instalar() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'actualizar') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('actualizar').timeBased().everyHours(1).create();
  var d = actualizar(), con = 0;
  for (var k in d.alertas) if (d.alertas[k].length) con++;
  Logger.log('Listo. Alertas leídas: ' + d.leidas + ' (fallaron ' + d.fallas + '). Municipios del Chaco con alerta: ' + con + ' de ' + CENTROS.length + '. Emitido: ' + d.emitido + '. Corrección de horas en uso: ' + d.ajuste.horas);
}

// Diagnóstico: muestra qué responde el canal del SMN a los servidores de Google.
function diagnostico() {
  var r = UrlFetchApp.fetch(FEED, { muteHttpExceptions: true });
  var t = r.getContentText();
  Logger.log('Código: ' + r.getResponseCode() + ' | tipo: ' + r.getHeaders()['Content-Type'] + ' | largo: ' + t.length + ' | enlaces CAP: ' + enlacesDelCanal(t).length);
  Logger.log('Inicio: ' + t.slice(0, 700));
}

// Diagnóstico de la copia horaria: muestra qué fuentes responden a los servidores de Google.
function diagnosticoDatos() {
  var ahora = new Date(), hoy = Utilities.formatDate(ahora, TZ, 'yyyy-MM-dd');
  var d = leerExtras(hoy, ahora, {}, pedirUrl);
  ['lluvia', 'municipios', 'rio', 'paraguay', 'bermejo', 'prono', 'pronoPy', 'medida', 'yacy', 'oni'].forEach(function (k) {
    Logger.log(k + ': ' + (d[k] ? 'bien' : 'FALLA: ' + d.errores[k]));
  });
  ['rio', 'paraguay', 'bermejo', 'yacy'].forEach(function (k) { if (d[k]) Logger.log('Última lectura (' + k + '): ' + JSON.stringify(d[k].obs[d[k].obs.length - 1])); });
  if (d.prono) Logger.log('Pronóstico del río (emitido ' + d.prono.emitido + '): ' + JSON.stringify(d.prono.p));
  if (d.pronoPy) Logger.log('Pronóstico del Paraguay (emitido ' + d.pronoPy.emitido + '): Formosa ' + JSON.stringify(d.pronoPy.formosa) + ' | Pilcomayo ' + JSON.stringify(d.pronoPy.pilcomayo));
  if (d.medida) {
    Logger.log('Lluvia medida: ' + d.medida.e.length + ' estaciones con datos. ' + d.medida.e.slice(0, 5).map(function (x) { return x[0] + ' ' + x[4] + ' mm'; }).join(', ') + '…');
    Logger.log('Con aviso: ' + (d.medida.e.filter(function (x) { return x[6]; }).map(function (x) { return x[0] + (x[6] & 1 ? ' (faltan lecturas)' : '') + (x[6] & 2 ? ' (mucho más que las vecinas)' : ''); }).join(', ') || 'ninguna') +
      '. Descartadas: ' + (d.medida.dudosas.map(function (x) { return x[0] + ' (' + x[1] + ')'; }).join(', ') || 'ninguna'));
  }
  if (d.oni) Logger.log('ONI: ' + JSON.stringify(d.oni.v));
}
