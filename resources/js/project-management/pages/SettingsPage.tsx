import React, { useState, useEffect, useRef } from 'react';
import {
  UserIcon,
  KeyIcon,
  PaletteIcon,
  ShieldIcon,
  SaveIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  CameraIcon,
  MoonIcon,
  SunIcon,
  BellIcon,
  MonitorIcon,
} from 'lucide-react';
import { useAuth, useTheme, useData } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { apiFetch } from '../utils/apiFetch';
import { isSuperadmin, isElevatedRole } from '../utils/roles';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

type SettingsTab = 'profile' | 'security' | 'preferences' | 'system';

export function SettingsPage() {
  const { currentUser, updateCurrentUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { users } = useData();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initialLoadRef = useRef(false);

  // Profile state
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>({
    task_assignments: true,
    budget_approvals: true,
    blocker_alerts: true,
    overdue_reminders: true,
    email_digest: false,
  });

  useEffect(() => {
    apiFetch('/api/notification-preferences')
      .then((r) => r.json())
      .then((d) => { if (d && typeof d === 'object') setNotifPrefs(d); })
      .catch(() => {});
  }, []);

  const toggleNotifPref = async (key: string) => {
    const newVal = !notifPrefs[key];
    setNotifPrefs((prev) => ({ ...prev, [key]: newVal }));
    await apiFetch('/api/notification-preferences', {
      method: 'PUT',
      body: JSON.stringify({ [key]: newVal }),
    });
  };

  useEffect(() => {
    if (users.length > 0 && !initialLoadRef.current) {
      initialLoadRef.current = true;
      setIsLoading(false);
    }
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name || '');
      setProfileEmail(currentUser.email || '');
    }
  }, [currentUser]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (isLoading) return <LoadingSpinner message="Loading settings..." />;

  const isAdmin = isSuperadmin(currentUser?.role);

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      const res = await apiFetch('/api/user/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: profileName }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const data = await res.json();
      if (data.user) updateCurrentUser(data.user);
      setToast({ type: 'success', text: 'Profile updated successfully' });
    } catch {
      setToast({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setToast({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 8) {
      setToast({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await apiFetch('/api/user/password', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: currentPassword,
          password: newPassword,
          password_confirmation: confirmPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to change password');
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setToast({ type: 'success', text: 'Password changed successfully' });
    } catch (err: any) {
      setToast({ type: 'error', text: err.message || 'Failed to change password' });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await apiFetch(`/api/users/${currentUser?.id}/profile-photo`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Failed to upload photo');
      const data = await res.json();
      if (data.user) updateCurrentUser(data.user);
      setToast({ type: 'success', text: 'Profile photo updated' });
    } catch {
      setToast({ type: 'error', text: 'Failed to upload photo' });
    } finally {
      setUploadingPhoto(false);
    }
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <UserIcon size={15} /> },
    { id: 'security', label: 'Security', icon: <KeyIcon size={15} /> },
    { id: 'preferences', label: 'Preferences', icon: <PaletteIcon size={15} /> },
    ...(isAdmin ? [{ id: 'system' as SettingsTab, label: 'System', icon: <ShieldIcon size={15} /> }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          toast.type === 'success'
            ? 'dark:bg-green-500/10 dark:border-green-500/30 dark:text-green-400 bg-green-50 border border-green-200 text-green-700'
            : 'dark:bg-red-500/10 dark:border-red-500/30 dark:text-red-400 bg-red-50 border border-red-200 text-red-700'
        }`}>
          {toast.type === 'success' ? <CheckCircleIcon size={16} /> : <AlertTriangleIcon size={16} />}
          {toast.text}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 dark:bg-dark-card bg-white rounded-lg p-1 border dark:border-dark-border border-light-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-green-primary text-white'
                : 'dark:text-dark-muted text-light-muted dark:hover:bg-dark-card2 hover:bg-light-card2'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="dark:bg-dark-card bg-white rounded-card border dark:border-dark-border border-light-border">
        {activeTab === 'profile' && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold dark:text-dark-text text-light-text">Profile Information</h3>

            {/* Profile Photo */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-green-primary/15 flex items-center justify-center overflow-hidden">
                  {currentUser?.profilePhoto ? (
                    <img src={currentUser.profilePhoto} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={24} className="text-green-primary" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-primary text-white flex items-center justify-center hover:bg-green-primary/90 transition-colors"
                >
                  <CameraIcon size={12} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              <div>
                <p className="text-sm font-medium dark:text-dark-text text-light-text">{currentUser?.name}</p>
                <p className="text-xs dark:text-dark-subtle text-light-subtle">{currentUser?.email}</p>
                <p className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">
                  {currentUser?.role} · {currentUser?.department}
                </p>
              </div>
            </div>

            {/* Profile Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
              <Input
                label="Full Name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
              <Input
                label="Email"
                value={profileEmail}
                disabled
                onChange={() => {}}
              />
            </div>

            {/* Read-only fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider dark:text-dark-subtle text-light-subtle">Role</p>
                <p className="text-sm font-medium dark:text-dark-text text-light-text mt-1">{currentUser?.role || '—'}</p>
              </div>
              <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider dark:text-dark-subtle text-light-subtle">Department</p>
                <p className="text-sm font-medium dark:text-dark-text text-light-text mt-1">{currentUser?.department || '—'}</p>
              </div>
              <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider dark:text-dark-subtle text-light-subtle">Position</p>
                <p className="text-sm font-medium dark:text-dark-text text-light-text mt-1">{currentUser?.position || '—'}</p>
              </div>
              <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider dark:text-dark-subtle text-light-subtle">User ID</p>
                <p className="text-sm font-medium dark:text-dark-text text-light-text mt-1 font-mono text-xs">{currentUser?.id || '—'}</p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                icon={<SaveIcon size={14} />}
                onClick={handleSaveProfile}
                disabled={savingProfile || profileName === currentUser?.name}
              >
                {savingProfile ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold dark:text-dark-text text-light-text">Change Password</h3>
            <div className="max-w-sm space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
            <Button
              variant="primary"
              icon={<KeyIcon size={14} />}
              onClick={handleChangePassword}
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
            >
              {savingPassword ? 'Changing…' : 'Change Password'}
            </Button>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold dark:text-dark-text text-light-text">Appearance & Preferences</h3>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between max-w-md dark:bg-dark-card2 bg-light-card2 rounded-lg p-4">
              <div className="flex items-center gap-3">
                {isDark ? <MoonIcon size={18} className="text-blue-400" /> : <SunIcon size={18} className="text-amber-400" />}
                <div>
                  <p className="text-sm font-medium dark:text-dark-text text-light-text">Theme</p>
                  <p className="text-xs dark:text-dark-subtle text-light-subtle">
                    Currently using {isDark ? 'dark' : 'light'} mode
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? 'bg-green-primary' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isDark ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Notification Preferences */}
            <div className="max-w-md space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <BellIcon size={16} className="dark:text-dark-muted text-light-muted" />
                <p className="text-sm font-medium dark:text-dark-text text-light-text">Notification Preferences</p>
              </div>
              {[
                { key: 'task_assignments', label: 'Task assignments', description: 'When a task is assigned to you' },
                { key: 'budget_approvals', label: 'Budget approvals', description: 'Updates on budget requests' },
                { key: 'blocker_alerts', label: 'Blocker alerts', description: 'When blockers are reported' },
                { key: 'overdue_reminders', label: 'Overdue reminders', description: 'Tasks past their due date' },
                { key: 'email_digest', label: 'Daily email digest', description: 'Summary of activity sent daily' },
              ].map((pref) => (
                <div key={pref.key} className="flex items-center justify-between dark:bg-dark-card2 bg-light-card2 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-sm dark:text-dark-text text-light-text">{pref.label}</p>
                    <p className="text-xs dark:text-dark-subtle text-light-subtle">{pref.description}</p>
                  </div>
                  <button
                    onClick={() => toggleNotifPref(pref.key)}
                    className={`relative w-9 h-5 rounded-full transition-colors ${notifPrefs[pref.key] ? 'bg-green-primary' : 'bg-zinc-600'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${notifPrefs[pref.key] ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'system' && isAdmin && (
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold dark:text-dark-text text-light-text">System Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MonitorIcon size={14} className="text-green-primary" />
                  <p className="text-xs font-semibold uppercase tracking-wider dark:text-dark-subtle text-light-subtle">Platform</p>
                </div>
                <p className="text-sm dark:text-dark-text text-light-text">MAPTECH PMS</p>
                <p className="text-xs dark:text-dark-subtle text-light-subtle mt-1">Laravel 11 + React 18</p>
              </div>
              <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserIcon size={14} className="text-blue-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider dark:text-dark-subtle text-light-subtle">Users</p>
                </div>
                <p className="text-2xl font-bold dark:text-dark-text text-light-text">{users.length}</p>
                <p className="text-xs dark:text-dark-subtle text-light-subtle mt-1">Total registered</p>
              </div>
              <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldIcon size={14} className="text-purple-400" />
                  <p className="text-xs font-semibold uppercase tracking-wider dark:text-dark-subtle text-light-subtle">Session</p>
                </div>
                <p className="text-sm dark:text-dark-text text-light-text">Active</p>
                <p className="text-xs dark:text-dark-subtle text-light-subtle mt-1">Logged in as {currentUser?.name}</p>
              </div>
            </div>

            <div className="dark:bg-dark-card2 bg-light-card2 rounded-lg p-4">
              <p className="text-xs font-semibold uppercase tracking-wider dark:text-dark-subtle text-light-subtle mb-3">Environment</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['App Name', 'MAPTECH PMS'],
                  ['Framework', 'Laravel 11'],
                  ['Frontend', 'React 18 + TypeScript'],
                  ['Styling', 'Tailwind CSS'],
                  ['Database', 'PostgreSQL'],
                  ['Auth', 'Session-based'],
                ].map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span className="dark:text-dark-subtle text-light-subtle">{key}</span>
                    <span className="dark:text-dark-text text-light-text font-mono text-xs">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
