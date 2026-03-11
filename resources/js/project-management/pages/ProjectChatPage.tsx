import React, { useState } from 'react';
import { MessageSquareIcon, FolderKanbanIcon, ArrowLeftIcon } from 'lucide-react';
import { useAuth, useData } from '../context/AppContext';
import { Project } from '../data/mockData';
import { ProjectChat } from '../components/chat/ProjectChat';

export function ProjectChatPage() {
  const { currentUser } = useAuth();
  const { projects } = useData();
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Filter projects visible to the current user
  const myProjects = projects.filter((p) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return (
      p.managerId === currentUser.id ||
      (p.teamIds ?? []).includes(currentUser.id)
    );
  });

  return (
    <div className="flex h-full gap-0 rounded-xl overflow-hidden border dark:border-dark-border border-light-border">

      {/* Project list sidebar
          Mobile: full width, hidden when a project is active
          Desktop (sm+): fixed w-60, always visible */}
      <aside className={`
        flex-shrink-0 dark:bg-dark-card bg-white border-r dark:border-dark-border border-light-border flex flex-col
        w-full sm:w-60
        ${activeProject ? 'hidden sm:flex' : 'flex'}
      `}>
        <div className="px-4 py-3 border-b dark:border-dark-border border-light-border">
          <h2 className="font-semibold text-sm dark:text-dark-text text-light-text flex items-center gap-2">
            <MessageSquareIcon size={15} />
            Project Chats
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {myProjects.length === 0 ? (
            <p className="text-xs text-center mt-8 dark:text-dark-muted text-light-muted px-4">
              No projects assigned yet.
            </p>
          ) : (
            myProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProject(p)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition text-sm ${
                  activeProject?.id === p.id
                    ? 'bg-green-primary/10 border-r-2 border-green-primary dark:text-dark-text text-light-text'
                    : 'dark:text-dark-muted dark:hover:bg-dark-card2 text-light-muted hover:bg-light-card2'
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    p.status === 'active' ? 'bg-green-400' :
                    p.status === 'on-hold' ? 'bg-yellow-400' :
                    p.status === 'completed' ? 'bg-blue-400' : 'bg-gray-400'
                  }`}
                />
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-xs opacity-60 capitalize">{p.status.replace('-', ' ')}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat area
          Mobile: full width, hidden when no project is active
          Desktop: flex-1 always visible */}
      <div className={`min-w-0 flex-col flex-1 ${activeProject ? 'flex' : 'hidden sm:flex'}`}>
        {activeProject ? (
          <ProjectChat
            project={activeProject}
            onClose={() => setActiveProject(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full dark:text-dark-muted text-light-muted gap-4">
            <FolderKanbanIcon size={48} className="opacity-20" />
            <div className="text-center">
              <p className="font-semibold text-base">Select a project to start chatting</p>
              <p className="text-sm opacity-60 mt-1">
                Real-time messaging with your project team
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
