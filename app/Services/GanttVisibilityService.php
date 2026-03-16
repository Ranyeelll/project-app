<?php

namespace App\Services;

use App\Enums\Department;
use App\Models\GanttItem;
use App\Models\User;

/**
 * Gantt Visibility Service: Controls which gantt items a user can see.
 * Visibility rules:
 * - Admin always sees all items (unless preview_as is set)
 * - If both visible_to_roles and visible_to_users are empty → visible to all
 * - Otherwise: user must match at least one of visible_to_roles OR visible_to_users
 */
class GanttVisibilityService
{
    /**
     * Determine if a gantt item is visible to a given user.
     */
    public function isVisible(GanttItem $item, User $user): bool
    {
        // Admin always sees everything (unless impersonating via preview_as)
        if ($user->department === Department::Admin) {
            return true;
        }

        $roles = $item->visible_to_roles ?? [];
        $users = $item->visible_to_users ?? [];

        // No restriction set → visible to all
        if (empty($roles) && empty($users)) {
            return true;
        }

        // Check department match
        $deptMatch = !empty($roles) && in_array($user->department->value, $roles);

        // Check user ID match
        $userMatch = !empty($users) && in_array((string) $user->id, $users);

        return $deptMatch || $userMatch;
    }
}
