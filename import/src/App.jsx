import React, { useState, useEffect } from 'react';
import LayoutShell from './LayoutShell';
import PlayerController from './components/PlayerController';
import PlaylistsButton from './components/PlaylistsButton';
import PlaylistList from './components/PlaylistList';
import TopNavigation from './components/TopNavigation';
import PlaylistsPage from './components/PlaylistsPage';
import VideosPage from './components/VideosPage';
import HistoryPage from './components/HistoryPage';
import LikesPage from './components/LikesPage';
import PinsPage from './components/PinsPage';

import YouTubePlayer from './components/YouTubePlayer';
import LocalVideoPlayer from './components/LocalVideoPlayer';
import NativeVideoPlayer from './components/NativeVideoPlayer';
import { useLayoutStore } from './store/layoutStore';
import { usePlaylistStore } from './store/playlistStore';
import { useNavigationStore } from './store/navigationStore';
import { usePinStore } from './store/pinStore';
import { initializeTestData } from './utils/initDatabase';
import { addToWatchHistory, getWatchHistory, getAllPlaylists, getPlaylistItems } from './api/playlistApi';
import { extractVideoId } from './utils/youtubeUtils';
import RadialMenuStandalone from './components/RadialMenuStandalone';
import SettingsPage from './components/SettingsPage';
import SupportPage from './components/SupportPage';
import { THEMES } from './utils/themes';
import './App.css';

