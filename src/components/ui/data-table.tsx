import React, { useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
  width?: number;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  height?: number;
  itemHeight?: number;
  className?: string;
  onRowClick?: (item: T) => void;
  virtualize?: boolean;
  emptyMessage?: string;
}

/**
 * Reusable DataTable component with virtualization support
 * Supports sorting, custom rendering, and performance optimization
 */
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  height = 400,
  itemHeight = 50,
  className,
  onRowClick,
  virtualize = true,
  emptyMessage = 'No data available',
}: DataTableProps<T>) {
  const totalWidth = useMemo(
    () => columns.reduce((sum, col) => sum + (col.width || 150), 0),
    [columns]
  );

  const shouldVirtualize = virtualize && data.length > 20;

  logger.debug('DataTable render', {
    dataLength: data.length,
    shouldVirtualize,
    totalWidth,
  });

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center h-32 text-muted-foreground',
          className
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  const renderRow = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const item = data[index];
    if (!item) return null;
    return (
      <div
        key={String(item[keyField])}
        style={style}
        className={cn(
          'flex border-b border-border hover:bg-muted/50 transition-colors',
          onRowClick && 'cursor-pointer'
        )}
        onClick={() => onRowClick?.(item)}
      >
        {columns.map(column => {
          const value = item[column.key as keyof T];
          const content = column.render
            ? column.render(value, item)
            : String(value ?? '');

          return (
            <div
              key={String(column.key)}
              className={cn('px-3 py-2 truncate', column.className)}
              style={{ width: column.width || 150 }}
            >
              {content}
            </div>
          );
        })}
      </div>
    );
  };

  const renderHeader = () => (
    <div className='flex border-b-2 border-border bg-muted/30 font-medium'>
      {columns.map(column => (
        <div
          key={String(column.key)}
          className='px-3 py-3 truncate'
          style={{ width: column.width || 150 }}
        >
          {column.header}
        </div>
      ))}
    </div>
  );

  if (shouldVirtualize) {
    return (
      <div
        className={cn(
          'border border-border rounded-md overflow-hidden',
          className
        )}
      >
        {renderHeader()}
        <List
          height={height - itemHeight} // Subtract header height
          itemCount={data.length}
          itemSize={itemHeight}
          width={totalWidth}
        >
          {renderRow}
        </List>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'border border-border rounded-md overflow-hidden',
        className
      )}
    >
      {renderHeader()}
      <div className='max-h-96 overflow-auto'>
        {data.map((item, index) => renderRow({ index, style: {} }))}
      </div>
    </div>
  );
}

/**
 * Composition component for table actions
 */
export const TableActions: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('flex items-center gap-2', className)}>{children}</div>
);

/**
 * Composition component for table filters
 */
export const TableFilters: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('flex flex-wrap items-center gap-4 mb-4', className)}>
    {children}
  </div>
);

/**
 * Composition component for table pagination
 */
export const TablePagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}> = ({ currentPage, totalPages, onPageChange, className }) => {
  const pages = useMemo(() => {
    const result = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      result.push(i);
    }

    return result;
  }, [currentPage, totalPages]);

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className='text-sm text-muted-foreground'>
        Page {currentPage} of {totalPages}
      </div>
      <div className='flex items-center gap-1'>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className='px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50'
        >
          Previous
        </button>
        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              'px-3 py-1 text-sm border border-border rounded',
              page === currentPage
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            )}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className='px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-50'
        >
          Next
        </button>
      </div>
    </div>
  );
};
