import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import {
  SendIcon,
  PaperclipIcon,
  XIcon,
  ReplyIcon,
  AtSignIcon,
  DownloadIcon,
  TrashIcon,
  CheckCheckIcon,
  FileIcon,
  WifiIcon,
  RefreshCwIcon,
  ImageIcon,
  UsersIcon,
  PencilIcon,
  Share2Icon,
  MoreHorizontalIcon,
  CheckIcon,
  CornerUpRightIcon,
} from 'lucide-react';
import { useAuth, useData } from '../../context/AppContext';
import { isSuperadmin } from '../../utils/roles';
import { Project, User } from '../../data/mockData';

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

interface ForwardedFrom {
  id: number;
  sender_name: string;
  text: string | null;
}

interface ChatMessage {
  id: number;
  project_id: number;
  sender_id: number;
  message_text: string | null;
  attachments_meta: AttachmentMeta[];
  metadata: {
    edited?: boolean;
    edited_at?: string;
    forwarded_from?: ForwardedFrom;
    [key: string]: unknown;
  };
  reply_to_id: number | null;
  read_by: number[];
  created_at: string;
  sender: ChatSender | null;
  reply_to: {
    id: number;
    message_text: string | null;
    sender: { id: number; name: string } | null;
  } | null;
  _optimistic?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

const AVATAR_COLORS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-amber-600',
  'from-rose-500 to-pink-600',
  'from-indigo-500 to-blue-600',
  'from-fuchsia-500 to-violet-600',
  'from-teal-500 to-green-600',
];

function getAvatarColor(id: number) { return AVATAR_COLORS[id % AVATAR_COLORS.length]; }

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function highlightMentions(text: string): React.ReactNode[] {
  return text.split(/(@\w+(?:\s\w+)?)/g).map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="bg-green-500/20 text-green-300 rounded px-0.5 font-semibold">{part}</span>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ id, name, size = 8 }: { id: number; name: string; size?: number }) {
  const px = size * 4;
  return (
    <div
      className={`bg-gradient-to-br ${getAvatarColor(id)} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 shadow-md`}
      style={{ width: px, height: px, fontSize: size <= 6 ? 9 : size <= 8 ? 11 : 13 }}
    >
      {getInitials(name)}
    </div>
  );
}

// ─── Mention Dropdown ─────────────────────────────────────────────────────────

