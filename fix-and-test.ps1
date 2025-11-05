# Script to fix package-lock.json and test all fixes
Write-Host "🔧 Fixing package-lock.json sync issue..." -ForegroundColor Cyan

# Update package-lock.json
Write-Host "Running npm install to update package-lock.json..." -ForegroundColor Yellow
npm install

Write-Host "✅ Package lock file updated" -ForegroundColor Green

# Test linting
Write-Host "`n🧪 Testing linting..." -ForegroundColor Cyan
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Linting failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Linting passed" -ForegroundColor Green

# Test type checking
Write-Host "`n🧪 Testing type checking..." -ForegroundColor Cyan
npm run type-check
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Type checking failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Type checking passed" -ForegroundColor Green

# Test build
Write-Host "`n🧪 Testing build..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build passed" -ForegroundColor Green

Write-Host "`n✅ All tests passed! Ready to commit and push." -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. git add package-lock.json" -ForegroundColor White
Write-Host "2. git add .github/workflows/ vercel.json" -ForegroundColor White
Write-Host "3. git commit -m 'Fix package-lock.json sync and CI/CD workflows'" -ForegroundColor White
Write-Host "4. git push origin latest-changes" -ForegroundColor White

