<?php

namespace App\Http\Controllers\Api;

use App\Events\DirectMessageSent;
use App\Http\Controllers\Controller;
use App\Models\ChatMutedUser;
use App\Models\ChatNotification;
use App\Models\DirectConversation;
use App\Models\Message;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class DirectMessageController extends Controller
{
    /**
     * GET /api/direct-conversations
     * List all DM conversations for the current user (identified by user_id query param).
     */
    public function index(Request $request): JsonResponse
    {
        $userId = (int) $request->query('user_id');

        $conversations = DirectConversation::where('participant1_id', $userId)
            ->orWhere('participant2_id', $userId)
            ->with(['participant1', 'participant2'])
            ->get()
            ->map(function (DirectConversation $conv) use ($userId) {
                $other = $conv->otherParticipantId($userId);
                $otherUser = $conv->participant1_id === $other ? $conv->participant1 : $conv->participant2;

                // Latest message
                $latest = Message::where('conversation_id', $conv->id)
                    ->whereNull('deleted_at')
                    ->latest()
                    ->first();

                // Unread count
                $unread = Message::where('conversation_id', $conv->id)
                    ->whereNull('deleted_at')
                    ->whereJsonDoesntContain('read_by', $userId)
                    ->count();

                return [
                    'id'           => $conv->id,
                    'other_user'   => $otherUser ? [
                        'id'            => $otherUser->id,
                        'name'          => $otherUser->name,
                        'profile_photo' => $otherUser->profile_photo,
                        'position'      => $otherUser->position,
                        'department'    => $otherUser->department,
                    ] : null,
                    'last_message' => $latest ? [
                        'message_text' => $latest->message_text,
                        'created_at'   => $latest->created_at->toISOString(),
                        'sender_id'    => $latest->sender_id,
                    ] : null,
                    'unread_count' => $unread,
                    'updated_at'   => $conv->updated_at->toISOString(),
                ];
            })
            ->sortByDesc(fn ($c) => $c['last_message']['created_at'] ?? $c['updated_at'])
            ->values();

        return response()->json($conversations);
    }

    /**
     * POST /api/direct-conversations
     * Find or create a DM conversation between two users.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id'        => 'required|integer|exists:users,id',
            'other_user_id'  => 'required|integer|exists:users,id|different:user_id',
        ]);

        $conv = DirectConversation::findOrCreateBetween(
            (int) $data['user_id'],
            (int) $data['other_user_id']
        );

        $other = User::find($data['other_user_id']);

        return response()->json([
            'id'         => $conv->id,
            'other_user' => $other ? [
                'id'            => $other->id,
                'name'          => $other->name,
                'profile_photo' => $other->profile_photo,
                'position'      => $other->position,
                'department'    => $other->department,
            ] : null,
        ], 201);
    }

    /**
     * GET /api/direct-conversations/{conversation}/messages
     * Load messages for a DM thread.
     */
    public function messages(Request $request, DirectConversation $conversation): JsonResponse
    {
        $query = Message::with(['sender', 'replyTo.sender'])
            ->where('conversation_id', $conversation->id)
            ->orderBy('created_at', 'asc');

        if ($request->filled('after')) {
            $query->where('id', '>', (int) $request->input('after'));
        }

        $messages = $query->get()->map(fn ($m) => $this->formatMessage($m));

        return response()->json($messages);
    }

    /**
     * POST /api/direct-conversations/{conversation}/messages
     * Send a DM.
     */
    public function sendMessage(Request $request, DirectConversation $conversation): JsonResponse
    {
        $data = $request->validate([
            'sender_id'     => 'required|integer|exists:users,id',
            'message_text'  => 'nullable|string|max:5000',
            'reply_to_id'   => 'nullable|integer|exists:messages,id',
            'metadata'      => 'nullable|array',
            'mentions'      => 'nullable|array',
            'mentions.*'    => 'integer',
            'attachments'   => 'nullable|array|max:5',
            'attachments.*' => 'file|max:20480',
        ]);

        if (empty($data['message_text']) && empty($request->file('attachments'))) {
            throw ValidationException::withMessages(['message_text' => 'A message or attachment is required.']);
        }

        $sender = User::findOrFail((int) $data['sender_id']);

        // Mute check
        if (ChatMutedUser::isUserMuted($sender->id)) {
            return response()->json(['error' => 'You are muted and cannot send messages.'], 403);
        }

        $recipientId = $conversation->otherParticipantId($sender->id);

        // Handle attachments
        $attachmentsMeta = [];
        foreach ($request->file('attachments', []) as $file) {
            $path = $file->store('chat/dm/' . $conversation->id, 'local');
            $attachmentsMeta[] = [
                'name'      => $file->getClientOriginalName(),
                'path'      => $path,
                'size'      => $file->getSize(),
                'mime'      => $file->getMimeType(),
                'extension' => $file->getClientOriginalExtension(),
            ];
        }

        $metadata = $data['metadata'] ?? [];
        if (!empty($data['mentions'])) {
            $metadata['mentions'] = $data['mentions'];
        }

        $message = Message::create([
            'conversation_id'  => $conversation->id,
            'sender_id'        => $sender->id,
            'message_text'     => $data['message_text'] ?? null,
            'attachments_meta' => $attachmentsMeta ?: null,
            'metadata'         => $metadata ?: null,
            'reply_to_id'      => $data['reply_to_id'] ?? null,
            'read_by'          => [$sender->id],
        ]);

        $message->loadMissing(['sender', 'replyTo.sender']);

        // Audit
        AuditService::logMessageSent($message->id, null, $conversation->id, $sender->id);

        // In-app notification for recipient
        ChatNotification::create([
            'user_id'         => $recipientId,
            'type'            => 'direct_message',
            'message_id'      => $message->id,
            'conversation_id' => $conversation->id,
            'sender_name'     => $sender->name,
            'preview'         => mb_substr($data['message_text'] ?? '', 0, 80),
        ]);

        // Broadcast
        try {
            broadcast(new DirectMessageSent($message, $recipientId));
        } catch (\Throwable $e) {}

        return response()->json($this->formatMessage($message), 201);
    }

    /**
     * POST /api/direct-conversations/{conversation}/messages/read
     * Mark DM messages as read.
     */
    public function markRead(Request $request, DirectConversation $conversation): JsonResponse
    {
        $data = $request->validate([
            'user_id'       => 'required|integer|exists:users,id',
            'message_ids'   => 'required|array',
            'message_ids.*' => 'integer',
        ]);

        $userId  = (int) $data['user_id'];
        $updated = 0;

        $messages = Message::where('conversation_id', $conversation->id)
            ->whereIn('id', $data['message_ids'])
            ->get();

        foreach ($messages as $msg) {
            $readBy = $msg->read_by ?? [];
            if (!in_array($userId, $readBy)) {
                $readBy[] = $userId;
                $msg->update(['read_by' => $readBy]);
                $updated++;
            }
        }

        // Mark related notifications as read
        ChatNotification::where('user_id', $userId)
            ->where('conversation_id', $conversation->id)
            ->update(['is_read' => true]);

        return response()->json(['marked' => $updated]);
    }

    /**
     * POST /api/direct-conversations/{conversation}/typing
     */
    public function typing(Request $request, DirectConversation $conversation): JsonResponse
    {
        // No broadcast — typing indicators for DMs use simple polling or future private channels
        return response()->json(['ok' => true]);
    }

    /**
     * GET /api/notifications?user_id=
     * Fetch unread chat notifications for the current user.
     */
    public function notifications(Request $request): JsonResponse
    {
        $userId = (int) $request->query('user_id');

        $notifications = ChatNotification::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn ($n) => [
                'id'              => $n->id,
                'type'            => $n->type,
                'message_id'      => $n->message_id,
                'project_id'      => $n->project_id,
                'conversation_id' => $n->conversation_id,
                'sender_name'     => $n->sender_name,
                'preview'         => $n->preview,
                'is_read'         => $n->is_read,
                'created_at'      => $n->created_at->toISOString(),
            ]);

        return response()->json($notifications);
    }

    /**
     * POST /api/notifications/read
     * Mark notifications as read.
     */
    public function markNotificationsRead(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id'          => 'required|integer|exists:users,id',
            'notification_ids' => 'nullable|array',
            'notification_ids.*' => 'integer',
        ]);

        $query = ChatNotification::where('user_id', $data['user_id']);

        if (!empty($data['notification_ids'])) {
            $query->whereIn('id', $data['notification_ids']);
        }

        $query->update(['is_read' => true]);

        return response()->json(['ok' => true]);
    }

    private function formatMessage(Message $msg): array
    {
        return [
            'id'               => $msg->id,
            'conversation_id'  => $msg->conversation_id,
            'sender_id'        => $msg->sender_id,
            'message_text'     => $msg->message_text,
            'attachments_meta' => $msg->attachments_meta ?? [],
            'metadata'         => $msg->metadata ?? [],
            'reply_to_id'      => $msg->reply_to_id,
            'read_by'          => $msg->read_by ?? [],
            'created_at'       => $msg->created_at->toISOString(),
            'sender'           => $msg->sender ? [
                'id'            => $msg->sender->id,
                'name'          => $msg->sender->name,
                'profile_photo' => $msg->sender->profile_photo,
            ] : null,
            'reply_to'         => $msg->replyTo ? [
                'id'           => $msg->replyTo->id,
                'message_text' => $msg->replyTo->message_text,
                'sender'       => $msg->replyTo->sender ? [
                    'id'   => $msg->replyTo->sender->id,
                    'name' => $msg->replyTo->sender->name,
                ] : null,
            ] : null,
        ];
    }
}
