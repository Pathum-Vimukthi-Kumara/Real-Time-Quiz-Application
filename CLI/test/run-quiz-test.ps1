$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$projectDir = Join-Path $repoRoot 'Project'
$logsDir = Join-Path $PSScriptRoot 'logs'
$serverLog = Join-Path $logsDir 'server-output.log'
$clientLog = Join-Path $logsDir 'client-output.log'

New-Item -ItemType Directory -Path $logsDir -Force | Out-Null

Push-Location $projectDir
try {
    Write-Host '[TEST] Compiling quiz sources...'
    & javac -d . ServerClient/*.java
    if ($LASTEXITCODE -ne 0) {
        throw 'Compilation failed.'
    }

    $port = 9123

    $serverInfo = New-Object System.Diagnostics.ProcessStartInfo
    $serverInfo.FileName = 'java'
    $serverInfo.Arguments = 'ServerClient.QuizServer'
    $serverInfo.WorkingDirectory = $projectDir
    $serverInfo.UseShellExecute = $false
    $serverInfo.RedirectStandardInput = $true
    $serverInfo.RedirectStandardOutput = $true
    $serverInfo.RedirectStandardError = $true
    $serverInfo.CreateNoWindow = $true

    $server = New-Object System.Diagnostics.Process
    $server.StartInfo = $serverInfo
    [void]$server.Start()

    # Provide quiz setup for one question; keep 'start' for later after client joins.
    $server.StandardInput.WriteLine($port)
    $server.StandardInput.WriteLine('1')
    $server.StandardInput.WriteLine('2 + 2 = ?')
    $server.StandardInput.WriteLine('4')
    $server.StandardInput.WriteLine('3')
    $server.StandardInput.WriteLine('2')
    $server.StandardInput.WriteLine('1')
    $server.StandardInput.WriteLine('A')
    $server.StandardInput.WriteLine('10')

    Start-Sleep -Seconds 2

    $clientInfo = New-Object System.Diagnostics.ProcessStartInfo
    $clientInfo.FileName = 'java'
    $clientInfo.Arguments = 'ServerClient.QuizClient'
    $clientInfo.WorkingDirectory = $projectDir
    $clientInfo.UseShellExecute = $false
    $clientInfo.RedirectStandardInput = $true
    $clientInfo.RedirectStandardOutput = $true
    $clientInfo.RedirectStandardError = $true
    $clientInfo.CreateNoWindow = $true

    $client = New-Object System.Diagnostics.Process
    $client.StartInfo = $clientInfo
    [void]$client.Start()

    $client.StandardInput.WriteLine('127.0.0.1')
    $client.StandardInput.WriteLine($port)
    $client.StandardInput.WriteLine('Tester1')
    $client.StandardInput.WriteLine('A')

    Start-Sleep -Seconds 2
    $server.StandardInput.WriteLine('start')

    if (-not $client.WaitForExit(30000)) {
        try { $client.Kill() } catch {}
        throw 'Client process timed out.'
    }

    if (-not $server.WaitForExit(30000)) {
        try { $server.Kill() } catch {}
        throw 'Server process timed out.'
    }

    $serverOut = $server.StandardOutput.ReadToEnd() + "`n" + $server.StandardError.ReadToEnd()
    $clientOut = $client.StandardOutput.ReadToEnd() + "`n" + $client.StandardError.ReadToEnd()

    Set-Content -Path $serverLog -Value $serverOut
    Set-Content -Path $clientLog -Value $clientOut

    $checks = @(
        @{ ok = $serverOut -match 'Quiz started with'; msg = 'Server did not start quiz.' },
        @{ ok = $serverOut -match 'Final Results'; msg = 'Server did not print final results.' },
        @{ ok = $clientOut -match 'Quiz is starting now'; msg = 'Client did not receive quiz start.' },
        @{ ok = $clientOut -match 'Quiz ended\. Final ranking'; msg = 'Client did not reach quiz end.' }
    )

    foreach ($check in $checks) {
        if (-not $check.ok) {
            throw $check.msg
        }
    }

    Write-Host '[PASS] Integration test passed.'
    Write-Host "[INFO] Server log: $serverLog"
    Write-Host "[INFO] Client log: $clientLog"
}
finally {
    Pop-Location
}
