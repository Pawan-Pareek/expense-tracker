# Expense Tracker Local Hub & Sync Server in PowerShell using TcpListener
# 100% Free, Zero Cloud Cost, Bi-directional Sync for Android App & Web Browser
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

# Initialize DB file if not exists
if (-not [System.IO.File]::Exists($dbFile)) {
    [System.IO.File]::WriteAllText($dbFile, "[]")
}

# Determine local IP address
$localIp = "localhost"
try {
    $ipObj = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254*" } | Select-Object -First 1
    if ($ipObj) { $localIp = $ipObj.IPAddress }
} catch {}

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
    Write-Host "  EXPENSE TRACKER - LOCAL SYNC HUB & WEB APP"
    Write-Host "=========================================================="
    Write-Host "Web App on PC:       http://localhost:$Port/"
    Write-Host "Android Sync URL:    http://${localIp}:$Port/api/sync"
    Write-Host "Local Hub IP:        $localIp"
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
            $infoObj = @{
                localIp = $localIp
                port = $Port
                syncUrl = "http://${localIp}:$Port/api/sync"
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

        # 2. API: Get Transactions
        if ($urlPath -eq "/api/transactions" -and $method -eq "GET") {
            $jsonContent = if ([System.IO.File]::Exists($dbFile)) { [System.IO.File]::ReadAllText($dbFile) } else { "[]" }
            $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonContent)
            $header = "HTTP/1.1 200 OK`r`n${corsHeaders}Content-Type: application/json; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
            $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
            $stream.Write($hBytes, 0, $hBytes.Length)
            $stream.Write($bodyBytes, 0, $bodyBytes.Length)
            $client.Close()
            continue
        }

        # 3. API: Sync Transactions (POST)
        if ($urlPath -eq "/api/sync" -and $method -eq "POST") {
            try {
                $parsedBody = $body | ConvertFrom-Json
                $incomingList = if ($parsedBody -is [array]) { $parsedBody } elseif ($parsedBody.transactions) { $parsedBody.transactions } else { @($parsedBody) }

                $existingJson = if ([System.IO.File]::Exists($dbFile)) { [System.IO.File]::ReadAllText($dbFile) } else { "[]" }
                $existingList = if ([string]::IsNullOrWhiteSpace($existingJson) -or $existingJson -eq "[]") { @() } else { @($existingJson | ConvertFrom-Json) }

                $txMap = @{}
                foreach ($item in $existingList) {
                    if ($item.id) { $txMap[$item.id] = $item }
                }

                $newCount = 0
                foreach ($item in $incomingList) {
                    if ($item.id) {
                        if (-not $txMap.ContainsKey($item.id)) { $newCount++ }
                        $txMap[$item.id] = $item
                    }
                }

                $mergedList = @($txMap.Values)
                $savedJson = $mergedList | ConvertTo-Json -Depth 6
                [System.IO.File]::WriteAllText($dbFile, $savedJson)

                $resultObj = @{
                    success = $true
                    syncedCount = $incomingList.Count
                    newAdded = $newCount
                    total = $mergedList.Count
                    transactions = $mergedList
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

        # 4. API: Webhook (for MacroDroid, Automate, or SMS Forwarder on Android)
        if ($urlPath.StartsWith("/api/webhook")) {
            try {
                $rawMsg = ""
                if ($rawUrl.Contains("?")) {
                    $qStr = $rawUrl.Substring($rawUrl.IndexOf("?") + 1)
                    $pairs = $qStr.Split("&")
                    foreach ($pair in $pairs) {
                        $kv = $pair.Split("=")
                        if ($kv[0].ToLower() -eq "msg" -or $kv[0].ToLower() -eq "text") {
                            $rawMsg = [System.Uri]::UnescapeDataString($kv[1]).Replace("+", " ")
                            break
                        }
                    }
                }
                if ([string]::IsNullOrWhiteSpace($rawMsg) -and -not [string]::IsNullOrWhiteSpace($body)) {
                    try {
                        $p = $body | ConvertFrom-Json
                        $rawMsg = if ($p.text) { $p.text } elseif ($p.msg) { $p.msg } else { $body }
                    } catch {
                        $rawMsg = $body
                    }
                }

                if (-not [string]::IsNullOrWhiteSpace($rawMsg)) {
                    $cleanMsg = $rawMsg.Trim()
                    $lowerMsg = $cleanMsg.ToLower()

                    $isCredit = $lowerMsg -match "credited|received|refund|cashback|salary"
                    $type = if ($isCredit) { "credit" } else { "debit" }

                    # Robust Amount extraction
                    $amt = 0.0
                    if ($cleanMsg -match "(?:rs\.?|inr|₹)\s*([\d,]+\.?\d*)") {
                        $amtStr = $matches[1].Replace(",", "")
                        [double]::TryParse($amtStr, [ref]$amt) | Out-Null
                    } elseif ($cleanMsg -match "(?:debited|spent|paid|credited|received|of)\s*(?:rs\.?|inr|₹)?\s*([\d,]+\.?\d*)") {
                        $amtStr = $matches[1].Replace(",", "")
                        [double]::TryParse($amtStr, [ref]$amt) | Out-Null
                    }

                    if ($amt -gt 0) {
                        $txId = "tx-webhook-" + [System.DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
                        $merchant = "UPI / Bank Payment"
                        if ($cleanMsg -match "(?:to|at|from)\s+([A-Za-z0-9\s&'-]+)") {
                            $merchant = $matches[1].Trim()
                        }

                        $source = "Android Phone"
                        if ($lowerMsg.Contains("gpay") -or $lowerMsg.Contains("google pay")) { $source = "Google Pay" }
                        elseif ($lowerMsg.Contains("phonepe")) { $source = "PhonePe" }
                        elseif ($lowerMsg.Contains("paytm")) { $source = "Paytm" }
                        elseif ($lowerMsg.Contains("hdfc")) { $source = "HDFC Bank" }
                        elseif ($lowerMsg.Contains("sbi")) { $source = "SBI Bank" }
                        elseif ($lowerMsg.Contains("icici")) { $source = "ICICI Bank" }

                        $newTx = @{
                            id = $txId
                            type = $type
                            amount = $amt
                            merchant = $merchant
                            category = if ($type -eq "credit") { "Salary" } else { "General" }
                            source = $source
                            date = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
                            notes = "Auto-captured via Android Webhook"
                            rawSms = $cleanMsg
                        }

                        $existingJson = if ([System.IO.File]::Exists($dbFile)) { [System.IO.File]::ReadAllText($dbFile) } else { "[]" }
                        $parsedExisting = if ([string]::IsNullOrWhiteSpace($existingJson) -or $existingJson -eq "[]") { @() } else { @($existingJson | ConvertFrom-Json) }
                        $list = New-Object System.Collections.ArrayList
                        if ($parsedExisting) {
                            foreach ($item in $parsedExisting) { [void]$list.Add($item) }
                        }
                        [void]$list.Add($newTx)
                        $savedJson = $list | ConvertTo-Json -Depth 6
                        [System.IO.File]::WriteAllText($dbFile, $savedJson)

                        $respObj = @{ success = $true; message = "Transaction auto-logged!"; transaction = $newTx } | ConvertTo-Json
                        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($respObj)
                        $header = "HTTP/1.1 200 OK`r`n${corsHeaders}Content-Type: application/json; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
                        $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                        $stream.Write($hBytes, 0, $hBytes.Length)
                        $stream.Write($bodyBytes, 0, $bodyBytes.Length)
                        $client.Close()
                        continue
                    }
                }

                # If amount could not be detected
                $failObj = @{ success = $false; error = "Could not detect amount in message"; received = $rawMsg } | ConvertTo-Json
                $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($failObj)
                $header = "HTTP/1.1 400 Bad Request`r`n${corsHeaders}Content-Type: application/json; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
                $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                $stream.Write($hBytes, 0, $hBytes.Length)
                $stream.Write($bodyBytes, 0, $bodyBytes.Length)
                $client.Close()
                continue
            } catch {
                $errObj = @{ success = $false; error = $_.Exception.Message } | ConvertTo-Json
                $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($errObj)
                $header = "HTTP/1.1 500 Internal Server Error`r`n${corsHeaders}Content-Type: application/json; charset=utf-8`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
                $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                $stream.Write($hBytes, 0, $hBytes.Length)
                $stream.Write($bodyBytes, 0, $bodyBytes.Length)
                $client.Close()
                continue
            }
        }

        # 4. Static Files
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
