<?php

namespace App\Http\Controllers\Api;

use App\Enums\Department;
use App\Http\Controllers\Controller;
use App\Models\Task;
use App\Models\TaskReview;
use App\Services\AuditService;
use App\Services\TaskActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class TaskReviewController extends Controller
{
    public function __construct(
        private AuditService $auditService,
    ) {}

    /**
     * Get reviews for a task.
     * GET /api/tasks/{id}/reviews
     */
    public function index(Task $task): JsonResponse
    {
        $reviews = $task->reviews()
            ->with('reviewer:id,name')
            ->orderBy('review_date', 'desc')
            ->get()
            ->map(fn ($r) => $this->formatReview($r));

        $approvedReview = $task->latestApprovedReview();

        return response()->json([
            'taskId' => (string) $task->id,
            'approvedReview' => $approvedReview ? $this->formatReview($approvedReview) : null,
            'allReviews' => $reviews,
        ]);
    }

    /**
     * Submit a review/approval.
     * POST /api/tasks/{id}/reviews
     */
    public function store(Request $request, Task $task): JsonResponse
    {
        $user = Auth::user();

        // Authorization: Only Managers, Technical, Admin, Accounting can review
        $canReview = $user && in_array($user->department, [
            Department::Admin,
            Department::Manager,
            Department::Technical,
            Department::Accounting,
        ]);

        if (!$canReview) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Only managers and administrators can review tasks.',
            ], 403);
        }

        $data = $request->validate([
            'approval_status' => 'required|in:approved,rejected,revision_requested',
            'comments' => 'nullable|string',
        ]);

        $review = TaskReview::create([
            'task_id' => $task->id,
            'reviewer_id' => $user->id,
            'approval_status' => $data['approval_status'],
            'comments' => $data['comments'],
            'review_date' => now(),
        ]);

        // Update task status based on review
        if ($data['approval_status'] === 'approved') {
            $task->update(['completion_report_status' => 'approved']);
        } elseif ($data['approval_status'] === 'revision_requested') {
            $task->update(['completion_report_status' => 'revision_requested']);
        }

        // Audit log
        $this->auditService->logTaskReviewSubmitted(
            taskId: $task->id,
            reviewerId: $user->id,
            status: $data['approval_status'],
            comments: substr($data['comments'] ?? '', 0, 100)
        );

        // Activity log
        TaskActivityLogger::reviewSubmitted($task->id, $data['approval_status'], $user->name);

        return response()->json([
            'message' => "Task review {$data['approval_status']} successfully",
            'review' => $this->formatReview($review),
        ], 201);
    }

    /**
     * Update a review.
     * PUT /api/tasks/{id}/reviews/{reviewId}
     */
    public function update(Request $request, Task $task, TaskReview $review): JsonResponse
    {
        $user = Auth::user();

        // Authorization: Only the reviewer or admin can update
        if ($user->id !== $review->reviewer_id && $user->department !== Department::Admin) {
            return response()->json([
                'error' => 'Forbidden',
                'message' => 'Only the reviewer can update this review.',
            ], 403);
        }

        $data = $request->validate([
            'approval_status' => 'sometimes|in:approved,rejected,revision_requested',
            'comments' => 'nullable|string',
        ]);

        $oldStatus = $review->approval_status;
        $review->update($data);

        // Update task status if approval status changed
        if (isset($data['approval_status'])) {
            if ($data['approval_status'] === 'approved') {
                $task->update(['completion_report_status' => 'approved']);
            } elseif ($data['approval_status'] === 'revision_requested') {
                $task->update(['completion_report_status' => 'revision_requested']);
            }
        }

        // Audit log
        if (isset($data['approval_status'])) {
            $this->auditService->logTaskReviewSubmitted(
                taskId: $task->id,
                reviewerId: $user->id,
                status: $data['approval_status'],
                note: "Updated from {$oldStatus}"
            );
        }

        return response()->json([
            'message' => 'Review updated successfully',
            'review' => $this->formatReview($review),
        ]);
    }

    /**
     * Format review for response.
     */
    private function formatReview(TaskReview $r): array
    {
        return [
            'id' => (string) $r->id,
            'taskId' => (string) $r->task_id,
            'reviewerId' => (string) $r->reviewer_id,
            'reviewerName' => $r->reviewer?->name ?? null,
            'approvalStatus' => $r->approval_status,
            'comments' => $r->comments ?? '',
            'reviewDate' => $r->review_date?->toIso8601String(),
            'createdAt' => $r->created_at?->toIso8601String(),
        ];
    }
}
