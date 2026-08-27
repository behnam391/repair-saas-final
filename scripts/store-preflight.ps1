param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("bazaar", "myket")]
  [string]$Store,

  [Parameter(Mandatory = $true)]
  [string]$ApkPath
)

$ErrorActionPreference = "Stop"
$ExpectedPackage = "com.peyvo.app"
$ExpectedVersionCode = 10
$ExpectedVersionName = "1.3.6"
# Permanent Peyvo signing identity created for the unpublished store launch.
# Public certificate fingerprints are safe to keep in source control; the
# private .jks and its password stay outside the repository.
$ExpectedSigner = "5642e693db4f5db605a2321bf259a90d2e4b9d00ba9e320e292aced982a4e6d7"
$ExpectedPermission = if ($Store -eq "bazaar") { "com.farsitel.bazaar.permission.PAY_THROUGH_BAZAAR" } else { "ir.mservices.market.BILLING" }
$ForbiddenPermission = if ($Store -eq "bazaar") { "ir.mservices.market.BILLING" } else { "com.farsitel.bazaar.permission.PAY_THROUGH_BAZAAR" }

function Fail([string]$Message) {
  Write-Host "[FAIL] $Message" -ForegroundColor Red
  $script:Failed = $true
}

function Pass([string]$Message) {
  Write-Host "[PASS] $Message" -ForegroundColor Green
}

$ResolvedApk = (Resolve-Path -LiteralPath $ApkPath).Path
$SdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$BuildTools = Get-ChildItem -LiteralPath (Join-Path $SdkRoot "build-tools") -Directory | Sort-Object Name -Descending | Select-Object -First 1
if (-not $BuildTools) { throw "Android build-tools پیدا نشد." }
$ApkSigner = Join-Path $BuildTools.FullName "apksigner.bat"
$Aapt2 = Join-Path $BuildTools.FullName "aapt2.exe"
if (-not (Test-Path -LiteralPath $ApkSigner) -or -not (Test-Path -LiteralPath $Aapt2)) { throw "ابزار بررسی APK پیدا نشد." }

$script:Failed = $false
$Verify = & $ApkSigner verify --verbose --print-certs $ResolvedApk 2>&1 | Out-String
if ($LASTEXITCODE -ne 0 -or $Verify -notmatch "Verifies") { Fail "APK امضای معتبر ندارد." } else { Pass "امضای APK معتبر است." }
$Signer = ([regex]::Match($Verify, "Signer #1 certificate SHA-256 digest:\s*([0-9a-fA-F]+)")).Groups[1].Value.ToLowerInvariant()
if ($Signer -ne $ExpectedSigner) { Fail "امضا با کلید دائمی ثبت‌شده پیوو یکسان نیست؛ انتشار متوقف شد." } else { Pass "امضا با کلید دائمی ثبت‌شده پیوو یکسان است." }

$Badging = & $Aapt2 dump badging $ResolvedApk 2>&1 | Out-String
$Package = ([regex]::Match($Badging, "package: name='([^']+)'" )).Groups[1].Value
$VersionCode = ([regex]::Match($Badging, "versionCode='(\d+)'" )).Groups[1].Value
$VersionName = ([regex]::Match($Badging, "versionName='([^']+)'" )).Groups[1].Value
if ($Package -ne $ExpectedPackage) { Fail "شناسه برنامه باید $ExpectedPackage باشد." } else { Pass "شناسه برنامه صحیح است." }
if ([int]$VersionCode -ne $ExpectedVersionCode) { Fail "versionCode باید دقیقاً $ExpectedVersionCode باشد." } else { Pass "versionCode جدید است: $VersionCode" }
if ($VersionName -ne $ExpectedVersionName) { Fail "versionName باید دقیقاً $ExpectedVersionName باشد." } else { Pass "versionName صحیح است: $VersionName" }
if ($Badging -notmatch [regex]::Escape($ExpectedPermission)) { Fail "مجوز پرداخت $Store داخل APK نیست." } else { Pass "مجوز پرداخت اختصاصی $Store موجود است." }
if ($Badging -match [regex]::Escape($ForbiddenPermission)) { Fail "مجوز فروشگاه دیگر اشتباهاً داخل APK قرار گرفته است." } else { Pass "مجوز فروشگاه دیگر داخل APK نیست." }
if ($Badging -match "com.google.android.gms.permission.AD_ID") { Fail "مجوز تبلیغاتی AD_ID نباید داخل APK باشد." } else { Pass "مجوز تبلیغاتی AD_ID داخل APK نیست." }

Add-Type -AssemblyName System.IO.Compression.FileSystem
$Zip = [System.IO.Compression.ZipFile]::OpenRead($ResolvedApk)
try {
  $Entry = $Zip.GetEntry("assets/capacitor.config.json")
  if (-not $Entry) { Fail "تنظیمات Capacitor داخل APK پیدا نشد." }
  else {
    $Reader = New-Object System.IO.StreamReader($Entry.Open())
    try { $Config = ($Reader.ReadToEnd() | ConvertFrom-Json) } finally { $Reader.Dispose() }
    if ($Config.server.url -ne "https://peyvo.ir/login") { Fail "نسخه فروشگاهی باید مستقیماً صفحه ورود اپ را باز کند." } else { Pass "مسیر شروع امن فروشگاهی تنظیم است." }
    if ($Config.android.appendUserAgent -ne "PeyvoNativeApp") { Fail "شناسه WebView فروشگاهی تنظیم نیست." } else { Pass "شناسه WebView فروشگاهی تنظیم است." }
    if ($Config.server.errorPath -ne "index.html") { Fail "صفحه جایگزین خطای اتصال فعال نیست." } else { Pass "صفحه جایگزین خطای اتصال فعال است." }
  }
} finally { $Zip.Dispose() }

if ($script:Failed) {
  Write-Host "`nاین APK برای ارسال به فروشگاه آماده نیست." -ForegroundColor Red
  exit 1
}
Write-Host "`nAPK نسخه $Store تمام کنترل‌های انتشار را با موفقیت گذراند." -ForegroundColor Cyan
