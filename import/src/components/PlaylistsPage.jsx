import React, { useState, useEffect, useRef } from 'react';
import { createPlaylist, getAllPlaylists, getPlaylistItems, deletePlaylist, deletePlaylistByName, getAllFoldersWithVideos, exportPlaylist, getFoldersForPlaylist, toggleStuckFolder, getAllStuckFolders, getVideosInFolder, getAllVideoProgress, getAllPlaylistMetadata } from '../api/playlistApi';
import { getThumbnailUrl } from '../utils/youtubeUtils';
import { usePlaylistStore } from '../store/playlistStore';
import { Eye, Play, Shuffle } from 'lucide-react';
import { useFolderStore } from '../store/folderStore';
import { useTabStore } from '../store/tabStore';
import { useTabPresetStore } from '../store/tabPresetStore';
import { useLayoutStore } from '../store/layoutStore';
import { useNavigationStore } from '../store/navigationStore';
import { getFolderColorById } from '../utils/folderColors';
import { useInspectLabel } from '../utils/inspectLabels';
import PlaylistUploader from './PlaylistUploader';
import BulkPlaylistImporter from './BulkPlaylistImporter';
import LocalVideoUploader from './LocalVideoUploader';
import CardMenu from './NewCardMenu'; // Using NewCardMenu as CardMenu
import TabBar from './TabBar';
import CardThumbnail from './CardThumbnail';
import PageBanner from './PageBanner';
import { useConfigStore } from '../store/configStore';
import TabPresetsDropdown from './TabPresetsDropdown';
import AddPlaylistToTabModal from './AddPlaylistToTabModal';
import UnifiedBannerBackground from './UnifiedBannerBackground';
import PlaylistCardSkeleton from './skeletons/PlaylistCardSkeleton';

