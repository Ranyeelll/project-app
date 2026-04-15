<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetRequest;
use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BudgetVarianceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $projects = Project::all();

        $variance = $projects->map(function ($project) {
            $budget = (float) $project->budget;
            $spent = (float) $project->spent;
            $variance = $budget - $spent;
            $variancePct = $budget > 0 ? round(($variance / $budget) * 100, 1) : 0;

            // Calculate burn rate (spent per day)
            $startDate = $project->start_date ? new \DateTime($project->start_date) : null;
            $now = new \DateTime();
            $daysElapsed = $startDate ? max(1, (int) $startDate->diff($now)->days) : 1;
            $burnRate = round($spent / $daysElapsed, 2);

            // Calculate projected total cost
            $endDate = $project->end_date ? new \DateTime($project->end_date) : null;
            $totalDays = $startDate && $endDate ? max(1, (int) $startDate->diff($endDate)->days) : $daysElapsed;
            $projectedTotal = round($burnRate * $totalDays, 2);

            return [
                'projectId' => (string) $project->id,
                'projectName' => $project->name,
                'budget' => $budget,
                'spent' => $spent,
                'variance' => round($variance, 2),
                'variancePercent' => $variancePct,
                'burnRate' => $burnRate,
                'projectedTotal' => $projectedTotal,
                'status' => $variancePct >= 20 ? 'healthy' : ($variancePct >= 0 ? 'warning' : 'over-budget'),
            ];
        });

        return response()->json($variance->values());
    }
}
