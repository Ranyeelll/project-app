# Run this on the machine that has the repository checked out and ffmpeg installed.
# It generates small preview WebM and MP4 files from the full `public/login-embed.mp4`.
# Usage: Open PowerShell in the repo root and run: `./scripts/generate-login-previews.ps1`

$src = "public/login-embed.mp4"
$dstWebm = "public/login-embed-preview.webm"
$dstMp4 = "public/login-embed-preview.mp4"

if (-not (Test-Path $src)) {
    Write-Error "Source video not found: $src"
    exit 1
}

# Preview duration (seconds) and target bitrate: tune these to balance quality/size.
$duration = 6
$videoWidth = 640
$vf = "scale=${videoWidth}:-2"
$vp9Bitrate = "300k"   # WebM (VP9)
$h264Crf = 28           # MP4 quality for x264

Write-Host "Generating WebM preview -> $dstWebm"
ffmpeg -y -i $src -ss 0 -t $duration -vf $vf -c:v libvpx-vp9 -b:v $vp9Bitrate -c:a libopus -b:a 64k $dstWebm

if ($LASTEXITCODE -ne 0) { Write-Error "ffmpeg failed creating WebM"; exit $LASTEXITCODE }

Write-Host "Generating MP4 preview -> $dstMp4"
ffmpeg -y -i $src -ss 0 -t $duration -vf $vf -c:v libx264 -preset veryfast -crf $h264Crf -c:a aac -b:a 64k $dstMp4

if ($LASTEXITCODE -ne 0) { Write-Error "ffmpeg failed creating MP4"; exit $LASTEXITCODE }

Write-Host "Preview generation complete. Files created:"
Write-Host " - $dstWebm"
Write-Host " - $dstMp4"

# Recommend checking file sizes
Write-Host "Sizes:"; Get-Item $dstWebm, $dstMp4 | Select-Object Name, @{N='SizeKB';E={[math]::Round($_.Length/1KB,1)}} | Format-Table -AutoSize

Write-Host "Done."