const PlaylistsPage = ({ onVideoSelect }) => {
  const [playlists, setPlaylists] = useState([]);
  const [playlistThumbnails, setPlaylistThumbnails] = useState({});
  const [playlistRecentVideos, setPlaylistRecentVideos] = useState({});
  const [playlistItemCounts, setPlaylistItemCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploader, setShowUploader] = useState(false);
  const [showBulkImporter, setShowBulkImporter] = useState(false);
  const [showLocalVideoUploader, setShowLocalVideoUploader] = useState(false);
  const [selectedPlaylistForLocalUpload, setSelectedPlaylistForLocalUpload] = useState(null);
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [deletingPlaylistId, setDeletingPlaylistId] = useState(null);
  const [folders, setFolders] = useState([]);
  const [expandedPlaylists, setExpandedPlaylists] = useState(new Set()); // Track which playlists are expanded
  const [playlistFolders, setPlaylistFolders] = useState({}); // Store folders for each playlist: { playlistId: [folders] }
  const [stuckFolders, setStuckFolders] = useState(new Set()); // Track stuck folders: Set of "playlistId:folderColor" strings
  const { setPlaylistItems, currentPlaylistItems, setCurrentFolder, setPreviewPlaylist, setAllPlaylists, activePlaylistId } = usePlaylistStore();
  const { showColoredFolders, setShowColoredFolders } = useFolderStore();
  const [imageLoadErrors, setImageLoadErrors] = useState(new Set());
  const { tabs, activeTabId, addPlaylistToTab, removePlaylistFromTab } = useTabStore();
  const { activePresetId, presets } = useTabPresetStore();
  const { setViewMode, viewMode, inspectMode } = useLayoutStore();
  const { customPageBannerImage, bannerHeight, bannerBgSize } = useConfigStore();
  const { setCurrentPage } = useNavigationStore();



  // Helper to get inspect label
  const getInspectTitle = (label) => inspectMode ? label : undefined;
  const hasDeletedTestPlaylist = useRef(false);

  // Sticky header state detection
  const [isStuck, setIsStuck] = useState(false);
  const stickySentinelRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStuck(entry.intersectionRatio < 1 && entry.boundingClientRect.top < 0);
      },
      { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
    );

    if (stickySentinelRef.current) {
      observer.observe(stickySentinelRef.current);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    loadPlaylists();
    loadStuckFolders();
  }, []);

  const loadStuckFolders = async () => {
    try {
      const stuck = await getAllStuckFolders();
      const stuckSet = new Set(stuck.map(([playlistId, folderColor]) => `${playlistId}:${folderColor}`));
      setStuckFolders(stuckSet);
    } catch (error) {
      console.error('Failed to load stuck folders:', error);
    }
  };

  useEffect(() => {
    if (showColoredFolders) {
      loadFolders();
    } else {
      // Even when toggled off, we need folder data for stuck folders
      loadFolders();
    }
    // Reload stuck folders when toggling to ensure we have folder data
    loadStuckFolders();
  }, [showColoredFolders]);

  const loadFolders = async () => {
    try {
      console.log('Loading specific folders via optimized batch fetch...');

      // Use the batch command to get all folders at once
      const bulk = await getAllFoldersWithVideos();

      if (Array.isArray(bulk)) {
        console.log('Loaded folders (batch):', bulk.length);
        setFolders(bulk);
      } else {
        setFolders([]);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
      setFolders([]);
    }
  };

  // One-time cleanup: Delete "Test Playlist" if it exists
  useEffect(() => {
    const cleanupTestPlaylist = async () => {
      if (hasDeletedTestPlaylist.current) return;
      hasDeletedTestPlaylist.current = true;

      try {
        const result = await deletePlaylistByName('Test Playlist');
        if (result) {
          console.log('Successfully deleted "Test Playlist"');
          // Reload playlists after deletion
          await loadPlaylists();
        }
      } catch (error) {
        console.error('Error deleting Test Playlist:', error);
        // Don't show error to user, just log it
      }
    };

    cleanupTestPlaylist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading playlists from database...');

      // Load playlists, metadata, and video progress in parallel
      const [data, metadataList, allProgress] = await Promise.all([
        getAllPlaylists(),
        getAllPlaylistMetadata().catch(e => {
          console.error("Failed to load metadata", e);
          return [];
        }),
        getAllVideoProgress().catch(e => {
          console.error("Failed to load video progress", e);
          return [];
        })
      ]);

      console.log('Loaded playlists:', data);

      // Create a map for quick progress lookup: video_id -> last_updated
      const progressMap = new Map();
      if (Array.isArray(allProgress)) {
        allProgress.forEach(p => {
          if (p.video_id && p.last_updated) {
            progressMap.set(p.video_id, p.last_updated);
          }
        });
      }

      // Ensure data is an array
      if (Array.isArray(data)) {
        setPlaylists(data);
        setAllPlaylists(data);

        // Process metadata
        const thumbnailMap = {};
        const recentVideoMap = {};
        const itemCountMap = {};

        // Metadata list is an array of objects
        const metadataMap = new Map();
        if (Array.isArray(metadataList)) {
          metadataList.forEach(m => metadataMap.set(m.playlist_id, m));
        }

        // Also pre-load folders for playlists to determine if expand option should be shown
        // We can use the loaded 'folders' state if available, or fetch it.
        // But loadFolders is called separately.
        // We need 'playlistFolders' map populated.
        // Since loadFolders now uses getAllFoldersWithVideos, we can derive playlistFolders from that.
        // Use a separate call here or wait for folder state?
        // Let's do a batch fetch of folders here too to be safe and populate playlistFolders
        try {
          const allFolders = await getAllFoldersWithVideos();
          if (Array.isArray(allFolders)) {
            const pFolders = {};
            allFolders.forEach(f => {
              if (!pFolders[f.playlist_id]) pFolders[f.playlist_id] = [];
              pFolders[f.playlist_id].push(f);
            });
            setPlaylistFolders(pFolders);
          }
        } catch (e) {
          console.warn("Failed to load folders for map", e);
        }

        for (const playlist of data) {
          const meta = metadataMap.get(playlist.id);

          // Item Count
          itemCountMap[playlist.id] = meta ? meta.count : 0;

          // Thumbnail
          if (playlist.custom_thumbnail_url) {
            thumbnailMap[playlist.id] = {
              max: playlist.custom_thumbnail_url,
              standard: playlist.custom_thumbnail_url
            };
          } else if (meta && meta.first_video) {
            const vid = meta.first_video;
            thumbnailMap[playlist.id] = {
              max: vid.thumbnail_url || getThumbnailUrl(vid.video_id, 'max'),
              standard: vid.thumbnail_url || getThumbnailUrl(vid.video_id, 'standard')
            };
          }

          // Recent Video
          // The backend now provides 'recent_video' based on DB query
          if (meta && meta.recent_video) {
            recentVideoMap[playlist.id] = meta.recent_video;
          }
        }

        setPlaylistThumbnails(thumbnailMap);
        setPlaylistRecentVideos(recentVideoMap);
        setPlaylistItemCounts(itemCountMap);
      } else {
        console.warn('getAllPlaylists returned non-array data:', data);
        setPlaylists([]);
      }
    } catch (error) {
      console.error('Failed to load playlists:', error);
      setError(error.message || 'Failed to load playlists from database');
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="px-8 pt-8">
          {/* Skeleton Banner */}
          <div className="w-full h-64 bg-slate-800/30 rounded-xl animate-pulse mb-8" />
        </div>
        <div className="grid grid-cols-2 gap-4 px-8 pb-8">
          {[...Array(6)].map((_, i) => (
            <PlaylistCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-4">
        <p className="text-red-400 text-lg">Error loading playlists</p>
        <p className="text-slate-400 text-sm">{error}</p>
        <button
          onClick={loadPlaylists}
          className="px-4 py-2 bg-sky-500 rounded-lg hover:bg-sky-600 transition-colors"
          style={{ color: '#052F4A' }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-lg" style={{ color: '#052F4A' }}>No playlists found. Create one to get started!</p>
      </div>
    );
  }

  const handleUploadComplete = async () => {
    try {
      setShowUploader(false);
      await loadPlaylists(); // Reload playlists after upload
    } catch (error) {
      console.error('Error reloading playlists after upload:', error);
      // Still close the uploader even if reload fails
      setShowUploader(false);
    }
  };

  const handleBulkImportComplete = async () => {
    try {
      setShowBulkImporter(false);
      await loadPlaylists(); // Reload playlists after bulk import
      if (showColoredFolders) {
        await loadFolders();
      }
    } catch (error) {
      console.error('Error reloading playlists after bulk import:', error);
      // Still close the bulk importer even if reload fails
      setShowBulkImporter(false);
    }
  };

  const handleLocalVideoUploadComplete = async () => {
    try {
      setShowLocalVideoUploader(false);
      setSelectedPlaylistForLocalUpload(null);
      await loadPlaylists(); // Reload playlists after local video upload
    } catch (error) {
      console.error('Error reloading playlists after local video upload:', error);
      // Still close the uploader even if reload fails
      setShowLocalVideoUploader(false);
      setSelectedPlaylistForLocalUpload(null);
    }
  };

  const handleOpenLocalVideoUploader = () => {
    if (playlists.length === 0) {
      alert('Please create a playlist first before adding local videos.');
      return;
    }
    // If only one playlist, use it directly
    if (playlists.length === 1) {
      setSelectedPlaylistForLocalUpload(playlists[0].id);
      setShowLocalVideoUploader(true);
    } else {
      // Show playlist selector modal
      setShowPlaylistSelector(true);
    }
  };

  const handlePlaylistSelected = (playlistId) => {
    setSelectedPlaylistForLocalUpload(playlistId);
    setShowPlaylistSelector(false);
    setShowLocalVideoUploader(true);
  };

  const handleDeletePlaylist = async (playlistId, playlistName, e) => {
    e.stopPropagation(); // Prevent triggering the playlist click

    try {
      const confirmed = window.confirm(
        `Are you sure you want to delete "${playlistName}"?\n\nThis will permanently delete the playlist and all its videos.`
      );

      if (!confirmed) return;

      setDeletingPlaylistId(playlistId);

      try {
        await deletePlaylist(playlistId);

        // If the deleted playlist was the current one, clear the playlist items
        if (currentPlaylistItems.length > 0) {
          setPlaylistItems([]);
        }

        // Reload playlists
        await loadPlaylists();
      } catch (deleteError) {
        console.error('Failed to delete playlist:', deleteError);
        const errorMessage = deleteError?.message || deleteError?.toString() || 'Unknown error';
        alert(`Failed to delete playlist: ${errorMessage}`);
      } finally {
        setDeletingPlaylistId(null);
      }
    } catch (error) {
      console.error('Error in delete handler:', error);
      setDeletingPlaylistId(null);
      // Don't show alert for user cancellation
      if (error.name !== 'AbortError' && !error.message?.includes('cancel')) {
        alert(`An error occurred: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const handleExportPlaylist = async (playlistId, playlistName) => {
    try {
      // Get export data
      const exportData = await exportPlaylist(playlistId);

      // Convert to JSON string
      const jsonString = JSON.stringify(exportData, null, 2);

      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${playlistName.replace(/[^a-z0-9]/gi, '_')}_export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`Playlist "${playlistName}" exported successfully!`);
    } catch (error) {
      console.error('Failed to export playlist:', error);
      alert(`Failed to export playlist: ${error.message || 'Unknown error'}`);
    }
  };

  const togglePlaylistExpand = async (playlistId) => {
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

  return (
    <div className="w-full h-full flex flex-col">
      {showBulkImporter ? (
        <BulkPlaylistImporter
          onImportComplete={handleBulkImportComplete}
          onCancel={() => setShowBulkImporter(false)}
        />
      ) : showUploader ? (
        <div className="flex-1 overflow-y-auto p-4 bg-transparent">
          <PlaylistUploader
            onUploadComplete={handleUploadComplete}
            onCancel={() => setShowUploader(false)}
          />
        </div>
      ) : showPlaylistSelector ? (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: '#052F4A' }}>Select Playlist</h3>
              <button
                onClick={() => setShowPlaylistSelector(false)}
                className="text-slate-400 transition-colors"
                onMouseEnter={(e) => e.currentTarget.style.color = '#052F4A'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(148 163 184)'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-slate-300 text-sm mb-4">Choose a playlist to add local videos to:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => handlePlaylistSelected(playlist.id)}
                  className="w-full text-left p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors border border-transparent hover:border-sky-500"
                >
                  <div className="font-medium" style={{ color: '#052F4A' }}>{playlist.name}</div>
                  {playlist.description && (
                    <div className="text-slate-400 text-xs mt-1 line-clamp-1">{playlist.description}</div>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowPlaylistSelector(false)}
              className="w-full px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
              style={{ color: '#052F4A' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : showLocalVideoUploader ? (
        <div className="flex-1 overflow-y-auto p-4 bg-transparent">
          <LocalVideoUploader
            playlistId={selectedPlaylistForLocalUpload}
            onUploadComplete={handleLocalVideoUploadComplete}
            onCancel={() => {
              setShowLocalVideoUploader(false);
              setSelectedPlaylistForLocalUpload(null);
            }}
          />
        </div>
      ) : (
        <>


          {/* Playlist Grid - 3 per row */}
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-transparent relative">
            {(() => {
              const activePreset = presets.find(p => p.id === activePresetId);
              let bannerTitle = activePresetId === 'all' || !activePreset
                ? "All"
                : activePreset.name;

              if (activeTabId && activeTabId !== 'all') {
                const activeTab = tabs.find(t => t.id === activeTabId);
                if (activeTab) {
                  bannerTitle += ` - ${activeTab.name}`;
                }
              }

              // Calculate visible playlists and total videos
              // Filter logic must match the rendering logic below
              const filteredPlaylists = playlists.filter((playlist) => {
                if (activeTabId === 'all') return true;
                const activeTab = tabs.find(t => t.id === activeTabId);
                return activeTab && activeTab.playlistIds.includes(playlist.id);
              });

              const playlistCount = filteredPlaylists.length;
              const totalVideos = filteredPlaylists.reduce((sum, p) => sum + (playlistItemCounts[p.id] || 0), 0);

              return (
                <div className="px-8 pt-8">
                  <PageBanner
                    title={bannerTitle}
                    description={null}
                    color={null}
                    isEditable={false}
                    seamlessBottom={true}
                    videoCount={playlistCount}
                    countLabel="Playlist"
                    author={`${totalVideos} Videos`}
                  />
                </div>
              );
            })()}

            {/* Sticky Sentinel */}
            <div ref={stickySentinelRef} className="absolute h-px w-full -mt-px pointer-events-none opacity-0" />

            {/* Sticky Toolbar */}
            <div
              className={`sticky top-0 z-40 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) overflow-hidden -mt-16
              ${isStuck
                  ? 'backdrop-blur-xl border-y shadow-2xl mx-0 rounded-none mb-6 pt-2 pb-2 bg-slate-900/70'
                  : 'backdrop-blur-[2px] border-b border-x border-t border-white/10 shadow-xl mx-8 rounded-b-2xl mb-8 mt-0 pt-1 pb-0 bg-transparent'
                }
              `}
              style={{
                backgroundColor: isStuck ? undefined : 'transparent' // Fully transparent resting state
              }}
            >


              <div className={`px-4 flex items-center justify-between transition-all duration-300 relative z-10 ${isStuck ? 'h-[52px]' : 'py-0.5'}`}>

                {/* Left: Tab Bar */}
                <div className="flex-1 overflow-x-auto no-scrollbar mask-gradient-right min-w-0">
                  <TabBar onAddPlaylistToTab={addPlaylistToTab} showPresets={true} />
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-2 ml-4 shrink-0 pl-3 border-l border-white/10">

                  {/* Folder Toggle - Icon Only */}
                  <button
                    onClick={() => setShowColoredFolders(!showColoredFolders)}
                    className={`p-1.5 rounded-md transition-all ${showColoredFolders
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-white border border-white/10'
                      }`}
                    title={showColoredFolders ? "Hide Folders" : "Show Folders"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </button>

                  {/* Add Playlist - Icon Only */}
                  <button
                    onClick={() => setShowImportModal(true)}
                    className="p-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-md transition-all shadow-lg hover:shadow-sky-500/25 border border-white/10"
                    title="Add Playlist"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

              </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 gap-4 px-8 pb-8">
              {/* Colored Folders - Filtered by active tab (only show if showColoredFolders is true) */}
              {showColoredFolders && folders
                .filter((folder) => {
                  // Don't show folders that are stuck (they'll be shown in the playlist section)
                  const folderKey = `${folder.playlist_id}:${folder.folder_color}`;
                  if (stuckFolders.has(folderKey)) return false;

                  if (activeTabId === 'all') return true;
                  const activeTab = tabs.find(t => t.id === activeTabId);
                  return activeTab && activeTab.playlistIds.includes(folder.playlist_id);
                })
                .map((folder, index) => {
                  const folderColor = getFolderColorById(folder.folder_color);
                  const folderImageKey = `folder-${folder.playlist_id}-${folder.folder_color}`;
                  const thumbUrls = folder.first_video ? {
                    max: getThumbnailUrl(folder.first_video.video_id, 'max'),
                    standard: getThumbnailUrl(folder.first_video.video_id, 'standard')
                  } : null;

                  const useFallback = imageLoadErrors.has(folderImageKey);
                  const activeThumbnailUrl = thumbUrls ? (useFallback ? thumbUrls.standard : thumbUrls.max) : null;

                  return (
                    <div
                      key={`folder-${folder.playlist_id}-${folder.folder_color}-${index}`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const items = await getVideosInFolder(folder.playlist_id, folder.folder_color);
                          setPlaylistItems(items, folder.playlist_id, { playlist_id: folder.playlist_id, folder_color: folder.folder_color });
                          if (items.length > 0 && onVideoSelect) {
                            onVideoSelect(items[0].video_url);
                          } else if (folder.first_video && onVideoSelect) {
                            onVideoSelect(folder.first_video.video_url);
                          }
                        } catch (error) {
                          console.error('Failed to load folder items:', error);
                        }
                      }}
                      className="cursor-pointer group relative"
                    >
                      {/* Thumbnail with colored border - Rounded */}
                      <div className="relative aspect-video overflow-hidden rounded-lg" style={{ backgroundColor: '#0f172a' }}>
                        {/* Colored left border indicator */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-2 z-10"
                          style={{ backgroundColor: folderColor.hex }}
                        />
                        {activeThumbnailUrl ? (
                          <img
                            src={activeThumbnailUrl}
                            alt={folder.first_video?.title || 'Folder thumbnail'}
                            className="w-full h-full object-cover pl-2"
                            onError={() => {
                              if (!useFallback) {
                                setImageLoadErrors(prev => new Set(prev).add(folderImageKey));
                              }
                            }}
                            style={{
                              display: 'block',
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              paddingLeft: '8px',
                              position: 'relative',
                              zIndex: 1
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center pl-2">
                            <svg
                              className="w-12 h-12 text-slate-500"
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
                        )}
                        {/* Play overlay on hover */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-200 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg
                              className="w-16 h-16"
                              style={{ color: '#052F4A' }}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                            </svg>
                          </div>
                        </div>
                      </div>

                      {/* Folder Info */}
                      <div className="mt-2 relative">
                        <div className="flex items-center gap-2 mb-1">
                          {/* Colored dot indicator */}
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: folderColor.hex }}
                          />
                          <h3 className="font-medium text-sm truncate transition-colors"
                            style={{ color: '#052F4A' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#38bdf8'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#052F4A'}>
                            {folderColor.name} Folder
                          </h3>
                        </div>

                      </div>
                    </div>
                  );
                })}

              {/* Regular Playlists - Filtered by active tab */}
              {(() => {
                // Build a flat array of items (playlists + their expanded folders)
                const filteredPlaylists = playlists.filter((playlist) => {
                  if (activeTabId === 'all') return true;
                  const activeTab = tabs.find(t => t.id === activeTabId);
                  return activeTab && activeTab.playlistIds.includes(playlist.id);
                });

                const items = [];
                const processedStuckFolders = new Set(); // Track which stuck folders we've already added

                filteredPlaylists.forEach((playlist) => {
                  // Add the playlist itself
                  items.push({ type: 'playlist', data: playlist });

                  // If expanded, add its folders right after
                  const isExpanded = expandedPlaylists.has(playlist.id);
                  const folders = playlistFolders[playlist.id] || [];
                  if (isExpanded && folders.length > 0) {
                    folders.forEach((folder) => {
                      const folderKey = `${folder.playlist_id}:${folder.folder_color}`;
                      processedStuckFolders.add(folderKey);
                      items.push({ type: 'folder', data: folder, parentPlaylist: playlist });
                    });
                  }

                  // Also add stuck folders for this playlist (even if not expanded)
                  folders.forEach((folder) => {
                    const folderKey = `${folder.playlist_id}:${folder.folder_color}`;
                    if (stuckFolders.has(folderKey) && !processedStuckFolders.has(folderKey)) {
                      processedStuckFolders.add(folderKey);
                      items.push({ type: 'folder', data: folder, parentPlaylist: playlist, isStuck: true });
                    }
                  });
                });

                // Also add stuck folders from the global folders list (for when showColoredFolders is off)
                if (!showColoredFolders) {
                  folders.forEach((folder) => {
                    const folderKey = `${folder.playlist_id}:${folder.folder_color}`;
                    if (stuckFolders.has(folderKey) && !processedStuckFolders.has(folderKey)) {
                      // Check if playlist is in filtered list
                      const parentPlaylist = playlists.find(p => p.id === folder.playlist_id);
                      if (parentPlaylist) {
                        const isInFiltered = activeTabId === 'all' ||
                          tabs.find(t => t.id === activeTabId)?.playlistIds.includes(folder.playlist_id);
                        if (isInFiltered) {
                          processedStuckFolders.add(folderKey);
                          items.push({ type: 'folder', data: folder, parentPlaylist: parentPlaylist, isStuck: true });
                        }
                      }
                    }
                  });
                }

                return items.map((item, index) => {
                  if (item.type === 'playlist') {
                    const playlist = item.data;
                    const thumbData = playlistThumbnails[playlist.id];
                    const playlistImageKey = `playlist-${playlist.id}`;
                    const useFallback = imageLoadErrors.has(playlistImageKey);
                    const activeThumbnailUrl = thumbData ? (useFallback ? thumbData.standard : thumbData.max) : null;

                    const recentVideo = playlistRecentVideos[playlist.id];
                    const itemCount = playlistItemCounts[playlist.id] || 0;
                    const isExpanded = expandedPlaylists.has(playlist.id);
                    const folders = playlistFolders[playlist.id] || [];
                    const hasFolders = folders.length > 0;

                    return (
                      <div
                        key={playlist.id}
                        onClick={async (e) => {
                          // Don't trigger if clicking on menu
                          if (e.target.closest('[data-card-menu="true"]')) {
                            return;
                          }
                          try {
                            const items = await getPlaylistItems(playlist.id);
                            setPlaylistItems(items, playlist.id, null, playlist.name);
                            if (items.length > 0 && onVideoSelect) {
                              onVideoSelect(items[0].video_url);
                            }
                          } catch (error) {
                            console.error('Failed to load playlist items:', error);
                          }
                        }}
                        className="cursor-pointer group relative"
                        title={getInspectTitle(`Playlist: ${playlist.name}`)}
                      >
                        <div
                          className={`border-2 border-slate-700/50 rounded-xl p-2 bg-slate-800/20 hover:border-sky-500/50 transition-colors h-full flex flex-col ${String(playlist.id) === String(activePlaylistId) ? 'active-playlist-marker' : ''}`}
                          data-active-playlist={String(playlist.id) === String(activePlaylistId) ? "true" : "false"}
                        >
                          {/* Playlist Info */}
                          <div className="mb-2 flex items-center justify-between border-2 border-[#052F4A] rounded-md p-1 bg-slate-100/90 shadow-sm relative overflow-hidden h-[38px]">
                            <h3 className="font-bold text-lg truncate transition-colors pl-1 flex-1 text-left"
                              style={{ color: '#052F4A' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#38bdf8'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#052F4A'}
                              title={playlist.name}>
                              {playlist.name}
                            </h3>

                            {/* Hover Controls - Moved to Title Bar */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 top-0 bottom-0 pr-1 pl-4 bg-gradient-to-l from-slate-100 via-slate-100 to-transparent">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const items = await getPlaylistItems(playlist.id);
                                    setPreviewPlaylist(items, playlist.id, null);
                                    setCurrentPage('videos');
                                    if (viewMode === 'full') {
                                      setViewMode('half');
                                    }
                                  } catch (error) {
                                    console.error('Failed to load playlist items for preview:', error);
                                  }
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-[#052F4A] hover:text-sky-600 transition-colors"
                                title="Preview playlist"
                              >
                                <Eye size={18} strokeWidth={2.5} />
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const items = await getPlaylistItems(playlist.id);
                                    setPlaylistItems(items, playlist.id, null, playlist.name);
                                    if (items.length > 0 && onVideoSelect) {
                                      onVideoSelect(items[0].video_url);
                                    }
                                  } catch (error) {
                                    console.error('Failed to load playlist items:', error);
                                  }
                                }}
                                onContextMenu={async (e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  try {
                                    const items = await getPlaylistItems(playlist.id);
                                    setPlaylistItems(items, playlist.id, null, playlist.name);

                                    if (items.length > 0 && onVideoSelect) {
                                      // Find video that matches the current cover
                                      // activeThumbnailUrl is available in scope
                                      let targetVideo = items[0];

                                      if (activeThumbnailUrl) {
                                        const coverMatch = items.find(item => {
                                          const maxThumb = getThumbnailUrl(item.video_id, 'max');
                                          const stdThumb = getThumbnailUrl(item.video_id, 'standard');
                                          return maxThumb === activeThumbnailUrl || stdThumb === activeThumbnailUrl;
                                        });

                                        if (coverMatch) {
                                          targetVideo = coverMatch;
                                          console.log('Playing cover video:', targetVideo.title);
                                        }
                                      }

                                      onVideoSelect(targetVideo.video_url);
                                    }
                                  } catch (error) {
                                    console.error('Failed to play cover video:', error);
                                  }
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-[#052F4A] hover:text-sky-600 transition-colors"
                                title="Play playlist (Right-click for cover video)"
                              >
                                <Play size={18} fill="currentColor" />
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const items = await getPlaylistItems(playlist.id);
                                    // Simple shuffle
                                    const shuffled = [...items].sort(() => Math.random() - 0.5);
                                    setPlaylistItems(shuffled, playlist.id, null, playlist.name);
                                    if (shuffled.length > 0 && onVideoSelect) {
                                      onVideoSelect(shuffled[0].video_url);
                                    }
                                  } catch (error) {
                                    console.error('Failed to shuffle playlist:', error);
                                  }
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-[#052F4A] hover:text-sky-600 transition-colors"
                                title="Shuffle playlist"
                              >
                                <Shuffle size={18} />
                              </button>
                            </div>
                          </div>

                          {/* Thumbnail */}
                          <div className="rounded-lg overflow-hidden relative group mt-auto" style={{
                            width: '100%',
                            paddingBottom: '56.25%', // 16:9 aspect ratio
                            backgroundColor: '#0f172a',
                          }}>
                            {activeThumbnailUrl ? (
                              <img
                                src={activeThumbnailUrl}
                                alt={playlist.name}
                                onError={() => {
                                  if (!useFallback) {
                                    setImageLoadErrors(prev => new Set(prev).add(playlistImageKey));
                                  }
                                }}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block'
                                }}
                              />
                            ) : (
                              <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <svg
                                  className="w-12 h-12 text-slate-500"
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
                            )}

                            {/* Play overlay on hover - REMOVED per user request */}

                            {/* 3-dot menu - moved to hover overlay (Top Right) */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30" onClick={e => e.stopPropagation()}>
                              <CardMenu
                                options={[
                                  {
                                    label: isExpanded ? 'Collapse Folders' : 'Expand Folders',
                                    icon: (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isExpanded ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                                      </svg>
                                    ),
                                    action: 'toggleFolders',
                                  },
                                  {
                                    label: 'Export Playlist',
                                    icon: (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                    ),
                                    action: 'export',
                                  },
                                  {
                                    label: 'Add to Tab',
                                    submenu: 'tabs',
                                    icon: (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                      </svg>
                                    ),
                                  },
                                  ...(activeTabId !== 'all' ? [{
                                    label: 'Remove from Tab',
                                    icon: (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                      </svg>
                                    ),
                                    action: 'removeFromTabCurrent',
                                    danger: true
                                  }] : []),
                                  {
                                    label: deletingPlaylistId === playlist.id ? 'Deleting...' : 'Delete',
                                    danger: true,
                                    icon: deletingPlaylistId === playlist.id ? (
                                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    ),
                                    action: 'delete',
                                    disabled: deletingPlaylistId === playlist.id,
                                  },
                                ]}
                                submenuOptions={{
                                  tabs: tabs
                                    .filter(tab => tab.id !== 'all')
                                    .map(tab => {
                                      const isInTab = tab.playlistIds.includes(playlist.id);
                                      return {
                                        label: isInTab ? `✓ ${tab.name}` : tab.name,
                                        action: isInTab ? 'removeFromTab' : 'addToTab',
                                        tabId: tab.id,
                                      };
                                    }),
                                }}
                                onOptionClick={(option) => {
                                  if (option.action === 'toggleFolders') {
                                    togglePlaylistExpand(playlist.id);
                                  } else if (option.action === 'export') {
                                    handleExportPlaylist(playlist.id, playlist.name);
                                  } else if (option.action === 'removeFromTabCurrent') {
                                    console.log('Removing playlist', playlist.id, 'from active tab', activeTabId);
                                    removePlaylistFromTab(activeTabId, playlist.id);
                                  } else if (option.action === 'delete' && !option.disabled) {
                                    handleDeletePlaylist(playlist.id, playlist.name, { stopPropagation: () => { } });
                                  } else if (option.action === 'addToTab') {
                                    addPlaylistToTab(option.tabId, playlist.id);
                                  } else if (option.action === 'removeFromTab') {
                                    removePlaylistFromTab(option.tabId, playlist.id);
                                  }
                                }}
                              />
                            </div>

                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // Render folder card - same size as playlist card
                    const folder = item.data;
                    const folderColor = getFolderColorById(folder.folder_color);
                    const folderImageKey = `folder-${folder.playlist_id}-${folder.folder_color}`;
                    const thumbUrls = folder.first_video ? {
                      max: getThumbnailUrl(folder.first_video.video_id, 'max'),
                      standard: getThumbnailUrl(folder.first_video.video_id, 'standard')
                    } : null;
                    const useFallback = imageLoadErrors.has(folderImageKey);
                    const activeThumbnailUrl = thumbUrls ? (useFallback ? thumbUrls.standard : thumbUrls.max) : null;

                    const folderKey = `${folder.playlist_id}:${folder.folder_color}`;

                    const isStuck = stuckFolders.has(folderKey);

                    return (
                      <div
                        key={`${folder.playlist_id}-${folder.folder_color}-${index}`}
                        onClick={async (e) => {
                          // Don't trigger if clicking on menu
                          if (e.target.closest('[data-card-menu="true"]')) {
                            return;
                          }
                          try {
                            const items = await getPlaylistItems(folder.playlist_id);
                            // Use parentPlaylist name if available (it should be attach to item in the list builder)
                            const playlistTitle = item.parentPlaylist ? item.parentPlaylist.name : null;
                            setPlaylistItems(items, folder.playlist_id, { playlist_id: folder.playlist_id, folder_color: folder.folder_color }, playlistTitle);
                            if (folder.first_video && onVideoSelect) {
                              onVideoSelect(folder.first_video.video_url);
                            }
                          } catch (error) {
                            console.error('Failed to load folder playlist items:', error);
                          }
                        }}
                        className="cursor-pointer group relative"
                        title={getInspectTitle(`${folderColor.name} folder`)}
                      >
                        <div
                          className={`border-2 border-slate-700/50 rounded-xl p-2 bg-slate-800/20 hover:border-sky-500/50 transition-colors h-full flex flex-col ${String(playlist.id) === String(activePlaylistId) ? 'active-playlist-marker' : ''}`}
                          data-active-playlist={String(playlist.id) === String(activePlaylistId) ? "true" : "false"}
                        >
                          {/* Folder Info - Same format as playlist card */}
                          <div className="mb-2 relative border-2 border-[#052F4A] rounded-md p-1 bg-slate-100/90 shadow-sm flex items-center justify-between h-[38px] overflow-hidden">
                            <div className="flex items-center gap-2 justify-center pl-1">
                              {/* Colored dot indicator */}
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: folderColor.hex }}
                              />
                              <h3 className="font-medium text-sm truncate transition-colors pr-8"
                                style={{ color: '#052F4A' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#38bdf8'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#052F4A'}>
                                {folderColor.name} Folder
                              </h3>
                            </div>

                            {/* Hover Controls - Moved to Title Bar */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-1 top-0 bottom-0 pr-1 pl-4 bg-gradient-to-l from-slate-100 via-slate-100 to-transparent">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const items = await getVideosInFolder(folder.playlist_id, folder.folder_color);
                                    // Use parentPlaylist name if available (it should be attach to item in the list builder)
                                    const playlistTitle = item.parentPlaylist ? item.parentPlaylist.name : null;
                                    setPlaylistItems(items, folder.playlist_id, { playlist_id: folder.playlist_id, folder_color: folder.folder_color }, playlistTitle);
                                    if (items.length > 0 && onVideoSelect) {
                                      onVideoSelect(items[0].video_url);
                                    }
                                  } catch (error) {
                                    console.error('Failed to load folder playlist items:', error);
                                  }
                                }}
                                onContextMenu={async (e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  try {
                                    const items = await getVideosInFolder(folder.playlist_id, folder.folder_color);
                                    const playlistTitle = item.parentPlaylist ? item.parentPlaylist.name : null;
                                    setPlaylistItems(items, folder.playlist_id, { playlist_id: folder.playlist_id, folder_color: folder.folder_color }, playlistTitle);

                                    if (items.length > 0 && onVideoSelect) {
                                      let targetVideo = items[0];

                                      if (activeThumbnailUrl) {
                                        const coverMatch = items.find(v => {
                                          const maxThumb = getThumbnailUrl(v.video_id, 'max');
                                          const stdThumb = getThumbnailUrl(v.video_id, 'standard');
                                          return maxThumb === activeThumbnailUrl || stdThumb === activeThumbnailUrl;
                                        });
                                        if (coverMatch) targetVideo = coverMatch;
                                      }
                                      onVideoSelect(targetVideo.video_url);
                                    }
                                  } catch (error) {
                                    console.error('Failed to play folder cover:', error);
                                  }
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-[#052F4A] hover:text-sky-600 transition-colors"
                                title="Play folder (Right-click for cover video)"
                              >
                                <Play size={18} fill="currentColor" />
                              </button>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const items = await getVideosInFolder(folder.playlist_id, folder.folder_color);
                                    const shuffled = [...items].sort(() => Math.random() - 0.5);

                                    // Use parentPlaylist name if available
                                    const playlistTitle = item.parentPlaylist ? item.parentPlaylist.name : null;
                                    setPlaylistItems(shuffled, folder.playlist_id, { playlist_id: folder.playlist_id, folder_color: folder.folder_color }, playlistTitle);

                                    if (shuffled.length > 0 && onVideoSelect) {
                                      onVideoSelect(shuffled[0].video_url);
                                    }
                                  } catch (error) {
                                    console.error('Failed to shuffle folder:', error);
                                  }
                                }}
                                className="p-1 hover:bg-slate-200 rounded text-[#052F4A] hover:text-sky-600 transition-colors"
                                title="Shuffle folder"
                              >
                                <Shuffle size={18} />
                              </button>
                            </div>

                            {/* 3-dot menu - removed from bottom right */}
                          </div>

                          {/* Thumbnail - Same format as playlist card */}
                          <div className="rounded-lg overflow-hidden relative group mt-auto" style={{
                            width: '100%',
                            paddingBottom: '56.25%', // 16:9 aspect ratio
                            backgroundColor: '#0f172a',
                            overflow: 'hidden'
                          }}>
                            {/* Colored left border indicator */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-2 z-10"
                              style={{ backgroundColor: folderColor.hex }}
                            />
                            {activeThumbnailUrl ? (
                              <img
                                src={activeThumbnailUrl}
                                alt={folder.first_video?.title || 'Folder thumbnail'}
                                onError={() => {
                                  if (!useFallback) {
                                    setImageLoadErrors(prev => new Set(prev).add(folderImageKey));
                                  }
                                }}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  display: 'block',
                                  paddingLeft: '8px'
                                }}
                              />
                            ) : (
                              <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingLeft: '8px'
                              }}>
                                <svg
                                  className="w-12 h-12 text-slate-500"
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
                            )}
                            {/* Play overlay on hover - REMOVED */}
                            {/* 3-dot menu - moved to hover overlay (Top Right) */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                              <CardMenu
                                options={[
                                  {
                                    label: isStuck ? 'Unstick Folder' : 'Stick Folder',
                                    icon: isStuck ? (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                      </svg>
                                    ),
                                    action: 'toggleStick',
                                  },
                                ]}
                                onOptionClick={async (option) => {
                                  if (option.action === 'toggleStick') {
                                    try {
                                      const newStuckStatus = await toggleStuckFolder(folder.playlist_id, folder.folder_color);
                                      // Update local state
                                      const folderKey = `${folder.playlist_id}:${folder.folder_color}`;
                                      setStuckFolders(prev => {
                                        const next = new Set(prev);
                                        if (newStuckStatus) {
                                          next.add(folderKey);
                                        } else {
                                          next.delete(folderKey);
                                        }
                                        return next;
                                      });
                                    } catch (error) {
                                      console.error('Failed to toggle stick folder:', error);
                                    }
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                });
              })()}
            </div>
          </div>
        </>
      )
      }
    </div >
  );
};

export default PlaylistsPage;

