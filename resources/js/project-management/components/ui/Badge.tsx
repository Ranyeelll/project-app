import React from 'react';
type BadgeVariant =
'default' |
'success' |
'warning' |
'danger' |
'info' |
'purple' |
'muted';
interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  dot?: boolean;
}
export function Badge({
  variant = 'default',
  children,
  size = 'sm',
  dot = false
}: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-gray-500/20 text-gray-400 dark:text-gray-300',
    success: 'bg-green-primary/15 text-green-primary',
    warning: 'bg-yellow-500/15 text-yellow-400',
    danger: 'bg-red-500/15 text-red-400',
    info: 'bg-blue-500/15 text-blue-400',
    purple: 'bg-purple-500/15 text-purple-400',
    muted:
    'dark:bg-dark-border dark:text-dark-muted bg-light-card2 text-light-muted'
  };
  const dotColors: Record<BadgeVariant, string> = {
    default: 'bg-gray-400',
    success: 'bg-green-primary',
    warning: 'bg-yellow-400',
    danger: 'bg-red-400',
    info: 'bg-blue-400',
    purple: 'bg-purple-400',
    muted: 'bg-gray-400'
  };
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs'
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>

      {dot &&
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColors[variant]}`} />

      }
      {children}
    </span>);

}
export function StatusBadge({ status }: {status: string;}) {
  const map: Record<
    string,
    {
      variant: BadgeVariant;
      label: string;
    }> =
  {
    active: {
      variant: 'success',
      label: 'Active'
    },
    completed: {
      variant: 'info',
      label: 'Completed'
    },
    'on-hold': {
      variant: 'warning',
      label: 'On Hold'
    },
    archived: {
      variant: 'muted',
      label: 'Archived'
    },
    todo: {
      variant: 'muted',
      label: 'To Do'
    },
    'in-progress': {
      variant: 'info',
      label: 'In Progress'
    },
    review: {
      variant: 'purple',
      label: 'In Review'
    },
    pending: {
      variant: 'warning',
      label: 'Pending'
    },
    approved: {
      variant: 'success',
      label: 'Approved'
    },
    rejected: {
      variant: 'danger',
      label: 'Rejected'
    },
    revision_requested: {
      variant: 'purple',
      label: 'Revision Requested'
    },
    open: {
      variant: 'danger',
      label: 'Open'
    },
    resolved: {
      variant: 'success',
      label: 'Resolved'
    },
    closed: {
      variant: 'muted',
      label: 'Closed'
    },
    inactive: {
      variant: 'muted',
      label: 'Inactive'
    },
    none: {
      variant: 'muted',
      label: 'No Report'
    },
    draft: {
      variant: 'muted',
      label: 'Draft'
    },
    technical_review: {
      variant: 'info',
      label: 'Tech Review'
    },
    accounting_review: {
      variant: 'warning',
      label: 'Acct Review'
    },
    submitted: {
      variant: 'info',
      label: 'Submitted'
    },
    reviewed: {
      variant: 'purple',
      label: 'Reviewed'
    }
  };
  const config = map[status] || {
    variant: 'default' as BadgeVariant,
    label: status
  };
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>);

}
export function PriorityBadge({ priority }: {priority: string;}) {
  const map: Record<
    string,
    {
      variant: BadgeVariant;
      label: string;
    }> =
  {
    low: {
      variant: 'muted',
      label: 'Low'
    },
    medium: {
      variant: 'info',
      label: 'Medium'
    },
    high: {
      variant: 'warning',
      label: 'High'
    },
    critical: {
      variant: 'danger',
      label: 'Critical'
    }
  };
  const config = map[priority] || {
    variant: 'default' as BadgeVariant,
    label: priority
  };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}