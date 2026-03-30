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
// Presence channel for project chat removed (chat feature disabled)
