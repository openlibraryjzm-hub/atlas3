import React from 'react';
import { getThumbnailUrl } from '../utils/youtubeUtils';

const PlaylistView = ({ playlistId, items, onVideoSelect, onRefresh }) => {
  if (!items || items.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-white text-lg">This playlist is empty</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((item) => {
          const thumbnailUrl = getThumbnailUrl(item.video_id, 'medium');
          
          return (
            <div
              key={item.id}
              onClick={() => onVideoSelect && onVideoSelect(item.video_url)}
              className="cursor-pointer group bg-slate-800 rounded-lg overflow-hidden hover:bg-slate-700 transition-all duration-200 hover:scale-105"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-slate-900">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={item.title || 'Video thumbnail'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"%3E%3Crect fill="%23334155" width="320" height="180"/%3E%3Ctext fill="%2394a3b8" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-family="Arial" font-size="14"%3ENo Thumbnail%3C/text%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    No Thumbnail
                  </div>
                )}
                {/* Play overlay on hover */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg
                      className="w-16 h-16 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Title */}
              <div className="p-3">
                <p className="text-white text-sm font-medium line-clamp-2">
                  {item.title || `Video ${item.video_id}`}
                </p>
                {item.position !== undefined && (
                  <p className="text-slate-400 text-xs mt-1">#{item.position + 1}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlaylistView;

