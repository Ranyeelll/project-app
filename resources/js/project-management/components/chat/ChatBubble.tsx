import React, { useEffect, useRef, useState } from 'react';
import { MessageCircleIcon, XIcon } from 'lucide-react';
import { useAuth } from '../../context/AppContext';
import { ProjectChatPage } from '../../pages/ProjectChatPage';

const BUBBLE_SIZE = 64;
const EDGE_GAP = 24;
const DRAG_STORAGE_KEY = 'maptech-chat-bubble-pos-v1';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function ChatBubble() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [bubblePos, setBubblePos] = useState<{ x: number; y: number } | null>(null);

  const dragStateRef = useRef({
    dragging: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    moved: false,
  });
  const suppressClickRef = useRef(false);

  const currentUserId = currentUser ? Number(currentUser.id) : 0;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const fallback = {
      x: window.innerWidth - BUBBLE_SIZE - EDGE_GAP,
      y: window.innerHeight - BUBBLE_SIZE - EDGE_GAP,
    };

    try {
      const saved = window.localStorage.getItem(DRAG_STORAGE_KEY);
      if (!saved) {
        setBubblePos(fallback);
        return;
      }

      const parsed = JSON.parse(saved) as { x?: number; y?: number };
      if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') {
        setBubblePos(fallback);
        return;
      }

      setBubblePos({
        x: clamp(parsed.x, 8, window.innerWidth - BUBBLE_SIZE - 8),
        y: clamp(parsed.y, 8, window.innerHeight - BUBBLE_SIZE - 8),
      });
    } catch {
      setBubblePos(fallback);
    }
  }, []);

  useEffect(() => {
    if (!bubblePos || typeof window === 'undefined') return;

    const onResize = () => {
      setBubblePos((prev) => {
        if (!prev) return prev;
        return {
          x: clamp(prev.x, 8, window.innerWidth - BUBBLE_SIZE - 8),
          y: clamp(prev.y, 8, window.innerHeight - BUBBLE_SIZE - 8),
        };
      });
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [bubblePos]);

  useEffect(() => {
    if (!currentUserId) return;

    let mounted = true;

    const loadUnread = async () => {
      try {
        const [notifRes, dmRes] = await Promise.all([
          fetch(`/api/notifications?user_id=${currentUserId}`),
          fetch(`/api/direct-conversations?user_id=${currentUserId}`),
        ]);

        const notifData = notifRes.ok ? await notifRes.json() : [];
        const dmData = dmRes.ok ? await dmRes.json() : [];

        const notifUnread = Array.isArray(notifData)
          ? notifData.filter((n: { is_read?: boolean }) => !n.is_read).length
          : 0;

        const dmUnread = Array.isArray(dmData)
          ? dmData.reduce((sum: number, c: { unread_count?: number }) => sum + (c.unread_count ?? 0), 0)
          : 0;

        if (mounted) {
          setUnread(notifUnread + dmUnread);
        }
      } catch {
        // Ignore intermittent polling/network issues.
      }
    };

    loadUnread();
    const interval = setInterval(loadUnread, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!bubblePos || typeof window === 'undefined') return;
    window.localStorage.setItem(DRAG_STORAGE_KEY, JSON.stringify(bubblePos));
  }, [bubblePos]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag.dragging || e.pointerId !== drag.pointerId) return;

      const nextX = clamp(e.clientX - drag.offsetX, 8, window.innerWidth - BUBBLE_SIZE - 8);
      const nextY = clamp(e.clientY - drag.offsetY, 8, window.innerHeight - BUBBLE_SIZE - 8);

      if (Math.abs(e.clientX - drag.startX) > 4 || Math.abs(e.clientY - drag.startY) > 4) {
        drag.moved = true;
      }

      setBubblePos({ x: nextX, y: nextY });
    };

    const onPointerUp = (e: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag.dragging || e.pointerId !== drag.pointerId) return;
      drag.dragging = false;
      drag.pointerId = -1;
      suppressClickRef.current = drag.moved;
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  const handleBubblePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (isOpen || !bubblePos) return;
    const drag = dragStateRef.current;
    drag.dragging = true;
    drag.pointerId = e.pointerId;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
    drag.offsetX = e.clientX - bubblePos.x;
    drag.offsetY = e.clientY - bubblePos.y;
    drag.moved = false;
  };

  const handleBubbleClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setIsOpen(true);
  };

  if (!currentUser) return null;

  const defaultX = typeof window !== 'undefined' ? window.innerWidth - BUBBLE_SIZE - EDGE_GAP : 24;
  const defaultY = typeof window !== 'undefined' ? window.innerHeight - BUBBLE_SIZE - EDGE_GAP : 24;
  const resolvedPos = bubblePos || { x: defaultX, y: defaultY };

  return (
    <div
      className="fixed z-[70]"
      style={isOpen ? { right: EDGE_GAP, bottom: EDGE_GAP } : { left: resolvedPos.x, top: resolvedPos.y }}
    >
      {!isOpen && unread > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full min-w-[22px] h-[22px] px-1 flex items-center justify-center text-[11px] font-bold animate-pulse z-10">
          {unread > 99 ? '99+' : unread}
        </span>
      )}

      {!isOpen ? (
        <button
          onPointerDown={handleBubblePointerDown}
          onClick={handleBubbleClick}
          className="w-16 h-16 rounded-full bg-green-600 text-black shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center hover:scale-105"
          title="Open Chat"
          aria-label="Open Chat"
        >
          <MessageCircleIcon size={28} />
        </button>
      ) : (
        <div className="w-[min(92vw,780px)] h-[min(82vh,620px)] rounded-xl overflow-hidden border dark:border-dark-border border-light-border shadow-2xl bg-white dark:bg-dark-card flex flex-col">
          <div className="h-12 px-4 flex items-center justify-between border-b dark:border-dark-border border-light-border dark:bg-dark-bg bg-gray-50 flex-shrink-0">
            <h3 className="text-sm font-semibold dark:text-dark-text text-light-text">Chat</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg dark:hover:bg-dark-card2 hover:bg-gray-200 transition-colors"
              title="Close Chat"
              aria-label="Close Chat"
            >
              <XIcon size={16} className="dark:text-dark-muted text-light-muted" />
            </button>
          </div>

          <div className="flex-1 min-h-0">
            <ProjectChatPage />
          </div>
        </div>
      )}
    </div>
  );
}
