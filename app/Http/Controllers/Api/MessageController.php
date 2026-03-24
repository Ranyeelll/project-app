<?php

namespace App\Http\Controllers\Api;

use App\Events\MessagesRead;
use App\Events\MessageSent;
use App\Events\MessageDeleted;
use App\Events\UserTyping;
use App\Http\Controllers\Controller;
use App\Models\ChatMutedUser;
use App\Models\ChatNotification;
use App\Models\Message;
use App\Models\Project;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class MessageController extends Controller
{
    private function profilePhotoUrl(?User $user): ?string
    {
        if (!$user || !$user->profile_photo) {
            return null;
        }

        return '/api/users/' . $user->id . '/photo';
    }

    /**
     * GET /api/projects/{project}/messages
     * Returns all messages for a project (flat array, newest last).
     * Supports ?after={id} for incremental polling.
     */
    public function index(Request $request, Project $project): JsonResponse
    {
        $query = Message::with(['sender', 'replyTo.sender'])
            ->where('project_id', $project->id)
            ->orderBy('created_at', 'asc');

        if ($request->filled('after')) {
            $query->where('id', '>', (int) $request->input('after'));
        }

        $messages = $query->get()->map(fn ($m) => $this->formatMessage($m));

        return response()->json($messages);
    }

    /**
     * POST /api/projects/{project}/messages
     * Send a new message. Accepts sender_id in the request body.
     */
    public function store(Request $request, Project $project): JsonResponse
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
            throw ValidationException::withMessages([
                'message_text' => 'A message or attachment is required.',
            ]);
        }

        $sender = User::findOrFail((int) $data['sender_id']);

        // Mute check — muted users cannot send messages
        if (ChatMutedUser::isUserMuted($sender->id)) {
            return response()->json(['error' => 'You are muted and cannot send messages.'], 403);
        }

        // Handle file uploads
        $attachmentsMeta = [];
        foreach ($request->file('attachments', []) as $file) {
            $path = $file->store('chat/' . $project->id, 'local');
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
            'project_id'       => $project->id,
            'sender_id'        => $sender->id,
            'message_text'     => $data['message_text'] ?? null,
            'attachments_meta' => $attachmentsMeta ?: null,
            'metadata'         => $metadata ?: null,
            'reply_to_id'      => $data['reply_to_id'] ?? null,
            'read_by'          => [$sender->id],
        ]);

        $message->loadMissing(['sender', 'replyTo.sender']);

        // Audit: message sent
        AuditService::logMessageSent($message->id, $project->id, null, $sender->id);

        // Notify mentioned users
        if (!empty($data['mentions'])) {
            $preview = mb_substr($data['message_text'] ?? '', 0, 80);
            foreach ($data['mentions'] as $mentionedId) {
                if ((int) $mentionedId !== $sender->id) {
                    ChatNotification::create([
                        'user_id'     => $mentionedId,
                        'type'        => 'mention',
                        'message_id'  => $message->id,
                        'project_id'  => $project->id,
                        'sender_name' => $sender->name,
                        'preview'     => $preview,
                    ]);
                }
            }
        }

        // Broadcast if Reverb is running — silently skip if it isn't
        try {
            broadcast(new MessageSent($message));
        } catch (\Throwable $e) {
            // Chat still works via HTTP polling
        }

        return response()->json($this->formatMessage($message), 201);
    }

    /**
     * POST /api/projects/{project}/messages/read
     * Mark messages as read. Accepts user_id in the request body.
     */
    public function markRead(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'user_id'       => 'required|integer|exists:users,id',
            'message_ids'   => 'required|array',
            'message_ids.*' => 'integer',
        ]);

        $userId = (int) $data['user_id'];

        $messages = Message::where('project_id', $project->id)
            ->whereIn('id', $data['message_ids'])
            ->get();

        $updated = [];
        foreach ($messages as $msg) {
            $readBy = $msg->read_by ?? [];
            if (!in_array($userId, $readBy)) {
                $readBy[] = $userId;
                $msg->update(['read_by' => $readBy]);
                $updated[] = $msg->id;
            }
        }

        if (!empty($updated)) {
            try {
                broadcast(new MessagesRead($project->id, $userId, $updated));
            } catch (\Throwable $e) {}
        }

        return response()->json(['marked' => count($updated)]);
    }

    /**
     * POST /api/projects/{project}/messages/typing
     * Broadcast a typing indicator. Accepts user_id + user_name in body.
     */
    public function typing(Request $request, Project $project): JsonResponse
    {
        $data = $request->validate([
            'user_id'   => 'required|integer|exists:users,id',
            'user_name' => 'required|string',
            'is_typing' => 'boolean',
        ]);

        try {
            broadcast(new UserTyping(
                $project->id,
                (int) $data['user_id'],
                $data['user_name'],
                (bool) ($data['is_typing'] ?? true),
            ));
        } catch (\Throwable $e) {}

        return response()->json(['ok' => true]);
    }

    /**
     * PATCH /api/messages/{message}
     * Edit message text. Sender only. Marks message as edited in metadata.
     */
    public function update(Request $request, Message $message): JsonResponse
    {
        $data = $request->validate([
            'user_id'      => 'required|integer|exists:users,id',
            'message_text' => 'required|string|max:5000',
        ]);

        if ($message->sender_id !== (int) $data['user_id']) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $oldText = $message->message_text ?? '';
        $metadata = $message->metadata ?? [];
        $metadata['edited'] = true;
        $metadata['edited_at'] = now()->toISOString();

        $message->update([
            'message_text' => $data['message_text'],
            'metadata'     => $metadata,
        ]);

        // Audit: message edited
        AuditService::logMessageEdited(
            $message->id,
            $message->project_id,
            $oldText,
            $data['message_text'],
            (int) $data['user_id']
        );

        $message->loadMissing(['sender', 'replyTo.sender']);

        return response()->json($this->formatMessage($message));
    }

    /**
     * DELETE /api/messages/{message}?user_id=&user_role=
     * Soft-delete a message. Sender or admin only.
     */
    public function destroy(Request $request, Message $message): JsonResponse
    {
        $requestUserId = (int) $request->query('user_id', 0);
        $requestRole   = $request->query('user_role', '');
        $isElevatedRole = in_array(strtolower((string) $requestRole), ['superadmin', 'admin'], true);

        if ($message->sender_id !== $requestUserId && ! $isElevatedRole) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $snapshot = [
            'message_text' => $message->message_text,
            'sender_id'    => $message->sender_id,
            'project_id'   => $message->project_id,
        ];

        $message->delete();

        // Audit: message deleted
        AuditService::logMessageDeleted($message->id, $message->project_id, $snapshot, $requestUserId ?: null);

        // Broadcast deletion so clients can remove the bubble immediately
        try {
            broadcast(new MessageDeleted($message->id, $message->project_id));
        } catch (\Throwable $e) {}

        return response()->json(['ok' => true]);
    }

    /**
     * GET /api/chat-attachments/{message}/{index}
     * Serve a chat attachment file.
     */
    public function serveAttachment(Request $request, Message $message, int $index): mixed
    {
        $meta = $message->attachments_meta[$index] ?? null;

        if (!$meta || !Storage::disk('local')->exists($meta['path'])) {
            abort(404);
        }

        return Storage::disk('local')->response($meta['path'], $meta['name']);
    }

    private function formatMessage(Message $msg): array
    {
        return [
            'id'               => $msg->id,
            'project_id'       => $msg->project_id,
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
                'profile_photo' => $this->profilePhotoUrl($msg->sender),
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


