@php
    // Determine logo source (embed PNG or base64 file if available).
    $logoSrc = null;
    $b64File = public_path('logo.b64');
    $pngFile = public_path('Maptech_Official_Logo_version2_(1).png');
    if (file_exists($b64File) && strlen(trim(file_get_contents($b64File))) > 0) {
        $logoSrc = 'data:image/png;base64,' . trim(file_get_contents($b64File));
    } elseif (file_exists($pngFile)) {
        $logoSrc = 'data:image/png;base64,' . base64_encode(file_get_contents($pngFile));
    }
    // Accept variables: $title, $subtitle, $dateRange, $generatedAt
    $title = $title ?? 'Report';
    $subtitle = $subtitle ?? '';
    $dateRange = $dateRange ?? '';
    $generatedAt = $generatedAt ?? '';
@endphp
<style>
    /* Force consistent page margins so header/footer repeat. Adjusted top margin
       and header positioning so header sits lower on the page and doesn't push content down. */
    @page { margin: 100px 25px; }
    header.pdf-header {
        position: fixed;
        top: -10px;
        left: 0;
        right: 0;
        height: 120px;
        text-align: center;
        padding: 8px 0 6px;
        border-bottom: 2px solid #154734;
        overflow: visible;
        background: #ffffff;
    }
    /* Place logo on the left so the title and subtitle can center */
    header.pdf-header .header-logo-wrap {
        position: absolute;
        left: 24px;
        top: 50%;
        transform: translateY(-50%);
        width: 220px;
        text-align: left;
    }
    header.pdf-header .header-logo-wrap img { max-width: 220px; max-height: 86px; display:block; }
    header.pdf-header .header-content { max-width: 760px; margin: 0 auto; }
    header.pdf-header h1 { font-size: 22px; color: #154734; margin: 16px 0 4px; letter-spacing: 0.4px; line-height:1.05; font-weight:700; text-align:center }
    header.pdf-header .subtitle { font-size: 12px; color: #374151; font-weight: 600; }
    header.pdf-header .period { font-size: 10px; color: #6b7280; margin-top: 3px; }
    /* Ensure body content doesn't overlap header */
    body { margin-top: 140px; }
</style>

<header class="pdf-header">
    <div class="header-logo-wrap">
        @if($logoSrc)
            <img src="{{ $logoSrc }}" alt="Maptech Logo" />
        @else
            <div style="display:inline-block; background:#154734; padding:8px 18px; border-radius:6px; margin:0 auto;">
                <div style="font-size:18px; font-weight:900; color:#ffffff; letter-spacing:3px; line-height:1.1;">MAPTECH</div>
                <div style="font-size:8px; font-weight:400; color:#a7f3d0; letter-spacing:1.5px;">INFORMATION SOLUTIONS INC.</div>
            </div>
        @endif
    </div>
    <h1>{{ $title }}</h1>
    @if($subtitle)
        <div class="subtitle">{{ $subtitle }}</div>
    @endif
    @if($dateRange || $generatedAt)
        <div class="period">{{ $dateRange }} &mdash; Generated on {{ $generatedAt }}</div>
    @endif
</header>
