<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    /**
     * List all users.
     */
    private function formatUser(User $u): array
    {
        return [
            'id'           => (string) $u->id,
            'name'         => $u->name,
            'email'        => $u->email,
            'role'         => $u->role,
            'avatar'       => collect(explode(' ', $u->name))->map(fn ($n) => strtoupper($n[0] ?? ''))->join(''),
            'department'   => $u->department ?? '',
            'position'     => $u->position ?? '',
            'status'       => $u->status ?? 'active',
            'joinDate'     => $u->created_at?->toDateString() ?? '',
            'profilePhoto' => $u->profile_photo ? '/api/users/' . $u->id . '/photo' : null,
        ];
    }

    public function index(): JsonResponse
    {
        $users = User::select('id', 'name', 'email', 'role', 'department', 'position', 'status', 'profile_photo', 'created_at')
            ->orderBy('id')
            ->get()
            ->map(fn ($u) => $this->formatUser($u));

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
        $data['must_change_password'] = 1;

        // Generate a recovery code (plain shown once, hashed stored)
        $plainCode = implode('-', str_split(bin2hex(random_bytes(16)), 4));
        $data['recovery_code'] = Hash::make($plainCode);

        $user = User::create($data);

        $payload = $this->formatUser($user);
        $payload['recovery_code'] = $plainCode; // shown ONCE to the admin

        return response()->json($payload, 201);
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

        return response()->json($this->formatUser($user));
    }

    /**
     * Upload a profile photo for a user.
     */
    public function uploadPhoto(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        // Delete old photo if it exists
        if ($user->profile_photo) {
            Storage::disk('public')->delete($user->profile_photo);
        }

        $path = $request->file('photo')->store('profile-photos', 'public');
        $user->update(['profile_photo' => $path]);

        return response()->json($this->formatUser($user));
    }

    /**
     * Regenerate recovery code for a user (admin action).
     */
    public function regenerateRecovery(User $user): JsonResponse
    {
        $plainCode = implode('-', str_split(bin2hex(random_bytes(16)), 4));
        $user->recovery_code = Hash::make($plainCode);
        $user->save();

        return response()->json([
            'success'       => true,
            'recovery_code' => $plainCode,
            'user_id'       => (string) $user->id,
            'user_name'     => $user->name,
        ]);
    }

    /**
     * Delete a user.
     */
    public function destroy(User $user): JsonResponse
    {
        // Protect the primary admin (lowest-ID admin) from deletion
        $primaryAdmin = User::where('role', 'admin')->orderBy('id')->first();
        if ($primaryAdmin && $user->id === $primaryAdmin->id) {
            return response()->json([
                'success' => false,
                'error'   => 'The primary administrator account cannot be deleted.',
            ], 403);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    /**
     * Serve a user's profile photo.
     */
    public function servePhoto(User $user)
    {
        if (!$user->profile_photo || !Storage::disk('public')->exists($user->profile_photo)) {
            abort(404);
        }

        return Storage::disk('public')->response($user->profile_photo);
    }
}
