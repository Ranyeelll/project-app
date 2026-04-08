<?php

namespace App\Services;

use App\Enums\Department;
use App\Models\GanttItem;
use App\Models\User;

/**
 * Gantt Visibility Service: Controls which gantt items a user can see.
 * Visibility rules:
 * - Admin/supervisor/technical always see all items
 * - Project members (manager, leader, team member) can see project items
 * - Non-members are denied unless explicitly included by assignee/visibility lists
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

        $project = $item->project;
        if ($project) {
            $uid = (string) $user->id;
            $teamIds = array_map('strval', $project->team_ids ?? []);
            $isProjectManager = (string) ($project->manager_id ?? '') === $uid;
            $isProjectLeader = (string) ($project->project_leader_id ?? '') === $uid;
            $isProjectMember = in_array($uid, $teamIds, true);

            if ($isProjectManager || $isProjectLeader || $isProjectMember) {
                return true;
            }
        }

        // Enforce simplified visibility policy:
        // Allow explicit per-item visibility for non-members.
        $assignees = $item->assignee_ids ?? [];
        if (!empty($assignees) && in_array((string) $user->id, array_map('strval', $assignees), true)) {
            return true;
        }

        $visibleUsers = $item->visible_to_users ?? [];
        if (!empty($visibleUsers) && in_array((string) $user->id, array_map('strval', $visibleUsers), true)) {
            return true;
        }

        $visibleRoles = array_map('strtolower', array_map('strval', $item->visible_to_roles ?? []));
        $role = strtolower((string) ($user->role ?? ''));
        $department = strtolower((string) ($user->department?->value ?? $user->department ?? ''));
        if (!empty($visibleRoles) && (in_array($role, $visibleRoles, true) || in_array($department, $visibleRoles, true))) {
            return true;
        }

        // Deny by default
        return false;
    }
}
