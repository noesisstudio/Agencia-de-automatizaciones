Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "logos\png"
$brandOut = Join-Path $root "brand"
New-Item -ItemType Directory -Force -Path $out | Out-Null
New-Item -ItemType Directory -Force -Path $brandOut | Out-Null

function Color-Hex($hex, [int]$alpha = 255) {
  $clean = $hex.TrimStart("#")
  $r = [Convert]::ToInt32($clean.Substring(0, 2), 16)
  $g = [Convert]::ToInt32($clean.Substring(2, 2), 16)
  $b = [Convert]::ToInt32($clean.Substring(4, 2), 16)
  return [System.Drawing.Color]::FromArgb($alpha, $r, $g, $b)
}

function New-Surface([int]$w, [int]$h, [System.Drawing.Color]$background) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear($background)
  return @{ Bitmap = $bmp; Graphics = $g }
}

function Save-Surface($surface, [string]$path) {
  $surface.Bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $surface.Graphics.Dispose()
  $surface.Bitmap.Dispose()
}

function Add-CompassPath([double]$cx, [double]$cy, [double]$outer, [double]$inner) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $points = @(
    [System.Drawing.PointF]::new($cx, $cy - $outer),
    [System.Drawing.PointF]::new($cx + $inner, $cy - $inner),
    [System.Drawing.PointF]::new($cx + $outer, $cy),
    [System.Drawing.PointF]::new($cx + $inner, $cy + $inner),
    [System.Drawing.PointF]::new($cx, $cy + $outer),
    [System.Drawing.PointF]::new($cx - $inner, $cy + $inner),
    [System.Drawing.PointF]::new($cx - $outer, $cy),
    [System.Drawing.PointF]::new($cx - $inner, $cy - $inner)
  )
  $path.AddPolygon($points)
  return $path
}

function Draw-NoesisMark($g, [double]$cx, [double]$cy, [double]$scale, [bool]$light = $false, [bool]$badge = $false) {
  $green = Color-Hex "#123C35"
  $green2 = Color-Hex "#1E6F62"
  $aqua = Color-Hex "#2E8C7C"
  $paper = Color-Hex "#FBFAF5"
  $ivory = Color-Hex "#F6F2E8"
  $mist = Color-Hex "#DDE9E5"

  if ($badge) {
    $badgeBrush = New-Object System.Drawing.SolidBrush $paper
    $badgePen = New-Object System.Drawing.Pen (Color-Hex "#2E8C7C" 72), (8 * $scale)
    $g.FillEllipse($badgeBrush, $cx - 224 * $scale, $cy - 224 * $scale, 448 * $scale, 448 * $scale)
    $g.DrawEllipse($badgePen, $cx - 224 * $scale, $cy - 224 * $scale, 448 * $scale, 448 * $scale)
    $badgeBrush.Dispose()
    $badgePen.Dispose()
  }

  $line = if ($light) { $ivory } else { $green }
  $soft = if ($light) { $mist } else { $aqua }
  $outline = if ($light) { $ivory } else { $green2 }
  $centerFill = if ($light) { $green } else { $paper }

  $outerRing = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(88, $soft)), (6 * $scale)
  $innerRing = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(44, $line), (5 * $scale))
  $axisPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(48, $line), (5 * $scale))
  $outlinePen = New-Object System.Drawing.Pen $outline, (18 * $scale)
  $fillPen = New-Object System.Drawing.Pen $line, (10 * $scale)
  $fillBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(30, $soft))
  $centerBrush = New-Object System.Drawing.SolidBrush $centerFill
  $centerPen = New-Object System.Drawing.Pen $line, (14 * $scale)

  $g.DrawEllipse($outerRing, $cx - 178 * $scale, $cy - 178 * $scale, 356 * $scale, 356 * $scale)
  $g.DrawEllipse($innerRing, $cx - 108 * $scale, $cy - 108 * $scale, 216 * $scale, 216 * $scale)
  $g.DrawLine($axisPen, $cx, $cy - 214 * $scale, $cx, $cy + 214 * $scale)
  $g.DrawLine($axisPen, $cx - 214 * $scale, $cy, $cx + 214 * $scale, $cy)

  $mainPath = Add-CompassPath $cx $cy (214 * $scale) (58 * $scale)
  $g.DrawPath($outlinePen, $mainPath)

  $fillPath = Add-CompassPath $cx $cy (132 * $scale) (35 * $scale)
  $g.FillPath($fillBrush, $fillPath)
  $g.DrawPath($fillPen, $fillPath)

  $g.FillEllipse($centerBrush, $cx - 34 * $scale, $cy - 34 * $scale, 68 * $scale, 68 * $scale)
  $g.DrawEllipse($centerPen, $cx - 34 * $scale, $cy - 34 * $scale, 68 * $scale, 68 * $scale)

  $outerRing.Dispose()
  $innerRing.Dispose()
  $axisPen.Dispose()
  $outlinePen.Dispose()
  $fillPen.Dispose()
  $fillBrush.Dispose()
  $centerBrush.Dispose()
  $centerPen.Dispose()
  $mainPath.Dispose()
  $fillPath.Dispose()
}

