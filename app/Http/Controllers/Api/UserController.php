<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use App\Services\AuditService;

class UserController extends Controller
{
    private function profilePhotoUrl(User $user): ?string
    {
        return $user->profile_photo ? '/api/users/' . $user->id . '/photo' : null;
    }

    private function resolveStoredPhotoPath(?string $rawPath): ?string
    {
        if (!$rawPath) {
            return null;
        }

        $path = $rawPath;

        // Convert full URLs and /storage URLs to disk-relative paths.
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            $parsed = parse_url($path, PHP_URL_PATH);
            if (is_string($parsed) && $parsed !== '') {
                $path = $parsed;
            }
        }

        $path = ltrim($path, '/');
        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        return $path !== '' ? $path : null;
    }

    /**
     * List all users.
     */
    private function formatUser(User $u): array
    {
        // Handle department as enum or string
        $department = $u->department instanceof Department
            ? $u->department->value
            : ($u->department ?? '');

        return [
            'id'           => (string) $u->id,
            'name'         => $u->name,
            'email'        => $u->email,
            'role'         => strtolower(trim((string) $u->role)),
            'avatar'       => collect(explode(' ', $u->name))->map(fn ($n) => strtoupper($n[0] ?? ''))->join(''),
            'department'   => $department,
            'position'     => $u->position ?? '',
            'status'       => $u->status ?? 'active',
            'joinDate'     => $u->created_at?->toIso8601String() ?? '',
            'profilePhoto' => $this->profilePhotoUrl($u),
        ];
    }

    public function index(): JsonResponse
    {
        $currentUser = Auth::user();
        $isElevated = $currentUser && in_array(strtolower(trim((string) $currentUser->role)), ['superadmin', 'supervisor']);

        $users = User::select('id', 'name', 'email', 'role', 'department', 'position', 'status', 'profile_photo', 'created_at')
            ->orderBy('id')
            ->get()
            ->map(function ($u) use ($isElevated) {
                $formatted = $this->formatUser($u);
                if (!$isElevated) {
                    unset($formatted['email'], $formatted['joinDate']);
                }
                return $formatted;
            });

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
            'password'   => 'sometimes|string|min:12',
            'role'       => 'required|in:superadmin,supervisor,employee',
            'department' => ['required', Rule::in(Department::values())],
            'position'   => 'nullable|string|max:255',
            'status'     => 'required|in:active,inactive',
        ]);

        // Use provided password or generate a secure random one
        $data['password'] = Hash::make($data['password'] ?? bin2hex(random_bytes(16)));
        $data['must_change_password'] = 1;

        // Generate a recovery code (plain shown once, hashed stored)
        $plainCode = implode('-', str_split(bin2hex(random_bytes(16)), 4));
        $data['recovery_code'] = Hash::make($plainCode);

        $user = User::create($data);

        AuditService::logUserCreated($user->id, [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'department' => $user->department instanceof Department ? $user->department->value : $user->department,
        ], Auth::id());

        $payload = $this->formatUser($user);
        $payload['recovery_code'] = $plainCode; // shown ONCE to the admin

        \App\Services\WebhookService::dispatch('user.created', $user->toArray());

        return response()->json($payload, 201);
    }

    /**
     * Update the authenticated user's own profile (name).
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $user = Auth::user();
        $user->update($data);

        return response()->json(['user' => $this->formatUser($user)]);
    }

    /**
     * Update the authenticated user's own password.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $request->validate([
            'current_password'      => 'required|string',
            'password'              => 'required|string|min:8|confirmed',
        ]);

        $user = Auth::user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect.'], 422);
        }

        $user->password = Hash::make($request->password);
        $user->must_change_password = 0;
        $user->save();

        return response()->json(['message' => 'Password changed successfully.']);
    }

    /**
     * Update an existing user.
     */
    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'       => 'sometimes|string|max:255',
            'email'      => 'sometimes|email|unique:users,email,' . $user->id,
            'password'   => 'sometimes|nullable|string|min:12',
            'role'       => 'sometimes|in:superadmin,supervisor,employee',
            'department' => ['sometimes', Rule::in(Department::values())],
            'position'   => 'nullable|string|max:255',
            'status'     => 'sometimes|in:active,inactive',
        ]);

        // Hash password if provided, otherwise remove it so it's not overwritten
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $oldRole = $user->role;
        $oldDept = $user->department instanceof Department ? $user->department->value : ($user->department ?? '');
        $oldData = $user->only(['name', 'email', 'role', 'department', 'position', 'status']);

        $user->update($data);

        $newData = $user->only(['name', 'email', 'role', 'department', 'position', 'status']);
        $changes = [];
        foreach ($newData as $key => $val) {
            $oldVal = $oldData[$key] ?? null;
            $newVal = $val instanceof Department ? $val->value : $val;
            $oldCompare = $oldVal instanceof Department ? $oldVal->value : $oldVal;
            if ($oldCompare !== $newVal) {
                $changes[$key] = ['from' => $oldCompare, 'to' => $newVal];
            }
        }
        if (!empty($changes)) {
            AuditService::logUserUpdated($user->id, $changes, Auth::id());
        }

        // Log specific permission-related changes
        $newRole = $user->role;
        $newDept = $user->department instanceof Department ? $user->department->value : ($user->department ?? '');
        if ($oldRole !== $newRole) {
            AuditService::logRoleChanged($user->id, (string) $oldRole, (string) $newRole, Auth::id());
        }
        if ($oldDept !== $newDept) {
            AuditService::logDepartmentChanged($user->id, $oldDept, $newDept, Auth::id());
        }

        return response()->json($this->formatUser($user));
    }

    /**
     * Upload a profile photo for a user.
     * Users can only upload their own photo, unless they are Admin.
     */
    public function uploadPhoto(Request $request, User $user): JsonResponse
    {
        $currentUser = Auth::user();

        // Users can only upload their own photo, unless admin
        if ($currentUser && $currentUser->id !== $user->id && !$currentUser->isAdmin()) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'You can only upload your own profile photo.',
            ], 403);
        }

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
        ]);

        // Delete old photo from local disk if it exists (legacy)
        if ($user->profile_photo && !$user->profile_photo_data) {
            $oldPath = $this->resolveStoredPhotoPath($user->profile_photo);
            if ($oldPath) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        $uploadedFile = $request->file('photo');
        $path = 'profile-photos/' . uniqid() . '_' . $uploadedFile->getClientOriginalName();
        $user->update([
            'profile_photo' => $path,
            'profile_photo_data' => file_get_contents($uploadedFile->getRealPath()),
            'profile_photo_mime' => $uploadedFile->getMimeType(),
        ]);

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
        // Protect the primary superadmin (lowest-ID superadmin) from deletion
        $primarySuperadmin = User::where('role', 'superadmin')->orderBy('id')->first();
        if ($primarySuperadmin && $user->id === $primarySuperadmin->id) {
            return response()->json([
                'success' => false,
                'error'   => 'The primary superadmin account cannot be deleted.',
            ], 403);
        }

        AuditService::logUserDeleted($user->id, [
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'department' => $user->department instanceof Department ? $user->department->value : ($user->department ?? ''),
        ], Auth::id());

        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    /**
     * Serve a user's profile photo.
     */
    public function servePhoto(User $user)
    {
        // Serve from DB storage
        if ($user->profile_photo_data) {
            return response($user->profile_photo_data)
                ->header('Content-Type', $user->profile_photo_mime ?? 'image/jpeg')
                ->header('Cache-Control', 'public, max-age=86400');
        }

        // Fallback: legacy local disk files
        $path = $this->resolveStoredPhotoPath($user->profile_photo);

        if (!$path || !Storage::disk('public')->exists($path)) {
            abort(404);
        }

        return Storage::disk('public')->response($path);
    }
}
