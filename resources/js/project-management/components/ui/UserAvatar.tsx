import React, { useMemo } from 'react';

interface UserAvatarProps {
  name: string;
  avatarText?: string;
  profilePhoto?: string | null;
  className?: string;
  textClassName?: string;
  fallbackStyle?: React.CSSProperties;
  title?: string;
}

function getInitials(name: string, avatarText?: string): string {
  if (avatarText && avatarText.trim()) return avatarText.trim();
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function getPhotoUrlWithCache(url?: string | null): string | null {
  if (!url) return null;
  // Add cache-busting timestamp for real-time photo updates
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

export function UserAvatar({
  name,
  avatarText,
  profilePhoto,
  className = 'w-8 h-8',
  textClassName = 'text-xs font-bold text-black',
  fallbackStyle,
  title,
}: UserAvatarProps) {
  const initials = getInitials(name, avatarText);
  const cachedPhoto = useMemo(() => getPhotoUrlWithCache(profilePhoto), [profilePhoto]);

  if (cachedPhoto) {
    return (
      <img
        src={cachedPhoto}
        alt={name}
        title={title || name}
        className={`${className} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  return (
    <div
      title={title || name}
      className={`${className} rounded-full flex items-center justify-center flex-shrink-0 ${textClassName}`}
      style={fallbackStyle || { backgroundColor: '#63D44A' }}
    >
      {initials}
    </div>
  );
}
