import React, { useState } from 'react';
import {
  EyeIcon,
  EyeOffIcon,
  SunIcon,
  MoonIcon,
  LockIcon,
  MailIcon } from
'lucide-react';
import { useAuth, useTheme } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
export function LoginPage() {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      // Navigation is handled automatically by AppContext
      // once currentUser is set from the API response
    } else {
      setError(result.error || 'Login failed.');
    }
  };
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

      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <img
            src="/Maptech_Official_Logo_version2_(1).png"
            alt="Maptech Information Solutions Inc."
            className="h-20 w-auto object-contain"
            style={{
              filter: isDark ? 'brightness(1.5) contrast(1.1)' : 'brightness(1)'
            }} />
          <p className="mt-2 text-sm font-medium tracking-wide dark:text-dark-muted text-gray-500 text-center">
            Maptech Information Solutions Inc.
          </p>
        </div>

        <div className="dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-modal p-8 shadow-card-dark">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-xl font-bold dark:text-dark-text text-light-text">
              Project Management System
            </h1>
            <p className="text-sm dark:text-dark-muted text-light-muted mt-1">
              Sign in to your account to continue
            </p>
          </div>

          {/* Error */}
          {error &&
          <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          }

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <Input
              label="Email Address"
              type="email"
              placeholder="you@maptech.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<MailIcon size={15} />}
              autoComplete="email"
              required />


            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium dark:text-dark-text text-light-text">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 dark:text-dark-muted text-light-muted">
                  <LockIcon size={15} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-btn text-sm dark:bg-dark-card2 dark:border-dark-border dark:text-dark-text dark:placeholder-dark-subtle bg-white border-light-border text-light-text placeholder-light-subtle border px-3 py-2.5 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-green-primary/50 focus:border-green-primary transition-colors" />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 dark:text-dark-muted dark:hover:text-dark-text text-light-muted hover:text-light-text transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}>

                  {showPassword ?
                  <EyeOffIcon size={15} /> :

                  <EyeIcon size={15} />
                  }
                </button>
              </div>
            </div>

            {/* Remember me + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border dark:border-dark-border border-light-border accent-green-primary" />

                <span className="text-sm dark:text-dark-muted text-light-muted">
                  Remember me
                </span>
              </label>
              <button
                type="button"
                className="text-sm text-green-interactive hover:text-green-primary transition-colors">

                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              loading={loading}>

              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Demo credentials removed */}
        </div>

        <p className="text-center text-xs dark:text-dark-subtle text-light-subtle mt-6">
          © 2025 Maptech Information Solutions Inc. All rights reserved.
        </p>
      </div>
    </div>);

}