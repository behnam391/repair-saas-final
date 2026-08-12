param(
  [string]$InputPath = "C:\Users\Behnam\Desktop\Peyvo.png",
  [string]$OutputPath = "C:\Users\Behnam\Desktop\Peyvo-CafeBazaar-512.png"
)

Add-Type -AssemblyName System.Drawing
$source = [Drawing.Bitmap]::FromFile($InputPath)

$left = $source.Width
$top = $source.Height
$right = -1
$bottom = -1
for ($y = 0; $y -lt $source.Height; $y += 3) {
  for ($x = 0; $x -lt $source.Width; $x += 3) {
    if ($source.GetPixel($x, $y).A -gt 10) {
      if ($x -lt $left) { $left = $x }
      if ($x -gt $right) { $right = $x }
      if ($y -lt $top) { $top = $y }
      if ($y -gt $bottom) { $bottom = $y }
    }
  }
}

if ($right -lt $left -or $bottom -lt $top) { throw "No visible logo pixels found." }

$crop = [Drawing.Rectangle]::FromLTRB([Math]::Max(0,$left-18), [Math]::Max(0,$top-18), [Math]::Min($source.Width,$right+19), [Math]::Min($source.Height,$bottom+19))
$canvas = New-Object Drawing.Bitmap 512, 512, ([Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [Drawing.Graphics]::FromImage($canvas)
$graphics.Clear([Drawing.Color]::Transparent)
$graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$maxWidth = 440
$maxHeight = 440
$scale = [Math]::Min($maxWidth / $crop.Width, $maxHeight / $crop.Height)
$destWidth = [int][Math]::Round($crop.Width * $scale)
$destHeight = [int][Math]::Round($crop.Height * $scale)
$destX = [int]((512 - $destWidth) / 2)
$destY = [int]((512 - $destHeight) / 2)
$dest = New-Object Drawing.Rectangle $destX, $destY, $destWidth, $destHeight
$graphics.DrawImage($source, $dest, $crop, [Drawing.GraphicsUnit]::Pixel)
$canvas.Save($OutputPath, [Drawing.Imaging.ImageFormat]::Png)

$graphics.Dispose()
$canvas.Dispose()
$source.Dispose()
