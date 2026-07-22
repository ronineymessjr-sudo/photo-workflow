param(
  [string]$ConfigPath = 'worker/wrangler.toml'
)

$ErrorActionPreference = 'Stop'
$service = 'lark-cli'
$account = 'appsecret:cli_aa90021882381bdb'
$registryPath = 'HKCU:\Software\LarkCli\keychain\lark-cli'

function Convert-ToBase64Url {
  param([byte[]]$Bytes)
  return [Convert]::ToBase64String($Bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

Add-Type -AssemblyName System.Security
$valueName = Convert-ToBase64Url ([Text.Encoding]::UTF8.GetBytes($account))
$protectedBase64 = Get-ItemPropertyValue -Path $registryPath -Name $valueName
$protectedBytes = [Convert]::FromBase64String($protectedBase64)
$entropy = [Text.Encoding]::UTF8.GetBytes("$service`0$account")
$secretBytes = [Security.Cryptography.ProtectedData]::Unprotect(
  $protectedBytes,
  $entropy,
  [Security.Cryptography.DataProtectionScope]::CurrentUser
)
$appSecret = [Text.Encoding]::UTF8.GetString($secretBytes)
if ([string]::IsNullOrWhiteSpace($appSecret)) { throw 'Unable to read Feishu app secret from DPAPI.' }

$tokenDirectory = Join-Path $HOME '.photoatelier'
$tokenPath = Join-Path $tokenDirectory 'sync-token.txt'
New-Item -ItemType Directory -Path $tokenDirectory -Force | Out-Null
if (Test-Path -LiteralPath $tokenPath) {
  $syncToken = (Get-Content -LiteralPath $tokenPath -Raw).Trim()
} else {
  $random = New-Object byte[] 32
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($random)
  $syncToken = Convert-ToBase64Url $random
  [IO.File]::WriteAllText($tokenPath, $syncToken, [Text.UTF8Encoding]::new($false))
}

$appSecret | & wrangler secret put FEISHU_APP_SECRET --config $ConfigPath
if ($LASTEXITCODE -ne 0) { throw 'Failed to configure FEISHU_APP_SECRET.' }
$syncToken | & wrangler secret put APP_SYNC_TOKEN --config $ConfigPath
if ($LASTEXITCODE -ne 0) { throw 'Failed to configure APP_SYNC_TOKEN.' }

[pscustomobject]@{
  ok = $true
  syncTokenPath = $tokenPath
  configuredSecrets = @('FEISHU_APP_SECRET', 'APP_SYNC_TOKEN')
} | ConvertTo-Json -Depth 3
