import React, { useState, useEffect, useRef } from 'react';

// Tiny 80×45 JPEG embedded as base64 — no network request, fills background the instant React renders
const POSTER_B64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAAQABAAD//gAQTGF2YzYyLjExLjEwMAD/2wBDAgUFBcUFxsbGxsbGyAeICEhISAgICAhISEkJCQqKiokJCQhISQkKCgqKi4vLisrKisvLzIyMjw8OTlGRkhWVmf/xAByAAEAAgMBAQAAAAAAAAAAAAAEAwUCAQYABwEAAwEBAAAAAAAAAAAAAAAAAgQBAAMQAAICAQMEAAcBAQAAAAAAAAEAAhEDEiExBLFBYTKB0VGhwfATUhEBAQEAAQUBAAAAAAAAAAAAAAERAhIhoWFRQf/AABEIAC0AUAMBIgACEQADEQD/2gAMAwEAAhEDEQA/APi0JU2nxD2OzShs8ctJHb9fV4kuSQNjBxzYv85XHeEt4n9H2xRNOjluzY+pdL0IzY5SsbB4jqIaJEK8XWTxxoFpcmQzNrfKzC8l0EpCrN8JCQqGoGU5ZiWAtd2AUxKMXV+OGUGqcrpcOfTtIaonkHhTPHA74pWP+T8Q+rz2u1INOKdOXZ29fhOqvSmAu5eB3dxyTrYj5i+7NLqJSGmYBA9cJgu/PIWQxA5s+S0xZpcsKBmTETESspPKNNdRqNA+Df4ctxX4Y3zhJgVGpC7YmG6nepIqkTohv9wB9kg48JORpAy/3Zy4sIy4+TqZEi14cy4OP//Z';
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
  const { login, verify2fa } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { setCurrentPage } = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [tfaCode, setTfaCode] = useState('');
  // playful evasive button offsets when user clicks empty submit
  const [btnOffset, setBtnOffset] = useState({ x: 0, y: 0 });
  const [btnShaking, setBtnShaking] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      // trigger evasive movement
      const max = 140; // px
      const rx = Math.floor((Math.random() - 0.5) * 2 * max);
      const ry = Math.floor((Math.random() - 0.5) * 2 * 20);
      setBtnOffset({ x: rx, y: ry });
      setBtnShaking(true);
      setTimeout(() => {
        setBtnShaking(false);
      }, 800);
      return;
    }
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      // Navigation is handled automatically by AppContext
      // once currentUser is set from the API response
    } else if (result.requires2fa) {
      setNeeds2fa(true);
      setError('');
    } else {
      setError(result.error || 'Login failed.');
    }
  };
  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tfaCode || tfaCode.length !== 6) {
      setError('Please enter a 6-digit code.');
      return;
    }
    setError('');
    setLoading(true);
    const result = await verify2fa(tfaCode);
    setLoading(false);
    if (!result.success) {
      setError(result.error || 'Invalid code. Please try again.');
    }
  };
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fullVideoRef = useRef<HTMLVideoElement | null>(null);
  const [fullVideoReady, setFullVideoReady] = useState(false);

  useEffect(() => {
    const preview = videoRef.current;
    if (!preview) return;

    // Preview is already in browser cache (preloaded via <head>), play immediately.
    preview.play().catch(() => {});

    // Once the preview is playing, start buffering the full-quality video silently.
    const onPlaying = () => {
      const full = fullVideoRef.current;
      if (!full) return;
      full.addEventListener('canplaythrough', () => {
        full.play().catch(() => {});
        setFullVideoReady(true);
      }, { once: true });
      full.load();
    };
    preview.addEventListener('playing', onPlaying, { once: true });

    return () => {
      preview.removeEventListener('playing', onPlaying);
      try { preview.pause(); } catch (e) {}
    };
  }, []);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: '#000', backgroundImage: `url('${POSTER_B64}')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      {/* Preview video — plays immediately from cache, stays underneath */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={POSTER_B64}
        className="absolute inset-0 w-full h-full object-cover z-0"
        ref={videoRef}
      >
        <source src="/login-embed2-preview.mp4" type="video/mp4" />
      </video>
      {/* Full-quality video — buffered silently, fades in over the preview once ready */}
      <video
        loop
        muted
        playsInline
        preload="auto"
        ref={fullVideoRef}
        className="absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-1000"
        style={{ opacity: fullVideoReady ? 1 : 0 }}
      >
        <source src="/login-embed2.mp4" type="video/mp4" />
      </video>
      {/* Dark overlay so the form stays readable */}
      <div className="absolute inset-0 z-[1] bg-black/50 dark:bg-black/60" />

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

          {needs2fa ? (
            <form onSubmit={handle2faSubmit} className="space-y-4" noValidate>
              <p className="text-sm dark:text-dark-muted text-light-muted">
                Enter the 6-digit code from your authenticator app.
              </p>
              <Input
                label="Authentication Code"
                type="text"
                placeholder="000000"
                value={tfaCode}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setTfaCode(v);
                  setError('');
                }}
                icon={<LockIcon size={15} />}
                autoComplete="one-time-code"
                required />

              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                loading={loading}
              >
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
              <button
                type="button"
                onClick={() => { setNeeds2fa(false); setTfaCode(''); setError(''); }}
                className="text-sm text-green-interactive hover:text-green-primary transition-colors w-full text-center">
                Back to login
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email */}
            <Input
              label="Email Address"
              type="email"
              placeholder="you@maptech.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                // return button to original position while user types
                setBtnOffset({ x: 0, y: 0 });
                setError('');
              }}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    // return button to original position while user types
                    setBtnOffset({ x: 0, y: 0 });
                    setError('');
                  }}
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

            {/* Forgot password link */}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setCurrentPage('forgot-password')}
                className="text-sm text-green-interactive hover:text-green-primary transition-colors">
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <div className="relative">
              <div
                style={{
                  transform: `translate(${btnOffset.x}px, ${btnOffset.y}px)`,
                  transition: btnShaking ? 'transform 0.12s ease' : 'transform 0.36s cubic-bezier(.2,.9,.2,1)'
                }}
                className="w-full"
              >
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  size="lg"
                  loading={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </div>
            </div>
          </form>
          )}

          {}
        </div>

        <p className="text-center text-xs text-white/50 mt-6 drop-shadow-sm">
          © 2026 Maptech Information Solutions Inc. All rights reserved.
        </p>
      </div>
    </div>);

}