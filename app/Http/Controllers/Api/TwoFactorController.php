<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class TwoFactorController extends Controller
{
    /**
     * Generate a new 2FA secret for the user.
     */
    public function setup(Request $request): JsonResponse
    {
        $user = Auth::user();

        // Generate a random base32 secret (20 bytes)
        $secret = $this->generateBase32Secret();

        $user->update([
            'two_factor_secret' => $secret,
            'two_factor_enabled' => false,
            'two_factor_confirmed_at' => null,
        ]);

        // Build otpauth URI for QR code generation on frontend
        $issuer = config('app.name', 'MaptechPMS');
        $otpauthUrl = sprintf(
            'otpauth://totp/%s:%s?secret=%s&issuer=%s&digits=6&period=30',
            urlencode($issuer),
            urlencode($user->email),
            $secret,
            urlencode($issuer)
        );

        return response()->json([
            'secret' => $secret,
            'otpauthUrl' => $otpauthUrl,
        ]);
    }

    /**
     * Verify a TOTP code and enable 2FA.
     */
    public function verify(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => 'required|string|size:6',
        ]);

        $user = Auth::user();

        if (!$user->two_factor_secret) {
            return response()->json(['error' => 'No 2FA secret configured. Run setup first.'], 422);
        }

        if ($this->verifyTotp($user->two_factor_secret, $data['code'])) {
            $user->update([
                'two_factor_enabled' => true,
                'two_factor_confirmed_at' => now(),
            ]);

            return response()->json(['message' => '2FA enabled successfully']);
        }

        return response()->json(['error' => 'Invalid verification code'], 422);
    }

    /**
     * Disable 2FA for the user.
     */
    public function disable(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => 'required|string',
        ]);

        $user = Auth::user();

        if (!Hash::check($data['password'], $user->password)) {
            return response()->json(['error' => 'Invalid password'], 422);
        }

        $user->update([
            'two_factor_secret' => null,
            'two_factor_enabled' => false,
            'two_factor_confirmed_at' => null,
        ]);

        return response()->json(['message' => '2FA disabled']);
    }

    /**
     * Get 2FA status for the current user.
     */
    public function status(): JsonResponse
    {
        $user = Auth::user();

        return response()->json([
            'enabled' => (bool) $user->two_factor_enabled,
            'confirmedAt' => $user->two_factor_confirmed_at?->toIso8601String(),
        ]);
    }

    /**
     * Generate a base32 secret.
     */
    private function generateBase32Secret(int $length = 20): string
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $secret = '';
        $bytes = random_bytes($length);
        for ($i = 0; $i < $length; $i++) {
            $secret .= $chars[ord($bytes[$i]) & 31];
        }
        return $secret;
    }

    /**
     * Verify a TOTP code against the secret (RFC 6238).
     */
    private function verifyTotp(string $secret, string $code, int $window = 1): bool
    {
        $period = 30;
        $time = intval(time() / $period);

        for ($i = -$window; $i <= $window; $i++) {
            $expected = $this->generateTotp($secret, $time + $i);
            if (hash_equals($expected, $code)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Generate a TOTP code (HMAC-based HOTP at a time step).
     */
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

    /**
     * Base32 decode.
     */
    private function base32Decode(string $input): string
    {
        $map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $input = strtoupper(rtrim($input, '='));
        $buffer = 0;
        $bitsLeft = 0;
        $output = '';

        for ($i = 0, $len = strlen($input); $i < $len; $i++) {
            $val = strpos($map, $input[$i]);
            if ($val === false) {
                continue;
            }
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
