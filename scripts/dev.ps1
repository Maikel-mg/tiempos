# Arranca backend y frontend en paneles de Windows Terminal
$projectRoot = Split-Path -Parent $PSScriptRoot
wt --title "Importador Tiempos" -d $projectRoot cmd /c "npm run dev-backend" `; split-pane -H -d $projectRoot cmd /c "npm run web"
