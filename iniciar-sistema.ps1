$ErrorActionPreference = "SilentlyContinue"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$webPort = 8000

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

if (-not (Test-LocalPort $webPort)) {
  Start-Process -FilePath "python" -ArgumentList "-m", "http.server", "$webPort", "--bind", "127.0.0.1" -WorkingDirectory $root -WindowStyle Hidden
}

Start-Sleep -Milliseconds 1000
Start-Process "http://localhost:$webPort/index.html"
