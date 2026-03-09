<?php

namespace App\Providers;

use Illuminate\Console\Events\CommandStarting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (app()->environment('production')) {
            URL::forceScheme('https');
        }

        Vite::prefetch(concurrency: 3);

        // Clear all sessions when the server starts/restarts for security
        Event::listen(CommandStarting::class, function (CommandStarting $event) {
            if ($event->command === 'serve') {
                DB::table('sessions')->truncate();
            }
        });
    }
}
