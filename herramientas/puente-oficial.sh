#!/bin/sh
# Puente del nivel por municipio (25/11/2026), versión para un servidor Linux (VPS) en Argentina. Ver README.
# Lee la ruta del Centro de Monitoreo y se la pasa al script de Google con la clave. Necesita curl y python3.
# Configuración fuera del repositorio, en el archivo que se pasa como primer argumento (por defecto privado/puente.json):
#   { "fuente": "...", "script": ".../exec", "clave": "..." }
# Para correrlo cada hora a los :40 (crontab -e):  40 * * * * /ruta/puente-oficial.sh /ruta/puente.json >> /ruta/puente.log 2>&1
set -eu
CONF="${1:-$(dirname "$0")/../privado/puente.json}"
campo() { python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))[sys.argv[2]])' "$CONF" "$1"; }
TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT
curl -sS --fail --max-time 60 "$(campo fuente)" -o "$TMP"
python3 -c 'import json,sys; print(json.dumps({"accion":"oficial","clave":sys.argv[2],"datos":open(sys.argv[1],encoding="utf-8").read()}))' "$TMP" "$(campo clave)" > "$TMP.c"
R=$(curl -sS -L --max-time 90 -H 'Content-Type: application/json' --data-binary @"$TMP.c" "$(campo script)"); rm -f "$TMP.c"
echo "$(date '+%Y-%m-%d %H:%M')  $R"
case "$R" in *'"ok":true'*) exit 0 ;; *) exit 1 ;; esac
