param(
  [Parameter(Mandatory = $true)][string]$BaseToken,
  [string]$PlansTable = 'tblNrQT46I5iwkPZ',
  [string]$MessagesTable = 'tblF36evkJLHBVHf'
)

$ErrorActionPreference = 'Stop'

function Ensure-TextFields {
  param([string]$TableId, [string[]]$Names)
  $raw = (& lark-cli base +field-list --as bot --base-token $BaseToken --table-id $TableId) | Out-String
  $current = ($raw | ConvertFrom-Json).data.fields.name
  $created = @()
  foreach ($name in $Names) {
    if ($current -contains $name) { continue }
    $definition = (@{ name = $name; type = 'text' } | ConvertTo-Json -Compress).Replace('"', '\"')
    $createRaw = (& lark-cli base +field-create --as bot --base-token $BaseToken --table-id $TableId --json $definition) | Out-String
    $createResult = $createRaw | ConvertFrom-Json
    if (-not $createResult.ok) { throw "Failed to create field $name`: $($createResult.error.message)" }
    $created += $name
  }
  return $created
}

$plans = Ensure-TextFields -TableId $PlansTable -Names @(
  'status', 'agentRunId', 'agentStatus', 'provider', 'model', 'promptVersion', 'schemaVersion',
  'contextSnapshotJson', 'outputJson', 'validationJson', 'userApproved', 'parentPlanId', 'traceId', 'approvedAt'
)
$messages = Ensure-TextFields -TableId $MessagesTable -Names @(
  'severity', 'relatedEntity', 'relatedId', 'traceId', 'metadataJson'
)

[pscustomobject]@{ ok = $true; plansCreated = $plans; messagesCreated = $messages } | ConvertTo-Json -Depth 4
