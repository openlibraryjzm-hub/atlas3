import React, { useEffect, useRef, useState, useCallback } from 'react';
import { updateVideoProgress } from '../api/playlistApi';
import { useLayoutStore } from '../store/layoutStore';

/**
 * Extracts video ID from YouTube URL
 * Supports formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - VIDEO_ID (if already just an ID)
 */
const extractVideoId = (url) => {
  if (!url) return null;

  // If it's already just an ID
  if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
    return url;
  }

  // Extract from watch URL
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  // Extract from youtu.be URL
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) return shortMatch[1];

  return null;
};

// Get stored playback time for a video
const getStoredPlaybackTime = (videoId) => {
  try {
    const stored = localStorage.getItem(`playback_time_${videoId}`);
    return stored ? parseFloat(stored) : 0;
  } catch {
    return 0;
  }
};

// Save playback time for a video (localStorage for quick access)
const savePlaybackTime = (videoId, time) => {
  try {
    localStorage.setItem(`playback_time_${videoId}`, time.toString());
  } catch (error) {
    console.error('Failed to save playback time:', error);
  }
};

// Save video progress to database
const saveVideoProgress = async (videoId, videoUrl, duration, currentTime) => {
  try {
    await updateVideoProgress(videoId, videoUrl, duration, currentTime);
  } catch (error) {
    console.error('Failed to save video progress to database:', error);
    // Don't throw - this is non-critical
  }
};

const YouTubePlayer = ({ videoUrl, videoId, playerId = 'default', onEnded, ...props }) => {
  const id = videoId || extractVideoId(videoUrl);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const durationRef = useRef(null); // Store video duration
  const [apiReady, setApiReady] = useState(false);
  const { viewMode } = useLayoutStore();

  // Create unique player ID using both video ID and player instance ID
  const uniquePlayerId = `youtube-player-${playerId}-${id}`;

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }

    if (!window.onYouTubeIframeAPIReady) {
      window.onYouTubeIframeAPIReady = () => {
        setApiReady(true);
      };

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // Simple resize when player is ready - just set to 100%
  useEffect(() => {
    if (!apiReady) return;

    const container = document.getElementById(uniquePlayerId);
    if (!container) return;

    const resize = () => {
      const iframe = container.querySelector('iframe');
      if (iframe) {
        const parent = container.parentElement;
        if (parent) {
          // Simple: always 100% of parent
          iframe.style.width = '100%';
          iframe.style.height = '100%';
        }
      }
    };

    // Resize when viewMode changes
    resize();
    
    // Also resize on window resize
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [apiReady, viewMode, uniquePlayerId]);

  // Initialize player when API is ready and we have a video ID
  useEffect(() => {
    if (!apiReady || !id) return;

    const storedTime = getStoredPlaybackTime(id);

    playerRef.current = new window.YT.Player(uniquePlayerId, {
      videoId: id,
      playerVars: {
        autoplay: 1,
        start: Math.floor(storedTime),
        enablejsapi: 1,
      },
      events: {
        onReady: (event) => {
          // Get and store video duration
          try {
            const duration = event.target.getDuration();
            if (duration && duration > 0) {
              durationRef.current = duration;
            }
          } catch (e) {
            console.error('Failed to get video duration:', e);
          }

          // Simple resize - just set iframe to 100%
          setTimeout(() => {
            const container = document.getElementById(uniquePlayerId);
            if (container) {
              const iframe = container.querySelector('iframe');
              if (iframe) {
                iframe.style.width = '100%';
                iframe.style.height = '100%';
              }
            }
          }, 200);

          // Seek to stored time if available
          if (storedTime > 0) {
            const duration = event.target.getDuration();
            // Smart Resume: If stored time is near the end (within 10s as YouTube buffers more, or 95%), start from beginning
            const isNearEnd = storedTime >= duration - 10 || (duration > 0 && storedTime / duration > 0.95);

            if (isNearEnd) {
              console.log('Video finished previously, restarting from 0');
              event.target.seekTo(0, true);
              savePlaybackTime(id, 0);
            } else {
              event.target.seekTo(storedTime, true);
            }
          }
        },
        onStateChange: (event) => {
          // Video ended
          if (event.data === window.YT.PlayerState.ENDED) {
            // Reset progress
            savePlaybackTime(id, 0);
            const duration = durationRef.current || playerRef.current?.getDuration?.() || 0;
            saveVideoProgress(id, videoUrl || `https://www.youtube.com/watch?v=${id}`, duration, 0);

            if (onEnded) {
              onEnded();
            }
            return;
          }

          // Save time periodically when playing
          if (event.data === window.YT.PlayerState.PLAYING) {
            saveIntervalRef.current = setInterval(() => {
              if (playerRef.current && playerRef.current.getCurrentTime) {
                try {
                  const currentTime = playerRef.current.getCurrentTime();
                  const duration = durationRef.current || playerRef.current.getDuration?.() || null;

                  // Save to localStorage for quick access
                  savePlaybackTime(id, currentTime);

                  // Save to database with progress percentage
                  saveVideoProgress(id, videoUrl || `https://www.youtube.com/watch?v=${id}`, duration, currentTime);
                } catch (e) {
                  // Ignore errors
                }
              }
            }, 5000); // Save every 5 seconds
          } else {
            // Save when paused/stopped
            if (playerRef.current && playerRef.current.getCurrentTime) {
              try {
                const currentTime = playerRef.current.getCurrentTime();
                const duration = durationRef.current || playerRef.current.getDuration?.() || null;

                // Save to localStorage
                savePlaybackTime(id, currentTime);

                // Save to database with progress percentage
                saveVideoProgress(id, videoUrl || `https://www.youtube.com/watch?v=${id}`, duration, currentTime);
              } catch (e) {
                // Ignore errors
              }
            }
            if (saveIntervalRef.current) {
              clearInterval(saveIntervalRef.current);
              saveIntervalRef.current = null;
            }
          }
        },
      },
    });

    return () => {
      // Cleanup: save final time and clear interval
      if (playerRef.current) {
        try {
          if (playerRef.current.getCurrentTime) {
            const currentTime = playerRef.current.getCurrentTime();
            const duration = durationRef.current || playerRef.current.getDuration?.() || null;

            // Save to localStorage
            savePlaybackTime(id, currentTime);

            // Save to database with progress percentage
            saveVideoProgress(id, videoUrl || `https://www.youtube.com/watch?v=${id}`, duration, currentTime);
          }
          if (playerRef.current.destroy) {
            playerRef.current.destroy();
          }
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
    };
  }, [apiReady, id, videoUrl]);

  if (!id) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black text-white">
        <p>Invalid YouTube URL or ID</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black" style={{ overflow: 'hidden' }}>
      <div
        id={uniquePlayerId}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
};

export default YouTubePlayer;

