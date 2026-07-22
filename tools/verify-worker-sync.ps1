param(
  [string]$ApiBase = 'https://photoatelier-v2-api.photomagic.workers.dev'
)

$ErrorActionPreference = 'Stop'
$tokenPath = Join-Path $HOME '.photoatelier\sync-token.txt'
$token = (Get-Content -LiteralPath $tokenPath -Raw).Trim()
$headers = @{ 'X-PhotoAtelier-Token' = $token }
$timestamp = [DateTime]::UtcNow.ToString('o')

$health = Invoke-RestMethod -Method Get -Uri "$ApiBase/api/health"
$record = @{
  id = 'project-bootstrap'
  title = 'PhotoAtelier v2.1 deployment verification'
  status = 'active'
  shootingType = 'system'
  date = [DateTime]::UtcNow.ToString('yyyy-MM-dd')
  location = 'Feishu Base'
  style = 'workflow verification'
  brief = 'Verify the end-to-end frontend, Worker, and Feishu Base sync path.'
  createdAt = $timestamp
  updatedAt = $timestamp
}
$body = @{ records = @($record) } | ConvertTo-Json -Depth 5
$sync = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/feishu/projects/sync" `
  -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $body
$readback = Invoke-RestMethod -Method Get -Uri "$ApiBase/api/feishu/projects/records" -Headers $headers
$matched = @($readback.records | Where-Object { $_.id -eq $record.id })

[pscustomobject]@{
  ok = ($health.ok -and $sync.ok -and $matched.Count -eq 1)
  health = @{
    service = $health.service
    syncProtected = $health.syncProtected
    feishuConfigured = $health.feishuConfigured
  }
  sync = @{
    created = $sync.created
    updated = $sync.updated
    conflicts = @($sync.conflicts).Count
    errors = @($sync.errors).Count
    errorDetails = @($sync.errors)
  }
  readback = @{
    totalBusinessRecords = @($readback.records).Count
    bootstrapRecordFound = ($matched.Count -eq 1)
  }
} | ConvertTo-Json -Depth 5
