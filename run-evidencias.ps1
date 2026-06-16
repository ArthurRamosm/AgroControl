param(
  [string]$User   = 'demo',
  [string]$Pass   = 'demo123',
  [string]$AppUrl = 'http://localhost:8081',
  [switch]$FullSuite
)

$env:TEST_USER = $User
$env:TEST_PASS = $Pass
$env:APP_URL   = $AppUrl

Write-Host ''
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host '  AgroControl - Testes E2E com Evidencias' -ForegroundColor Cyan
Write-Host '============================================================' -ForegroundColor Cyan
Write-Host "  Usuario : $User"
Write-Host "  App URL : $AppUrl"
Write-Host ''

Write-Host '[1/3] Verificando app ...' -ForegroundColor Yellow
try {
  $resp = Invoke-WebRequest -Uri $AppUrl -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
  Write-Host "      App respondendo HTTP $($resp.StatusCode)" -ForegroundColor Green
} catch {
  Write-Host '      AVISO: App nao respondeu. Inicie com: npx expo start --web' -ForegroundColor Red
}

Write-Host ''

if ($FullSuite) {
  $specArg = ''
  Write-Host '[2/3] Rodando suite completa ...' -ForegroundColor Yellow
} else {
  $specArg = 'e2e/evidencias.spec.ts'
  Write-Host '[2/3] Rodando evidencias.spec.ts - 15 testes ...' -ForegroundColor Yellow
}

Write-Host ''

if ($specArg -eq '') {
  npx playwright test --config e2e/playwright.config.ts
} else {
  npx playwright test $specArg --config e2e/playwright.config.ts
}

$exitCode = $LASTEXITCODE

Write-Host ''
Write-Host '[3/3] Abrindo relatorio HTML ...' -ForegroundColor Yellow
npx playwright show-report playwright-report/e2e

Write-Host ''
if ($exitCode -eq 0) {
  Write-Host '============================================================' -ForegroundColor Green
  Write-Host '  TODOS OS TESTES PASSARAM' -ForegroundColor Green
  Write-Host '============================================================' -ForegroundColor Green
} else {
  Write-Host '============================================================' -ForegroundColor Red
  Write-Host "  ALGUNS TESTES FALHARAM - codigo $exitCode" -ForegroundColor Red
  Write-Host '  Verifique o relatorio para detalhes e screenshots.' -ForegroundColor Red
  Write-Host '============================================================' -ForegroundColor Red
}

Write-Host ''
Write-Host 'Screenshots: screenshots/evidencias/' -ForegroundColor Cyan
Write-Host 'Relatorio  : playwright-report/e2e/index.html' -ForegroundColor Cyan
Write-Host ''

exit $exitCode
