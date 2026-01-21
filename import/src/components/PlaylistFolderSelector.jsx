import React, { useState, useEffect, useMemo } from 'react';
import { getAllPlaylists, getAllFoldersWithVideos } from '../api/playlistApi';
import { getFolderColorById } from '../utils/folderColors';

const PlaylistFolderSelector = ({ onSelect, onCancel }) => {
  const [playlists, setPlaylists] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlaylists, setExpandedPlaylists] = useState(new Set());
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load playlists
      const playlistsData = await getAllPlaylists();
      setPlaylists(Array.isArray(playlistsData) ? playlistsData : []);
      
      // Load folders
      const foldersData = await getAllFoldersWithVideos();
      setFolders(Array.isArray(foldersData) ? foldersData : []);
    } catch (error) {
      console.error('Failed to load playlists/folders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group folders by playlist_id
  const foldersByPlaylist = useMemo(() => {
    const grouped = {};
    folders.forEach(folder => {
      if (!grouped[folder.playlist_id]) {
        grouped[folder.playlist_id] = [];
      }
      grouped[folder.playlist_id].push(folder);
    });
    return grouped;
  }, [folders]);

  const togglePlaylistExpanded = (playlistId) => {
    setExpandedPlaylists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playlistId)) {
        newSet.delete(playlistId);
      } else {
        newSet.add(playlistId);
      }
      return newSet;
    });
  };

  const handlePlaylistToggle = (playlistId) => {
    const identifier = `local:playlist:${playlistId}`;
    setSelectedItems(prev => {
      if (prev.includes(identifier)) {
        return prev.filter(id => id !== identifier);
      } else {
        return [...prev, identifier];
      }
    });
  };

  const handleFolderToggle = (playlistId, folderColor) => {
    const identifier = `local:folder:${playlistId}:${folderColor}`;
    setSelectedItems(prev => {
      if (prev.includes(identifier)) {
        return prev.filter(id => id !== identifier);
      } else {
        return [...prev, identifier];
      }
    });
  };

  const isPlaylistSelected = (playlistId) => {
    return selectedItems.includes(`local:playlist:${playlistId}`);
  };

  const isFolderSelected = (playlistId, folderColor) => {
    return selectedItems.includes(`local:folder:${playlistId}:${folderColor}`);
  };

  const handleConfirm = () => {
    if (selectedItems.length > 0) {
      onSelect(selectedItems);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">
            Add Existing Playlists/Folders
          </h3>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-slate-400">Loading...</div>
            </div>
          ) : (
            <div className="space-y-2">
              {playlists.length === 0 ? (
                <div className="text-slate-400 text-center py-8">No playlists found</div>
              ) : (
                playlists.map(playlist => {
                  const playlistFolders = foldersByPlaylist[playlist.id] || [];
                  const hasFolders = playlistFolders.length > 0;
                  const isExpanded = expandedPlaylists.has(playlist.id);
                  const isPlaylistSelectedValue = isPlaylistSelected(playlist.id);

                  return (
                    <div key={playlist.id} className="border border-slate-600 rounded-lg overflow-hidden">
                      {/* Playlist Header */}
                      <div className="flex items-center">
                        <button
                          onClick={() => handlePlaylistToggle(playlist.id)}
                          className={`flex-1 text-left p-3 transition-all ${
                            isPlaylistSelectedValue
                              ? 'bg-sky-500/20'
                              : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-white font-medium">{playlist.name}</div>
                              {playlist.description && (
                                <div className="text-slate-400 text-sm mt-1 line-clamp-1">
                                  {playlist.description}
                                </div>
                              )}
                              {hasFolders && (
                                <div className="text-slate-500 text-xs mt-1">
                                  {playlistFolders.length} folder{playlistFolders.length !== 1 ? 's' : ''} available
                                </div>
                              )}
                            </div>
                            {isPlaylistSelectedValue && (
                              <svg className="w-5 h-5 text-sky-500 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                        
                        {/* Expand/Collapse Button */}
                        {hasFolders && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlaylistExpanded(playlist.id);
                            }}
                            className="px-3 py-3 bg-slate-700 hover:bg-slate-600 transition-colors border-l border-slate-600"
                            title={isExpanded ? 'Collapse folders' : 'Expand folders'}
                          >
                            <svg
                              className={`w-5 h-5 text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        )}
                      </div>

                      {/* Folders Dropdown */}
                      {hasFolders && isExpanded && (
                        <div className="border-t border-slate-600 bg-slate-800">
                          {playlistFolders.map((folder, index) => {
                            const color = getFolderColorById(folder.folder_color);
                            const isFolderSelectedValue = isFolderSelected(playlist.id, folder.folder_color);
                            
                            return (
                              <button
                                key={`${playlist.id}-${folder.folder_color}-${index}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFolderToggle(playlist.id, folder.folder_color);
                                }}
                                className={`w-full text-left p-3 border-b border-slate-700 last:border-b-0 transition-all ${
                                  isFolderSelectedValue
                                    ? 'bg-sky-500/20'
                                    : 'hover:bg-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 flex items-center gap-3">
                                    <span
                                      className="w-4 h-4 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: color.hex }}
                                    />
                                    <div>
                                      <div className="text-white font-medium text-sm">
                                        {color.name} Folder
                                      </div>
                                      <div className="text-slate-400 text-xs">
                                        {folder.video_count} video{folder.video_count !== 1 ? 's' : ''}
                                      </div>
                                    </div>
                                  </div>
                                  {isFolderSelectedValue && (
                                    <svg className="w-5 h-5 text-sky-500 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedItems.length === 0}
            className="px-6 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlaylistFolderSelector;
