import React from 'react';
import { FOLDER_COLORS } from '../utils/folderColors';

/**
 * StarColorPicker - Shows a grid of 16 colored stars on hover
 * Appears when hovering over the star icon on video thumbnails
 * Left click: assign video to folder
 * Right click: set as quick assign default
 */
const StarColorPicker = ({ 
  currentFolders = [], 
  quickAssignFolder,
  onColorLeftClick,
  onColorRightClick
}) => {
  return (
    <div 
      className="bg-black/90 backdrop-blur-sm rounded-lg p-2 shadow-xl border border-white/10 pointer-events-auto"
      data-card-action="true"
      data-star-picker="true"
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{ 
        width: '180px'
      }}
    >
      <div className="grid grid-cols-4 gap-1.5">
        {FOLDER_COLORS.map((color) => {
          const isCurrentlyAssigned = currentFolders.includes(color.id);
          const isQuickAssign = color.id === quickAssignFolder;
          
          return (
            <button
              key={color.id}
              onClick={(e) => {
                e.stopPropagation();
                if (onColorLeftClick) {
                  onColorLeftClick(color.id);
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onColorRightClick) {
                  onColorRightClick(color.id);
                }
              }}
              className={`
                relative w-8 h-8 rounded-lg transition-all flex items-center justify-center
                ${isCurrentlyAssigned 
                  ? 'ring-2 ring-white ring-offset-1 ring-offset-black' 
                  : 'hover:scale-110'
                }
                ${isQuickAssign ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-black' : ''}
              `}
              style={{ backgroundColor: color.hex }}
              title={isQuickAssign 
                ? `${color.name} (Quick Assign - Right click to change)` 
                : `${color.name} (Right click to set as Quick Assign)`
              }
            >
              <svg
                className={`w-4 h-4 ${isCurrentlyAssigned ? 'text-white' : 'text-white/60'}`}
                fill={isCurrentlyAssigned ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={isCurrentlyAssigned ? 0 : 2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
              {isQuickAssign && (
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-400 rounded-full border-2 border-black z-10" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StarColorPicker;

