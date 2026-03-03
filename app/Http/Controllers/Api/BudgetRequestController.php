<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetRequestController extends Controller
{
    /**
     * List all budget requests.
     */
    public function index(Request $request): JsonResponse
    {
        $query = BudgetRequest::query();

        if ($request->has('project_id')) {
            $query->where('project_id', $request->input('project_id'));
        }

        if ($request->has('requested_by')) {
            $query->where('requested_by', $request->input('requested_by'));
        }

        $items = $query->orderByDesc('created_at')
            ->get()
            ->map(fn ($b) => $this->formatBudgetRequest($b));

        return response()->json($items);
    }

    /**
     * Create a new budget request.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'project_id'   => 'required|exists:projects,id',
            'requested_by' => 'required|exists:users,id',
            'amount'       => 'required|numeric|min:0',
            'purpose'      => 'required|string',
            'attachment'   => 'nullable|string',
        ]);

        $item = BudgetRequest::create(array_merge($data, [
            'status' => 'pending',
        ]));

        return response()->json($this->formatBudgetRequest($item), 201);
    }

    /**
     * Update a budget request (edit by employee or review by admin).
     */
    public function update(Request $request, BudgetRequest $budget_request): JsonResponse
    {
        $data = $request->validate([
            'project_id'     => 'sometimes|exists:projects,id',
            'amount'         => 'sometimes|numeric|min:0',
            'purpose'        => 'sometimes|string',
            'status'         => 'sometimes|in:pending,approved,rejected',
            'review_comment' => 'nullable|string',
            'attachment'     => 'nullable|string',
        ]);

        // If status is being changed to approved/rejected, set reviewed_at
        if (isset($data['status']) && in_array($data['status'], ['approved', 'rejected'])) {
            $data['reviewed_at'] = now();
        }

        $budget_request->update($data);

        return response()->json($this->formatBudgetRequest($budget_request->fresh()));
    }

    /**
     * Delete a budget request.
     */
    public function destroy(BudgetRequest $budget_request): JsonResponse
    {
        $budget_request->delete();

        return response()->json(['message' => 'Budget request deleted']);
    }

    /**
     * Format for frontend (camelCase).
     */
    private function formatBudgetRequest(BudgetRequest $b): array
    {
        return [
            'id'            => (string) $b->id,
            'projectId'     => (string) $b->project_id,
            'requestedBy'   => (string) $b->requested_by,
            'amount'        => (float) $b->amount,
            'purpose'       => $b->purpose,
            'status'        => $b->status,
            'createdAt'     => $b->created_at?->toDateString() ?? '',
            'reviewedAt'    => $b->reviewed_at?->toDateString() ?? '',
            'reviewComment' => $b->review_comment ?? '',
            'attachment'    => $b->attachment ?? '',
        ];
    }
}
