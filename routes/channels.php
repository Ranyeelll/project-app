<?php

use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

/**
 * Private channel per user for notifications.
 * Users can only subscribe to their own channel.
 */
Broadcast::channel('user.{userId}', function ($user, int $userId) {
    return (int) $user->id === $userId;
});

/**
 * Presence channel for real-time project updates (TaskProgressUpdated event).
 * Users must be a member of the project to subscribe.
 */
Broadcast::channel('project.{projectId}', function ($user, int $projectId) {
    $isMember = \App\Models\Project::where('id', $projectId)
        ->where(function ($q) use ($user) {
            $q->where('created_by', $user->id)
              ->orWhereHas('tasks', fn ($t) => $t->where('assigned_to', $user->id));
        })->exists();

    return $isMember ? ['id' => $user->id, 'name' => $user->name] : false;
});
