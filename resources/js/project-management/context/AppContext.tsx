import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useRef,
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
  ProjectFormSubmission } from
'../data/mockData';
import { isElevatedRole } from '../utils/roles';
import { apiFetch, setSessionExpiredHandler } from '../utils/apiFetch';
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
    requires2fa?: boolean;
  }>;
  verify2fa: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateCurrentUser: (user: User) => void;
}
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  login: async () => ({
    success: false
  }),
  verify2fa: async () => ({ success: false }),
  logout: async () => {},
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
  formSubmissions: ProjectFormSubmission[];
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
  refreshGanttItems: (projectId: string, previewAs?: string) => Promise<void>;
  refreshGanttDependencies: (projectId: string) => void;
  refreshFormSubmissions: (projectId: string, formType?: string) => void;
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
  formSubmissions: [],
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
  refreshGanttItems: () => Promise.resolve(),
  refreshGanttDependencies: () => {},
  refreshFormSubmissions: () => {},
  refreshAll: () => {}
});
// ─── Notification Context ────────────────────────────────────────────────
interface ApiNotification {
  id: string;
  type: string;
  data: Record<string, any>;
  read: boolean;
  createdAt: string;
}
interface NotificationContextType {
  notifications: ApiNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => void;
}
const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  refreshNotifications: () => {},
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
export function useNotifications() {
  return useContext(NotificationContext);
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

  const applyThemeToRoot = useCallback((dark: boolean) => {
    const root = document.documentElement;

    // Prevent thousands of color transitions from animating during theme flips.
    root.classList.add('theme-switching');
    root.classList.toggle('dark', dark);
    root.classList.toggle('light', !dark);
    root.style.colorScheme = dark ? 'dark' : 'light';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('theme-switching');
      });
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      applyThemeToRoot(next);
      localStorage.setItem('maptech-theme', next ? 'dark' : 'light');
      return next;
    });
  }, [applyThemeToRoot]);
  useLayoutEffect(() => {
    applyThemeToRoot(isDark);
  }, [isDark, applyThemeToRoot]);
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
    ): Promise<{ success: boolean; error?: string; requires2fa?: boolean }> => {
      try {
        const res = await apiFetch('/api/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user as User);
          return { success: true };
        }
        if (data.requires_2fa) {
          return { success: false, requires2fa: true };
        }
        return { success: false, error: data.error || 'Login failed.' };
      } catch {
        return { success: false, error: 'Network error. Please try again.' };
      }
    },
    []
  );

  const verify2fa = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await apiFetch('/api/login/2fa', {
          method: 'POST',
          body: JSON.stringify({ code }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user as User);
          return { success: true };
        }
        return { success: false, error: data.error || 'Verification failed.' };
      } catch {
        return { success: false, error: 'Network error. Please try again.' };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/logout', { method: 'POST' });
    } catch {
      // Network failure — still clear client state
    }
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

  // Register global 401 handler so any apiFetch 401 triggers logout
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setCurrentUser(null);
      localStorage.removeItem('maptech-current-user');
      setCurrentPage('login');
      if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
        window.history.replaceState({}, '', '/');
      }
    });
    return () => setSessionExpiredHandler(() => {});
  }, []);
  // Navigation — default to 'login'; will be updated once auth is checked
  const [currentPage, setCurrentPage] = useState<string>('login');

  // Map internal page keys to URL paths
  const pageToPath = useCallback((page: string) => {
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
  }, []);

  // Wrapper to navigate: updates state and browser URL (pushState)
  const navigate = useCallback((page: string) => {
    setCurrentPage(page);
    try {
      const path = pageToPath(page);
      if (window.location.pathname !== path) {
        window.history.pushState({}, '', path);
      }
    } catch (e) {
      // server-side rendering / unavailable window
    }
  }, [pageToPath]);

  // Validate persisted user against current backend session.
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    apiFetch('/api/me')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Auth check failed (${res.status})`);
        }
        return res.json();
      })
      .then((data: { success?: boolean; user?: User }) => {
        if (data?.success && data.user) {
          setCurrentUser(data.user);
          return;
        }
        throw new Error('No user returned from auth check');
      })
      .catch(() => {
        setCurrentUser(null);
        localStorage.removeItem('maptech-current-user');
        setCurrentPage('login');
        if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
          window.history.replaceState({}, '', '/');
        }
      });
  }, []);

  // Once auth state changes, set the right default page and push URL
  const initialNavDoneRef = useRef(false);
  useEffect(() => {
    if (!currentUser) return;

    const target = isElevatedRole(currentUser.role) ? 'admin-dashboard' : 'employee-dashboard';

    // Run once on initial auth resolution. After that, only auto-navigate
    // when the app is still on the login page (prevents overwriting user
    // navigation on background user refreshes).
    if (initialNavDoneRef.current) {
      if (currentPage === 'login') {
        navigate(target);
      }
      return;
    }
    initialNavDoneRef.current = true;
    navigate(target);
  }, [currentUser, currentPage, navigate]);

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
        if (p === '/admin') {
          setCurrentPage('admin-dashboard');
        } else if (p.startsWith('/admin')) {
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

  // Data — API is the single source of truth; state starts empty until fetched
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [budgetRequests, setBudgetRequests] = useState<BudgetRequest[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [media, setMedia] = useState<MediaUpload[]>([]);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [ganttItems, setGanttItems] = useState<GanttItem[]>([]);
  const [ganttDependencies, setGanttDependencies] = useState<GanttDependency[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<ProjectFormSubmission[]>([]);


  // ─── Load users from the database on mount ───────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    // Chat removed -> always use users listing endpoint
    const usersEndpoint = '/api/users';

    apiFetch(usersEndpoint, { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: User[]) => {
        if (Array.isArray(data)) {
          setUsers(data);
        }
      })
      .catch(() => { /* API fetch failed; state remains empty until next retry */ });
  }, [currentUser]);

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
  const refreshUsers = useCallback(() => {
    if (!currentUser) {
      return;
    }

    // Chat removed -> always use users listing endpoint
    const usersEndpoint = '/api/users';

    apiFetch(usersEndpoint, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load users (${res.status})`);
        }
        return res.json();
      })
      .then((data: User[]) => { if (Array.isArray(data)) setUsers(data); })
      .catch((error) => {
        console.warn('refreshUsers failed:', error);
      });
  }, [currentUser]);
  const refreshProjects = useCallback(() => {
    apiFetch('/api/projects', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load projects (${res.status})`);
        }
        return res.json();
      })
      .then((data: Project[]) => { if (Array.isArray(data)) setProjects(data); })
      .catch((error) => {
        console.warn('refreshProjects failed:', error);
      });
  }, []);
  const refreshTasks = useCallback(() => {
    apiFetch('/api/tasks', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load tasks (${res.status})`);
        }
        return res.json();
      })
      .then((data: Task[]) => { if (Array.isArray(data)) setTasks(data); })
      .catch((error) => {
        console.warn('refreshTasks failed:', error);
      });
  }, []);
  const refreshMedia = useCallback(() => {
    apiFetch('/api/media', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load media (${res.status})`);
        }
        return res.json();
      })
      .then((data: MediaUpload[]) => { if (Array.isArray(data)) setMedia(data); })
      .catch((error) => {
        console.warn('refreshMedia failed:', error);
      });
  }, []);
  const refreshTimeLogs = useCallback(() => {
    apiFetch('/api/time-logs', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load time logs (${res.status})`);
        }
        return res.json();
      })
      .then((data: TimeLog[]) => { if (Array.isArray(data)) setTimeLogs(data); })
      .catch((error) => {
        console.warn('refreshTimeLogs failed:', error);
      });
  }, []);
  const refreshBudgetRequests = useCallback(() => {
    apiFetch('/api/budget-requests', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load budget requests (${res.status})`);
        }
        return res.json();
      })
      .then((data: BudgetRequest[]) => { if (Array.isArray(data)) setBudgetRequests(data); })
      .catch((error) => {
        console.warn('refreshBudgetRequests failed:', error);
      });
  }, []);
  const refreshIssues = useCallback(() => {
    apiFetch('/api/issues', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load issues (${res.status})`);
        }
        return res.json();
      })
      .then((data: Issue[]) => { if (Array.isArray(data)) setIssues(data); })
      .catch((error) => {
        console.warn('refreshIssues failed:', error);
      });
  }, []);
  const refreshGanttItems = useCallback((projectId: string, previewAs?: string): Promise<void> => {
    const url = previewAs
      ? `/api/projects/${projectId}/gantt-items?preview_as=${previewAs}`
      : `/api/projects/${projectId}/gantt-items`;
    return apiFetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load gantt items (${res.status})`);
        }
        return res.json();
      })
      .then((data: GanttItem[]) => {
        if (!Array.isArray(data)) return;
        setGanttItems((prev) => {
          const untouched = prev.filter((item) => item.projectId !== projectId);
          return [...untouched, ...data];
        });
      })
      .catch((error) => {
        console.warn('refreshGanttItems failed:', error);
      });
  }, []);
  const refreshGanttDependencies = useCallback((projectId: string) => {
    apiFetch(`/api/projects/${projectId}/gantt-dependencies`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load gantt dependencies (${res.status})`);
        }
        return res.json();
      })
      .then((data: GanttDependency[]) => {
        if (!Array.isArray(data)) return;
        setGanttDependencies((prev) => {
          const untouched = prev.filter((dep) => dep.projectId !== projectId);
          return [...untouched, ...data];
        });
      })
      .catch((error) => {
        console.warn('refreshGanttDependencies failed:', error);
      });
  }, []);
  const refreshFormSubmissions = useCallback((projectId: string, formType?: string) => {
    const url = formType
      ? `/api/projects/${projectId}/form-submissions?form_type=${formType}`
      : `/api/projects/${projectId}/form-submissions`;
    apiFetch(url, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load form submissions (${res.status})`);
        }
        return res.json();
      })
      .then((data: ProjectFormSubmission[]) => { if (Array.isArray(data)) setFormSubmissions(data); })
      .catch((error) => {
        console.warn('refreshFormSubmissions failed:', error);
      });
  }, []);
  const refreshAll = useCallback(() => {
    refreshUsers();
    refreshProjects();
    refreshTasks();
    refreshMedia();
    refreshTimeLogs();
    refreshBudgetRequests();
    refreshIssues();
  }, [refreshUsers, refreshProjects, refreshTasks, refreshMedia, refreshTimeLogs, refreshBudgetRequests, refreshIssues]);

  // ─── Notifications (fetched from API) ────────────────────────────────
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);

  const refreshNotifications = useCallback(() => {
    if (!currentUser) return;
    apiFetch('/api/notifications', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load notifications (${res.status})`);
        return res.json();
      })
      .then((data: ApiNotification[]) => { if (Array.isArray(data)) setNotifications(data); })
      .catch(() => {});
  }, [currentUser]);

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const markAsRead = useCallback((id: string) => {
    apiFetch(`/api/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    apiFetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // ─── Load all data from the database on mount (only when authenticated)
  useEffect(() => {
    if (!currentUser) return;
    refreshAll();
    refreshNotifications();
  }, [refreshAll, refreshNotifications, currentUser]);

  // ─── Auto-refresh every 30 seconds (skip while tab is hidden, not authed, or already refreshing)
  const isRefreshingRef = useRef(false);
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.visibilityState === 'hidden') return;
      if (!currentUser) return;
      if (isRefreshingRef.current) return;
      isRefreshingRef.current = true;
      try {
        refreshAll();
        refreshNotifications();
      } finally {
        // Allow next refresh after a short delay to prevent overlap
        setTimeout(() => { isRefreshingRef.current = false; }, 2000);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshAll, refreshNotifications, currentUser]);

  const themeContextValue = useMemo(() => ({
    isDark,
    toggleTheme,
  }), [isDark, toggleTheme]);

  const authContextValue = useMemo(() => ({
    currentUser,
    login,
    logout,
    updateCurrentUser,
    verify2fa,
  }), [currentUser, login, logout, updateCurrentUser, verify2fa]);

  const navigationContextValue = useMemo(() => ({
    currentPage,
    setCurrentPage: navigate,
  }), [currentPage, navigate]);

  const dataContextValue = useMemo(() => ({
    users,
    projects,
    tasks,
    budgetRequests,
    issues,
    media,
    timeLogs,
    ganttItems,
    ganttDependencies,
    formSubmissions,
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
    refreshFormSubmissions,
    refreshAll,
  }), [
    users,
    projects,
    tasks,
    budgetRequests,
    issues,
    media,
    timeLogs,
    ganttItems,
    ganttDependencies,
    formSubmissions,
    refreshTasks,
    refreshProjects,
    refreshMedia,
    refreshTimeLogs,
    refreshBudgetRequests,
    refreshIssues,
    refreshGanttItems,
    refreshGanttDependencies,
    refreshFormSubmissions,
    refreshAll,
  ]);

  const notificationContextValue = useMemo(() => ({
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  }), [notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications]);

  return (
    <ThemeContext.Provider
      value={themeContextValue}>

      <AuthContext.Provider
        value={authContextValue}>

        <NavigationContext.Provider
          value={navigationContextValue}>

          <DataContext.Provider
            value={dataContextValue}>
            <NotificationContext.Provider
              value={notificationContextValue}>
              {children}
            </NotificationContext.Provider>
          </DataContext.Provider>
        </NavigationContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>);

}