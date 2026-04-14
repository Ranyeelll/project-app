<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\Media;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class MediaController extends Controller
{
    /**
     * List all media uploads.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Media::query();

        if ($request->has('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }

        if ($request->has('task_id')) {
            $query->where('task_id', $request->input('task_id'));
        }

        if ($request->has('uploaded_by')) {
            $query->where('uploaded_by', $request->input('uploaded_by'));
        }

        $media = $query->with(['project', 'task', 'uploader'])
            ->orderByDesc('created_at')
            ->limit(500)
            ->get()
            ->map(fn ($m) => $this->formatMedia($m));

        return response()->json($media);
    }

    /**
     * Store a new media upload.
     * Accepts multipart/form-data for file/video uploads, or JSON for text reports.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id'  => 'required|exists:projects,id',
            'task_id'     => 'nullable|exists:tasks,id',
            'uploaded_by' => 'required|exists:users,id',
            'type'        => 'required|in:file,video,text',
            'title'       => 'required|string|max:255',
            'content'     => 'nullable|string',
            'file'        => 'nullable|file|max:512000|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,rar,mp4,mov,avi,mkv,webm',
            'visible_to'  => ['nullable', 'string', 'regex:/^(\d+)(,\s*\d+)*$/'],
        ]);

        $actor = Auth::user();
        if ($actor && $actor->department?->value === 'Employee') {
            $project = Project::find($data['project_id']);
            if ($project && in_array($project->status, ['completed', 'archived'], true)) {
                return response()->json([
                    'error' => 'Locked',
                    'message' => 'This project is already completed and can no longer accept employee submissions.',
                ], 422);
            }
        }

        $filePath = null;
        $originalFilename = null;
        $fileSize = null;

        if ($request->hasFile('file')) {
            $uploadedFile = $request->file('file');
            $filePath = $uploadedFile->store('media', 'public');
            $originalFilename = $uploadedFile->getClientOriginalName();
            $bytes = $uploadedFile->getSize();
            $fileSize = $this->formatBytes($bytes);
        }

        // Parse visible_to from comma-separated string to array of valid user IDs
        $visibleTo = null;
        if (!empty($data['visible_to'])) {
            $visibleTo = array_values(array_filter(
                array_map('trim', explode(',', $data['visible_to'])),
                fn ($id) => is_numeric($id) && $id > 0
            ));
            if (empty($visibleTo)) {
                $visibleTo = null;
            } elseif (count($visibleTo) > 50) {
                $visibleTo = array_slice($visibleTo, 0, 50);
            }
        }

        $media = Media::create([
            'project_id'        => $data['project_id'],
            'task_id'           => $data['task_id'] ?? null,
            'uploaded_by'       => $data['uploaded_by'],
            'type'              => $data['type'],
            'title'             => $data['title'],
            'content'           => $data['content'] ?? '',
            'file_path'         => $filePath,
            'original_filename' => $originalFilename,
            'file_size'         => $fileSize,
            'visible_to'        => $visibleTo,
        ]);

        return response()->json($this->formatMedia($media), 201);
    }

    /**
     * Delete a media upload.
     * Only admins, superadmins, or the uploader can delete.
     */
    public function destroy(Media $medium): JsonResponse
    {
        $user = Auth::user();

        // Authorization: Only admin/superadmin or the uploader can delete
        $isAdmin = $user->department === Department::Admin || $user->role === 'superadmin';
        $isUploader = $user->id === $medium->uploaded_by;

        if (!$isAdmin && !$isUploader) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Only admins or the uploader can delete media.',
            ], 403);
        }

        // Delete the physical file if it exists
        if ($medium->file_path) {
            Storage::disk('public')->delete($medium->file_path);
        }

        $medium->delete();

        return response()->json(['message' => 'Media deleted']);
    }

    /**
     * Download / serve a media file.
     */
    public function download(Media $medium)
    {
        $this->authorizeMediaAccess($medium);

        if (!$medium->file_path || !Storage::disk('public')->exists($medium->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        return Storage::disk('public')->download(
            $medium->file_path,
            $medium->original_filename ?? basename($medium->file_path)
        );
    }

    /**
     * Serve / stream a media file inline (for previews).
     */
    public function serve(Media $medium)
    {
        $this->authorizeMediaAccess($medium);

        if (!$medium->file_path || !Storage::disk('public')->exists($medium->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        return Storage::disk('public')->response($medium->file_path);
    }

    /**
     * Verify the current user has access to the media's project.
     */
    private function authorizeMediaAccess(Media $medium): void
    {
        $user = Auth::user();
        if (!$user) {
            abort(401);
        }

        // Admins, superadmins, and Technical dept have full access
        if ($user->role === 'superadmin' || $user->department === Department::Admin || $user->department === Department::Technical) {
            return;
        }

        // Employees must be on the project's team
        $project = $medium->project;
        if ($project) {
            $teamIds = array_map('intval', $project->team_ids ?? []);
            if (in_array((int) $user->id, $teamIds, true)) {
                return;
            }
            if ((int) $user->id === (int) $project->manager_id || (int) $user->id === (int) $project->project_leader_id) {
                return;
            }
        }

        abort(403, 'You do not have access to this file.');
    }

    /**
     * Format a media record for the frontend (camelCase).
     */
    private function formatMedia(Media $m): array
    {
        return [
            'id'               => (string) $m->id,
            'projectId'        => (string) $m->project_id,
            'taskId'           => $m->task_id ? (string) $m->task_id : null,
            'uploadedBy'       => (string) $m->uploaded_by,
            'type'             => $m->type,
            'title'            => $m->title,
            'content'          => $m->content ?? '',
            'filePath'         => $m->file_path ? '/api/media/' . $m->id . '/serve' : null,
            'originalFilename' => $m->original_filename,
            'fileSize'         => $m->file_size,
            'visibleTo'        => $m->visible_to ?? [],
            'createdAt'        => $m->created_at?->toIso8601String() ?? '',
        ];
    }

    /**
     * Human-readable file size.
     */
    private function formatBytes(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 1) . ' GB';
        }
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 1) . ' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 1) . ' KB';
        }
        return $bytes . ' B';
    }
}
