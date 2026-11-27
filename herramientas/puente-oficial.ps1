# Puente del nivel por municipio (25/11/2026). Ver README, "Puente del nivel por municipio".
# Desde una máquina en Argentina lee la ruta del Centro de Monitoreo y se la pasa al script de Google con la clave.
# La configuración NO está en el repositorio: privado\puente.json con { "fuente": "...", "script": ".../exec", "clave": "..." }.
# Lo corre una tarea programada de Windows. Anota el resultado en puente.log, al lado de puente.json (últimos 200 renglones).
# En otro equipo (27/11/2026: el de Windows que se turna con la Raspberry) se le pasa dónde está su configuración:
#   powershell -File puente-oficial.ps1 -Conf C:\puente\puente.json
param([string]$Conf = '')
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
if (-not $Conf) { $Conf = Join-Path (Split-Path -Parent $PSScriptRoot) 'privado\puente.json' }
$log = Join-Path (Split-Path -Parent $Conf) 'puente.log'
function Anotar($t) {
  $r = @(); if (Test-Path $log) { $r = @(Get-Content $log -Encoding UTF8 | Select-Object -Last 199) }
  $r += ((Get-Date -Format 'yyyy-MM-dd HH:mm') + '  ' + $t)
  Set-Content -Path $log -Value $r -Encoding UTF8
}
try {
  $c = Get-Content $Conf -Raw -Encoding UTF8 | ConvertFrom-Json
  $wc = New-Object Net.WebClient
  $wc.Encoding = [Text.Encoding]::UTF8
  $datos = $wc.DownloadString($c.fuente)
  $cuerpo = @{ accion = 'oficial'; clave = $c.clave; datos = $datos } | ConvertTo-Json -Compress
  $res = Invoke-RestMethod -Uri $c.script -Method Post -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($cuerpo)) -TimeoutSec 90
  Anotar ('bien: ' + ($res | ConvertTo-Json -Compress))
} catch {
  Anotar ('error: ' + $_.Exception.Message)
  exit 1
}
