<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use LogicException;

class AuditLog extends Model
{
    /**
     * Append-only: disable Eloquent timestamps management.
     * created_at is set by the DB default; there is no updated_at column.
     */
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'actor_role',
        'action',
        'resource_type',
        'resource_id',
        'project_id',
        'changes',
        'snapshot',
        'context',
        'ip_address',
        'user_agent',
        'request_id',
        'performed_via',
        'sensitive_flag',
    ];

    protected $casts = [
        'changes'        => 'array',
        'snapshot'        => 'array',
        'context'         => 'array',
        'sensitive_flag'  => 'boolean',
        'created_at'      => 'datetime',
    ];

    // ─── Immutability guards ──────────────────────────────────────

    public function update(array $attributes = [], array $options = []): never
    {
        throw new LogicException('Audit logs are immutable — updates are not allowed.');
    }

    public function delete(): never
    {
        throw new LogicException('Audit logs are immutable — deletes are not allowed.');
    }

    public static function destroy($ids): never
    {
        throw new LogicException('Audit logs are immutable — deletes are not allowed.');
    }

    // ─── Relationships ────────────────────────────────────────────

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    // ─── Convenience factory ──────────────────────────────────────

    /**
     * Record an audit entry. This is the single entry-point; all fields are
     * explicit so call-sites are self-documenting.
     */
    public static function log(
        string  $action,
        string  $resourceType,
        int     $resourceId,
        ?int    $projectId = null,
        ?array  $changes = null,
        ?array  $snapshot = null,
        ?array  $context = null,
        ?int    $userId = null,
        ?string $performedVia = null,
        bool    $sensitiveFlag = false,
    ): self {
        $request = request();
        $user    = $userId ? User::find($userId) : auth()->user();

        return self::create([
            'action'         => $action,
            'resource_type'  => $resourceType,
            'resource_id'    => $resourceId,
            'project_id'     => $projectId,
            'changes'        => $changes,
            'snapshot'       => $snapshot,
            'context'        => $context,
            'user_id'        => $user?->id,
            'actor_role'     => $user?->department?->value ?? $user?->department ?? null,
            'ip_address'     => $request?->ip(),
            'user_agent'     => $request?->userAgent(),
            'request_id'     => $request?->header('X-Request-ID'),
            'performed_via'  => $performedVia ?? (app()->runningInConsole() ? 'cli' : 'web'),
            'sensitive_flag' => $sensitiveFlag,
        ]);
    }
}
