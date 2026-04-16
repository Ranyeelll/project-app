import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

interface PaginationProps {
  currentPage: number; // 0-indexed
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  label = 'items',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = currentPage * pageSize + 1;
  const end = Math.min((currentPage + 1) * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between gap-4 pt-3">
      <span className="text-xs dark:text-dark-muted text-light-muted">
        Showing {start}–{end} of {totalItems} {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
          className="p-1.5 rounded-lg dark:bg-dark-card2 bg-light-card2 border dark:border-dark-border border-light-border dark:text-dark-muted text-light-muted hover:text-green-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeftIcon size={14} />
        </button>
        <span className="text-xs dark:text-dark-text text-light-text font-medium min-w-[60px] text-center">
          {currentPage + 1} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
          className="p-1.5 rounded-lg dark:bg-dark-card2 bg-light-card2 border dark:border-dark-border border-light-border dark:text-dark-muted text-light-muted hover:text-green-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRightIcon size={14} />
        </button>
      </div>
    </div>
  );
}
