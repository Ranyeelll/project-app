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
        // Superadmin/admin and supervisors always see the Gantt
        if ($user->isAdmin() || $user->isSupervisor()) {
            return true;
        }

        // Technical department always has access
        if ($user->department === Department::Technical) {
            return true;
        }

        // Enforce simplified visibility policy:
        // Only assignees on the gantt item (and the elevated roles above) can view.
        $assignees = $item->assignee_ids ?? [];
        if (!empty($assignees) && in_array((int) $user->id, array_map('intval', $assignees), true)) {
            return true;
        }

        // Deny by default
        return false;
    }
}
