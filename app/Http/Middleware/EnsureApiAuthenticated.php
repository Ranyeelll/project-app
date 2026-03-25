<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureApiAuthenticated
{
    /**
     * Handle an incoming request.
     *
     * Ensures the user is authenticated via Laravel session.
     * Returns 401 if not authenticated.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!Auth::check()) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'You must be logged in to access this resource.',
            ], 401);
        }

        // Check if user account is active
        $user = Auth::user();
        if ($user->status === 'inactive') {
            Auth::logout();
            return response()->json([
                'error' => 'Account Deactivated',
                'message' => 'Your account has been deactivated.',
            ], 403);
        }

        // Release session lock for API calls so rapid polling does not block
        // concurrent POST requests like chat send.
        if (function_exists('session_status') && session_status() === PHP_SESSION_ACTIVE) {
            session_write_close();
        }

        return $next($request);
    }
}
