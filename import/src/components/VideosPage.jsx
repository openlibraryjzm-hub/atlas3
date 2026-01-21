import React, { useState, useEffect, useMemo, useRef } from 'react';
import { usePlaylistStore } from '../store/playlistStore';
import { useFolderStore } from '../store/folderStore';
import { useLayoutStore } from '../store/layoutStore';
import { assignVideoToFolder, unassignVideoFromFolder, getVideoFolderAssignments, getAllFolderAssignments, getVideosInFolder, removeVideoFromPlaylist, getWatchedVideoIds, getAllVideoProgress } from '../api/playlistApi';
import { FOLDER_COLORS, getFolderColorById } from '../utils/folderColors';
import { extractVideoId } from '../utils/youtubeUtils';
import VideoCard from './VideoCard';
import PlaylistSelectionModal from './PlaylistSelectionModal';
import PlaylistUploader from './PlaylistUploader';
import { addVideoToPlaylist, getPlaylistItems } from '../api/playlistApi';
import { useStickyStore } from '../store/stickyStore';
import StickyVideoCarousel from './StickyVideoCarousel';
import PageBanner from './PageBanner';
import EditPlaylistModal from './EditPlaylistModal';
import UnifiedBannerBackground from './UnifiedBannerBackground';
import { useNavigationStore } from '../store/navigationStore';
import { Star, MoreVertical, Plus, Play, Check, X, ArrowUp, Clock, Heart, Pin, Settings, Cat } from 'lucide-react';
import VideoCardSkeleton from './skeletons/VideoCardSkeleton';
import { updatePlaylist, getAllPlaylists, getFolderMetadata, setFolderMetadata } from '../api/playlistApi';
import { useConfigStore } from '../store/configStore';
import { useShuffleStore } from '../store/shuffleStore';

