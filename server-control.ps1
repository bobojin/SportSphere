param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("start", "stop", "restart")]
  [string]$Action,
  [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSCommandPath
$PidFile = Join-Path $Root ".sports-server.pid"
$OutLog = Join-Path $Root ".sports-server.log"
$ErrLog = Join-Path $Root ".sports-server.err.log"
$ClientIndex = Join-Path $Root "dist\\client\\index.html"
$AppUrl = "http://localhost:4000/tournaments"
$Port = 4000

function Get-TrackedPid {
  if (-not (Test-Path $PidFile)) {
    return $null
  }

  $raw = (Get-Content $PidFile -Raw).Trim()
  if (-not $raw) {
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    return $null
  }

  $value = 0
  if (-not [int]::TryParse($raw, [ref]$value)) {
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    return $null
  }

  return $value
}

function Test-PidRunning {
  param([int]$ProcessId)
  return [bool](Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Get-PortListenerPid {
  param([int]$Port)

  foreach ($line in netstat -ano) {
    $match = [regex]::Match($line, "^\s*TCP\s+\S+:$Port\s+\S+\s+LISTENING\s+(\d+)\s*$")
    if ($match.Success) {
      return [int]$match.Groups[1].Value
    }
  }

  return $null
}

function Stop-ServerProcess {
  param(
    [int]$ProcessId,
    [string]$Label
  )

  if (-not $ProcessId) {
    return $false
  }

  if (-not (Test-PidRunning -ProcessId $ProcessId)) {
    return $false
  }

  Write-Host "[sports] stopping $Label pid $ProcessId..."
  Stop-Process -Id $ProcessId -Force -ErrorAction Stop

  for ($i = 0; $i -lt 20; $i++) {
    if (-not (Test-PidRunning -ProcessId $ProcessId)) {
      return $true
    }

    Start-Sleep -Milliseconds 150
  }

  throw "[sports] failed to stop pid $ProcessId"
}

function Wait-ForListenerPid {
  param(
    [int]$Port,
    [int]$TimeoutMs = 5000
  )

  $deadline = (Get-Date).AddMilliseconds($TimeoutMs)

  while ((Get-Date) -lt $deadline) {
    $listenerPid = Get-PortListenerPid -Port $Port
    if ($listenerPid) {
      return $listenerPid
    }

    Start-Sleep -Milliseconds 200
  }

  return $null
}

function Wait-ForPortRelease {
  param(
    [int]$Port,
    [int]$TimeoutMs = 5000
  )

  $deadline = (Get-Date).AddMilliseconds($TimeoutMs)

  while ((Get-Date) -lt $deadline) {
    if (-not (Get-PortListenerPid -Port $Port)) {
      return $true
    }

    Start-Sleep -Milliseconds 200
  }

  return $false
}

function Start-Server {
  if (-not (Test-Path $ClientIndex)) {
    Write-Host "[sports] missing build output: dist\client\index.html"
    Write-Host '[sports] run "npm run build" first'
    exit 1
  }

  $trackedPid = Get-TrackedPid
  if ($trackedPid) {
    if (Test-PidRunning -ProcessId $trackedPid) {
      $listenerPid = Get-PortListenerPid -Port $Port
      if ($listenerPid) {
        Write-Host "[sports] server already running with tracked pid $trackedPid on port $Port"
        if (-not $NoOpen) {
          Start-Process $AppUrl | Out-Null
        }
        exit 0
      }

      Write-Host "[sports] tracked server pid $trackedPid is running but port $Port is not listening, cleaning up..."
      [void](Stop-ServerProcess -ProcessId $trackedPid -Label "tracked")
      [void](Wait-ForPortRelease -Port $Port)
    }

    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  }

  $portPid = Get-PortListenerPid -Port $Port
  if ($portPid) {
    Write-Host "[sports] port $Port is already occupied by pid $portPid"
    Write-Host "[sports] run stop.bat or restart.bat to replace the existing process"
    exit 1
  }

  Write-Host "[sports] starting server on port $Port..."
  $nodePath = (Get-Command node -ErrorAction Stop).Source
  $originalNodeEnv = $env:NODE_ENV

  try {
    $env:NODE_ENV = "production"
    $process = Start-Process -FilePath $nodePath -ArgumentList "server/index.js" -WorkingDirectory $Root -RedirectStandardOutput $OutLog -RedirectStandardError $ErrLog -WindowStyle Hidden -PassThru
  } finally {
    if ($null -eq $originalNodeEnv) {
      Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
    } else {
      $env:NODE_ENV = $originalNodeEnv
    }
  }

  if (-not $process) {
    throw "[sports] server failed to start"
  }

  $listenerPid = Wait-ForListenerPid -Port $Port
  if (-not $listenerPid) {
    if (Test-PidRunning -ProcessId $process.Id) {
      Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }

    Write-Host "[sports] server process started but port $Port is not listening yet"
    if (Test-Path $ErrLog) {
      Get-Content $ErrLog
    }
    exit 1
  }

  Set-Content -Path $PidFile -Value $listenerPid -NoNewline
  Write-Host "[sports] started with pid $listenerPid"

  if (-not $NoOpen) {
    Start-Process $AppUrl | Out-Null
  }
}

function Stop-Server {
  $trackedPid = Get-TrackedPid
  if ($trackedPid) {
    if (Stop-ServerProcess -ProcessId $trackedPid -Label "tracked") {
      [void](Wait-ForPortRelease -Port $Port)
      Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
      Write-Host "[sports] stopped tracked pid $trackedPid"
      return
    }

    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  }

  $portPid = Get-PortListenerPid -Port $Port
  if ($portPid) {
    if (Stop-ServerProcess -ProcessId $portPid -Label "listener") {
      [void](Wait-ForPortRelease -Port $Port)
      Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
      Write-Host "[sports] stopped listener pid $portPid on port $Port"
      return
    }
  }

  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  Write-Host "[sports] no running server found"
}

switch ($Action) {
  "start" {
    Start-Server
  }
  "stop" {
    Stop-Server
  }
  "restart" {
    Stop-Server
    Start-Server
  }
}
