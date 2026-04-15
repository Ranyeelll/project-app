<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MediaVersion extends Model
{
    protected $fillable = [
        'media_id',
        'version_number',
        'file_path',
        'original_filename',
        'file_size',
        'uploaded_by',
        'change_note',
    ];

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
