Add-Type -AssemblyName System.Drawing

$baseDir = Split-Path -Parent $PSScriptRoot
$publicDir = Join-Path $baseDir "client\public"

# 1. Optimize logo.png
$logoPath = Join-Path $publicDir "icons\logo.png"
if (Test-Path $logoPath) {
    $bmp = [System.Drawing.Bitmap]::FromFile($logoPath)
    $origSize = (Get-Item $logoPath).Length
    $w = 160
    $h = 160
    $newBmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($newBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($bmp, 0, 0, $w, $h)
    $g.Dispose()
    $bmp.Dispose()

    $backupPath = Join-Path $publicDir "icons\logo.orig.png"
    if (-not (Test-Path $backupPath)) {
        Copy-Item $logoPath $backupPath
    }

    $tempPath = Join-Path $publicDir "icons\logo.tmp.png"
    $newBmp.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $newBmp.Dispose()

    Move-Item -Force $tempPath $logoPath
    $newSize = (Get-Item $logoPath).Length
    Write-Output "Logo optimized: $origSize bytes -> $newSize bytes"
}

# 2. Optimize hero JPEG images with quality encoding
function Optimize-Jpeg($filePath, $maxWidth, $quality) {
    if (-not (Test-Path $filePath)) { return }
    $origSize = (Get-Item $filePath).Length
    $bmp = [System.Drawing.Bitmap]::FromFile($filePath)
    $w = $bmp.Width
    $h = $bmp.Height

    if ($w -gt $maxWidth) {
        $h = [int]($h * ($maxWidth / $w))
        $w = $maxWidth
    }

    $newBmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($newBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($bmp, 0, 0, $w, $h)
    $g.Dispose()
    $bmp.Dispose()

    $backupPath = $filePath + ".orig"
    if (-not (Test-Path $backupPath)) {
        Copy-Item $filePath $backupPath
    }

    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$quality)

    $tempPath = $filePath + ".tmp"
    $newBmp.Save($tempPath, $codec, $encoderParams)
    $newBmp.Dispose()
    $encoderParams.Dispose()

    Move-Item -Force $tempPath $filePath
    $newSize = (Get-Item $filePath).Length
    Write-Output "Optimized $(Split-Path $filePath -Leaf): $origSize bytes -> $newSize bytes ($w x $h)"
}

$heroDir = Join-Path $publicDir "images\hero"
Optimize-Jpeg (Join-Path $heroDir "hero-dish-1.jpg") 720 80
Optimize-Jpeg (Join-Path $heroDir "hero-dish-2.jpg") 480 80
Optimize-Jpeg (Join-Path $heroDir "hero-dish-3.jpg") 480 80
Optimize-Jpeg (Join-Path $heroDir "hero-dish-4.jpg") 480 80

# 3. Optimize menu images
$menuDir = Join-Path $publicDir "images\menu"
if (Test-Path $menuDir) {
    Get-ChildItem -Path $menuDir -Filter "*.jpg" | ForEach-Object {
        if ($_.Length -gt 35000) {
            Optimize-Jpeg $_.FullName 440 80
        }
    }
}

