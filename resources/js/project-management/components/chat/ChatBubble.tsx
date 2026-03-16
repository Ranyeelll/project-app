import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircleIcon, XIcon, ChevronLeftIcon, SendIcon, UserIcon, FolderKanbanIcon } from 'lucide-react';
import { useData, useAuth } from '../../context/AppContext';

interface ChatMessage {
  id: number;
  message_text: string | null;
  sender_id: number;
  created_at: string;
  conversation_id?: number | null;
  project_id?: number | null;
}

interface ConvItem {
  id: string; // "project-{id}" or "dm-{id}"
  label: string;
  unreadCount: number;
  lastMessage?: ChatMessage;
  latestTime?: string;
  type: 'project' | 'dm';
  projectId?: number;
  conversationId?: number;
  otherUser?: { id: number; name: string; profile_photo: string | null };
}

export function ChatBubble() {
  const { projects, users } = useData();
  const { currentUser } = useAuth();
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<ConvItem | null>(null);
  const [items, setItems] = useState<ConvItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [notifCount, setNotifCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserId = currentUser ? Number(currentUser.id) : 0;

  // ── Load all conversations (project + DM) ──────────────────────
  const loadAll = useCallback(async () => {
    if (!currentUser) return;

    const myProjects = projects.filter((p) =>
      currentUser.role === 'admin' || p.managerId === currentUser.id || (p.teamIds ?? []).includes(currentUser.id)
    );

    const projectItems: ConvItem[] = await Promise.all(
      myProjects.map(async (p) => {
        try {
          const res = await fetch(`/api/projects/${p.id}/messages?limit=1`);
          const msgs: ChatMessage[] = await res.json();
          const unread = msgs.filter((m) => {
            const rb = typeof (m as any).read_by === 'string' ? JSON.parse((m as any).read_by) : ((m as any).read_by ?? []);
            return !rb.includes(currentUserId);
          }).length;
          return { id: `project-${p.id}`, label: p.name, unreadCount: unread, lastMessage: msgs[0], latestTime: msgs[0]?.created_at, type: 'project' as const, projectId: Number(p.id) };
        } catch {
          return { id: `project-${p.id}`, label: p.name, unreadCount: 0, type: 'project' as const, projectId: Number(p.id) };
        }
      })
    );

    try {
      const dmRes = await fetch(`/api/direct-conversations?user_id=${currentUserId}`);
      const dms = await dmRes.json();
      const dmItems: ConvItem[] = dms.map((d: any) => ({
        id: `dm-${d.id}`,
        label: d.other_user?.name ?? 'Unknown',
        unreadCount: d.unread_count ?? 0,
        lastMessage: d.last_message ?? undefined,
        latestTime: d.last_message?.created_at,
        type: 'dm' as const,
        conversationId: d.id,
        otherUser: d.other_user,
      }));
      const all = [...projectItems, ...dmItems].sort((a, b) => (b.latestTime ?? '').localeCompare(a.latestTime ?? ''));
      setItems(all);
      setTotalUnread(all.reduce((s, i) => s + i.unreadCount, 0));
    } catch {
      const all = projectItems.sort((a, b) => (b.latestTime ?? '').localeCompare(a.latestTime ?? ''));
      setItems(all);
      setTotalUnread(all.reduce((s, i) => s + i.unreadCount, 0));
    }

    // Chat notification count
    try {
      const nRes = await fetch(`/api/notifications?user_id=${currentUserId}`);
      const notifs = await nRes.json();
      setNotifCount(notifs.filter((n: any) => !n.is_read).length);
    } catch {}
  }, [currentUser, projects, currentUserId]);

  useEffect(() => {
    if (projects.length > 0) loadAll();
  }, [projects, loadAll]);

  // ── Fetch messages for selected conversation ───────────────────
  const fetchMessages = useCallback(async (after?: number) => {
    if (!selected) return;
    try {
      const url = selected.type === 'project'
        ? `/api/projects/${selected.projectId}/messages${after ? `?after=${after}` : ''}`
        : `/api/direct-conversations/${selected.conversationId}/messages${after ? `?after=${after}` : ''}`;
      const res = await fetch(url);
      const data: ChatMessage[] = await res.json();
      if (data.length > 0) {
        if (after) {
          setMessages((prev) => [...prev, ...data.filter((m) => !prev.some((p) => p.id === m.id))]);
        } else {
          setMessages(data);
        }
        lastIdRef.current = Math.max(...data.map((m) => m.id));
      }
    } catch {}
  }, [selected]);

  // Initial load and polling
  useEffect(() => {
    if (selected && isOpen) {
      lastIdRef.current = 0;
      fetchMessages();

      // Try Echo subscription
      const echo = (window as any).Echo;
      let echoActive = false;
      if (echo) {
        try {
          if (selected.type === 'project') {
            echo.join(`project.${selected.projectId}`)
              .listen('.message.sent', (data: any) => {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === data.message.id)) return prev;
                  return [...prev, data.message];
                });
              });
          } else {
            echo.private(`user.${currentUserId}`)
              .listen('.dm.sent', (data: any) => {
                if (data.message.conversation_id !== selected.conversationId) return;
                setMessages((prev) => {
                  if (prev.some((m) => m.id === data.message.id)) return prev;
                  return [...prev, data.message];
                });
              });
          }
          echoActive = true;
        } catch {}
      }

      // Polling fallback when Echo not active
      if (!echoActive) {
        pollRef.current = setInterval(() => fetchMessages(lastIdRef.current), 3000);
      }

      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
        if (echo && echoActive) {
          if (selected.type === 'project') echo.leave(`project.${selected.projectId}`);
          else echo.leave(`user.${currentUserId}`);
        }
      };
    }
  }, [selected, isOpen, fetchMessages, currentUserId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !selected) return;
    setLoading(true);
    try {
      const isProject = selected.type === 'project';
      const url = isProject
        ? `/api/projects/${selected.projectId}/messages`
        : `/api/direct-conversations/${selected.conversationId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ sender_id: currentUserId, message_text: newMessage }),
      });
      if (res.ok) {
        setNewMessage('');
        await fetchMessages(lastIdRef.current);
      }
    } catch {}
    setLoading(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const getUserName = (userId: number) => users.find((u) => Number(u.id) === userId)?.name ?? 'Unknown';

  if (!currentUser) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Unread badge */}
      {totalUnread > 0 && !isOpen && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold animate-pulse z-10">
          {totalUnread > 99 ? '99+' : totalUnread}
        </span>
      )}

      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 rounded-full dark:bg-green-primary bg-green-600 text-black shadow-lg hover:shadow-xl transition-all flex items-center justify-center hover:scale-110"
          title="Open Chat"
        >
          <MessageCircleIcon size={28} />
        </button>
      ) : (
        <div className="w-96 h-screen max-h-[600px] dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-lg shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="dark:bg-dark-bg dark:border-dark-border bg-gray-50 border-b border-light-border px-4 py-3 flex items-center justify-between flex-shrink-0">
            {selected ? (
              <>
                <button onClick={() => setSelected(null)} className="p-1 hover:dark:bg-dark-card2 hover:bg-gray-200 rounded transition-colors">
                  <ChevronLeftIcon size={20} className="dark:text-dark-muted text-light-muted" />
                </button>
                <h3 className="font-semibold dark:text-dark-text text-light-text truncate flex-1 text-center text-sm">
                  {selected.label}
                </h3>
              </>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <h3 className="font-semibold dark:text-dark-text text-light-text text-sm">Messages</h3>
                {totalUnread > 0 && (
                  <span className="bg-red-500/15 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalUnread}</span>
                )}
              </div>
            )}
            <button
              onClick={() => { setIsOpen(false); setSelected(null); }}
              className="p-1 hover:dark:bg-dark-card2 hover:bg-gray-200 rounded transition-colors"
            >
              <XIcon size={20} className="dark:text-dark-muted text-light-muted" />
            </button>
          </div>

          {/* Conversations list */}
          {!selected ? (
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full dark:text-dark-subtle text-light-subtle text-sm gap-2">
                  <MessageCircleIcon size={32} className="opacity-30" />
                  No conversations yet
                </div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="w-full px-4 py-3 border-b dark:border-dark-border border-light-border hover:dark:bg-dark-card2 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {item.type === 'dm' ? (
                          <UserIcon size={12} className="dark:text-dark-subtle text-light-subtle flex-shrink-0" />
                        ) : (
                          <FolderKanbanIcon size={12} className="dark:text-dark-subtle text-light-subtle flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium dark:text-dark-text text-light-text text-sm truncate">{item.label}</p>
                          {item.lastMessage && (
                            <p className="text-xs dark:text-dark-subtle text-light-subtle truncate mt-0.5">
                              {item.type === 'project' ? `${getUserName(item.lastMessage.sender_id)}: ` : ''}{item.lastMessage.message_text ?? '[attachment]'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right ml-2 flex-shrink-0">
                        {item.unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {item.unreadCount > 9 ? '9+' : item.unreadCount}
                          </span>
                        )}
                        {item.latestTime && (
                          <p className="text-xs dark:text-dark-subtle text-light-subtle mt-1">{formatTime(item.latestTime)}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Messages view */
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full dark:text-dark-subtle text-light-subtle text-sm gap-1">
                    <MessageCircleIcon size={28} className="opacity-30" />
                    No messages yet
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId;
                    return (
                      <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${isOwn ? 'dark:bg-green-primary bg-green-600 text-black' : 'dark:bg-dark-bg bg-gray-100 dark:text-dark-text text-light-text'}`}>
                          {!isOwn && selected.type === 'project' && (
                            <p className="text-[10px] font-semibold mb-0.5 opacity-70">{getUserName(msg.sender_id)}</p>
                          )}
                          <p className="break-words">{msg.message_text ?? '[attachment]'}</p>
                          <p className={`text-xs mt-1 ${isOwn ? 'opacity-60' : 'dark:text-dark-subtle text-light-subtle'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="dark:bg-dark-bg dark:border-dark-border bg-gray-50 border-t border-light-border px-3 py-3 flex gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Type a message…"
                  className="flex-1 px-3 py-2 text-xs rounded-lg dark:bg-dark-card dark:border-dark-border dark:text-dark-text bg-white border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50"
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !newMessage.trim()}
                  className="p-2 rounded-lg dark:bg-green-primary bg-green-600 text-black hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  <SendIcon size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
