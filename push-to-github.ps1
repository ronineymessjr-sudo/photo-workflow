# PhotoAtelier GitHub Push Script
# Usage: powershell -ExecutionPolicy Bypass -File push-to-github.ps1

$ErrorActionPreference = "Stop"

Write-Host "PhotoAtelier GitHub Push Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path "api\index.js")) {
    Write-Host "ERROR: Please run in photo-workflow directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$githubUsername = Read-Host "Enter your GitHub username"
if ([string]::IsNullOrWhiteSpace($githubUsername)) {
    Write-Host "ERROR: Username cannot be empty" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

$repoName = Read-Host "Enter repo name (default: photoatelier)"
if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = "photoatelier"
}

Write-Host ""
Write-Host "Config:" -ForegroundColor Yellow
Write-Host "  GitHub User: $githubUsername" -ForegroundColor White
Write-Host "  Repo Name: $repoName" -ForegroundColor White
Write-Host ""

$confirm = Read-Host "Confirm? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled" -ForegroundColor Yellow
    exit 0
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Git not found. Install from https://git-scm.com/download/win" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Setting up..." -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
    Write-Host "  -> Initializing git repo..." -ForegroundColor Gray
    git init
    git branch -M main
} else {
    Write-Host "  -> Git repo exists" -ForegroundColor Gray
}

$userName = git config user.name
$userEmail = git config user.email

if ([string]::IsNullOrWhiteSpace($userName)) {
    Write-Host "  -> Setting git username..." -ForegroundColor Gray
    git config user.name "$githubUsername"
}
if ([string]::IsNullOrWhiteSpace($userEmail)) {
    $email = Read-Host "Enter your email"
    Write-Host "  -> Setting git email..." -ForegroundColor Gray
    git config user.email "$email"
}

Write-Host "  -> Staging files..." -ForegroundColor Gray
git add .

Write-Host "  -> Creating commit..." -ForegroundColor Gray
$commitMsg = "Initial commit - PhotoAtelier"
git commit -m $commitMsg 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "  -> Nothing new to commit" -ForegroundColor Gray
}

$remoteUrl = "https://github.com/$githubUsername/$repoName.git"
Write-Host "  -> Remote: $remoteUrl" -ForegroundColor Gray

$existingRemote = $null
try { $existingRemote = git remote get-url origin 2>&1 } catch {}
if ($existingRemote -and $LASTEXITCODE -eq 0) {
    Write-Host "  -> Updating remote URL..." -ForegroundColor Gray
    git remote set-url origin $remoteUrl
} else {
    git remote add origin $remoteUrl
}

Write-Host ""
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
Write-Host "  If asked for password, use GitHub Personal Access Token" -ForegroundColor Yellow
Write-Host ""

try {
    git push -u origin main

    Write-Host ""
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Repo: https://github.com/$githubUsername/$repoName" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Open repo -> Settings -> Secrets and variables -> Actions" -ForegroundColor White
    Write-Host "  2. Add these Secrets:" -ForegroundColor White
    Write-Host "     CLOUDFLARE_API_TOKEN = your token" -ForegroundColor Gray
    Write-Host "     JWT_SECRET = photoatelier-jwt-secret-2025" -ForegroundColor Gray
    Write-Host "     SUPABASE_URL = woywgfoqurumrkyoznnb.supabase.co" -ForegroundColor Gray
    Write-Host "     SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIs..." -ForegroundColor Gray
    Write-Host ""

    $openBrowser = Read-Host "Open repo in browser? (y/n)"
    if ($openBrowser -eq "y" -or $openBrowser -eq "Y") {
        Start-Process "https://github.com/$githubUsername/$repoName"
    }

} catch {
    Write-Host ""
    Write-Host "PUSH FAILED" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible causes:" -ForegroundColor Yellow
    Write-Host "  1. Repo does not exist - create at https://github.com/new" -ForegroundColor White
    Write-Host "  2. Auth failed - use GitHub Token as password" -ForegroundColor White
    Write-Host "  3. Network issue" -ForegroundColor White
}

Write-Host ""
Read-Host "Press Enter to exit"
