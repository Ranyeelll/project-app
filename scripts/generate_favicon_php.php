<?php
// Generates a 48x48 PNG favicon from available taskbar/logo images in public/
$public = __DIR__ . '/../public';
$candidates = [
    $public . '/logo-taskbar.png',
    $public . '/logo-taskbar.jpg',
    $public . '/logo-taskbar.jpeg',
    $public . '/taskbar-logo.png',
    $public . '/taskbar-logo.jpg',
    $public . '/taskbar-logo.jpeg',
    $public . '/Maptech_Official_Logo_version2_(1).png',
];
$found = null;
foreach ($candidates as $c) {
    if (file_exists($c)) { $found = $c; break; }
}
if (!$found) {
    echo "No source logo found in public/\n";
    exit(1);
}
$dstPng = $public . '/favicon-48.png';
$dstIco = $public . '/favicon.ico';

$ext = strtolower(pathinfo($found, PATHINFO_EXTENSION));
if ($ext === 'png') {
    $src = imagecreatefrompng($found);
} elseif (in_array($ext, ['jpg','jpeg'])) {
    $src = imagecreatefromjpeg($found);
} else {
    echo "Unsupported source format: $ext\n";
    exit(1);
}

$w = imagesx($src);
$h = imagesy($src);
$size = 48;
$dst = imagecreatetruecolor($size, $size);
// Preserve transparency
imagesavealpha($dst, true);
$trans = imagecolorallocatealpha($dst, 0, 0, 0, 127);
imagefill($dst, 0, 0, $trans);

// Compute aspect fit
$scale = min($size / $w, $size / $h);
$newW = (int)($w * $scale);
$newH = (int)($h * $scale);
$dstX = (int)(($size - $newW) / 2);
$dstY = (int)(($size - $newH) / 2);

imagecopyresampled($dst, $src, $dstX, $dstY, 0, 0, $newW, $newH, $w, $h);

// Save PNG
imagepng($dst, $dstPng, 9);
// Also copy PNG data to favicon.ico (some browsers prefer root path)
copy($dstPng, $dstIco);

imagedestroy($src);
imagedestroy($dst);

echo "Wrote $dstPng and updated $dstIco\n";
