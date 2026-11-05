# Biblioteca de Firebase (copia fija)

Copia sin cambios de `firebase-app-compat.js` y `firebase-messaging-compat.js` del paquete `firebase` **12.19.0** de npm
(solo se quitó la última línea, `//# sourceMappingURL=…`, para que el navegador no pida archivos que no están).
Licencia Apache 2.0, de Google (https://github.com/firebase/firebase-js-sdk).

La página la carga **solo** cuando alguien toca "Avisarme" o "Dejar de avisarme" (y una vez por semana, para quien está anotado,
para confirmar que su anotación sigue vigente). No se carga desde los servidores de Google: así la regla del navegador (CSP)
solo deja correr código del propio sitio.

Para actualizarla: `npm pack firebase@<versión>`, copiar esos dos archivos sin la línea `sourceMappingURL` y cambiar la versión acá
y en la prueba "avisos al celular: página" de `pruebas/reglas.test.js`.
