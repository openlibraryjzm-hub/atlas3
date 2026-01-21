import React, { useState, useEffect } from 'react';
import { getAllPlaylists } from '../api/playlistApi';
import { getThumbnailUrl } from '../utils/youtubeUtils';
import { getPlaylistItems } from '../api/playlistApi';

const AddPlaylistToTabModal = ({ tabId, tabName, onClose, onAdd }) => {
  const [playlists, setPlaylists] = useState([]);
  const [playlistThumbnails, setPlaylistThumbnails] = useState({});
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const data = await getAllPlaylists();
      setPlaylists(Array.isArray(data) ? data : []);
      
      // Load thumbnails
      const thumbnailMap = {};
      for (const playlist of data) {
        try {
          const items = await getPlaylistItems(playlist.id);
          if (Array.isArray(items) && items.length > 0) {
            thumbnailMap[playlist.id] = getThumbnailUrl(items[0].video_id, 'medium');
          }
        } catch (error) {
          console.error(`Failed to load thumbnail for playlist ${playlist.id}:`, error);
        }
      }
      setPlaylistThumbnails(thumbnailMap);
    } catch (error) {
      console.error('Failed to load playlists:', error);
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePlaylist = (playlistId) => {
    setSelectedPlaylistIds(prev => {
      const updated = new Set(prev);
      if (updated.has(playlistId)) {
        updated.delete(playlistId);
      } else {
        updated.add(playlistId);
      }
      return updated;
    });
  };

  const handleAdd = () => {
    selectedPlaylistIds.forEach(playlistId => {
      onAdd(tabId, playlistId);
    });
    onClose();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-white text-center">Loading playlists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div 
        className="bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Add Playlists to "{tabName}"
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Playlist List */}
        <div className="flex-1 overflow-y-auto mb-4">
          {playlists.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No playlists available</p>
          ) : (
            <div className="space-y-2">
              {playlists.map((playlist) => {
                const thumbnailUrl = playlistThumbnails[playlist.id];
                const isSelected = selectedPlaylistIds.has(playlist.id);
                
                return (
                  <div
                    key={playlist.id}
                    onClick={() => handleTogglePlaylist(playlist.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-sky-600/20 border border-sky-500'
                        : 'bg-slate-700 hover:bg-slate-600 border border-transparent'
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected
                        ? 'bg-sky-500 border-sky-500'
                        : 'border-slate-500'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Thumbnail */}
                    <div className="w-16 h-16 rounded bg-slate-600 overflow-hidden flex-shrink-0">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    {/* Playlist Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-medium text-sm truncate">
                        {playlist.name}
                      </h4>
                      {playlist.description && (
                        <p className="text-slate-400 text-xs mt-1 line-clamp-1">
                          {playlist.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          <p className="text-slate-400 text-sm">
            {selectedPlaylistIds.size} playlist{selectedPlaylistIds.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={selectedPlaylistIds.size === 0}
              className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add {selectedPlaylistIds.size > 0 ? `(${selectedPlaylistIds.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPlaylistToTabModal;