function Draw-Wordmark($g, [float]$x, [float]$y, [float]$size, [System.Drawing.Color]$color, [bool]$tagline = $true) {
  $wordBrush = New-Object System.Drawing.SolidBrush $color
  $mutedBrush = New-Object System.Drawing.SolidBrush (Color-Hex "#6D746F")
  $wordFont = New-Object System.Drawing.Font "Georgia", $size, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $tagFont = New-Object System.Drawing.Font "Arial", ($size * 0.22), ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
  $g.DrawString("Noesis", $wordFont, $wordBrush, $x, $y)
  if ($tagline) {
    $format = New-Object System.Drawing.StringFormat
    $format.FormatFlags = [System.Drawing.StringFormatFlags]::NoWrap
    $g.DrawString("ARQUITECTURA OPERATIVA", $tagFont, $mutedBrush, $x + 8, $y + ($size * 1.08), $format)
    $format.Dispose()
  }
  $wordBrush.Dispose()
  $mutedBrush.Dispose()
  $wordFont.Dispose()
  $tagFont.Dispose()
}

$transparent = [System.Drawing.Color]::Transparent
$green = Color-Hex "#123C35"
$paper = Color-Hex "#FBFAF5"
$ivory = Color-Hex "#F6F2E8"

$s = New-Surface 1024 1024 $transparent
Draw-NoesisMark $s.Graphics 512 512 2 $false $false
Save-Surface $s (Join-Path $out "noesis-mark.png")

$s = New-Surface 1024 1024 $transparent
Draw-NoesisMark $s.Graphics 512 512 2 $false $true
Save-Surface $s (Join-Path $out "noesis-mark-badge.png")

$s = New-Surface 1024 1024 $green
Draw-NoesisMark $s.Graphics 512 512 2 $true $false
Save-Surface $s (Join-Path $out "noesis-mark-light.png")

$s = New-Surface 1600 460 $transparent
Draw-Wordmark $s.Graphics 50 70 190 $green $true
Save-Surface $s (Join-Path $out "noesis-wordmark.png")

$s = New-Surface 2400 640 $transparent
Draw-NoesisMark $s.Graphics 240 320 0.78 $false $true
Draw-Wordmark $s.Graphics 520 184 220 $green $true
Save-Surface $s (Join-Path $out "noesis-logo-horizontal.png")

$s = New-Surface 2400 640 $green
Draw-NoesisMark $s.Graphics 240 320 0.78 $true $false
Draw-Wordmark $s.Graphics 520 184 220 $ivory $true
Save-Surface $s (Join-Path $out "noesis-logo-horizontal-light.png")

$s = New-Surface 1200 630 $paper
Draw-NoesisMark $s.Graphics 600 250 0.72 $false $false
Draw-Wordmark $s.Graphics 366 430 120 $green $false
Save-Surface $s (Join-Path $out "noesis-brand-card.png")

$palette = @(
  @{ Name = "Noesis Green"; Hex = "#123C35"; Role = "Primary" },
  @{ Name = "Operational Green"; Hex = "#1E6F62"; Role = "Secondary" },
  @{ Name = "Aqua Signal"; Hex = "#2E8C7C"; Role = "Accent" },
  @{ Name = "Ivory Field"; Hex = "#F6F2E8"; Role = "Background" },
  @{ Name = "Paper"; Hex = "#FBFAF5"; Role = "Surface" },
  @{ Name = "Mist"; Hex = "#DDE9E5"; Role = "Soft tint" },
  @{ Name = "Graphite"; Hex = "#202725"; Role = "Text" },
  @{ Name = "Muted Grey"; Hex = "#6D746F"; Role = "Secondary text" },
  @{ Name = "Wine"; Hex = "#6D3F4B"; Role = "Editorial accent" },
  @{ Name = "Gold"; Hex = "#B69A62"; Role = "Premium accent" }
)

$s = New-Surface 1600 1080 $paper
$titleBrush = New-Object System.Drawing.SolidBrush $green
$mutedBrush = New-Object System.Drawing.SolidBrush (Color-Hex "#6D746F")
$titleFont = New-Object System.Drawing.Font "Georgia", 82, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$bodyFont = New-Object System.Drawing.Font "Arial", 26, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
$smallFont = New-Object System.Drawing.Font "Arial", 22, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$s.Graphics.DrawString("Noesis", $titleFont, $titleBrush, 92, 74)
$s.Graphics.DrawString("Paleta cromatica principal", $bodyFont, $mutedBrush, 98, 168)

for ($i = 0; $i -lt $palette.Count; $i++) {
  $col = $i % 2
  $row = [Math]::Floor($i / 2)
  $x = 96 + ($col * 720)
  $y = 250 + ($row * 150)
  $color = Color-Hex $palette[$i].Hex
  $swatch = New-Object System.Drawing.SolidBrush $color
  $border = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(40, $green)), 2
  $s.Graphics.FillRectangle($swatch, $x, $y, 112, 112)
  $s.Graphics.DrawRectangle($border, $x, $y, 112, 112)
  $s.Graphics.DrawString($palette[$i].Name, $bodyFont, $titleBrush, $x + 142, $y + 8)
  $s.Graphics.DrawString($palette[$i].Hex, $smallFont, $mutedBrush, $x + 142, $y + 46)
  $s.Graphics.DrawString($palette[$i].Role, $smallFont, $mutedBrush, $x + 142, $y + 78)
  $swatch.Dispose()
  $border.Dispose()
}

$titleBrush.Dispose()
$mutedBrush.Dispose()
$titleFont.Dispose()
$bodyFont.Dispose()
$smallFont.Dispose()
Save-Surface $s (Join-Path $brandOut "noesis-color-palette.png")

Write-Host "Exported Noesis PNG assets to $out"
