param(
    [string]$SourceRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$DestinationDirectory = "$env:USERPROFILE\Downloads",
    [string]$ObsidianVault = "$env:USERPROFILE\Documents\Obsidian Vault"
)

$ErrorActionPreference = 'Stop'

$source = [IO.Path]::GetFullPath($SourceRoot)
$destination = [IO.Path]::GetFullPath($DestinationDirectory)
$tempBase = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$stage = Join-Path $tempBase ("PhotoAtelier-ChatGPT-Handoff-" + [guid]::NewGuid().ToString('N'))
$stage = [IO.Path]::GetFullPath($stage)

if (-not $stage.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe staging path: $stage"
}

$projectStage = Join-Path $stage 'PhotoAtelier'
$archivePath = $null

try {
    New-Item -ItemType Directory -Path $projectStage -Force | Out-Null
    New-Item -ItemType Directory -Path $destination -Force | Out-Null

    $excludedDirectories = @(
        (Join-Path $source '.git'),
        (Join-Path $source 'node_modules'),
        (Join-Path $source '.browser-profile'),
        (Join-Path $source '.cache'),
        (Join-Path $source '.wrangler'),
        (Join-Path $source 'data\platform-debug')
    )
    $excludedFiles = @(
        'local-obsidian-config.json',
        '.photoatelier-feishu-*.json',
        'PhotoAtelier-ChatGPT-Handoff-*.zip',
        'PhotoAtelier-ChatGPT-Complete-Handoff-*.zip',
        '.env',
        '.env.local',
        '.dev.vars',
        '*.log'
    )
    $robocopyArguments = @(
        $source,
        $projectStage,
        '/E',
        '/R:1',
        '/W:1',
        '/NFL',
        '/NDL',
        '/NJH',
        '/NJS',
        '/NP',
        '/XD'
    ) + $excludedDirectories + @('/XF') + $excludedFiles

    & robocopy @robocopyArguments | Out-Null
    if ($LASTEXITCODE -gt 7) {
        throw "Robocopy failed with exit code $LASTEXITCODE"
    }

    $obsidianStage = Join-Path $projectStage 'context\obsidian'
    $poseFolderName = -join @([char]0x6444, [char]0x5F71, [char]0x59FF, [char]0x52BF, [char]0x5E93)
    New-Item -ItemType Directory -Path $obsidianStage -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $ObsidianVault $poseFolderName) -Destination $obsidianStage -Recurse -Force
    Copy-Item -LiteralPath (Join-Path $ObsidianVault 'Projects\photo-workflow.md') -Destination $obsidianStage -Force

    $files = Get-ChildItem -LiteralPath $projectStage -File -Recurse -Force | Sort-Object FullName
    $manifest = @(
        'PhotoAtelier complete handoff package',
        ('Created: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')),
        'Read first: START-HERE-CHATGPT-2026-07-14.md',
        ('File count before package metadata: ' + $files.Count),
        '',
        'Relative path | Bytes'
    )
    $manifest += @($files | ForEach-Object {
        $_.FullName.Substring($projectStage.Length + 1) + ' | ' + $_.Length
    })
    Set-Content -LiteralPath (Join-Path $projectStage 'PACKAGE-MANIFEST.txt') -Value $manifest -Encoding UTF8

    $summary = [ordered]@{
        createdAt = (Get-Date).ToString('o')
        source = $source
        readFirst = 'START-HERE-CHATGPT-2026-07-14.md'
        included = @(
            'source and documentation',
            'assets and current data samples',
            'tests and visual evidence',
            'dist-v2 deployable build',
            'Cloudflare Worker and Feishu integration code',
            'Obsidian photography pose library snapshot',
            'Obsidian photo-workflow note'
        )
        excluded = @(
            '.git',
            'node_modules',
            '.browser-profile',
            '.cache',
            '.wrangler',
            'data/platform-debug',
            'real Obsidian API configuration',
            'environment secrets',
            'temporary Feishu responses',
            'previous handoff ZIP files'
        )
        productionUrl = 'https://photoatelier.pages.dev/legacy/'
        immutableDeployment = 'https://bcfbd9ac.photoatelier.pages.dev/legacy/'
        testStatus = 'npm run test:all and npm run test:deployed passed on 2026-07-14'
    }
    $summary | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $projectStage 'PACKAGE-SUMMARY.json') -Encoding UTF8

    $archiveBase = Join-Path $destination 'PhotoAtelier-ChatGPT-Complete-Handoff-2026-07-14'
    $archivePath = "$archiveBase.zip"
    $version = 2
    while (Test-Path -LiteralPath $archivePath) {
        $archivePath = "$archiveBase-v$version.zip"
        $version++
    }

    Compress-Archive -LiteralPath $projectStage -DestinationPath $archivePath -CompressionLevel Optimal

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($archivePath)
    try {
        $entryNames = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
        $required = @(
            'PhotoAtelier/START-HERE-CHATGPT-2026-07-14.md',
            'PhotoAtelier/package.json',
            'PhotoAtelier/legacy/index.html',
            'PhotoAtelier/src/app-enhancements.js',
            'PhotoAtelier/PACKAGE-MANIFEST.txt',
            'PhotoAtelier/context/obsidian/photo-workflow.md'
        )
        $missing = @($required | Where-Object { $_ -notin $entryNames })
        if ($missing.Count) {
            throw "Archive validation failed. Missing: $($missing -join ', ')"
        }
        $entryCount = $archive.Entries.Count
    }
    finally {
        $archive.Dispose()
    }

    $zip = Get-Item -LiteralPath $archivePath
    $stagedFiles = Get-ChildItem -LiteralPath $projectStage -File -Recurse -Force
    [pscustomobject]@{
        zip = $zip.FullName
        sizeMB = [math]::Round($zip.Length / 1MB, 2)
        archiveEntries = $entryCount
        stagedFiles = $stagedFiles.Count
        uncompressedMB = [math]::Round((($stagedFiles | Measure-Object Length -Sum).Sum / 1MB), 2)
        validated = $true
    } | ConvertTo-Json -Compress
}
finally {
    if ((Test-Path -LiteralPath $stage) -and $stage.StartsWith($tempBase, [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $stage -Recurse -Force
    }
}
