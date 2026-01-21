import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  List,
  Shuffle,
  Grid3X3,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Check,
  CheckCircle2,
  X,
  Settings2,
  Maximize2,
  Minimize2,
  Pin,
  Share2,
  Info,
  BarChart2,
  Bookmark,
  MoreHorizontal,
  Heart,
  ListMusic,
  Zap,
  Radio,
  Flame,
  Scissors,
  Search,
  Menu as MenuIcon,
  Youtube,
  Upload,
  Palette,
  Clock,
  History as HistoryIcon,
  Layout,
  Settings,
  Layers,
  Compass,
  Library,
  Eye,
  EyeOff,
  RotateCcw,
  ThumbsUp,
  Plus,
  Anchor as AnchorIcon,
  Type,
  MousePointer2,
  ArrowLeftRight,
  Circle,
  Move,
  LayoutGrid
} from 'lucide-react';
import { usePlaylistStore } from '../store/playlistStore';
import { useNavigationStore } from '../store/navigationStore';
import { usePinStore } from '../store/pinStore';
import { useLayoutStore } from '../store/layoutStore';
import { useFolderStore } from '../store/folderStore';
import { useTabStore } from '../store/tabStore';
import { useConfigStore } from '../store/configStore';
import { useTabPresetStore } from '../store/tabPresetStore';
import { useInspectLabel } from '../utils/inspectLabels';
import { getAllPlaylists, getPlaylistItems, getAllFoldersWithVideos, getVideosInFolder, getAllStuckFolders, assignVideoToFolder, unassignVideoFromFolder, getVideoFolderAssignments, createPlaylist, addVideoToPlaylist, removeVideoFromPlaylist, getFolderMetadata } from '../api/playlistApi';
import { getThumbnailUrl } from '../utils/youtubeUtils';
import { getFolderColorById, FOLDER_COLORS } from '../utils/folderColors';
import { THEMES } from '../utils/themes';
import AudioVisualizer from './AudioVisualizer';



// Use folder colors from the app's folder system
const COLORS = FOLDER_COLORS.map(color => ({ hex: color.hex, name: color.name, id: color.id }));

// TAB_GROUPS removed - now using dynamic tabs and presets from stores

