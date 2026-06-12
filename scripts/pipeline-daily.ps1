# Noodle Bowl daily content pipeline
# Runs: [ingest:researched?] -> [ingest?] -> select -> generate -> publish
#
# Smart research detection:
#   - Runs ingest:researched only when a .md file in pipeline/data/researched/
#     is newer than today's researched candidates file (or that file doesn't exist yet).
#   - If ingest:researched produces >= 20 candidates, skips the API ingest entirely
#     to conserve TheNewsAPI daily credits.
#
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

# --- Research detection ---
$todayStr        = (Get-Date).ToString('yyyy-MM-dd')
$researchedDir   = Join-Path $ProjectDir 'pipeline\data\researched'
$todayResearched = Join-Path $ProjectDir "pipeline\data\candidates\$todayStr-researched.json"

$hasNewResearch = $false
if (Test-Path $researchedDir) {
    $mdFiles = Get-ChildItem $researchedDir -Filter '*.md' -ErrorAction SilentlyContinue
    if ($mdFiles.Count -gt 0) {
        if (-not (Test-Path $todayResearched)) {
            $hasNewResearch = $true
            Write-Log "[research] No researched file for today - will ingest research"
        } else {
            $researchedMtime = (Get-Item $todayResearched).LastWriteTime
            $newer = $mdFiles | Where-Object { $_.LastWriteTime -gt $researchedMtime }
            if ($newer.Count -gt 0) {
                $hasNewResearch = $true
                Write-Log "[research] $($newer.Count) .md files newer than $todayStr-researched.json - will re-ingest research"
            } else {
                Write-Log "[research] No new .md files since last ingest - skipping ingest:researched"
            }
        }
    } else {
        Write-Log "[research] No .md files in researched/ - skipping ingest:researched"
    }
} else {
    Write-Log "[research] researched/ dir not found - skipping ingest:researched"
}

# Run researched ingest if new files detected
if ($hasNewResearch) {
    Run-Step 'ingest:researched' 'npm run pipeline:ingest:researched'
}

# Decide whether to run API ingest
$skipApiIngest = $false
if ($hasNewResearch -and (Test-Path $todayResearched)) {
    try {
        $researchedData = Get-Content $todayResearched -Raw -Encoding UTF8 | ConvertFrom-Json
        $count = $researchedData.candidates.Count
        if ($count -ge 20) {
            $skipApiIngest = $true
            Write-Log "[research] $count researched candidates available - skipping API ingest to conserve credits"
        } else {
            Write-Log "[research] Only $count researched candidates - running API ingest for more coverage"
        }
    } catch {
        Write-Log "[research] Could not read researched candidates file - running API ingest"
    }
}

if (-not $skipApiIngest) {
    Run-Step 'ingest' 'npm run pipeline:ingest'
} else {
    Write-Log '[ingest] skipped (sufficient researched candidates)'
}

Run-Step 'select'   'npm run pipeline:select'
Run-Step 'generate' 'npm run pipeline:generate'
Run-Step 'publish'  'npm run pipeline:publish -- --yes'

Write-Log 'Pipeline run complete'
