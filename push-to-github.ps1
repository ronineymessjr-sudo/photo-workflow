$ErrorActionPreference = 'Stop'

Write-Host "PhotoAtelier V2 pre-push validation" -ForegroundColor Cyan
npm ci
npm run test:release

Write-Host "Validation complete." -ForegroundColor Green
Write-Host "Review CHANGELOG-V2.3-ITERATIVE.md and TEST-REPORT-V2.3.md before committing." -ForegroundColor Yellow
Write-Host "Cloudflare and Worker secrets must be configured outside the repository." -ForegroundColor Yellow
