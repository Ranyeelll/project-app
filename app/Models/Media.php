<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Media extends Model
{
    protected $table = 'media';

    protected $fillable = [
        'project_id',
        'task_id',
        'uploaded_by',
        'type',
        'title',
        'content',
        'file_path',
        'file_data',
        'file_mime',
        'original_filename',
        'file_size',
        'visible_to',
    ];

    protected $casts = [
        'project_id'  => 'integer',
        'task_id'     => 'integer',
        'uploaded_by' => 'integer',
        'visible_to'  => 'array',
    ];

    protected $hidden = ['file_data'];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
