<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Authenticate a user by email + password and return their profile.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'error'   => 'Invalid email or password.',
            ], 401);
        }

        if (($user->status ?? 'active') === 'inactive') {
            return response()->json([
                'success' => false,
                'error'   => 'Your account has been deactivated. Contact an administrator.',
            ], 403);
        }

        return response()->json([
            'success' => true,
            'user'    => [
                'id'           => (string) $user->id,
                'name'         => $user->name,
                'email'        => $user->email,
                'role'         => $user->role,
                'avatar'       => collect(explode(' ', $user->name))->map(fn ($n) => strtoupper($n[0] ?? ''))->join(''),
                'department'   => $user->department ?? '',
                'position'     => $user->position ?? '',
                'status'       => $user->status ?? 'active',
                'joinDate'     => $user->created_at?->toDateString() ?? '',
                'profilePhoto' => $user->profile_photo ? asset('storage/' . $user->profile_photo) : null,
            ],
        ]);
    }
}
