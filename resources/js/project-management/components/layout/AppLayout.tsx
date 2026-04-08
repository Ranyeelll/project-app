import React, { useState, useCallback, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
interface AppLayoutProps {
  children: React.ReactNode;
}
export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile toggle
  const [sidebarExpanded, setSidebarExpanded] = useState(false); // Desktop hover expand
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSidebarMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setSidebarExpanded(true);
  }, []);

  const handleSidebarMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setSidebarExpanded(false);
    }, 150);
  }, []);

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
      {/* Main content shifts when sidebar expands */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-[margin] duration-200 ease-out ${sidebarExpanded ? 'lg:ml-64' : 'lg:ml-16'}`}>
        <Header onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-6">{children}</main>
      </div>
    </div>);

}