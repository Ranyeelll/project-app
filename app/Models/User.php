<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\Department;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'department',
        'position',
        'status',
        'profile_photo',
        'recovery_code',
        'must_change_password',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'recovery_code',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'department' => Department::class,
        ];
    }

    /**
     * Check if user is in Admin department
     */
    public function isAdmin(): bool
    {
        $role = strtolower(trim((string) ($this->role ?? '')));
        return $role === 'superadmin' || $role === 'admin' || $this->department === Department::Admin;
    }

    /**
     * Check if user is a supervisor.
     */
    public function isSupervisor(): bool
    {
        return strtolower(trim((string) ($this->role ?? ''))) === 'supervisor';
    }

    /**
     * Check if user has elevated role permissions.
     */
    public function isElevatedRole(): bool
    {
        return $this->isAdmin() || $this->isSupervisor();
    }

    /**
     * Check if user has access based on department
     */
    public function hasDepartmentAccess(string ...$departments): bool
    {
        // Admin always has access
        if ($this->isAdmin()) {
            return true;
        }

        // Check if user's department is in allowed list
        foreach ($departments as $dept) {
            $deptEnum = Department::tryFrom($dept);
            if ($deptEnum && $this->department === $deptEnum) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if user has a specific permission
     */
    public function hasPermission(string $permission): bool
    {
        return $this->department->can($permission);
    }
}
