<?php
$src = imagecreatefrompng('public/Maptech_Official_Logo_version2_(1).png');
$sw = imagesx($src);
$sh = imagesy($src);

foreach ([192, 512] as $size) {
    $dst = imagecreatetruecolor($size, $size);
    imagealphablending($dst, false);
    imagesavealpha($dst, true);
    $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
    imagefill($dst, 0, 0, $transparent);
    $scale = min($size / $sw, $size / $sh);
    $nw = (int)($sw * $scale);
    $nh = (int)($sh * $scale);
    $ox = (int)(($size - $nw) / 2);
    $oy = (int)(($size - $nh) / 2);
    imagecopyresampled($dst, $src, $ox, $oy, 0, 0, $nw, $nh, $sw, $sh);
    imagepng($dst, "public/icon-{$size}x{$size}.png");
    imagedestroy($dst);
    echo "{$size}x{$size} done\n";
}

imagedestroy($src);
echo "All icons generated\n";
