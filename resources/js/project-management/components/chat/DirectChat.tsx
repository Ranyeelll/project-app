import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  SendIcon,
  PaperclipIcon,
  XIcon,
  ReplyIcon,
  DownloadIcon,
  TrashIcon,
  CheckCheckIcon,
  FileIcon,
  ImageIcon,
  PencilIcon,
  CornerUpRightIcon,
  ArrowLeftIcon,
  MessageSquareIcon,
  Share2Icon,
} from 'lucide-react';
import { useAuth } from '../../context/AppContext';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttachmentMeta {
  name: string;
  path: string;
  size: number;
  mime: string;
  extension: string;
}

interface ChatSender {
  id: number;
  name: string;
  profile_photo: string | null;
}

interface DmMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  message_text: string | null;
  attachments_meta: AttachmentMeta[];
  metadata: { edited?: boolean; edited_at?: string; forwarded_from?: { id: number; sender_name: string; text: string }; [key: string]: unknown };
  reply_to_id: number | null;
  read_by: number[];
  created_at: string;
  sender: ChatSender | null;
  reply_to: { id: number; message_text: string | null; sender: { id: number; name: string } | null } | null;
  _optimistic?: boolean;
}

interface OtherUser {
  id: number;
  name: string;
  profile_photo: string | null;
  position?: string;
  department?: string;
}

interface DirectChatProps {
  conversationId: number;
  otherUser: OtherUser;
  onClose?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString();
}

