import React from 'react';
import { FOLDER_COLORS } from '../utils/folderColors';

/**
 * BulkTagColorGrid - Shows a grid of 16 colors on hover for bulk tagging
 * Appears when hovering over a video thumbnail in bulk tag mode
 */
const BulkTagColorGrid = ({ 
  videoId, 
  currentFolders = [], 
  selectedFolders = new Set(),
  onColorClick 
}) => {
  return (
    <div 
      className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-20"
      data-card-action="true"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-4 gap-2 p-4 max-w-xs">
        {FOLDER_COLORS.map((color) => {
          const isSelected = selectedFolders.has(color.id);
          const isCurrentlyAssigned = currentFolders.includes(color.id);
          
          return (
            <button
              key={color.id}
              onClick={(e) => {
                e.stopPropagation();
                if (onColorClick) {
                  onColorClick(color.id);
                }
              }}
              className={`
                w-10 h-10 rounded-lg transition-all
                ${isSelected 
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' 
                  : 'hover:scale-105'
                }
                ${isCurrentlyAssigned ? 'opacity-100' : 'opacity-70'}
              `}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            >
              {isSelected && (
                <svg 
                  className="w-6 h-6 text-white mx-auto" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                    clipRule="evenodd" 
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BulkTagColorGrid;

