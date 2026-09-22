param(
    [switch]$SmokeTest
)

$ErrorActionPreference = 'Continue'

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $root

$py = Join-Path $root '.venv\Scripts\python.exe'
$front = Join-Path $root 'frontend'
$beUrl = 'http://127.0.0.1:8000/'
$feUrl = 'http://localhost:5173'
$bePid = $null
$fePid = $null

function Test-Running([string]$u) {
    try {
        $null = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 3
        return $true
    } catch {
        return $false
    }
}

Write-Host ''
Write-Host '================================' -ForegroundColor Cyan
Write-Host '        ParsePDF launcher' -ForegroundColor Cyan
Write-Host '================================' -ForegroundColor Cyan
Write-Host "Project folder: $root"

# ---------- preflight ----------
if (-not (Test-Path $py)) {
    Write-Host ''
    Write-Host 'ERROR: Python virtualenv is missing.' -ForegroundColor Red
    Write-Host "Looking for: $py"
    Write-Host 'Copy the whole project folder (including .venv) to this machine'
    Write-Host 'so both backend and frontend can start.'
    Read-Host 'Press Enter to exit'
    exit 1
}

$npmCmd = (Get-Command npm.cmd -ErrorAction SilentlyContinue).Source
if (-not $npmCmd) {
    $npmCmd = 'npm.cmd'
}
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    Write-Host ''
    Write-Host 'ERROR: Node.js is not installed or not on PATH.' -ForegroundColor Red
    Write-Host 'Install it from https://nodejs.org and try again.'
    Read-Host 'Press Enter to exit'
    exit 1
}
if (-not (Test-Path (Join-Path $front 'node_modules'))) {
    Write-Host ''
    Write-Host 'ERROR: frontend dependencies are missing.' -ForegroundColor Red
    Write-Host 'Run "npm install" once inside the frontend folder,'
    Write-Host 'or copy the frontend folder including node_modules.'
    Read-Host 'Press Enter to exit'
    exit 1
}

# ---------- start servers if not already running ----------
$beUp = Test-Running $beUrl
$feUp = Test-Running $feUrl
if ($beUp) { Write-Host 'Backend already running on :8000  (skipping start)' -ForegroundColor Green }
if ($feUp) { Write-Host 'Frontend already running on :5173  (skipping start)' -ForegroundColor Green }

try {
    if (-not $beUp) {
        Write-Host 'Starting backend  (uvicorn on :8000)...'
        $beProc = Start-Process -FilePath $py `
            -ArgumentList @('-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000') `
            -WorkingDirectory $root `
            -WindowStyle Minimized `
            -PassThru
        $bePid = $beProc.Id
    }

    if (-not $feUp) {
        Write-Host 'Starting frontend  (vite on :5173)...'
        $feProc = Start-Process -FilePath $npmCmd `
            -ArgumentList @('run', 'dev') `
            -WorkingDirectory $front `
            -WindowStyle Minimized `
            -PassThru
        $fePid = $feProc.Id
    }

    # ---------- wait for readiness (up to 90s) ----------
    $deadline = (Get-Date).AddSeconds(90)
    $okB = $beUp
    $okF = $feUp
    while ((Get-Date) -lt $deadline) {
        if (-not $okB) { $okB = Test-Running $beUrl }
        if (-not $okF) { $okF = Test-Running $feUrl }
        if ($okB -and $okF) { break }
        Start-Sleep -Seconds 2
    }

    if (-not $okB) {
        Write-Host ''
        Write-Host 'Backend did not respond. Check the "backend" (dark) console window.' -ForegroundColor Red
    }
    if (-not $okF) {
        Write-Host ''
        Write-Host 'Frontend did not respond. Check the "frontend" (vite) console window.' -ForegroundColor Red
    }
    if (-not ($okB -and $okF)) {
        Write-Host ''
        Write-Host 'Startup FAILED.' -ForegroundColor Red
        if (-not $SmokeTest) { Read-Host 'Press Enter to exit' }
        exit 1
    }

    Write-Host ''
    Write-Host 'Both servers are up.' -ForegroundColor Green
    Write-Host "  Backend : $beUrl"
    Write-Host "  Frontend: $feUrl"

    if ($SmokeTest) {
        Write-Host 'SMOKE TEST: OK' -ForegroundColor Green
        exit 0
    }

    Write-Host ''
    Write-Host 'Opening your browser...'
    Start-Process 'http://localhost:5173'
    Write-Host ''
    Write-Host 'The app should be open in your browser.' -ForegroundColor Green
    Write-Host 'The two smaller windows in the taskbar are the backend and frontend.'
    Write-Host 'Press Enter here to STOP the servers and close them.'
    $null = Read-Host 'Press Enter to stop the servers'
} finally {
    if ($bePid) { taskkill.exe /T /F /PID $bePid 2>$null | Out-Null }
    if ($fePid) { taskkill.exe /T /F /PID $fePid 2>$null | Out-Null }
}

Write-Host 'Servers stopped. You can close this window.' -ForegroundColor Cyan