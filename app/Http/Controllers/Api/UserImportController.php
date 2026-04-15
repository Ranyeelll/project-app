<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class UserImportController extends Controller
{
    /**
     * Import users from a CSV file.
     * Expected columns: name, email, department, role, position
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:5120',
        ]);

        $file = $request->file('file');
        $content = file_get_contents($file->getRealPath());
        $lines = array_filter(explode("\n", $content), fn ($l) => trim($l) !== '');

        if (count($lines) < 2) {
            return response()->json(['error' => 'CSV must have a header and at least one data row'], 422);
        }

        $header = str_getcsv(array_shift($lines));
        $header = array_map(fn ($h) => strtolower(trim($h)), $header);

        $requiredCols = ['name', 'email', 'department', 'role'];
        foreach ($requiredCols as $col) {
            if (!in_array($col, $header)) {
                return response()->json(['error' => "Missing required column: {$col}"], 422);
            }
        }

        $imported = 0;
        $skipped = 0;
        $errors = [];

        foreach ($lines as $lineNum => $line) {
            $row = str_getcsv($line);
            if (count($row) !== count($header)) {
                $errors[] = "Line " . ($lineNum + 2) . ": column count mismatch";
                $skipped++;
                continue;
            }

            $data = array_combine($header, $row);

            $validator = Validator::make($data, [
                'name' => 'required|string|max:255',
                'email' => 'required|email|unique:users,email',
                'department' => 'required|string|in:Admin,Technical,Accounting,Employee',
                'role' => 'required|string|in:superadmin,supervisor,admin,employee',
            ]);

            if ($validator->fails()) {
                $errors[] = "Line " . ($lineNum + 2) . ": " . implode(', ', $validator->errors()->all());
                $skipped++;
                continue;
            }

            $password = Str::random(12);

            User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($password),
                'department' => $data['department'],
                'role' => $data['role'],
                'position' => $data['position'] ?? '',
                'status' => 'active',
                'must_change_password' => true,
            ]);

            $imported++;
        }

        return response()->json([
            'message' => "{$imported} users imported, {$skipped} skipped",
            'imported' => $imported,
            'skipped' => $skipped,
            'errors' => $errors,
        ]);
    }
}