export default function PlayerController({ onPlaylistSelect, onVideoSelect, activePlayer = 1, onActivePlayerChange, secondPlayerVideoUrl = null, secondPlayerVideoIndex = 0, onSecondPlayerVideoIndexChange, secondPlayerPlaylistId = null, secondPlayerPlaylistItems = [], currentThemeId = 'blue', onThemeChange }) {
  const fileInputRef = useRef(null);
  const playButtonRightClickRef = useRef(0); // Track right clicks for double-click detection
  const pinLongPressTimerRef = useRef(null); // Track long press for pin button
  const hoverTimerRef = useRef(null);

  // Store hooks
  const {
    allPlaylists,
    currentPlaylistIndex,
    currentPlaylistItems,
    currentPlaylistId,
    navigationItems,
    currentNavigationIndex,
    currentFolder,
    setAllPlaylists,
    buildNavigationItems,
    setNavigationItems,
    setPlaylistItems,
    setCurrentFolder,
    nextVideo,
    previousVideo,
    nextPlaylist,
    previousPlaylist,
    shufflePlaylist,
    setCurrentVideoIndex,
    getCurrentVideo,
    previewPlaylistItems: storePreviewItems,
    previewPlaylistId: storePreviewPlaylistId,
    previewFolderInfo: storePreviewFolderInfo,
    clearPreview,
    currentPlaylistTitle,
  } = usePlaylistStore();

  const { setCurrentPage } = useNavigationStore();
  const { pinnedVideos, togglePriorityPin, removePin, isPriorityPin, isPinned, togglePin } = usePinStore();
  const { viewMode, setViewMode, inspectMode, toggleMenuQuarterMode, menuQuarterMode, showDebugBounds, toggleDebugBounds, toggleInspectMode, showRuler, toggleRuler, showDevToolbar, toggleDevToolbar } = useLayoutStore();
  const { showColoredFolders } = useFolderStore();
  const { tabs, activeTabId, setActiveTab } = useTabStore();
  const { presets, activePresetId, setActivePreset } = useTabPresetStore();

  // Ensure tabs and presets are arrays
  const safeTabs = Array.isArray(tabs) ? tabs : [];
  const safePresets = Array.isArray(presets) ? presets : [];

  // Helper to get inspect label
  const getInspectTitle = (label) => inspectMode ? label : undefined;

  // Load all playlists and folders on mount and when showColoredFolders changes
  // Initial load of playlists
  useEffect(() => {
    const initPlaylists = async () => {
      try {
        const playlists = await getAllPlaylists();
        setAllPlaylists(playlists || []);
      } catch (error) {
        console.error('Failed to init playlists:', error);
      }
    };
    initPlaylists();
  }, [setAllPlaylists]);

  // Build navigation items when state changes
  useEffect(() => {
    const buildNav = async () => {
      try {
        let playlists = allPlaylists;

        console.log('[DEBUG_EXT] Building Navigation Items. Sources:', {
          allPlaylistsCount: allPlaylists?.length,
          activeTabId: activeTabId,
          showColoredFolders: showColoredFolders
        });

        // Filter playlists based on active tab
        if (activeTabId !== 'all') {
          const activeTab = tabs.find(t => t.id === activeTabId);
          if (activeTab && Array.isArray(playlists)) {
            const allowedIds = new Set(activeTab.playlistIds);
            playlists = playlists.filter(p => allowedIds.has(p.id));
            console.log('[DEBUG_EXT] Filtered by Tab:', {
              tabName: activeTab.name,
              filteredCount: playlists.length
            });
          }
        }

        // Load folders: stuck folders always, plus all folders if toggle is on
        const foldersToInclude = [];

        // Always include stuck folders
        try {
          const stuckFolders = await getAllStuckFolders();
          const stuckSet = new Set(stuckFolders.map(([playlistId, folderColor]) => `${playlistId}:${folderColor}`));

          // Get all folders to find stuck ones
          const allFoldersData = await getAllFoldersWithVideos();

          allFoldersData.forEach(folder => {
            const folderKey = `${folder.playlist_id}:${folder.folder_color}`;
            if (stuckSet.has(folderKey)) {
              // Only include stuck folder if its playlist is visible (filtered)
              if (playlists.find(p => p.id === folder.playlist_id)) {
                foldersToInclude.push(folder);
              }
            }
          });
        } catch (error) {
          console.error('Failed to load stuck folders:', error);
        }

        // If showColoredFolders is on, include all folders (but avoid duplicates)
        if (showColoredFolders) {
          try {
            const allFoldersData = await getAllFoldersWithVideos();
            const existingKeys = new Set(foldersToInclude.map(f => `${f.playlist_id}:${f.folder_color}`));

            allFoldersData.forEach(folder => {
              const folderKey = `${folder.playlist_id}:${folder.folder_color}`;
              // Only include folder if its playlist is visible (filtered)
              const parentVisible = playlists.find(p => p.id === folder.playlist_id);

              if (parentVisible && !existingKeys.has(folderKey)) {
                foldersToInclude.push(folder);
              }
            });
          } catch (error) {
            console.error('Failed to load all folders:', error);
          }
        }

        // Build hierarchical navigation: playlists with their folders interleaved
        const navItems = buildNavigationItems(playlists || [], foldersToInclude);
        console.log('[DEBUG_EXT] Final Navigation Items:', {
          count: navItems.length,
          firstFive: navItems.slice(0, 5).map(i => i.type === 'playlist' ? i.data.name : `Folder: ${i.data.folder_color}`),
          lastItem: navItems.length > 0 ? (navItems[navItems.length - 1].type === 'playlist' ? navItems[navItems.length - 1].data.name : 'Folder') : 'None'
        });
        setNavigationItems(navItems);
      } catch (error) {
        console.error('Failed to build navigation items:', error);
      }
    };
    buildNav();
  }, [allPlaylists, buildNavigationItems, setNavigationItems, showColoredFolders, activeTabId, tabs]);


  // --- UI State ---
  const [showPins, setShowPins] = useState(true);
  const [previewPinIndex, setPreviewPinIndex] = useState(null);
  const [previewTabImage, setPreviewTabImage] = useState(null);
  const [activePin, setActivePin] = useState(null);
  const [activeLeftPin, setActiveLeftPin] = useState(null); // Will be set based on active mode
  const [activeHeaderMode, setActiveHeaderMode] = useState('info'); // Start with playlist title 
  const [isModeLeft, setIsModeLeft] = useState(true);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false); // Tooltip popup state
  const [showPreviewMenus, setShowPreviewMenus] = useState(true); // Default to true based on user request "toggle visibility... with [options]" implies options are main focus, but need to hide/show something? Actually request says "toggle visibility OF the top right menu" - ok so we need a state for the menu itself?
  // Wait, the request is: "add an option to toggle visibility of the top right menu with 'full, half, quarter, menu q, debug, inspect, ruler, menu' buttons"
  // This likely means: INSIDE the existing 3-dot menu (More options), adding these toggles.
  // OR it means adding a button to toggle a NEW menu that contains these?
  // Reference @atlas/advanced-player-controller.md implies the 3-dot menu is the place for "More options".
  // So I will populate the EXISTING 3-dot menu `isMoreMenuOpen` with these new items. 




  // Sync internal mode with external activePlayer prop
  React.useEffect(() => {
    if (onActivePlayerChange) {
      setIsModeLeft(activePlayer === 1);
    }
  }, [activePlayer, onActivePlayerChange]);

  // Handle mode toggle - update external state
  const handleModeToggle = () => {
    const newMode = !isModeLeft;
    setIsModeLeft(newMode);
    if (onActivePlayerChange) {
      onActivePlayerChange(newMode ? 1 : 2);
    }
  };

  const [playlistCheckpoint, setPlaylistCheckpoint] = useState(null);
  const [videoCheckpoint, setVideoCheckpoint] = useState(null);
  // Preview states - track what we're previewing without actually changing the player
  const [previewNavigationIndex, setPreviewNavigationIndex] = useState(null);
  const [previewVideoIndex, setPreviewVideoIndex] = useState(null);
  const [previewPlaylistId, setPreviewPlaylistId] = useState(null);
  const [previewFolderInfo, setPreviewFolderInfo] = useState(null);
  const [previewPlaylistItems, setPreviewPlaylistItems] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(null);
  const [hoveredColorName, setHoveredColorName] = useState(null);
  const [starColor, setStarColor] = useState('#0ea5e9');

  const [currentVideoFolders, setCurrentVideoFolders] = useState([]); // Current video's folder assignments
  const [currentVideoFolderNames, setCurrentVideoFolderNames] = useState({}); // Map of folderId -> customName
  const [shuffleColor, setShuffleColor] = useState('#6366f1');

  const [likeColor, setLikeColor] = useState('#0ea5e9');
  const [likesPlaylistId, setLikesPlaylistId] = useState(null); // ID of the special "Likes" playlist
  const [isVideoLiked, setIsVideoLiked] = useState(false); // Whether current video is liked
  const [isEditMode, setIsEditMode] = useState(false);
  const [isConfigOnRight, setIsConfigOnRight] = useState(false);

  const [isAdjustingImage, setIsAdjustingImage] = useState(false);
  const [isVisualizerEnabled, setIsVisualizerEnabled] = useState(false);



  // Load visualizer enabled state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('visualizerEnabled');
      if (saved !== null) {
        setIsVisualizerEnabled(saved === 'true');
      }
    } catch (error) {
      console.error('Failed to load visualizer state from localStorage:', error);
    }
  }, []);

  // Save visualizer enabled state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('visualizerEnabled', isVisualizerEnabled.toString());
    } catch (error) {
      console.error('Failed to save visualizer state to localStorage:', error);
    }
  }, [isVisualizerEnabled]);







  // Initialize active pin based on current mode
  useEffect(() => {
    if (activeHeaderMode === 'tabs' && safeTabs.length > 0 && (activeLeftPin === null || !safeTabs.find(t => t.id === activeLeftPin))) {
      setActiveLeftPin(activeTabId || safeTabs[0].id);
    } else if (activeHeaderMode === 'presets' && safePresets.length > 0 && (activeLeftPin === null || !safePresets.find(p => p.id === activeLeftPin))) {
      setActiveLeftPin(activePresetId || safePresets[0].id);
    }
  }, [activeHeaderMode, safeTabs, safePresets, activeTabId, activePresetId, activeLeftPin]);

  // Debug: Log tabs and presets
  useEffect(() => {
    console.log('PlayerController - Tabs:', safeTabs);
    console.log('PlayerController - Presets:', safePresets);
    console.log('PlayerController - Active Header Mode:', activeHeaderMode);
    console.log('PlayerController - Tabs length:', safeTabs.length);
    console.log('PlayerController - Presets length:', safePresets.length);
  }, [safeTabs, safePresets, activeHeaderMode]);

  // Get current playlist/folder info (use preview if in preview mode)
  const displayNavIndex = previewNavigationIndex !== null ? previewNavigationIndex : currentNavigationIndex;
  const currentNavItem = displayNavIndex >= 0 && navigationItems[displayNavIndex]
    ? navigationItems[displayNavIndex]
    : null;

  const currentPlaylist = currentNavItem && currentNavItem.type === 'playlist'
    ? currentNavItem.data
    : (currentPlaylistId ? allPlaylists.find(p => p.id === currentPlaylistId) : null);

  // Get current video first
  const currentVideo = getCurrentVideo();

  // Load current video's folder assignments - use active video (main or second player)
  useEffect(() => {
    const loadVideoFolders = async () => {
      // Use activeVideoItem which is computed above, but we need to wait for it to be set
      // So we'll compute it here again or use a ref. For now, compute inline.
      const hasSecondPlayerVideo = !isModeLeft && secondPlayerVideoUrl;
      let targetVideo = currentVideo;
      let targetPlaylistId = currentPlaylistId;

      if (hasSecondPlayerVideo) {
        // Mode is 2 (second player) - use second player's video and playlist
        if (secondPlayerPlaylistItems.length > 0 && secondPlayerVideoIndex >= 0 && secondPlayerVideoIndex < secondPlayerPlaylistItems.length) {
          const videoByIndex = secondPlayerPlaylistItems[secondPlayerVideoIndex];
          if (videoByIndex && videoByIndex.video_url === secondPlayerVideoUrl) {
            targetVideo = videoByIndex;
            targetPlaylistId = secondPlayerPlaylistId || currentPlaylistId;
          } else {
            const secondPlayerVideo = secondPlayerPlaylistItems.find(item => item.video_url === secondPlayerVideoUrl);
            if (secondPlayerVideo) {
              targetVideo = secondPlayerVideo;
              targetPlaylistId = secondPlayerPlaylistId || currentPlaylistId;
            }
          }
        } else {
          // Try to find in current playlist as fallback
          const fallbackVideo = currentPlaylistItems.find(item => item.video_url === secondPlayerVideoUrl);
          if (fallbackVideo) {
            targetVideo = fallbackVideo;
            // Keep currentPlaylistId for fallback
          }
        }
      }

      if (targetVideo && targetPlaylistId && targetVideo.id) {
        try {
          const folders = await getVideoFolderAssignments(targetPlaylistId, targetVideo.id);
          const safeFolders = folders || [];
          setCurrentVideoFolders(safeFolders);

          // Fetch custom names for these folders
          const namesMap = {};
          await Promise.all(safeFolders.map(async (folderId) => {
            try {
              const metadata = await getFolderMetadata(targetPlaylistId, folderId);
              if (metadata && metadata[0]) {
                namesMap[folderId] = metadata[0];
              }
            } catch (err) {
              // Ignore errors, will fall back to default color name
            }
          }));
          setCurrentVideoFolderNames(namesMap);
        } catch (error) {
          console.error('Failed to load video folder assignments:', error);
          setCurrentVideoFolders([]);
          setCurrentVideoFolderNames({});
        }
      } else {
        setCurrentVideoFolders([]);
        setCurrentVideoFolderNames({});
      }
    };
    loadVideoFolders();
  }, [currentVideo, currentPlaylistId, isModeLeft, secondPlayerVideoUrl, secondPlayerPlaylistItems, secondPlayerVideoIndex, secondPlayerPlaylistId, currentPlaylistItems]);

  // Initialize or get "Likes" playlist
  useEffect(() => {
    const initLikesPlaylist = async () => {
      try {
        const playlists = await getAllPlaylists();
        let likesPlaylist = playlists.find(p => p.name === 'Likes');

        if (!likesPlaylist) {
          // Create "Likes" playlist if it doesn't exist
          const newPlaylistId = await createPlaylist('Likes', 'Videos you have liked');
          setLikesPlaylistId(newPlaylistId);
        } else {
          setLikesPlaylistId(likesPlaylist.id);
        }
      } catch (error) {
        console.error('Failed to initialize Likes playlist:', error);
      }
    };
    initLikesPlaylist();
  }, []);

  // Check if current video is liked - use active video (main or second player)
  useEffect(() => {
    const checkIfLiked = async () => {
      // Use activeVideoItem which is computed above, but we need to wait for it to be set
      // So we'll compute it here again or use a ref. For now, compute inline.
      const hasSecondPlayerVideo = !isModeLeft && secondPlayerVideoUrl;
      let targetVideo = currentVideo;

      if (hasSecondPlayerVideo) {
        // Mode is 2 (second player) - use second player's video
        if (secondPlayerPlaylistItems.length > 0 && secondPlayerVideoIndex >= 0 && secondPlayerVideoIndex < secondPlayerPlaylistItems.length) {
          const videoByIndex = secondPlayerPlaylistItems[secondPlayerVideoIndex];
          if (videoByIndex && videoByIndex.video_url === secondPlayerVideoUrl) {
            targetVideo = videoByIndex;
          } else {
            const secondPlayerVideo = secondPlayerPlaylistItems.find(item => item.video_url === secondPlayerVideoUrl);
            if (secondPlayerVideo) {
              targetVideo = secondPlayerVideo;
            }
          }
        } else {
          // Try to find in current playlist as fallback
          const fallbackVideo = currentPlaylistItems.find(item => item.video_url === secondPlayerVideoUrl);
          if (fallbackVideo) {
            targetVideo = fallbackVideo;
          }
        }
      }

      if (!targetVideo || !likesPlaylistId) {
        setIsVideoLiked(false);
        return;
      }

      try {
        const likesItems = await getPlaylistItems(likesPlaylistId);
        const isLiked = likesItems.some(item => item.video_id === targetVideo.video_id);
        setIsVideoLiked(isLiked);
      } catch (error) {
        console.error('Failed to check if video is liked:', error);
        setIsVideoLiked(false);
      }
    };
    checkIfLiked();
  }, [currentVideo, likesPlaylistId, isModeLeft, secondPlayerVideoUrl, secondPlayerPlaylistItems, secondPlayerVideoIndex, currentPlaylistItems]);

  // Use store preview if available, otherwise use local preview, otherwise current video
  const activePreviewItems = storePreviewItems || previewPlaylistItems;
  const activePreviewPlaylistId = storePreviewPlaylistId || previewPlaylistId;
  const activePreviewFolderInfo = storePreviewFolderInfo || previewFolderInfo;

  // Determine which video to display based on active player mode
  // If mode is 2 (second player), use second player's video, otherwise use main player's video
  // Use second player info if we have a video URL (even if playlist items aren't loaded yet)
  const hasSecondPlayerVideo = !isModeLeft && secondPlayerVideoUrl;
  // Use second player's playlist items if available, otherwise fall back to current playlist items
  const secondPlayerItems = (hasSecondPlayerVideo && secondPlayerPlaylistItems.length > 0)
    ? secondPlayerPlaylistItems
    : currentPlaylistItems;

  // Determine active playlist ID - use second player's playlist when in mode 2
  const activePlaylistId = hasSecondPlayerVideo && secondPlayerPlaylistId
    ? secondPlayerPlaylistId
    : currentPlaylistId;

  let activeVideoItem = currentVideo;
  if (hasSecondPlayerVideo) {
    // Mode is 2 (second player) - prioritize using second player's playlist if available
    if (secondPlayerPlaylistItems.length > 0 && secondPlayerVideoIndex >= 0 && secondPlayerVideoIndex < secondPlayerPlaylistItems.length) {
      // Use index from second player's playlist
      const videoByIndex = secondPlayerPlaylistItems[secondPlayerVideoIndex];
      // Verify it matches the URL (in case playlist changed)
      if (videoByIndex && videoByIndex.video_url === secondPlayerVideoUrl) {
        activeVideoItem = videoByIndex;
      } else {
        // Index doesn't match URL, find by URL in second player's playlist
        const secondPlayerVideo = secondPlayerPlaylistItems.find(item => item.video_url === secondPlayerVideoUrl);
        if (secondPlayerVideo) {
          activeVideoItem = secondPlayerVideo;
        } else {
          // Not found in second player's playlist, try current playlist as fallback
          const fallbackVideo = currentPlaylistItems.find(item => item.video_url === secondPlayerVideoUrl);
          if (fallbackVideo) {
            activeVideoItem = fallbackVideo;
          }
        }
      }
    } else {
      // No second player playlist items yet, try to find in current playlist
      const secondPlayerVideo = currentPlaylistItems.find(item => item.video_url === secondPlayerVideoUrl);
      if (secondPlayerVideo) {
        activeVideoItem = secondPlayerVideo;
      }
    }
  }

  // Use preview video if in preview mode, otherwise use active video (main or second player)
  // Determine which playlist items to use based on active player mode
  const activePlaylistItems = (hasSecondPlayerVideo && secondPlayerPlaylistItems.length > 0)
    ? secondPlayerPlaylistItems
    : currentPlaylistItems;

  let displayVideoIndex;
  if (previewVideoIndex !== null) {
    displayVideoIndex = previewVideoIndex;
  } else if (hasSecondPlayerVideo && secondPlayerPlaylistItems.length > 0 && secondPlayerVideoIndex >= 0 && secondPlayerVideoIndex < secondPlayerPlaylistItems.length) {
    // In second player mode with playlist loaded, use the second player's index directly
    displayVideoIndex = secondPlayerVideoIndex;
  } else if (activeVideoItem) {
    // Find index of active video in the appropriate playlist
    const foundIndex = activePlaylistItems.findIndex(v => v.id === activeVideoItem.id);
    displayVideoIndex = foundIndex >= 0 ? foundIndex : 0;
  } else {
    displayVideoIndex = 0;
  }

  // Determine displayVideoItem - prioritize second player index when in mode 2 with playlist loaded
  let displayVideoItem;
  if (previewVideoIndex !== null && currentPlaylistItems.length > 0) {
    displayVideoItem = currentPlaylistItems[displayVideoIndex];
  } else if (hasSecondPlayerVideo && secondPlayerPlaylistItems.length > 0 && secondPlayerVideoIndex >= 0 && secondPlayerVideoIndex < secondPlayerPlaylistItems.length) {
    // In second player mode with playlist loaded, use the video at the second player's index from second player's playlist
    displayVideoItem = secondPlayerPlaylistItems[secondPlayerVideoIndex];
  } else {
    // Use activeVideoItem (main player or fallback)
    displayVideoItem = activeVideoItem;
  }

  // Get playlist image - use active video thumbnail (main or second player) instead of playlist thumbnail
  const playlistImage = activeVideoItem?.thumbnail_url
    ? activeVideoItem.thumbnail_url
    : (displayVideoItem?.thumbnail_url
      ? displayVideoItem.thumbnail_url
      : 'https://picsum.photos/seed/playlist/800/600');

  // Get playlist/folder title (show preview if in preview mode)
  // If store preview is active, show preview playlist name
  // In second player mode, show second player's playlist name
  // --- Handlers ---
  const handleNextVideo = () => {
    // Route to appropriate player based on active mode
    if (isModeLeft) {
      // Control main player (player 1)
      nextVideo();
      const state = usePlaylistStore.getState();
      const video = state.getCurrentVideo();
      if (video && onVideoSelect) {
        onVideoSelect(video.video_url);
      }
    } else {
      // Control second player (player 2) - navigate within second player's playlist without affecting main player
      // Only navigate if there's actually a second player video loaded
      if (secondPlayerVideoUrl && secondPlayerPlaylistItems.length > 0 && onSecondPlayerVideoIndexChange) {
        const nextIndex = (secondPlayerVideoIndex + 1) % secondPlayerPlaylistItems.length;
        onSecondPlayerVideoIndexChange(nextIndex);
        const nextVideo = secondPlayerPlaylistItems[nextIndex];
        if (nextVideo && onVideoSelect) {
          onVideoSelect(nextVideo.video_url); // This will route to second player via handleVideoSelect in App.jsx
        }
      }
    }
  };

  const handlePrevVideo = () => {
    // Route to appropriate player based on active mode
    if (isModeLeft) {
      // Control main player (player 1)
      previousVideo();
      const state = usePlaylistStore.getState();
      const video = state.getCurrentVideo();
      if (video && onVideoSelect) {
        onVideoSelect(video.video_url);
      }
    } else {
      // Control second player (player 2) - navigate within second player's playlist without affecting main player
      // Only navigate if there's actually a second player video loaded
      if (secondPlayerVideoUrl && secondPlayerPlaylistItems.length > 0 && onSecondPlayerVideoIndexChange) {
        const prevIndex = secondPlayerVideoIndex <= 0
          ? secondPlayerPlaylistItems.length - 1
          : secondPlayerVideoIndex - 1;
        onSecondPlayerVideoIndexChange(prevIndex);
        const prevVideo = secondPlayerPlaylistItems[prevIndex];
        if (prevVideo && onVideoSelect) {
          onVideoSelect(prevVideo.video_url); // This will route to second player via handleVideoSelect in App.jsx
        }
      }
    }
  };

  // Handle playlist navigation
  const handleNextPlaylist = async () => {
    const result = nextPlaylist();
    if (!result) return;

    if (result.type === 'playlist') {
      const playlist = result.data;
      if (!playlist) return;

      try {
        const items = await getPlaylistItems(playlist.id);
        // Use playlist name from navigation item to ensure title consistency
        setPlaylistItems(items, playlist.id, null, playlist.name);
        if (onPlaylistSelect) {
          onPlaylistSelect(items, playlist.id);
        }
        if (items.length > 0 && onVideoSelect) {
          const lastIndex = localStorage.getItem(`last_video_index_${playlist.id}`);
          const videoIndex = lastIndex && parseInt(lastIndex, 10) < items.length
            ? parseInt(lastIndex, 10)
            : 0;
          onVideoSelect(items[videoIndex].video_url);
        }
      } catch (error) {
        console.error('Failed to load playlist items:', error);
      }
    } else if (result.type === 'folder') {
      const folder = result.data;
      if (!folder) return;

      try {
        const items = await getVideosInFolder(folder.playlist_id, folder.folder_color);
        if (items.length === 0) {
          console.warn(`Folder ${folder.folder_color} in playlist ${folder.playlist_id} has no videos`);
          return;
        }
        setPlaylistItems(items, folder.playlist_id, { playlist_id: folder.playlist_id, folder_color: folder.folder_color });
        if (onPlaylistSelect) {
          onPlaylistSelect(items, folder.playlist_id);
        }
        const folderKey = `last_video_index_${folder.playlist_id}_${folder.folder_color}`;
        const lastIndex = localStorage.getItem(folderKey);
        const videoIndex = lastIndex && parseInt(lastIndex, 10) < items.length
          ? parseInt(lastIndex, 10)
          : 0;
        if (onVideoSelect && items[videoIndex]) {
          onVideoSelect(items[videoIndex].video_url);
        }
      } catch (error) {
        console.error('Failed to load folder items:', error);
      }
    }
  };

  const handlePreviousPlaylist = async () => {
    const result = previousPlaylist();
    if (!result) return;

    if (result.type === 'playlist') {
      const playlist = result.data;
      if (!playlist) return;

      try {
        const items = await getPlaylistItems(playlist.id);
        // Use playlist name from navigation item to ensure title consistency
        setPlaylistItems(items, playlist.id, null, playlist.name);
        if (onPlaylistSelect) {
          onPlaylistSelect(items, playlist.id);
        }
        if (items.length > 0 && onVideoSelect) {
          const lastIndex = localStorage.getItem(`last_video_index_${playlist.id}`);
          const videoIndex = lastIndex && parseInt(lastIndex, 10) < items.length
            ? parseInt(lastIndex, 10)
            : 0;
          onVideoSelect(items[videoIndex].video_url);
        }
      } catch (error) {
        console.error('Failed to load playlist items:', error);
      }
    } else if (result.type === 'folder') {
      const folder = result.data;
      if (!folder) return;

      try {
        const items = await getVideosInFolder(folder.playlist_id, folder.folder_color);
        if (items.length === 0) {
          console.warn(`Folder ${folder.folder_color} in playlist ${folder.playlist_id} has no videos`);
          return;
        }
        setPlaylistItems(items, folder.playlist_id, { playlist_id: folder.playlist_id, folder_color: folder.folder_color });
        if (onPlaylistSelect) {
          onPlaylistSelect(items, folder.playlist_id);
        }
        const folderKey = `last_video_index_${folder.playlist_id}_${folder.folder_color}`;
        const lastIndex = localStorage.getItem(folderKey);
        const videoIndex = lastIndex && parseInt(lastIndex, 10) < items.length
          ? parseInt(lastIndex, 10)
          : 0;
        if (onVideoSelect && items[videoIndex]) {
          onVideoSelect(items[videoIndex].video_url);
        }
      } catch (error) {
        console.error('Failed to load folder items:', error);
      }
    }
  };

  // Handle shuffle - shuffle from specific folder or all videos
  const handleShuffle = async (folderColorId = null) => {
    const colorToUse = folderColorId || quickShuffleColor;

    try {
      let videosToShuffle = [];
      let playlistIdToUse;

      if (isModeLeft) {
        // Control main player (player 1) - use current playlist
        playlistIdToUse = currentPlaylistId;
        if (colorToUse === 'all') {
          videosToShuffle = currentPlaylistItems;
        } else if (currentPlaylistId) {
          videosToShuffle = await getVideosInFolder(currentPlaylistId, colorToUse);
        }
      } else {
        // Control second player (player 2) - use second player's playlist
        playlistIdToUse = secondPlayerPlaylistId || currentPlaylistId;
        const secondPlayerItems = secondPlayerPlaylistItems.length > 0 ? secondPlayerPlaylistItems : currentPlaylistItems;
        if (colorToUse === 'all') {
          videosToShuffle = secondPlayerItems;
        } else if (playlistIdToUse) {
          videosToShuffle = await getVideosInFolder(playlistIdToUse, colorToUse);
        }
      }

      if (videosToShuffle.length === 0) {
        console.warn('No videos found to shuffle');
        return;
      }

      // Pick a random video
      const randomIndex = Math.floor(Math.random() * videosToShuffle.length);
      const randomVideo = videosToShuffle[randomIndex];

      if (randomVideo && onVideoSelect) {
        if (isModeLeft) {
          // Control main player (player 1)
          const videoIndex = currentPlaylistItems.findIndex(v => v.id === randomVideo.id);
          if (videoIndex >= 0) {
            setCurrentVideoIndex(videoIndex);
          }
          onVideoSelect(randomVideo.video_url);
        } else {
          // Control second player (player 2) - shuffle within second player's playlist
          // Only shuffle if there's actually a second player video loaded
          if (secondPlayerVideoUrl && secondPlayerPlaylistItems.length > 0) {
            const videoIndex = secondPlayerPlaylistItems.findIndex(v => v.id === randomVideo.id);
            if (videoIndex >= 0 && onSecondPlayerVideoIndexChange) {
              onSecondPlayerVideoIndexChange(videoIndex);
            }
            onVideoSelect(randomVideo.video_url); // This will route to second player via handleVideoSelect in App.jsx
          }
        }
      }
    } catch (error) {
      console.error('Failed to shuffle video:', error);
    }
  };

  // Handle shuffling to a random playlist
  const handleShufflePlaylist = async () => {
    try {
      if (allPlaylists.length === 0) {
        console.warn('No playlists available to shuffle');
        return;
      }

      // Pick random playlist
      const randomPlaylistIndex = Math.floor(Math.random() * allPlaylists.length);
      const randomPlaylist = allPlaylists[randomPlaylistIndex];

      // Load items
      const items = await getPlaylistItems(randomPlaylist.id);

      if (items.length === 0) {
        console.warn('Selected random playlist is empty');
        return;
      }

      // Set playlist items (this changes the current playlist)
      setPlaylistItems(items, randomPlaylist.id, null);
      if (onPlaylistSelect) {
        onPlaylistSelect(items, randomPlaylist.id);
      }

      // Pick random video within playlist to start
      const randomVideoIndex = Math.floor(Math.random() * items.length);
      const randomVideo = items[randomVideoIndex];

      if (randomVideo && onVideoSelect) {
        setCurrentVideoIndex(randomVideoIndex);
        onVideoSelect(randomVideo.video_url);
      }

    } catch (error) {
      console.error('Failed to shuffle to random playlist:', error);
    }
  };

  // Handle grid navigation
  const handlePlaylistsGrid = () => {
    setCurrentPage('playlists');
    if (viewMode === 'full') {
      setViewMode('half');
    }
  };

  const handleVideosGrid = () => {
    // Clear any preview state to ensure we show the currently playing playlist
    if (storePreviewPlaylistId) {
      clearPreview();
    }

    // Also clear local preview if active
    if (playlistCheckpoint !== null) {
      setPreviewNavigationIndex(null);
      setPreviewPlaylistItems(null);
      setPreviewPlaylistId(null);
      setPreviewFolderInfo(null);
      setPlaylistCheckpoint(null);
    }

    if (currentPlaylistId) {
      setCurrentPage('videos');
      if (viewMode === 'full') {
        setViewMode('half');
      }
    }
  };

  // Handle history toggle
  const handleHistoryToggle = () => {
    setCurrentPage('history');
    if (viewMode === 'full') {
      setViewMode('half');
    }
  };

  // Handle pin click - switch to that video
  const handlePinClick = async (pinnedVideo) => {
    const videoIndex = currentPlaylistItems.findIndex(v => v.id === pinnedVideo.id);

    if (videoIndex >= 0) {
      setCurrentVideoIndex(videoIndex);
      if (onVideoSelect) {
        onVideoSelect(pinnedVideo.video_url);
      }
    } else {
      // Video is not in current playlist - need to load its playlist
      try {
        for (const playlist of allPlaylists) {
          const items = await getPlaylistItems(playlist.id);
          const foundIndex = items.findIndex(v => v.id === pinnedVideo.id);
          if (foundIndex >= 0) {
            setPlaylistItems(items, playlist.id);
            if (onPlaylistSelect) {
              onPlaylistSelect(items, playlist.id);
            }
            setCurrentVideoIndex(foundIndex);
            if (onVideoSelect) {
              onVideoSelect(pinnedVideo.video_url);
            }
            return;
          }
        }
        console.warn('Pinned video not found in any playlist:', pinnedVideo);
      } catch (error) {
        console.error('Failed to load playlist for pinned video:', error);
      }
    }
  };

  // Handle unpin - remove pin from track
  const handleUnpin = (e, pinnedVideo) => {
    e.stopPropagation();
    removePin(pinnedVideo.id);
  };

  const navigateTabs = (dir) => {
    if (activeHeaderMode === 'tabs') {
      // Navigate through tabs
      const currentIndex = safeTabs.findIndex(tab => tab.id === activeLeftPin);
      if (currentIndex === -1) {
        // If current pin not found, start with first tab
        if (safeTabs.length > 0) {
          setActiveLeftPin(safeTabs[0].id);
          setActiveTab(safeTabs[0].id);
        }
        return;
      }
      const nextIndex = dir === 'next'
        ? (currentIndex + 1) % safeTabs.length
        : (currentIndex - 1 + safeTabs.length) % safeTabs.length;
      if (safeTabs[nextIndex]) {
        setActiveLeftPin(safeTabs[nextIndex].id);
        setActiveTab(safeTabs[nextIndex].id);
      }
    } else if (activeHeaderMode === 'presets') {
      // Navigate through presets
      const currentIndex = safePresets.findIndex(preset => preset.id === activeLeftPin);
      if (currentIndex === -1) {
        // If current pin not found, start with first preset
        if (safePresets.length > 0) {
          setActiveLeftPin(safePresets[0].id);
          setActivePreset(safePresets[0].id);
        }
        return;
      }
      const nextIndex = dir === 'next'
        ? (currentIndex + 1) % safePresets.length
        : (currentIndex - 1 + safePresets.length) % safePresets.length;
      if (safePresets[nextIndex]) {
        setActiveLeftPin(safePresets[nextIndex].id);
        setActivePreset(safePresets[nextIndex].id);
      }
    }
  };

  // Direct playlist navigation (for capsule buttons - immediate navigation, not preview)
  const navigatePlaylist = (dir) => {
    if (dir === 'up') {
      handleNextPlaylist();
    } else if (dir === 'down') {
      handlePreviousPlaylist();
    }
  };

  // Preview navigation - doesn't change actual player until confirmed
  const handleAltNav = async (direction, type) => {
    if (type === 'playlist') {
      // Initialize checkpoint if starting preview
      if (playlistCheckpoint === null) {
        setPlaylistCheckpoint(currentNavigationIndex);
        setPreviewNavigationIndex(currentNavigationIndex >= 0 ? currentNavigationIndex : 0);
      }

      // Calculate next/prev navigation index (preview only)
      const currentPreviewIndex = previewNavigationIndex !== null ? previewNavigationIndex : (currentNavigationIndex >= 0 ? currentNavigationIndex : 0);
      const nextIndex = direction === 'up'
        ? (navigationItems.length === 0 ? 0 : (currentPreviewIndex + 1) % navigationItems.length)
        : (navigationItems.length === 0 ? 0 : (currentPreviewIndex <= 0 ? navigationItems.length - 1 : currentPreviewIndex - 1));

      setPreviewNavigationIndex(nextIndex);

      // Load preview playlist/folder data (but don't change actual player)
      const previewItem = navigationItems[nextIndex];
      if (!previewItem) return;

      if (previewItem.type === 'playlist') {
        try {
          const items = await getPlaylistItems(previewItem.data.id);
          setPreviewPlaylistItems(items);
          setPreviewPlaylistId(previewItem.data.id);
          setPreviewFolderInfo(null);
        } catch (error) {
          console.error('Failed to load preview playlist items:', error);
        }
      } else if (previewItem.type === 'folder') {
        try {
          const items = await getVideosInFolder(previewItem.data.playlist_id, previewItem.data.folder_color);
          setPreviewPlaylistItems(items);
          setPreviewPlaylistId(previewItem.data.playlist_id);
          setPreviewFolderInfo({ playlist_id: previewItem.data.playlist_id, folder_color: previewItem.data.folder_color });
        } catch (error) {
          console.error('Failed to load preview folder items:', error);
        }
      }
    } else {
      // Video preview navigation
      if (videoCheckpoint === null) {
        const currentIdx = currentPlaylistItems.findIndex(v => v.id === currentVideo?.id);
        setVideoCheckpoint(currentIdx >= 0 ? currentIdx : 0);
        setPreviewVideoIndex(currentIdx >= 0 ? currentIdx : 0);
      }

      const currentPreviewIdx = previewVideoIndex !== null ? previewVideoIndex : (currentPlaylistItems.findIndex(v => v.id === currentVideo?.id) || 0);
      const nextIdx = direction === 'up'
        ? (currentPreviewIdx + 1) % currentPlaylistItems.length
        : (currentPreviewIdx === 0 ? currentPlaylistItems.length - 1 : currentPreviewIdx - 1);

      setPreviewVideoIndex(nextIdx);
    }
  };

  const handleRevert = (type) => {
    if (type === 'playlist' && playlistCheckpoint !== null) {
      // Revert to original navigation index
      setPreviewNavigationIndex(null);
      setPreviewPlaylistItems(null);
      setPreviewPlaylistId(null);
      setPreviewFolderInfo(null);
      setPlaylistCheckpoint(null);
      // Also clear store preview if it exists
      clearPreview();
    } else if (type === 'video' && videoCheckpoint !== null) {
      // Revert to original video index
      setPreviewVideoIndex(null);
      setVideoCheckpoint(null);
    }
  };

  const handleCommit = async (type) => {
    if (type === 'playlist' && playlistCheckpoint !== null && previewNavigationIndex !== null) {
      // Actually navigate to the previewed playlist/folder
      const previewItem = navigationItems[previewNavigationIndex];
      if (!previewItem) {
        handleRevert('playlist');
        return;
      }

      if (previewItem.type === 'playlist') {
        if (previewPlaylistItems && previewPlaylistId) {
          setPlaylistItems(previewPlaylistItems, previewPlaylistId, null);
          if (onPlaylistSelect) {
            onPlaylistSelect(previewPlaylistItems, previewPlaylistId);
          }
          if (previewPlaylistItems.length > 0 && onVideoSelect) {
            const lastIndex = localStorage.getItem(`last_video_index_${previewPlaylistId}`);
            const videoIndex = lastIndex && parseInt(lastIndex, 10) < previewPlaylistItems.length
              ? parseInt(lastIndex, 10)
              : 0;
            onVideoSelect(previewPlaylistItems[videoIndex].video_url);
          }
        }
      } else if (previewItem.type === 'folder') {
        if (previewPlaylistItems && previewFolderInfo) {
          setPlaylistItems(previewPlaylistItems, previewFolderInfo.playlist_id, previewFolderInfo);
          if (onPlaylistSelect) {
            onPlaylistSelect(previewPlaylistItems, previewFolderInfo.playlist_id);
          }
          if (previewPlaylistItems.length > 0 && onVideoSelect) {
            const folderKey = `last_video_index_${previewFolderInfo.playlist_id}_${previewFolderInfo.folder_color}`;
            const lastIndex = localStorage.getItem(folderKey);
            const videoIndex = lastIndex && parseInt(lastIndex, 10) < previewPlaylistItems.length
              ? parseInt(lastIndex, 10)
              : 0;
            if (previewPlaylistItems[videoIndex]) {
              onVideoSelect(previewPlaylistItems[videoIndex].video_url);
            }
          }
        }
      }

      // Update navigation index in store to match preview
      if (previewNavigationIndex >= 0) {
        const previewItem = navigationItems[previewNavigationIndex];
        if (previewItem) {
          if (previewItem.type === 'playlist') {
            const playlistIndex = allPlaylists.findIndex(p => p.id === previewItem.data.id);
            if (playlistIndex >= 0) {
              usePlaylistStore.setState({
                currentNavigationIndex: previewNavigationIndex,
                currentPlaylistIndex: playlistIndex,
                currentFolder: null
              });
            }
          } else {
            usePlaylistStore.setState({
              currentNavigationIndex: previewNavigationIndex,
              currentPlaylistIndex: -1,
              currentFolder: {
                playlist_id: previewItem.data.playlist_id,
                folder_color: previewItem.data.folder_color
              }
            });
          }
        }
      }

      // Clear preview state
      setPreviewNavigationIndex(null);
      setPreviewPlaylistItems(null);
      setPreviewPlaylistId(null);
      setPreviewFolderInfo(null);
      setPlaylistCheckpoint(null);
    } else if (type === 'video' && videoCheckpoint !== null && previewVideoIndex !== null) {
      // Actually navigate to the previewed video
      if (previewVideoIndex >= 0 && previewVideoIndex < currentPlaylistItems.length) {
        setCurrentVideoIndex(previewVideoIndex);
        const video = currentPlaylistItems[previewVideoIndex];
        if (video && onVideoSelect) {
          onVideoSelect(video.video_url);
        }
      }

      // Clear preview state
      setPreviewVideoIndex(null);
      setVideoCheckpoint(null);
    }
  };

  const handleToggleHeader = () => {
    setActiveHeaderMode(curr => {
      if (curr === 'primary') return 'secondary';
      if (curr === 'secondary') return 'info';
      return 'primary';
    });
  };

  // Handle star button click - assign/unassign video to folder
  const handleStarClick = async (folderColorId = null) => {
    // Get the active video (main or second player) - use activeVideoItem which is computed above
    const targetVideo = activeVideoItem || currentVideo;
    // Use activePlaylistId which is computed above
    const targetPlaylistId = activePlaylistId || currentPlaylistId;

    if (!targetVideo || !targetPlaylistId) return;

    const colorToUse = folderColorId || quickAssignColor;

    try {
      // Get current folder assignments for the target video
      const videoFolders = await getVideoFolderAssignments(targetPlaylistId, targetVideo.id);
      const isAssigned = videoFolders.includes(colorToUse);

      if (isAssigned) {
        // Unassign from folder
        await unassignVideoFromFolder(targetPlaylistId, targetVideo.id, colorToUse);
        // Update local state if this is the current video being displayed
        if (targetVideo.id === activeVideoItem?.id) {
          setCurrentVideoFolders(prev => prev.filter(c => c !== colorToUse));
        }
      } else {
        // Assign to folder
        await assignVideoToFolder(targetPlaylistId, targetVideo.id, colorToUse);
        // Update local state if this is the current video being displayed
        if (targetVideo.id === activeVideoItem?.id) {
          setCurrentVideoFolders(prev => [...prev, colorToUse]);
        }
      }

      // Close color picker if open
      if (showColorPicker === 'star') {
        setShowColorPicker(null);
        setHoveredColorName(null);
      }
    } catch (error) {
      console.error('Failed to assign/unassign video to folder:', error);
    }
  };

  // Handle first pin button click - set current video as first (leftmost) pin
  // Handle Pin Button Interactions
  const handlePinMouseDown = () => {
    const targetVideo = activeVideoItem || currentVideo;
    if (!targetVideo) return;

    // Start long press timer (e.g., 500ms)
    pinLongPressTimerRef.current = setTimeout(() => {
      // Long Press Action: Set Priority Pin
      // Ensure we don't toggle it OFF if it's already ON
      if (!isPriorityPin(targetVideo.id)) {
        togglePriorityPin(targetVideo);
      }
      pinLongPressTimerRef.current = null; // Mark as handled
    }, 600);
  };

  const handlePinMouseUp = () => {
    const targetVideo = activeVideoItem || currentVideo;
    if (!targetVideo) return;

    if (pinLongPressTimerRef.current) {
      // Timer still running -> Short Click -> Toggle Normal Pin
      clearTimeout(pinLongPressTimerRef.current);
      pinLongPressTimerRef.current = null;

      // We only toggle normal pin here. If it's already a priority pin, maybe we want to unpin it or convert to normal?
      // Logic: if pinned (any type), unpin. If not pinned, pin normal.
      // But user said: "single click makes it normal pin".

      // Let's rely on standard toggle behavior, but ensure it sets to normal pin if adding.
      // togglePin handles adding as normal pin.

      // Special case: If it is currently a Priority Pin, should short click make it a normal pin?
      // User request: "single click makes it normal pin". 
      // If it's priority, togglePin(targetVideo) might remove "pin" status or add duplicate?
      // usePinStore.togglePin adds if not present, removes if present.
      // If it is priority pin, it IS pinned. So togglePin would remove it. 
      // This seems correct: click -> toggles pin status.

      // Wait, "single click makes it normal pin" implies if unpinned -> normal pin.
      // If already pinned (normal) -> togglePin removes it.
      // If already pinned (priority) -> togglePin removes it?

      // Let's stick to togglePin for short click.
      togglePin(targetVideo);
    }
  };

  const handlePinMouseLeave = () => {
    // If mouse leaves button while holding, cancel long press
    if (pinLongPressTimerRef.current) {
      clearTimeout(pinLongPressTimerRef.current);
      pinLongPressTimerRef.current = null;
    }
  };


  // Handle play button toggle - cycle through colored folders
  const handlePlayButtonToggle = async (direction = 'forward') => {
    if (!currentPlaylistId) return;

    try {
      // Fetch fresh folder data
      const allFolders = await getAllFoldersWithVideos();
      // Filter for current playlist and ensure count > 0
      // Note: getAllFoldersWithVideos returns objects like { playlist_id, folder_color, video_count }
      const playlistFolders = allFolders.filter(f => String(f.playlist_id) === String(currentPlaylistId) && f.video_count > 0);

      // Current State
      const currentColor = currentFolder ? currentFolder.folder_color : 'all';

      // Sort playlistFolders by FOLDER_COLORS order
      const validColors = FOLDER_COLORS
        .map(c => c.id)
        .filter(id => playlistFolders.some(f => f.folder_color === id));

      // Determine next color
      let nextColor = 'all';

      if (direction === 'reset') {
        nextColor = 'all';
      } else if (direction === 'forward') {
        if (currentColor === 'all') {
          if (validColors.length > 0) nextColor = validColors[0];
        } else {
          const idx = validColors.indexOf(currentColor);
          if (idx !== -1 && idx < validColors.length - 1) {
            nextColor = validColors[idx + 1];
          } else {
            nextColor = 'all';
          }
        }
      } else {
        // Reverse cycle
        if (currentColor === 'all') {
          if (validColors.length > 0) nextColor = validColors[validColors.length - 1];
        } else {
          const idx = validColors.indexOf(currentColor);
          if (idx > 0) {
            nextColor = validColors[idx - 1];
          } else {
            nextColor = 'all';
          }
        }
      }

      // Execute Transition
      let newItems = [];
      if (nextColor === 'all') {
        newItems = await getPlaylistItems(currentPlaylistId);
        setPlaylistItems(newItems, currentPlaylistId, null);
      } else {
        newItems = await getVideosInFolder(currentPlaylistId, nextColor);
        setPlaylistItems(newItems, currentPlaylistId, { playlist_id: currentPlaylistId, folder_color: nextColor });
      }

      // Handle auto-play logic if current video is lost
      if (newItems.length > 0) {
        const currentVideoStillExists = newItems.some(v => v.id === activeVideoItem?.id);
        if (!currentVideoStillExists) {
          // Play first video in new view
          setCurrentVideoIndex(0);
        }
      }

    } catch (error) {
      console.error('Failed to cycle play button folder:', error);
    }
  };

  // Handle like button click - add/remove video from Likes playlist
  const handleLikeClick = async () => {
    // Get the active video (main or second player) - use activeVideoItem which is computed above
    const targetVideo = activeVideoItem || currentVideo;

    if (!targetVideo || !likesPlaylistId) return;

    try {
      // Check if target video is liked
      const likesItems = await getPlaylistItems(likesPlaylistId);
      const targetIsLiked = likesItems.some(item => item.video_id === targetVideo.video_id);

      if (targetIsLiked) {
        // Remove from Likes playlist
        const likeItem = likesItems.find(item => item.video_id === targetVideo.video_id);
        if (likeItem) {
          await removeVideoFromPlaylist(likesPlaylistId, likeItem.id);
          // Update local state if this is the current video being displayed
          if (targetVideo.id === activeVideoItem?.id) {
            setIsVideoLiked(false);
          }
        }
      } else {
        // Add to Likes playlist
        await addVideoToPlaylist(
          likesPlaylistId,
          targetVideo.video_url,
          targetVideo.video_id,
          targetVideo.title || null,
          targetVideo.thumbnail_url || null
        );
        // Update local state if this is the current video being displayed
        if (targetVideo.id === activeVideoItem?.id) {
          setIsVideoLiked(true);
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleColorSelect = (hex, colorId, isRightClick = false) => {
    if (showColorPicker === 'star') {
      if (isRightClick) {
        // Right click: set quick assign default
        setQuickAssignColor(colorId);
        setShowColorPicker(null);
        setHoveredColorName(null);
      } else {
        // Left click: assign video to folder
        handleStarClick(colorId);
      }
    } else if (showColorPicker === 'shuffle') {
      if (isRightClick) {
        // Right click: set quick shuffle default
        setQuickShuffleColor(colorId);
        setShowColorPicker(null);
        setHoveredColorName(null);
      } else {
        // Left click: shuffle from that folder
        handleShuffle(colorId);
      }
    } else {
      if (showColorPicker === 'like') setLikeColor(hex);
      setShowColorPicker(null);
      setHoveredColorName(null);
    }
  };

  const handleOrbImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomOrbImage(reader.result);
        setIsAdjustingImage(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageDataUrl = reader.result;
        setCustomBannerImage(imageDataUrl);
        // Persist to localStorage
        try {
          localStorage.setItem('customBannerImage', imageDataUrl);
        } catch (error) {
          console.error('Failed to save custom banner image to localStorage:', error);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const startPreviewTimer = (callback) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(callback, 2000);
  };

  const clearPreviewTimer = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setPreviewPinIndex(null);
    setPreviewTabImage(null);
  };

  const clearPreviewTabImage = () => {
    clearPreviewTimer();
  };

  // --- Visual Layout States ---
  const [textContainerY, setTextContainerY] = useState(5);
  const [textContainerHeight, setTextContainerHeight] = useState(54);
  const [metadataYOffset, setMetadataYOffset] = useState(1);
  const [leftAltNavX, setLeftAltNavX] = useState(10);
  const [rightAltNavX, setRightAltNavX] = useState(-10);
  // --- Config Store ---
  const {
    pinFirstButtonX, pinFirstButtonSize, likeButtonX, menuButtonX, tooltipButtonX,
    pinAnchorX, pinAnchorY, plusButtonX, plusButtonY, pinToggleY,
    dotMenuWidth, dotMenuHeight, dotMenuY, dotSize,
    playlistCapsuleX, playlistCapsuleY, playlistCapsuleWidth, playlistCapsuleHeight,
    playlistHandleSize, playlistPlayIconSize, playlistChevronIconSize,
    playlistChevronLeftX, playlistChevronRightX, playlistPlayCircleX,
    modeHandleSize, modeHandleInternalSize,
    orbImageScale, orbImageScaleW, orbImageScaleH, orbImageXOffset, orbImageYOffset,
    orbSize, menuWidth, menuHeight, bottomBarHeight,
    titleFontSize, metadataFontSize,
    pinSize, pinWidth, pinHeight, bottomIconSize, navChevronSize,
    orbMenuGap, setOrbMenuGap, orbButtonSpread,
    // New
    playlistToggleX, playlistTabsX, playlistInfoX, playlistInfoWidth,
    videoChevronLeftX, videoChevronRightX, videoPlayButtonX,
    modeSwitcherX, shuffleButtonX, gridButtonX, starButtonX,
    setCustomBannerImage,
    // Orb State (From Config Store now)
    customOrbImage, setCustomOrbImage,
    isSpillEnabled, setIsSpillEnabled,
    orbSpill, setOrbSpill,
    // Quick Assign/Shuffle (From Config Store)
    quickAssignColor, setQuickAssignColor,
    quickShuffleColor, setQuickShuffleColor
  } = useConfigStore();



  // --- Derived Constants ---
  const theme = THEMES[currentThemeId] || THEMES.blue;
  const trackWidth = Math.max(0, plusButtonX - pinAnchorX);

  // Helper to format view count
  const formatViews = (count) => {
    if (!count) return '0';
    if (count >= 1000000000) return `${(count / 1000000000).toFixed(1)}B`;
    if (count >= 10000000) return `${(count / 1000000).toFixed(0)}M`;
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
    return count.toString();
  };

  const orbImageSrc = customOrbImage || playlistImage;

  // Get video display info (use preview if in preview mode)
  // Fallback to activeVideoItem if displayVideoItem is not set
  const finalDisplayVideoItem = displayVideoItem || activeVideoItem;
  let displayVideo;
  if (finalDisplayVideoItem) {
    displayVideo = {
      title: String(finalDisplayVideoItem.title || 'Untitled Video'),
      author: String(finalDisplayVideoItem.author || 'Unknown'),
      viewers: String(finalDisplayVideoItem.view_count ? formatViews(finalDisplayVideoItem.view_count) : '0 live'),
      publishedYear: finalDisplayVideoItem.published_at ? new Date(finalDisplayVideoItem.published_at).getFullYear() : null,
      verified: Boolean(false)
    };
  } else {
    displayVideo = {
      title: 'No Video',
      author: 'Unknown',
      viewers: '0',
      verified: false
    };
  }

  // Convert pinned videos to pin format expected by component
  const pins = pinnedVideos.map((video, idx) => ({
    id: `pin-${video.id}`,
    icon: Pin,
    video: video,
    index: idx
  }));

  const getOrbButtonStyle = (index) => {
    const totalButtons = 8; const centerIndex = 3.5; const relativeIndex = index - centerIndex; const angle = 90 + (relativeIndex * orbButtonSpread); const radius = 50; const rad = (angle * Math.PI) / 180; const x = 50 + radius * Math.cos(rad); const y = 50 + radius * Math.sin(rad);
    return { left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' };
  };

  // Note: toggleSpillQuadrant is now handled via SettingsPage and configStore


  const orbButtons = [
    { icon: Scissors, label: 'Editor', action: null },
    { icon: Search, label: 'Search', action: null },
    { icon: MenuIcon, label: 'Menu', action: () => setIsVisualizerEnabled(!isVisualizerEnabled) },
    { icon: Maximize2, label: 'Spill', action: () => setIsSpillEnabled(!isSpillEnabled) },
    { icon: Youtube, label: 'Channel', action: null },
    { icon: Settings, label: 'Config', action: () => setCurrentPage('settings') },
    { icon: Clock, label: 'History', action: handleHistoryToggle },
    { icon: isSpillEnabled ? Minimize2 : Circle, label: 'Clipping', action: () => setIsSpillEnabled(!isSpillEnabled) }
  ];

  // Get playlist/folder title (show preview if in preview mode)
  // Get playlist/folder title (show preview if in preview mode)
  let playlistTitle;

  // 1. Preview Mode - NO! User requested top menu NOT to update on preview.
  // We skip this block entirely and fall through to Second Player or Main Player.

  // 2. Second Player Mode (if appropriate)
  if (hasSecondPlayerVideo && secondPlayerPlaylistId) {
    const secondPlayerPlaylist = allPlaylists.find(p => p.id === secondPlayerPlaylistId);
    playlistTitle = secondPlayerPlaylist ? secondPlayerPlaylist.name : 'Unknown Playlist';
  }
  // 3. Main Player Playlist
  // 3. Main Player Playlist
  else if (currentPlaylistId) {
    const foundPlaylist = allPlaylists.find(p => String(p.id) === String(currentPlaylistId));
    if (foundPlaylist) {
      if (currentFolder && String(currentFolder.playlist_id) === String(currentPlaylistId)) {
        const folderInfo = getFolderColorById(currentFolder.folder_color);
        const folderName = folderInfo ? folderInfo.name : 'Folder';
        playlistTitle = `${foundPlaylist.name} - ${folderName}`;
      } else {
        playlistTitle = foundPlaylist.name;
      }
    } else {
      playlistTitle = currentPlaylistTitle || 'Unknown Playlist';
    }
  } else {
    playlistTitle = currentPlaylist ? currentPlaylist.name : 'No Playlist';
  }



  return (
    <div className="w-full pointer-events-none">
      <div className="max-w-5xl mx-auto py-4 px-6 pointer-events-auto">
        {/* SVG ClipPath Generator for Partial Spillover */}
        <svg width="0" height="0" className="absolute pointer-events-none">
          <defs>
            <clipPath id="orbClipPath" clipPathUnits="objectBoundingBox">
              <circle cx="0.5" cy="0.5" r="0.5" />
              {isSpillEnabled && orbSpill.tl && <rect x="-50" y="-50" width="50.5" height="50.5" />}
              {isSpillEnabled && orbSpill.tr && <rect x="0.5" y="-50" width="50.5" height="50.5" />}
              {isSpillEnabled && orbSpill.bl && <rect x="-50" y="0.5" width="50.5" height="50.5" />}
              {isSpillEnabled && orbSpill.br && <rect x="0.5" y="0.5" width="50.5" height="50.5" />}
            </clipPath>
          </defs>
        </svg>

        {/* Background removed to use App-level global background */}

        <div className="flex items-center relative overflow-visible">
          {/* Spacer to balance layout */}
          <div className="flex-1 flex items-center justify-end">
            {/* PLAYLIST SECTION */}
            <div className="flex items-center gap-4 relative z-10 flex-shrink-0">
              <div className="absolute right-full mr-4 transition-transform" style={{ transform: `translateX(${leftAltNavX}px)` }}>
                <div className="flex items-center gap-4 animate-in slide-in-from-right-2 duration-300">
                  <div className="flex flex-col gap-3 w-9 h-24 items-center justify-center">
                    {playlistCheckpoint !== null && (
                      <><button onClick={() => handleCommit('playlist')} className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-emerald-500 text-white active:scale-90" title={getInspectTitle('Commit playlist preview')}><Check size={20} strokeWidth={3} /></button><button onClick={() => handleRevert('playlist')} className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-rose-500 text-white active:scale-90" title={getInspectTitle('Revert playlist preview')}><X size={20} strokeWidth={3} /></button></>
                    )}
                  </div>
                  {/* Playlist Preview Navigation Menu */}
                  {showPreviewMenus && (
                    <div className={`w-8 ${theme.menuBg} border ${theme.menuBorder} rounded-lg shadow-sm flex flex-col justify-between items-center py-2 shrink-0 animate-in fade-in zoom-in-95 duration-200`} style={{ height: `${menuHeight}px` }}>
                      <button onClick={() => handleAltNav('up', 'playlist')} className="text-sky-400 p-1" title={getInspectTitle('Previous playlist in preview')}><ChevronUp size={18} strokeWidth={3} /></button>
                      <div className={`w-full h-px ${theme.bottomBar} my-1`} />
                      <button onClick={() => handleAltNav('down', 'playlist')} className="text-sky-400 p-1" title={getInspectTitle('Next playlist in preview')}><ChevronDown size={18} strokeWidth={3} /></button>
                    </div>
                  )}
                </div>
              </div>
              <div className={`border-4 shadow-2xl flex flex-col relative overflow-visible transition-all duration-300 group/playlist ${isEditMode ? 'ring-4 ring-sky-400/30' : theme.orbBorder + ' ' + theme.menuBg + ' backdrop-blur-2xl rounded-2xl overflow-hidden'}`} style={{ width: `${menuWidth}px`, height: `${menuHeight}px` }}>
                <div className="flex-grow flex flex-col items-center justify-center px-4 relative z-10 overflow-hidden w-full h-full">
                  <h1
                    className="font-black text-sky-950 text-center leading-tight line-clamp-3 tracking-tight transition-all pb-1 cursor-pointer hover:text-sky-700"
                    style={{ fontSize: `${titleFontSize}px` }}
                    onClick={handlePlaylistsGrid}
                    title={playlistTitle}
                  >
                    {playlistTitle}
                  </h1>

                  {/* Video Folder Badge */}
                  {currentVideoFolders.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mb-0.5 animate-in fade-in zoom-in duration-300">
                      {currentVideoFolders.map(folderId => {
                        const folderColor = FOLDER_COLORS.find(c => c.id === folderId);
                        if (!folderColor) return null;
                        const customName = currentVideoFolderNames[folderId];
                        return (
                          <span
                            key={folderId}
                            className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full border shadow-sm backdrop-blur-sm"
                            style={{
                              color: folderColor.hex,
                              borderColor: folderColor.hex,
                              backgroundColor: `${folderColor.hex}15`
                            }}
                          >
                            {customName || folderColor.name}
                          </span>
                        );
                      })}
                    </div>
                  )}

                </div>

                {/* Priority Pin (Top Right) */}
                {(() => {
                  const priorityPinData = pins.find(pin => isPriorityPin(pin.video.id));
                  if (!priorityPinData) return null;
                  const thumbnailUrl = getThumbnailUrl(priorityPinData.video.video_id, 'default');
                  return (
                    <div className="absolute top-1 right-1 pointer-events-auto group/pin z-40">
                      <button
                        onClick={() => handlePinClick(priorityPinData.video)}
                        className={`rounded-lg flex items-center justify-center transition-all shadow-md overflow-hidden ${activePin === priorityPinData.id ? 'ring-2 ring-sky-400' : ''}`}
                        style={{ width: '52px', height: '39px', border: '2px solid #334155' }}
                        title={`Priority Pin: ${priorityPinData.video.title || 'Untitled Video'}`}
                      >
                        {thumbnailUrl ? (
                          <img src={thumbnailUrl} alt={priorityPinData.video.title} className="w-full h-full object-cover" />
                        ) : (
                          <Pin size={24} fill="#fbbf24" strokeWidth={2} />
                        )}
                      </button>
                      <button
                        className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/pin:opacity-100 transition-opacity shadow-sm border border-white z-20"
                        onClick={(e) => handleUnpin(e, priorityPinData.video)}
                        title="Unpin video"
                      >
                        <X size={10} strokeWidth={4} />
                      </button>
                    </div>
                  );
                })()}

                <div className={`border-t flex items-center px-3 shrink-0 relative rounded-b-2xl ${theme.bottomBar}`} style={{ height: `${bottomBarHeight}px` }}>
                  <div className="w-full h-full relative">
                    {/* Left Side: Video Metadata */}
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 ${theme.accent} font-bold uppercase tracking-widest opacity-80`} style={{ fontSize: `${metadataFontSize}px`, maxWidth: '210px' }}>
                      <span className="truncate">{displayVideo.author}</span>
                      {displayVideo.verified && <CheckCircle2 size={metadataFontSize} className="fill-current shrink-0" />}
                      <span className="mx-1 opacity-50 shrink-0">|</span>
                      <span className="shrink-0">{displayVideo.viewers}</span>
                      {displayVideo.publishedYear && (
                        <>
                          <span className="mx-1 opacity-50 shrink-0">|</span>
                          <span className="shrink-0">{displayVideo.publishedYear}</span>
                        </>
                      )}
                    </div>

                    {/* Right Components: Action & Navigation Buttons */}
                    {/* Right Components: Navigation Buttons (Tab Button moved to Video Menu, Shuffle Removed) */}

                    {/* Navigation Contols (Right Cluster - "Far Right") */}
                    {/* Previous Playlist - Left of Grid */}
                    <button
                      onClick={() => navigatePlaylist('down')}
                      className="absolute left-1/2 top-1/2 p-0.5 text-sky-400"
                      style={{ transform: `translate(calc(-50% + 92px), -50%)` }}
                      title={getInspectTitle('Previous playlist')}
                    >
                      <ChevronLeft size={navChevronSize} strokeWidth={3} />
                    </button>

                    {/* Grid Button - Center of Cluster */}
                    <button
                      onClick={handlePlaylistsGrid}
                      className="absolute left-1/2 top-1/2 flex items-center justify-center group/tool"
                      style={{ transform: `translate(calc(-50% + 120px), -50%)` }}
                      title={getInspectTitle('View playlists grid')}
                    >
                      <div className="rounded-full flex items-center justify-center border-2 shadow-sm bg-white" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, borderColor: '#334155' }}>
                        <Library size={Math.round(bottomIconSize * 0.5)} className="text-slate-600" strokeWidth={3} />
                      </div>
                    </button>

                    {/* Next Playlist - Right of Grid */}
                    <button
                      onClick={() => navigatePlaylist('up')}
                      className="absolute left-1/2 top-1/2 p-0.5 text-sky-400"
                      style={{ transform: `translate(calc(-50% + 148px), -50%)` }}
                      title={getInspectTitle('Next playlist')}
                    >
                      <ChevronRight size={navChevronSize} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                <div className="flex-grow relative z-10" />
              </div>
            </div>
          </div>

          {/* THE ORB SECTION - Centered */}
          <div className="flex items-center justify-center relative group z-30 flex-shrink-0" style={{ marginLeft: `${orbMenuGap}px`, marginRight: `${orbMenuGap}px` }}>
            {/* Audio Visualizer - Around Orb */}
            {/* Audio Visualizer - Around Orb */}
            <AudioVisualizer
              enabled={isVisualizerEnabled}
              orbSize={orbSize}
              barCount={113}
              barWidth={4}
              radius={77}
              radiusY={77}
              maxBarLength={76}
              minBarLength={7}
              colors={[255, 255, 255, 255]}
              smoothing={0.75}
              preAmpGain={4.0}
              angleTotal={Math.PI * 2}
              angleStart={-Math.PI / 2}
              clockwise={true}
              inward={false}
              fftSize={2048}
              freqMin={60}
              freqMax={11000}
              sensitivity={64}
              updateRate={16}
            />
            <div
              className={`rounded-full bg-sky-50 backdrop-blur-3xl shadow-2xl flex items-center justify-center transition-all relative overflow-visible z-20`}
              style={{ width: `${orbSize}px`, height: `${orbSize}px` }}
            >
              {/* IMAGE LAYER */}
              <div className="absolute inset-0 pointer-events-none transition-all duration-500 flex items-center justify-center z-40" style={{ clipPath: 'url(#orbClipPath)', overflow: 'visible' }}>
                <img
                  src={orbImageSrc}
                  alt=""
                  className="max-w-none transition-all duration-500"
                  style={{
                    width: isSpillEnabled ? `${orbSize * orbImageScale * orbImageScaleW}px` : '100%',
                    height: isSpillEnabled ? `${orbSize * orbImageScale * orbImageScaleH}px` : '100%',
                    transform: isSpillEnabled ? `translate(${orbImageXOffset}px, ${orbImageYOffset}px)` : 'none',
                    objectFit: isSpillEnabled ? 'contain' : 'cover'
                  }}
                />
              </div>

              {/* Adjuster Border Guide */}
              {/* GLASS INTERLAY */}
              <div className="absolute inset-0 z-10 overflow-hidden rounded-full pointer-events-none"><div className="absolute inset-0 bg-sky-200/10" /></div>
              <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-transparent opacity-60 z-10 pointer-events-none rounded-full" />

              <input type="file" ref={fileInputRef} onChange={handleOrbImageUpload} accept="image/*" className="hidden" />
              <button className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center bg-white shadow-xl hover:scale-110 active:scale-95 group/btn z-50 border-2 border-sky-100 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ width: `28px`, height: `28px` }} onClick={() => fileInputRef.current.click()} title={getInspectTitle('Upload orb image')}><Upload size={16} className={theme.accent} strokeWidth={3} /></button>

              {orbButtons.map((btn, i) => {
                const BtnIcon = btn.icon;
                return (
                  <button key={i} onClick={btn.action || (() => { })} className="absolute rounded-full flex items-center justify-center bg-white shadow-xl hover:scale-110 active:scale-95 group/btn z-50 border-2 border-sky-50 opacity-0 group-hover:opacity-100 transition-all duration-300" style={{ ...getOrbButtonStyle(i), width: `28px`, height: `28px` }} title={getInspectTitle(btn.label) || btn.label}>
                    <BtnIcon size={14} className="text-slate-800" strokeWidth={2.5} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* VIDEO SECTION */}
          <div className="flex-1 flex items-center justify-start">
            <div className="flex items-center gap-4 relative z-10 flex-shrink-0">
              <div className={`border-4 shadow-2xl flex flex-col relative overflow-visible transition-all duration-300 ${isEditMode ? 'ring-4 ring-sky-400/30' : theme.orbBorder + ' ' + theme.menuBg + ' backdrop-blur-2xl rounded-2xl'}`} style={{ width: `${menuWidth}px`, height: `${menuHeight}px` }}>
                {showColorPicker && (<button onClick={() => { setShowColorPicker(null); setHoveredColorName(null); }} className="absolute -top-3 -right-3 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center hover:bg-rose-600 z-50 shadow-lg border-2 border-white transition-all active:scale-90" title={getInspectTitle('Close color picker')}><X size={16} strokeWidth={3} /></button>)}
                <div className="absolute top-0 left-0 w-full flex items-center -translate-y-1/2 z-40 px-2 pointer-events-none h-0">
                  {/* Normal pins track removed per user request */}
                </div>
                {/* Header Metadata - Centered above (Mirrors Playlist Title) */}
                {/* Header Metadata - Removed from here, moved to Playlist Menu */}

                <div className="flex-grow flex flex-col items-center justify-center px-4 relative z-10 overflow-hidden">
                  {showColorPicker ? (
                    <div className="flex flex-col items-center animate-in zoom-in duration-200" style={{ transform: `translateY(${dotMenuY}px)` }}>
                      <p className="text-[9px] font-black uppercase text-sky-600 tracking-[0.2em] mb-3">Accent: {showColorPicker}</p>
                      <div className="grid grid-cols-7 gap-1.5 p-2.5 bg-white/60 backdrop-blur-md rounded-2xl border border-sky-200 shadow-inner overflow-hidden flex items-center justify-center" style={{ width: `${dotMenuWidth}px`, height: `${dotMenuHeight}px` }}>
                        {/* Add "All" option for shuffle */}
                        {showColorPicker === 'shuffle' && (
                          <div
                            onMouseEnter={() => setHoveredColorName('All')}
                            onMouseLeave={() => setHoveredColorName(null)}
                            className="rounded-full cursor-pointer border-2 border-white shadow-sm hover:scale-125 transition-transform shrink-0 relative"
                            style={{
                              backgroundColor: '#ffffff',
                              width: `${dotSize}px`,
                              height: `${dotSize}px`,
                              borderColor: quickShuffleColor === 'all' ? '#000' : 'white',
                              borderWidth: quickShuffleColor === 'all' ? '3px' : '2px'
                            }}
                            onClick={() => handleColorSelect('#ffffff', 'all', false)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleColorSelect('#ffffff', 'all', true);
                            }}
                            title={quickShuffleColor === 'all' ? 'All (Quick Shuffle - Right click to change)' : 'All (Right click to set as Quick Shuffle)'}
                          />
                        )}
                        {COLORS.map((c) => (
                          <div
                            key={c.hex}
                            onMouseEnter={() => setHoveredColorName(c.name)}
                            onMouseLeave={() => setHoveredColorName(null)}
                            className="rounded-full cursor-pointer border-2 border-white shadow-sm hover:scale-125 transition-transform shrink-0 relative"
                            style={{
                              backgroundColor: c.hex,
                              width: `${dotSize}px`,
                              height: `${dotSize}px`,
                              borderColor: showColorPicker === 'star'
                                ? (c.id === quickAssignColor ? '#000' : 'white')
                                : (showColorPicker === 'shuffle'
                                  ? (c.id === quickShuffleColor ? '#000' : 'white')
                                  : 'white'),
                              borderWidth: showColorPicker === 'star'
                                ? (c.id === quickAssignColor ? '3px' : '2px')
                                : (showColorPicker === 'shuffle'
                                  ? (c.id === quickShuffleColor ? '3px' : '2px')
                                  : '2px')
                            }}
                            onClick={() => handleColorSelect(c.hex, c.id, false)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              handleColorSelect(c.hex, c.id, true);
                            }}
                            title={
                              showColorPicker === 'star'
                                ? (c.id === quickAssignColor ? `${c.name} (Quick Assign - Right click to change)` : `${c.name} (Right click to set as Quick Assign)`)
                                : (showColorPicker === 'shuffle'
                                  ? (c.id === quickShuffleColor ? `${c.name} (Quick Shuffle - Right click to change)` : `${c.name} (Right click to set as Quick Shuffle)`)
                                  : c.name)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col justify-center transition-all relative h-full">
                      <h1 className="font-black text-sky-950 text-center leading-tight line-clamp-3 tracking-tight transition-all pb-1" style={{ fontSize: `${titleFontSize}px` }}>{displayVideo.title}</h1>
                    </div>
                  )}
                </div>
                <div className={`border-t flex items-center px-3 shrink-0 relative rounded-b-2xl ${theme.bottomBar}`} style={{ height: `${bottomBarHeight}px` }}>
                  {showColorPicker ? (<div className="flex items-center justify-center w-full h-full animate-in fade-in slide-in-from-bottom-1 duration-300"><span className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-700/80">{hoveredColorName || `Select ${showColorPicker} color`}</span></div>) : (
                    <div className="w-full h-full relative">
                      {/* Navigation Controls - Now Absolute Centered */}
                      {/* Navigation Contols (Left Cluster - "Far Left") - Mirrored from Playlist */}
                      {/* Previous Video - Left of Grid */}
                      <button
                        onClick={handlePrevVideo}
                        className="absolute left-1/2 top-1/2 p-0.5 text-sky-400"
                        style={{ transform: `translate(calc(-50% - 148px), -50%)` }}
                        title={getInspectTitle('Previous video')}
                      >
                        <ChevronLeft size={navChevronSize} strokeWidth={3} />
                      </button>

                      {/* Video Grid Button - Center of Cluster */}
                      <button
                        onClick={handleVideosGrid}
                        className="absolute left-1/2 top-1/2 flex items-center justify-center group/tool"
                        style={{ transform: `translate(calc(-50% - 120px), -50%)` }}
                        title={getInspectTitle('View videos grid')}
                      >
                        <div className="rounded-full flex items-center justify-center border-2 shadow-sm bg-white" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, borderColor: '#334155' }}>
                          <svg
                            width={Math.round(bottomIconSize * 0.55)}
                            height={Math.round(bottomIconSize * 0.55)}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-slate-600"
                          >
                            <path d="M2 8 Q 7 3 12 8 T 22 8" />
                            <path d="M2 18 Q 7 13 12 18 T 22 18" />
                            <path d="M7 5.5 V 15.5" />
                            <path d="M12 8 V 18" />
                            <path d="M17 10.5 V 20.5" />
                          </svg>
                        </div>
                      </button>

                      {/* Next Video - Right of Grid */}
                      <button
                        onClick={handleNextVideo}
                        className="absolute left-1/2 top-1/2 p-0.5 text-sky-400"
                        style={{ transform: `translate(calc(-50% - 92px), -50%)` }}
                        title={getInspectTitle('Next video')}
                      >
                        <ChevronRight size={navChevronSize} strokeWidth={3} />
                      </button>

                      <button
                        onClick={() => handlePlayButtonToggle('forward')}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          const now = Date.now();
                          if (now - playButtonRightClickRef.current < 300) {
                            // Double right click detected -> Reset to all
                            handlePlayButtonToggle('reset');
                          } else {
                            // Single right click -> Reverse cycle
                            handlePlayButtonToggle('reverse');
                          }
                          playButtonRightClickRef.current = now;
                        }}
                        className="absolute left-1/2 top-1/2 flex items-center justify-center group/tool"
                        style={{ transform: `translate(calc(-50% - 60px), -50%)` }}
                        title={getInspectTitle('Cycle Folder Filter (Left: Forward, Right: Reverse)')}
                      >
                        {(() => {
                          const activeColorData = currentFolder ? FOLDER_COLORS.find(c => c.id === currentFolder.folder_color) : null;
                          const activeColorHex = activeColorData ? activeColorData.hex : '#cbd5e1';
                          const isColored = !!activeColorData;

                          return (
                            <div className="rounded-full flex items-center justify-center border-2 shadow-sm transition-colors duration-300 bg-white"
                              style={{
                                width: `${bottomIconSize}px`,
                                height: `${bottomIconSize}px`,
                                borderColor: isColored ? activeColorHex : '#334155'
                              }}>
                              <Play size={Math.round(bottomIconSize * 0.5)}
                                color={isColored ? activeColorHex : '#475569'}
                                fill={isColored ? activeColorHex : '#475569'}
                                strokeWidth={0}
                              />
                            </div>
                          );
                        })()}
                      </button>

                      {/* Tool Buttons - Absolute Centered */}
                      <button
                        onClick={() => handleShuffle()}
                        onContextMenu={(e) => { e.preventDefault(); setShowColorPicker('shuffle'); }}
                        className="absolute left-1/2 top-1/2 flex items-center justify-center group/tool"
                        style={{ transform: `translate(calc(-50% + ${shuffleButtonX}px), -50%)` }}
                        title={getInspectTitle('Shuffle videos')}
                      >
                        {(() => {
                          const shuffleColorObj = quickShuffleColor === 'all'
                            ? { hex: '#334155', name: 'All' }
                            : (FOLDER_COLORS.find(c => c.id === quickShuffleColor) || FOLDER_COLORS.find(c => c.id === 'indigo'));
                          return (
                            <div className="rounded-full flex items-center justify-center border-2 border-sky-200 shadow-sm bg-white" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, borderColor: shuffleColorObj.hex }}>
                              <Shuffle size={Math.round(bottomIconSize * 0.5)} color={shuffleColorObj.hex} strokeWidth={3} />
                            </div>
                          );
                        })()}
                      </button>

                      <button
                        onClick={() => handleStarClick()}
                        onContextMenu={(e) => { e.preventDefault(); setShowColorPicker('star'); }}
                        className="absolute left-1/2 top-1/2 flex items-center justify-center group/tool"
                        style={{ transform: `translate(calc(-50% + ${starButtonX}px), -50%)` }}
                        title={getInspectTitle('Star button (assign to folder)')}
                      >
                        {(() => {
                          const firstFolder = currentVideoFolders.length > 0 ? currentVideoFolders[0] : null;
                          const quickAssignColorObj = FOLDER_COLORS.find(c => c.id === quickAssignColor) || FOLDER_COLORS.find(c => c.id === 'sky');
                          const folderColorObj = firstFolder ? FOLDER_COLORS.find(c => c.id === firstFolder) : null;

                          if (folderColorObj) {
                            return (
                              <div className="rounded-full flex items-center justify-center border-2 shadow-sm bg-white" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, borderColor: folderColorObj.hex }}>
                                <Star size={Math.round(bottomIconSize * 0.5)} color={folderColorObj.hex} fill={folderColorObj.hex} strokeWidth={3} />
                              </div>
                            );
                          } else {
                            return (
                              <div className="rounded-full flex items-center justify-center border-2 shadow-sm bg-white" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, borderColor: '#334155' }}>
                                <Star size={Math.round(bottomIconSize * 0.5)} color="#475569" fill="transparent" strokeWidth={3} />
                              </div>
                            );
                          }
                        })()}
                      </button>

                      <button
                        onMouseDown={handlePinMouseDown}
                        onMouseUp={handlePinMouseUp}
                        onMouseLeave={handlePinMouseLeave}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (viewMode === 'full') setViewMode('half');
                          setCurrentPage('pins');
                        }}
                        className="absolute left-1/2 top-1/2 flex items-center justify-center group/tool"
                        style={{ transform: `translate(calc(-50% + ${pinFirstButtonX}px), -50%)` }}
                        title={getInspectTitle('Pin Video (Click: Normal Pin, Hold: Priority Pin, Right-click: Pins Page)')}
                      >
                        {(() => {
                          const targetVideo = activeVideoItem || currentVideo;
                          const isPriority = targetVideo && isPriorityPin(targetVideo.id);
                          const isNormalPinned = targetVideo && isPinned(targetVideo.id) && !isPriority;

                          // Visual Logic
                          // Priority: Amber border (#fbbf24), Amber fill
                          // Normal: Black border (#000000), Blue fill (#3b82f6)
                          // Inactive: Slate border (#334155), Slate icon (#475569)

                          let borderColor = '#334155';
                          let iconColor = '#475569';
                          let iconFill = 'transparent';
                          let strokeWidth = 2.5;

                          if (isPriority) {
                            borderColor = '#fbbf24';
                            iconColor = '#fbbf24';
                            iconFill = '#fbbf24';
                            strokeWidth = 1.5; // Stroke needed for needle visibility
                          } else if (isNormalPinned) {
                            borderColor = '#000000';
                            iconColor = '#3b82f6';
                            iconFill = '#3b82f6';
                            strokeWidth = 1.5; // Stroke needed for needle visibility
                          }

                          return (
                            <div className="rounded-full flex items-center justify-center border-2 shadow-sm bg-white" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, borderColor }}>
                              <Pin size={Math.round(bottomIconSize * 0.5)} color={iconColor} fill={iconFill} strokeWidth={strokeWidth} />
                            </div>
                          );
                        })()}
                      </button>

                      <button
                        onClick={handleLikeClick}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (viewMode === 'full') setViewMode('half');
                          setCurrentPage('likes');
                        }}
                        className="absolute left-1/2 top-1/2 flex items-center justify-center group/tool"
                        style={{ transform: `translate(calc(-50% + ${likeButtonX}px), -50%)` }}
                        title={getInspectTitle('Like button (Right-click for Likes)')}
                      >
                        <div className="rounded-full flex items-center justify-center border-2 border-sky-200 shadow-sm bg-white" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, borderColor: isVideoLiked ? likeColor : '#334155' }}>
                          <ThumbsUp size={Math.round(bottomIconSize * 0.5)} color={isVideoLiked ? likeColor : '#475569'} fill={isVideoLiked ? likeColor : 'transparent'} strokeWidth={3} />
                        </div>
                      </button>

                      {/* Tooltip Button */}
                      <div className="absolute left-1/2 top-1/2" style={{ transform: `translate(calc(-50% + ${tooltipButtonX}px), -50%)` }}>
                        <button
                          onClick={() => setIsTooltipOpen(!isTooltipOpen)}
                          className="flex items-center justify-center group/tool relative"
                          title={getInspectTitle('Controls Help')}
                        >
                          <div className="rounded-full flex items-center justify-center border-2 border-sky-200 shadow-sm bg-white" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, borderColor: '#334155' }}>
                            <Info size={Math.round(bottomIconSize * 0.5)} className="text-slate-600" strokeWidth={3} />
                          </div>
                        </button>

                        {isTooltipOpen && (
                          <div className="absolute top-full right-0 mt-3 w-80 bg-white/95 backdrop-blur-xl border border-sky-100 rounded-2xl shadow-2xl overflow-hidden z-[10002] animate-in fade-in zoom-in-95 duration-200 p-4 text-xs text-sky-900 font-medium" style={{ zIndex: 10002 }}>
                            <div className="flex flex-col gap-4">

                              {/* Play Button */}
                              <div className="flex gap-3">
                                <div className="shrink-0 w-8 h-8 bg-sky-50 rounded-full flex items-center justify-center border border-sky-100 shadow-sm text-sky-600">
                                  <Play size={14} fill="currentColor" strokeWidth={0} />
                                </div>
                                <div className="flex flex-col gap-1.5 pt-0.5">
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <div className="flex gap-1">
                                      {/* Left Click Icon */}
                                      <svg width="12" height="16" viewBox="0 0 12 16" fill="none" className="text-sky-500">
                                        <rect x="0.5" y="0.5" width="11" height="15" rx="3.5" stroke="currentColor" />
                                        <line x1="6" y1="0.5" x2="6" y2="6" stroke="currentColor" />
                                        <line x1="0.5" y1="6" x2="11.5" y2="6" stroke="currentColor" />
                                        <path d="M1 4C1 2.34315 2.34315 1 4 1H6V6H1V4Z" fill="currentColor" />
                                      </svg>
                                      {/* Right Click Icon */}
                                      <svg width="12" height="16" viewBox="0 0 12 16" fill="none" className="text-sky-500">
                                        <rect x="0.5" y="0.5" width="11" height="15" rx="3.5" stroke="currentColor" />
                                        <line x1="6" y1="0.5" x2="6" y2="6" stroke="currentColor" />
                                        <line x1="0.5" y1="6" x2="11.5" y2="6" stroke="currentColor" />
                                        <path d="M6 1H8C9.65685 1 11 2.34315 11 4V6H6V1Z" fill="currentColor" />
                                      </svg>
                                    </div>
                                    <span className="font-semibold text-sky-900/80">Cycle Folder Filter</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-500">
                                    {/* Double Click (Two dots/badges) */}
                                    <div className="flex items-center justify-center w-6 h-4 bg-sky-100 rounded text-[9px] font-bold text-sky-700 tracking-tighter px-0.5">
                                      2x
                                    </div>
                                    <span>Reset to All Videos</span>
                                  </div>
                                </div>
                              </div>

                              {/* Pin Button */}
                              <div className="flex gap-3">
                                <div className="shrink-0 w-8 h-8 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100 shadow-sm text-amber-500">
                                  <Pin size={14} fill="currentColor" strokeWidth={0} />
                                </div>
                                <div className="flex flex-col gap-1.5 pt-0.5">
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <svg width="12" height="16" viewBox="0 0 12 16" fill="none" className="text-amber-500">
                                      <rect x="0.5" y="0.5" width="11" height="15" rx="3.5" stroke="currentColor" />
                                      <line x1="6" y1="0.5" x2="6" y2="6" stroke="currentColor" />
                                      <line x1="0.5" y1="6" x2="11.5" y2="6" stroke="currentColor" />
                                      <path d="M1 4C1 2.34315 2.34315 1 4 1H6V6H1V4Z" fill="currentColor" />
                                    </svg>
                                    <span className="font-semibold text-sky-900/80">Normal Pin</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-500">
                                    {/* Long Press Icon */}
                                    <Clock size={12} className="text-amber-500" strokeWidth={2.5} />
                                    <span>Hold for Priority Pin</span>
                                  </div>
                                </div>
                              </div>

                              {/* Like Button */}
                              <div className="flex gap-3">
                                <div className="shrink-0 w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 shadow-sm text-indigo-500">
                                  <ThumbsUp size={14} fill="currentColor" strokeWidth={0} />
                                </div>
                                <div className="flex flex-col gap-1.5 pt-1.5">
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <svg width="12" height="16" viewBox="0 0 12 16" fill="none" className="text-indigo-500">
                                      <rect x="0.5" y="0.5" width="11" height="15" rx="3.5" stroke="currentColor" />
                                      <line x1="6" y1="0.5" x2="6" y2="6" stroke="currentColor" />
                                      <line x1="0.5" y1="6" x2="11.5" y2="6" stroke="currentColor" />
                                      <path d="M6 1H8C9.65685 1 11 2.34315 11 4V6H6V1Z" fill="currentColor" />
                                    </svg>
                                    <span className="font-semibold text-sky-900/80">Go to Likes Page</span>
                                  </div>
                                </div>
                              </div>

                              {/* Star Button */}
                              <div className="flex gap-3">
                                <div className="shrink-0 w-8 h-8 bg-purple-50 rounded-full flex items-center justify-center border border-purple-100 shadow-sm text-purple-500">
                                  <Star size={14} fill="currentColor" strokeWidth={0} />
                                </div>
                                <div className="flex flex-col gap-1.5 pt-1.5">
                                  <div className="flex items-center gap-2 text-slate-600">
                                    <svg width="12" height="16" viewBox="0 0 12 16" fill="none" className="text-purple-500">
                                      <rect x="0.5" y="0.5" width="11" height="15" rx="3.5" stroke="currentColor" />
                                      <line x1="6" y1="0.5" x2="6" y2="6" stroke="currentColor" />
                                      <line x1="0.5" y1="6" x2="11.5" y2="6" stroke="currentColor" />
                                      <path d="M6 1H8C9.65685 1 11 2.34315 11 4V6H6V1Z" fill="currentColor" />
                                    </svg>
                                    <span className="font-semibold text-sky-900/80">Assign Quick Color</span>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </div>
                        )}
                      </div>



                      <div className="absolute left-1/2 top-1/2" style={{ transform: `translate(calc(-50% + ${menuButtonX + 32}px), -50%)` }}>
                        <button
                          onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                          className="flex items-center justify-center group/tool"
                          title={getInspectTitle('More options')}
                        >
                          <div className="rounded-full flex items-center justify-center border-2 border-sky-200 shadow-sm bg-white" style={{ width: `${bottomIconSize}px`, height: `${bottomIconSize}px`, borderColor: '#94a3b8' }}>
                            <MoreHorizontal size={Math.round(bottomIconSize * 0.5)} className="text-slate-500" strokeWidth={3} />
                          </div>
                        </button>
                        {isMoreMenuOpen && (
                          <div className="absolute top-full right-0 mt-3 w-56 bg-sky-50 border border-sky-300 rounded-lg shadow-xl overflow-hidden z-[10001] animate-in fade-in zoom-in-95 duration-100 flex flex-col p-1" style={{ zIndex: 10001 }}>
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-sky-900 hover:bg-sky-200 transition-colors flex items-center gap-2"
                              onClick={() => {
                                setShowPreviewMenus(!showPreviewMenus);
                                setIsMoreMenuOpen(false);
                              }}
                            >
                              {showPreviewMenus ? <EyeOff size={14} /> : <Eye size={14} />}
                              {showPreviewMenus ? 'Hide Preview Menus' : 'Show Preview Menus'}
                            </button>

                            <button
                              className="w-full text-left px-4 py-2 text-sm text-sky-900 hover:bg-sky-200 transition-colors flex items-center gap-2"
                              onClick={() => {
                                toggleDevToolbar();
                                setIsMoreMenuOpen(false);
                              }}
                            >
                              {showDevToolbar ? <EyeOff size={14} /> : <Eye size={14} />}
                              {showDevToolbar ? 'Hide Dev Toolbar' : 'Show Dev Toolbar'}
                            </button>

                            <button
                              className="w-full text-left px-4 py-2 text-sm text-sky-900 hover:bg-sky-200 transition-colors flex items-center gap-2"
                              onClick={() => {
                                document.getElementById('banner-upload').click();
                                setIsMoreMenuOpen(false);
                              }}
                            >
                              <Upload size={14} />
                              Change Banner
                            </button>

                            <button
                              className="w-full text-left px-4 py-2 text-sm text-sky-900 hover:bg-sky-200 transition-colors flex items-center gap-2"
                              onClick={() => {
                                setIsVisualizerEnabled(!isVisualizerEnabled);
                                setIsMoreMenuOpen(false);
                              }}
                            >
                              {isVisualizerEnabled ? <EyeOff size={14} /> : <Eye size={14} />}
                              {isVisualizerEnabled ? 'Hide Audio Visualizer' : 'Show Audio Visualizer'}
                            </button>
                            <input
                              type="file"
                              id="banner-upload"
                              className="hidden"
                              accept="image/*"
                              onChange={handleBannerUpload}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute left-full ml-4 transition-transform" style={{ transform: `translateX(${rightAltNavX}px)` }}>
              </div>
              <div className="absolute left-full ml-4 transition-transform" style={{ transform: `translateX(${rightAltNavX}px)` }}>
                <div className="flex items-center gap-4 animate-in slide-in-from-left-2 duration-300">
                  {/* Video Preview Navigation Menu */}
                  {showPreviewMenus && (
                    <div className={`w-8 ${theme.menuBg} border ${theme.menuBorder} rounded-lg shadow-sm flex flex-col justify-between items-center py-2 shrink-0 animate-in fade-in zoom-in-95 duration-200`} style={{ height: `${menuHeight}px` }}>
                      <button onClick={() => handleAltNav('up', 'video')} className="text-sky-400 p-1" title={getInspectTitle('Previous video in preview')}><ChevronUp size={18} strokeWidth={3} /></button>
                      <div className={`w-full h-px ${theme.bottomBar} my-1`} />
                      <button onClick={() => handleAltNav('down', 'video')} className="text-sky-400 p-1" title={getInspectTitle('Next video in preview')}><ChevronDown size={18} strokeWidth={3} /></button>
                    </div>
                  )}
                  <div className="flex flex-col gap-3 w-9 h-24 items-center justify-center">
                    {videoCheckpoint !== null && (
                      <><button onClick={() => handleCommit('video')} className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-emerald-500 text-white transition-all active:scale-90 animate-in zoom-in duration-200" title={getInspectTitle('Commit video preview')}><Check size={20} strokeWidth={3} /></button><button onClick={() => handleRevert('video')} className="w-9 h-9 rounded-full flex items-center justify-center shadow-md bg-rose-500 text-white transition-all active:scale-90 animate-in zoom-in duration-200" title={getInspectTitle('Revert video preview')}><X size={20} strokeWidth={3} /></button></>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div >
  );
}
