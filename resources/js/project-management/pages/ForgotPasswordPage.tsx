import React, { useState } from 'react';
import {
  SunIcon,
  MoonIcon,
  KeyIcon,
  UserIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
  ClipboardCopyIcon,
  CheckCircleIcon } from
'lucide-react';
import { useTheme, useNavigation } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

type Step = 'verify' | 'reset' | 'success';

export function ForgotPasswordPage() {
  const { isDark, toggleTheme } = useTheme();
  const { setCurrentPage } = useNavigation();

  const [step, setStep] = useState<Step>('verify');

  // Step 1 — verify
  const [employeeId, setEmployeeId] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifiedName, setVerifiedName] = useState('');

  // Step 2 — new password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  // Step 3 — success (new recovery code)
  const [newRecoveryCode, setNewRecoveryCode] = useState('');
  const [copied, setCopied] = useState(false);

  /* ── Step 1: Verify Employee ID + Recovery Code ─────────────────────── */
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !recoveryCode) {
      setVerifyError('Please enter both Employee ID and Recovery Code.');
      return;
    }
    setVerifyError('');
    setVerifyLoading(true);
    try {
      const csrfToken =
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch('/api/verify-recovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ employee_id: Number(employeeId), recovery_code: recoveryCode }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifiedName(data.name || '');
        setStep('reset');
      } else {
        setVerifyError(data.error || 'Verification failed.');
      }
    } catch {
      setVerifyError('Network error. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  /* ── Step 2: Set new password ───────────────────────────────────────── */
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setResetError('Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    setResetError('');
    setResetLoading(true);
    try {
      const csrfToken =
        document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const res = await fetch('/api/reset-password-offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({
          employee_id: Number(employeeId),
          recovery_code: recoveryCode,
          new_password: newPassword,
          new_password_confirmation: confirmPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewRecoveryCode(data.recovery_code || '');
        setStep('success');
      } else {
        setResetError(data.error || 'Password reset failed.');
      }
    } catch {
      setResetError('Network error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  /* ── Copy helper ────────────────────────────────────────────────────── */
  const copyCode = () => {
    navigator.clipboard.writeText(newRecoveryCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ── Back to login ──────────────────────────────────────────────────── */
  const goToLogin = () => setCurrentPage('login');

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen w-full dark:bg-dark-bg bg-light-bg flex flex-col items-center justify-center p-4 relative">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-lg dark:bg-dark-card dark:border-dark-border dark:text-dark-muted dark:hover:text-dark-text bg-light-card border border-light-border text-light-muted hover:text-light-text transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>
      </div>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <img
            src="/Maptech_Official_Logo_version2_(1).png"
            alt="Maptech Information Solutions Inc."
            className="h-20 w-auto object-contain"
            style={{ filter: isDark ? 'brightness(1.5) contrast(1.1)' : 'brightness(1)' }}
          />
          <p className="mt-2 text-sm font-medium tracking-wide dark:text-dark-muted text-gray-500 text-center">
            Maptech Information Solutions Inc.
          </p>
        </div>

        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-modal p-8 shadow-card-dark">

          {/* ────────────────── STEP 1: VERIFY ────────────────── */}
          {step === 'verify' && (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold dark:text-dark-text text-light-text">
                  Forgot Password
                </h1>
                <p className="text-sm dark:text-dark-muted text-light-muted mt-1">
                  Enter your Employee ID and Recovery Code
                </p>
              </div>

              {verifyError && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {verifyError}
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-4" noValidate>
                <Input
                  label="Employee ID"
                  type="text"
                  placeholder="e.g. 1"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.replace(/\D/g, ''))}
                  icon={<UserIcon size={15} />}
                  required
                />
                <Input
                  label="Recovery Code"
                  type="text"
                  placeholder="xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx"
                  value={recoveryCode}
                  onChange={(e) => setRecoveryCode(e.target.value)}
                  icon={<KeyIcon size={15} />}
                  required
                />
                <Button type="submit" variant="primary" fullWidth size="lg" loading={verifyLoading}>
                  {verifyLoading ? 'Verifying...' : 'Verify'}
                </Button>
              </form>

              <button
                onClick={goToLogin}
                className="mt-4 flex items-center gap-1.5 text-sm text-green-interactive hover:text-green-primary transition-colors mx-auto">
                <ArrowLeftIcon size={14} />
                Back to Sign In
              </button>
            </>
          )}

          {/* ────────────────── STEP 2: RESET PASSWORD ────────────────── */}
          {step === 'reset' && (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold dark:text-dark-text text-light-text">
                  Reset Password
                </h1>
                <p className="text-sm dark:text-dark-muted text-light-muted mt-1">
                  Hi <span className="font-semibold dark:text-dark-text text-light-text">{verifiedName}</span>, enter your new password below
                </p>
              </div>

              {resetError && (
                <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {resetError}
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4" noValidate>
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text transition-colors"
                      aria-label={showNew ? 'Hide password' : 'Show password'}>
                      {showNew ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium dark:text-dark-text text-light-text">
                    Confirm Password
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text transition-colors"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                      {showConfirm ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />}
                    </button>
                  </div>
                </div>

                <Button type="submit" variant="primary" fullWidth size="lg" loading={resetLoading}>
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </form>
            </>
          )}

          {/* ────────────────── STEP 3: SUCCESS + NEW CODE ────────────────── */}
          {step === 'success' && (
            <>
              <div className="flex flex-col items-center mb-6">
                <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mb-4">
                  <ShieldCheckIcon size={28} className="text-green-400" />
                </div>
                <h1 className="text-xl font-bold dark:text-dark-text text-light-text text-center">
                  Password Reset Successfully
                </h1>
                <p className="text-sm dark:text-dark-muted text-light-muted mt-1 text-center">
                  Your new recovery code is shown below.
                  <br />
                  <span className="text-red-400 font-semibold">Save it now — it will not be shown again.</span>
                </p>
              </div>

              <div className="mb-4 p-3 rounded-lg dark:bg-dark-card2 bg-gray-50 border dark:border-dark-border border-light-border">
                <p className="text-xs dark:text-dark-muted text-light-muted mb-1 uppercase tracking-wide font-semibold">
                  New Recovery Code
                </p>
                <p className="text-sm font-mono dark:text-green-400 text-green-600 break-all select-all leading-relaxed">
                  {newRecoveryCode}
                </p>
              </div>

              <button
                onClick={copyCode}
                className="w-full mb-4 flex items-center justify-center gap-2 px-3 py-2 rounded-btn text-sm font-medium dark:bg-dark-card2 dark:border-dark-border dark:text-dark-text dark:hover:bg-dark-border/50 bg-gray-100 border border-light-border text-light-text hover:bg-gray-200 transition-colors">
                {copied ? (
                  <><CheckCircleIcon size={15} className="text-green-400" /> Copied!</>
                ) : (
                  <><ClipboardCopyIcon size={15} /> Copy Code</>
                )}
              </button>

              <Button variant="primary" fullWidth size="lg" onClick={goToLogin}>
                Back to Sign In
              </Button>
            </>
          )}
        </div>

        <p className="text-center text-xs dark:text-dark-subtle text-light-subtle mt-6">
          © 2026 Maptech Information Solutions Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
}
