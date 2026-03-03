import React, { useEffect, useRef } from 'react';
import { XIcon } from 'lucide-react';
import { Button } from './Button';
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
      style={{
        backgroundColor: 'rgba(0,0,0,0.7)'
      }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}>

      <div
        className={`w-full ${sizes[size]} dark:bg-dark-card dark:border-dark-border bg-white border border-light-border rounded-modal shadow-modal flex flex-col max-h-[90vh]`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 dark:border-dark-border border-b border-light-border flex-shrink-0">
          <h2
            id="modal-title"
            className="text-base font-semibold dark:text-dark-text text-light-text">

            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-light-card2 hover:text-light-text transition-colors"
            aria-label="Close modal">

            <XIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {/* Footer */}
        {footer &&
        <div className="px-6 py-4 dark:border-dark-border border-t border-light-border flex items-center justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        }
      </div>
    </div>);

}