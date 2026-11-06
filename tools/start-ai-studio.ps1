param([ValidateRange(1024,65535)][int]$Port = 8134)

$ErrorActionPreference = 'Stop'
$studioEnvironmentKeys = @('HTTP_PROXY', 'HTTPS_PROXY', 'NO_PROXY', 'DIRECTOR_BRIDGE_PORT')
$studioPreviousEnvironment = @{}
foreach ($key in $studioEnvironmentKeys) {
    $studioPreviousEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}
try {
    $studioProxySettings = Get-ItemProperty -LiteralPath 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -ErrorAction SilentlyContinue
    $studioLoopbackProxy = [regex]::Match([string]$studioProxySettings.ProxyServer, '(?:127\.0\.0\.1|localhost):\d+')
    if ($studioProxySettings.ProxyEnable -and $studioLoopbackProxy.Success) {
        if (!$env:HTTPS_PROXY) { $env:HTTPS_PROXY = 'http://' + $studioLoopbackProxy.Value }
        if (!$env:HTTP_PROXY) { $env:HTTP_PROXY = 'http://' + $studioLoopbackProxy.Value }
    }
    $env:NO_PROXY = (@($env:NO_PROXY, 'localhost', '127.0.0.1') | Where-Object { $_ }) -join ','
    $env:DIRECTOR_BRIDGE_PORT = [string]$Port
    rtk node --use-env-proxy (Join-Path $PSScriptRoot 'serve-director.mjs')
    $studioExitCode = $LASTEXITCODE
}
finally {
    foreach ($key in $studioEnvironmentKeys) {
        [Environment]::SetEnvironmentVariable($key, $studioPreviousEnvironment[$key], 'Process')
    }
}
exit $studioExitCode
