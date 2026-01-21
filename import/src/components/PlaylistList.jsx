import React, { useState, useEffect } from 'react';
import { getAllPlaylists, getPlaylistItems, getAllFoldersWithVideos, getFoldersForPlaylist } from '../api/playlistApi';
import { getThumbnailUrl } from '../utils/youtubeUtils';
import { useFolderStore } from '../store/folderStore';
import { usePlaylistStore } from '../store/playlistStore';
import { useLayoutStore } from '../store/layoutStore';
import PlaylistUploader from './PlaylistUploader';
import FolderCard from './FolderCard';
import CardActions from './CardActions';

const PlaylistList = ({ onPlaylistSelect, onVideoSelect }) => {
  // IMMEDIATE TEST - This should show in console as soon as file loads
  console.log('=== PLAYLISTLIST FILE LOADED ===');
  console.log('Component function called');

  const [playlists, setPlaylists] = useState([]);
  const [playlistData, setPlaylistData] = useState({}); // Store items and thumbnails for each playlist
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const [expandedPlaylists, setExpandedPlaylists] = useState(new Set()); // Track which playlists are expanded
  const [playlistFolders, setPlaylistFolders] = useState({}); // Store folders for each playlist: { playlistId: [folders] }
  const [playlistsWithFolders, setPlaylistsWithFolders] = useState(new Set()); // Track which playlists have folders (for showing expand button)
  const { showColoredFolders, setShowColoredFolders } = useFolderStore();
  const { setPlaylistItems, setAllPlaylists } = usePlaylistStore();
  const { setViewMode } = useLayoutStore();

  useEffect(() => {
    console.log('=== PlaylistList COMPONENT MOUNTED (useEffect) ===');
    console.log('showColoredFolders:', showColoredFolders);
    console.log('onPlaylistSelect:', typeof onPlaylistSelect);
    console.log('onVideoSelect:', typeof onVideoSelect);
    loadPlaylists();
  }, []);

  useEffect(() => {
    if (showColoredFolders) {
      loadFolders();
    } else {
      setFolders([]);
    }
  }, [showColoredFolders]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading playlists from database...');
      const data = await getAllPlaylists();
      console.log('Loaded playlists:', data);

      // Ensure data is an array
      if (!Array.isArray(data)) {
        console.warn('getAllPlaylists returned non-array data:', data);
        setPlaylists([]);
        setPlaylistData({});
        return;
      }

      setPlaylists(data);
      setAllPlaylists(data);

      // Load first video for each playlist to get thumbnail
      const dataMap = {};
      const playlistsWithFoldersSet = new Set();

      for (const playlist of data) {
        try {
          const items = await getPlaylistItems(playlist.id);
          if (Array.isArray(items)) {
            dataMap[playlist.id] = {
              itemCount: items.length,
              firstVideo: items.length > 0 ? items[0] : null,
            };
          } else {
            console.warn(`getPlaylistItems returned non-array for playlist ${playlist.id}:`, items);
            dataMap[playlist.id] = { itemCount: 0, firstVideo: null };
          }

          // Quick check if playlist has folders (just to show expand button)
          // We'll load full folder data when user expands
          try {
            const folders = await getFoldersForPlaylist(playlist.id);
            console.log(`Playlist ${playlist.id} (${playlist.name}): Found ${folders?.length || 0} folders`);
            if (Array.isArray(folders) && folders.length > 0) {
              playlistsWithFoldersSet.add(playlist.id);
              console.log(`Added playlist ${playlist.id} to playlistsWithFolders`);
              // Pre-load folder data for faster expand
              setPlaylistFolders(prev => ({
                ...prev,
                [playlist.id]: folders
              }));
            }
          } catch (folderError) {
            // Ignore folder errors, just means no folders
            console.debug(`No folders for playlist ${playlist.id}:`, folderError);
          }
        } catch (error) {
          console.error(`Failed to load items for playlist ${playlist.id}:`, error);
          dataMap[playlist.id] = { itemCount: 0, firstVideo: null };
        }
      }
      setPlaylistData(dataMap);
      setPlaylistsWithFolders(playlistsWithFoldersSet);
    } catch (error) {
      console.error('Failed to load playlists:', error);
      setError(error.message || 'Failed to load playlists from database');
      setPlaylists([]);
      setPlaylistData({});
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    try {
      console.log('Loading folders with videos...');
      const foldersData = await getAllFoldersWithVideos();
      console.log('Loaded folders data:', foldersData);
      setFolders(Array.isArray(foldersData) ? foldersData : []);
      console.log('Set folders:', Array.isArray(foldersData) ? foldersData : []);
    } catch (error) {
      console.error('Failed to load folders:', error);
      setFolders([]);
    }
  };

  const handlePlaylistClick = async (playlist, e) => {
    // If clicking the expand button, don't load the playlist
    if (e && e.target.closest('.expand-button')) {
      return;
    }

    try {
      const items = await getPlaylistItems(playlist.id);
      if (onPlaylistSelect) {
        onPlaylistSelect(items, playlist.id);
      }
    } catch (error) {
      console.error('Failed to load playlist items:', error);
    }
  };

  const togglePlaylistExpand = async (playlistId, e) => {
    e.stopPropagation();

    const isExpanded = expandedPlaylists.has(playlistId);

    if (isExpanded) {
      // Collapse: remove from expanded set
      setExpandedPlaylists(prev => {
        const newSet = new Set(prev);
        newSet.delete(playlistId);
        return newSet;
      });
    } else {
      // Expand: add to expanded set and load folders
      setExpandedPlaylists(prev => new Set(prev).add(playlistId));

      // Load folders for this playlist if not already loaded
      if (!playlistFolders[playlistId] || playlistFolders[playlistId].length === 0) {
        try {
          const folders = await getFoldersForPlaylist(playlistId);
          const folderArray = folders || [];
          console.log(`Loaded ${folderArray.length} folders for playlist ${playlistId}`);

          setPlaylistFolders(prev => ({
            ...prev,
            [playlistId]: folderArray
          }));

          // If folders exist, ensure playlist is marked as having folders
          if (folderArray.length > 0) {
            setPlaylistsWithFolders(prev => new Set(prev).add(playlistId));
          }
        } catch (error) {
          console.error(`Failed to load folders for playlist ${playlistId}:`, error);
          setPlaylistFolders(prev => ({
            ...prev,
            [playlistId]: []
          }));
        }
      }
    }
  };

  const handleFolderClick = async (videoUrl, playlistId) => {
    try {
      // Load playlist items and set as current
      const items = await getPlaylistItems(playlistId);
      setPlaylistItems(items, playlistId);

      // Play the video
      if (onVideoSelect) {
        onVideoSelect(videoUrl);
      }
    } catch (error) {
      console.error('Failed to load folder playlist items:', error);
    }
  };

  const handleUploadComplete = () => {
    setShowUploader(false);
    loadPlaylists(); // Reload playlists after upload
    if (showColoredFolders) {
      loadFolders(); // Reload folders after upload
    }
  };

  const handlePlaylistMenuOptionClick = (option, playlist) => {
    console.log('Playlist menu option clicked:', option, playlist);
    if (option.action === 'delete') {
      // Placeholder for delete
      if (confirm(`Are you sure you want to delete playlist "${playlist.name}"?`)) {
        console.log('Delete confirmed for', playlist.id);
        // Implement delete implementation later
      }
    }
  };

  const getPlaylistMenuOptions = (playlist) => [
    {
      label: 'Delete Playlist',
      danger: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      action: 'delete',
    },
    {
      label: 'Rename',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      action: 'rename'
    }
  ];

  // Header component that's always visible
  const renderHeader = () => {
    console.log('=== RENDERING HEADER ===');
    console.log('showColoredFolders in header:', showColoredFolders);
    return (
      <div className="flex items-center justify-between p-3 border-b border-slate-700 flex-shrink-0" style={{ overflow: 'visible', backgroundColor: '#1e293b', position: 'relative', zIndex: 1000 }}>
        <h2 className="text-sm font-semibold flex-shrink-0 mr-2" style={{ color: '#052F4A' }}>Playlists</h2>
        <div className="flex items-center gap-1.5 flex-shrink-0" style={{ overflow: 'visible', position: 'relative', zIndex: 1001 }}>
          {/* Close button - moved to end so it's most visible */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('=== TOGGLE FOLDERS BUTTON CLICKED ===');
              console.log('Current state:', showColoredFolders);
              setShowColoredFolders(!showColoredFolders);
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${showColoredFolders
              ? 'bg-sky-600 text-white hover:bg-sky-700'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            title={showColoredFolders ? 'Hide colored folders' : 'Show colored folders'}
            style={{
              minWidth: '32px',
              minHeight: '32px',
              width: '32px',
              height: '32px',
              backgroundColor: showColoredFolders ? '#0284c7' : '#475569',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
            }}
          >
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          <button
            onClick={() => setShowUploader(true)}
            className="flex items-center justify-center w-8 h-8 bg-sky-500 text-white rounded-lg text-xs font-medium hover:bg-sky-600 transition-colors flex-shrink-0"
            title="Import Playlist"
            style={{
              minWidth: '32px',
              minHeight: '32px',
              width: '32px',
              height: '32px',
              backgroundColor: '#0ea5e9',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
            }}
          >
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {/* Close button - at the end for visibility */}
          <button
            onClick={() => setViewMode('full')}
            className="flex items-center justify-center w-8 h-8 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
            title="Close menu (Full screen)"
            style={{
              minWidth: '32px',
              minHeight: '32px',
              width: '32px',
              height: '32px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
            }}
          >
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  console.log('=== PlaylistList MAIN RENDER ===');
  console.log('showColoredFolders:', showColoredFolders);
  console.log('folders:', folders.length);
  console.log('playlists:', playlists.length);
  console.log('loading:', loading);
  console.log('error:', error);
  console.log('showUploader:', showUploader);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        {renderHeader()}
        <div className="flex items-center justify-center flex-1 p-4">
          <p className="text-sm" style={{ color: '#052F4A' }}>Loading playlists...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        {renderHeader()}
        <div className="flex flex-col items-center justify-center flex-1 p-4 gap-2">
          <p className="text-red-400 text-sm">Error loading playlists</p>
          <p className="text-slate-400 text-xs">{error}</p>
          <button
            onClick={loadPlaylists}
            className="px-3 py-1.5 bg-sky-500 rounded text-xs hover:bg-sky-600 transition-colors"
            style={{ color: '#052F4A' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (showUploader) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        {renderHeader()}
        <div className="flex-1 overflow-y-auto p-4">
          <PlaylistUploader
            onUploadComplete={handleUploadComplete}
            onCancel={() => setShowUploader(false)}
          />
        </div>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="w-full h-full flex flex-col overflow-hidden">
        {renderHeader()}
        <div className="flex flex-col items-center justify-center flex-1 p-4 gap-4">
          <p className="text-sm" style={{ color: '#052F4A' }}>No playlists found</p>
          <button
            onClick={() => setShowUploader(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 rounded-lg font-medium hover:bg-sky-600 transition-colors"
            style={{ color: '#052F4A' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Import Playlist</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ position: 'relative' }}>
      {/* TEST: Big red box to verify component is rendering */}
      <div style={{
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        backgroundColor: 'rgba(255, 0, 0, 0.3)',
        color: 'white',
        padding: '5px',
        zIndex: 10000,
        fontSize: '10px',
        textAlign: 'center'
      }}>
        PLAYLIST LIST COMPONENT IS RENDERING
      </div>
      {/* Header with Upload Button and Toggle */}
      {renderHeader()}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {/* Colored Folders */}
          {showColoredFolders && (
            <>
              {folders.length > 0 ? (
                <>
                  {folders.map((folder, index) => (
                    <FolderCard
                      key={`${folder.playlist_id}-${folder.folder_color}-${index}`}
                      folder={folder}
                      onFolderClick={handleFolderClick}
                    />
                  ))}
                  {playlists.length > 0 && (
                    <div className="pt-2 pb-1">
                      <div className="h-px bg-slate-700" />
                    </div>
                  )}
                </>
              ) : (
                <div className="text-slate-400 text-xs py-2">
                  No folders with videos found
                </div>
              )}
            </>
          )}

          {/* Regular Playlists */}
          {playlists.map((playlist) => {
            const data = playlistData[playlist.id] || { itemCount: 0, firstVideo: null };
            const firstVideo = data.firstVideo;
            const thumbnailUrl = firstVideo ? getThumbnailUrl(firstVideo.video_id, 'medium') : null;
            const isExpanded = expandedPlaylists.has(playlist.id);
            const folders = playlistFolders[playlist.id] || [];
            // Check if playlist has folders - either in tracking set or in loaded folders
            const hasFolders = playlistsWithFolders.has(playlist.id) || folders.length > 0;

            // Debug: Log folder status for each playlist
            console.log(`Playlist ${playlist.id} (${playlist.name}):`, {
              hasFolders,
              inSet: playlistsWithFolders.has(playlist.id),
              foldersCount: folders.length,
              folders: folders
            });

            return (
              <div key={playlist.id} className="space-y-2">
                {/* Playlist Card */}
                <div
                  onClick={(e) => handlePlaylistClick(playlist, e)}
                  className="cursor-pointer group bg-slate-800 rounded-lg p-3 hover:bg-slate-700 transition-all duration-200 border border-slate-700 hover:border-sky-500"
                >
                  <div className="flex items-start gap-3">
                    {/* Playlist Icon/Thumbnail */}
                    <div className="flex-shrink-0 w-16 h-16 rounded bg-slate-700 overflow-hidden">
                      {thumbnailUrl ? (
                        <img
                          src={thumbnailUrl}
                          alt={playlist.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextElementSibling) {
                              e.target.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-full h-full flex items-center justify-center ${thumbnailUrl ? 'hidden' : 'flex'
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
                            d="M4 6h16M4 12h16M4 18h16"
                          />
                        </svg>
                      </div>
                    </div>

                    {/* Playlist Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate transition-colors"
                        style={{ color: '#052F4A' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#38bdf8'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#052F4A'}>
                        {playlist.name}
                      </h3>
                      {playlist.description && (
                        <p className="text-slate-400 text-xs mt-1 line-clamp-1">
                          {playlist.description}
                        </p>
                      )}
                      {data.itemCount > 0 && (
                        <p className="text-slate-500 text-xs mt-1">
                          {data.itemCount} video{data.itemCount !== 1 ? 's' : ''}
                          {hasFolders && (
                            <span className="ml-2">
                              • {folders.length} folder{folders.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Expand/Collapse Button */}
                    <button
                      onClick={(e) => togglePlaylistExpand(playlist.id, e)}
                      className="expand-button flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors z-10"
                      title={isExpanded ? 'Collapse folders' : hasFolders ? 'Expand folders' : 'No folders (testing)'}
                      style={{ minWidth: '32px', minHeight: '32px', opacity: hasFolders ? 1 : 0.3 }}
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

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

                    {/* 3-Dot Menu (Aligned Right) */}
                    <div className="flex-shrink-0 self-start pt-1" onClick={e => e.stopPropagation()}>
                      <CardActions
                        menuOptions={getPlaylistMenuOptions(playlist)}
                        onMenuOptionClick={(option) => handlePlaylistMenuOptionClick(option, playlist)}
                        position="bottom-right"
                        className="relative"
                      />
                    </div>
                  </div>
                </div>

                {/* Expanded Folders */}
                {isExpanded && hasFolders && (
                  <div className="ml-4 space-y-2 border-l-2 border-slate-700 pl-4">
                    {folders.map((folder, index) => (
                      <FolderCard
                        key={`${folder.playlist_id}-${folder.folder_color}-${index}`}
                        folder={folder}
                        onFolderClick={handleFolderClick}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlaylistList;

