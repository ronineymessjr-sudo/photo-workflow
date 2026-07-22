param(
  [Parameter(Mandatory = $true)][string]$BaseToken,
  [Parameter(Mandatory = $true)][string]$TableId,
  [ValidateSet('user', 'bot')][string]$Identity = 'bot'
)

$ErrorActionPreference = 'Stop'
$script:TempJsonFiles = @()

function Invoke-LarkJson {
  param([string[]]$Arguments)

  $previousPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  $stderrFile = New-TemporaryFile
  $output = & lark-cli @Arguments 2>$stderrFile
  $exitCode = $LASTEXITCODE
  $stderr = Get-Content -LiteralPath $stderrFile -Raw
  Remove-Item -LiteralPath $stderrFile -Force
  $ErrorActionPreference = $previousPreference
  if ($exitCode -ne 0) {
    throw (($output -join [Environment]::NewLine) + $stderr)
  }
  return (($output -join [Environment]::NewLine) | ConvertFrom-Json)
}

function Convert-JsonArgument {
  param([object]$Value)
  $fileName = ".photoatelier-feishu-cleanup-{0}.json" -f [guid]::NewGuid()
  $path = Join-Path (Get-Location) $fileName
  $json = $Value | ConvertTo-Json -Compress -Depth 8
  [System.IO.File]::WriteAllText($path, $json, [System.Text.UTF8Encoding]::new($false))
  $script:TempJsonFiles += $path
  return "@./$fileName"
}

function Update-Field {
  param([string]$FieldId, [hashtable]$Field)
  Invoke-LarkJson @(
    'base', '+field-update', '--as', $Identity, '--base-token', $BaseToken,
    '--table-id', $TableId, '--field-id', $FieldId,
    '--json', (Convert-JsonArgument $Field), '--yes'
  ) | Out-Null
}

$primaryFieldId = 'fldYBuiY6J'
$attachmentFieldId = 'fld4VYuodc'

Update-Field $primaryFieldId @{ name = 'id'; type = 'text'; style = @{ type = 'plain' } }
Update-Field $attachmentFieldId @{ name = 'projectFiles'; type = 'attachment' }

[pscustomobject]@{
  ok = $true
  tableId = $TableId
  renamedPrimary = $true
  renamedAttachment = $true
} | ConvertTo-Json -Depth 4

$script:TempJsonFiles | ForEach-Object { Remove-Item -LiteralPath $_ -Force -ErrorAction SilentlyContinue }
