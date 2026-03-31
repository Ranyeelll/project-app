<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SystemSettingsController extends Controller
{
    private string $settingsPath;

    public function __construct()
    {
        $this->settingsPath = storage_path('app/system_settings.json');
    }

    private function loadSettings(): array
    {
        if (!file_exists($this->settingsPath)) return [];
        $json = file_get_contents($this->settingsPath);
        return json_decode($json, true) ?: [];
    }

    private function saveSettings(array $data): void
    {
        if (!is_dir(dirname($this->settingsPath))) mkdir(dirname($this->settingsPath), 0755, true);
        file_put_contents($this->settingsPath, json_encode($data, JSON_PRETTY_PRINT));
    }

    public function getAuditLogRetention(): JsonResponse
    {
        $settings = $this->loadSettings();
        $days = isset($settings['audit_log_retention_days']) ? (int) $settings['audit_log_retention_days'] : 365;
        return response()->json(['audit_log_retention_days' => $days]);
    }

    public function updateAuditLogRetention(Request $request): JsonResponse
    {
        $days = (int) $request->input('days', 365);
        if ($days < 0) $days = 0;

        $settings = $this->loadSettings();
        $settings['audit_log_retention_days'] = $days;
        $this->saveSettings($settings);

        return response()->json(['audit_log_retention_days' => $days]);
    }
}
