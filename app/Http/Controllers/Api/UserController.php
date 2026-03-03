<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * List all users.
     */
    public function index(): JsonResponse
    {
        $users = User::select('id', 'name', 'email', 'role', 'department', 'position', 'status', 'created_at')
            ->orderBy('id')
            ->get()
            ->map(fn ($u) => [
                'id'         => (string) $u->id,
                'name'       => $u->name,
                'email'      => $u->email,
                'role'       => $u->role,
                'avatar'     => collect(explode(' ', $u->name))->map(fn ($n) => strtoupper($n[0] ?? ''))->join(''),
                'department' => $u->department ?? '',
                'position'   => $u->position ?? '',
                'status'     => $u->status ?? 'active',
                'joinDate'   => $u->created_at?->toDateString() ?? '',
            ]);

        return response()->json($users);
    }

    /**
     * Create a new user.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'sometimes|string|min:6',
            'role'       => 'required|in:admin,employee',
            'department' => 'nullable|string|max:255',
            'position'   => 'nullable|string|max:255',
            'status'     => 'required|in:active,inactive',
        ]);

        $data['password'] = Hash::make($data['password'] ?? 'password123');

        $user = User::create($data);

        return response()->json([
            'id'         => (string) $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'role'       => $user->role,
            'avatar'     => collect(explode(' ', $user->name))->map(fn ($n) => strtoupper($n[0] ?? ''))->join(''),
            'department' => $user->department ?? '',
            'position'   => $user->position ?? '',
            'status'     => $user->status ?? 'active',
            'joinDate'   => $user->created_at?->toDateString() ?? '',
        ], 201);
    }

    /**
     * Update an existing user.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'       => 'sometimes|string|max:255',
            'email'      => 'sometimes|email|unique:users,email,' . $user->id,
            'password'   => 'sometimes|nullable|string|min:6',
            'role'       => 'sometimes|in:admin,employee',
            'department' => 'nullable|string|max:255',
            'position'   => 'nullable|string|max:255',
            'status'     => 'sometimes|in:active,inactive',
        ]);

        // Hash password if provided, otherwise remove it so it's not overwritten
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        return response()->json([
            'id'         => (string) $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'role'       => $user->role,
            'avatar'     => collect(explode(' ', $user->name))->map(fn ($n) => strtoupper($n[0] ?? ''))->join(''),
            'department' => $user->department ?? '',
            'position'   => $user->position ?? '',
            'status'     => $user->status ?? 'active',
            'joinDate'   => $user->created_at?->toDateString() ?? '',
        ]);
    }

    /**
     * Delete a user.
     */
    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }
}
