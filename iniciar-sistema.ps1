$ErrorActionPreference = "SilentlyContinue"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$bridgeConfig = Join-Path $root "idbio-bridge\bin\config.json"
$bridgePort = 5055
$webPort = 8000

if (Test-Path $bridgeConfig) {
  try {
    $config = Get-Content $bridgeConfig -Raw | ConvertFrom-Json
    if ($config.httpPort) {
      $bridgePort = [int]$config.httpPort
    }
  } catch {
    $bridgePort = 5055
  }
}

function Test-LocalPort($port) {
  try {
    $client = New-Object System.Net.Sockets.TcpClient
    $result = $client.BeginConnect("127.0.0.1", $port, $null, $null)
    $connected = $result.AsyncWaitHandle.WaitOne(300)
    if ($connected) {
      $client.EndConnect($result)
    }
    $client.Close()
    return $connected
  } catch {
    return $false
  }
}

if (-not (Test-LocalPort $bridgePort)) {
  $bridgeExe = Join-Path $root "idbio-bridge\bin\IdBioBridge.exe"
  $bridgeWorkdir = Split-Path -Parent $bridgeExe
  $bridgeOut = Join-Path $root "idbio-bridge\bridge.out.log"
  $bridgeErr = Join-Path $root "idbio-bridge\bridge.err.log"
  Start-Process -FilePath $bridgeExe -WorkingDirectory $bridgeWorkdir -RedirectStandardOutput $bridgeOut -RedirectStandardError $bridgeErr -WindowStyle Hidden
}

if (-not (Test-LocalPort $webPort)) {
  Start-Process -FilePath "python" -ArgumentList "-m", "http.server", "$webPort", "--bind", "127.0.0.1" -WorkingDirectory $root -WindowStyle Hidden
}

Start-Sleep -Milliseconds 1000
Start-Process "http://localhost:$webPort/index.html"
