import React from 'react';
import { useLayoutStore } from '../store/layoutStore';
import CardMenu from './CardMenu';

/**
 * CardActions - Manages action buttons and menus for cards
 * Provides a clean API for adding functionality to cards
 */
const CardActions = ({
  menuOptions = [],
  onMenuOptionClick,
  submenuOptions = {},
  quickActions = [], // Array of { icon, onClick, title, color }
  position = 'bottom-right', // 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  className = '',
}) => {
  const { inspectMode } = useLayoutStore();
  
  // Helper to get inspect label
  const getInspectTitle = (label) => inspectMode ? label : undefined;
  const positionClasses = {
    'top-right': 'top-2 right-2',
    'bottom-right': 'bottom-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-left': 'bottom-2 left-2',
  };

  // If className includes "relative", don't use absolute positioning (for use in badges)
  const useAbsolute = !className.includes('relative');
  
  return (
    <div
      className={`${useAbsolute ? `absolute ${positionClasses[position]}` : ''} z-20 flex items-center gap-1 ${className}`}
      data-card-action="true"
    >
      {/* Quick action buttons */}
      {quickActions.map((action, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            if (action.onClick) action.onClick(e);
          }}
          className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 transition-all"
          title={getInspectTitle(action.title) || action.title}
          style={action.color ? { color: action.color } : {}}
          data-card-action="true"
        >
          {action.icon}
        </button>
      ))}

      {/* Menu (3-dot menu) */}
      {menuOptions.length > 0 && (
        <CardMenu
          options={menuOptions}
          onOptionClick={onMenuOptionClick}
          submenuOptions={submenuOptions}
        />
      )}
    </div>
  );
};

export default CardActions;

