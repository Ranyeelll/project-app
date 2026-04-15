<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $users = [
            [
                'name' => 'Alex Rivera',
                'email' => 'admin@maptech.com',
                'password' => Hash::make('admin123'),
                'role' => 'superadmin',
                'department' => 'Admin',
                'position' => 'Project Manager',
                'status' => 'active',
            ],
            [
                'name' => 'Maria Santos',
                'email' => 'employee@maptech.com',
                'password' => Hash::make('emp123'),
                'role' => 'employee',
                'department' => 'Technical',
                'position' => 'Senior Developer',
                'status' => 'active',
            ],
            [
                'name' => 'James Reyes',
                'email' => 'james@maptech.com',
                'password' => Hash::make('emp123'),
                'role' => 'employee',
                'department' => 'Technical',
                'position' => 'UI/UX Designer',
                'status' => 'active',
            ],
            [
                'name' => 'Clara Mendoza',
                'email' => 'clara@maptech.com',
                'password' => Hash::make('emp123'),
                'role' => 'employee',
                'department' => 'Technical',
                'position' => 'QA Engineer',
                'status' => 'active',
            ],
            [
                'name' => 'Daniel Cruz',
                'email' => 'daniel@maptech.com',
                'password' => Hash::make('emp123'),
                'role' => 'employee',
                'department' => 'Technical',
                'position' => 'Backend Developer',
                'status' => 'inactive',
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                $userData
            );
        }

        $this->call(SampleDataSeeder::class);
    }
}
