# Expense Tracker Local Hub & Sync Server in PowerShell using TcpListener
# 100% Free, Zero Cloud Cost, Bi-directional Sync for Mobile (Phone) & Laptop (PC)
# Binds to 0.0.0.0 without requiring Windows Admin URL reservation!

param (
    [int]$Port = 8080,
    [string]$Path = $PSScriptRoot
)

$dataDir = [System.IO.Path]::Combine($Path, "data")
if (-not [System.IO.Directory]::Exists($dataDir)) {
    [System.IO.Directory]::CreateDirectory($dataDir) | Out-Null
}
$dbFile = [System.IO.Path]::Combine($dataDir, "transactions.json")

# Initialize DB file if not exists or if empty
if (-not [System.IO.File]::Exists($dbFile) -or [string]::IsNullOrWhiteSpace([System.IO.File]::ReadAllText($dbFile))) {
    [System.IO.File]::WriteAllText($dbFile, "[]", [System.Text.Encoding]::UTF8)
}

function Get-LocalIpAddress {
    try {
        $primary = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            ($_.InterfaceAlias -like '*Wi-Fi*' -or $_.InterfaceAlias -like '*Ethernet*') -and
            $_.IPAddress -notmatch '^169\.254\.' -and
            $_.IPAddress -ne '127.0.0.1'
        } | Select-Object -First 1
        if ($primary) { return $primary.IPAddress }

        $fallback = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            $_.InterfaceAlias -notlike '*Loopback*' -and
            $_.IPAddress -notmatch '^169\.254\.' -and
            $_.IPAddress -ne '127.0.0.1'
        } | Select-Object -First 1
        if ($fallback) { return $fallback.IPAddress }
    } catch {}
    return "localhost"
}

