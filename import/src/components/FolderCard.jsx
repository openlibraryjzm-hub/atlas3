import React from 'react';
import { getThumbnailUrl } from '../utils/youtubeUtils';
import { getFolderColorById } from '../utils/folderColors';

/**
 * FolderCard - Displays a colored folder in the playlist menu
 * Shows folder color, playlist name, thumbnail, and video count
 */
const FolderCard = ({ folder, onFolderClick }) => {
  const folderColor = getFolderColorById(folder.folder_color);
  const thumbnailUrl = folder.first_video 
    ? getThumbnailUrl(folder.first_video.video_id, 'medium') 
    : null;

  const handleClick = () => {
    if (onFolderClick && folder.first_video) {
      onFolderClick(folder.first_video.video_url, folder.playlist_id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer group bg-slate-800 rounded-lg p-3 hover:bg-slate-700 transition-all duration-200 border border-slate-700 hover:border-sky-500"
    >
      <div className="flex items-center gap-3">
        {/* Folder Color Indicator + Thumbnail */}
        <div className="flex-shrink-0 relative w-16 h-16 rounded bg-slate-700 overflow-hidden">
          {/* Colored folder indicator - left border */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 z-10"
            style={{ backgroundColor: folderColor.hex }}
          />
          
          {/* Thumbnail */}
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={folder.first_video?.title || 'Folder thumbnail'}
              className="w-full h-full object-cover pl-2"
              onError={(e) => {
                e.target.style.display = 'none';
                if (e.target.nextElementSibling) {
                  e.target.nextElementSibling.style.display = 'flex';
                }
              }}
            />
          ) : null}
          <div
            className={`w-full h-full flex items-center justify-center pl-2 ${
              thumbnailUrl ? 'hidden' : 'flex'
            }`}
          >
            <svg
              className="w-8 h-8 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
        </div>

        {/* Folder Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Colored dot indicator */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: folderColor.hex }}
            />
            <h3 className="text-white font-medium text-sm truncate group-hover:text-sky-400 transition-colors">
              {folderColor.name} Folder
            </h3>
          </div>
          <p className="text-slate-400 text-xs mt-1 line-clamp-1">
            {folder.playlist_name}
          </p>
          {folder.video_count > 0 && (
            <p className="text-slate-500 text-xs mt-1">
              {folder.video_count} video{folder.video_count !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Play Icon */}
        <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className="w-6 h-6 text-sky-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default FolderCard;

