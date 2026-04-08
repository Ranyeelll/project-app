import React, { useRef, useState } from 'react';
import { X, Upload, Eye } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: number;
    name: string;
    profilePhoto?: string | null;
  };
  onPhotoUpdated: (updatedUser: any) => void;
}

export function ProfilePhotoModal({
  isOpen,
  onClose,
  user,
  onPhotoUpdated,
}: ProfilePhotoModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);

  if (!isOpen) return null;

  const getPhotoUrlWithCache = (url?: string | null) => {
    if (!url) return null;
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}v=${photoVersion}`;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content') || '';
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch(`/api/users/${user.id}/profile-photo`, {
        method: 'POST',
        headers: { 'X-CSRF-TOKEN': csrfToken },
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const updatedUser = await res.json();
      // Increment version to force image reload
      setPhotoVersion((prev) => prev + 1);
      onPhotoUpdated(updatedUser);
    } catch (err) {
      setError('Failed to upload photo. Please try again.');
      console.error('Photo upload error:', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentPhotoUrl = getPhotoUrlWithCache(user.profilePhoto);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="dark:bg-dark-card dark:border dark:border-dark-border bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 dark:border-dark-border border-b border-light-border">
          <h2 className="text-lg font-semibold dark:text-dark-text text-light-text">Profile Photo</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition dark:text-dark-muted dark:hover:bg-dark-card2 dark:hover:text-dark-text text-light-muted hover:bg-gray-100 hover:text-light-text"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Photo Preview */}
          <div className="flex justify-center">
            <div className="relative">
              {currentPhotoUrl ? (
                <img
                  key={photoVersion}
                  src={currentPhotoUrl}
                  alt={user.name}
                  className="w-32 h-32 rounded-full object-cover border-4 dark:border-dark-border border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-bold border-4 dark:border-dark-border border-gray-200">
                  {user.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()}
                </div>
              )}
              {currentPhotoUrl && (
                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-2 shadow-lg">
                  <Eye size={16} className="text-white" />
                </div>
              )}
            </div>
          </div>

          {/* User Name */}
          <div className="text-center">
            <p className="text-sm dark:text-dark-muted text-gray-600">
              Uploading photo for <strong>{user.name}</strong>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-lg transition"
          >
            <Upload size={18} />
            {uploading ? 'Uploading...' : 'Choose Photo'}
          </button>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />

          {/* Info Text */}
          <p className="text-xs dark:text-dark-subtle text-gray-500 text-center">
            Supported formats: JPG, PNG, GIF, WebP (Max 5MB)
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 dark:bg-dark-card2 dark:border-dark-border bg-gray-50 border-t border-light-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 font-medium rounded-lg transition dark:text-dark-text dark:hover:bg-dark-bg text-gray-700 hover:bg-gray-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
