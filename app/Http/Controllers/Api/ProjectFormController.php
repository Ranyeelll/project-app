<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectFormSubmission;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProjectFormController extends Controller
{
    public function __construct(
        private AuditService $audit,
    ) {}

    /**
     * List form submissions for a project, optionally filtered by form_type.
     */
    public function index(Request $request, Project $project): JsonResponse
    {
        $query = ProjectFormSubmission::where('project_id', $project->id)
            ->orderBy('created_at', 'desc');

        if ($request->filled('form_type')) {
            $query->where('form_type', $request->query('form_type'));
        }

        $submissions = $query->get()->map(fn ($s) => $this->formatSubmission($s));

        return response()->json($submissions);
    }

    /**
     * Submit a new form for a project.
     */
    public function store(Request $request, Project $project): JsonResponse
    {
        $request->validate([
            'form_type' => ['required', 'string', 'in:' . implode(',', ProjectFormSubmission::FORM_TYPES)],
            'data'      => ['required', 'array'],
        ]);

        $formType = $request->input('form_type');
        $data = $request->input('data');

        // Per-form-type validation
        $errors = $this->validateFormData($formType, $data);
        if (!empty($errors)) {
            return response()->json(['errors' => $errors], 422);
        }

        $submission = ProjectFormSubmission::create([
            'project_id'   => $project->id,
            'submitted_by' => Auth::id(),
            'form_type'    => $formType,
            'data'         => $data,
            'status'       => 'submitted',
        ]);

        // Side effects
        $this->applySideEffects($project, $submission);

        // Audit log
        $this->audit->logFormSubmission(
            $submission->id,
            $project->id,
            $formType,
            Auth::id()
        );

        return response()->json($this->formatSubmission($submission), 201);
    }

    /**
     * Review/update status of a form submission.
     */
    public function update(Request $request, Project $project, ProjectFormSubmission $submission): JsonResponse
    {
        if ((int) $submission->project_id !== (int) $project->id) {
            return response()->json(['error' => 'Submission does not belong to this project.'], 404);
        }

        $request->validate([
            'status' => ['required', 'string', 'in:' . implode(',', ProjectFormSubmission::STATUSES)],
            'notes'  => ['nullable', 'string', 'max:2000'],
        ]);

        $submission->update([
            'status'      => $request->input('status'),
            'notes'       => $request->input('notes'),
            'reviewed_by' => Auth::id(),
            'reviewed_at' => now(),
        ]);

        // Audit log
        $this->audit->logFormReviewed(
            $submission->id,
            $project->id,
            $submission->form_type,
            $request->input('status'),
            $request->input('notes'),
            Auth::id()
        );

        return response()->json($this->formatSubmission($submission->fresh()));
    }

    /**
     * Validate form-specific data fields.
     */
    private function validateFormData(string $formType, array $data): array
    {
        $errors = [];

        match ($formType) {
            'project_details' => $this->requireFields($data, $errors, [
                'projectName'  => 'Project Name is required.',
                'projectScope' => 'Project Scope is required.',
                'objectives'   => 'Objectives are required.',
                'stakeholders' => 'Stakeholders are required.',
                'startDate'    => 'Start Date is required.',
                'endDate'      => 'End Date is required.',
            ]),
            'project_planning' => $this->requireFields($data, $errors, [
                'planSummary' => 'Plan Summary is required.',
            ]),
            'progress_update' => $this->requireFields($data, $errors, [
                'overallProgress' => 'Overall Progress is required.',
                'completedTasks'  => 'Completed Tasks are required.',
                'upcomingTasks'   => 'Upcoming Tasks are required.',
            ]),
            'issue_risk' => $this->requireFields($data, $errors, [
                'title'       => 'Title is required.',
                'type'        => 'Type is required.',
                'severity'    => 'Severity is required.',
                'description' => 'Description is required.',
            ]),
            'approval_review' => $this->requireFields($data, $errors, [
                'reviewType' => 'Review Type is required.',
                'decision'   => 'Decision is required.',
            ]),
            'completion_handover' => $this->requireFields($data, $errors, [
                'completionSummary' => 'Completion Summary is required.',
                'deliverables'      => 'Deliverables are required.',
            ]),
            'analytics_kpi' => $this->requireFields($data, $errors, [
                'kpiName'     => 'KPI Name is required.',
                'targetValue' => 'Target Value is required.',
                'actualValue' => 'Actual Value is required.',
                'unit'        => 'Unit is required.',
            ]),
            default => null,
        };

        return $errors;
    }

    /**
     * Check that required fields are present and non-empty.
     */
    private function requireFields(array $data, array &$errors, array $fieldMessages): void
    {
        foreach ($fieldMessages as $field => $message) {
            if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
                $errors[$field] = $message;
            }
        }
    }

    /**
     * Apply side effects after a form submission (e.g. update project progress).
     */
    private function applySideEffects(Project $project, ProjectFormSubmission $submission): void
    {
        $data = $submission->data;

        if ($submission->form_type === 'progress_update' && isset($data['overallProgress'])) {
            $project->update(['progress' => (int) $data['overallProgress']]);
        }

        if ($submission->form_type === 'completion_handover' && !empty($data['markComplete'])) {
            $project->update(['status' => 'completed']);
        }
    }

    /**
     * Format a submission for JSON response (snake_case → camelCase).
     */
    private function formatSubmission(ProjectFormSubmission $s): array
    {
        return [
            'id'          => (string) $s->id,
            'projectId'   => (string) $s->project_id,
            'submittedBy' => $s->submitted_by ? (string) $s->submitted_by : null,
            'formType'    => $s->form_type,
            'status'      => $s->status,
            'data'        => $s->data,
            'notes'       => $s->notes,
            'reviewedBy'  => $s->reviewed_by ? (string) $s->reviewed_by : null,
            'reviewedAt'  => $s->reviewed_at?->toISOString(),
            'createdAt'   => $s->created_at?->toISOString(),
            'updatedAt'   => $s->updated_at?->toISOString(),
        ];
    }
}
