import React, {
  useCallback,
  useEffect,
  useState,
  createContext,
  useContext } from
'react';
import {
  User,
  Project,
  Task,
  BudgetRequest,
  Issue,
  MediaUpload,
  TimeLog,
  GanttItem,
  GanttDependency,
  MOCK_USERS,
  MOCK_PROJECTS,
  MOCK_TASKS,
  MOCK_BUDGET_REQUESTS,
  MOCK_ISSUES,
  MOCK_MEDIA,
  MOCK_TIME_LOGS } from
'../data/mockData';
// ─── Theme Context ───────────────────────────────────────────────────────────
interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}
const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  toggleTheme: () => {}
});
// ─── Auth Context ────────────────────────────────────────────────────────────
interface AuthContextType {
  currentUser: User | null;
  login: (
  email: string,
  password: string)
  => Promise<{
    success: boolean;
    error?: string;
  }>;
  logout: () => void;
  updateCurrentUser: (user: User) => void;
}
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  login: async () => ({
    success: false
  }),
  logout: () => {},
  updateCurrentUser: () => {}
});
// ─── Navigation Context ──────────────────────────────────────────────────────
interface NavigationContextType {
  currentPage: string;
  setCurrentPage: (page: string) => void;
}
const NavigationContext = createContext<NavigationContextType>({
  currentPage: 'login',
  setCurrentPage: () => {}
});
// ─── Data Context ────────────────────────────────────────────────────────────
interface DataContextType {
  users: User[];
  projects: Project[];
  tasks: Task[];
  budgetRequests: BudgetRequest[];
  issues: Issue[];
  media: MediaUpload[];
  timeLogs: TimeLog[];
  ganttItems: GanttItem[];
  ganttDependencies: GanttDependency[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setBudgetRequests: React.Dispatch<React.SetStateAction<BudgetRequest[]>>;
  setIssues: React.Dispatch<React.SetStateAction<Issue[]>>;
  setMedia: React.Dispatch<React.SetStateAction<MediaUpload[]>>;
  setTimeLogs: React.Dispatch<React.SetStateAction<TimeLog[]>>;
  refreshTasks: () => void;
  refreshProjects: () => void;
  refreshMedia: () => void;
  refreshTimeLogs: () => void;
  refreshBudgetRequests: () => void;
  refreshIssues: () => void;
  refreshGanttItems: (projectId: string) => void;
  refreshGanttDependencies: (projectId: string) => void;
  refreshAll: () => void;
}
const DataContext = createContext<DataContextType>({
  users: [],
  projects: [],
  tasks: [],
  budgetRequests: [],
  issues: [],
  media: [],
  timeLogs: [],
  ganttItems: [],
  ganttDependencies: [],
  setUsers: () => {},
  setProjects: () => {},
  setTasks: () => {},
  setBudgetRequests: () => {},
  setIssues: () => {},
  setMedia: () => {},
  setTimeLogs: () => {},
  refreshTasks: () => {},
  refreshProjects: () => {},
  refreshMedia: () => {},
  refreshTimeLogs: () => {},
  refreshBudgetRequests: () => {},
  refreshIssues: () => {},
  refreshGanttItems: () => {},
  refreshGanttDependencies: () => {},
  refreshAll: () => {}
});
// ─── Hooks ───────────────────────────────────────────────────────────────────
export function useTheme() {
  return useContext(ThemeContext);
}
export function useAuth() {
  return useContext(AuthContext);
}
export function useNavigation() {
  return useContext(NavigationContext);
}
export function useData() {
  return useContext(DataContext);
}
// ─── Provider ────────────────────────────────────────────────────────────────
interface AppProviderProps {
  children: React.ReactNode;
}
export function AppProvider({ children }: AppProviderProps) {
  // Theme
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('maptech-theme');
    return saved !== null ? saved === 'dark' : true;
  });
  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('maptech-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [isDark]);
  // Auth — persisted in localStorage, validated against the database
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('maptech-current-user');
      if (saved) return JSON.parse(saved) as User;
    } catch { /* ignore */ }
    return null;
  });

  // Keep localStorage in sync whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('maptech-current-user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('maptech-current-user');
    }
  }, [currentUser]);

  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const csrfToken =
          document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
          },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user as User);
          return { success: true };
        }
        return { success: false, error: data.error || 'Login failed.' };
      } catch {
        return { success: false, error: 'Network error. Please try again.' };
      }
    },
    []
  );

  const logout = useCallback(() => {
    // Clear overdue-dismissed flag so modal shows again on next login
    if (currentUser) {
      sessionStorage.removeItem(`overdue-dismissed-${currentUser.id}`);
    }
    setCurrentUser(null);
    localStorage.removeItem('maptech-current-user');
    navigate('login');
  }, [currentUser]);

  const updateCurrentUser = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);
  // Navigation — default to 'login'; will be updated once auth is checked
  const [currentPage, setCurrentPage] = useState<string>('login');

  // Map internal page keys to URL paths
  const pageToPath = (page: string) => {
    switch (page) {
      case 'login':
        return '/';
      case 'forgot-password':
        return '/forgot-password';
      case 'admin-dashboard':
        return '/admin';
      case 'employee-dashboard':
        return '/dashboard';
      default:
        return `/${page}`.replace('//', '/');
    }
  };

  // Wrapper to navigate: updates state and browser URL (pushState)
  const navigate = (page: string) => {
    setCurrentPage(page);
    try {
      const path = pageToPath(page);
      if (window.location.pathname !== path) {
        window.history.pushState({}, '', path);
      }
    } catch (e) {
      // server-side rendering / unavailable window
    }
  };

  // Once auth state changes, set the right default page and push URL
  useEffect(() => {
    if (currentUser) {
      const target = currentUser.role === 'admin' ? 'admin-dashboard' : 'employee-dashboard';
      navigate(target);
    }
  }, [currentUser]);

  // Sync navigation on back/forward and on initial load
  // SECURITY: only allow protected pages if user is authenticated
  useEffect(() => {
    const syncFromPath = () => {
      try {
        const p = window.location.pathname;
        if (p === '/' || p === '/login') {
          setCurrentPage('login');
          return;
        }

        // Allow forgot-password without auth
        if (p === '/forgot-password') {
          setCurrentPage('forgot-password');
          return;
        }

        // If user is NOT logged in, block access and redirect to login
        const savedUser = localStorage.getItem('maptech-current-user');
        if (!savedUser) {
          setCurrentPage('login');
          window.history.replaceState({}, '', '/');
          return;
        }

        // User is authenticated — resolve page from path
        if (p.startsWith('/admin')) {
          const key = p.replace(/^\//, '') || 'admin-dashboard';
          setCurrentPage(key);
        } else if (p === '/dashboard' || p.startsWith('/employee')) {
          const key = p.replace(/^\//, '') || 'employee-dashboard';
          setCurrentPage(key);
        } else {
          const key = p.replace(/^\//, '') || 'login';
          setCurrentPage(key);
        }
      } catch (e) {
        /* ignore */
      }
    };
    syncFromPath();
    window.addEventListener('popstate', syncFromPath);
    return () => window.removeEventListener('popstate', syncFromPath);
  }, []);

  // ─── Helper: load from localStorage with fallback to mock data ───────────
  function loadState<T>(key: string, fallback: T): T {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return JSON.parse(saved) as T;
    } catch { /* ignore corrupt data */ }
    return fallback;
  }

  // Data (persisted in localStorage so edits survive page refresh)
  const [users, setUsers] = useState<User[]>(() => loadState('maptech-users', MOCK_USERS));
  const [projects, setProjects] = useState<Project[]>(() => loadState('maptech-projects', MOCK_PROJECTS));
  const [tasks, setTasks] = useState<Task[]>(() => loadState('maptech-tasks', MOCK_TASKS));
  const [budgetRequests, setBudgetRequests] =
    useState<BudgetRequest[]>(() => loadState('maptech-budgetRequests', MOCK_BUDGET_REQUESTS));
  const [issues, setIssues] = useState<Issue[]>(() => loadState('maptech-issues', MOCK_ISSUES));
  const [media, setMedia] = useState<MediaUpload[]>(() => loadState('maptech-media', MOCK_MEDIA));
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>(() => loadState('maptech-timeLogs', MOCK_TIME_LOGS));
  const [ganttItems, setGanttItems] = useState<GanttItem[]>([]);
  const [ganttDependencies, setGanttDependencies] = useState<GanttDependency[]>([]);

  // Persist every data slice to localStorage whenever it changes
  useEffect(() => { localStorage.setItem('maptech-users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('maptech-projects', JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem('maptech-tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('maptech-budgetRequests', JSON.stringify(budgetRequests)); }, [budgetRequests]);
  useEffect(() => { localStorage.setItem('maptech-issues', JSON.stringify(issues)); }, [issues]);
  useEffect(() => { localStorage.setItem('maptech-media', JSON.stringify(media)); }, [media]);
  useEffect(() => { localStorage.setItem('maptech-timeLogs', JSON.stringify(timeLogs)); }, [timeLogs]);

  // ─── Load users from the database on mount ───────────────────────────────
  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data: User[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setUsers(data);
        }
      })
      .catch(() => { /* fallback to localStorage / mock data already loaded */ });
  }, []);

  // ─── Keep currentUser in sync with latest user data from DB ──────────────
  useEffect(() => {
    if (!currentUser) return;
    const fresh = users.find((u) => u.id === currentUser.id);
    if (!fresh) return;
    // Update currentUser if any displayed field changed
    if (
      fresh.name !== currentUser.name ||
      fresh.email !== currentUser.email ||
      fresh.role !== currentUser.role ||
      fresh.department !== currentUser.department ||
      fresh.position !== currentUser.position ||
      fresh.status !== currentUser.status ||
      fresh.profilePhoto !== currentUser.profilePhoto
    ) {
      setCurrentUser((prev) => prev ? { ...prev, ...fresh } : prev);
    }
  }, [users]);

  // ─── Refresh helpers (can be called from any page) ────────────────────────
  const refreshUsers = () => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data: User[]) => { if (Array.isArray(data) && data.length > 0) setUsers(data); })
      .catch(() => {});
  };
  const refreshProjects = () => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data: Project[]) => { if (Array.isArray(data)) setProjects(data); })
      .catch(() => {});
  };
  const refreshTasks = () => {
    fetch('/api/tasks')
      .then((res) => res.json())
      .then((data: Task[]) => { if (Array.isArray(data)) setTasks(data); })
      .catch(() => {});
  };
  const refreshMedia = () => {
    fetch('/api/media')
      .then((res) => res.json())
      .then((data: MediaUpload[]) => { if (Array.isArray(data)) setMedia(data); })
      .catch(() => {});
  };
  const refreshTimeLogs = () => {
    fetch('/api/time-logs')
      .then((res) => res.json())
      .then((data: TimeLog[]) => { if (Array.isArray(data)) setTimeLogs(data); })
      .catch(() => {});
  };
  const refreshBudgetRequests = () => {
    fetch('/api/budget-requests')
      .then((res) => res.json())
      .then((data: BudgetRequest[]) => { if (Array.isArray(data)) setBudgetRequests(data); })
      .catch(() => {});
  };
  const refreshIssues = () => {
    fetch('/api/issues')
      .then((res) => res.json())
      .then((data: Issue[]) => { if (Array.isArray(data)) setIssues(data); })
      .catch(() => {});
  };
  const refreshGanttItems = (projectId: string) => {
    fetch(`/api/projects/${projectId}/gantt-items`)
      .then((res) => res.json())
      .then((data: GanttItem[]) => { if (Array.isArray(data)) setGanttItems(data); })
      .catch(() => {});
  };
  const refreshGanttDependencies = (projectId: string) => {
    fetch(`/api/projects/${projectId}/gantt-dependencies`)
      .then((res) => res.json())
      .then((data: GanttDependency[]) => { if (Array.isArray(data)) setGanttDependencies(data); })
      .catch(() => {});
  };
  const refreshAll = () => {
    refreshUsers();
    refreshProjects();
    refreshTasks();
    refreshMedia();
    refreshTimeLogs();
    refreshBudgetRequests();
    refreshIssues();
  };

  // ─── Load all data from the database on mount ────────────────────────────
  useEffect(() => { refreshAll(); }, []);

  // ─── Auto-refresh every 10 seconds ───────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
  }, []);
  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleTheme
      }}>

      <AuthContext.Provider
        value={{
          currentUser,
          login,
          logout,
          updateCurrentUser
        }}>

        <NavigationContext.Provider
          value={{
            currentPage,
            setCurrentPage: navigate
          }}>

          <DataContext.Provider
            value={{
              users,
              projects,
              tasks,
              budgetRequests,
              issues,
              media,
              timeLogs,
              ganttItems,
              ganttDependencies,
              setUsers,
              setProjects,
              setTasks,
              setBudgetRequests,
              setIssues,
              setMedia,
              setTimeLogs,
              refreshTasks,
              refreshProjects,
              refreshMedia,
              refreshTimeLogs,
              refreshBudgetRequests,
              refreshIssues,
              refreshGanttItems,
              refreshGanttDependencies,
              refreshAll
            }}>

            {children}
          </DataContext.Provider>
        </NavigationContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>);

}