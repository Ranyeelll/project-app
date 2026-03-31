import React, { useState, useEffect } from 'react';
import { X as XIcon } from 'lucide-react';

export function RetentionModal({
  isOpen,
  initialDays,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  initialDays?: number | null;
  onClose: () => void;
  onSaved?: (days: number) => void;
}) {
  const [days, setDays] = useState<number>(initialDays ?? 365);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDays(initialDays ?? 365);
      setConfirmVisible(false);
      setConfirmText('');
      setError(null);
    }
  }, [isOpen, initialDays]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white dark:bg-dark-card border border-light-border dark:border-dark-border rounded-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b dark:border-dark-border flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold leading-tight">Edit Audit Log Retention</h3>
            <p className="text-sm text-light-subtle mt-1">Set how many days audit logs are retained before automatic removal.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-dark-card2">
            <XIcon size={16} className="text-light-muted" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="text-sm font-medium text-light-muted block mb-2">Retention (days)</label>
            <input
              type="number"
              min={0}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-36 sm:w-40 px-3 py-2 rounded-md border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-primary/30"
            />
          </div>

          {!confirmVisible && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setConfirmVisible(true)}
                className="px-4 py-2 rounded-md bg-green-600 text-white font-semibold shadow-sm hover:brightness-95"
              >
                Save
              </button>
              <button onClick={onClose} className="px-4 py-2 rounded-md border bg-white text-light-text hover:bg-gray-50">Cancel</button>
            </div>
          )}

          {confirmVisible && (
            <div className="p-4 rounded-md bg-yellow-50 border border-yellow-200">
              <p className="text-sm font-medium">Please confirm this change</p>
              <p className="text-xs text-light-subtle mt-1">Type <strong>CONFIRM</strong> below to proceed. This will set retention to <strong>{days}</strong> days.</p>

              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type CONFIRM to proceed"
                className="mt-3 w-full px-3 py-2 rounded-md border border-gray-200 text-sm bg-white focus:outline-none"
              />

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (confirmText.trim().toLowerCase() !== 'confirm') return;
                    setSaving(true);
                    setError(null);
                    try {
                      const res = await fetch('/api/settings/audit-log-retention', {
                        method: 'PUT',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ days }),
                      });
                      if (!res.ok) throw new Error('save failed');
                      const data = await res.json();
                      setSaving(false);
                      onSaved && onSaved(data.audit_log_retention_days ?? days);
                      onClose();
                    } catch (err) {
                      setSaving(false);
                      setError('Failed to save retention policy');
                    }
                  }}
                  disabled={confirmText.trim().toLowerCase() !== 'confirm' || saving}
                  className={`px-4 py-2 rounded-md font-semibold ${confirmText.trim().toLowerCase() === 'confirm' ? 'bg-red-600 text-white' : 'bg-red-200 text-red-700'} disabled:opacity-60`}
                >
                  {saving ? 'Saving...' : 'Confirm Change'}
                </button>
                <button onClick={() => { setConfirmVisible(false); setConfirmText(''); }} className="px-4 py-2 rounded-md border bg-white text-light-text hover:bg-gray-50">Back</button>
              </div>

              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RetentionModal;
