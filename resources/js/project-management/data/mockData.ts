export type UserRole = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  department: string;
  position: string;
  status: 'active' | 'inactive';
  joinDate: string;
  profilePhoto?: string | null;
  mustChangePassword?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'completed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  startDate: string;
  endDate: string;
  budget: number;
  spent: number;
  progress: number;
  managerId: string;
  teamIds: string[];
  createdAt: string;
}

export interface Task {
  id: string;
  projectId: string;
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
  completionReportStatus: 'none' | 'pending' | 'approved' | 'rejected';
}

export interface BudgetRequest {
  id: string;
  projectId: string;
  requestedBy: string;
  amount: number;
  purpose: string;
  status: 'pending' | 'approved' | 'rejected' | 'revision_requested';
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

export const MOCK_USERS: User[] = [
{
  id: 'u1',
  name: 'Alex Rivera',
  email: 'admin@maptech.com',
  role: 'admin',
  avatar: 'AR',
  department: 'Engineering',
  position: 'Project Manager',
  status: 'active',
  joinDate: '2022-01-15'
},
{
  id: 'u2',
  name: 'Maria Santos',
  email: 'employee@maptech.com',
  role: 'employee',
  avatar: 'MS',
  department: 'Development',
  position: 'Senior Developer',
  status: 'active',
  joinDate: '2022-06-01'
},
{
  id: 'u3',
  name: 'James Reyes',
  email: 'james@maptech.com',
  role: 'employee',
  avatar: 'JR',
  department: 'Design',
  position: 'UI/UX Designer',
  status: 'active',
  joinDate: '2023-02-14'
},
{
  id: 'u4',
  name: 'Clara Mendoza',
  email: 'clara@maptech.com',
  role: 'employee',
  avatar: 'CM',
  department: 'QA',
  position: 'QA Engineer',
  status: 'active',
  joinDate: '2023-05-20'
},
{
  id: 'u5',
  name: 'Daniel Cruz',
  email: 'daniel@maptech.com',
  role: 'employee',
  avatar: 'DC',
  department: 'Backend',
  position: 'Backend Developer',
  status: 'inactive',
  joinDate: '2021-11-10'
}];


export const MOCK_PROJECTS: Project[] = [
{
  id: 'p1',
  name: 'GIS Platform Upgrade',
  description:
  'Upgrade the core GIS mapping platform to support real-time data layers and improved performance.',
  status: 'active',
  priority: 'critical',
  startDate: '2025-01-01',
  endDate: '2025-06-30',
  budget: 450000,
  spent: 187500,
  progress: 42,
  managerId: 'u1',
  teamIds: ['u2', 'u3', 'u4'],
  createdAt: '2024-12-15'
},
{
  id: 'p2',
  name: 'Mobile Field Survey App',
  description:
  'Develop a cross-platform mobile application for field data collection and survey management.',
  status: 'active',
  priority: 'high',
  startDate: '2025-02-01',
  endDate: '2025-08-31',
  budget: 280000,
  spent: 62000,
  progress: 22,
  managerId: 'u1',
  teamIds: ['u2', 'u5'],
  createdAt: '2025-01-20'
},
{
  id: 'p3',
  name: 'Data Analytics Dashboard',
  description:
  'Build a comprehensive analytics dashboard for spatial data visualization and reporting.',
  status: 'on-hold',
  priority: 'medium',
  startDate: '2025-03-01',
  endDate: '2025-09-30',
  budget: 190000,
  spent: 15000,
  progress: 8,
  managerId: 'u1',
  teamIds: ['u3', 'u4'],
  createdAt: '2025-02-10'
},
{
  id: 'p4',
  name: 'Legacy System Migration',
  description:
  'Migrate legacy database systems to modern cloud infrastructure with zero downtime.',
  status: 'completed',
  priority: 'high',
  startDate: '2024-07-01',
  endDate: '2024-12-31',
  budget: 320000,
  spent: 298000,
  progress: 100,
  managerId: 'u1',
  teamIds: ['u2', 'u4', 'u5'],
  createdAt: '2024-06-15'
}];


export const MOCK_TASKS: Task[] = [
{
  id: 't1',
  projectId: 'p1',
  title: 'Design new map layer architecture',
  description:
  'Create technical specifications for the new layered map architecture supporting real-time updates.',
  status: 'completed',
  priority: 'critical',
  assignedTo: 'u3',
  startDate: '2025-01-05',
  endDate: '2025-01-25',
  progress: 100,
  estimatedHours: 40,
  loggedHours: 38,
  allowEmployeeEdit: false,
  completionReportStatus: 'approved'
},
{
  id: 't2',
  projectId: 'p1',
  title: 'Implement WebSocket data streaming',
  description:
  'Build real-time data streaming using WebSocket connections for live map updates.',
  status: 'in-progress',
  priority: 'high',
  assignedTo: 'u2',
  startDate: '2025-01-20',
  endDate: '2025-03-15',
  progress: 65,
  estimatedHours: 120,
  loggedHours: 78,
  allowEmployeeEdit: true,
  completionReportStatus: 'none'
},
{
  id: 't3',
  projectId: 'p1',
  title: 'Performance optimization & load testing',
  description:
  'Optimize rendering performance and conduct load testing for 10,000 concurrent users.',
  status: 'todo',
  priority: 'high',
  assignedTo: 'u4',
  startDate: '2025-03-20',
  endDate: '2025-05-10',
  progress: 0,
  estimatedHours: 80,
  loggedHours: 0,
  allowEmployeeEdit: false,
  completionReportStatus: 'none'
},
{
  id: 't4',
  projectId: 'p1',
  title: 'UI/UX redesign for map controls',
  description:
  'Redesign the map control panel with improved usability and accessibility.',
  status: 'in-progress',
  priority: 'medium',
  assignedTo: 'u3',
  startDate: '2025-02-01',
  endDate: '2025-04-01',
  progress: 40,
  estimatedHours: 60,
  loggedHours: 24,
  allowEmployeeEdit: false,
  completionReportStatus: 'none'
},
{
  id: 't5',
  projectId: 'p2',
  title: 'Mobile app wireframes and prototypes',
  description:
  'Create detailed wireframes and interactive prototypes for the mobile field survey app.',
  status: 'completed',
  priority: 'high',
  assignedTo: 'u3',
  startDate: '2025-02-05',
  endDate: '2025-02-28',
  progress: 100,
  estimatedHours: 50,
  loggedHours: 52,
  allowEmployeeEdit: false,
  completionReportStatus: 'pending'
},
{
  id: 't6',
  projectId: 'p2',
  title: 'React Native core development',
  description:
  'Develop core application structure using React Native with offline-first architecture.',
  status: 'in-progress',
  priority: 'critical',
  assignedTo: 'u2',
  startDate: '2025-03-01',
  endDate: '2025-06-30',
  progress: 30,
  estimatedHours: 200,
  loggedHours: 60,
  allowEmployeeEdit: true,
  completionReportStatus: 'none'
}];


export const MOCK_BUDGET_REQUESTS: BudgetRequest[] = [
{
  id: 'br1',
  projectId: 'p1',
  requestedBy: 'u2',
  amount: 15000,
  purpose:
  'Additional cloud infrastructure for WebSocket server scaling during peak load testing phase.',
  status: 'pending',
  createdAt: '2025-02-20'
},
{
  id: 'br2',
  projectId: 'p2',
  requestedBy: 'u2',
  amount: 8500,
  purpose:
  'Third-party mapping SDK license for offline map tile caching in mobile app.',
  status: 'approved',
  createdAt: '2025-02-10',
  reviewedAt: '2025-02-12',
  reviewComment: 'Approved. Essential for offline functionality.'
},
{
  id: 'br3',
  projectId: 'p1',
  requestedBy: 'u3',
  amount: 3200,
  purpose:
  'Design tool licenses (Figma Enterprise) for team collaboration on UI redesign.',
  status: 'rejected',
  createdAt: '2025-01-28',
  reviewedAt: '2025-01-30',
  reviewComment:
  'Current Figma plan is sufficient. Please use existing licenses.'
},
{
  id: 'br4',
  projectId: 'p3',
  requestedBy: 'u4',
  amount: 5000,
  purpose: 'Testing environment setup and automated testing tool licenses.',
  status: 'pending',
  createdAt: '2025-03-01'
}];


export const MOCK_ISSUES: Issue[] = [
{
  id: 'i1',
  projectId: 'p1',
  title: 'WebSocket connection drops under high load',
  description:
  'During stress testing, WebSocket connections drop when concurrent users exceed 5,000. Needs investigation.',
  type: 'issue',
  severity: 'critical',
  status: 'in-progress',
  reportedBy: 'u2',
  assignedTo: 'u2',
  createdAt: '2025-02-15',
  updatedAt: '2025-02-18'
},
{
  id: 'i2',
  projectId: 'p1',
  title: 'Third-party tile server API deprecation risk',
  description:
  'Current tile server provider announced API v1 deprecation in Q3 2025. Need migration plan.',
  type: 'risk',
  severity: 'high',
  status: 'open',
  reportedBy: 'u3',
  createdAt: '2025-02-20',
  updatedAt: '2025-02-20'
},
{
  id: 'i3',
  projectId: 'p2',
  title: 'iOS App Store review timeline assumption',
  description:
  'Assuming 2-week App Store review. If longer, launch date may slip.',
  type: 'assumption',
  severity: 'medium',
  status: 'open',
  reportedBy: 'u2',
  createdAt: '2025-03-01',
  updatedAt: '2025-03-01'
}];


export const MOCK_MEDIA: MediaUpload[] = [
{
  id: 'm1',
  projectId: 'p1',
  taskId: 't1',
  uploadedBy: 'u3',
  type: 'file',
  title: 'Map Architecture Specification v2.1.pdf',
  content:
  'Technical specification document for the new layered map architecture.',
  fileSize: '2.4 MB',
  createdAt: '2025-01-25'
},
{
  id: 'm2',
  projectId: 'p1',
  uploadedBy: 'u1',
  type: 'text',
  title: 'Q1 2025 Project Status Update',
  content:
  'GIS Platform Upgrade is progressing well. Phase 1 (Architecture Design) completed on schedule. Phase 2 (WebSocket Implementation) currently at 65% completion. Team is on track for Q2 delivery.',
  createdAt: '2025-02-01'
},
{
  id: 'm3',
  projectId: 'p2',
  taskId: 't5',
  uploadedBy: 'u3',
  type: 'video',
  title: 'Mobile App Prototype Walkthrough.mp4',
  content:
  'Screen recording demonstrating the interactive prototype for field survey workflows.',
  fileSize: '45.2 MB',
  createdAt: '2025-02-28'
}];


export const MOCK_TIME_LOGS: TimeLog[] = [
{
  id: 'tl1',
  taskId: 't2',
  userId: 'u2',
  hours: 8,
  description: 'WebSocket server implementation',
  date: '2025-02-18'
},
{
  id: 'tl2',
  taskId: 't2',
  userId: 'u2',
  hours: 6,
  description: 'Connection pooling optimization',
  date: '2025-02-19'
},
{
  id: 'tl3',
  taskId: 't4',
  userId: 'u3',
  hours: 7,
  description: 'Map controls wireframing',
  date: '2025-02-18'
},
{
  id: 'tl4',
  taskId: 't6',
  userId: 'u2',
  hours: 8,
  description: 'React Native project setup',
  date: '2025-03-01'
}];


export const CREDENTIALS: Record<string, {password: string;userId: string;}> =
{
  'admin@maptech.com': { password: 'admin123', userId: 'u1' },
  'employee@maptech.com': { password: 'emp123', userId: 'u2' },
  'james@maptech.com': { password: 'emp123', userId: 'u3' },
  'clara@maptech.com': { password: 'emp123', userId: 'u4' }
};