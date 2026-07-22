param(
  [Parameter(Mandatory = $true)][string]$BaseToken,
  [Parameter(Mandatory = $true)][string]$ProjectsTableId,
  [ValidateSet('user', 'bot')][string]$Identity = 'user'
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
  $fileName = ".photoatelier-feishu-{0}.json" -f [guid]::NewGuid()
  $path = Join-Path (Get-Location) $fileName
  $json = $Value | ConvertTo-Json -Compress -Depth 8
  [System.IO.File]::WriteAllText($path, $json, [System.Text.UTF8Encoding]::new($false))
  $script:TempJsonFiles += $path
  return "@./$fileName"
}

function New-TextField {
  param([string]$Name, [string]$Style = 'plain')
  return @{ name = $Name; type = 'text'; style = @{ type = $Style } }
}

function New-NumberField {
  param([string]$Name)
  return @{ name = $Name; type = 'number'; style = @{ type = 'plain'; formatter = '0' } }
}

function Add-Field {
  param([string]$TableId, [hashtable]$Field)
  Invoke-LarkJson @(
    'base', '+field-create', '--as', $Identity, '--base-token', $BaseToken,
    '--table-id', $TableId, '--json', (Convert-JsonArgument $Field)
  ) | Out-Null
}

function Update-Field {
  param([string]$FieldId, [hashtable]$Field)
  Invoke-LarkJson @(
    'base', '+field-update', '--as', $Identity, '--base-token', $BaseToken,
    '--table-id', $ProjectsTableId, '--field-id', $FieldId,
    '--json', (Convert-JsonArgument $Field), '--yes'
  ) | Out-Null
}

function Ensure-Fields {
  param([string]$TableId, [object[]]$Fields)
  $current = Invoke-LarkJson @(
    'base', '+field-list', '--as', $Identity, '--base-token', $BaseToken, '--table-id', $TableId
  )
  $names = @($current.data.fields | ForEach-Object { $_.name })
  foreach ($field in $Fields) {
    if ($names -notcontains $field.name) { Add-Field $TableId $field }
  }
}

function Ensure-Table {
  param([string]$Name, [object[]]$Fields)
  $allTables = Invoke-LarkJson @('base', '+table-list', '--as', $Identity, '--base-token', $BaseToken)
  $existing = $allTables.data.tables | Where-Object { $_.name -eq $Name } | Select-Object -First 1
  if ($existing) {
    Ensure-Fields $existing.id $Fields
    return $existing.id
  }

  $created = Invoke-LarkJson @(
      'base', '+table-create', '--as', $Identity, '--base-token', $BaseToken,
      '--name', $Name, '--fields', (Convert-JsonArgument $Fields)
    )
  return $created.data.table.id
}

$projectCurrent = Invoke-LarkJson @(
  'base', '+field-list', '--as', $Identity, '--base-token', $BaseToken, '--table-id', $ProjectsTableId
)
$bootstrapFields = @(
  @{ id = 'fldCGDvO5d'; definition = (New-TextField 'id') },
  @{ id = 'fldIar0Hbv'; definition = (New-TextField 'status') },
  @{ id = 'fldGGM2qgs'; definition = (New-TextField 'date') },
  @{ id = 'fldgwGIOap'; definition = @{ name = 'projectFiles'; type = 'attachment' } }
)
foreach ($bootstrap in $bootstrapFields) {
  $field = $projectCurrent.data.fields | Where-Object { $_.id -eq $bootstrap.id } | Select-Object -First 1
  if ($field -and $field.name -ne $bootstrap.definition.name) {
    Update-Field $bootstrap.id $bootstrap.definition
  }
}

Ensure-Fields $ProjectsTableId @(
  New-TextField 'id'; New-TextField 'status'; New-TextField 'date'; New-TextField 'title';
  New-TextField 'shootingType'; New-TextField 'location'; New-TextField 'style'; New-TextField 'brief';
  New-TextField 'createdAt'; New-TextField 'updatedAt'; New-TextField 'payloadJson'
)

$tables = [ordered]@{ projects = $ProjectsTableId }
$tables.references = Ensure-Table 'References' @(
  New-TextField 'id'; New-TextField 'projectId'; New-TextField 'title';
  New-TextField 'sourcePlatform'; New-TextField 'sourceUrl' 'url'; New-TextField 'styleTags';
  New-TextField 'category'; New-TextField 'notes'; New-TextField 'provider';
  New-TextField 'externalId'; New-TextField 'previewUrl' 'url'; New-TextField 'photographer';
  New-TextField 'obsidianPath'; New-TextField 'createdAt'; New-TextField 'updatedAt'; New-TextField 'payloadJson'
)
$tables.plans = Ensure-Table 'Plans' @(
  New-TextField 'id'; New-TextField 'projectId'; New-TextField 'concept'; New-TextField 'rationale';
  New-TextField 'generationMode'; New-TextField 'visualDirection'; New-TextField 'equipment';
  New-TextField 'risks'; New-TextField 'createdAt'; New-TextField 'updatedAt'; New-TextField 'payloadJson'
)
$tables.shots = Ensure-Table 'Shots' @(
  New-TextField 'id'; New-TextField 'projectId'; New-TextField 'planId'; New-NumberField 'sequence';
  New-TextField 'scene'; New-TextField 'shotSize'; New-TextField 'focalLength'; New-TextField 'composition';
  New-TextField 'lighting'; New-TextField 'pose'; New-NumberField 'durationMinutes'; New-TextField 'priority';
  New-TextField 'fallback'; New-TextField 'createdAt'; New-TextField 'updatedAt'; New-TextField 'payloadJson'
)
$tables.tasks = Ensure-Table 'Tasks' @(
  New-TextField 'id'; New-TextField 'projectId'; New-TextField 'planId'; New-TextField 'phase';
  New-TextField 'status'; New-TextField 'title'; New-TextField 'startAt'; New-TextField 'dueAt';
  New-TextField 'createdAt'; New-TextField 'updatedAt'; New-TextField 'payloadJson'
)
$tables.luts = Ensure-Table 'LUTs' @(
  New-TextField 'id'; New-TextField 'projectId'; New-TextField 'planId'; New-TextField 'name';
  New-TextField 'inputColorSpace'; New-TextField 'fileUrl' 'url'; New-TextField 'style';
  New-NumberField 'strength'; New-TextField 'notes'; New-TextField 'createdAt';
  New-TextField 'updatedAt'; New-TextField 'payloadJson'
)
$tables.reviews = Ensure-Table 'Reviews' @(
  New-TextField 'id'; New-TextField 'projectId'; New-TextField 'planId'; New-NumberField 'planScore';
  New-NumberField 'executionScore'; New-TextField 'successes'; New-TextField 'failures';
  New-TextField 'nextActions'; New-TextField 'createdAt'; New-TextField 'updatedAt'; New-TextField 'payloadJson'
)
$tables.messages = Ensure-Table 'Messages' @(
  New-TextField 'id'; New-TextField 'projectId'; New-TextField 'type'; New-TextField 'status';
  New-TextField 'content'; New-TextField 'createdAt'; New-TextField 'updatedAt'; New-TextField 'payloadJson'
)

[pscustomobject]@{
  ok = $true
  baseToken = $BaseToken
  tables = $tables
} | ConvertTo-Json -Depth 4

$script:TempJsonFiles | ForEach-Object { Remove-Item -LiteralPath $_ -Force -ErrorAction SilentlyContinue }
