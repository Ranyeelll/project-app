<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProjectTemplate;
use App\Models\TaskTemplate;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ProjectTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ProjectTemplate::with('taskTemplates');

        if ($search = $request->input('search')) {
            $query->where('name', 'ilike', "%{$search}%");
        }
        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }

        $templates = $query->orderByDesc('created_at')
            ->get()
            ->map(fn ($t) => $this->formatTemplate($t));

        return response()->json($templates);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'risk_level' => 'nullable|string|in:low,medium,high,critical',
            'default_budget' => 'nullable|numeric|min:0',
            'default_duration_days' => 'nullable|integer|min:1',
            'default_team_structure' => 'nullable|array',
            'task_templates' => 'nullable|array',
            'task_templates.*.title' => 'required|string|max:255',
            'task_templates.*.description' => 'nullable|string',
            'task_templates.*.priority' => 'nullable|in:low,medium,high,critical',
            'task_templates.*.offset_days' => 'nullable|integer|min:0',
            'task_templates.*.duration_days' => 'nullable|integer|min:1',
            'task_templates.*.estimated_hours' => 'nullable|numeric|min:0',
            'task_templates.*.position' => 'nullable|integer|min:0',
        ]);

        $template = DB::transaction(function () use ($data) {
            $template = ProjectTemplate::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'category' => $data['category'] ?? null,
                'risk_level' => $data['risk_level'] ?? null,
                'default_budget' => $data['default_budget'] ?? null,
                'default_duration_days' => $data['default_duration_days'] ?? null,
                'default_team_structure' => $data['default_team_structure'] ?? null,
                'created_by' => Auth::id(),
            ]);

            if (!empty($data['task_templates'])) {
                foreach ($data['task_templates'] as $i => $tt) {
                    TaskTemplate::create([
                        'project_template_id' => $template->id,
                        'title' => $tt['title'],
                        'description' => $tt['description'] ?? null,
                        'priority' => $tt['priority'] ?? 'medium',
                        'offset_days' => $tt['offset_days'] ?? 0,
                        'duration_days' => $tt['duration_days'] ?? 1,
                        'estimated_hours' => $tt['estimated_hours'] ?? 0,
                        'position' => $tt['position'] ?? $i,
                    ]);
                }
            }

            return $template;
        });

        $template->load('taskTemplates');
        return response()->json($this->formatTemplate($template), 201);
    }

    public function update(Request $request, ProjectTemplate $template): JsonResponse
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'risk_level' => 'nullable|string|in:low,medium,high,critical',
            'default_budget' => 'nullable|numeric|min:0',
            'default_duration_days' => 'nullable|integer|min:1',
            'default_team_structure' => 'nullable|array',
        ]);

        $template->update($data);
        $template->load('taskTemplates');

        return response()->json($this->formatTemplate($template));
    }

    public function destroy(ProjectTemplate $template): JsonResponse
    {
        $template->delete();
        return response()->json(['message' => 'Template deleted']);
    }

    /**
     * Instantiate a project from a template.
     */
    public function instantiate(Request $request, ProjectTemplate $template): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'start_date' => 'required|date',
            'manager_id' => 'required|exists:users,id',
            'team_ids' => 'nullable|array',
            'team_ids.*' => 'exists:users,id',
        ]);

        $result = DB::transaction(function () use ($template, $data) {
            $startDate = new \DateTime($data['start_date']);
            $endDate = clone $startDate;
            if ($template->default_duration_days) {
                $endDate->modify("+{$template->default_duration_days} days");
            } else {
                $endDate->modify('+30 days');
            }

            $project = Project::create([
                'name' => $data['name'],
                'description' => $template->description ?? '',
                'status' => 'active',
                'priority' => 'medium',
                'category' => $template->category ?? 'General',
                'risk_level' => $template->risk_level ?? 'medium',
                'start_date' => $startDate->format('Y-m-d'),
                'end_date' => $endDate->format('Y-m-d'),
                'budget' => $template->default_budget ?? 0,
                'spent' => 0,
                'progress' => 0,
                'manager_id' => $data['manager_id'],
                'team_ids' => $data['team_ids'] ?? [],
            ]);

            $taskTemplates = $template->taskTemplates()->orderBy('position')->get();
            foreach ($taskTemplates as $tt) {
                $taskStart = clone $startDate;
                $taskStart->modify("+{$tt->offset_days} days");
                $taskEnd = clone $taskStart;
                $taskEnd->modify("+{$tt->duration_days} days");

                Task::create([
                    'project_id' => $project->id,
                    'title' => $tt->title,
                    'description' => $tt->description ?? '',
                    'status' => 'todo',
                    'priority' => $tt->priority ?? 'medium',
                    'start_date' => $taskStart->format('Y-m-d'),
                    'end_date' => $taskEnd->format('Y-m-d'),
                    'estimated_hours' => $tt->estimated_hours ?? 0,
                    'progress' => 0,
                    'logged_hours' => 0,
                    'allow_employee_edit' => false,
                    'completion_report_status' => 'none',
                ]);
            }

            return $project;
        });

        return response()->json([
            'message' => 'Project created from template',
            'projectId' => (string) $result->id,
        ], 201);
    }

    private function formatTemplate(ProjectTemplate $t): array
    {
        return [
            'id' => (string) $t->id,
            'name' => $t->name,
            'description' => $t->description ?? '',
            'category' => $t->category ?? '',
            'riskLevel' => $t->risk_level ?? '',
            'defaultBudget' => (float) ($t->default_budget ?? 0),
            'defaultDurationDays' => (int) ($t->default_duration_days ?? 0),
            'defaultTeamStructure' => $t->default_team_structure ?? [],
            'createdBy' => (string) ($t->created_by ?? ''),
            'createdAt' => $t->created_at?->toIso8601String() ?? '',
            'taskTemplates' => ($t->taskTemplates ?? collect())->map(fn ($tt) => [
                'id' => (string) $tt->id,
                'title' => $tt->title,
                'description' => $tt->description ?? '',
                'priority' => $tt->priority ?? 'medium',
                'offsetDays' => (int) $tt->offset_days,
                'durationDays' => (int) $tt->duration_days,
                'estimatedHours' => (float) ($tt->estimated_hours ?? 0),
                'position' => (int) $tt->position,
            ])->toArray(),
        ];
    }
}
