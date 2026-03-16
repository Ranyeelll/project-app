import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlertIcon,
  TrashIcon,
  FlagIcon,
  VolumeXIcon,
  Volume2Icon,
  RefreshCwIcon,
  AlertTriangleIcon,
  MessageSquareIcon,
  UserXIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AppContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FlaggedMessage {
  id: number;
  message_text: string | null;
  sender: { id: number; name: string } | null;
  flag_reason: string | null;
  flagged_by: { id: number; name: string } | null;
  project: { id: number; name: string } | null;
  created_at: string;
}

interface MutedUser {
  id: number;
  user: { id: number; name: string; department: string };
  muted_by: { id: number; name: string };
  reason: string | null;
  muted_until: string | null;
  created_at: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatModerationPage() {
  const { currentUser } = useAuth();
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  const [tab, setTab] = useState<'flagged' | 'muted'>('flagged');
  const [flagged, setFlagged] = useState<FlaggedMessage[]>([]);
  const [muted, setMuted] = useState<MutedUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Mute form
  const [muteUserId, setMuteUserId] = useState('');
  const [muteReason, setMuteReason] = useState('');
  const [muteUntil, setMuteUntil] = useState('');
  const [muteError, setMuteError] = useState('');

  const adminId = currentUser ? Number(currentUser.id) : 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [flagRes, mutedRes] = await Promise.all([
        fetch('/api/admin/chat/flagged'),
        fetch('/api/admin/chat/muted'),
      ]);
      setFlagged(await flagRes.json());
      setMuted(await mutedRes.json());
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeleteMessage = async (msgId: number) => {
    if (!confirm('Permanently delete this message?')) return;
    try {
      await fetch(`/api/admin/chat/messages/${msgId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ admin_id: adminId, reason: 'Admin moderation' }),
      });
      setFlagged((prev) => prev.filter((m) => m.id !== msgId));
    } catch (_) {}
  };

  const handleUnflagMessage = async (msgId: number) => {
    try {
      await fetch(`/api/admin/chat/messages/${msgId}/flag`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ admin_id: adminId }),
      });
      setFlagged((prev) => prev.filter((m) => m.id !== msgId));
    } catch (_) {}
  };

  const handleUnmute = async (userId: number) => {
    try {
      await fetch(`/api/admin/chat/mute/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({ admin_id: adminId }),
      });
      await load();
    } catch (_) {}
  };

