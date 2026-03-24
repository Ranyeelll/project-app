import React, { useState } from 'react';
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  ShieldCheckIcon,
  ClipboardCopyIcon,
  CheckCircleIcon } from
'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { useAuth } from '../../context/AppContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** If true the modal cannot be dismissed (first-login flow) */
  forced?: boolean;
}

export function ChangePasswordModal({ isOpen, onClose, forced }: ChangePasswordModalProps) {
  const { currentUser, updateCurrentUser } = useAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // After success
  const [recoveryCode, setRecoveryCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
    setError('');
    setRecoveryCode('');
    setCopied(false);
    setDone(false);
    setLoading(false);
  };

  const handleClose = () => {
    // If forced (must_change_password), only allow close after success
    if (forced && !done) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const csrfToken =
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          user_id: currentUser?.id ? Number(currentUser.id) : 0,
          old_password: oldPassword,
          new_password: newPassword,
          new_password_confirmation: confirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setError('Your session expired. Please log in again, then change your password.');
        return;
      }

      if (data.success) {
        setRecoveryCode(data.recovery_code || '');
        setDone(true);
        if (data.user) {
          updateCurrentUser(data.user);
        }
      } else {
        setError(data.error || 'Password change failed.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(recoveryCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={done ? 'Recovery Code' : (forced ? 'Change Password Required' : 'Change Password')}
      size="sm">

      {!done ? (
        <>
          {forced && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm">
              You must change your password before continuing.
            </div>
          )}

          {error && (
            <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Old Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium dark:text-dark-text text-light-text">
                Current Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-dark-muted text-light-muted">
                  <LockIcon size={15} />
                </div>
                <input
                  type={showOld ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-btn text-sm dark:bg-dark-card2 dark:border-dark-border dark:text-dark-text dark:placeholder-dark-subtle bg-white border-light-border text-light-text placeholder-light-subtle border px-3 py-2.5 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-green-primary/50 focus:border-green-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text transition-colors">
                  {showOld ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium dark:text-dark-text text-light-text">
                New Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-dark-muted text-light-muted">
                  <LockIcon size={15} />
                </div>
                <input
                  type={showNew ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-btn text-sm dark:bg-dark-card2 dark:border-dark-border dark:text-dark-text dark:placeholder-dark-subtle bg-white border-light-border text-light-text placeholder-light-subtle border px-3 py-2.5 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-green-primary/50 focus:border-green-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text transition-colors">
                  {showNew ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium dark:text-dark-text text-light-text">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-dark-muted text-light-muted">
                  <LockIcon size={15} />
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-btn text-sm dark:bg-dark-card2 dark:border-dark-border dark:text-dark-text dark:placeholder-dark-subtle bg-white border-light-border text-light-text placeholder-light-subtle border px-3 py-2.5 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-green-primary/50 focus:border-green-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text transition-colors">
                  {showConfirm ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                </button>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {!forced && (
                <Button type="button" variant="secondary" fullWidth onClick={handleClose}>
                  Cancel
                </Button>
              )}
              <Button type="submit" variant="primary" fullWidth loading={loading}>
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </>
      ) : (
        /* ── Success: show new recovery code ──────────────────────── */
        <>
          <div className="flex flex-col items-center mb-4">
            <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mb-3">
              <ShieldCheckIcon size={28} className="text-green-400" />
            </div>
            <p className="text-sm dark:text-dark-text text-light-text text-center font-medium">
              Password changed successfully!
            </p>
            <p className="text-xs dark:text-dark-muted text-light-muted mt-1 text-center">
              Below is your new recovery code.
              <br />
              <span className="text-red-400 font-semibold">Save it now — it will not be shown again.</span>
            </p>
          </div>

          <div className="mb-4 p-3 rounded-lg dark:bg-dark-card2 bg-gray-50 border dark:border-dark-border border-light-border">
            <p className="text-xs dark:text-dark-muted text-light-muted mb-1 uppercase tracking-wide font-semibold">
              Recovery Code
            </p>
            <p className="text-sm font-mono dark:text-green-400 text-green-600 break-all select-all leading-relaxed">
              {recoveryCode}
            </p>
          </div>

          <button
            onClick={copyCode}
            className="w-full mb-3 flex items-center justify-center gap-2 px-3 py-2 rounded-btn text-sm font-medium dark:bg-dark-card2 dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-border/50 bg-gray-100 border border-light-border text-light-text hover:bg-gray-200 transition-colors">
            {copied ? (
              <><CheckCircleIcon size={15} className="text-green-400" /> Copied!</>
            ) : (
              <><ClipboardCopyIcon size={15} /> Copy Code</>
            )}
          </button>

          <Button variant="primary" fullWidth onClick={handleClose}>
            Done
          </Button>
        </>
      )}
    </Modal>
  );
}