const VideosPage = ({ onVideoSelect, onSecondPlayerSelect }) => {
  const {
    currentPlaylistItems,
    currentVideoIndex,
    currentPlaylistId,
    setPlaylistItems,
    previewPlaylistItems,
    previewPlaylistId,
    previewFolderInfo,
    setPreviewPlaylist,
    allPlaylists,
    setAllPlaylists,
  } = usePlaylistStore();
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(null);
  const {
    selectedFolder,
    setSelectedFolder,
    setVideoFolders,
    videoFolderAssignments,
    loadVideoFolders,
    quickAssignFolder,
    setQuickAssignFolder,
    bulkTagMode,
    setBulkTagMode,
    bulkTagSelections,
    toggleBulkTagSelection,
    clearBulkTagSelections,
  } = useFolderStore();
  const { shuffleStates, getShuffleState } = useShuffleStore();
  const { setViewMode, inspectMode, viewMode } = useLayoutStore();
  const { currentPage: currentNavTab, setCurrentPage: setCurrentNavTab } = useNavigationStore();
  const scrollContainerRef = useRef(null);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabs = [
    { id: 'playlists', label: 'Playlists' },
    { id: 'videos', label: 'Videos' },
    { id: 'history', label: 'History', icon: <Clock size={16} /> },
    { id: 'likes', label: 'Likes', icon: <Heart size={16} /> },
    { id: 'pins', label: 'Pins', icon: <Pin size={16} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
    { id: 'support', label: 'Support', icon: <Cat size={16} /> },
  ];

  const handleTabClick = (tabId) => {
    setCurrentNavTab(tabId);
    const isNavigationTab = ['playlists', 'videos', 'history', 'likes', 'pins', 'settings', 'support'].includes(tabId);
    if (isNavigationTab && viewMode === 'full') {
      setViewMode('half');
    }
  };
  const { userName, userAvatar, customPageBannerImage, bannerHeight, bannerBgSize } = useConfigStore();

  // Helper to get inspect label
  const getInspectTitle = (label) => inspectMode ? label : undefined;
  const [displayedVideos, setDisplayedVideos] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true); // Start true to show skeletons immediately
  const [savingBulkTags, setSavingBulkTags] = useState(false);
  const [sortBy, setSortBy] = useState('shuffle'); // 'shuffle', 'chronological', 'progress'
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc', 'desc'
  const [includeUnwatched, setIncludeUnwatched] = useState(true);
  const [showOnlyCompleted, setShowOnlyCompleted] = useState(false);
  const [watchedVideoIds, setWatchedVideoIds] = useState(new Set());
  const [videoProgress, setVideoProgress] = useState(new Map()); // Map<videoId, { percentage: number, hasFullyWatched: boolean }>

  // Move/Copy state
  const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
  const [selectedVideoForAction, setSelectedVideoForAction] = useState(null);
  const [actionType, setActionType] = useState(null); // 'move' or 'copy'
  const [showUploader, setShowUploader] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [folderMetadata, setFolderMetadataState] = useState(null); // { custom_name, description }

  // Use preview items if available, otherwise use current playlist items
  const activePlaylistItems = previewPlaylistItems || currentPlaylistItems;
  const activePlaylistId = previewPlaylistId || currentPlaylistId;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;





  // Reset page when playlist, folder, or sort filters change
  useEffect(() => {
    setCurrentPage(1);
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
  }, [activePlaylistId, selectedFolder, sortBy, sortDirection, includeUnwatched, showOnlyCompleted]);

  // Scroll to top when page changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo(0, 0);
    }
  }, [currentPage]);

  useEffect(() => {
    // Sync selected video with current playing video
    if (currentVideoIndex >= 0 && activePlaylistItems.length > 0) {
      setSelectedVideoIndex(currentVideoIndex);
    }
  }, [currentVideoIndex, activePlaylistItems]);

  const { isStickied, toggleSticky, stickiedVideos: allStickiedVideos } = useStickyStore();

  const handleToggleSticky = (playlistId, videoId) => {
    console.log(`[VideosPage] Toggling sticky for playlist ${playlistId}, video ${videoId}, folder ${selectedFolder}`);
    // Pass selectedFolder to toggle function to scope the key
    toggleSticky(playlistId, videoId, selectedFolder);
  };

  // Debug effect
  useEffect(() => {
    console.log('[VideosPage] Active Playlist:', activePlaylistId);
    console.log('[VideosPage] Sticky Data:', allStickiedVideos);
    console.log('[VideosPage] Selected Folder:', selectedFolder);
  }, [activePlaylistId, allStickiedVideos, selectedFolder]);

  // Reset selected folder when playlist changes to prevent showing wrong videos
  useEffect(() => {
    setSelectedFolder(null);
  }, [activePlaylistId, setSelectedFolder]);

  // Clear bulk tag selections when exiting bulk tag mode
  useEffect(() => {
    if (!bulkTagMode) {
      clearBulkTagSelections();
    }
  }, [bulkTagMode, clearBulkTagSelections]);

  // Load video progress data for sorting
  useEffect(() => {
    const loadProgress = async () => {
      try {
        // Load watched video IDs (>= 85% progress)
        const watchedIds = await getWatchedVideoIds();
        setWatchedVideoIds(new Set(watchedIds));

        // Load all video progress
        const allProgress = await getAllVideoProgress();
        const progressMap = new Map();
        for (const progress of allProgress) {
          progressMap.set(progress.video_id, {
            percentage: progress.progress_percentage,
            hasFullyWatched: progress.has_fully_watched,
            last_updated: progress.last_updated
          });
        }
        setVideoProgress(progressMap);
      } catch (error) {
        console.error('Failed to load video progress:', error);
      }
    };

    loadProgress();

    // Poll for progress updates every 5 seconds to keep UI fresh
    const intervalId = setInterval(loadProgress, 5000);

    return () => clearInterval(intervalId);
  }, []);

  // Refresh video progress when current video changes (to update sorting in real-time)
  useEffect(() => {
    const refreshProgress = async () => {
      if (activePlaylistItems.length > 0 && currentVideoIndex < activePlaylistItems.length) {
        try {
          // Refresh watched video IDs
          const watchedIds = await getWatchedVideoIds();
          setWatchedVideoIds(new Set(watchedIds));

          // Refresh all progress data
          const allProgress = await getAllVideoProgress();
          const progressMap = new Map();
          for (const progress of allProgress) {
            progressMap.set(progress.video_id, {
              percentage: progress.progress_percentage,
              hasFullyWatched: progress.has_fully_watched,
              last_updated: progress.last_updated
            });
          }
          setVideoProgress(progressMap);
        } catch (error) {
          console.error('Failed to refresh video progress:', error);
        }
      }
    };

    // Debounce the refresh to avoid too many API calls
    const timeoutId = setTimeout(refreshProgress, 2000);
    return () => clearTimeout(timeoutId);
  }, [currentVideoIndex, activePlaylistItems]);

  // Load folder assignments when playlist changes (but don't filter here)
  useEffect(() => {
    const loadAssignments = async () => {
      // Set loading true immediately when ID changes
      setLoadingFolders(true);

      // If no playlist or it's empty, clear folders
      // Actually, even if items are empty, we might want to clear or just wait.
      // But if we have an ID, we can fetch assignments.
      if (!activePlaylistId) {
        loadVideoFolders({});
        setLoadingFolders(false);
        return;
      }

      try {
        // PERFORMANCE: Batch fetch all folder assignments in ONE call
        // This replaces the previous N+1 loop that caused massive stuttering
        const assignments = await getAllFolderAssignments(activePlaylistId);
        loadVideoFolders(assignments || {});
      } catch (error) {
        console.error('Failed to load folder assignments:', error);
        loadVideoFolders({});
      } finally {
        setLoadingFolders(false);
      }
    };

    loadAssignments();
  }, [activePlaylistId, activePlaylistItems, loadVideoFolders]);

  // Initialize shuffle state when entering shuffle mode or playlist loading
  useEffect(() => {
    if (activePlaylistId && activePlaylistItems.length > 0) {
      // We essentially want to ensure the shuffle map exists for this playlist
      // This is "low cost" because getShuffleState checks if it exists first
      getShuffleState(activePlaylistId, activePlaylistItems.map(v => v.id));
    }
  }, [activePlaylistId, activePlaylistItems, getShuffleState]);

  // Filter videos by selected folder - this is the main filtering logic
  useEffect(() => {
    if (!activePlaylistId || activePlaylistItems.length === 0) {
      setDisplayedVideos([]);
      return;
    }

    const filterVideos = async () => {
      if (selectedFolder === null) {
        // Show all videos when no folder is selected
        setDisplayedVideos(activePlaylistItems);
        return;
      }

      setLoadingFolders(true);
      try {
        if (selectedFolder === 'unsorted') {
          // Filter for videos with no folder assignments
          const unsortedVideos = [];
          for (const video of activePlaylistItems) {
            // Check stored assignments
            const folders = videoFolderAssignments[video.id];

            // If we have loaded assignments and it's empty, or if we haven't loaded, let's check
            // Note: videoFolderAssignments is populated on playlist change, so it should be reliable.
            // However, to be safe, we could check DB but that's slow for "Unsorted" filter.
            // Let's rely on useFolderStore's loaded state which is refreshed on playlist change.
            if (!folders || folders.length === 0) {
              unsortedVideos.push(video);
            }
          }
          console.log(`Unsorted filter: Found ${unsortedVideos.length} videos`);
          setDisplayedVideos(unsortedVideos);
        } else {
          // When a color folder is selected, only show videos explicitly assigned to that folder
          // The database query uses INNER JOIN so it will only return videos with assignments
          const videos = await getVideosInFolder(activePlaylistId, selectedFolder);
          // Ensure we only show videos that are actually in the result (should be empty if no assignments)
          console.log(`Folder ${selectedFolder}: Found ${videos?.length || 0} videos with assignments`);
          setDisplayedVideos(Array.isArray(videos) ? videos : []);
        }
      } catch (error) {
        console.error('Failed to load folder videos:', error);
        // On error, show empty array (folder should be empty)
        setDisplayedVideos([]);
      } finally {
        setLoadingFolders(false);
      }
    };

    filterVideos();
  }, [selectedFolder, activePlaylistId, activePlaylistItems]);

  const handleMenuOptionClick = async (option, video) => {
    console.log('handleMenuOptionClick:', option.action, video.id, 'activePermission:', !!activePlaylistId);
    if (!activePlaylistId) {
      console.warn('Action attempted without activePlaylistId');
      // Temporarily allow for testing if that's the issue, or alert user
      // return; 
    }

    try {
      switch (option.action) {
        case 'delete':
          const confirmed = window.confirm(
            `Are you sure you want to remove "${video.title || 'this video'}" from the playlist?`
          );
          if (!confirmed) return;

          await removeVideoFromPlaylist(activePlaylistId, video.id);

          // Remove from displayed videos
          setDisplayedVideos(prev => prev.filter(v => v.id !== video.id));

          // Remove from active playlist items
          // Use activePlaylistItems instead of currentPlaylistItems as base if possible, 
          // but we need to update the store which expects us to update the specific list.
          // Since we are modifying the *active* playlist, we should update the store for that playlist.

          if (previewPlaylistId) {
            // We are in preview mode
            const updatedItems = previewPlaylistItems.filter(v => v.id !== video.id);
            // We need a clearPreview or setPreviewPlaylist method, but setPreviewPlaylist is safer
            setPreviewPlaylist(updatedItems, previewPlaylistId, previewFolderInfo);
          } else {
            // We are in current playback mode
            const updatedItems = currentPlaylistItems.filter(v => v.id !== video.id);
            setPlaylistItems(updatedItems, currentPlaylistId);
          }
          break;

        case 'assignFolder':
          if (option.folderColor) {
            const currentFolders = videoFolderAssignments[video.id] || [];
            const isAssigned = currentFolders.includes(option.folderColor);

            if (isAssigned) {
              await unassignVideoFromFolder(activePlaylistId, video.id, option.folderColor);
              setVideoFolders(video.id, currentFolders.filter(f => f !== option.folderColor));
            } else {
              await assignVideoToFolder(activePlaylistId, video.id, option.folderColor);
              setVideoFolders(video.id, [...currentFolders, option.folderColor]);
            }

            // Refresh folder view if viewing that folder
            if (selectedFolder === option.folderColor) {
              const videos = await getVideosInFolder(activePlaylistId, selectedFolder);
              setDisplayedVideos(videos || []);
            }
          }
          break;

        case 'setQuickAssign':
          if (option.folderColor) {
            setQuickAssignFolder(option.folderColor);
            console.log('Quick assign folder set to:', option.folderColor);
          }
          break;

        case 'moveToPlaylist':
          setSelectedVideoForAction(video);
          setActionType('move');
          setShowPlaylistSelector(true);
          break;

        case 'setPlaylistCover':
          if (!activePlaylistId) return;
          try {
            // Use max resolution for cover
            const coverUrl = `https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`;
            await updatePlaylist(activePlaylistId, null, null, null, coverUrl);
            alert(`Playlist cover updated using thumbnail from "${video.title}"`);

            // Refresh playlists to reflect change in UI immediately if possible
            const playlists = await getAllPlaylists();
            setAllPlaylists(playlists);
          } catch (error) {
            console.error('Failed to set playlist cover:', error);
            alert('Failed to set playlist cover');
          }
          break;

        case 'copyToPlaylist':
          setSelectedVideoForAction(video);
          setActionType('copy');
          setShowPlaylistSelector(true);
          break;

        default:
          console.log('Unknown action:', option.action);
      }
    } catch (error) {
      console.error('Failed to handle menu action:', error);
      alert(`Failed to ${option.label.toLowerCase()}: ${error.message || 'Unknown error'}`);
    }
  };

  const handleStarClick = async (e, video) => {
    if (!activePlaylistId) return;

    const currentFolders = videoFolderAssignments[video.id] || [];

    // Use quick assign folder (stored preference) instead of selected folder
    const targetFolder = quickAssignFolder;
    const isAssigned = currentFolders.includes(targetFolder);

    try {
      if (isAssigned) {
        // Unassign from quick assign folder
        await unassignVideoFromFolder(activePlaylistId, video.id, targetFolder);
        const updatedFolders = currentFolders.filter(f => f !== targetFolder);
        setVideoFolders(video.id, updatedFolders);

        // Refresh folder view if viewing that folder
        if (selectedFolder === targetFolder) {
          const videos = await getVideosInFolder(activePlaylistId, selectedFolder);
          setDisplayedVideos(videos || []);
        }
      } else {
        // Assign to quick assign folder
        await assignVideoToFolder(activePlaylistId, video.id, targetFolder);
        setVideoFolders(video.id, [...currentFolders, targetFolder]);

        // Refresh folder view if viewing that folder
        if (selectedFolder === targetFolder) {
          const videos = await getVideosInFolder(activePlaylistId, selectedFolder);
          setDisplayedVideos(videos || []);
        }
      }
    } catch (error) {
      console.error('Failed to toggle folder assignment:', error);
      alert(`Failed to ${isAssigned ? 'unassign' : 'assign'} video: ${error.message || 'Unknown error'}`);
    }
  };

  // Handle star color left click - assign video to folder
  const handleStarColorLeftClick = async (video, folderColor) => {
    if (!activePlaylistId) return;

    const currentFolders = videoFolderAssignments[video.id] || [];
    const isAssigned = currentFolders.includes(folderColor);

    try {
      if (isAssigned) {
        // Unassign from folder
        await unassignVideoFromFolder(activePlaylistId, video.id, folderColor);
        const updatedFolders = currentFolders.filter(f => f !== folderColor);
        setVideoFolders(video.id, updatedFolders);

        // Refresh folder view if viewing that folder
        if (selectedFolder === folderColor) {
          const videos = await getVideosInFolder(activePlaylistId, selectedFolder);
          setDisplayedVideos(videos || []);
        }
      } else {
        // Assign to folder
        await assignVideoToFolder(activePlaylistId, video.id, folderColor);
        setVideoFolders(video.id, [...currentFolders, folderColor]);

        // Refresh folder view if viewing that folder
        if (selectedFolder === folderColor) {
          const videos = await getVideosInFolder(activePlaylistId, selectedFolder);
          setDisplayedVideos(videos || []);
        }
      }
    } catch (error) {
      console.error('Failed to toggle folder assignment:', error);
      alert(`Failed to ${isAssigned ? 'unassign' : 'assign'} video: ${error.message || 'Unknown error'}`);
    }
  };

  // Handle star color right click - set as quick assign default
  const handleStarColorRightClick = (folderColor) => {
    setQuickAssignFolder(folderColor);
    console.log('Quick assign folder set to:', folderColor);
  };

  const handleVideoClick = (video, index) => {
    if (bulkTagMode) return; // Don't play videos in bulk tag mode

    // If we are in preview mode, commit this playlist to be the active one
    if (previewPlaylistId) {
      // Find playlist name for title consistency
      const playlist = allPlaylists.find(p => p.id === previewPlaylistId);
      const title = playlist ? playlist.name : null;

      // Commit preview to current
      setPlaylistItems(previewPlaylistItems, previewPlaylistId, previewFolderInfo, title);

      // Clear preview state since it's now active
      // actually setPlaylistItems updates current, we might want to clear preview explicitly or let store handle it?
      // store.setPlaylistItems doesn't autoclear preview.
      // But usually checking `activePlaylistItems = preview || current` handles the view.
      // If we made it current, we should probably clear preview so we aren't "previewing" anymore, we are "playing".
      // But let's stick to the core requirement: ensure title is correct.
    }

    const originalIndex = activePlaylistItems.findIndex(v => v.id === video.id);
    setSelectedVideoIndex(originalIndex >= 0 ? originalIndex : index);
    if (onVideoSelect) {
      onVideoSelect(video.video_url);
    }
  };

  const handleBulkTagColorClick = (video, folderColor) => {
    toggleBulkTagSelection(video.id, folderColor);
  };

  const handleSaveBulkTags = async () => {
    if (!activePlaylistId) return;

    const selections = Object.entries(bulkTagSelections);
    if (selections.length === 0) {
      alert('No selections to save');
      return;
    }

    setSavingBulkTags(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      for (const [videoId, folderColors] of selections) {
        const videoIdNum = parseInt(videoId);
        const folders = Array.from(folderColors);

        // Get current folder assignments for this video
        const currentFolders = videoFolderAssignments[videoIdNum] || [];

        // Determine which folders to add and which to remove
        const foldersToAdd = folders.filter(f => !currentFolders.includes(f));
        const foldersToRemove = currentFolders.filter(f => !folders.includes(f));

        // Add new assignments
        for (const folderColor of foldersToAdd) {
          try {
            await assignVideoToFolder(activePlaylistId, videoIdNum, folderColor);
            successCount++;
          } catch (error) {
            console.error(`Failed to assign video ${videoIdNum} to folder ${folderColor}:`, error);
            errorCount++;
          }
        }

        // Remove old assignments
        for (const folderColor of foldersToRemove) {
          try {
            await unassignVideoFromFolder(activePlaylistId, videoIdNum, folderColor);
            successCount++;
          } catch (error) {
            console.error(`Failed to unassign video ${videoIdNum} from folder ${folderColor}:`, error);
            errorCount++;
          }
        }

        // Update local state
        setVideoFolders(videoIdNum, folders);
      }

      // Refresh folder assignments
      const assignments = {};
      for (const video of activePlaylistItems) {
        try {
          const folders = await getVideoFolderAssignments(activePlaylistId, video.id);
          assignments[video.id] = Array.isArray(folders) && folders.length > 0 ? folders : [];
        } catch (error) {
          console.error(`Failed to load folders for video ${video.id}:`, error);
          assignments[video.id] = [];
        }
      }
      loadVideoFolders(assignments);

      // Refresh folder view if viewing a folder
      if (selectedFolder !== null) {
        const videos = await getVideosInFolder(activePlaylistId, selectedFolder);
        setDisplayedVideos(videos || []);
      }

      // Clear selections and exit bulk tag mode
      clearBulkTagSelections();
      setBulkTagMode(false);

      if (errorCount > 0) {
        alert(`Saved ${successCount} assignments, but ${errorCount} failed. Check console for details.`);
      } else {
        alert(`Successfully saved ${successCount} folder assignments!`);
      }
    } catch (error) {
      console.error('Failed to save bulk tags:', error);
      alert(`Failed to save bulk tags: ${error.message || 'Unknown error'}`);
    } finally {
      setSavingBulkTags(false);
    }
  };

  const handleCancelBulkTags = () => {
    clearBulkTagSelections();
    setBulkTagMode(false);
  };

  const handlePlaylistSelect = async (playlistId) => {
    if (!selectedVideoForAction || !actionType) return;

    try {
      const video = selectedVideoForAction;
      console.log(`${actionType === 'move' ? 'Moving' : 'Copying'} video to playlist ${playlistId}:`, video.title);

      const videoId = extractVideoId(video.video_url) || video.video_id;

      // 1. Add to destination playlist (Copy logic)
      await addVideoToPlaylist(
        playlistId,
        video.video_url,
        videoId,
        video.title,
        video.thumbnail_url
      );

      // 2. If 'move', remove from current playlist
      if (actionType === 'move' && activePlaylistId) {
        await removeVideoFromPlaylist(activePlaylistId, video.id);

        // Update UI locally to reflect removal
        setDisplayedVideos(prev => prev.filter(v => v.id !== video.id));

        // Update global store
        if (previewPlaylistId) {
          const updatedItems = previewPlaylistItems.filter(v => v.id !== video.id);
          setPreviewPlaylist(updatedItems, previewPlaylistId, previewFolderInfo);
        } else {
          const updatedItems = currentPlaylistItems.filter(v => v.id !== video.id);
          setPlaylistItems(updatedItems, currentPlaylistId);
        }
      }

      // Success feedback (could use a toast)
      console.log(`Video successfully ${actionType === 'move' ? 'moved' : 'copied'}!`);
      // Optional: alert(`Video ${actionType === 'move' ? 'moved' : 'copied'} successfully!`);

    } catch (error) {
      console.error(`Failed to ${actionType} video:`, error);
      alert(`Failed to ${actionType} video: ${error.message}`);
    } finally {
      setShowPlaylistSelector(false);
      setSelectedVideoForAction(null);
      setActionType(null);
    }
  };

  // Calculate folder counts
  const folderCounts = useMemo(() => {
    const counts = {};
    if (videoFolderAssignments) {
      Object.values(videoFolderAssignments).forEach(folders => {
        if (Array.isArray(folders)) {
          folders.forEach(folderId => {
            counts[folderId] = (counts[folderId] || 0) + 1;
          });
        }
      });
    }
    return counts;
  }, [videoFolderAssignments]);

  const handleUploadComplete = async () => {
    setShowUploader(false);

    // Reload the current playlist to show new videos
    if (activePlaylistId) {
      try {
        const items = await getPlaylistItems(activePlaylistId);
        if (previewPlaylistId) {
          setPreviewPlaylist(items, previewPlaylistId, previewFolderInfo);
        } else {
          setPlaylistItems(items, currentPlaylistId);
        }
      } catch (error) {
        console.error('Failed to reload playlist after upload:', error);
      }
    }
  };

  // Fetch folder metadata when selected folder changes
  useEffect(() => {
    const fetchMetadata = async () => {
      if (activePlaylistId && selectedFolder && selectedFolder !== 'unsorted') {
        try {
          const metadata = await getFolderMetadata(activePlaylistId, selectedFolder);
          // API returns [name, description] or null.
          // Wait, check rust implementation: returns (String, String) or None.
          // Check JS implementation: returns result || null.
          // So if result is array/tuple, it's [name, desc].
          // Let's verify what Tauri returns for tuple. It usually returns array.

          if (metadata) {
            // Destructure carefully if it's array
            setFolderMetadataState({ name: metadata[0], description: metadata[1], customAscii: metadata[2] });
          } else {
            setFolderMetadataState(null);
          }
        } catch (error) {
          console.error("Failed to fetch folder metadata:", error);
          setFolderMetadataState(null);
        }
      } else {
        setFolderMetadataState(null);
      }
    };

    fetchMetadata();
  }, [activePlaylistId, selectedFolder]);


  const handleUpdateMetadata = async (data) => {
    if (!activePlaylistId) return;

    try {
      if (selectedFolder && selectedFolder !== 'unsorted') {
        // Update Folder Metadata
        await setFolderMetadata(activePlaylistId, selectedFolder, data.name, data.description, data.customAscii);
        // Refresh local state
        setFolderMetadataState({ name: data.name, description: data.description, customAscii: data.customAscii });
      } else {
        // Update Playlist Metadata
        await updatePlaylist(activePlaylistId, data.name, data.description, data.customAscii);

        // Update global state store by reloading all playlists
        const playlists = await getAllPlaylists();
        setAllPlaylists(playlists);
      }
    } catch (error) {
      console.error('Failed to update metadata:', error);
      throw error;
    }
  };

  // Sort videos based on selected sort option
  // IMPORTANT: This hook must be called BEFORE any early returns
  const sortedVideos = useMemo(() => {
    // Determine which videos to display (folder filtered or all)
    const baseVideos = selectedFolder !== null ? displayedVideos : activePlaylistItems;

    // Handle empty arrays
    if (!baseVideos || baseVideos.length === 0) {
      return [];
    }

    if (sortBy === 'chronological') {
      return baseVideos;
    }

    if (sortBy === 'shuffle') {
      const state = shuffleStates[activePlaylistId];
      if (!state || !state.map) return baseVideos;

      return [...baseVideos].sort((a, b) => {
        const rankA = state.map[a.id] ?? 0;
        const rankB = state.map[b.id] ?? 0;
        return rankA - rankB;
      });
    }

    if (sortBy === 'progress') {
      let filtered = [...baseVideos];

      // Filter: Hide Unwatched
      if (!includeUnwatched) {
        filtered = filtered.filter(video => {
          const videoId = extractVideoId(video.video_url) || video.video_id;
          const data = videoProgress.get(videoId);
          // Check if data exists and percentage > 0.
          const percentage = data ? (typeof data === 'number' ? data : data.percentage) : 0;
          return percentage > 0;
        });
      }

      // Filter: Show Only Completed (Redefined by user as "Toggle to show/hide fully watched videos")
      // If the button is ACTIVE (state true), we HIDE completed videos.
      // Wait, standard UI pattern:
      // Button "Show Completed" (Active) -> Show them.
      // But user said "I want that button to be a toggle to show/hide fully watched videos - leaving just partially watched and unwatched behind" 
      // This implies the ACTION of the button is to REMOVE them.
      // So if `showOnlyCompleted` is TRUE, we HIDE them.
      // If the state is true, we HIDE them. If false, we SHOW them.
      // Let's assume the button label should ideally change or is abstract "Toggle Completed".
      if (showOnlyCompleted) {
        filtered = filtered.filter(video => {
          const videoId = extractVideoId(video.video_url) || video.video_id;
          const data = videoProgress.get(videoId);
          const hasFullyWatched = data ? (typeof data === 'object' ? data.hasFullyWatched : false) : false;
          return !hasFullyWatched; // HIDE if watched
        });
      }

      const sorted = filtered.sort((a, b) => {
        const idA = extractVideoId(a.video_url) || a.video_id;
        const idB = extractVideoId(b.video_url) || b.video_id;

        const dataA = videoProgress.get(idA);
        const dataB = videoProgress.get(idB);

        const progressA = dataA ? (typeof dataA === 'number' ? dataA : dataA.percentage) : 0;
        const progressB = dataB ? (typeof dataB === 'number' ? dataB : dataB.percentage) : 0;

        return sortDirection === 'asc'
          ? progressA - progressB
          : progressB - progressA;
      });
      return sorted;
    }

    return baseVideos;
  }, [selectedFolder, displayedVideos, activePlaylistItems, sortBy, sortDirection, videoProgress, includeUnwatched, showOnlyCompleted, shuffleStates, activePlaylistId]);

  // Determine which videos to display (for count display)
  const videosToDisplay = selectedFolder !== null ? displayedVideos : activePlaylistItems;

  // Split sorted videos into stickied and regular
  // Use allStickiedVideos to ensure reactivity
  // Sticky videos should NOT be affected by filters, so we use videosToDisplay (unfiltered) instead of sortedVideos
  const stickiedVideos = videosToDisplay.filter(v => {
    // Check specific folder key
    const folderKey = selectedFolder === null ? 'root' : selectedFolder;
    const key = `${activePlaylistId}::${folderKey}`;
    const stickies = allStickiedVideos[key] || [];
    return stickies.includes(v.id);
  });

  const regularVideos = sortedVideos;

  const bulkTagSelectionCount = Object.values(bulkTagSelections).reduce(
    (total, folders) => total + folders.size,
    0
  );

  // Helper to get banner info
  const activeObject = useMemo(() => {
    if (selectedFolder && selectedFolder !== 'unsorted') {
      return folderMetadata; // This will be null or {name, description}
    }
    return allPlaylists.find(p => p.id === activePlaylistId);
  }, [allPlaylists, activePlaylistId, selectedFolder, folderMetadata]);

  const bannerInfo = useMemo(() => {
    let title = '';
    let description = '';
    let color = null;
    let isEditable = true;
    let customAscii = null;
    let hex = '#3b82f6'; // Default Blue

    if (selectedFolder) {
      if (selectedFolder === 'unsorted') {
        title = 'Unsorted Videos';
        description = `Videos from "${allPlaylists.find(p => p.id === activePlaylistId)?.name || 'Playlist'}" that haven't been assigned to any folder.`;
        color = 'unsorted';
        hex = '#64748b'; // Slate-500
        isEditable = false;
      } else {
        // Folder View
        const colorInfo = FOLDER_COLORS.find(c => c.id === selectedFolder);
        color = selectedFolder;
        if (colorInfo) hex = colorInfo.hex;

        if (activeObject) { // activeObject here refers to folderMetadataState
          title = activeObject.name || (colorInfo ? `${colorInfo.name} Folder` : 'Folder');
          description = activeObject.description || '';
          customAscii = activeObject.customAscii;
        } else {
          // Fallback to default names if no metadata
          title = colorInfo ? `${colorInfo.name} Folder` : 'Folder';
          description = `Videos in the ${title}.`;
        }
        isEditable = true; // Folders are editable
      }
    } else {
      // Playlist View
      title = activeObject ? activeObject.name : '';
      description = activeObject ? activeObject.description : '';
      // Playlist object from Rust uses snake_case
      customAscii = activeObject ? activeObject.custom_ascii : null;
      color = null;
      isEditable = true;
    }

    return { title, description, color, isEditable, customAscii, hex };
  }, [activeObject, selectedFolder, activePlaylistId, allPlaylists]);

  // Determine initial data for modal
  const modalInitialData = useMemo(() => {
    if (selectedFolder && selectedFolder !== 'unsorted') {
      // Folder edit
      const colorInfo = FOLDER_COLORS.find(c => c.id === selectedFolder);
      const defaultName = colorInfo ? `${colorInfo.name} Folder` : 'Folder';

      return {
        name: activeObject?.name || defaultName,
        description: activeObject?.description || '',
        customAscii: activeObject?.customAscii || ''
      };
    } else {
      // Playlist edit
      return {
        name: activeObject?.name || '',
        description: activeObject?.description || '',
        customAscii: activeObject?.custom_ascii || ''
      };
    }
  }, [activeObject, selectedFolder]);

  // Find most recently watched video for "Continue" feature
  const continueVideo = useMemo(() => {
    if (!videosToDisplay || videosToDisplay.length === 0) return null;

    let mostRecent = null;
    let maxTime = 0;

    for (const video of videosToDisplay) {
      const videoId = extractVideoId(video.video_url) || video.video_id;
      const progress = videoProgress.get(videoId);

      if (progress && progress.last_updated) {
        const time = new Date(progress.last_updated).getTime();
        if (time > maxTime) {
          maxTime = time;
          mostRecent = video;
        }
      }
    }

    return mostRecent;
  }, [videosToDisplay, videoProgress]);

  // Sticky header state detection
  const [isStuck, setIsStuck] = useState(false);
  const stickySentinelRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is NOT visible (scrolled past top), we are stuck
        setIsStuck(entry.intersectionRatio < 1 && entry.boundingClientRect.top < 0);
      },
      { threshold: [1], rootMargin: '-1px 0px 0px 0px' }
    );

    if (stickySentinelRef.current) {
      observer.observe(stickySentinelRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Video Grid - 3 per row */}
      {showUploader ? (
        <div className="flex-1 overflow-y-auto p-4 bg-transparent">
          <PlaylistUploader
            onUploadComplete={handleUploadComplete}
            onCancel={() => setShowUploader(false)}
            initialPlaylistId={activePlaylistId}
          />
        </div>
      ) : (
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto bg-transparent relative">
          {/* Page Banner - Always visible for context */}
          {activePlaylistId && (
            <div className="px-8 pt-8">
              <PageBanner
                title={bannerInfo.title}
                description={bannerInfo.description}
                folderColor={bannerInfo.color}
                onEdit={bannerInfo.isEditable ? () => setShowEditModal(true) : undefined}
                videoCount={videosToDisplay.length}
                creationYear="2026"
                author={userName}
                avatar={bannerInfo.customAscii || userAvatar}
                continueVideo={continueVideo}
                onContinue={() => {
                  if (continueVideo && onVideoSelect) {
                    onVideoSelect(continueVideo.video_url);
                  }
                }}
                seamlessBottom={true}
              />
            </div>
          )}

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


              {/* Folder Selection Row */}
              {/* Left Side: Compact Folder Selector + Sort */}
              {/* Left Side: Compact Folder Selector + Sort */}
              <div className="flex items-center gap-0 overflow-x-auto no-scrollbar mask-gradient-right flex-1 min-w-0 pr-0">

                <div className="flex items-center gap-3 pr-3 shrink-0">
                  {/* Compact Sort */}
                  <div className="relative group shrink-0">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-slate-800/80 border border-white/10 rounded-md py-1 pl-2 pr-5 text-[10px] font-bold uppercase tracking-wider text-slate-300 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer hover:bg-slate-700 transition-colors appearance-none"
                      title="Sort"
                    >
                      <option value="shuffle">Default</option>
                      <option value="chronological">Date</option>
                      <option value="progress">Progress</option>
                    </select>
                  </div>

                  {/* Compact Folder Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setSelectedFolder(null)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all uppercase tracking-wider ${selectedFolder === null
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-white/5'
                        }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedFolder('unsorted')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all uppercase tracking-wider ${selectedFolder === 'unsorted'
                        ? 'bg-slate-500 text-white shadow-sm'
                        : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-white/5'
                        }`}
                    >
                      Unsorted
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex items-center shrink-0 h-6 mr-3 border-2 border-black rounded-lg overflow-hidden">
                  {FOLDER_COLORS.map((color, index) => {
                    const isSelected = selectedFolder === color.id;
                    const isFirst = index === 0;
                    const isLast = index === FOLDER_COLORS.length - 1;
                    const count = folderCounts[color.id] || 0;

                    return (
                      <button
                        key={color.id}
                        onClick={() => setSelectedFolder(color.id)}
                        className={`h-full flex-1 flex items-center justify-center transition-all ${isSelected
                          ? 'opacity-100 z-10 relative after:content-[""] after:absolute after:inset-0 after:ring-2 after:ring-inset after:ring-white/50'
                          : 'opacity-60 hover:opacity-100'
                          } ${isFirst ? 'rounded-l-md' : ''} ${isLast ? 'rounded-r-md' : ''}`}
                        style={{ backgroundColor: color.hex }}
                        title={`${color.name} (${count})`}
                      >
                        {count > 0 && (
                          <span className="text-sm font-bold text-white/90 drop-shadow-md">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Side: Actions */}
              <div className="flex items-center gap-2 shrink-0 ml-auto">
                {/* Bulk Tag */}
                <button
                  onClick={() => setBulkTagMode(!bulkTagMode)}
                  className={`p-1.5 rounded-md transition-all ${bulkTagMode
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-white/10'
                    }`}
                  title={bulkTagMode ? "Exit Bulk Tagging" : "Bulk Tag"}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                </button>

                {/* Add */}
                <button
                  onClick={() => setShowUploader(true)}
                  className="p-1.5 bg-sky-500 hover:bg-sky-400 text-white rounded-md transition-all shadow-lg hover:shadow-sky-500/25 border border-white/10"
                  title="Add Config"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

            </div>


          </div >

          <div className="px-8 pb-8">
            {/* Edit Playlist/Folder Modal */}
            <EditPlaylistModal
              isOpen={showEditModal}
              onClose={() => setShowEditModal(false)}
              onSave={handleUpdateMetadata}
              initialData={modalInitialData}
            />

            {loadingFolders ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 animate-pulse">
                {[...Array(12)].map((_, i) => (
                  <VideoCardSkeleton key={i} />
                ))}
              </div>
            ) : sortedVideos.length > 0 ? (
              <>
                {/* Sticky Carousel Section - Hide on Unsorted page */}
                {stickiedVideos.length > 0 && selectedFolder !== 'unsorted' && (
                  <StickyVideoCarousel>
                    {stickiedVideos.map((video, index) => {
                      const originalIndex = activePlaylistItems.findIndex(v => v.id === video.id);
                      return (
                        <VideoCard
                          key={video.id}
                          video={video}
                          index={index}
                          originalIndex={originalIndex}
                          isSelected={selectedVideoIndex === originalIndex}
                          isCurrentlyPlaying={currentVideoIndex === originalIndex}
                          videoFolders={videoFolderAssignments[video.id] || []}
                          selectedFolder={selectedFolder}
                          onVideoClick={() => handleVideoClick(video, index)}
                          onStarClick={(e) => handleStarClick(e, video)}
                          onStarColorLeftClick={handleStarColorLeftClick}
                          onStarColorRightClick={handleStarColorRightClick}
                          onMenuOptionClick={(option) => {
                            if (option.action === 'toggleSticky') {
                              handleToggleSticky(activePlaylistId, video.id);
                            } else {
                              handleMenuOptionClick(option, video);
                            }
                          }}
                          onQuickAssign={handleStarClick}
                          bulkTagMode={bulkTagMode}
                          bulkTagSelections={bulkTagSelections[video.id] || new Set()}
                          onBulkTagColorClick={(color) => handleBulkTagColorClick(video, color)}
                          onPinClick={() => { }} // Handled internally in VideoCard via store
                          isStickied={true} // It is stickied in this list
                          progress={(() => {
                            const videoId = extractVideoId(video.video_url) || video.video_id;
                            const data = videoProgress.get(videoId);
                            return data ? (typeof data === 'number' ? data : data.percentage) : 0;
                          })()}
                          isWatched={(() => {
                            const videoId = extractVideoId(video.video_url) || video.video_id;
                            return watchedVideoIds.has(videoId);
                          })()}
                        />
                      );
                    })}
                  </StickyVideoCarousel>
                )}

                {/* Regular Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 animate-fade-in">
                  {regularVideos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((video, index) => {
                    const originalIndex = activePlaylistItems.findIndex(v => v.id === video.id);
                    // Check stickied status for this specific folder context
                    const folderKey = selectedFolder === null ? 'root' : selectedFolder;
                    const key = `${activePlaylistId}::${folderKey}`;
                    const isContextStickied = (allStickiedVideos[key] || []).includes(video.id);

                    return (
                      <VideoCard
                        key={video.id}
                        video={video}
                        index={index}
                        originalIndex={originalIndex}
                        isSelected={selectedVideoIndex === originalIndex}
                        isCurrentlyPlaying={currentVideoIndex === originalIndex}
                        videoFolders={videoFolderAssignments[video.id] || []}
                        selectedFolder={selectedFolder}
                        onVideoClick={() => handleVideoClick(video, index)}
                        onStarClick={(e) => handleStarClick(e, video)}
                        onStarColorLeftClick={handleStarColorLeftClick}
                        onStarColorRightClick={handleStarColorRightClick}
                        onMenuOptionClick={(option) => {
                          if (option.action === 'toggleSticky') {
                            handleToggleSticky(activePlaylistId, video.id);
                          } else {
                            handleMenuOptionClick(option, video);
                          }
                        }}
                        onQuickAssign={handleStarClick}
                        bulkTagMode={bulkTagMode}
                        bulkTagSelections={bulkTagSelections[video.id] || new Set()}
                        onBulkTagColorClick={(color) => handleBulkTagColorClick(video, color)}
                        onPinClick={() => { }} // Handled internally in VideoCard via store
                        isStickied={isContextStickied}
                        progress={(() => {
                          const videoId = extractVideoId(video.video_url) || video.video_id;
                          const data = videoProgress.get(video.id) || videoProgress.get(extractVideoId(video.video_url));
                          return data ? (typeof data === 'number' ? data : data.percentage) : 0;
                        })()}
                        isWatched={(() => {
                          const videoId = extractVideoId(video.video_url) || video.video_id;
                          return watchedVideoIds.has(videoId);
                        })()}
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center text-slate-400 py-8">
                No videos found in this playlist.
              </div>
            )}

            {/* Pagination Controls - Based on Regular Videos only, since Stickies are always shown */}
            {regularVideos.length > itemsPerPage && (
              <div className="flex justify-center items-center gap-4 mt-8 mb-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors border border-slate-600 text-sky-400 hover:text-sky-300"
                >
                  Previous
                </button>

                <span className="text-slate-400 font-medium">
                  Page {currentPage} of {Math.ceil(regularVideos.length / itemsPerPage)}
                </span>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(regularVideos.length / itemsPerPage)))}
                  disabled={currentPage >= Math.ceil(regularVideos.length / itemsPerPage)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors border border-slate-600 text-sky-400 hover:text-sky-300"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div >
      )
      }

      {/* Playlist Selection Modal */}
      <PlaylistSelectionModal
        isOpen={showPlaylistSelector}
        onClose={() => {
          setShowPlaylistSelector(false);
          setSelectedVideoForAction(null);
          setActionType(null);
        }}
        onSelect={handlePlaylistSelect}
        title={actionType === 'move' ? 'Move to Playlist' : 'Copy to Playlist'}
      />
    </div >
  );
};

export default VideosPage;

