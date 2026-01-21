import React from 'react';

/**
 * Robust, reusable Card component that handles all interaction logic cleanly
 * Makes it easy to add buttons, menus, and other UI elements without breaking click handlers
 */
const Card = ({
  children,
  onClick,
  className = '',
  hoverable = true,
  variant = 'default', // 'default' | 'minimal'
  disabled = false,
  selected = false,
  playing = false,
  // Action areas - these won't trigger card click
  actionAreas = [], // Array of refs or selectors for areas that shouldn't trigger card click
}) => {
  const cardRef = React.useRef(null);

  const handleClick = (e) => {
    if (disabled) return;

    // Check if click originated from an action area
    const clickedInActionArea = actionAreas.some((area) => {
      if (typeof area === 'string') {
        // CSS selector
        return e.target.closest(area);
      }
      if (area?.current) {
        // React ref
        return area.current?.contains(e.target);
      }
      if (area) {
        // DOM element
        return area.contains(e.target);
      }
      return false;
    });

    // Check for data attributes that mark action areas
    const clickedInDataAction = e.target.closest('[data-card-action]') !== null;
    const clickedInMenu = e.target.closest('[data-card-menu]') !== null;

    if (clickedInActionArea || clickedInDataAction || clickedInMenu) {
      return; // Don't trigger card click
    }

    if (onClick) {
      onClick(e);
    }
  };

  const isMinimal = variant === 'minimal';

  const baseClasses = `
    relative
    rounded-lg
    overflow-visible
    transition-all
    duration-200
    ${hoverable && !disabled ? 'group cursor-pointer' : ''}
    ${selected ? 'border-sky-400' : playing ? 'border-sky-500 ring-2 ring-sky-500/50' : isMinimal ? 'border-transparent' : 'border-slate-700'}
    ${hoverable && !disabled ? (isMinimal ? 'hover:bg-transparent' : 'hover:bg-slate-700 hover:border-sky-500') : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${isMinimal ? 'bg-transparent border-0' : 'bg-slate-800 border'}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      className={baseClasses}
      data-card="true"
    >
      {children}
    </div>
  );
};

export default Card;