function sameDay(a: string, b: string | null): boolean {
  if (!b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function Avatar({ user, size = 8 }: { user: { name: string; profile_photo?: string | null }; size?: number }) {
  if (user.profile_photo) {
    return (
      <img
        src={user.profile_photo}
        alt={user.name}
        className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  const initials = user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-xs font-bold text-black flex-shrink-0`}
      style={{ backgroundColor: '#63D44A' }}
    >
      {initials}
    </div>
  );
}

// ─── DirectChat Component ─────────────────────────────────────────────────────

export function DirectChat({ conversationId, otherUser, onClose }: DirectChatProps) {
  const { currentUser } = useAuth();
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [replyTo, setReplyTo] = useState<DmMessage | null>(null);
  const [forwardOf, setForwardOf] = useState<DmMessage | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isEchoConnected, setIsEchoConnected] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastIdRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadingRef = useRef<boolean>(false);

  const currentUserId = currentUser ? Number(currentUser.id) : 0;

  // ── Load messages ──────────────────────────────────────────────
  const loadMessages = useCallback(async (after?: number) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      setLoadError(null);
      // Cancel any pending request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      const url = after
        ? `/api/direct-conversations/${conversationId}/messages?after=${after}`
        : `/api/direct-conversations/${conversationId}/messages?limit=30`;
      
      const res = await fetch(url, {
        signal: abortControllerRef.current.signal,
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      if (!res.ok) {
        console.error(`[DM] Fetch failed with status ${res.status}`);
        throw new Error('Failed to load direct messages.');
      }
      const data = await res.json();
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid messages payload.');
      }

      if (data.length > 0) {
        if (after) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const fresh = data.filter((m) => !existingIds.has(m.id));
            return [...prev.filter((m) => !m._optimistic), ...fresh];
          });
        } else {
          setMessages(data);
        }
        lastIdRef.current = Math.max(lastIdRef.current, ...data.map((m) => m.id));
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error(`[DM] Error loading messages:`, e);
        setLoadError('Failed to load messages. Retrying...');
      }
    } finally {
      loadingRef.current = false;
    }
  }, [conversationId]);

  // Reset message state when switching conversations to avoid stale cursor issues.
  useEffect(() => {
    abortControllerRef.current?.abort();
    loadingRef.current = false;
    setMessages([]);
    setReplyTo(null);
    setForwardOf(null);
    setEditingId(null);
    setEditText('');
    setActionError(null);
    setLoadError(null);
    lastIdRef.current = 0;
  }, [conversationId]);

  // Initial load
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Mark messages as read
  useEffect(() => {
    if (!currentUser || messages.length === 0) return;
    const unread = messages
      .filter((m) => !m.read_by.includes(currentUserId))
      .map((m) => m.id);
    if (unread.length === 0) return;
    fetch(`/api/direct-conversations/${conversationId}/messages/read`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      body: JSON.stringify({ user_id: currentUserId, message_ids: unread }),
    }).catch(() => {});
  }, [messages, currentUserId, conversationId, csrfToken, currentUser]);

  // Echo subscription for real-time
  useEffect(() => {
    const echo = (window as any).Echo;
    if (!echo) return;

    try {
      const channel = echo.private(`user.${currentUserId}`);
      setIsEchoConnected(true);

      channel.listen('.dm.sent', (data: { message: DmMessage }) => {
        if (data.message.conversation_id !== conversationId) return;
        setMessages((prev) => {
          const exists = prev.some((m) => m.id === data.message.id);
          if (exists) return prev;
          return [...prev.filter((m) => !m._optimistic), data.message];
        });
        lastIdRef.current = Math.max(lastIdRef.current, data.message.id);
      });

      return () => {
        echo.leave(`user.${currentUserId}`);
        setIsEchoConnected(false);
      };
    } catch (_) {}
  }, [currentUserId, conversationId]);

  // Polling fallback
  useEffect(() => {
    // Keep polling active even when Echo exists, because broadcast can be
    // disabled or intermittently unavailable in some deployments.
    const tick = () => {
      if (document.visibilityState === 'hidden') return;
      if (lastIdRef.current > 0 && messages.length > 0) {
        loadMessages(lastIdRef.current);
      } else {
        loadMessages();
      }
    };

    // Run an immediate sync so newly opened chats update without waiting.
    tick();
    pollRef.current = setInterval(tick, 500); // Reduced from 1000ms for faster updates
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadMessages, messages.length]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ───────────────────────────────────────────────
  const handleSend = async () => {
    if ((!text.trim() && attachments.length === 0) || !currentUser) return;
    setActionError(null);
    setSending(true);

    // Optimistic bubble
    const optimisticId = -Date.now();
    const optimistic: DmMessage = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: currentUserId,
      message_text: text.trim() || null,
      attachments_meta: [],
      metadata: forwardOf ? { forwarded_from: { id: forwardOf.id, sender_name: forwardOf.sender?.name ?? '', text: forwardOf.message_text ?? '' } } : {},
      reply_to_id: replyTo?.id ?? null,
      read_by: [currentUserId],
      created_at: new Date().toISOString(),
      sender: { id: currentUserId, name: currentUser.name, profile_photo: currentUser.profilePhoto ?? null },
      reply_to: replyTo ? { id: replyTo.id, message_text: replyTo.message_text, sender: replyTo.sender } : null,
      _optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    const sentText = text;
    const sentReply = replyTo;
    const sentForward = forwardOf;
    setText('');
    setReplyTo(null);
    setForwardOf(null);

    try {
      const formData = new FormData();
      formData.append('sender_id', String(currentUserId));
      if (sentText.trim()) formData.append('message_text', sentText.trim());
      if (sentReply) formData.append('reply_to_id', String(sentReply.id));
      if (sentForward) {
        formData.append('metadata[forwarded_from][id]', String(sentForward.id));
        formData.append('metadata[forwarded_from][sender_name]', sentForward.sender?.name ?? '');
        formData.append('metadata[forwarded_from][text]', sentForward.message_text ?? '');
      }
      attachments.forEach((f) => formData.append('attachments[]', f));
      setAttachments([]);

      const res = await fetch(`/api/direct-conversations/${conversationId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json',
        },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Unable to send message.');
      }
      const saved: DmMessage = await res.json();
      setMessages((prev) => [...prev.filter((m) => m.id !== optimisticId), saved]);
      lastIdRef.current = Math.max(lastIdRef.current, saved.id);
    } catch (error: any) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setActionError(error?.message || 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  // ── Edit message ────────────────────────────────────────────────
  const handleEdit = async (msg: DmMessage) => {
    if (!editText.trim()) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json',
        },
        body: JSON.stringify({ user_id: currentUserId, message_text: editText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data?.message || 'Unable to edit message.');
        return;
      }
      const updated = await res.json();
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? updated : m)));
    } catch (_) {
      setActionError('Unable to edit message.');
    }
    setEditingId(null);
    setEditText('');
  };

  // ── Delete message ──────────────────────────────────────────────
  const handleDelete = async (msg: DmMessage) => {
    setActionError(null);
    try {
      const res = await fetch(`/api/messages/${msg.id}?user_id=${currentUserId}&user_role=${currentUser?.role || ''}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'X-CSRF-TOKEN': csrfToken,
          'Accept': 'application/json',
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data?.message || 'Unable to delete message.');
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    } catch (_) {
      setActionError('Unable to delete message.');
    }
  };

  // ── Typing indicator ────────────────────────────────────────────
  const handleTyping = () => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    fetch(`/api/direct-conversations/${conversationId}/typing`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
      body: JSON.stringify({ user_id: currentUserId, user_name: currentUser?.name, is_typing: true }),
    }).catch(() => {});
    typingTimerRef.current = setTimeout(() => {
      fetch(`/api/direct-conversations/${conversationId}/typing`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ user_id: currentUserId, user_name: currentUser?.name, is_typing: false }),
      }).catch(() => {});
    }, 3000);
  };

  if (!currentUser) return null;

  return (
    <div className="flex flex-col h-full dark:bg-dark-card bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b dark:border-dark-border border-light-border flex-shrink-0 dark:bg-dark-bg bg-gray-50">
        {onClose && (
          <button onClick={onClose} className="p-1 rounded hover:dark:bg-dark-card2 hover:bg-gray-200 transition-colors sm:hidden">
            <ArrowLeftIcon size={16} className="dark:text-dark-muted text-light-muted" />
          </button>
        )}
        <Avatar user={otherUser} size={8} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold dark:text-dark-text text-light-text truncate">{otherUser.name}</p>
          {otherUser.position && (
            <p className="text-xs dark:text-dark-subtle text-light-subtle truncate">{otherUser.position}{otherUser.department ? ` · ${otherUser.department}` : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full dark:bg-dark-card2 bg-gray-100">
          <span className={`w-1.5 h-1.5 rounded-full ${isEchoConnected ? 'bg-green-400' : 'bg-yellow-400'}`} />
          <span className="dark:text-dark-subtle text-light-subtle">{isEchoConnected ? 'Live' : 'Polling'}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {loadError && (
          <div className="mb-2 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-300">
            {loadError}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full dark:text-dark-muted text-light-muted gap-3">
            <MessageSquareIcon size={36} className="opacity-20" />
            <p className="text-sm">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isOwn = msg.sender_id === currentUserId;
            const prev = idx > 0 ? messages[idx - 1] : null;
            const showDate = !sameDay(msg.created_at, prev?.created_at ?? null);
            const isReadByOther = msg.read_by.includes(otherUser.id);

            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex-1 h-px dark:bg-dark-border bg-light-border" />
                    <span className="text-[10px] dark:text-dark-subtle text-light-subtle px-2 font-medium">
                      {formatDate(msg.created_at)}
                    </span>
                    <div className="flex-1 h-px dark:bg-dark-border bg-light-border" />
                  </div>
                )}
                <div className={`flex gap-2 items-end ${isOwn ? 'flex-row-reverse' : 'flex-row'} group`}>
                  {!isOwn && <Avatar user={msg.sender ?? otherUser} size={7} />}

                  <div className={`max-w-sm flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
                    {/* Reply preview */}
                    {msg.reply_to && (
                      <div className={`flex items-start gap-2 px-2 py-1 rounded text-xs mb-0.5 border-l-2 border-green-primary ${isOwn ? 'dark:bg-dark-card2/80 bg-green-50/60' : 'dark:bg-dark-bg/60 bg-gray-100'}`}>
                        <CornerUpRightIcon size={10} className="text-green-primary flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-medium text-green-primary text-[10px]">{msg.reply_to.sender?.name}</p>
                          <p className="dark:text-dark-subtle text-light-subtle truncate">{msg.reply_to.message_text ?? '[attachment]'}</p>
                        </div>
                      </div>
                    )}

                    {/* Forwarded from preview */}
                    {msg.metadata?.forwarded_from && (
                      <div className={`flex items-start gap-2 px-2 py-1 rounded text-xs mb-0.5 border-l-2 border-blue-400 ${isOwn ? 'dark:bg-dark-card2/80 bg-blue-50/60' : 'dark:bg-dark-bg/60 bg-gray-50'}`}>
                        <Share2Icon size={10} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-medium text-blue-400 text-[10px]">{msg.metadata.forwarded_from.sender_name}</p>
                          <p className="dark:text-dark-subtle text-light-subtle truncate">{msg.metadata.forwarded_from.text}</p>
                        </div>
                      </div>
                    )}

                    {/* Bubble */}
                    {editingId === msg.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          className="px-2 py-1 text-sm rounded dark:bg-dark-bg dark:text-dark-text dark:border-dark-border bg-white border border-light-border focus:outline-none focus:ring-1 focus:ring-green-primary/50"
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEdit(msg);
                            if (e.key === 'Escape') { setEditingId(null); setEditText(''); }
                          }}
                          autoFocus
                        />
                        <button onClick={() => handleEdit(msg)} className="text-green-primary text-xs font-medium hover:underline">Save</button>
                        <button onClick={() => { setEditingId(null); setEditText(''); }} className="text-xs dark:text-dark-muted text-light-muted hover:underline">Cancel</button>
                      </div>
                    ) : (
                      <div
                        className={`relative px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                          msg._optimistic ? 'opacity-60' : ''
                        } ${
                          isOwn
                            ? 'dark:bg-green-primary bg-green-600 text-black rounded-br-sm'
                            : 'dark:bg-dark-bg bg-gray-100 dark:text-dark-text text-light-text rounded-bl-sm'
                        }`}
                      >
                        {msg.message_text && <p className="break-words whitespace-pre-wrap">{msg.message_text}</p>}

                        {/* Attachments */}
                        {msg.attachments_meta.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {msg.attachments_meta.map((att, i) => (
                              <a
                                key={i}
                                href={`/api/chat-attachments/${msg.id}/${i}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium dark:bg-black/20 bg-white/50 hover:dark:bg-black/30 hover:bg-white/80 transition-colors"
                              >
                                {att.mime.startsWith('image/') ? <ImageIcon size={12} /> : <FileIcon size={12} />}
                                <span className="truncate max-w-[180px]">{att.name}</span>
                                <DownloadIcon size={10} className="ml-auto flex-shrink-0" />
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Edited badge */}
                        {msg.metadata.edited && (
                          <span className="text-[9px] opacity-60 ml-1">(edited)</span>
                        )}
                      </div>
                    )}

                    {/* Meta row */}
                    <div className={`flex items-center gap-1.5 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ${isOwn ? 'flex-row-reverse' : ''}`}>
                      <span className="dark:text-dark-subtle text-light-subtle">{formatTime(msg.created_at)}</span>
                      {isOwn && (
                        <CheckCheckIcon size={10} className={isReadByOther ? 'text-blue-400' : 'dark:text-dark-subtle text-light-subtle'} />
                      )}
                      {/* Actions */}
                      {!msg._optimistic && (
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => setReplyTo(msg)}
                            className="p-0.5 rounded hover:dark:bg-dark-card hover:bg-gray-200 transition-colors"
                            title="Reply"
                          >
                            <ReplyIcon size={10} className="dark:text-dark-muted text-light-muted" />
                          </button>
                          <button
                            onClick={() => setForwardOf(msg)}
                            className="p-0.5 rounded hover:dark:bg-dark-card hover:bg-gray-200 transition-colors"
                            title="Forward"
                          >
                            <Share2Icon size={10} className="dark:text-dark-muted text-light-muted" />
                          </button>
                          {isOwn && (
                            <>
                              <button
                                onClick={() => { setEditingId(msg.id); setEditText(msg.message_text ?? ''); }}
                                className="p-0.5 rounded hover:dark:bg-dark-card hover:bg-gray-200 transition-colors"
                                title="Edit"
                              >
                                <PencilIcon size={10} className="dark:text-dark-muted text-light-muted" />
                              </button>
                              <button
                                onClick={() => handleDelete(msg)}
                                className="p-0.5 rounded hover:dark:bg-dark-card hover:bg-gray-200 transition-colors"
                                title="Delete"
                              >
                                <TrashIcon size={10} className="text-red-400" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })
        )}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs dark:text-dark-subtle text-light-subtle">
            <span className="flex gap-0.5">
              <span className="w-1.5 h-1.5 rounded-full dark:bg-dark-muted bg-light-muted animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full dark:bg-dark-muted bg-light-muted animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full dark:bg-dark-muted bg-light-muted animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
            {otherUser.name} is typing…
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview */}
      {actionError && (
        <div className="mx-4 mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {actionError}
        </div>
      )}

      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2 dark:bg-dark-bg/60 bg-gray-50 border-t dark:border-dark-border border-light-border text-xs flex-shrink-0">
          <CornerUpRightIcon size={12} className="text-green-primary" />
          <span className="dark:text-dark-subtle text-light-subtle truncate flex-1">
            Replying to <strong className="dark:text-dark-text text-light-text">{replyTo.sender?.name}</strong>: {replyTo.message_text ?? '[attachment]'}
          </span>
          <button onClick={() => setReplyTo(null)} className="flex-shrink-0">
            <XIcon size={12} className="dark:text-dark-muted text-light-muted" />
          </button>
        </div>
      )}

      {/* Forward preview */}
      {forwardOf && (
        <div className="flex items-center gap-2 px-4 py-2 dark:bg-dark-bg/60 bg-gray-50 border-t dark:border-dark-border border-light-border text-xs flex-shrink-0">
          <Share2Icon size={12} className="text-blue-400" />
          <span className="dark:text-dark-subtle text-light-subtle truncate flex-1">
            Forwarding from <strong className="dark:text-dark-text text-light-text">{forwardOf.sender?.name}</strong>: {forwardOf.message_text ?? '[attachment]'}
          </span>
          <button onClick={() => setForwardOf(null)} className="flex-shrink-0">
            <XIcon size={12} className="dark:text-dark-muted text-light-muted" />
          </button>
        </div>
      )}

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 px-4 py-2 flex-wrap dark:bg-dark-bg/40 bg-gray-50 border-t dark:border-dark-border border-light-border flex-shrink-0">
          {attachments.map((f, i) => (
            <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg dark:bg-dark-card2 bg-white border dark:border-dark-border border-light-border text-xs">
              <FileIcon size={10} className="dark:text-dark-muted text-light-muted" />
              <span className="max-w-[120px] truncate dark:text-dark-text text-light-text">{f.name}</span>
              <button onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}>
                <XIcon size={10} className="dark:text-dark-muted text-light-muted" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 px-3 py-3 dark:bg-dark-bg bg-gray-50 border-t dark:border-dark-border border-light-border flex-shrink-0">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-lg dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-gray-200 transition-colors flex-shrink-0"
          title="Attach file"
        >
          <PaperclipIcon size={16} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            setAttachments((prev) => [...prev, ...files].slice(0, 5));
            e.target.value = '';
          }}
        />
        <textarea
          className="flex-1 px-3 py-2 text-sm rounded-xl dark:bg-dark-card dark:border-dark-border dark:text-dark-text dark:placeholder-dark-subtle bg-white border border-light-border text-light-text placeholder-light-subtle focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none max-h-32"
          rows={1}
          value={text}
          onChange={(e) => { setText(e.target.value); handleTyping(); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
          }}
          placeholder={`Message ${otherUser.name}…`}
        />
        <button
          onClick={handleSend}
          disabled={sending || (!text.trim() && attachments.length === 0)}
          className="p-2 rounded-xl dark:bg-green-primary bg-green-600 text-black hover:opacity-90 disabled:opacity-40 transition-colors flex-shrink-0"
        >
          <SendIcon size={16} />
        </button>
      </div>
    </div>
  );
}
