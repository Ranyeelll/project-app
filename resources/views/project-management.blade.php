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

        <!-- Poster handled via embedded base64 background; no separate preload needed -->
        <!-- Then preload the tiny preview video so it plays the moment the page opens -->
        <link rel="preload" href="/login-embed2-preview.mp4" as="video" type="video/mp4">
        <link rel="preload" href="/Maptech_Official_Logo_version2_(1).png" as="image" type="image/png">

        <!-- Embedded base64 thumbnail — zero network request, paints instantly before any JS/React loads -->
        <style>
            html, body { margin: 0; padding: 0; min-height: 100vh; }
            body, #project-management-root {
                background: #000 url('data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYyLjExLjEwMAD/2wBDAgUFBcUFxsbGxsbGyAeICEhISAgICAhISEkJCQqKiokJCQhISQkKCgqKi4vLisrKisvLzIyMjw8OTlGRkhWVmf/xAByAAEAAgMBAQAAAAAAAAAAAAAEAwUCAQYABwEAAwEBAAAAAAAAAAAAAAAAAgQBAAMQAAICAQMEAAcBAQAAAAAAAAEAAhEDEiExBLFBYTKB0VGhwfATUhEBAQEAAQUBAAAAAAAAAAAAAAERAhIhoWFRQf/AABEIAC0AUAMBIgACEQADEQD/2gAMAwEAAhEDEQA/APi0JU2nxD2OzShs8ctJHb9fV4kuSQNjBxzYv85XHeEt4n9H2xRNOjluzY+pdL0IzY5SsbB4jqIaJEK8XWTxxoFpcmQzNrfKzC8l0EpCrN8JCQqGoGU5ZiWAtd2AUxKMXV+OGUGqcrpcOfTtIaonkHhTPHA74pWP+T8Q+rz2u1INOKdOXZ29fhOqvSmAu5eB3dxyTrYj5i+7NLqJSGmYBA9cJgu/PIWQxA5s+S0xZpcsKBmTETESspPKNNdRqNA+Df4ctxX4Y3zhJgVGpC7YmG6nepIqkTohv9wB9kg48JORpAy/3Zy4sIy4+TqZEi14cy4OP//Z') no-repeat center center / cover;
                min-height: 100vh;
            }
        </style>

        <!-- Scripts & Styles -->
        @viteReactRefresh
        @vite(['resources/js/project-management/index.css', 'resources/js/project-management/index.tsx'])
    </head>
    <body class="antialiased">
        <div id="project-management-root"></div>
    </body>
</html>
