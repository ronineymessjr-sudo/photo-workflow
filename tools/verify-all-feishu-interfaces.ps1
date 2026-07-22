param(
  [string]$ApiBase = 'https://photoatelier-v2-api.photomagic.workers.dev'
)

$ErrorActionPreference = 'Stop'
$token = (Get-Content -LiteralPath (Join-Path $HOME '.photoatelier\sync-token.txt') -Raw).Trim()
$headers = @{ 'X-PhotoAtelier-Token' = $token }
$timestamp = [DateTime]::UtcNow.ToString('o')
$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

$samples = [ordered]@{
  projects = @{ id = "verify-project-$suffix"; title = 'Interface verification'; status = 'active'; shootingType = 'test'; createdAt = $timestamp; updatedAt = $timestamp }
  references = @{ id = "verify-reference-$suffix"; projectId = "verify-project-$suffix"; title = 'Reference verification'; sourcePlatform = 'local-test'; createdAt = $timestamp; updatedAt = $timestamp }
  plans = @{ id = "verify-plan-$suffix"; projectId = "verify-project-$suffix"; concept = 'Plan verification'; generationMode = 'test'; createdAt = $timestamp; updatedAt = $timestamp }
  shots = @{ id = "verify-shot-$suffix"; projectId = "verify-project-$suffix"; planId = "verify-plan-$suffix"; sequence = 1; scene = 'Test scene'; durationMinutes = 1; createdAt = $timestamp; updatedAt = $timestamp }
  tasks = @{ id = "verify-task-$suffix"; projectId = "verify-project-$suffix"; planId = "verify-plan-$suffix"; phase = 'test'; status = 'todo'; title = 'Task verification'; createdAt = $timestamp; updatedAt = $timestamp }
  luts = @{ id = "verify-lut-$suffix"; projectId = "verify-project-$suffix"; planId = "verify-plan-$suffix"; name = 'LUT verification'; strength = 50; createdAt = $timestamp; updatedAt = $timestamp }
  reviews = @{ id = "verify-review-$suffix"; projectId = "verify-project-$suffix"; planId = "verify-plan-$suffix"; planScore = 80; executionScore = 80; createdAt = $timestamp; updatedAt = $timestamp }
  messages = @{ id = "verify-message-$suffix"; projectId = "verify-project-$suffix"; type = 'test'; status = 'completed'; content = 'Message verification'; createdAt = $timestamp; updatedAt = $timestamp }
}

$results = @()
foreach ($entry in $samples.GetEnumerator()) {
  $entity = $entry.Key
  $record = $entry.Value
  $body = @{ records = @($record) } | ConvertTo-Json -Depth 8
  $sync = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/feishu/$entity/sync" -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $body
  $readback = Invoke-RestMethod -Method Get -Uri "$ApiBase/api/feishu/$entity/records" -Headers $headers
  $found = @($readback.records | Where-Object { $_.id -eq $record.id }).Count -eq 1
  $deleteBody = @{ ids = @($record.id) } | ConvertTo-Json
  $deleted = Invoke-RestMethod -Method Post -Uri "$ApiBase/api/feishu/$entity/delete" -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $deleteBody
  $results += [pscustomobject]@{
    entity = $entity
    writeOk = ($sync.ok -and @($sync.errors).Count -eq 0)
    readOk = $found
    deleteOk = ($deleted.ok -and $deleted.deleted -eq 1)
  }
}

[pscustomobject]@{
  ok = @($results | Where-Object { -not ($_.writeOk -and $_.readOk -and $_.deleteOk) }).Count -eq 0
  interfaces = $results
} | ConvertTo-Json -Depth 5
