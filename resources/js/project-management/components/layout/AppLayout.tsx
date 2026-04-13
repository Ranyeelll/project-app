import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
interface AppLayoutProps {
  children: React.ReactNode;
}
export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile toggle
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // Desktop hover expand
  const HOVER_EXPAND_DELAY_MS = 90;
  const HOVER_COLLAPSE_DELAY_MS = 180;
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearHoverTimer();
    };
  }, [clearHoverTimer]);

  const handleSidebarMouseEnter = useCallback(() => {
    clearHoverTimer();
    hoverTimeoutRef.current = setTimeout(() => {
      setSidebarExpanded(true);
      hoverTimeoutRef.current = null;
    }, HOVER_EXPAND_DELAY_MS);
  }, [clearHoverTimer]);

  const handleSidebarMouseLeave = useCallback(() => {
    clearHoverTimer();
    hoverTimeoutRef.current = setTimeout(() => {
      setSidebarExpanded(false);
      hoverTimeoutRef.current = null;
    }, HOVER_COLLAPSE_DELAY_MS);
  }, [clearHoverTimer]);

  return (
    <div className="flex h-screen w-full overflow-hidden dark:bg-dark-bg bg-light-bg">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        isExpanded={sidebarExpanded}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      />
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6">{children}</main>
      </div>
    </div>);

}