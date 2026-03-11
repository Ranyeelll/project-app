import React, { useState, useEffect, useRef } from 'react';
import {
  EyeIcon,
  EyeOffIcon,
  SunIcon,
  MoonIcon,
  LockIcon,
  MailIcon } from
'lucide-react';
import { useAuth, useTheme, useNavigation } from '../context/AppContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
export function LoginPage() {
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { setCurrentPage } = useNavigation();
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mainVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    // Preview plays via autoPlay — no JS needed, browser starts it immediately.
    // Only wire up the canplay listener for the main video fade-in.
    const main = mainVideoRef.current;
    const preview = videoRef.current;
    if (!main) return;

    const onCanPlay = () => {
      main.style.opacity = '1';
    };
    main.addEventListener('canplay', onCanPlay, { once: true });

    return () => {
      main.removeEventListener('canplay', onCanPlay);
      try { main.pause(); } catch (e) {}
      try { preview?.pause(); } catch (e) {}
    };
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-black">
      {/* Preview video — tiny (0.26 MB), plays immediately while main loads */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-0"
        ref={videoRef}
      >
        <source src="/login-embed2-preview.mp4" type="video/mp4" />
      </video>
      {/* Main video — fades in once buffered, replacing the preview */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="absolute inset-0 w-full h-full object-cover z-[1] transition-opacity duration-[1500ms]"
        style={{ opacity: 0 }}
        ref={mainVideoRef}
      >
        <source src="/login-embed2.mp4" type="video/mp4" />
      </video>
      {/* Dark overlay so the form stays readable */}
      <div className="absolute inset-0 z-[2] bg-black/50 dark:bg-black/60" />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-lg dark:bg-dark-card dark:border-dark-border dark:text-dark-muted dark:hover:text-dark-text bg-light-card border border-light-border text-light-muted hover:text-light-text transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>

          {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
        </button>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <img
            src="/Maptech_Official_Logo_version2_(1).png"
            alt="Maptech Information Solutions Inc."
            className="h-20 w-auto object-contain brightness-150 drop-shadow-lg" />
          <p className="mt-2 text-sm font-medium tracking-wide text-white/80 text-center drop-shadow-md">
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
                onClick={() => setCurrentPage('forgot-password')}
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

          {}
        </div>

        <p className="text-center text-xs text-white/50 mt-6 drop-shadow-sm">
          © 2026 Maptech Information Solutions Inc. All rights reserved.
        </p>
      </div>
    </div>);

}