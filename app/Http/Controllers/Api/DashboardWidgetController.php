<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DashboardWidget;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DashboardWidgetController extends Controller
{
    public function index(): JsonResponse
    {
        $widgets = DashboardWidget::where('user_id', Auth::id())
            ->orderBy('position')
            ->get()
            ->map(fn ($w) => $this->formatWidget($w));

        return response()->json($widgets);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'widget_type' => 'required|string|max:50',
            'title' => 'required|string|max:255',
            'position' => 'nullable|integer|min:0',
            'col_span' => 'nullable|integer|min:1|max:4',
            'config' => 'nullable|array',
            'is_visible' => 'nullable|boolean',
        ]);

        $data['user_id'] = Auth::id();
        $widget = DashboardWidget::create($data);

        return response()->json($this->formatWidget($widget), 201);
    }

    public function update(Request $request, DashboardWidget $widget): JsonResponse
    {
        if ($widget->user_id !== Auth::id()) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'position' => 'nullable|integer|min:0',
            'col_span' => 'nullable|integer|min:1|max:4',
            'config' => 'nullable|array',
            'is_visible' => 'nullable|boolean',
        ]);

        $widget->update($data);

        return response()->json($this->formatWidget($widget));
    }

    public function destroy(DashboardWidget $widget): JsonResponse
    {
        if ($widget->user_id !== Auth::id()) {
            return response()->json(['error' => 'Forbidden'], 403);
        }

        $widget->delete();
        return response()->json(['message' => 'Widget deleted']);
    }

    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order' => 'required|array',
            'order.*' => 'integer|exists:dashboard_widgets,id',
        ]);

        foreach ($data['order'] as $position => $widgetId) {
            DashboardWidget::where('id', $widgetId)
                ->where('user_id', Auth::id())
                ->update(['position' => $position]);
        }

        return response()->json(['message' => 'Widgets reordered']);
    }

    private function formatWidget(DashboardWidget $w): array
    {
        return [
            'id' => (string) $w->id,
            'widgetType' => $w->widget_type,
            'title' => $w->title,
            'position' => (int) $w->position,
            'colSpan' => (int) ($w->col_span ?? 1),
            'config' => $w->config ?? [],
            'isVisible' => (bool) $w->is_visible,
        ];
    }
}
