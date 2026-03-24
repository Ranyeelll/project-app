import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderKanbanIcon,
  UserIcon,
  SearchIcon,
  PlusIcon,
} from 'lucide-react';
import { useAuth, useData } from '../context/AppContext';
import { Project, User } from '../data/mockData';
import { ProjectChat } from '../components/chat/ProjectChat';
import { DirectChat } from '../components/chat/DirectChat';
import { isElevatedRole } from '../utils/roles';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DmConversation {
  id: number;
  other_user: {
    id: number;
    name: string;
    profile_photo: string | null;
    position?: string;
    department?: string;
  } | null;
  last_message: { message_text: string | null; created_at: string; sender_id: number } | null;
  unread_count: number;
  updated_at: string;
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'now';
  if (diff < 60) return `${diff}m`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h`;
  return `${Math.floor(diff / 1440)}d`;
}

function SmallAvatar({ name, photo }: { name: string; photo?: string | null }) {
  if (photo) return <img src={photo} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />;
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0" style={{ backgroundColor: '#63D44A' }}>
      {initials}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProjectChatPage() {
  const { currentUser } = useAuth();
  const { projects, users } = useData();
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const [tab, setTab] = useState<'project' | 'direct'>('project');
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [activeConv, setActiveConv] = useState<DmConversation | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [dmLoading, setDmLoading] = useState(false);

  const currentUserId = currentUser ? Number(currentUser.id) : 0;

  const myProjects = projects.filter((p) => {
    if (!currentUser) return false;
    if (isElevatedRole(currentUser.role)) return true;
    return p.managerId === currentUser.id || (p.teamIds ?? []).includes(currentUser.id);
  });

  const loadConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/direct-conversations?user_id=${currentUserId}`);
      if (!res.ok) return;
      setConversations(await res.json());
    } catch (_) {}
  }, [currentUser, currentUserId]);

  useEffect(() => {
    loadConversations();
    const iv = setInterval(loadConversations, 5000);
    return () => clearInterval(iv);
  }, [loadConversations]);

  const searchResults = userSearch.trim()
    ? users.filter((u) => u.id !== currentUser?.id && u.name.toLowerCase().includes(userSearch.toLowerCase()))
    : [];

  const startDmWith = async (user: User) => {
    setDmLoading(true);
    try {
      const res = await fetch('/api/direct-conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ user_id: currentUserId, other_user_id: Number(user.id) }),
      });
      const data = await res.json();
      setUserSearch('');
      await loadConversations();
      setActiveConv({ id: data.id, other_user: data.other_user, last_message: null, unread_count: 0, updated_at: new Date().toISOString() });
    } catch (_) {} finally { setDmLoading(false); }
  };

  const totalDmUnread = conversations.reduce((s, c) => s + c.unread_count, 0);
  const hasActiveChat = tab === 'project' ? !!activeProject : !!activeConv;

  if (!currentUser) return null;

  return (
    <div className="flex h-full rounded-xl overflow-hidden border dark:border-dark-border border-light-border">

      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside className={`flex-shrink-0 dark:bg-dark-card bg-white border-r dark:border-dark-border border-light-border flex flex-col w-full sm:w-64 ${hasActiveChat ? 'hidden sm:flex' : 'flex'}`}>

        {/* Tabs */}
        <div className="flex flex-shrink-0 border-b dark:border-dark-border border-light-border">
          {(['project', 'direct'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative flex-1 py-3 text-xs font-semibold capitalize transition-colors ${tab === t ? 'dark:text-dark-text text-light-text border-b-2 border-green-primary' : 'dark:text-dark-muted text-light-muted'}`}
            >
              {t === 'project' ? 'Projects' : 'Direct'}
              {t === 'direct' && totalDmUnread > 0 && (
                <span className="ml-1 inline-flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[14px] h-3.5 px-1">
                  {totalDmUnread > 9 ? '9+' : totalDmUnread}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === 'project' ? (
          /* Project list */
          <div className="flex-1 overflow-y-auto py-1">
            {myProjects.length === 0 ? (
              <p className="text-xs text-center mt-8 dark:text-dark-muted text-light-muted px-4">No projects assigned yet.</p>
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
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${p.status === 'active' ? 'bg-green-400' : p.status === 'on-hold' ? 'bg-yellow-400' : p.status === 'completed' ? 'bg-blue-400' : 'bg-gray-400'}`} />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs opacity-60 capitalize">{p.status.replace('-', ' ')}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          /* Direct Messages list */
          <div className="flex flex-col flex-1 min-h-0">
            {/* User search */}
            <div className="px-3 py-2.5 border-b dark:border-dark-border border-light-border flex-shrink-0">
              <div className="relative">
                <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 dark:text-dark-muted text-light-muted pointer-events-none" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search people to message…"
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text dark:placeholder-dark-subtle bg-gray-50 border border-light-border text-light-text placeholder-light-subtle focus:outline-none focus:ring-1 focus:ring-green-primary/50"
                />
              </div>
            </div>

            {/* Search results */}
            {userSearch.trim() && (
              <div className="flex-shrink-0 max-h-48 overflow-y-auto border-b dark:border-dark-border border-light-border">
                {searchResults.length === 0 ? (
                  <p className="text-xs px-4 py-3 dark:text-dark-muted text-light-muted">No users found</p>
                ) : (
                  searchResults.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => !dmLoading && startDmWith(u)}
                      disabled={dmLoading}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:dark:bg-dark-card2 hover:bg-light-card2 transition-colors text-left"
                    >
                      <SmallAvatar name={u.name} photo={u.profilePhoto} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium dark:text-dark-text text-light-text truncate">{u.name}</p>
                        <p className="text-[10px] dark:text-dark-subtle text-light-subtle truncate">{u.position} · {u.department}</p>
                      </div>
                      <PlusIcon size={13} className="flex-shrink-0 text-green-primary" />
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto py-1">
              {conversations.length === 0 && !userSearch.trim() && (
                <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center dark:text-dark-muted text-light-muted">
                  <UserIcon size={24} className="opacity-30" />
                  <p className="text-xs">Search above to start a new conversation</p>
                </div>
              )}
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => { setActiveConv(conv); setUserSearch(''); }}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left transition ${activeConv?.id === conv.id ? 'bg-green-primary/10 border-r-2 border-green-primary' : 'hover:dark:bg-dark-card2 hover:bg-light-card2'}`}
                >
                  <SmallAvatar name={conv.other_user?.name ?? '?'} photo={conv.other_user?.profile_photo} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium dark:text-dark-text text-light-text truncate">{conv.other_user?.name ?? 'Unknown'}</p>
                    <p className="text-xs dark:text-dark-subtle text-light-subtle truncate mt-0.5">
                      {conv.last_message?.message_text ?? 'No messages yet'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {conv.last_message && (
                      <span className="text-[10px] dark:text-dark-subtle text-light-subtle">{timeAgo(conv.last_message.created_at)}</span>
                    )}
                    {conv.unread_count > 0 && (
                      <span className="inline-flex items-center justify-center bg-green-primary text-black text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1">
                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── Main chat area ────────────────────────────────────────── */}
      <div className={`min-w-0 flex-col flex-1 ${hasActiveChat ? 'flex' : 'hidden sm:flex'}`}>
        {tab === 'project' && activeProject ? (
          <ProjectChat project={activeProject} onClose={() => setActiveProject(null)} />
        ) : tab === 'direct' && activeConv ? (
          <DirectChat
            conversationId={activeConv.id}
            otherUser={{
              id: activeConv.other_user?.id ?? 0,
              name: activeConv.other_user?.name ?? 'Unknown',
              profile_photo: activeConv.other_user?.profile_photo ?? null,
              position: activeConv.other_user?.position,
              department: activeConv.other_user?.department,
            }}
            onClose={() => setActiveConv(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full dark:text-dark-muted text-light-muted gap-4">
            {tab === 'project' ? (
              <>
                <FolderKanbanIcon size={48} className="opacity-20" />
                <div className="text-center">
                  <p className="font-semibold text-base">Select a project to start chatting</p>
                  <p className="text-sm opacity-60 mt-1">Real-time messaging with your project team</p>
                </div>
              </>
            ) : (
              <>
                <UserIcon size={48} className="opacity-20" />
                <div className="text-center">
                  <p className="font-semibold text-base">Search for a team member</p>
                  <p className="text-sm opacity-60 mt-1">Send private messages to anyone in your organization</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
