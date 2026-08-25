param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("bazaar", "myket")]
  [string]$Store
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$Required = @("PEYVO_KEYSTORE_PATH", "PEYVO_KEYSTORE_PASSWORD", "PEYVO_KEY_ALIAS")
foreach ($Name in $Required) {
  if (-not (Get-Item "Env:$Name" -ErrorAction SilentlyContinue)) {
    throw "$Name تنظیم نشده است؛ ساخت نسخه نهایی متوقف شد."
  }
}
if (-not (Test-Path -LiteralPath $env:PEYVO_KEYSTORE_PATH)) { throw "فایل کلید امضا پیدا نشد." }
if (-not $env:JAVA_HOME) { $env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr" }

Push-Location $ProjectRoot
try {
  npm run android:sync
  if ($LASTEXITCODE -ne 0) { throw "همگام‌سازی اندروید ناموفق بود." }
  $Flavor = (Get-Culture).TextInfo.ToTitleCase($Store)
  Push-Location (Join-Path $ProjectRoot "android")
  try { & .\gradlew.bat "assemble${Flavor}Release" } finally { Pop-Location }
  if ($LASTEXITCODE -ne 0) { throw "ساخت APK ناموفق بود." }
  $Apk = Join-Path $ProjectRoot "android\app\build\outputs\apk\$Store\release\app-$Store-release.apk"
  & (Join-Path $PSScriptRoot "store-preflight.ps1") -Store $Store -ApkPath $Apk
  if ($LASTEXITCODE -ne 0) { throw "کنترل انتشار APK رد شد." }
  $Output = Join-Path $ProjectRoot "output\android-release"
  New-Item -ItemType Directory -Force -Path $Output | Out-Null
  Copy-Item -LiteralPath $Apk -Destination (Join-Path $Output "peyvo-1.3.4-$Store-release.apk") -Force
  Write-Host "نسخه نهایی در output\android-release آماده شد." -ForegroundColor Green
} finally { Pop-Location }
