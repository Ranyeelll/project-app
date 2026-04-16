export type UserRole = 'superadmin' | 'supervisor' | 'employee' | 'admin';
export type Department = 'Admin' | 'Accounting' | 'Technical' | 'Employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  department: Department | string;
  position: string;
  status: 'active' | 'inactive';
  joinDate: string;
  profilePhoto?: string | null;
  mustChangePassword?: boolean;
}

export interface Project {
  id: string;
  serial?: string;
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category?: string;
  riskLevel?: string;
  beneficiaryType?: string;
  beneficiaryName?: string;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  location?: string | null;
  objectives?: string;
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  progress: number;
  managerId: string;
  teamIds: string[];
  leaderId?: string | null;
  createdAt: string;
  updatedAt?: string;
  approvalStatus?: ApprovalStatus;
  approvalNotes?: string | null;
  submittedBy?: string | null;
  reviewedBy?: string | null;
  lastReviewedAt?: string | null;
}

// ─── Gantt ─────────────────────────────────────────────────────────────────

export type GanttItemType = 'phase' | 'step' | 'subtask' | 'milestone';

export type ApprovalStatus =
  | 'draft'
  | 'technical_review'
  | 'accounting_review'
  | 'supervisor_review'
  | 'superadmin_review'
  | 'approved'
  | 'rejected'
  | 'revision_requested';

export interface GanttItem {
  id: string;
  projectId: string;
  parentId: string | null;
  type: GanttItemType;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  progress: number;
  position: number;
  assigneeIds: string[];
  visibleToRoles: string[];
  visibleToUsers: string[];
  createdAt: string;
  updatedAt: string;
  treeIndex?: string;
  depth?: number;
}

export interface GanttDependency {
  id: string;
  projectId: string;
  predecessorId: string;
  successorId: string;
  type: 'finish_to_start';
}

// ─── Project Forms ──────────────────────────────────────────────────────────

export type ProjectFormType =
  | 'project_details'
  | 'project_planning'
  | 'progress_update'
  | 'issue_risk'
  | 'approval_review'
  | 'completion_handover'
  | 'analytics_kpi';

export type FormSubmissionStatus = 'submitted' | 'reviewed' | 'approved' | 'rejected' | 'revision_requested';

export interface ProjectFormSubmission {
  id: string;
  projectId: string;
  submittedBy: string | null;
  formType: ProjectFormType;
  status: FormSubmissionStatus;
  data: Record<string, any>;
  notes: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  ganttPhaseId: string | null;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'review' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo: string;
  startDate: string;
  endDate: string;
  progress: number;
  estimatedHours: number;
  loggedHours: number;
  allowEmployeeEdit: boolean;
  completionReportStatus: 'none' | 'pending' | 'approved' | 'rejected' | 'revision_requested';
  reportCost: number;
}

export interface BudgetRequest {
  id: string;
  projectId: string;
  requestedBy: string;
  amount: number;
  type: 'spending' | 'additional_budget';
  purpose: string;
  status: 'pending' | 'accounting_approved' | 'supervisor_approved' | 'approved' | 'rejected' | 'revision_requested';
  createdAt: string;
  reviewedAt?: string;
  reviewComment?: string;
  attachment?: string;
  adminRemarks?: string;
  originalAmount?: number | null;
  revisionCount?: number;
}

export interface Issue {
  id: string;
  projectId: string;
  title: string;
  description: string;
  type: 'risk' | 'assumption' | 'issue' | 'dependency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  reportedBy: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUpload {
  id: string;
  projectId: string;
  taskId?: string | null;
  uploadedBy: string;
  type: 'file' | 'video' | 'text';
  title: string;
  content: string;
  filePath?: string | null;
  originalFilename?: string | null;
  fileSize?: string | null;
  visibleTo?: string[];
  createdAt: string;
}

export interface TimeLog {
  id: string;
  taskId: string;
  userId: string;
  hours: number;
  description: string;
  date: string;
}

// ─── Task Comments ─────────────────────────────────────────────────────────

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  body: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
}


// ─── Activity Feed ─────────────────────────────────────────────────────────

export interface ActivityFeedItem {
  id: string;
  userId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  projectId: string;
  changes: Record<string, any>;
  context: Record<string, any>;
  createdAt: string;
}

// ─── Workload ──────────────────────────────────────────────────────────────

export interface WorkloadEntry {
  userId: string;
  userName: string;
  department: string;
  activeTasks: number;
  estimatedHours: number;
  loggedHours: number;
  utilization: number;
}

// ─── Budget Variance ───────────────────────────────────────────────────────

export interface BudgetVariance {
  projectId: string;
  projectName: string;
  budget: number;
  spent: number;
  variance: number;
  variancePercent: number;
  burnRate: number;
  projectedTotal: number;
  status: 'healthy' | 'warning' | 'over-budget';
}