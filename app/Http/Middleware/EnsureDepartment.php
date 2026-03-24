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

        $userRole = strtolower((string) ($user->role ?? ''));
        $userDepartment = $user->department instanceof Department
            ? $user->department->value
            : (string) ($user->department ?? '');

        // Superadmin always has access (legacy admin role remains supported)
        if (
            in_array($userRole, ['superadmin', 'admin'], true) ||
            strcasecmp($userDepartment, Department::Admin->value) === 0
        ) {
            return $next($request);
        }

        // Check if user's department is in allowed list
        $allowedDeptValues = array_values(array_filter(array_map(function ($d) {
            $enum = Department::tryFrom($d);
            return $enum?->value;
        }, $departments)));

        if (!in_array($userDepartment, $allowedDeptValues, true)) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'You do not have permission to access this resource.',
            ], 403);
        }

        return $next($request);
    }
}
