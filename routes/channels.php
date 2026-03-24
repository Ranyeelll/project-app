<?php

use App\Models\DirectConversation;
use App\Models\Project;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

/**
 * Private channel per user for DM delivery and notifications.
 * Users can only subscribe to their own channel.
 */
Broadcast::channel('user.{userId}', function ($user, int $userId) {
    return (int) $user->id === $userId;
});

/**
 * Presence channel for project chat.
 * Returns user info so others can see who is online.
 */
Broadcast::channel('project.{projectId}', function ($user, int $projectId) {
    $project = Project::find($projectId);
    if (!$project) {
        return false;
    }
    // Elevated roles can join any project; others must be on the team or be the manager
    $allowed = in_array(strtolower((string) ($user->role ?? '')), ['superadmin', 'supervisor', 'admin'], true)
        || (int) $project->manager_id === $user->id
        || in_array($user->id, (array) $project->team_ids);

    return $allowed ? [
        'id'            => $user->id,
        'name'          => $user->name,
        'profile_photo' => $user->profile_photo ? '/api/users/' . $user->id . '/photo' : null,
    ] : false;
});
