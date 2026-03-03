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
}
const DataContext = createContext<DataContextType>({
  users: [],
  projects: [],
  tasks: [],
  budgetRequests: [],
  issues: [],
  media: [],
  timeLogs: [],
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
  refreshIssues: () => {}
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
    setCurrentUser(null);
    localStorage.removeItem('maptech-current-user');
    setCurrentPage('login');
  }, []);

  const updateCurrentUser = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);
  // Navigation — default to 'login'; will be updated once auth is checked
  const [currentPage, setCurrentPage] = useState<string>('login');

  // Once auth state changes, set the right default page
  useEffect(() => {
    if (currentUser) {
      setCurrentPage(
        currentUser.role === 'admin' ? 'admin-dashboard' : 'employee-dashboard'
      );
    }
  }, [currentUser]);

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

  // ─── Refresh helpers (can be called from any page) ────────────────────────
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

  // ─── Load projects from the database on mount ────────────────────────────
  useEffect(() => { refreshProjects(); }, []);

  // ─── Load tasks from the database on mount ───────────────────────────────
  useEffect(() => { refreshTasks(); }, []);

  // ─── Load media from the database on mount ───────────────────────────────
  useEffect(() => { refreshMedia(); }, []);

  // ─── Load time logs from the database on mount ───────────────────────────
  useEffect(() => { refreshTimeLogs(); }, []);

  // ─── Load budget requests from the database on mount ─────────────────────
  useEffect(() => { refreshBudgetRequests(); }, []);

  // ─── Load issues from the database on mount ──────────────────────────────
  useEffect(() => { refreshIssues(); }, []);

  // ─── Auto-refresh every 30 seconds ───────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTasks();
      refreshProjects();
      refreshMedia();
      refreshTimeLogs();
      refreshBudgetRequests();
      refreshIssues();
    }, 30000);
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
            setCurrentPage
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
              refreshIssues
            }}>

            {children}
          </DataContext.Provider>
        </NavigationContext.Provider>
      </AuthContext.Provider>
    </ThemeContext.Provider>);

}