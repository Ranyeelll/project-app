<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>{{ config('app.name', 'Maptech Information Solutions Inc.') }} - Project Management System</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

        <!-- Preload small previews and poster so they begin fetching immediately -->
        <link rel="preload" href="/login-embed2-preview.webm" as="video" type="video/webm">
        <link rel="preload" href="/login-embed2-preview.mp4" as="video" type="video/mp4">
        <link rel="preload" href="/login-embed2-instant.mp4" as="video" type="video/mp4">
        <link rel="preload" href="/login-embed-preview.webm" as="video" type="video/webm">
        <link rel="preload" href="/login-embed-preview.mp4" as="video" type="video/mp4">
        <link rel="preload" href="/login-embed2.mp4" as="video" type="video/mp4">
        <link rel="preload" href="/login-embed.mp4" as="video" type="video/mp4">
        <link rel="preload" href="/Maptech_Official_Logo_version2_(1).png" as="image" type="image/png">

        <!-- Scripts & Styles -->
        @viteReactRefresh
        @vite(['resources/js/project-management/index.css', 'resources/js/project-management/index.tsx'])
    </head>
    <body class="antialiased">
        <div id="project-management-root"></div>
    </body>
</html>
