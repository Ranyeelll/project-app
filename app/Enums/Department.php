<?php

namespace App\Enums;

enum Department: string
{
    case Admin = 'Admin';
    case Accounting = 'Accounting';
    case Technical = 'Technical';
    case Employee = 'Employee';

    /**
     * Get all department values as array for validation
     */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }

    /**
     * Get permissions for this department
     */
    public function permissions(): array
    {
        return match ($this) {
            self::Admin => ['*'],
            self::Accounting => [
                'budget.view',
                'budget.manage',
                'budget-report.view',
                'budget-report.export',
                'chat.access',
            ],
            self::Technical => [
                'gantt.view',
                'gantt.manage',
                'tasks.view',
                'tasks.manage',
                'chat.access',
            ],
            self::Employee => [
                'tasks.view-own',
                'tasks.update-own',
                'budget.request',
                'chat.access',
            ],
        };
    }

    /**
     * Check if this department has a specific permission
     */
    public function can(string $permission): bool
    {
        $perms = $this->permissions();
        return in_array('*', $perms) || in_array($permission, $perms);
    }
}