function App() {
  const { viewMode, setViewMode, menuQuarterMode, toggleMenuQuarterMode, showDebugBounds, toggleDebugBounds, inspectMode, toggleInspectMode, showRuler, toggleRuler, showDevToolbar } = useLayoutStore();

  // Helper to get inspect label
  const getInspectTitle = (label) => inspectMode ? label : undefined;
  const { showPlaylists, setShowPlaylists, setPlaylistItems, currentPlaylistItems, currentPlaylistId, currentVideoIndex, setCurrentVideoIndex } = usePlaylistStore();
  const { currentPage } = useNavigationStore();
  const [dbInitialized, setDbInitialized] = useState(false);
  const [containerConfig, setContainerConfig] = useState(null);
  const [dictionaryConfig, setDictionaryConfig] = useState(null);
  const [radialMenuVisible, setRadialMenuVisible] = useState(true); // Start visible for testing
  const [secondPlayerVideoUrl, setSecondPlayerVideoUrl] = useState(null);

  const [secondPlayerVideoIndex, setSecondPlayerVideoIndex] = useState(0); // Track second player's video index
  const [secondPlayerPlaylistId, setSecondPlayerPlaylistId] = useState(null); // Track second player's playlist ID
  const [secondPlayerPlaylistItems, setSecondPlayerPlaylistItems] = useState([]); // Track second player's playlist items
  const [activePlayer, setActivePlayer] = useState(1); // 1 = main player, 2 = mode 2 (alternative video in main player)
  const [currentThemeId, setCurrentThemeId] = useState('blue'); // Theme state lifted from PlayerController

  // Pin expiration check
  const { checkExpiration } = usePinStore();
  useEffect(() => {
    // Check on mount
    checkExpiration();

    // Check every minute
    const interval = setInterval(checkExpiration, 60000);
    return () => clearInterval(interval);
  }, [checkExpiration]);

  // Mode 1 checkpoint - saves state before entering mode 2
  const [mode1Checkpoint, setMode1Checkpoint] = useState(null); // { videoUrl, playlistId, videoIndex, playlistItems }

  // Debug logging
  useEffect(() => {
    console.log('=== APP STATE DEBUG ===');
    console.log('showPlaylists:', showPlaylists);
    console.log('dbInitialized:', dbInitialized);
    console.log('viewMode:', viewMode);
    console.log('currentPage:', currentPage);
  }, [showPlaylists, dbInitialized, viewMode, currentPage]);

  // Load radial menu configs
  useEffect(() => {
    const loadConfigs = async () => {
      try {
        console.log('Loading radial menu configs...');
        // Load container config
        const containerResponse = await fetch('/container-config (11).json');
        if (!containerResponse.ok) {
          throw new Error(`Container config failed: ${containerResponse.status}`);
        }
        const containerData = await containerResponse.json();
        console.log('Container config loaded:', containerData);
        setContainerConfig(containerData);

        // Load dictionary config
        const dictionaryResponse = await fetch('/dictionary.json');
        if (!dictionaryResponse.ok) {
          throw new Error(`Dictionary config failed: ${dictionaryResponse.status}`);
        }
        const dictionaryData = await dictionaryResponse.json();
        console.log('Dictionary config loaded:', Object.keys(dictionaryData).length, 'entries');
        setDictionaryConfig(dictionaryData);
      } catch (error) {
        console.error('Failed to load radial menu configs:', error);
      }
    };
    loadConfigs();
  }, []);

  // Debug logging for radial menu
  useEffect(() => {
    console.log('Radial menu state updated:', {
      visible: radialMenuVisible,
      hasContainerConfig: !!containerConfig,
      hasDictionaryConfig: !!dictionaryConfig,
      containerConfigKeys: containerConfig ? Object.keys(containerConfig) : null
    });
  }, [radialMenuVisible, containerConfig, dictionaryConfig]);

  // Initialize database with test data on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeTestData();
        setDbInitialized(true);

        // Load most recent video from watch history
        try {
          const history = await getWatchHistory(1);
          if (history && history.length > 0) {
            const mostRecent = history[0];
            const videoId = mostRecent.video_id;

            // Find which playlist contains this video
            const allPlaylists = await getAllPlaylists();
            for (const playlist of allPlaylists) {
              try {
                const items = await getPlaylistItems(playlist.id);
                const videoIndex = items.findIndex(item => item.video_id === videoId);
                if (videoIndex >= 0) {
                  // Found the playlist - load it and set the video
                  setPlaylistItems(items, playlist.id);
                  setCurrentVideoIndex(videoIndex);
                  console.log('Loaded most recent video from watch history:', mostRecent.video_url);
                  return;
                }
              } catch (error) {
                console.error(`Failed to load playlist ${playlist.id}:`, error);
              }
            }
            console.log('Most recent video not found in any playlist, using default');
          }
        } catch (error) {
          console.error('Failed to load watch history for initialization:', error);
          // Continue with default video
        }
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setDbInitialized(true); // Set to true anyway to prevent infinite loading
      }
    };
    init();
  }, [setPlaylistItems, setCurrentVideoIndex]);

  // Get current video URL from playlist - make it reactive
  const currentVideoUrl = React.useMemo(() => {
    if (currentPlaylistItems.length > 0 && currentVideoIndex < currentPlaylistItems.length) {
      return currentPlaylistItems[currentVideoIndex].video_url;
    }
    return 'https://www.youtube.com/watch?v=QiemgC39tA0'; // Default fallback
  }, [currentPlaylistItems, currentVideoIndex]);

  // Check if current video is local
  const isCurrentVideoLocal = React.useMemo(() => {
    if (currentPlaylistItems.length > 0 && currentVideoIndex < currentPlaylistItems.length) {
      return currentPlaylistItems[currentVideoIndex].is_local || false;
    }
    return false;
  }, [currentPlaylistItems, currentVideoIndex]);

  // Get current video ID
  const currentVideoId = React.useMemo(() => {
    if (currentPlaylistItems.length > 0 && currentVideoIndex < currentPlaylistItems.length) {
      return currentPlaylistItems[currentVideoIndex].video_id;
    }
    return null;
  }, [currentPlaylistItems, currentVideoIndex]);

  // Get the active video URL based on which player is active
  const activeVideoUrl = React.useMemo(() => {
    if (activePlayer === 1) {
      return currentVideoUrl;
    } else {
      return secondPlayerVideoUrl || currentVideoUrl; // Fallback to main if second has no video
    }
  }, [activePlayer, currentVideoUrl, secondPlayerVideoUrl]);

  // Track video plays in watch history
  useEffect(() => {
    const trackVideoPlay = async () => {
      if (!currentVideoUrl || currentVideoUrl === 'https://www.youtube.com/watch?v=QiemgC39tA0') {
        return; // Skip default fallback
      }

      try {
        const videoId = extractVideoId(currentVideoUrl);
        if (!videoId) return;

        // Get video info from current playlist items if available
        const currentVideo = currentPlaylistItems.length > 0 && currentVideoIndex < currentPlaylistItems.length
          ? currentPlaylistItems[currentVideoIndex]
          : null;

        const title = currentVideo?.title || null;
        const thumbnailUrl = currentVideo?.thumbnail_url || null;

        // Add to watch history
        await addToWatchHistory(currentVideoUrl, videoId, title, thumbnailUrl);
      } catch (error) {
        console.error('Failed to track video play:', error);
        // Don't show error to user - history tracking is non-critical
      }
    };

    // Only track if database is initialized
    if (dbInitialized) {
      trackVideoPlay();
    }
  }, [currentVideoUrl, dbInitialized, currentPlaylistItems, currentVideoIndex]);

  const handlePlaylistSelect = (items, playlistId) => {
    setPlaylistItems(items, playlistId);
  };

  const handleVideoSelect = async (videoUrl) => {
    // Route to the appropriate player based on active player mode
    if (activePlayer === 1) {
      // Control main player
      const videoIndex = currentPlaylistItems.findIndex(item => item.video_url === videoUrl);
      if (videoIndex >= 0) {
        setCurrentVideoIndex(videoIndex);
      } else {
        // Video not in current playlist - search through all playlists
        try {
          const allPlaylists = await getAllPlaylists();
          for (const playlist of allPlaylists) {
            try {
              const items = await getPlaylistItems(playlist.id);
              const index = items.findIndex(item => item.video_url === videoUrl);
              if (index >= 0) {
                // Found the video - load the playlist and set the index
                setPlaylistItems(items, playlist.id);
                // Also call handlePlaylistSelect to ensure side menu updates if needed
                handlePlaylistSelect(items, playlist.id);
                setCurrentVideoIndex(index);
                break;
              }
            } catch (error) {
              // Continue searching other playlists
              console.error(`Failed to load playlist ${playlist.id}:`, error);
            }
          }
        } catch (error) {
          console.error('Failed to search playlists for video:', error);
        }
      }
    } else {
      // Control second player
      setSecondPlayerVideoUrl(videoUrl);
      // Try to find in second player's playlist first
      let videoIndex = -1;
      if (secondPlayerPlaylistItems.length > 0) {
        videoIndex = secondPlayerPlaylistItems.findIndex(item => item.video_url === videoUrl);
        if (videoIndex >= 0) {
          setSecondPlayerVideoIndex(videoIndex);
          // Keep the second player's playlist - don't change it
          return;
        }
      }
      // If not found in second player's playlist, search all playlists
      // This handles the case where navigation might have moved to a different playlist
      if (videoIndex < 0) {
        // First try current playlist
        videoIndex = currentPlaylistItems.findIndex(item => item.video_url === videoUrl);
        if (videoIndex >= 0) {
          setSecondPlayerVideoIndex(videoIndex);
          setSecondPlayerPlaylistId(currentPlaylistId);
          setSecondPlayerPlaylistItems(currentPlaylistItems);
        } else {
          // If not in current playlist either, search all playlists (similar to handleSecondPlayerSelect)
          try {
            const allPlaylists = await getAllPlaylists();
            for (const playlist of allPlaylists) {
              try {
                const items = await getPlaylistItems(playlist.id);
                const index = items.findIndex(item => item.video_url === videoUrl);
                if (index >= 0) {
                  setSecondPlayerVideoIndex(index);
                  setSecondPlayerPlaylistId(playlist.id);
                  setSecondPlayerPlaylistItems(items);
                  break;
                }
              } catch (error) {
                // Continue searching
                console.error(`Failed to load playlist ${playlist.id}:`, error);
              }
            }
          } catch (error) {
            console.error('Failed to search playlists for video:', error);
          }
        }
      }
    }
  };

  const handleSecondPlayerSelect = async (videoUrl) => {
    // Alternative Mode 2: Save current state as checkpoint, switch to mode 2, load video in main player
    // Only save checkpoint if we're currently in mode 1
    if (activePlayer === 1) {
      // Save current state as mode 1 checkpoint
      setMode1Checkpoint({
        videoUrl: currentVideoUrl,
        playlistId: currentPlaylistId,
        videoIndex: currentVideoIndex,
        playlistItems: [...currentPlaylistItems] // Copy array
      });
    }

    // Find the video in playlists
    let videoIndex = currentPlaylistItems.findIndex(item => item.video_url === videoUrl);
    let foundPlaylistId = currentPlaylistId;
    let foundPlaylistItems = currentPlaylistItems;

    // If not found in current playlist, search through all playlists
    if (videoIndex < 0) {
      try {
        const allPlaylists = await getAllPlaylists();
        for (const playlist of allPlaylists) {
          try {
            const items = await getPlaylistItems(playlist.id);
            const index = items.findIndex(item => item.video_url === videoUrl);
            if (index >= 0) {
              videoIndex = index;
              foundPlaylistId = playlist.id;
              foundPlaylistItems = items;
              break;
            }
          } catch (error) {
            // Continue searching other playlists
            console.error(`Failed to load playlist ${playlist.id}:`, error);
          }
        }
      } catch (error) {
        console.error('Failed to search playlists for video:', error);
      }
    }

    // Load the video in the main player and switch to mode 2
    if (videoIndex >= 0 && foundPlaylistItems.length > 0) {
      // Set playlist items and video index
      setPlaylistItems(foundPlaylistItems, foundPlaylistId);
      setCurrentVideoIndex(videoIndex);

      // Switch to mode 2
      setActivePlayer(2);

      // The video will play via the currentVideoUrl computed value
      // which will update when currentVideoIndex changes
    }
  };

  // Handle mode toggle - restore checkpoint when switching from mode 2 to mode 1
  const handleActivePlayerChange = (newActivePlayer) => {
    if (activePlayer === 2 && newActivePlayer === 1 && mode1Checkpoint) {
      // Restore mode 1 checkpoint
      setPlaylistItems(mode1Checkpoint.playlistItems, mode1Checkpoint.playlistId);
      setCurrentVideoIndex(mode1Checkpoint.videoIndex);
      // Clear checkpoint after restoring
      setMode1Checkpoint(null);
    }
    setActivePlayer(newActivePlayer);
  };

  // Handle video ended - autoplay next video
  const handleVideoEnded = (endedPlayerId) => {
    console.log(`Video ended in player: ${endedPlayerId}`);

    if (endedPlayerId === 'main') {
      // Main player corresponds to currentPlaylistItems and currentVideoIndex
      const nextIndex = currentVideoIndex + 1;
      if (nextIndex < currentPlaylistItems.length) {
        console.log('Autoplaying next video in main playlist');
        setCurrentVideoIndex(nextIndex);
      } else {
        console.log('Main playlist reached end');
        // Optional: Loop back to start if repeat mode is added later
      }
    } else if (endedPlayerId === 'second') {
      // Second player
      // We have secondPlayerPlaylistItems and secondPlayerVideoIndex
      const nextIndex = secondPlayerVideoIndex + 1;
      if (nextIndex < secondPlayerPlaylistItems.length) {
        console.log('Autoplaying next video in second playlist');
        setSecondPlayerVideoIndex(nextIndex);
        // Since we manually manage second player URL based on index in handleVideoSelect logic (mostly), 
        // but here we aren't using handleVideoSelect. We should update the URL.
        // Note: App.jsx doesn't have a clean "setSecondPlayerIndexAndUrl" but we can do it manually.
        const nextVideo = secondPlayerPlaylistItems[nextIndex];
        if (nextVideo) {
          setSecondPlayerVideoUrl(nextVideo.video_url);
        }
      } else {
        console.log('Second playlist reached end');
      }
    }
  };

  return (
    <div className={`app-container bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] ${THEMES[currentThemeId].bg}`} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* View Mode Toggle - Temporary for testing - Controlled by Dev Toolbar Toggle */}
      {showDevToolbar && (
        <div className="view-mode-toggle">
          <button
            onClick={() => setViewMode('full')}
            className={viewMode === 'full' ? 'active' : ''}
            title={getInspectTitle('Full screen view')}
          >
            Full
          </button>
          <button
            onClick={() => setViewMode('half')}
            className={viewMode === 'half' ? 'active' : ''}
            title={getInspectTitle('Half screen view')}
          >
            Half
          </button>
          <button
            onClick={() => setViewMode('quarter')}
            className={viewMode === 'quarter' ? 'active' : ''}
            title={getInspectTitle('Quarter screen view')}
          >
            Quarter
          </button>
          {/* Menu Quarter Mode Toggle - Only visible outside full screen */}
          {viewMode !== 'full' && (
            <button
              onClick={toggleMenuQuarterMode}
              className={menuQuarterMode ? 'active' : ''}
              title={getInspectTitle('Toggle menu quarter mode') || 'Toggle Menu Quarter Mode'}
            >
              Menu Q
            </button>
          )}
          {/* Debug Bounds Toggle */}
          <button
            onClick={toggleDebugBounds}
            className={showDebugBounds ? 'active' : ''}
            title={getInspectTitle('Toggle debug bounds') || 'Toggle Debug Bounds'}
            style={{
              backgroundColor: showDebugBounds ? '#3b82f6' : 'transparent',
              color: showDebugBounds ? 'white' : 'inherit',
              border: '1px solid #3b82f6',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Debug
          </button>
          {/* Inspect Mode Toggle */}
          <button
            onClick={toggleInspectMode}
            className={inspectMode ? 'active' : ''}
            title={getInspectTitle('Toggle inspect mode') || 'Toggle Inspect Mode'}
            style={{
              backgroundColor: inspectMode ? '#8b5cf6' : 'transparent',
              color: inspectMode ? 'white' : 'inherit',
              border: '1px solid #8b5cf6',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '8px'
            }}
          >
            Inspect
          </button>
          {/* Ruler Toggle */}
          <button
            onClick={toggleRuler}
            className={showRuler ? 'active' : ''}
            title={getInspectTitle('Toggle ruler') || 'Toggle Ruler'}
            style={{
              backgroundColor: showRuler ? '#ef4444' : 'transparent',
              color: showRuler ? 'white' : 'inherit',
              border: '1px solid #ef4444',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '8px'
            }}
          >
            Ruler
          </button>
          {/* Radial Menu Toggle */}
          <button
            onClick={() => setRadialMenuVisible(!radialMenuVisible)}
            className={radialMenuVisible ? 'active' : ''}
            title={getInspectTitle('Toggle radial menu') || 'Toggle Radial Menu'}
            style={{
              backgroundColor: radialMenuVisible ? '#10b981' : 'transparent',
              color: radialMenuVisible ? 'white' : 'inherit',
              border: '1px solid #10b981',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '8px'
            }}
          >
            Menu
          </button>
        </div>
      )}

      <LayoutShell
        topController={<PlayerController
          onPlaylistSelect={handlePlaylistSelect}
          onVideoSelect={handleVideoSelect}
          activePlayer={activePlayer}
          onActivePlayerChange={handleActivePlayerChange}
          secondPlayerVideoUrl={secondPlayerVideoUrl}

          secondPlayerVideoIndex={secondPlayerVideoIndex}
          onSecondPlayerVideoIndexChange={setSecondPlayerVideoIndex}
          secondPlayerPlaylistId={secondPlayerPlaylistId}
          secondPlayerPlaylistItems={secondPlayerPlaylistItems}
          currentThemeId={currentThemeId}
          onThemeChange={setCurrentThemeId}
        />}
        mainPlayer={
          isCurrentVideoLocal ? (
            <NativeVideoPlayer
              videoUrl={currentVideoUrl}
              videoId={currentVideoId}
              playerId="main"
              onEnded={() => handleVideoEnded('main')}
            />
          ) : (
            <YouTubePlayer
              videoUrl={currentVideoUrl}
              playerId="main"
              onEnded={() => handleVideoEnded('main')}
            />
          )
        }
        secondPlayer={secondPlayerVideoUrl ? <YouTubePlayer videoUrl={secondPlayerVideoUrl} playerId="second" onEnded={() => handleVideoEnded('second')} /> : null}
        miniHeader={
          <div className="w-full h-full flex items-center px-4">
            <TopNavigation />
          </div>
        }
        animatedMenu={
          radialMenuVisible && containerConfig && dictionaryConfig ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              backgroundColor: 'transparent',
              pointerEvents: 'auto',
              zIndex: 10
            }}>
              <RadialMenuStandalone
                containerConfig={containerConfig}
                dictionaryConfig={dictionaryConfig}
                backgroundColor="transparent"
              />
            </div>
          ) : null
        }
        spacerMenu={null}
        menuSpacerMenu={null}
        sideMenu={
          showPlaylists && dbInitialized ? (
            (() => {
              console.log('=== RENDERING PLAYLISTLIST IN APP ===');
              console.log('showPlaylists:', showPlaylists);
              console.log('dbInitialized:', dbInitialized);
              return <PlaylistList onPlaylistSelect={handlePlaylistSelect} onVideoSelect={handleVideoSelect} />;
            })()
          ) : showPlaylists && !dbInitialized ? (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-black">Initializing database...</p>
            </div>
          ) : !showPlaylists && currentPage === 'playlists' ? (
            <PlaylistsPage onVideoSelect={handleVideoSelect} />
          ) : !showPlaylists && currentPage === 'videos' ? (
            <VideosPage onVideoSelect={handleVideoSelect} onSecondPlayerSelect={handleSecondPlayerSelect} />
          ) : !showPlaylists && currentPage === 'history' ? (
            <HistoryPage onVideoSelect={handleVideoSelect} onSecondPlayerSelect={handleSecondPlayerSelect} />
          ) : !showPlaylists && currentPage === 'likes' ? (
            <LikesPage onVideoSelect={handleVideoSelect} />
          ) : !showPlaylists && currentPage === 'pins' ? (
            <PinsPage onVideoSelect={handleVideoSelect} />

          ) : !showPlaylists && currentPage === 'settings' ? (
            <SettingsPage currentThemeId={currentThemeId} onThemeChange={setCurrentThemeId} />
          ) : !showPlaylists && currentPage === 'support' ? (
            <SupportPage onVideoSelect={handleVideoSelect} />
          ) : null
        }
      />
    </div>
  );
}

export default App;