  const handleMuteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMuteError('');
    if (!muteUserId) { setMuteError('User ID is required'); return; }
    try {
      const res = await fetch('/api/admin/chat/mute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
        body: JSON.stringify({
          admin_id: adminId,
          user_id: Number(muteUserId),
          reason: muteReason || null,
          muted_until: muteUntil || null,
        }),
      });
      if (!res.ok) { setMuteError('Failed to mute user. Check user ID.'); return; }
      setMuteUserId('');
      setMuteReason('');
      setMuteUntil('');
      await load();
    } catch (_) { setMuteError('Request failed.'); }
  };

  const formatTs = (iso: string) => new Date(iso).toLocaleString();

  return (
    <div className="flex flex-col h-full dark:bg-dark-bg bg-light-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b dark:border-dark-border border-light-border dark:bg-dark-card bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <ShieldAlertIcon size={20} className="text-red-400" />
          <div>
            <h1 className="text-base font-semibold dark:text-dark-text text-light-text">Chat Moderation</h1>
            <p className="text-xs dark:text-dark-subtle text-light-subtle mt-0.5">Manage flagged messages and muted users</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-dark-card2 dark:text-dark-muted dark:hover:text-dark-text bg-gray-100 text-light-muted hover:text-light-text transition-colors"
        >
          <RefreshCwIcon size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b dark:border-dark-border border-light-border dark:bg-dark-card bg-white flex-shrink-0">
        <button
          onClick={() => setTab('flagged')}
          className={`relative flex items-center gap-2 px-6 py-3 text-xs font-semibold transition-colors ${tab === 'flagged' ? 'dark:text-dark-text text-light-text border-b-2 border-red-400' : 'dark:text-dark-muted text-light-muted'}`}
        >
          <FlagIcon size={13} />
          Flagged Messages
          {flagged.length > 0 && (
            <span className="inline-flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1">
              {flagged.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('muted')}
          className={`flex items-center gap-2 px-6 py-3 text-xs font-semibold transition-colors ${tab === 'muted' ? 'dark:text-dark-text text-light-text border-b-2 border-orange-400' : 'dark:text-dark-muted text-light-muted'}`}
        >
          <VolumeXIcon size={13} />
          Muted Users
          {muted.length > 0 && (
            <span className="inline-flex items-center justify-center bg-orange-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1">
              {muted.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">

        {/* ── Flagged Messages ──────────────────────────────────── */}
        {tab === 'flagged' && (
          <div className="space-y-4">
            {flagged.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 dark:text-dark-muted text-light-muted gap-2">
                <CheckIcon size={36} className="text-green-primary opacity-60" />
                <p className="text-sm font-medium">No flagged messages</p>
                <p className="text-xs opacity-60">All clear — no content has been flagged</p>
              </div>
            ) : (
              flagged.map((msg) => (
                <div
                  key={msg.id}
                  className="dark:bg-dark-card bg-white rounded-xl border dark:border-dark-border border-light-border p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Message content */}
                      <div className="flex items-start gap-2 mb-2">
                        <MessageSquareIcon size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm dark:text-dark-text text-light-text break-words whitespace-pre-wrap">
                          {msg.message_text ?? <em className="opacity-50">[attachment only]</em>}
                        </p>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs dark:text-dark-subtle text-light-subtle">
                        <span>From: <strong className="dark:text-dark-text text-light-text">{msg.sender?.name ?? 'Unknown'}</strong></span>
                        {msg.project && <span>Project: <strong className="dark:text-dark-text text-light-text">{msg.project.name}</strong></span>}
                        <span>{formatTs(msg.created_at)}</span>
                      </div>

                      {/* Flag reason */}
                      {msg.flag_reason && (
                        <div className="mt-2 px-3 py-2 rounded-lg dark:bg-red-500/10 bg-red-50 border dark:border-red-500/20 border-red-200">
                          <p className="text-xs text-red-400 font-medium flex items-center gap-1.5">
                            <FlagIcon size={11} />
                            Flag reason: {msg.flag_reason}
                          </p>
                          {msg.flagged_by && (
                            <p className="text-[10px] text-red-400/70 mt-0.5">Flagged by {msg.flagged_by.name}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleUnflagMessage(msg.id)}
                        title="Remove flag"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium dark:bg-dark-card2 dark:text-dark-muted dark:hover:text-dark-text bg-gray-100 text-light-muted hover:text-light-text transition-colors"
                      >
                        <XIcon size={11} />
                        Unflag
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        title="Delete message"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <TrashIcon size={11} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Muted Users ───────────────────────────────────────── */}
        {tab === 'muted' && (
          <div className="space-y-6">
            {/* Mute form */}
            <div className="dark:bg-dark-card bg-white rounded-xl border dark:border-dark-border border-light-border p-4">
              <h3 className="text-sm font-semibold dark:text-dark-text text-light-text mb-3 flex items-center gap-2">
                <UserXIcon size={15} className="text-orange-400" />
                Mute a User
              </h3>
              <form onSubmit={handleMuteSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs dark:text-dark-subtle text-light-subtle mb-1">User ID *</label>
                  <input
                    type="number"
                    value={muteUserId}
                    onChange={(e) => setMuteUserId(e.target.value)}
                    placeholder="User ID"
                    className="w-full px-3 py-2 text-xs rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-orange-400/50"
                  />
                </div>
                <div>
                  <label className="block text-xs dark:text-dark-subtle text-light-subtle mb-1">Reason</label>
                  <input
                    type="text"
                    value={muteReason}
                    onChange={(e) => setMuteReason(e.target.value)}
                    placeholder="Optional reason"
                    className="w-full px-3 py-2 text-xs rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-orange-400/50"
                  />
                </div>
                <div>
                  <label className="block text-xs dark:text-dark-subtle text-light-subtle mb-1">Muted Until</label>
                  <input
                    type="datetime-local"
                    value={muteUntil}
                    onChange={(e) => setMuteUntil(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-orange-400/50"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-orange-500/15 text-orange-400 hover:bg-orange-500/25 transition-colors"
                  >
                    <VolumeXIcon size={12} />
                    Mute User
                  </button>
                </div>
              </form>
              {muteError && <p className="text-xs text-red-400 mt-2">{muteError}</p>}
            </div>

            {/* Muted users list */}
            {muted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 dark:text-dark-muted text-light-muted gap-2">
                <Volume2Icon size={36} className="opacity-30" />
                <p className="text-sm font-medium">No muted users</p>
              </div>
            ) : (
              <div className="space-y-3">
                {muted.map((m) => (
                  <div key={m.id} className="dark:bg-dark-card bg-white rounded-xl border dark:border-dark-border border-light-border p-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <UserXIcon size={14} className="text-orange-400" />
                        <p className="text-sm font-semibold dark:text-dark-text text-light-text">{m.user.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded dark:bg-dark-card2 dark:text-dark-muted bg-gray-100 text-light-muted capitalize">{m.user.department}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs dark:text-dark-subtle text-light-subtle">
                        {m.reason && <span>Reason: <em>{m.reason}</em></span>}
                        <span>Muted by {m.muted_by.name}</span>
                        {m.muted_until ? (
                          <span>Until: {formatTs(m.muted_until)}</span>
                        ) : (
                          <span className="text-red-400 font-medium">Permanent</span>
                        )}
                        <span>Since: {formatTs(m.created_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnmute(m.user.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium dark:bg-green-primary/10 dark:text-green-primary dark:hover:bg-green-primary/20 bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex-shrink-0"
                    >
                      <Volume2Icon size={12} />
                      Unmute
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
