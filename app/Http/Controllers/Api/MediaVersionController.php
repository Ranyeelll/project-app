<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MediaVersion;
use App\Models\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class MediaVersionController extends Controller
{
    public function index(int $mediaId): JsonResponse
    {
        $versions = MediaVersion::where('media_id', $mediaId)
            ->orderByDesc('version_number')
            ->get()
            ->map(fn ($v) => $this->formatVersion($v));

        return response()->json($versions);
    }

    public function store(Request $request, int $mediaId): JsonResponse
    {
        $media = Media::findOrFail($mediaId);

        $request->validate([
            'file' => 'required|file|max:51200',
            'change_note' => 'nullable|string|max:500',
        ]);

        $file = $request->file('file');
        $path = 'media-versions/' . uniqid() . '_' . $file->getClientOriginalName();

        $lastVersion = MediaVersion::where('media_id', $mediaId)->max('version_number') ?? 0;

        $version = MediaVersion::create([
            'media_id' => $mediaId,
            'version_number' => $lastVersion + 1,
            'file_path' => $path,
            'file_data' => file_get_contents($file->getRealPath()),
            'file_mime' => $file->getMimeType(),
            'original_filename' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'uploaded_by' => Auth::id(),
            'change_note' => $request->input('change_note'),
        ]);

        // Update main media record with latest file info
        $media->update([
            'file_path' => $path,
            'file_data' => $version->file_data,
            'file_mime' => $version->file_mime,
            'original_filename' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
        ]);

        return response()->json($this->formatVersion($version), 201);
    }

    public function download(int $mediaId, MediaVersion $version): mixed
    {
        // Serve from DB storage
        if ($version->file_data) {
            $filename = $version->original_filename ?? basename($version->file_path ?? 'download');
            return response($version->file_data)
                ->header('Content-Type', $version->file_mime ?? 'application/octet-stream')
                ->header('Content-Disposition', 'attachment; filename="' . $filename . '"');
        }

        // Fallback: legacy local disk files
        if (!Storage::disk('public')->exists($version->file_path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        return Storage::disk('public')->download(
            $version->file_path,
            $version->original_filename
        );
    }

    private function formatVersion(MediaVersion $v): array
    {
        return [
            'id' => (string) $v->id,
            'mediaId' => (string) $v->media_id,
            'versionNumber' => (int) $v->version_number,
            'filePath' => $v->file_path,
            'originalFilename' => $v->original_filename,
            'fileSize' => $v->file_size,
            'uploadedBy' => (string) $v->uploaded_by,
            'changeNote' => $v->change_note ?? '',
            'createdAt' => $v->created_at?->toIso8601String() ?? '',
        ];
    }
}