function MentionDropdown({
  query, members, onSelect,
}: { query: string; members: User[]; onSelect: (u: User) => void }) {
  const filtered = members.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()));
  if (!filtered.length) return null;
  return (
    <div className="absolute bottom-full mb-2 left-0 z-50 w-60 border border-gray-600/80 rounded-2xl shadow-2xl overflow-hidden"
      style={{ background: 'rgba(17,24,39,0.97)' }}>
      <div className="px-3 py-2 border-b border-gray-700/60 flex items-center gap-2">
        <AtSignIcon size={12} className="text-green-400" />
        <span className="text-xs text-gray-400 font-medium">Mention a member</span>
      </div>
      {filtered.map((u) => (
        <button key={u.id} onMouseDown={(e) => { e.preventDefault(); onSelect(u); }}
          className="w-full text-left px-3 py-2.5 hover:bg-gray-700/70 flex items-center gap-2.5 transition-colors">
          <Avatar id={Number(u.id)} name={u.name} size={7} />
          <div className="flex flex-col">
            <span className="font-medium text-gray-100 text-xs">{u.name}</span>
            <span className="text-gray-500 text-[10px] capitalize">{u.role}</span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

function MessageContextMenu({
  isMine,
  isTextMsg,
  isOptimistic,
  isAdmin,
  onReply,
  onEdit,
  onForward,
  onDelete,
  onClose,
}: {
  isMine: boolean;
  isTextMsg: boolean;
  isOptimistic: boolean;
  isAdmin: boolean;
  onReply: () => void;
  onEdit: () => void;
  onForward: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref}
      className="absolute z-50 w-44 rounded-2xl border border-gray-600/60 shadow-2xl overflow-hidden py-1"
      style={{ background: 'rgba(17,24,39,0.98)', backdropFilter: 'blur(16px)' }}>
      <button onClick={() => { onReply(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700/60 hover:text-white transition">
        <ReplyIcon size={13} className="text-gray-400" /> Reply
      </button>
      {isMine && isTextMsg && !isOptimistic && (
        <button onClick={() => { onEdit(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700/60 hover:text-blue-400 transition">
          <PencilIcon size={13} className="text-gray-400" /> Edit
        </button>
      )}
      <button onClick={() => { onForward(); onClose(); }}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:bg-gray-700/60 hover:text-green-400 transition">
        <Share2Icon size={13} className="text-gray-400" /> Forward
      </button>
      {(isMine || isAdmin) && !isOptimistic && (
        <>
          <div className="mx-3 my-1 h-px bg-gray-700/60" />
          <button onClick={() => { onDelete(); onClose(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition">
            <TrashIcon size={13} /> Delete
          </button>
        </>
      )}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg, isMine, isAdmin,
  onReply, onEdit, onForward, onDelete,
}: {
  msg: ChatMessage;
  isMine: boolean;
  isAdmin: boolean;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onForward: (msg: ChatMessage) => void;
  onDelete: (id: number) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(msg.message_text ?? '');
  const editRef = useRef<HTMLTextAreaElement>(null);

  const readCount = (msg.read_by ?? []).length;
  const isOptimistic = !!msg._optimistic;
  const senderId = msg.sender?.id ?? 0;
  const isEdited = !!msg.metadata?.edited;
  const isTextMsg = !!msg.message_text;
  const forwarded = msg.metadata?.forwarded_from as ForwardedFrom | undefined;

  // Focus edit textarea
  useEffect(() => {
    if (editing) { setEditVal(msg.message_text ?? ''); setTimeout(() => editRef.current?.focus(), 50); }
  }, [editing, msg.message_text]);

  const saveEdit = () => {
    if (editVal.trim() === (msg.message_text ?? '').trim()) { setEditing(false); return; }
    onEdit({ ...msg, message_text: editVal.trim() });
    setEditing(false);
  };

  const menuButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className={`flex gap-2.5 group ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end mb-1`}>

      {/* Avatar */}
      {msg.sender && (
        <div className="flex-shrink-0 mb-0.5">
          <Avatar id={senderId} name={msg.sender.name} size={8} />
        </div>
      )}

      <div className={`max-w-[68%] flex flex-col gap-1 ${isMine ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {!isMine && msg.sender && (
          <span className="text-[11px] font-semibold ml-1"
            style={{ color: `hsl(${(senderId * 47) % 360}, 65%, 70%)` }}>
            {msg.sender.name}
          </span>
        )}

        {/* Forwarded banner inside bubble */}
        {forwarded && (
          <div className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg ${
            isMine ? 'bg-white/10 text-green-200' : 'bg-gray-700/60 text-gray-400'
          }`}>
            <CornerUpRightIcon size={10} />
            <span>Forwarded from <strong>{forwarded.sender_name}</strong></span>
          </div>
        )}

        {/* Reply context */}
        {msg.reply_to && (
          <div className={`text-xs px-2.5 py-1.5 rounded-xl border-l-2 border-green-500 max-w-full ${
            isMine ? 'bg-gray-700/40 mr-1' : 'bg-gray-700/40 ml-1'
          }`}>
            <span className="font-semibold text-green-400 text-[10px]">
              {msg.reply_to.sender?.name ?? 'Someone'}
            </span>
            <p className="text-gray-400 text-[10px] truncate mt-0.5">{msg.reply_to.message_text ?? '[attachment]'}</p>
          </div>
        )}

        {/* Bubble */}
        <div className={`relative px-3.5 py-2.5 text-sm break-words whitespace-pre-wrap transition-opacity ${
          isOptimistic ? 'opacity-50' : 'opacity-100'
        } ${
          isMine
            ? 'bg-gradient-to-br from-green-600 to-green-700 text-white rounded-2xl rounded-br-md shadow-lg shadow-green-900/30'
            : 'text-gray-100 rounded-2xl rounded-bl-md shadow-md border border-gray-700/50'
        }`}
          style={!isMine ? { background: 'rgba(31,41,55,0.9)' } : {}}>

          {/* Inline edit */}
          {editing ? (
            <div className="flex flex-col gap-2">
              <textarea
                ref={editRef}
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                  if (e.key === 'Escape') setEditing(false);
                }}
                rows={2}
                className="w-full bg-white/10 text-white rounded-lg px-2 py-1 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-green-400 min-w-[180px]"
              />
              <div className="flex gap-1.5 justify-end">
                <button onClick={() => setEditing(false)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 transition text-gray-300">
                  Cancel
                </button>
                <button onClick={saveEdit}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-green-500 hover:bg-green-400 transition text-white flex items-center gap-1">
                  <CheckIcon size={9} /> Save
                </button>
              </div>
            </div>
          ) : (
            <>
              {msg.message_text && (
                <p className="leading-relaxed">{highlightMentions(msg.message_text)}</p>
              )}

              {/* Attachments */}
              {(msg.attachments_meta ?? []).map((att, i) => (
                <div key={i} className={msg.message_text ? 'mt-2' : ''}>
                  {att.mime.startsWith('image/') ? (
                    <a href={`/api/chat-attachments/${msg.id}/${i}`} target="_blank" rel="noreferrer" className="block">
                      <img src={`/api/chat-attachments/${msg.id}/${i}`} alt={att.name}
                        className="max-w-[240px] max-h-48 rounded-xl object-cover border border-white/10 shadow-md" />
                    </a>
                  ) : (
                    <a href={`/api/chat-attachments/${msg.id}/${i}`} target="_blank" rel="noreferrer"
                      className={`flex items-center gap-2 rounded-xl px-3 py-2 hover:opacity-80 transition group/att ${
                        isMine ? 'bg-white/10' : 'bg-gray-700/70'
                      }`}>
                      <div className={`p-1.5 rounded-lg ${isMine ? 'bg-white/10' : 'bg-gray-600'}`}>
                        <FileIcon size={14} className={isMine ? 'text-green-200' : 'text-gray-300'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium">{att.name}</p>
                        <p className="text-[10px] opacity-60">{formatBytes(att.size)}</p>
                      </div>
                      <DownloadIcon size={13} className="opacity-60 group-hover/att:opacity-100" />
                    </a>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Meta row */}
        <div className={`flex items-center gap-1.5 text-[10px] text-gray-500 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
          <span>{formatTime(msg.created_at)}</span>
          {isEdited && <span className="text-gray-600 italic">(edited)</span>}
          {isMine && !isOptimistic && (
            <CheckCheckIcon size={11} className={readCount > 1 ? 'text-green-400' : 'text-gray-600'} />
          )}
          {isOptimistic && <span className="text-gray-600 text-[9px]">sending…</span>}
        </div>
      </div>

      {/* Three-dot menu button */}
      <div className={`relative flex items-center pb-7 ${isMine ? 'mr-0.5' : 'ml-0.5'}`}>
        <button
          ref={menuButtonRef}
          onClick={() => setMenuOpen((o) => !o)}
          className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-500 hover:text-gray-200 transition shadow-sm opacity-0 group-hover:opacity-100"
          title="More actions"
        >
          <MoreHorizontalIcon size={13} />
        </button>

        {menuOpen && (
          <div className={`absolute bottom-8 ${isMine ? 'right-0' : 'left-0'}`}>
            <MessageContextMenu
              isMine={isMine}
              isTextMsg={isTextMsg}
              isOptimistic={isOptimistic}
              isAdmin={isAdmin}
              onReply={() => onReply(msg)}
              onEdit={() => setEditing(true)}
              onForward={() => onForward(msg)}
              onDelete={() => onDelete(msg.id)}
              onClose={() => setMenuOpen(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ProjectChatProps {
  project: Project;
  onClose?: () => void;
}

export function ProjectChat({ project, onClose }: ProjectChatProps) {
  const { currentUser } = useAuth();
  const { users } = useData();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [forwardOf, setForwardOf] = useState<ChatMessage | null>(null);
  const [sending, setSending] = useState(false);
  const [showMention, setShowMention] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [isLive, setIsLive] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({});
  const [showMembers, setShowMembers] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const lastIdRef = useRef<number>(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = isSuperadmin(currentUser?.role);

  // Members for @mentions — exclude current user
  const projectMembers = useMemo((): User[] => {
    const ids = new Set([...(project.teamIds ?? []), project.managerId]);
    return users.filter((u) => ids.has(u.id) && u.id !== currentUser?.id);
  }, [users, project, currentUser]);

  const allMembers = useMemo((): User[] => {
    const ids = new Set([...(project.teamIds ?? []), project.managerId]);
    return users.filter((u) => ids.has(u.id));
  }, [users, project]);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    setMessages([]); lastIdRef.current = 0; setLoading(true);
    fetch(`/api/projects/${project.id}/messages?limit=120`, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    })
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load messages');
        return r.json();
      })
      .then((data: ChatMessage[]) => {
        const msgs = Array.isArray(data) ? data : [];
        setMessages(msgs);
        if (msgs.length > 0) lastIdRef.current = msgs[msgs.length - 1].id;
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [project.id]);

  // ── HTTP Polling every 1s ─────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;

    const tick = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const res = await fetch(`/api/projects/${project.id}/messages?after=${lastIdRef.current}`, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });
        if (!res.ok) return;
        const data: ChatMessage[] = await res.json();
        if (!Array.isArray(data) || !data.length) return;
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.id));
          const incoming = data.filter((m) => !existing.has(m.id));
          if (!incoming.length) return prev;
          lastIdRef.current = Math.max(...data.map((m) => m.id));
          const clean = prev.filter((m) => !m._optimistic || !incoming.some((n) => n.sender_id === m.sender_id));
          return [...clean, ...incoming];
        });
      } catch (_) {}
    };

    tick();
    const poll = setInterval(tick, 1000);
    return () => clearInterval(poll);
  }, [project.id, loading]);

  // ── Echo WebSocket (optional) ─────────────────────────────────────────────
  useEffect(() => {
    const echo = (window as any).Echo;
    if (!echo) return;
    try {
      echo.join(`project.${project.id}`)
        .here(() => setIsLive(true))
        .listen('.message.sent', (e: { message: ChatMessage }) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === e.message.id)) return prev;
            lastIdRef.current = Math.max(lastIdRef.current, e.message.id);
            const filtered = prev.filter((m) => !m._optimistic || m.sender_id !== e.message.sender_id);
            return [...filtered, e.message];
          });
        })
        .listen('.user.typing', (e: { user_id: number; user_name: string; is_typing: boolean }) => {
          if (currentUser && e.user_id === Number(currentUser.id)) return;
          setTypingUsers((prev) => {
            if (e.is_typing) return { ...prev, [e.user_id]: e.user_name };
            const next = { ...prev }; delete next[e.user_id]; return next;
          });
        })
        .listen('.messages.read', (e: { user_id: number; message_ids: number[] }) => {
          setMessages((prev) =>
            prev.map((m) => {
              if (!e.message_ids.includes(m.id) || m.read_by.includes(e.user_id)) return m;
              return { ...m, read_by: [...m.read_by, e.user_id] };
            })
          );
        })
        .error(() => setIsLive(false));
    } catch (_) { setIsLive(false); }
    return () => { setIsLive(false); try { echo.leave(`project.${project.id}`); } catch (_) {} };
  }, [project.id, currentUser]);

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  // ── Mark read ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser || !messages.length) return;
    const uid = Number(currentUser.id);
    const unread = messages.filter((m) => !m._optimistic && !m.read_by.includes(uid)).map((m) => m.id);
    if (!unread.length) return;
    fetch(`/api/projects/${project.id}/messages/read`, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ user_id: uid, message_ids: unread }),
    }).catch(() => {});
  }, [messages, currentUser, project.id]);

  // ── Typing ────────────────────────────────────────────────────────────────
  const sendTyping = useCallback((isTyping: boolean) => {
    if (!currentUser || !isLive) return;
    fetch(`/api/projects/${project.id}/messages/typing`, {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ user_id: Number(currentUser.id), user_name: currentUser.name, is_typing: isTyping }),
    }).catch(() => {});
  }, [project.id, currentUser, isLive]);

  // ── Text input ────────────────────────────────────────────────────────────
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    const cursor = e.target.selectionStart;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) { setShowMention(true); setMentionQuery(match[1]); }
    else { setShowMention(false); }
    sendTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => sendTyping(false), 2000);
  };

  const insertMention = (user: User) => {
    const cursor = textRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, cursor).replace(/@\w*$/, `@${user.name} `);
    setText(before + text.slice(cursor));
    setShowMention(false);
    setTimeout(() => textRef.current?.focus(), 0);
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if ((!text.trim() && !files.length) || sending || !currentUser) return;
    setSending(true);

    const tempId = -(Date.now());
    const optimistic: ChatMessage = {
      id: tempId,
      project_id: Number(project.id),
      sender_id: Number(currentUser.id),
      message_text: text.trim() || null,
      attachments_meta: [],
      metadata: forwardOf
        ? { forwarded_from: { id: forwardOf.id, sender_name: forwardOf.sender?.name ?? '', text: forwardOf.message_text } }
        : {},
      reply_to_id: replyTo?.id ?? null,
      read_by: [Number(currentUser.id)],
      created_at: new Date().toISOString(),
      sender: { id: Number(currentUser.id), name: currentUser.name, profile_photo: null },
      reply_to: replyTo ? { id: replyTo.id, message_text: replyTo.message_text, sender: replyTo.sender } : null,
      _optimistic: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    const sentText = text.trim();
    const sentReply = replyTo;
    const sentForward = forwardOf;
    const sentFiles = [...files];
    setText(''); setFiles([]); setReplyTo(null); setForwardOf(null); sendTyping(false);

    try {
      const fd = new FormData();
      fd.append('sender_id', String(currentUser.id));
      if (sentText) fd.append('message_text', sentText);
      if (sentReply) fd.append('reply_to_id', String(sentReply.id));
      if (sentForward) fd.append('metadata[forwarded_from][id]', String(sentForward.id));
      if (sentForward) fd.append('metadata[forwarded_from][sender_name]', sentForward.sender?.name ?? '');
      if (sentForward) fd.append('metadata[forwarded_from][text]', sentForward.message_text ?? '');
      sentFiles.forEach((f) => fd.append('attachments[]', f));

      const res = await fetch(`/api/projects/${project.id}/messages`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
        body: fd,
      });

      if (res.ok) {
        const saved: ChatMessage = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === tempId ? saved : m)));
        lastIdRef.current = Math.max(lastIdRef.current, saved.id);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch (_) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = async (msg: ChatMessage) => {
    if (!currentUser || !msg.message_text) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/messages/${msg.id}`, {
        method: 'PATCH', credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ user_id: Number(currentUser.id), message_text: msg.message_text }),
      });
      if (res.ok) {
        const updated: ChatMessage = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      } else {
        const data = await res.json().catch(() => ({}));
        setActionError(data?.message || 'Unable to edit message.');
      }
    } catch (_) {
      setActionError('Unable to edit message.');
    }
  };

  // ── Forward ───────────────────────────────────────────────────────────────
  const handleForward = (msg: ChatMessage) => {
    setReplyTo(null);
    setForwardOf(msg);
    setTimeout(() => textRef.current?.focus(), 50);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    if (!currentUser) return;
    setActionError(null);
    try {
      const res = await fetch(`/api/messages/${id}?user_id=${currentUser.id}&user_role=${currentUser.role}`, {
        method: 'DELETE', credentials: 'same-origin',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'Accept': 'application/json',
        },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data?.message || 'Unable to delete message.');
        return;
      }
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch (_) {
      setActionError('Unable to delete message.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMention) { if (e.key === 'Escape') { setShowMention(false); e.preventDefault(); } return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') { setReplyTo(null); setForwardOf(null); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles((prev) => [...prev, ...Array.from(e.target.files!)].slice(0, 5));
    e.target.value = '';
  };

  // ── Date separators ───────────────────────────────────────────────────────
  const withDates = useMemo(() => {
    const result: Array<{ type: 'date'; label: string } | { type: 'msg'; msg: ChatMessage }> = [];
    let lastDate = '';
    for (const msg of messages) {
      const d = formatDate(msg.created_at);
      if (d !== lastDate) { result.push({ type: 'date', label: d }); lastDate = d; }
      result.push({ type: 'msg', msg });
    }
    return result;
  }, [messages]);

  const typingNames = Object.values(typingUsers);
  const currentUid = Number(currentUser?.id ?? 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full text-gray-100 overflow-hidden"
      style={{ background: 'linear-gradient(to bottom, #0f172a, #111827)' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b border-gray-700/60"
        style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <div className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-green-400' : 'bg-yellow-400'}`} />
            {isLive && <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-400 animate-ping opacity-60" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-white truncate">{project.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isLive ? (
                <><WifiIcon size={9} className="text-green-400" /><span className="text-[10px] text-green-400 font-medium">Live</span></>
              ) : (
                <><RefreshCwIcon size={9} className="text-yellow-400" /><span className="text-[10px] text-yellow-400">Auto-refresh</span></>
              )}
              <span className="text-gray-600 text-[10px]">·</span>
              <UsersIcon size={9} className="text-gray-500" />
              <span className="text-[10px] text-gray-500">{allMembers.length} members</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => setShowMembers((s) => !s)}
            className="flex items-center -space-x-1.5 transition" title="Project members">
            {allMembers.slice(0, 4).map((u) => (
              <div key={u.id} className="ring-2 ring-gray-900 rounded-full">
                <Avatar id={Number(u.id)} name={u.name} size={6} />
              </div>
            ))}
            {allMembers.length > 4 && (
              <div className="w-6 h-6 rounded-full bg-gray-700 ring-2 ring-gray-900 flex items-center justify-center text-[9px] text-gray-300 font-bold">
                +{allMembers.length - 4}
              </div>
            )}
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-700/60 text-gray-500 hover:text-gray-200 transition">
              <XIcon size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ── Members panel ───────────────────────────────────────────────── */}
      {showMembers && (
        <div className="flex-shrink-0 border-b border-gray-700/60 px-4 py-3" style={{ background: 'rgba(17,24,39,0.8)' }}>
          <div className="flex items-center gap-2 mb-2">
            <UsersIcon size={12} className="text-green-400" />
            <span className="text-xs font-semibold text-gray-300">Project Members</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allMembers.map((u) => (
              <div key={u.id} className="flex items-center gap-1.5 bg-gray-800/80 rounded-xl px-2.5 py-1.5 border border-gray-700/50">
                <Avatar id={Number(u.id)} name={u.name} size={6} />
                <div>
                  <p className="text-xs font-medium text-gray-200">{u.name}</p>
                  <p className="text-[9px] text-gray-500 capitalize">{u.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 transparent' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-500 text-sm">Loading messages…</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-center">
              <span className="text-3xl">💬</span>
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-400 text-sm">No messages yet</p>
              <p className="text-xs text-gray-600 mt-1">Start the conversation with your team!</p>
            </div>
          </div>
        ) : (
          withDates.map((item, i) =>
            item.type === 'date' ? (
              <div key={`d-${i}`} className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-700/50" />
                <span className="text-[10px] text-gray-500 font-medium px-3 py-1 bg-gray-800/60 rounded-full border border-gray-700/40">
                  {item.label}
                </span>
                <div className="flex-1 h-px bg-gray-700/50" />
              </div>
            ) : (
              <MessageBubble
                key={item.msg.id}
                msg={item.msg}
                isMine={item.msg.sender_id === currentUid}
                isAdmin={isAdmin}
                onReply={setReplyTo}
                onEdit={handleEdit}
                onForward={handleForward}
                onDelete={handleDelete}
              />
            )
          )
        )}

        {typingNames.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500 pl-11 mt-2">
            <div className="flex gap-0.5 items-center">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
            <span>{typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 pt-2 pb-3 space-y-2 border-t border-gray-700/60"
        style={{ background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)' }}>

        {actionError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {actionError}
          </div>
        )}

        {/* Reply banner */}
        {replyTo && (
          <div className="flex items-center gap-2 bg-gray-800/80 border border-gray-700/60 rounded-xl px-3 py-2 text-xs">
            <ReplyIcon size={11} className="text-green-400 flex-shrink-0" />
            <div className="w-0.5 h-7 bg-green-500 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-green-400 text-[10px] block">{replyTo.sender?.name}</span>
              <span className="text-gray-400 truncate block">{replyTo.message_text ?? '[attachment]'}</span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-600 hover:text-gray-300 p-0.5 transition flex-shrink-0">
              <XIcon size={13} />
            </button>
          </div>
        )}

        {/* Forward banner */}
        {forwardOf && (
          <div className="flex items-center gap-2 bg-blue-900/30 border border-blue-700/40 rounded-xl px-3 py-2 text-xs">
            <Share2Icon size={11} className="text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-blue-400 text-[10px] block">
                Forwarding from {forwardOf.sender?.name}
              </span>
              <span className="text-gray-400 truncate block">{forwardOf.message_text ?? '[attachment]'}</span>
            </div>
            <button onClick={() => setForwardOf(null)} className="text-gray-600 hover:text-gray-300 p-0.5 transition flex-shrink-0">
              <XIcon size={13} />
            </button>
          </div>
        )}

        {/* File chips */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {files.map((f, i) => {
              const isImg = f.type.startsWith('image/');
              return (
                <div key={i} className="flex items-center gap-1.5 bg-gray-800/80 border border-gray-700/50 rounded-xl px-2.5 py-1.5 text-xs">
                  {isImg ? <ImageIcon size={11} className="text-blue-400" /> : <FileIcon size={11} className="text-gray-400" />}
                  <span className="max-w-[100px] truncate text-gray-300">{f.name}</span>
                  <span className="text-gray-600 text-[9px]">{formatBytes(f.size)}</span>
                  <button onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                    className="text-gray-600 hover:text-red-400 transition ml-0.5">
                    <XIcon size={10} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Toolbar + Textarea */}
        <div className="relative">
          {showMention && (
            <div className="absolute bottom-full mb-2 left-0 z-50">
              <MentionDropdown query={mentionQuery} members={projectMembers} onSelect={insertMention} />
            </div>
          )}

          <div className="flex items-end gap-2 bg-gray-800/70 border border-gray-700/60 rounded-2xl px-2 py-2 focus-within:border-green-600/50 focus-within:ring-1 focus-within:ring-green-600/20 transition">
            <input ref={fileInputRef} type="file" multiple
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
              onChange={handleFileChange}
              style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
              tabIndex={-1} />

            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="p-1.5 rounded-xl text-gray-500 hover:text-gray-200 hover:bg-gray-700/60 transition flex-shrink-0"
              title="Attach files">
              <PaperclipIcon size={17} />
            </button>

            <button type="button"
              onClick={() => { setText((t) => t + '@'); setShowMention(true); setMentionQuery(''); setTimeout(() => textRef.current?.focus(), 0); }}
              className="p-1.5 rounded-xl text-gray-500 hover:text-gray-200 hover:bg-gray-700/60 transition flex-shrink-0"
              title="Mention someone">
              <AtSignIcon size={17} />
            </button>

            <textarea ref={textRef} value={text} onChange={handleTextChange} onKeyDown={handleKeyDown}
              rows={1}
              placeholder={forwardOf ? 'Add a comment (optional)…' : 'Type a message… (Enter to send)'}
              className="flex-1 resize-none bg-transparent text-gray-100 placeholder-gray-600 text-sm focus:outline-none max-h-32 overflow-y-auto py-1 px-1"
              style={{ minHeight: '34px', lineHeight: '1.5' }} />

            <button type="button" onClick={handleSend}
              disabled={sending || (!text.trim() && !files.length && !forwardOf)}
              className="p-2 rounded-xl bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg shadow-green-900/30 flex-shrink-0">
              <SendIcon size={16} className="text-white" />
            </button>
          </div>

          <p className="text-[9px] text-gray-700 mt-1 ml-2">
            Enter to send · Shift+Enter for new line · @ to mention
          </p>
        </div>
      </div>
    </div>
  );
}