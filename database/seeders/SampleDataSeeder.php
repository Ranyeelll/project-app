<?php

namespace Database\Seeders;

use App\Models\BudgetRequest;
use App\Models\Issue;
use App\Models\Media;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskComment;
use App\Models\TaskProgressLog;
use App\Models\TaskTimeLog;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SampleDataSeeder extends Seeder
{
    public function run(): void
    {
        // ── Users (expand on existing seed) ──
        $users = [
            ['name' => 'Alex Rivera', 'email' => 'admin@maptech.com', 'password' => Hash::make('admin123'), 'role' => 'superadmin', 'department' => 'Admin', 'position' => 'Project Manager', 'status' => 'active'],
            ['name' => 'Patricia Lim', 'email' => 'supervisor@maptech.com', 'password' => Hash::make('sup123'), 'role' => 'supervisor', 'department' => 'Admin', 'position' => 'Operations Supervisor', 'status' => 'active'],
            ['name' => 'Rose Tan', 'email' => 'accounting@maptech.com', 'password' => Hash::make('acc123'), 'role' => 'employee', 'department' => 'Accounting', 'position' => 'Finance Officer', 'status' => 'active'],
            ['name' => 'Lena Gomez', 'email' => 'accounting2@maptech.com', 'password' => Hash::make('acc123'), 'role' => 'employee', 'department' => 'Accounting', 'position' => 'Accounting Clerk', 'status' => 'active'],
            ['name' => 'Maria Santos', 'email' => 'employee@maptech.com', 'password' => Hash::make('emp123'), 'role' => 'employee', 'department' => 'Technical', 'position' => 'Senior Developer', 'status' => 'active'],
            ['name' => 'James Reyes', 'email' => 'james@maptech.com', 'password' => Hash::make('emp123'), 'role' => 'employee', 'department' => 'Technical', 'position' => 'UI/UX Designer', 'status' => 'active'],
            ['name' => 'Clara Mendoza', 'email' => 'clara@maptech.com', 'password' => Hash::make('emp123'), 'role' => 'employee', 'department' => 'Technical', 'position' => 'QA Engineer', 'status' => 'active'],
            ['name' => 'Daniel Cruz', 'email' => 'daniel@maptech.com', 'password' => Hash::make('emp123'), 'role' => 'employee', 'department' => 'Technical', 'position' => 'Backend Developer', 'status' => 'active'],
            ['name' => 'Marco Villanueva', 'email' => 'marco@maptech.com', 'password' => Hash::make('emp123'), 'role' => 'employee', 'department' => 'Employee', 'position' => 'Field IT Technician', 'status' => 'active'],
            ['name' => 'Jhon Dela Cruz', 'email' => 'jhon@maptech.com', 'password' => Hash::make('emp123'), 'role' => 'employee', 'department' => 'Employee', 'position' => 'IT Support Specialist', 'status' => 'active'],
        ];

        $userModels = [];
        foreach ($users as $u) {
            $userModels[] = User::updateOrCreate(['email' => $u['email']], $u);
        }

        $admin = $userModels[0];       // superadmin
        $supervisor = $userModels[1];   // supervisor
        $accounting = $userModels[2];   // accounting
        $maria = $userModels[4];        // technical - senior dev
        $james = $userModels[5];        // technical - UI/UX
        $clara = $userModels[6];        // technical - QA
        $daniel = $userModels[7];       // technical - backend dev
        $marco = $userModels[8];        // employee - field tech
        $jhon = $userModels[9];         // employee - IT support

        // ── Projects (Maptech Information Solutions engagements) ──
        $projects = [
            [
                'name' => 'LGU Naga - Records Management System',
                'description' => 'Development of a digital records management system for the Local Government Unit of Naga City. Includes document digitization, searchable archive, role-based access, and integration with existing e-Government portal.',
                'status' => 'active',
                'priority' => 'high',
                'category' => 'development',
                'risk_level' => 'medium',
                'start_date' => '2026-03-01',
                'end_date' => '2026-09-30',
                'budget' => 850000.00,
                'spent' => 180000.00,
                'progress' => 35,
                'approval_status' => 'approved',
                'manager_id' => $admin->id,
                'project_leader_id' => $supervisor->id,
                'submitted_by' => $admin->id,
                'reviewed_by' => $admin->id,
                'team_ids' => [$maria->id, $james->id, $daniel->id, $clara->id],
            ],
            [
                'name' => 'BPO Client - Network Infrastructure Upgrade',
                'description' => 'Complete network infrastructure upgrade for a BPO client in Cebu IT Park. Covers structured cabling (Cat6A), Cisco switch deployment, firewall configuration, VLAN segmentation, and VPN setup for 200 workstations.',
                'status' => 'active',
                'priority' => 'critical',
                'category' => 'infrastructure',
                'risk_level' => 'high',
                'start_date' => '2026-02-15',
                'end_date' => '2026-06-30',
                'budget' => 1200000.00,
                'spent' => 450000.00,
                'progress' => 50,
                'approval_status' => 'approved',
                'manager_id' => $admin->id,
                'project_leader_id' => $supervisor->id,
                'submitted_by' => $maria->id,
                'reviewed_by' => $admin->id,
                'team_ids' => [$daniel->id, $marco->id, $jhon->id],
            ],
            [
                'name' => 'Provincial Hospital - Patient Portal Development',
                'description' => 'Web-based patient portal for a provincial hospital enabling online appointment scheduling, lab results viewing, medical record access, and telemedicine integration. Responsive design for mobile access.',
                'status' => 'active',
                'priority' => 'medium',
                'category' => 'development',
                'risk_level' => 'low',
                'start_date' => '2026-04-01',
                'end_date' => '2026-12-31',
                'budget' => 650000.00,
                'spent' => 55000.00,
                'progress' => 15,
                'approval_status' => 'approved',
                'manager_id' => $admin->id,
                'project_leader_id' => $supervisor->id,
                'submitted_by' => $admin->id,
                'reviewed_by' => $admin->id,
                'team_ids' => [$maria->id, $james->id, $clara->id],
            ],
            [
                'name' => 'Cooperative - POS and Inventory System',
                'description' => 'Point-of-sale and inventory management system for a multi-branch cooperative. Includes barcode scanning, real-time stock tracking, sales reporting, member discount management, and cloud sync across 5 branches.',
                'status' => 'on-hold',
                'priority' => 'medium',
                'category' => 'development',
                'risk_level' => 'low',
                'start_date' => '2026-06-01',
                'end_date' => '2026-10-31',
                'budget' => 480000.00,
                'spent' => 0.00,
                'progress' => 0,
                'approval_status' => 'supervisor_review',
                'manager_id' => $admin->id,
                'submitted_by' => $maria->id,
                'team_ids' => [$daniel->id, $james->id],
            ],
            [
                'name' => 'School District - IT Equipment Deployment',
                'description' => 'Deployment of 120 desktop computers, 15 printers, and LAN setup across 8 public schools in the district. Includes OS imaging, software installation, teacher training, and 1-year maintenance contract.',
                'status' => 'completed',
                'priority' => 'high',
                'category' => 'infrastructure',
                'risk_level' => 'medium',
                'start_date' => '2025-10-01',
                'end_date' => '2026-03-15',
                'budget' => 2800000.00,
                'spent' => 2650000.00,
                'progress' => 100,
                'approval_status' => 'approved',
                'manager_id' => $admin->id,
                'project_leader_id' => $supervisor->id,
                'submitted_by' => $admin->id,
                'reviewed_by' => $admin->id,
                'team_ids' => [$marco->id, $jhon->id, $clara->id],
            ],
        ];

        $projectModels = [];
        foreach ($projects as $p) {
            $teamIds = $p['team_ids'] ?? [];
            unset($p['team_ids']);
            $p['team_ids'] = $teamIds;

            // Generate serial if not doing updateOrCreate match
            $year = date('Y');
            $p['serial'] = "MAP-{$year}-" . str_pad((string) random_int(0, 9999999999), 10, '0', STR_PAD_LEFT);

            $existing = Project::where('name', $p['name'])->first();
            if ($existing) {
                unset($p['serial']); // keep existing serial
                $existing->update($p);
                $project = $existing;
            } else {
                $project = Project::create($p);
            }

            $projectModels[] = $project;
        }

        [$lgu, $bpo, $hospital, $coop, $school] = $projectModels;

        // ── Tasks ──
        $allTasks = [
            // LGU Records Management System tasks
            ['project' => $lgu, 'title' => 'Requirements gathering and stakeholder interviews', 'status' => 'completed', 'priority' => 'high', 'assigned_to' => $maria->id, 'start_date' => '2026-03-01', 'end_date' => '2026-03-15', 'progress' => 100, 'estimated_hours' => 40, 'logged_hours' => 38],
            ['project' => $lgu, 'title' => 'Database schema design and API architecture', 'status' => 'completed', 'priority' => 'high', 'assigned_to' => $daniel->id, 'start_date' => '2026-03-10', 'end_date' => '2026-03-25', 'progress' => 100, 'estimated_hours' => 50, 'logged_hours' => 45],
            ['project' => $lgu, 'title' => 'UI/UX wireframes and design mockups', 'status' => 'in-progress', 'priority' => 'high', 'assigned_to' => $james->id, 'start_date' => '2026-03-20', 'end_date' => '2026-04-20', 'progress' => 65, 'estimated_hours' => 60, 'logged_hours' => 35],
            ['project' => $lgu, 'title' => 'Backend API development (CRUD + search)', 'status' => 'in-progress', 'priority' => 'high', 'assigned_to' => $daniel->id, 'start_date' => '2026-04-01', 'end_date' => '2026-05-15', 'progress' => 30, 'estimated_hours' => 100, 'logged_hours' => 24],
            ['project' => $lgu, 'title' => 'Frontend development and responsive layout', 'status' => 'todo', 'priority' => 'critical', 'assigned_to' => $maria->id, 'start_date' => '2026-05-01', 'end_date' => '2026-07-15', 'progress' => 0, 'estimated_hours' => 120, 'logged_hours' => 0],
            ['project' => $lgu, 'title' => 'QA testing and UAT with LGU staff', 'status' => 'todo', 'priority' => 'medium', 'assigned_to' => $clara->id, 'start_date' => '2026-07-15', 'end_date' => '2026-08-30', 'progress' => 0, 'estimated_hours' => 40, 'logged_hours' => 0],

            // BPO Network Infrastructure tasks
            ['project' => $bpo, 'title' => 'Site survey and network topology design', 'status' => 'completed', 'priority' => 'critical', 'assigned_to' => $marco->id, 'start_date' => '2026-02-15', 'end_date' => '2026-03-05', 'progress' => 100, 'estimated_hours' => 30, 'logged_hours' => 28],
            ['project' => $bpo, 'title' => 'Procurement of Cisco switches, firewall, and cabling', 'status' => 'completed', 'priority' => 'high', 'assigned_to' => $jhon->id, 'start_date' => '2026-03-01', 'end_date' => '2026-03-20', 'progress' => 100, 'estimated_hours' => 20, 'logged_hours' => 18],
            ['project' => $bpo, 'title' => 'Structured cabling installation (Cat6A)', 'status' => 'in-progress', 'priority' => 'high', 'assigned_to' => $marco->id, 'start_date' => '2026-03-15', 'end_date' => '2026-04-30', 'progress' => 70, 'estimated_hours' => 80, 'logged_hours' => 52],
            ['project' => $bpo, 'title' => 'Switch rack setup and VLAN configuration', 'status' => 'in-progress', 'priority' => 'critical', 'assigned_to' => $jhon->id, 'start_date' => '2026-04-01', 'end_date' => '2026-05-01', 'progress' => 40, 'estimated_hours' => 60, 'logged_hours' => 20],
            ['project' => $bpo, 'title' => 'Firewall rules and VPN tunnel setup', 'status' => 'todo', 'priority' => 'high', 'assigned_to' => $daniel->id, 'start_date' => '2026-05-01', 'end_date' => '2026-05-20', 'progress' => 0, 'estimated_hours' => 40, 'logged_hours' => 0],
            ['project' => $bpo, 'title' => 'Workstation connectivity testing (200 units)', 'status' => 'todo', 'priority' => 'medium', 'assigned_to' => $marco->id, 'start_date' => '2026-05-15', 'end_date' => '2026-06-15', 'progress' => 0, 'estimated_hours' => 60, 'logged_hours' => 0],

            // Hospital Patient Portal tasks
            ['project' => $hospital, 'title' => 'Patient portal wireframes and user flow design', 'status' => 'completed', 'priority' => 'high', 'assigned_to' => $james->id, 'start_date' => '2026-04-01', 'end_date' => '2026-04-18', 'progress' => 100, 'estimated_hours' => 40, 'logged_hours' => 36],
            ['project' => $hospital, 'title' => 'Backend API for appointments and records', 'status' => 'in-progress', 'priority' => 'critical', 'assigned_to' => $maria->id, 'start_date' => '2026-04-15', 'end_date' => '2026-06-30', 'progress' => 20, 'estimated_hours' => 120, 'logged_hours' => 18],
            ['project' => $hospital, 'title' => 'Frontend responsive web app development', 'status' => 'todo', 'priority' => 'high', 'assigned_to' => $james->id, 'start_date' => '2026-06-01', 'end_date' => '2026-09-30', 'progress' => 0, 'estimated_hours' => 140, 'logged_hours' => 0],
            ['project' => $hospital, 'title' => 'Security audit and HIPAA compliance review', 'status' => 'todo', 'priority' => 'medium', 'assigned_to' => $clara->id, 'start_date' => '2026-09-01', 'end_date' => '2026-11-30', 'progress' => 0, 'estimated_hours' => 60, 'logged_hours' => 0],

            // Cooperative POS System tasks
            ['project' => $coop, 'title' => 'Business process analysis and requirements doc', 'status' => 'completed', 'priority' => 'high', 'assigned_to' => $maria->id, 'start_date' => '2026-05-01', 'end_date' => '2026-05-20', 'progress' => 100, 'estimated_hours' => 30, 'logged_hours' => 28],
            ['project' => $coop, 'title' => 'POS module UI design and prototyping', 'status' => 'todo', 'priority' => 'medium', 'assigned_to' => $james->id, 'start_date' => '2026-06-01', 'end_date' => '2026-06-25', 'progress' => 0, 'estimated_hours' => 40, 'logged_hours' => 0],

            // School IT Deployment tasks (all completed)
            ['project' => $school, 'title' => 'Hardware inventory and procurement coordination', 'status' => 'completed', 'priority' => 'high', 'assigned_to' => $jhon->id, 'start_date' => '2025-10-01', 'end_date' => '2025-10-20', 'progress' => 100, 'estimated_hours' => 30, 'logged_hours' => 32],
            ['project' => $school, 'title' => 'OS imaging and software batch installation', 'status' => 'completed', 'priority' => 'critical', 'assigned_to' => $marco->id, 'start_date' => '2025-10-15', 'end_date' => '2025-12-15', 'progress' => 100, 'estimated_hours' => 80, 'logged_hours' => 85],
            ['project' => $school, 'title' => 'LAN setup and cabling for 8 schools', 'status' => 'completed', 'priority' => 'high', 'assigned_to' => $jhon->id, 'start_date' => '2025-11-01', 'end_date' => '2026-01-31', 'progress' => 100, 'estimated_hours' => 120, 'logged_hours' => 115],
            ['project' => $school, 'title' => 'Teacher ICT training and handover', 'status' => 'completed', 'priority' => 'medium', 'assigned_to' => $clara->id, 'start_date' => '2026-02-01', 'end_date' => '2026-03-15', 'progress' => 100, 'estimated_hours' => 60, 'logged_hours' => 55],
        ];

        $taskModels = [];
        foreach ($allTasks as $t) {
            $project = $t['project'];
            unset($t['project']);
            $t['project_id'] = $project->id;
            $task = Task::updateOrCreate(
                ['project_id' => $t['project_id'], 'title' => $t['title']],
                $t
            );
            $taskModels[] = $task;
        }

        // ── Budget Requests ──
        $budgets = [
            ['project_id' => $lgu->id, 'requested_by' => $maria->id, 'amount' => 45000.00, 'type' => 'spending', 'purpose' => 'Cloud hosting setup (AWS) - 1 year prepaid for staging and production servers', 'status' => 'approved'],
            ['project_id' => $lgu->id, 'requested_by' => $daniel->id, 'amount' => 35000.00, 'type' => 'spending', 'purpose' => 'Development tools and licenses - JetBrains, Figma Pro, and Postman Team', 'status' => 'accounting_approved'],
            ['project_id' => $lgu->id, 'requested_by' => $admin->id, 'amount' => 80000.00, 'type' => 'additional_budget', 'purpose' => 'Additional budget for document scanning hardware (2 high-speed scanners for LGU office)', 'status' => 'pending'],
            ['project_id' => $bpo->id, 'requested_by' => $marco->id, 'amount' => 280000.00, 'type' => 'spending', 'purpose' => 'Cisco Catalyst 9200 switches (4 units) and SFP modules for server room', 'status' => 'approved'],
            ['project_id' => $bpo->id, 'requested_by' => $jhon->id, 'amount' => 120000.00, 'type' => 'spending', 'purpose' => 'FortiGate 60F firewall appliance with 3-year UTM license', 'status' => 'supervisor_approved'],
            ['project_id' => $bpo->id, 'requested_by' => $marco->id, 'amount' => 55000.00, 'type' => 'spending', 'purpose' => 'Cat6A cabling bulk purchase (50 boxes) and patch panels', 'status' => 'pending'],
            ['project_id' => $hospital->id, 'requested_by' => $james->id, 'amount' => 25000.00, 'type' => 'spending', 'purpose' => 'UI prototyping tools and stock medical icon library subscription', 'status' => 'approved'],
            ['project_id' => $hospital->id, 'requested_by' => $maria->id, 'amount' => 30000.00, 'type' => 'spending', 'purpose' => 'SSL certificate (wildcard) and HIPAA compliance assessment fee', 'status' => 'pending'],
            ['project_id' => $school->id, 'requested_by' => $jhon->id, 'amount' => 1800000.00, 'type' => 'spending', 'purpose' => 'Desktop computers (120 units) - Lenovo ThinkCentre M70q with monitors', 'status' => 'approved'],
            ['project_id' => $school->id, 'requested_by' => $marco->id, 'amount' => 850000.00, 'type' => 'spending', 'purpose' => 'Network equipment, UPS units, printers, and cabling for 8 school sites', 'status' => 'approved'],
        ];

        foreach ($budgets as $b) {
            BudgetRequest::updateOrCreate(
                ['project_id' => $b['project_id'], 'purpose' => $b['purpose']],
                $b
            );
        }

        // ── Issues ──
        $issues = [
            ['project_id' => $lgu->id, 'title' => 'LGU legacy data in mixed formats', 'description' => 'Existing records are a mix of scanned PDFs, Word docs, and handwritten forms. Need to define a standardized import pipeline before the digitization module can proceed.', 'type' => 'issue', 'severity' => 'high', 'status' => 'in-progress', 'reported_by' => $daniel->id, 'assigned_to' => $maria->id],
            ['project_id' => $lgu->id, 'title' => 'Client requesting additional module for permits', 'description' => 'LGU stakeholder is requesting a business permits tracking module not in the original SOW. May need a change order or phase 2 scope.', 'type' => 'risk', 'severity' => 'medium', 'status' => 'open', 'reported_by' => $maria->id],
            ['project_id' => $bpo->id, 'title' => 'Building management restricting work hours', 'description' => 'IT Park building management only allows cabling work from 10PM-6AM on weekdays. This limits our installation window and may delay the cabling phase by 1 week.', 'type' => 'issue', 'severity' => 'high', 'status' => 'open', 'reported_by' => $marco->id, 'assigned_to' => $jhon->id],
            ['project_id' => $bpo->id, 'title' => 'ISP handoff coordination needed', 'description' => 'Need to coordinate with PLDT and Globe for dual ISP handoff to the new firewall. Requires scheduling a joint turnover date.', 'type' => 'dependency', 'severity' => 'medium', 'status' => 'resolved', 'reported_by' => $jhon->id],
            ['project_id' => $hospital->id, 'title' => 'Patient data privacy compliance requirements', 'description' => 'Hospital IT head flagged that the portal must comply with Data Privacy Act of 2012 (RA 10173). Need to add consent forms, data retention policy, and audit trail to the spec.', 'type' => 'risk', 'severity' => 'low', 'status' => 'open', 'reported_by' => $james->id],
            ['project_id' => $school->id, 'title' => 'Power outlet shortage in 2 schools', 'description' => 'Schools 5 and 7 have insufficient power outlets for the computer lab setup. Electrical work completed by school maintenance team. Issue resolved.', 'type' => 'issue', 'severity' => 'low', 'status' => 'closed', 'reported_by' => $marco->id, 'assigned_to' => $jhon->id],
        ];

        foreach ($issues as $i) {
            Issue::updateOrCreate(
                ['project_id' => $i['project_id'], 'title' => $i['title']],
                $i
            );
        }

        // ── Time Logs (sample entries for tasks with logged hours) ──
        $timeLogs = [];
        foreach ($taskModels as $task) {
            if ($task->logged_hours > 0 && $task->assigned_to) {
                $remaining = (float) $task->logged_hours;
                $date = new \DateTime($task->start_date ?? '2026-03-01');
                $descriptions = [
                    'Development work and code review',
                    'Testing, debugging, and documentation',
                    'Client coordination and requirement refinement',
                    'System configuration and deployment tasks',
                    'Research, prototyping, and technical analysis',
                ];
                $descIdx = 0;
                while ($remaining > 0) {
                    $hours = min($remaining, round(rand(4, 8) + rand(0, 1) * 0.5, 1));
                    $timeLogs[] = [
                        'task_id' => $task->id,
                        'user_id' => $task->assigned_to,
                        'date_worked' => $date->format('Y-m-d'),
                        'hours_worked' => $hours,
                        'work_description' => $descriptions[$descIdx % count($descriptions)],
                    ];
                    $remaining -= $hours;
                    $date->modify('+1 weekday');
                    $descIdx++;
                }
            }
        }

        foreach ($timeLogs as $tl) {
            TaskTimeLog::updateOrCreate(
                ['task_id' => $tl['task_id'], 'user_id' => $tl['user_id'], 'date_worked' => $tl['date_worked']],
                $tl
            );
        }

        // ── Task Comments (on in-progress and completed tasks) ──
        $commentData = [
            [$taskModels[2], $james->id, 'Wireframes for the document search and archive modules are done. Uploading to Figma for review.'],
            [$taskModels[2], $admin->id, 'Looks good. Please make sure the responsive breakpoints work on the LGU\'s tablets — they use Samsung Tab A7.'],
            [$taskModels[3], $daniel->id, 'API for document CRUD and full-text search is working. Using PostgreSQL tsvector for indexing.'],
            [$taskModels[8], $marco->id, 'Floor 2 cabling done — 48 drops terminated and tested. Moving to Floor 3 tomorrow.'],
            [$taskModels[8], $jhon->id, 'Noted. I\'ll prep the patch panel labels for Floor 3 tonight.'],
            [$taskModels[9], $jhon->id, 'Core switch racked and powered on. Starting VLAN config for voice and data separation.'],
            [$taskModels[13], $maria->id, 'Appointment booking API is live on staging. Working on the lab results module next.'],
            [$taskModels[13], $james->id, 'Can you add a webhook for appointment confirmation? The hospital wants SMS notifications via their gateway.'],
        ];

        foreach ($commentData as [$task, $userId, $body]) {
            TaskComment::updateOrCreate(
                ['task_id' => $task->id, 'user_id' => $userId, 'body' => $body],
                ['task_id' => $task->id, 'user_id' => $userId, 'body' => $body]
            );
        }

        // ── Task Progress Logs (for in-progress tasks) ──
        $progressData = [
            [$taskModels[2], $james->id, 30, 'Dashboard and login page wireframes completed'],
            [$taskModels[2], $james->id, 65, 'Document management and search UI mockups in progress'],
            [$taskModels[3], $daniel->id, 15, 'Database models and migrations created, basic CRUD routes working'],
            [$taskModels[3], $daniel->id, 30, 'Full-text search with PostgreSQL tsvector implemented and tested'],
            [$taskModels[8], $marco->id, 40, 'Floor 1 and 2 cabling complete — 96 drops total'],
            [$taskModels[8], $marco->id, 70, 'Floor 3 cabling in progress, halfway done'],
            [$taskModels[9], $jhon->id, 20, 'Core switch installed and initial config loaded'],
            [$taskModels[9], $jhon->id, 40, 'VLANs for data, voice, and management configured'],
            [$taskModels[13], $maria->id, 10, 'Database schema designed for patients, appointments, and records'],
            [$taskModels[13], $maria->id, 20, 'Appointment booking and cancellation API endpoints working'],
        ];

        foreach ($progressData as [$task, $userId, $pct, $desc]) {
            TaskProgressLog::updateOrCreate(
                ['task_id' => $task->id, 'user_id' => $userId, 'percentage_completed' => $pct],
                ['task_id' => $task->id, 'user_id' => $userId, 'percentage_completed' => $pct, 'work_description' => $desc]
            );
        }

        // ── Media / Reports (text reports only — no actual files) ──
        $mediaItems = [
            ['project_id' => $lgu->id, 'task_id' => $taskModels[0]->id, 'uploaded_by' => $maria->id, 'type' => 'text', 'title' => 'LGU Requirements Specification Document', 'content' => "LGU Naga - Records Management System\nRequirements Specification v1.2\n\nModule 1: Document Repository\n- Upload/scan documents (PDF, DOCX, images)\n- OCR for scanned documents\n- Metadata tagging (type, date, department)\n- Full-text search across all documents\n\nModule 2: Access Control\n- Role-based permissions (admin, clerk, viewer)\n- Department-level document isolation\n- Audit trail for all document access\n\nModule 3: Reports\n- Document statistics dashboard\n- Monthly digitization progress report\n- Access log reports\n\nNon-functional: Must run on LGU's existing servers (Ubuntu 22.04, 16GB RAM)."],
            ['project_id' => $lgu->id, 'uploaded_by' => $daniel->id, 'type' => 'text', 'title' => 'Database Schema Design Notes', 'content' => "Records Management System - Database Design\n\nTables:\n- documents (id, title, type, content_text, file_path, department_id, uploaded_by, created_at)\n- document_metadata (id, document_id, key, value)\n- departments (id, name, code)\n- access_logs (id, document_id, user_id, action, accessed_at)\n\nIndexes:\n- GIN index on documents.content_text for full-text search\n- B-tree on document_metadata(key, value) for filtered queries\n- Composite index on access_logs(document_id, accessed_at)\n\nEstimated capacity: 500,000 documents over 5 years."],
            ['project_id' => $bpo->id, 'uploaded_by' => $marco->id, 'type' => 'text', 'title' => 'Network Topology Design Document', 'content' => "BPO Client - Network Infrastructure\nTopology Design v2.0\n\nNetwork Zones:\n- Core: 2x Cisco Catalyst 9200 (stacked) in server room\n- Distribution: 2x Cisco Catalyst 9200 per floor\n- Access: 200 workstation drops (Cat6A)\n\nVLAN Plan:\n- VLAN 10: Data (workstations) - 10.10.10.0/24\n- VLAN 20: Voice (IP phones) - 10.10.20.0/24\n- VLAN 30: Management - 10.10.30.0/24\n- VLAN 40: Guest WiFi - 10.10.40.0/24\n\nSecurity:\n- FortiGate 60F at perimeter\n- Dual ISP (PLDT Fibr + Globe Business)\n- SD-WAN for automatic failover\n- Site-to-site VPN to client HQ in Makati"],
            ['project_id' => $bpo->id, 'uploaded_by' => $jhon->id, 'type' => 'text', 'title' => 'Equipment Procurement Checklist', 'content' => "Procurement Status:\n\n✅ Cisco Catalyst 9200-48P (4 units) — Delivered\n✅ FortiGate 60F — Delivered\n✅ Cat6A Cable boxes (50 boxes, 305m each) — Delivered\n✅ Patch panels 48-port (8 units) — Delivered\n✅ Server rack 42U (2 units) — Delivered\n⬜ SFP+ modules (8 units) — In transit, ETA April 20\n⬜ UPS 3kVA (2 units) — Ordered, ETA April 25\n✅ Cable tester Fluke DTX-1800 — Rented\n\nTotal procurement: ₱455,000 of ₱500,000 budget"],
            ['project_id' => $school->id, 'uploaded_by' => $clara->id, 'type' => 'text', 'title' => 'Deployment Completion Report', 'content' => "School District IT Equipment Deployment\nFinal Report - March 15, 2026\n\nDeployment Summary:\n- 120 desktops deployed across 8 schools (15 per school)\n- 15 printers installed (1 staff room + 1 computer lab each)\n- LAN with managed switches in all 8 schools\n- Windows 11 Education + MS Office 2024 + educational software\n\nTraining Conducted:\n- 3-day ICT training for 48 teachers (6 per school)\n- Topics: Basic computer ops, Office suite, internet safety, LMS usage\n- Training satisfaction: 4.6/5.0 average rating\n\nMaintenance:\n- 1-year on-site support contract active\n- Remote monitoring via NinjaRMM agent installed\n- Monthly preventive maintenance schedule set\n\nProject Status: COMPLETED on schedule and under budget (₱2,650,000 of ₱2,800,000)"],
        ];

        foreach ($mediaItems as $m) {
            Media::updateOrCreate(
                ['project_id' => $m['project_id'], 'title' => $m['title']],
                $m
            );
        }

        $this->command->info('Sample data seeded successfully!');
        $this->command->info('Accounts:');
        $this->command->info('  Superadmin: admin@maptech.com / admin123');
        $this->command->info('  Supervisor: supervisor@maptech.com / sup123');
        $this->command->info('  Accounting: accounting@maptech.com / acc123');
        $this->command->info('  Technical:  employee@maptech.com / emp123');
        $this->command->info('  Employee:   marco@maptech.com / emp123');
    }
}
