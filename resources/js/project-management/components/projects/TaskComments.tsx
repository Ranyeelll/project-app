import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquareIcon,
  SendIcon,
  EditIcon,
  Trash2Icon,
  CornerDownRightIcon,
  XIcon,
  LoaderIcon,
} from 'lucide-react';
import { apiFetch } from '../../utils/apiFetch';
import { useAuth } from '../../context/AppContext';
import { TaskComment } from '../../data/mockData';
import { isElevatedRole } from '../../utils/roles';

interface TaskCommentsProps {
  taskId: string;
  taskTitle?: string;
}

export function TaskComments({ taskId, taskTitle }: TaskCommentsProps) {
  const { currentUser } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchComments = async () => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch {
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  const handleSubmit = async () => {
    if (!newBody.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: newBody.trim() }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setNewBody('');
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        const err = await res.json().catch(() => null);
        setError(err?.message || 'Failed to post comment');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyBody.trim() || !replyToId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: replyBody.trim(), parent_id: replyToId }),
      });
      if (res.ok) {
        const comment = await res.json();
        setComments((prev) => [...prev, comment]);
        setReplyBody('');
        setReplyToId(null);
      } else {
        const err = await res.json().catch(() => null);
        setError(err?.message || 'Failed to post reply');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editBody.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ body: editBody.trim() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
        setEditingId(null);
        setEditBody('');
      } else {
        const err = await res.json().catch(() => null);
        setError(err?.message || 'Failed to edit comment');
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      const res = await apiFetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId && c.parentId !== commentId));
      }
    } catch {
      setError('Failed to delete comment');
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Build threaded structure: top-level + replies
  const topLevel = comments.filter((c) => !c.parentId);
  const replies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  const canModify = (comment: TaskComment) =>
    String(comment.userId) === String(currentUser?.id) || isElevatedRole(currentUser?.role);

  const renderComment = (comment: TaskComment, isReply = false) => (
    <div
      key={comment.id}
      className={`group ${isReply ? 'ml-6 pl-3 border-l-2 dark:border-dark-border border-light-border' : ''}`}
    >
      <div className="flex items-start gap-2.5 py-2">
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-green-primary/15 flex items-center justify-center flex-shrink-0 text-xs font-bold text-green-primary">
          {comment.userName?.charAt(0)?.toUpperCase() || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold dark:text-dark-text text-light-text">
              {comment.userName}
            </span>
            <span className="text-[10px] dark:text-dark-subtle text-light-subtle">
              {formatTime(comment.createdAt)}
            </span>
            {comment.updatedAt !== comment.createdAt && (
              <span className="text-[10px] dark:text-dark-subtle text-light-subtle italic">(edited)</span>
            )}
          </div>

          {editingId === comment.id ? (
            <div className="flex gap-2 mt-1">
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                className="flex-1 text-xs dark:bg-dark-card2 bg-light-card2 dark:text-dark-text text-light-text border dark:border-dark-border border-light-border rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-green-primary"
                rows={2}
                autoFocus
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleEdit(comment.id)}
                  disabled={submitting}
                  className="text-[10px] text-green-primary hover:text-green-500 font-medium"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingId(null); setEditBody(''); }}
                  className="text-[10px] dark:text-dark-muted text-light-muted hover:text-red-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs dark:text-dark-muted text-light-muted whitespace-pre-wrap break-words">
              {comment.body}
            </p>
          )}

          {/* Actions */}
          {editingId !== comment.id && (
            <div className="flex items-center gap-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isReply && (
                <button
                  onClick={() => { setReplyToId(comment.id); setReplyBody(''); }}
                  className="flex items-center gap-1 text-[10px] dark:text-dark-subtle text-light-subtle hover:text-green-primary transition-colors"
                >
                  <CornerDownRightIcon size={10} />
                  Reply
                </button>
              )}
              {canModify(comment) && (
                <>
                  <button
                    onClick={() => { setEditingId(comment.id); setEditBody(comment.body); }}
                    className="flex items-center gap-1 text-[10px] dark:text-dark-subtle text-light-subtle hover:text-blue-400 transition-colors"
                  >
                    <EditIcon size={10} />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="flex items-center gap-1 text-[10px] dark:text-dark-subtle text-light-subtle hover:text-red-400 transition-colors"
                  >
                    <Trash2Icon size={10} />
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inline reply form */}
      {replyToId === comment.id && (
        <div className="ml-9 mt-1 mb-2 flex gap-2">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder={`Reply to ${comment.userName}...`}
            className="flex-1 text-xs dark:bg-dark-card2 bg-light-card2 dark:text-dark-text text-light-text border dark:border-dark-border border-light-border rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-green-primary"
            rows={2}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); }
            }}
          />
          <div className="flex flex-col gap-1">
            <button
              onClick={handleReply}
              disabled={submitting || !replyBody.trim()}
              className="p-1.5 rounded-lg bg-green-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              <SendIcon size={12} />
            </button>
            <button
              onClick={() => { setReplyToId(null); setReplyBody(''); }}
              className="p-1.5 rounded-lg dark:text-dark-muted text-light-muted hover:text-red-400"
            >
              <XIcon size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Nested replies */}
      {replies(comment.id).map((reply) => renderComment(reply, true))}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquareIcon size={14} className="text-green-primary" />
        <h4 className="text-sm font-semibold dark:text-dark-text text-light-text">
          Discussion {comments.length > 0 && `(${comments.length})`}
        </h4>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Comments list */}
      <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <LoaderIcon size={16} className="animate-spin dark:text-dark-muted text-light-muted" />
          </div>
        ) : topLevel.length === 0 ? (
          <p className="text-xs dark:text-dark-subtle text-light-subtle text-center py-4">
            No comments yet. Start a discussion.
          </p>
        ) : (
          topLevel.map((c) => renderComment(c))
        )}
        <div ref={bottomRef} />
      </div>

      {/* New comment input */}
      <div className="flex gap-2 pt-2 border-t dark:border-dark-border border-light-border">
        <textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 text-xs dark:bg-dark-card2 bg-light-card2 dark:text-dark-text text-light-text border dark:border-dark-border border-light-border rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-green-primary"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
          }}
        />
        <button
          onClick={handleSubmit}
          disabled={submitting || !newBody.trim()}
          className="self-end p-2.5 rounded-lg bg-green-primary text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {submitting ? <LoaderIcon size={14} className="animate-spin" /> : <SendIcon size={14} />}
        </button>
      </div>
    </div>
  );
}
