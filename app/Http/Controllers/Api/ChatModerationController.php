<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageDeleted;
use App\Http\Controllers\Controller;
use App\Models\ChatMutedUser;
use App\Models\Message;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatModerationController extends Controller
{
    /**
     * DELETE /api/admin/chat/messages/{message}
     * Admin force-deletes any message with full audit trail.
     */
    public function deleteMessage(Request $request, Message $message): JsonResponse
    {
        $adminId = (int) $request->input('admin_id', 0);

        $snapshot = [
            'message_text' => $message->message_text,
            'sender_id'    => $message->sender_id,
            'project_id'   => $message->project_id,
            'created_at'   => $message->created_at->toISOString(),
        ];

        $message->delete();

        // Audit: admin moderation delete
        AuditService::logChatModeration(
            $message->id,
            $message->project_id,
            'admin_deleted',
            ['snapshot' => $snapshot, 'reason' => $request->input('reason')],
            $adminId
        );

        // Broadcast so connected clients hide the message immediately
        try {
            broadcast(new MessageDeleted($message->id, $message->project_id));
        } catch (\Throwable $e) {}

        return response()->json(['ok' => true]);
    }

    /**
     * POST /api/admin/chat/messages/{message}/flag
     * Flag a message as inappropriate.
     */
    public function flagMessage(Request $request, Message $message): JsonResponse
    {
        $data = $request->validate([
            'admin_id'    => 'required|integer|exists:users,id',
            'flag_reason' => 'required|string|max:500',
        ]);

        $message->update([
            'is_flagged'  => true,
            'flag_reason' => $data['flag_reason'],
            'flagged_by'  => $data['admin_id'],
        ]);

        AuditService::logChatModeration(
            $message->id,
            $message->project_id,
            'admin_flagged',
            ['flag_reason' => $data['flag_reason']],
            (int) $data['admin_id']
        );

        return response()->json(['ok' => true]);
    }

    /**
     * DELETE /api/admin/chat/messages/{message}/flag
     * Unflag a message (clear the inappropriate flag).
     */
    public function unflagMessage(Request $request, Message $message): JsonResponse
    {
        $adminId = (int) $request->input('admin_id', 0);

        $message->update([
            'is_flagged'  => false,
            'flag_reason' => null,
            'flagged_by'  => null,
        ]);

        AuditService::logChatModeration(
            $message->id,
            $message->project_id,
            'admin_unflagged',
            null,
            $adminId
        );

        return response()->json(['ok' => true]);
    }

    /**
     * GET /api/admin/chat/flagged
     * List flagged messages (admin overview).
     */
    public function flagged(Request $request): JsonResponse
    {
        $messages = Message::with(['sender', 'flaggedByUser', 'project'])
            ->where('is_flagged', true)
            ->latest()
            ->limit(100)
            ->get()
            ->map(fn ($m) => [
                'id'            => $m->id,
                'message_text'  => $m->message_text,
                'sender'        => $m->sender ? ['id' => $m->sender->id, 'name' => $m->sender->name] : null,
                'flag_reason'   => $m->flag_reason,
                'flagged_by'    => $m->flaggedByUser ? ['id' => $m->flaggedByUser->id, 'name' => $m->flaggedByUser->name] : null,
                'project'       => $m->project ? ['id' => $m->project->id, 'name' => $m->project->name] : null,
                'created_at'    => $m->created_at->toISOString(),
            ]);

        return response()->json($messages);
    }

    /**
     * POST /api/admin/chat/mute
     * Mute a user in chat.
     */
    public function muteUser(Request $request): JsonResponse
    {
        $data = $request->validate([
            'admin_id'    => 'required|integer|exists:users,id',
            'user_id'     => 'required|integer|exists:users,id',
            'reason'      => 'nullable|string|max:500',
            'muted_until' => 'nullable|date|after:now', // null = permanent
        ]);

        ChatMutedUser::updateOrCreate(
            ['user_id' => $data['user_id']],
            [
                'muted_by'    => $data['admin_id'],
                'reason'      => $data['reason'] ?? null,
                'muted_until' => $data['muted_until'] ?? null,
            ]
        );

        AuditService::logUserMuted(
            (int) $data['user_id'],
            'muted',
            $data['reason'] ?? null,
            isset($data['muted_until']) ? new \DateTime($data['muted_until']) : null,
            (int) $data['admin_id']
        );

        return response()->json(['ok' => true]);
    }

    /**
     * DELETE /api/admin/chat/mute/{user}
     * Unmute a user.
     */
    public function unmuteUser(Request $request, User $user): JsonResponse
    {
        $adminId = (int) $request->input('admin_id', 0);

        ChatMutedUser::where('user_id', $user->id)->delete();

        AuditService::logUserMuted($user->id, 'unmuted', null, null, $adminId);

        return response()->json(['ok' => true]);
    }

    /**
     * GET /api/admin/chat/muted
     * List all currently muted users.
     */
    public function mutedUsers(Request $request): JsonResponse
    {
        $muted = ChatMutedUser::with(['user', 'mutedByUser'])
            ->get()
            ->filter(fn ($m) => $m->isActive())
            ->map(fn ($m) => [
                'id'          => $m->id,
                'user'        => ['id' => $m->user->id, 'name' => $m->user->name, 'department' => $m->user->department],
                'muted_by'    => ['id' => $m->mutedByUser->id, 'name' => $m->mutedByUser->name],
                'reason'      => $m->reason,
                'muted_until' => $m->muted_until?->toISOString(),
                'created_at'  => $m->created_at->toISOString(),
            ])
            ->values();

        return response()->json($muted);
    }
}
