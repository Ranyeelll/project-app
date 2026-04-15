<?php

namespace Tests\Feature;

use App\Enums\Department;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class UserImportTest extends TestCase
{
    use RefreshDatabase;

    private function superadmin(): User
    {
        return User::factory()->create([
            'role' => 'superadmin',
            'department' => Department::Admin->value,
            'status' => 'active',
        ]);
    }

    public function test_superadmin_can_import_valid_csv(): void
    {
        $admin = $this->superadmin();

        $csv = "name,email,department,role,position\n";
        $csv .= "John Doe,john@example.com,Technical,employee,Developer\n";
        $csv .= "Jane Smith,jane@example.com,Accounting,employee,Accountant\n";

        $file = UploadedFile::fake()->createWithContent('users.csv', $csv);

        $this->actingAs($admin)
            ->postJson('/api/users/import', ['file' => $file])
            ->assertOk()
            ->assertJsonFragment([
                'imported' => 2,
                'skipped' => 0,
            ]);

        $this->assertDatabaseHas('users', ['email' => 'john@example.com', 'department' => 'Technical']);
        $this->assertDatabaseHas('users', ['email' => 'jane@example.com', 'department' => 'Accounting']);
    }

    public function test_import_skips_invalid_rows(): void
    {
        $admin = $this->superadmin();

        $csv = "name,email,department,role\n";
        $csv .= "Valid User,valid@example.com,Technical,employee\n";
        $csv .= "Bad User,not-an-email,InvalidDept,invalidrole\n";

        $file = UploadedFile::fake()->createWithContent('users.csv', $csv);

        $this->actingAs($admin)
            ->postJson('/api/users/import', ['file' => $file])
            ->assertOk()
            ->assertJsonFragment([
                'imported' => 1,
                'skipped' => 1,
            ]);

        $this->assertDatabaseHas('users', ['email' => 'valid@example.com']);
        $this->assertDatabaseMissing('users', ['email' => 'not-an-email']);
    }

    public function test_import_rejects_duplicate_emails(): void
    {
        $admin = $this->superadmin();

        User::factory()->create(['email' => 'existing@example.com']);

        $csv = "name,email,department,role\n";
        $csv .= "Duplicate,existing@example.com,Technical,employee\n";

        $file = UploadedFile::fake()->createWithContent('users.csv', $csv);

        $this->actingAs($admin)
            ->postJson('/api/users/import', ['file' => $file])
            ->assertOk()
            ->assertJsonFragment([
                'imported' => 0,
                'skipped' => 1,
            ]);
    }

    public function test_import_rejects_missing_required_columns(): void
    {
        $admin = $this->superadmin();

        $csv = "name,email\n";
        $csv .= "NoRole,norole@example.com\n";

        $file = UploadedFile::fake()->createWithContent('users.csv', $csv);

        $this->actingAs($admin)
            ->postJson('/api/users/import', ['file' => $file])
            ->assertStatus(422)
            ->assertJsonFragment(['error' => 'Missing required column: department']);
    }

    public function test_import_requires_file(): void
    {
        $admin = $this->superadmin();

        $this->actingAs($admin)
            ->postJson('/api/users/import', [])
            ->assertStatus(422);
    }

    public function test_employee_cannot_import_users(): void
    {
        $employee = User::factory()->create([
            'role' => 'employee',
            'department' => Department::Employee->value,
            'status' => 'active',
        ]);

        $csv = "name,email,department,role\nTest,test@test.com,Technical,employee\n";
        $file = UploadedFile::fake()->createWithContent('users.csv', $csv);

        $this->actingAs($employee)
            ->postJson('/api/users/import', ['file' => $file])
            ->assertStatus(403);
    }

    public function test_imported_users_must_change_password(): void
    {
        $admin = $this->superadmin();

        $csv = "name,email,department,role\n";
        $csv .= "New User,newuser@example.com,Employee,employee\n";

        $file = UploadedFile::fake()->createWithContent('users.csv', $csv);

        $this->actingAs($admin)
            ->postJson('/api/users/import', ['file' => $file])
            ->assertOk();

        $this->assertDatabaseHas('users', [
            'email' => 'newuser@example.com',
            'must_change_password' => true,
        ]);
    }
}
