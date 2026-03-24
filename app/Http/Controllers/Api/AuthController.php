<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(
        private AuditService $audit,
    ) {}
    /* ------------------------------------------------------------------ */
    /*  Helper: build the standard user payload returned to the SPA       */
    /* ------------------------------------------------------------------ */
    private function userPayload(User $user): array
    {
        return [
            'id'              => (string) $user->id,
            'name'            => $user->name,
            'email'           => $user->email,
            'role'            => strtolower(trim((string) $user->role)),
            'avatar'          => collect(explode(' ', $user->name))
                                    ->map(fn ($n) => strtoupper($n[0] ?? ''))
                                    ->join(''),
            'department'      => $user->department ?? '',
            'position'        => $user->position ?? '',
            'status'          => $user->status ?? 'active',
            'joinDate'        => $user->created_at?->toDateString() ?? '',
            'profilePhoto'    => $user->profile_photo
                                    ? '/api/users/' . $user->id . '/photo'
                                    : null,
            'mustChangePassword' => (bool) $user->must_change_password,
        ];
    }

    /* ------------------------------------------------------------------ */
    /*  Helper: generate a plain-text recovery code (shown ONCE)          */
    /* ------------------------------------------------------------------ */
    private function generateRecoveryCode(): string
    {
        // 16 random bytes → 32-char hex string, grouped for readability
        $raw = bin2hex(random_bytes(16));
        // Format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
        return implode('-', str_split($raw, 4));
    }

    /* ================================================================== */
    /*  POST /api/login                                                   */
    /* ================================================================== */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            // Log failed login attempt
            $this->audit->log(
                action: 'auth.login_failed',
                resourceType: 'auth',
                resourceId: 1,
                context: ['email' => $request->email ?? 'unknown'],
                sensitiveFlag: true
            );
            return response()->json([
                'success' => false,
                'error'   => 'Invalid email or password.',
            ], 401);
        }

        if (($user->status ?? 'active') === 'inactive') {
            // Log login attempt by inactive user
            $this->audit->log(
                action: 'auth.login_blocked',
                resourceType: 'auth',
                resourceId: 1,
                context: ['reason' => 'account_inactive', 'user_id' => $user->id],
                userId: $user->id,
                sensitiveFlag: true
            );
            return response()->json([
                'success' => false,
                'error'   => 'Your account has been deactivated. Contact an administrator.',
            ], 403);
        }

        // Establish a Laravel session so WebSocket presence channels can authenticate
        Auth::login($user);

        // Log successful login
        $this->audit->log(
            action: 'auth.login_success',
            resourceType: 'user',
            resourceId: $user->id,
            context: ['email' => $user->email, 'department' => $user->department],
            userId: $user->id,
            sensitiveFlag: false
        );

        return response()->json([
            'success' => true,
            'user'    => $this->userPayload($user),
        ]);
    }

    /* ================================================================== */
    /*  GET /api/me                                                      */
    /*  Returns the current authenticated user payload.                  */
    /* ================================================================== */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthenticated',
            ], 401);
        }

        return response()->json([
            'success' => true,
            'user' => $this->userPayload($user),
        ]);
    }

    /* ================================================================== */
    /*  POST /api/change-password                                         */
    /*  Used on first login (must_change_password) or voluntary change.   */
    /*  Returns a NEW recovery code (shown once) after success.           */
    /* ================================================================== */
    public function changePassword(Request $request): JsonResponse
    {
        $request->validate([
            'old_password' => 'required|string',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (! $user) {
            return response()->json([
                'success' => false,
                'error' => 'Unauthenticated',
            ], 401);
        }

        if (! Hash::check($request->old_password, $user->password)) {
            // Log failed password change attempt
            $this->audit->log(
                action: 'auth.password_change_failed',
                resourceType: 'user',
                resourceId: $user->id,
                context: ['reason' => 'incorrect_old_password'],
                userId: $user->id,
                sensitiveFlag: true
            );
            return response()->json([
                'success' => false,
                'error'   => 'Current password is incorrect.',
            ], 401);
        }

        // Generate a new recovery code (plain text shown once, hashed for DB)
        $plainCode = $this->generateRecoveryCode();

        $user->password             = Hash::make($request->new_password);
        $user->recovery_code        = Hash::make($plainCode);
        $user->must_change_password = 0;
        $user->save();

        // Log successful password change
        $this->audit->log(
            action: 'auth.password_changed',
            resourceType: 'user',
            resourceId: $user->id,
            context: ['email' => $user->email],
            userId: $user->id,
            sensitiveFlag: true
        );

        return response()->json([
            'success'       => true,
            'recovery_code' => $plainCode, // show ONCE to the user
            'user'          => $this->userPayload($user),
        ]);
    }

    /* ================================================================== */
    /*  POST /api/verify-recovery                                         */
    /*  Step 1 of forgot-password: verify Employee ID + recovery code.    */
    /* ================================================================== */
    public function verifyRecovery(Request $request): JsonResponse
    {
        $request->validate([
            'employee_id'   => 'required|string',
            'recovery_code' => 'required|string',
        ]);

        $employeeId = trim((string) $request->employee_id);
        $normalizedRecoveryCode = trim((string) $request->recovery_code);
        $user = ctype_digit($employeeId) ? User::find((int) $employeeId) : null;

        if (! $user) {
            return response()->json([
                'success' => false,
                'error'   => 'No account found with that Employee ID.',
            ], 404);
        }

        if (! $user->recovery_code) {
            return response()->json([
                'success' => false,
                'error'   => 'No recovery code has been set for this account. Contact an administrator.',
            ], 403);
        }

        if (! Hash::check($normalizedRecoveryCode, $user->recovery_code)) {
            return response()->json([
                'success' => false,
                'error'   => 'Invalid recovery code.',
            ], 401);
        }

        return response()->json([
            'success'     => true,
            'employee_id' => $user->id,
            'name'        => $user->name,
        ]);
    }

    /* ================================================================== */
    /*  POST /api/reset-password-offline                                  */
    /*  Step 2 of forgot-password: set new password after code verified.  */
    /* ================================================================== */
    public function resetPasswordOffline(Request $request): JsonResponse
    {
        $request->validate([
            'employee_id'   => 'required|string',
            'recovery_code' => 'required|string',
            'new_password'  => 'required|string|min:8|confirmed',
        ]);

        $employeeId = trim((string) $request->employee_id);
        $normalizedRecoveryCode = trim((string) $request->recovery_code);
        $user = ctype_digit($employeeId) ? User::find((int) $employeeId) : null;

        if (! $user) {
            return response()->json([
                'success' => false,
                'error' => 'No account found with that Employee ID.',
            ], 404);
        }

        // Re-verify recovery code to prevent tampering
        if (! $user->recovery_code || ! Hash::check($normalizedRecoveryCode, $user->recovery_code)) {
            // Log failed password reset attempt
            $this->audit->log(
                action: 'auth.password_reset_failed',
                resourceType: 'user',
                resourceId: $user->id,
                context: ['reason' => 'invalid_recovery_code'],
                userId: $user->id,
                sensitiveFlag: true
            );
            return response()->json([
                'success' => false,
                'error'   => 'Invalid recovery code.',
            ], 401);
        }

        // Generate a fresh recovery code for future use
        $plainCode = $this->generateRecoveryCode();

        $user->password             = Hash::make($request->new_password);
        $user->recovery_code        = Hash::make($plainCode);
        $user->must_change_password = 0;
        $user->save();

        // Log successful password reset
        $this->audit->log(
            action: 'auth.password_reset',
            resourceType: 'user',
            resourceId: $user->id,
            context: ['email' => $user->email, 'method' => 'recovery_code'],
            userId: $user->id,
            sensitiveFlag: true
        );

        return response()->json([
            'success'       => true,
            'recovery_code' => $plainCode, // new code shown ONCE
        ]);
    }
}
