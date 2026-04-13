<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use App\Services\AuditService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class SystemSettingsController extends Controller
{
    public function getAuditLogRetention(): JsonResponse
    {
        $days = (int) SystemSetting::getValue('audit_log_retention_days', 365);
        return response()->json(['audit_log_retention_days' => $days]);
    }

    public function updateAuditLogRetention(Request $request): JsonResponse
    {
        $days = (int) $request->input('days', 365);
        if ($days < 0) $days = 0;

        $oldDays = (int) SystemSetting::getValue('audit_log_retention_days', 365);
        SystemSetting::setValue('audit_log_retention_days', $days);

        if ($oldDays !== $days) {
            AuditService::logConfigUpdated(
                'audit_log_retention_days',
                $oldDays,
                $days,
                Auth::id()
            );
        }

        return response()->json(['audit_log_retention_days' => $days]);
    }
}
