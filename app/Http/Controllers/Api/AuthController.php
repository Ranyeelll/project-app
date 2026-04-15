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
            'joinDate'        => $user->created_at?->toIso8601String() ?? '',
            'profilePhoto'    => $user->profile_photo
                                    ? '/api/users/' . $user->id . '/photo'
                                    : null,
            'mustChangePassword' => (bool) $user->must_change_password,
            'lastLoginAt'     => $user->last_login_at?->toIso8601String(),
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

        // ── 2FA gate ──────────────────────────────────────────────────
        if ($user->two_factor_enabled && $user->two_factor_secret) {
            // Store the user ID in the session but do NOT fully auth yet
            $request->session()->put('2fa:user_id', $user->id);

            return response()->json([
                'success'      => false,
                'requires_2fa' => true,
            ]);
        }

        // Establish a Laravel session so WebSocket presence channels can authenticate
        Auth::login($user);

        // Track last login
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

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
    /*  POST /api/login/2fa                                               */
    /*  Complete login after TOTP verification.                           */
    /* ================================================================== */
    public function login2fa(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $userId = $request->session()->get('2fa:user_id');
        if (! $userId) {
            return response()->json([
                'success' => false,
                'error'   => 'No pending 2FA session. Please log in again.',
            ], 422);
        }

        $user = User::find($userId);
        if (! $user) {
            $request->session()->forget('2fa:user_id');
            return response()->json([
                'success' => false,
                'error'   => 'User not found.',
            ], 422);
        }

        if (! $this->verifyTotp($user->two_factor_secret, $request->code)) {
            $this->audit->log(
                action: 'auth.2fa_failed',
                resourceType: 'user',
                resourceId: $user->id,
                context: ['email' => $user->email],
                userId: $user->id,
                sensitiveFlag: true,
            );

            return response()->json([
                'success' => false,
                'error'   => 'Invalid verification code.',
            ], 422);
        }

        // Clear the 2FA pending state
        $request->session()->forget('2fa:user_id');

        // Full login
        Auth::login($user);
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

        $this->audit->log(
            action: 'auth.login_success',
            resourceType: 'user',
            resourceId: $user->id,
            context: ['email' => $user->email, 'department' => $user->department, '2fa' => true],
            userId: $user->id,
            sensitiveFlag: false,
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
    /*  POST /api/logout                                                   */
    /*  Invalidate the server session and log the event.                   */
    /* ================================================================== */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user) {
            $this->audit->log(
                action: 'auth.logout',
                resourceType: 'user',
                resourceId: $user->id,
                context: ['email' => $user->email],
                userId: $user->id,
            );
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['success' => true]);
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

        $employeeId = preg_replace('/\D+/', '', trim((string) $request->employee_id)) ?? '';
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

        $employeeId = preg_replace('/\D+/', '', trim((string) $request->employee_id)) ?? '';
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

    /* ================================================================== */
    /*  TOTP helpers (RFC 6238)                                           */
    /* ================================================================== */
    private function verifyTotp(string $secret, string $code, int $window = 1): bool
    {
        $period = 30;
        $time = intval(time() / $period);
        for ($i = -$window; $i <= $window; $i++) {
            if (hash_equals($this->generateTotp($secret, $time + $i), $code)) {
                return true;
            }
        }
        return false;
    }

    private function generateTotp(string $base32Secret, int $counter): string
    {
        $key = $this->base32Decode($base32Secret);
        $packed = pack('N*', 0, $counter);
        $hash = hash_hmac('sha1', $packed, $key, true);
        $offset = ord($hash[19]) & 0x0F;
        $code = (
            ((ord($hash[$offset]) & 0x7F) << 24) |
            ((ord($hash[$offset + 1]) & 0xFF) << 16) |
            ((ord($hash[$offset + 2]) & 0xFF) << 8) |
            (ord($hash[$offset + 3]) & 0xFF)
        ) % 1000000;
        return str_pad((string) $code, 6, '0', STR_PAD_LEFT);
    }

    private function base32Decode(string $input): string
    {
        $map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $input = strtoupper(rtrim($input, '='));
        $buffer = 0;
        $bitsLeft = 0;
        $output = '';
        for ($i = 0, $len = strlen($input); $i < $len; $i++) {
            $val = strpos($map, $input[$i]);
            if ($val === false) continue;
            $buffer = ($buffer << 5) | $val;
            $bitsLeft += 5;
            if ($bitsLeft >= 8) {
                $bitsLeft -= 8;
                $output .= chr(($buffer >> $bitsLeft) & 0xFF);
            }
        }
        return $output;
    }
}
