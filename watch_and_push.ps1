# Auto Git Push Watcher for Az Tacos King
# Watches for file modifications and automatically commits and pushes to GitHub

$repoPath = $PSScriptRoot
Set-Location $repoPath

Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "  AZ TACOS KING - AUTOMATIC GITHUB PUSH WATCHER ACTIVE  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "Monitoring folder: $repoPath" -ForegroundColor Gray
Write-Host "Any saved edits will be committed & pushed automatically!" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop watching at any time." -ForegroundColor DarkGray
Write-Host ""

$debounceSeconds = 3
$lastPushTime = [DateTime]::MinValue

while ($true) {
    Start-Sleep -Seconds 2
    
    # Check if git detects any modified, untracked, or deleted files
    $status = git status --porcelain 2>$null
    if ($status) {
        $now = Get-Date
        if (($now - $lastPushTime).TotalSeconds -ge $debounceSeconds) {
            Write-Host "[$($now.ToString('HH:mm:ss'))] Changes detected! Staging and committing..." -ForegroundColor Magenta
            
            git add .
            $commitMsg = "Auto-update: $($now.ToString('MMM dd, yyyy - hh:mm:ss tt'))"
            git commit -m $commitMsg
            
            Write-Host "Pushing to GitHub (origin main)..." -ForegroundColor Cyan
            $pushResult = git push origin main 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[$($now.ToString('HH:mm:ss'))] Successfully pushed to GitHub!" -ForegroundColor Green
            } else {
                Write-Host "Notice during push: $pushResult" -ForegroundColor Yellow
                Write-Host "If authentication is required, complete it in the popup or in GitHub Desktop." -ForegroundColor Gray
            }
            Write-Host ""
            $lastPushTime = Get-Date
        }
    }
}
