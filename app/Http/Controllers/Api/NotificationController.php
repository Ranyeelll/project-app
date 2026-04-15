<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    /**
     * GET /api/notifications
     * Returns the current user's notifications (latest 50, unread first).
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json([], 401);
        }

        $notifications = $user->notifications()
            ->orderByRaw('read_at IS NOT NULL')
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn ($n) => [
                'id'        => $n->id,
                'type'      => class_basename($n->type),
                'data'      => $n->data,
                'read'      => $n->read_at !== null,
                'createdAt' => $n->created_at->toIso8601String(),
            ]);

        return response()->json($notifications);
    }

    /**
     * POST /api/notifications/{id}/read
     * Mark a single notification as read.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $notification = $user->notifications()->where('id', $id)->first();
        if ($notification) {
            $notification->markAsRead();
        }

        return response()->json(['success' => true]);
    }

    /**
     * POST /api/notifications/read-all
     * Mark all notifications as read.
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $user->unreadNotifications->markAsRead();

        return response()->json(['success' => true]);
    }

    /**
     * GET /api/notification-preferences
     */
    public function getPreferences(): JsonResponse
    {
        $user = Auth::user();
        $defaults = [
            'task_assignments' => true,
            'budget_approvals' => true,
            'blocker_alerts' => true,
            'overdue_reminders' => true,
            'email_digest' => false,
        ];

        return response()->json(array_merge($defaults, $user->notification_preferences ?? []));
    }

    /**
     * PUT /api/notification-preferences
     */
    public function updatePreferences(Request $request): JsonResponse
    {
        $data = $request->validate([
            'task_assignments' => 'sometimes|boolean',
            'budget_approvals' => 'sometimes|boolean',
            'blocker_alerts' => 'sometimes|boolean',
            'overdue_reminders' => 'sometimes|boolean',
            'email_digest' => 'sometimes|boolean',
        ]);

        $user = Auth::user();
        $current = $user->notification_preferences ?? [];
        $user->notification_preferences = array_merge($current, $data);
        $user->save();

        return response()->json($user->notification_preferences);
    }
}
