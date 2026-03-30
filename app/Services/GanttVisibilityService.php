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

        $roles = $item->visible_to_roles ?? [];
        $users = $item->visible_to_users ?? [];

        // If explicit visibility restrictions are set, honor them first
        if (!empty($roles) || !empty($users)) {
            // Department match (roles may contain department names)
            $deptMatch = !empty($roles) && in_array($user->department->value, $roles, true);
            // Role match (roles may contain role strings like 'supervisor')
            $roleMatch = !empty($roles) && in_array(strtolower((string) $user->role), array_map('strtolower', $roles), true);
            // User ID match
            $userMatch = !empty($users) && in_array((string) $user->id, $users, true);

            if ($deptMatch || $roleMatch || $userMatch) {
                return true;
            }
            // Explicit restrictions present but no match — fallthrough to project-level checks
        }

        // Employee involvement: check project membership (manager, team members, project leader)
        $project = $item->project;
        if ($project) {
            $teamIds = array_map('intval', $project->team_ids ?? []);
            if (in_array($user->id, $teamIds, true)) {
                return true;
            }
            if (!empty($project->manager_id) && (int) $project->manager_id === (int) $user->id) {
                return true;
            }
            if (!empty($project->project_leader_id) && (int) $project->project_leader_id === (int) $user->id) {
                return true;
            }
        }

        // Also allow assignees on the gantt item itself
        $assignees = $item->assignee_ids ?? [];
        if (!empty($assignees) && in_array((int) $user->id, array_map('intval', $assignees), true)) {
            return true;
        }

        // Deny by default — only the checks above grant access
        return false;
    }
}
