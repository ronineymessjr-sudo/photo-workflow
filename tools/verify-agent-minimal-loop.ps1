param(
  [string]$ApiBase = 'https://photoatelier-v2-api.photomagic.workers.dev'
)

$ErrorActionPreference = 'Stop'
$token = (Get-Content -LiteralPath (Join-Path $HOME '.photoatelier\sync-token.txt') -Raw).Trim()
$headers = @{ 'X-PhotoAtelier-Token' = $token }
$suffix = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$projectId = "verify-agent-project-$suffix"
$now = [DateTime]::UtcNow.ToString('o')
$result = $null

function Invoke-AgentApi {
  param([string]$Method, [string]$Path, $Body = $null)
  $params = @{ Method = $Method; Uri = "$ApiBase$Path"; Headers = $headers }
  if ($null -ne $Body) {
    $params.ContentType = 'application/json; charset=utf-8'
    $params.Body = ($Body | ConvertTo-Json -Depth 20)
  }
  Invoke-RestMethod @params
}

function ProjectRecords {
  param([string]$Entity)
  $response = Invoke-AgentApi -Method Get -Path "/api/feishu/$Entity/records"
  @($response.records | Where-Object { $_.projectId -eq $projectId -or ($Entity -eq 'projects' -and $_.id -eq $projectId) })
}

try {
  Invoke-AgentApi -Method Post -Path '/api/feishu/projects/sync' -Body @{ records = @(@{
    id = $projectId
    title = 'Agent minimal loop verification'
    status = 'active'
    shootingType = 'portrait'
    date = [DateTime]::UtcNow.ToString('yyyy-MM-dd')
    location = 'Shanghai'
    style = 'cinematic'
    brief = 'Verify draft-before-approval invariant.'
    createdAt = $now
    updatedAt = $now
  }) } | Out-Null

  $draft = Invoke-AgentApi -Method Post -Path '/api/v1/agent/plans/draft' -Body @{ project_id = $projectId; options = @{} }
  $afterDraft = @{
    plans = @(ProjectRecords 'plans').Count
    shots = @(ProjectRecords 'shots').Count
    tasks = @(ProjectRecords 'tasks').Count
    luts = @(ProjectRecords 'luts').Count
  }
  $run = Invoke-AgentApi -Method Get -Path "/api/v1/agent/runs/$($draft.run_id)"
  $approved = Invoke-AgentApi -Method Post -Path "/api/v1/agent/runs/$($draft.run_id)/approve" -Body @{}
  $afterApproval = @{
    plans = @(ProjectRecords 'plans').Count
    shots = @(ProjectRecords 'shots').Count
    tasks = @(ProjectRecords 'tasks').Count
    luts = @(ProjectRecords 'luts').Count
  }
  $approvedAgain = Invoke-AgentApi -Method Post -Path "/api/v1/agent/runs/$($draft.run_id)/approve" -Body @{}
  $afterRepeat = @{
    plans = @(ProjectRecords 'plans').Count
    shots = @(ProjectRecords 'shots').Count
    tasks = @(ProjectRecords 'tasks').Count
    luts = @(ProjectRecords 'luts').Count
  }

  $result = [pscustomobject]@{
    ok = (
      $draft.status -eq 'awaiting_approval' -and
      $run.status -eq 'awaiting_approval' -and
      $afterDraft.plans -eq 1 -and $afterDraft.shots -eq 0 -and $afterDraft.tasks -eq 0 -and $afterDraft.luts -eq 0 -and
      $approved.status -eq 'completed' -and
      $afterApproval.shots -gt 0 -and $afterApproval.tasks -gt 0 -and $afterApproval.luts -eq 1 -and
      $approvedAgain.idempotent -eq $true -and
      $afterRepeat.shots -eq $afterApproval.shots -and $afterRepeat.tasks -eq $afterApproval.tasks -and $afterRepeat.luts -eq $afterApproval.luts
    )
    runStatusBeforeApproval = $run.status
    afterDraft = $afterDraft
    afterApproval = $afterApproval
    repeatApprovalIdempotent = $approvedAgain.idempotent
    afterRepeatApproval = $afterRepeat
  }
}
finally {
  foreach ($entity in @('shots', 'tasks', 'luts', 'plans', 'messages', 'projects')) {
    $ids = @(ProjectRecords $entity | ForEach-Object { $_.id })
    if ($ids.Count) { Invoke-AgentApi -Method Post -Path "/api/feishu/$entity/delete" -Body @{ ids = $ids } | Out-Null }
  }
}

$result | ConvertTo-Json -Depth 8
