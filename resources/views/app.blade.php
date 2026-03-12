<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Favicon: prefer the generated 48×48 PNG and root /favicon.ico; keep PNG as apple-touch backup. -->
        <link rel="icon" href="/favicon-48.png?v=1" sizes="48x48" />
        <link rel="shortcut icon" href="/favicon.ico?v=1" />
        <link rel="icon" type="image/png" href="/favicon-48.png?v=1" sizes="any" />
        <link rel="apple-touch-icon" href="/favicon-48.png?v=1" />

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
