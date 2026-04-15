<?php

namespace Tests\Feature;

use App\Enums\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    private function user(): User
    {
        return User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);
    }

    public function test_user_can_setup_two_factor(): void
    {
        $user = $this->user();

        $response = $this->actingAs($user)
            ->postJson('/api/two-factor/setup')
            ->assertOk()
            ->assertJsonStructure(['secret', 'otpauthUrl']);

        $data = $response->json();
        $this->assertStringContains('otpauth://totp/', $data['otpauthUrl']);
        $this->assertNotEmpty($data['secret']);

        $user->refresh();
        $this->assertEquals($data['secret'], $user->two_factor_secret);
        $this->assertFalse((bool) $user->two_factor_enabled);
    }

    public function test_user_can_check_two_factor_status(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->getJson('/api/two-factor/status')
            ->assertOk()
            ->assertJsonFragment(['enabled' => false]);
    }

    public function test_invalid_code_is_rejected(): void
    {
        $user = $this->user();

        // Setup first
        $this->actingAs($user)->postJson('/api/two-factor/setup');

        $this->actingAs($user)
            ->postJson('/api/two-factor/verify', [
                'code' => '000000',
            ])
            ->assertStatus(422)
            ->assertJsonFragment(['error' => 'Invalid verification code']);
    }

    public function test_verify_requires_setup_first(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->postJson('/api/two-factor/verify', [
                'code' => '123456',
            ])
            ->assertStatus(422)
            ->assertJsonFragment(['error' => 'No 2FA secret configured. Run setup first.']);
    }

    public function test_disable_requires_correct_password(): void
    {
        $user = $this->user();

        $this->actingAs($user)
            ->postJson('/api/two-factor/disable', [
                'password' => 'wrong-password',
            ])
            ->assertStatus(422)
            ->assertJsonFragment(['error' => 'Invalid password']);
    }

    public function test_disable_with_correct_password_works(): void
    {
        $user = $this->user();

        // Setup 2FA
        $this->actingAs($user)->postJson('/api/two-factor/setup');
        $user->update(['two_factor_enabled' => true]);

        $this->actingAs($user)
            ->postJson('/api/two-factor/disable', [
                'password' => 'password', // default UserFactory password
            ])
            ->assertOk()
            ->assertJsonFragment(['message' => '2FA disabled']);

        $user->refresh();
        $this->assertNull($user->two_factor_secret);
        $this->assertFalse((bool) $user->two_factor_enabled);
    }

    public function test_code_must_be_six_digits(): void
    {
        $user = $this->user();
        $this->actingAs($user)->postJson('/api/two-factor/setup');

        $this->actingAs($user)
            ->postJson('/api/two-factor/verify', [
                'code' => '12345',  // only 5 chars
            ])
            ->assertStatus(422);
    }

    /**
     * Custom assertion for string contains (compatible with all PHPUnit versions).
     */
    private function assertStringContains(string $needle, string $haystack): void
    {
        $this->assertTrue(
            str_contains($haystack, $needle),
            "Failed asserting that '{$haystack}' contains '{$needle}'"
        );
    }
}
