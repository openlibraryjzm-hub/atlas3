import React from 'react';

/**
 * Card content area - for title, description, metadata, etc.
 */
const CardContent = ({
  children,
  title,
  subtitle,
  metadata,
  actions, // Action buttons/menus that go in bottom-right
  headerActions, // Actions that go next to the title
  className = '',
  padding = 'p-3',
}) => {
  return (
    <div className={`${padding} relative ${className}`}>
      <div className="flex items-start justify-between gap-2">
        {title && (
          <h3 className="font-medium text-sm truncate transition-colors flex-1"
              style={{ color: '#052F4A' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#38bdf8'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#052F4A'}>
            {title}
          </h3>
        )}
        {headerActions && (
          <div className="flex-shrink-0" data-card-action="true">
            {headerActions}
          </div>
        )}
      </div>
      {subtitle && (
        <p className="text-slate-400 text-xs mt-1 line-clamp-2">
          {subtitle}
        </p>
      )}
      {metadata && (
        <div className="mt-1 text-slate-500 text-xs">
          {metadata}
        </div>
      )}
      {children}

      {/* Actions positioned in bottom-right */}
      {actions && (
        <div className="absolute bottom-2 right-2" data-card-action="true">
          {actions}
        </div>
      )}
    </div>
  );
};

export default CardContent;

