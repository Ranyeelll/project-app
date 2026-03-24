<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Ensure authenticated user has one of the allowed roles.
     * Superadmin always has access.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = Auth::user();

        if (! $user) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'You must be logged in to access this resource.',
            ], 401);
        }

        $userRole = strtolower(trim((string) ($user->role ?? '')));

        if (in_array($userRole, ['superadmin', 'admin'], true)) {
            return $next($request);
        }

        $allowed = array_values(array_filter(array_map(static fn ($r) => strtolower(trim((string) $r)), $roles)));

        if (! in_array($userRole, $allowed, true)) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'You do not have permission to access this resource.',
            ], 403);
        }

        return $next($request);
    }
}
