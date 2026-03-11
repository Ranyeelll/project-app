<?php

use App\Models\Project;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
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
    // Admin can join any project; employees must be on the team or be the manager
    $allowed = $user->role === 'admin'
        || (int) $project->manager_id === $user->id
        || in_array($user->id, (array) $project->team_ids);

    return $allowed ? [
        'id'            => $user->id,
        'name'          => $user->name,
        'profile_photo' => $user->profile_photo,
    ] : false;
});
