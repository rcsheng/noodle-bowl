# Noodle Bowl daily content pipeline
# Runs: ingest -> select -> generate -> publish
# Scheduled via Windows Task Scheduler. Logs to pipeline/data/pipeline.log

$ProjectDir = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $ProjectDir 'pipeline\data'
$LogFile = Join-Path $LogDir 'pipeline.log'

function Write-Log($msg) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg"
    Write-Host $line
    if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
    Add-Content -Path $LogFile -Value $line
}

function Run-Step($name, $cmd) {
    Write-Log "[$name] starting"
    $output = cmd /c $cmd 2>&1
    $output | ForEach-Object { Write-Log "[$name]   $_" }
    if ($LASTEXITCODE -ne 0) {
        Write-Log "[$name] FAILED (exit $LASTEXITCODE) - pipeline aborted"
        exit 1
    }
    Write-Log "[$name] OK"
}

Set-Location $ProjectDir

Write-Log '==============================='
Write-Log 'Pipeline run started'
Write-Log '==============================='

Run-Step 'ingest'   'npm run pipeline:ingest'
Run-Step 'select'   'npm run pipeline:select'
Run-Step 'generate' 'npm run pipeline:generate'
Run-Step 'publish'  'npm run pipeline:publish -- --yes'

Write-Log 'Pipeline run complete'
