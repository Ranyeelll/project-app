import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Project } from '../../data/mockData';

interface ApprovalActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  action: string;
  onConfirm: (notes: string) => Promise<void>;
}

const ACTION_LABELS: Record<string, { title: string; color: string; requiresNotes: boolean }> = {
  submit_for_review:  { title: 'Submit for Review',        color: 'primary', requiresNotes: false },
  approve_technical:  { title: 'Approve (Technical)',       color: 'primary', requiresNotes: false },
  approve_accounting: { title: 'Approve (Accounting)',      color: 'primary', requiresNotes: false },
  approve_supervisor: { title: 'Approve (Supervisor)',      color: 'primary', requiresNotes: false },
  approve_superadmin: { title: 'Approve (Superadmin)',      color: 'primary', requiresNotes: false },
  approve_final:      { title: 'Final Approval',            color: 'primary', requiresNotes: false },
  request_revision:   { title: 'Request Revision',          color: 'danger',  requiresNotes: true  },
  reject:             { title: 'Reject Project',            color: 'danger',  requiresNotes: true  },
  resubmit:           { title: 'Resubmit for Review',       color: 'primary', requiresNotes: false },
};

export function ApprovalActionModal({
  isOpen,
  onClose,
  project,
  action,
  onConfirm,
}: ApprovalActionModalProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const config = ACTION_LABELS[action] || { title: action, color: 'primary', requiresNotes: false };

  const handleConfirm = async () => {
    if (config.requiresNotes && !notes.trim()) {
      setError('Notes are required for this action.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onConfirm(notes);
      setNotes('');
      onClose();
    } catch (e: any) {
      setError(e?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={config.title}
      size="md"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={config.color === 'danger' ? 'danger' : 'primary'}
            size="sm"
            loading={loading}
            onClick={handleConfirm}
          >
            Confirm
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm dark:text-dark-muted text-light-muted">
          Project: <span className="font-medium dark:text-dark-text text-light-text">{project.name}</span>
        </p>

        <div>
          <label className="block text-xs font-medium dark:text-dark-text text-light-text mb-1.5">
            Notes{config.requiresNotes ? ' (required)' : ' (optional)'}
          </label>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setError(''); }}
            rows={4}
            placeholder={config.requiresNotes ? 'Explain the reason for this action...' : 'Add optional notes...'}
            className="w-full px-3 py-2 text-sm rounded-lg dark:bg-dark-bg dark:border-dark-border dark:text-dark-text bg-gray-50 border border-light-border text-light-text focus:outline-none focus:ring-1 focus:ring-green-primary/50 resize-none"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}
      </div>
    </Modal>
  );
}
