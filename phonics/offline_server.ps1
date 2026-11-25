param(
  [int]$Port = 8765
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogPath = Join-Path $Root 'offline_error.log'

function Write-ErrorLog([string]$Message) {
  try {
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    [System.IO.File]::WriteAllText($LogPath, "[$stamp] $Message`r`n", [System.Text.Encoding]::UTF8)
  } catch {}
}

function Get-MimeType([string]$Path) {
  $ext = [System.IO.Path]::GetExtension($Path).ToLowerInvariant()
  switch ($ext) {
    '.html' { return 'text/html; charset=utf-8' }
    '.htm'  { return 'text/html; charset=utf-8' }
    '.js'   { return 'application/javascript; charset=utf-8' }
    '.css'  { return 'text/css; charset=utf-8' }
    '.json' { return 'application/json; charset=utf-8' }
    '.txt'  { return 'text/plain; charset=utf-8' }
    '.mp4'  { return 'video/mp4' }
    '.wav'  { return 'audio/wav' }
    '.mp3'  { return 'audio/mpeg' }
    '.ogg'  { return 'audio/ogg' }
    '.webm' { return 'video/webm' }
    '.png'  { return 'image/png' }
    '.jpg'  { return 'image/jpeg' }
    '.jpeg' { return 'image/jpeg' }
    '.svg'  { return 'image/svg+xml' }
    '.ico'  { return 'image/x-icon' }
    default { return 'application/octet-stream' }
  }
}

function Send-Response($Stream, [int]$Status, [string]$Reason, [string]$ContentType, [byte[]]$Body, [hashtable]$ExtraHeaders) {
  $Headers = "HTTP/1.1 $Status $Reason`r`n" +
             "Content-Type: $ContentType`r`n" +
             "Content-Length: $($Body.Length)`r`n" +
             "Cache-Control: no-cache`r`n" +
             "Connection: close`r`n"
  if ($ExtraHeaders -ne $null) {
    foreach ($Key in $ExtraHeaders.Keys) {
      $Headers += "${Key}: $($ExtraHeaders[$Key])`r`n"
    }
  }
  $Headers += "`r`n"
  $HeaderBytes = [System.Text.Encoding]::ASCII.GetBytes($Headers)
  $Stream.Write($HeaderBytes, 0, $HeaderBytes.Length)
  if ($Body.Length -gt 0) { $Stream.Write($Body, 0, $Body.Length) }
  $Stream.Flush()
}

function Get-CandidateIPv4 {
  $rows = @()
  try {
    foreach ($nic in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
      if ($nic.OperationalStatus -ne [System.Net.NetworkInformation.OperationalStatus]::Up) { continue }
      if ($nic.NetworkInterfaceType -eq [System.Net.NetworkInformation.NetworkInterfaceType]::Loopback) { continue }
      $props = $nic.GetIPProperties()
      foreach ($ua in $props.UnicastAddresses) {
        if ($ua.Address.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { continue }
        $ip = $ua.Address.ToString()
        if ($ip -eq '127.0.0.1' -or $ip.StartsWith('169.254.')) { continue }

        $score = 80
        if ($ip -eq '192.168.137.1') { $score = 0 }
        elseif ($nic.NetworkInterfaceType -eq [System.Net.NetworkInformation.NetworkInterfaceType]::Wireless80211) { $score = 10 }
        elseif ($nic.NetworkInterfaceType -eq [System.Net.NetworkInformation.NetworkInterfaceType]::Ethernet) { $score = 20 }
        elseif ($ip.StartsWith('192.168.')) { $score = 30 }
        elseif ($ip.StartsWith('10.')) { $score = 35 }
        elseif ($ip -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.') { $score = 40 }

        $rows += [PSCustomObject]@{ Ip = $ip; Score = $score; Name = $nic.Name }
      }
    }
  } catch {}

  $seen = @{}
  $out = @()
  foreach ($r in ($rows | Sort-Object Score, Ip)) {
    if (-not $seen.ContainsKey($r.Ip)) {
      $seen[$r.Ip] = $true
      $out += $r
    }
  }
  return @($out | Select-Object -First 4)
}

$Listener = $null
try {
  if (Test-Path $LogPath) { Remove-Item $LogPath -Force -ErrorAction SilentlyContinue }

  $Address = [System.Net.IPAddress]::Any
  $Listener = New-Object System.Net.Sockets.TcpListener -ArgumentList $Address, $Port
  $Listener.Start()

  $LocalUrl = "http://127.0.0.1:$Port/TABLET_LAUNCHER.html"
  $Candidates = Get-CandidateIPv4

  Clear-Host
  Write-Host '==================================================' -ForegroundColor Cyan
  Write-Host ' Phonics Learning System - TABLET DEMO MODE' -ForegroundColor Cyan
  Write-Host '==================================================' -ForegroundColor Cyan
  Write-Host ''
  Write-Host "QR launcher: $LocalUrl" -ForegroundColor Green
  Write-Host ''
  if ($Candidates.Count -gt 0) {
    Write-Host 'Detected tablet URLs:' -ForegroundColor Green
    foreach ($c in $Candidates) {
      Write-Host ("  http://" + $c.Ip + ":" + $Port + "/START_HERE.html")
    }
  } else {
    Write-Host 'No LAN address detected. Connect Wi-Fi or enable Windows Mobile Hotspot.' -ForegroundColor Yellow
  }
  Write-Host ''
  Write-Host 'Keep this window OPEN while the iPad is using the website.' -ForegroundColor Yellow
  Write-Host 'If Windows Firewall asks, allow access on PRIVATE networks.' -ForegroundColor Yellow
  Write-Host ''

  try { Start-Process $LocalUrl } catch { Start-Process 'cmd.exe' -ArgumentList '/c','start','""',$LocalUrl }

  while ($true) {
    $Client = $null
    try {
      $Client = $Listener.AcceptTcpClient()
      $Stream = $Client.GetStream()
      $Reader = New-Object System.IO.StreamReader($Stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
      $RequestLine = $Reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($RequestLine)) { $Client.Close(); continue }

      $Parts = $RequestLine.Split(' ')
      if ($Parts.Length -lt 2 -or $Parts[0] -ne 'GET') {
        $Body = [System.Text.Encoding]::UTF8.GetBytes('Method Not Allowed')
        Send-Response $Stream 405 'Method Not Allowed' 'text/plain; charset=utf-8' $Body $null
        $Client.Close(); continue
      }

      $RequestHeaders = @{}
      while ($true) {
        $Line = $Reader.ReadLine()
        if ([string]::IsNullOrEmpty($Line)) { break }
        $Colon = $Line.IndexOf(':')
        if ($Colon -gt 0) {
          $Name = $Line.Substring(0, $Colon).Trim().ToLowerInvariant()
          $Value = $Line.Substring($Colon + 1).Trim()
          $RequestHeaders[$Name] = $Value
        }
      }

      $RawPath = $Parts[1].Split('?')[0]

      if ($RawPath -eq '/__network.json') {
        $list = @()
        foreach ($c in (Get-CandidateIPv4)) {
          $list += [PSCustomObject]@{
            ip = $c.Ip
            name = $c.Name
            url = ("http://" + $c.Ip + ":" + $Port + "/START_HERE.html")
            testUrl = ("http://" + $c.Ip + ":" + $Port + "/TABLET_CONNECT_TEST.html")
          }
        }
        $obj = [PSCustomObject]@{ port = $Port; urls = $list }
        $json = $obj | ConvertTo-Json -Depth 5 -Compress
        $Body = [System.Text.Encoding]::UTF8.GetBytes($json)
        Send-Response $Stream 200 'OK' 'application/json; charset=utf-8' $Body $null
        $Client.Close(); continue
      }

      $Decoded = [System.Uri]::UnescapeDataString($RawPath).TrimStart('/')
      if ([string]::IsNullOrWhiteSpace($Decoded)) { $Decoded = 'START_HERE.html' }
      $Decoded = $Decoded.Replace('/', [System.IO.Path]::DirectorySeparatorChar)

      $RootFull = [System.IO.Path]::GetFullPath($Root)
      $FullPath = [System.IO.Path]::GetFullPath((Join-Path $Root $Decoded))
      if (-not $FullPath.StartsWith($RootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        $Body = [System.Text.Encoding]::UTF8.GetBytes('Forbidden')
        Send-Response $Stream 403 'Forbidden' 'text/plain; charset=utf-8' $Body $null
        $Client.Close(); continue
      }

      if ([System.IO.Directory]::Exists($FullPath)) { $FullPath = Join-Path $FullPath 'index.html' }
      if (-not [System.IO.File]::Exists($FullPath)) {
        $Body = [System.Text.Encoding]::UTF8.GetBytes('Not Found')
        Send-Response $Stream 404 'Not Found' 'text/plain; charset=utf-8' $Body $null
        $Client.Close(); continue
      }

      $FileBytes = [System.IO.File]::ReadAllBytes($FullPath)
      $Mime = Get-MimeType $FullPath

      if ($RequestHeaders.ContainsKey('range') -and $RequestHeaders['range'] -match '^bytes=(\d*)-(\d*)$') {
        $StartText = $Matches[1]; $EndText = $Matches[2]; $FileLength = [int64]$FileBytes.Length
        if ($StartText) { $Start = [int64]$StartText } else { $Start = 0 }
        if ($EndText) { $End = [int64]$EndText } else { $End = $FileLength - 1 }
        if ($Start -lt 0) { $Start = 0 }
        if ($End -ge $FileLength) { $End = $FileLength - 1 }
        if ($Start -le $End -and $Start -lt $FileLength) {
          $Len64 = $End - $Start + 1
          if ($Len64 -gt [int]::MaxValue) { throw 'Requested media range is too large.' }
          $Len = [int]$Len64
          $Chunk = New-Object byte[] $Len
          [Array]::Copy($FileBytes, [int]$Start, $Chunk, 0, $Len)
          $Extra = @{ 'Accept-Ranges'='bytes'; 'Content-Range'="bytes $Start-$End/$FileLength" }
          Send-Response $Stream 206 'Partial Content' $Mime $Chunk $Extra
        } else {
          $Body = [System.Text.Encoding]::UTF8.GetBytes('Requested Range Not Satisfiable')
          Send-Response $Stream 416 'Range Not Satisfiable' 'text/plain; charset=utf-8' $Body $null
        }
      } else {
        $Extra = @{'Accept-Ranges'='bytes'}
        Send-Response $Stream 200 'OK' $Mime $FileBytes $Extra
      }
    } catch {
      if ($Client -ne $null) {
        try { $Stream = $Client.GetStream(); $Body = [System.Text.Encoding]::UTF8.GetBytes('Internal Server Error'); Send-Response $Stream 500 'Internal Server Error' 'text/plain; charset=utf-8' $Body $null } catch {}
      }
    } finally {
      if ($Client -ne $null) { try { $Client.Close() } catch {} }
    }
  }
} catch {
  $msg = $_.Exception.Message
  Write-ErrorLog $msg
  Write-Host ''
  Write-Host 'TABLET DEMO SERVER FAILED TO START.' -ForegroundColor Red
  Write-Host ''
  Write-Host "Error: $msg" -ForegroundColor Red
  Write-Host ''
  Write-Host "Error log: $LogPath"
  Write-Host 'Keep this window open and take a screenshot of the error.' -ForegroundColor Yellow
  Write-Host ''
  Read-Host 'Press Enter to close'
  exit 1
} finally {
  if ($Listener -ne $null) { try { $Listener.Stop() } catch {} }
}
