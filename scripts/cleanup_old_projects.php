<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$old = [
    'Barangay Road Improvement - Phase 1',
    'Municipal Water System Upgrade',
    'Community Center Construction',
    'School Building Renovation - Maptech Elementary',
    'Flood Control Drainage System',
];

$projects = App\Models\Project::whereIn('name', $old)->withTrashed()->get();

foreach ($projects as $p) {
    echo "Deleting: {$p->name} (ID: {$p->id})\n";
    $p->forceDelete();
}

echo "Done. Remaining projects: " . App\Models\Project::count() . "\n";
