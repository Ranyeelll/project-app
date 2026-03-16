<?php

namespace App\Http\Middleware;

use App\Enums\Department;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureDepartment
{
    /**
     * Handle an incoming request.
     *
     * Ensures the user belongs to one of the allowed departments.
     * Admin department always has access.
     *
     * Usage in routes:
     * ->middleware('department:Admin')
     * ->middleware('department:Admin,Accounting')
     * ->middleware('department:Admin,Accounting,Technical')
     */
    public function handle(Request $request, Closure $next, string ...$departments): Response
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'error' => 'Unauthenticated',
                'message' => 'You must be logged in to access this resource.',
            ], 401);
        }

        // Admin always has access
        if ($user->department === Department::Admin) {
            return $next($request);
        }

        // Check if user's department is in allowed list
        $allowedDepts = array_map(
            fn($d) => Department::tryFrom($d),
            $departments
        );

        if (!in_array($user->department, $allowedDepts, true)) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'You do not have permission to access this resource.',
            ], 403);
        }

        return $next($request);
    }
}
