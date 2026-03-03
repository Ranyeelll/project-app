<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        $media = $query->orderByDesc('created_at')
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
            'file'        => 'nullable|file|max:512000', // 500 MB max
        ]);

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
        ]);

        return response()->json($this->formatMedia($media), 201);
    }

    /**
     * Delete a media upload.
     */
    public function destroy(Media $medium): JsonResponse
    {
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
        if (!$medium->file_path || !Storage::disk('public')->exists($medium->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        return Storage::disk('public')->download(
            $medium->file_path,
            $medium->original_filename ?? basename($medium->file_path)
        );
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
            'filePath'         => $m->file_path ? Storage::url($m->file_path) : null,
            'originalFilename' => $m->original_filename,
            'fileSize'         => $m->file_size,
            'createdAt'        => $m->created_at?->toDateString() ?? '',
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