$localIp = Get-LocalIpAddress

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $Port)
try {
    $listener.Start()
    Write-Host "=========================================================="
    Write-Host "  EXPENSE TRACKER - MOBILE & LAPTOP SYNC HUB"
    Write-Host "=========================================================="
    Write-Host "Open on this Laptop:    http://localhost:$Port/"
    Write-Host "Open on Mobile Phone:   http://${localIp}:$Port/"
    Write-Host "Sync API Endpoint:      http://${localIp}:$Port/api/sync"
    Write-Host "=========================================================="
} catch {
    Write-Error "Failed to start listener on port $Port : $_"
    exit 1
}

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)

        $requestLine = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($requestLine)) {
            $client.Close()
            continue
        }

        $parts = $requestLine.Split(" ")
        $method = $parts[0]
        $rawUrl = if ($parts.Length -gt 1) { $parts[1] } else { "/" }
        $urlPath = $rawUrl.Split("?")[0].ToLower()

        # Read headers
        $contentLength = 0
        while ($true) {
            $line = $reader.ReadLine()
            if ([string]::IsNullOrEmpty($line)) { break }
            if ($line.ToLower().StartsWith("content-length:")) {
                $contentLength = [int]($line.Substring(15).Trim())
            }
        }

        # Read body if any
        $body = ""
        if ($contentLength -gt 0) {
            $buffer = New-Object char[] $contentLength
            $totalRead = 0
            while ($totalRead -lt $contentLength) {
                $read = $reader.Read($buffer, $totalRead, $contentLength - $totalRead)
                if ($read -le 0) { break }
                $totalRead += $read
            }
            $body = -join $buffer
        }

        $corsHeaders = "Access-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, OPTIONS`r`nAccess-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With`r`n"

        if ($method -eq "OPTIONS") {
            $resp = "HTTP/1.1 200 OK`r`n${corsHeaders}Content-Length: 0`r`nConnection: close`r`n`r`n"
            $b = [System.Text.Encoding]::UTF8.GetBytes($resp)
            $stream.Write($b, 0, $b.Length)
            $client.Close()
            continue
        }

        # 1. API: Server Info
        if ($urlPath -eq "/api/info") {
            $currentIp = Get-LocalIpAddress
            $infoObj = @{
                localIp = $currentIp
                port = $Port
                appUrl = "http://${currentIp}:$Port/"
                syncUrl = "http://${currentIp}:$Port/api/sync"
                status = "online"
                serverTime = (Get-Date).ToString("o")
            } | ConvertTo-Json
            $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($infoObj)
            $header = "HTTP/1.1 200 OK`r`n${corsHeaders}Content-Type: application/json; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
            $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($hBytes, 0, $hBytes.Length)
            $stream.Write($bodyBytes, 0, $bodyBytes.Length)
            $client.Close()
            continue
        }

        # 2. API: Get Transactions or Sync (GET)
        if (($urlPath -eq "/api/transactions" -or $urlPath -eq "/api/sync") -and $method -eq "GET") {
            $jsonContent = if ([System.IO.File]::Exists($dbFile)) { [System.IO.File]::ReadAllText($dbFile) } else { "[]" }
            if ([string]::IsNullOrWhiteSpace($jsonContent)) { $jsonContent = "[]" }
            $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonContent)
            $header = "HTTP/1.1 200 OK`r`n${corsHeaders}Content-Type: application/json; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
            $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($hBytes, 0, $hBytes.Length)
            $stream.Write($bodyBytes, 0, $bodyBytes.Length)
            $client.Close()
            continue
        }

        # 3. API: Two-Way Synchronization (POST)
        if (($urlPath -eq "/api/sync" -or $urlPath -eq "/api/transactions") -and $method -eq "POST") {
            try {
                $parsedBody = if (-not [string]::IsNullOrWhiteSpace($body)) { $body | ConvertFrom-Json } else { @{} }
                
                $incomingList = @()
                $deletedIds = @()
                $isReplace = $false

                if ($parsedBody -is [array]) {
                    $incomingList = $parsedBody
                } elseif ($parsedBody) {
                    if ($parsedBody.transactions) { $incomingList = @($parsedBody.transactions) }
                    if ($parsedBody.deletedIds) { $deletedIds = @($parsedBody.deletedIds) }
                    if ($parsedBody.action -eq "replace" -or $parsedBody.mode -eq "replace") { $isReplace = $true }
                }

                $existingJson = if ([System.IO.File]::Exists($dbFile)) { [System.IO.File]::ReadAllText($dbFile) } else { "[]" }
                if ([string]::IsNullOrWhiteSpace($existingJson)) { $existingJson = "[]" }
                $existingList = @($existingJson | ConvertFrom-Json)

                if ($isReplace) {
                    # Complete replacement mode
                    $mergedList = @($incomingList)
                } else {
                    # Smart 2-Way Merge:
                    # 1. Start with existing items not marked deleted
                    $txMap = @{}
                    foreach ($item in $existingList) {
                        if ($item.id -and -not ($deletedIds -contains $item.id)) {
                            $txMap[$item.id] = $item
                        }
                    }

                    # 2. Merge incoming items
                    foreach ($item in $incomingList) {
                        if ($item.id -and -not ($deletedIds -contains $item.id)) {
                            if (-not $txMap.ContainsKey($item.id)) {
                                $txMap[$item.id] = $item
                            } else {
                                # If item exists on both, keep the one with newer updatedAt
                                $current = $txMap[$item.id]
                                $incomingUpdated = if ($item.updatedAt) { [string]$item.updatedAt } else { "" }
                                $currentUpdated = if ($current.updatedAt) { [string]$current.updatedAt } else { "" }
                                if ($incomingUpdated -ge $currentUpdated) {
                                    $txMap[$item.id] = $item
                                }
                            }
                        }
                    }

                    $mergedList = @($txMap.Values)
                }

                $savedJson = $mergedList | ConvertTo-Json -Depth 6
                [System.IO.File]::WriteAllText($dbFile, $savedJson, [System.Text.Encoding]::UTF8)

                $resultObj = @{
                    success = $true
                    syncedCount = $incomingList.Count
                    total = $mergedList.Count
                    transactions = $mergedList
                    timestamp = (Get-Date).ToString("o")
                } | ConvertTo-Json -Depth 6

                $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($resultObj)
                $header = "HTTP/1.1 200 OK`r`n${corsHeaders}Content-Type: application/json; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
                $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                $stream.Write($hBytes, 0, $hBytes.Length)
                $stream.Write($bodyBytes, 0, $bodyBytes.Length)
            } catch {
                $errObj = @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json
                $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($errObj)
                $header = "HTTP/1.1 400 Bad Request`r`n${corsHeaders}Content-Type: application/json; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
                $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                $stream.Write($hBytes, 0, $hBytes.Length)
                $stream.Write($bodyBytes, 0, $bodyBytes.Length)
            }
            $client.Close()
            continue
        }

        # 4. Static Files (HTML, JS, CSS, JSON, Icons)
        $filePathRel = if ($urlPath -eq "/" -or [string]::IsNullOrWhiteSpace($urlPath)) { "/index.html" } else { $urlPath }
        $filePath = [System.IO.Path]::Combine($Path, $filePathRel.TrimStart("/").Replace("/", [System.IO.Path]::DirectorySeparatorChar))

        if ([System.IO.File]::Exists($filePath)) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)

            $header = "HTTP/1.1 200 OK`r`n${corsHeaders}Content-Type: $contentType`r`nContent-Length: $($fileBytes.Length)`r`nConnection: close`r`n`r`n"
            $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($hBytes, 0, $hBytes.Length)
            $stream.Write($fileBytes, 0, $fileBytes.Length)
        } else {
            $msgBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $header = "HTTP/1.1 404 Not Found`r`n${corsHeaders}Content-Type: text/plain`r`nContent-Length: $($msgBytes.Length)`r`nConnection: close`r`n`r`n"
            $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($hBytes, 0, $hBytes.Length)
            $stream.Write($msgBytes, 0, $msgBytes.Length)
        }

        $client.Close()
    } catch {
        # continue loop on client connection drop
    }
}
