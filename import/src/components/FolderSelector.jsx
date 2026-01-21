import React, { useEffect, useState } from 'react';
import { useFolderStore } from '../store/folderStore';
import { usePlaylistStore } from '../store/playlistStore';
import { useLayoutStore } from '../store/layoutStore';
import { FOLDER_COLORS } from '../utils/folderColors';
import { getVideoFolderAssignments } from '../api/playlistApi';

const FolderSelector = ({ compact = false }) => {
  const { selectedFolder, setSelectedFolder, videoFolderAssignments } = useFolderStore();
  const {
    currentPlaylistItems,
    currentPlaylistId,
    previewPlaylistItems,
    previewPlaylistId
  } = usePlaylistStore();
  const { inspectMode } = useLayoutStore();

  const [folderCounts, setFolderCounts] = useState({});
  const [allCount, setAllCount] = useState(0);
  const [unsortedCount, setUnsortedCount] = useState(0);

  // Helper to get inspect label
  const getInspectTitle = (label) => inspectMode ? label : undefined;

  // Calculate folder counts based on active playlist
  useEffect(() => {
    const calculateCounts = async () => {
      const activeItems = previewPlaylistItems || currentPlaylistItems;
      const activeId = previewPlaylistId || currentPlaylistId;

      if (!activeId || activeItems.length === 0) {
        setFolderCounts({});
        setAllCount(0);
        setUnsortedCount(0);
        return;
      }

      const counts = {};
      let unsorted = 0;

      // Initialize counts to 0
      FOLDER_COLORS.forEach(c => counts[c.id] = 0);

      // Iterate through all videos in the active playlist
      // We use the store's videoFolderAssignments if available for instant updates,
      // but strictly we should check the assignments for the *current playlist context*.
      // Since videoFolderAssignments in store might be partial or global, let's rely on what we have loaded.

      // Count videos that have folder assignments
      for (const video of activeItems) {
        const folders = videoFolderAssignments[video.id] || [];

        if (folders.length === 0) {
          unsorted++;
        } else {
          folders.forEach(folderId => {
            if (counts[folderId] !== undefined) {
              counts[folderId]++;
            }
          });
        }
      }

      setFolderCounts(counts);
      setAllCount(activeItems.length);
      setUnsortedCount(unsorted);
    };

    calculateCounts();
  }, [currentPlaylistItems, previewPlaylistItems, currentPlaylistId, previewPlaylistId, videoFolderAssignments]);

  return (
    <div className={`flex items-center ${compact ? 'gap-1 px-0 py-0' : 'gap-2 px-2 py-1'}`}>
      {/* "All" button */}
      <button
        onClick={() => setSelectedFolder(null)}
        className={`rounded-lg font-medium transition-all flex items-center gap-1 ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
          } ${selectedFolder === null
            ? 'bg-slate-600 text-white'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        title={getInspectTitle(`Show all videos (${allCount})`) || `Show all videos (${allCount})`}
      >
        All <span className="opacity-70">({allCount})</span>
      </button>

      {/* "Unsorted" button */}
      <button
        onClick={() => setSelectedFolder(selectedFolder === 'unsorted' ? null : 'unsorted')} // Toggle or select? behave like folders
        className={`rounded-lg font-medium transition-all flex items-center gap-1 ${compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs'
          } ${selectedFolder === 'unsorted'
            ? 'bg-slate-500 text-white ring-2 ring-white ring-offset-2 ring-offset-slate-900'
            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        title={getInspectTitle(`Show unsorted videos (${unsortedCount})`) || `Show unsorted videos (${unsortedCount})`}
      >
        Unsorted <span className="opacity-70">({unsortedCount})</span>
      </button>

      {/* Colored dots with counts */}
      <div className={`flex items-center ${compact ? 'gap-1 ml-1' : 'gap-2 ml-2'}`}>
        {FOLDER_COLORS.map((color) => {
          const count = folderCounts[color.id] || 0;
          return (
            <button
              key={color.id}
              onClick={() => setSelectedFolder(selectedFolder === color.id ? null : color.id)}
              className={`rounded-full transition-all hover:scale-110 flex items-center justify-center relative ${compact ? 'w-6 h-6' : 'w-8 h-8'
                } ${selectedFolder === color.id
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110'
                  : 'opacity-80 hover:opacity-100'
                }`}
              style={{ backgroundColor: color.hex }}
              title={getInspectTitle(`${color.name} folder (${count} videos)`) || `${color.name} (${count})`}
            >
              {count > 0 && (
                <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-bold text-white drop-shadow-md`}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FolderSelector;

