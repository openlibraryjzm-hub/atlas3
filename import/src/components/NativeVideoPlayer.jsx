import React, { useEffect, useRef, useState } from 'react';
import { updateVideoProgress } from '../api/playlistApi';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

// Manually verify observeMpvProperties import or implement locally if needed.
// Keeping it for now assuming it uses event system which might match.
import {
  observeMpvProperties,
} from 'tauri-plugin-mpv-api';

// Local implementations to bypass library naming mismatch
const sendMpvCommand = async (commandData) => {
  // Matches functionality of library's sendMpvCommand but calls 'plugin:mpv|command'
  // Wraps command in an extra array because the plugin expects a tuple-like struct (Command, ID?)
  const mpvCommand = [commandData.command, 0];
  const windowLabel = getCurrentWindow().label;
  console.log('Invoking sendMpvCommand (wrapped with ID):', { mpvCommand, windowLabel });
  return await invoke('plugin:mpv|command', { mpvCommand, windowLabel });
};

const initializeMpv = async (options) => {
  // Matches functionality of library's initializeMpv but calls 'plugin:mpv|init'
  const windowLabel = getCurrentWindow().label;
  return await invoke('plugin:mpv|init', { ...options, windowLabel });
};

const destroyMpv = async () => {
  const windowLabel = getCurrentWindow().label;
  return await invoke('plugin:mpv|destroy', { windowLabel });
};

const getMpvProperty = async (name) => {
  try {
    const res = await sendMpvCommand({ command: ['get_property', name] });
    return res ? res.data : null;
  } catch (e) {
    console.warn(`getMpvProperty failed for ${name}:`, e);
    return null;
  }
};

const setMpvProperty = async (name, value) => {
  try {
    await sendMpvCommand({ command: ['set_property', name, value] });
  } catch (e) {
    console.warn(`setMpvProperty failed for ${name}=${value}:`, e);
  }
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
  }
};

const NativeVideoPlayer = ({ videoUrl, videoId, playerId = 'default', onEnded, ...props }) => {
  const containerRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const unlistenRef = useRef(null);
  const initAttemptedRef = useRef(false); // Prevent multiple init attempts
  const onEndedRef = useRef(onEnded);
  const eofHandledRef = useRef(false);

  // Keep onEndedRef updated
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize mpv and load video
  useEffect(() => {
    if (!videoUrl) {
      setError(null);
      initAttemptedRef.current = false;
      return;
    }

    // Prevent multiple initialization attempts
    if (initAttemptedRef.current) {
      console.log('Init already attempted, skipping...');
      return;
    }

    let isMounted = true;
    initAttemptedRef.current = true;
    eofHandledRef.current = false;

    const initializePlayer = async () => {
      try {
        // Wait for container to be mounted
        if (!containerRef.current) {
          console.log('Waiting for container to mount...');
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (!containerRef.current) {
          console.warn('Container element not found, but proceeding with MPV init (might open in separate window)');
        } else {
          console.log('Container ready, initializing mpv with IPC...');
        }

        // Wait for window to be fully ready
        await new Promise(resolve => setTimeout(resolve, 300));

        // Initialize mpv with IPC plugin
        // The IPC plugin embeds mpv's own window into the Tauri window
        console.log('Initializing mpv with IPC plugin...');

        const config = {
          mpvConfig: {
            'vo': 'gpu',
            'hwdec': 'auto-safe',
            'keep-open': 'yes',
            'force-window': 'yes',
          },
          observedProperties: ['pause', 'time-pos', 'duration', 'filename', 'wid']
        };

        try {
          // Add a timeout to initialization
          const initPromise = initializeMpv(config);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Initialization timed out after 15000ms')), 15000)
          );

          await Promise.race([initPromise, timeoutPromise]);
          console.log('✓ mpv initialized successfully with IPC plugin');
        } catch (initError) {
          console.error('Failed to initialize mpv:', initError);
          // If connection failed, it might be because the plugin isn't registered or DLLs are missing
          if (initError.toString().includes('connection refused') || initError.toString().includes('ipc')) {
            throw new Error('Could not connect to mpv plugin. Is the backend running?');
          }
          throw initError;
        }

        if (!isMounted) return;
        setIsInitialized(true);

        // Wait for mpv to be fully ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // Get file path (remove file:// prefix if present)
        let filePath = videoUrl;
        if (filePath.startsWith('file://')) {
          filePath = filePath.replace(/^file:\/\/+/, '');
        }
        // Remove http:// prefix if it's a streaming URL
        if (filePath.startsWith('http://127.0.0.1:1422/')) {
          console.warn('Native player received streaming URL, using direct file path');
        }

        console.log('Loading video in mpv:', filePath);

        // Load the video file
        try {
          console.log('Calling sendMpvCommand loadfile...');
          await sendMpvCommand({ command: ['loadfile', filePath] });
          console.log('✓ loadfile command successful');

          // Wait for file to start loading
          await new Promise(resolve => setTimeout(resolve, 500));

          // Explicitly enable video
          try {
            await sendMpvCommand({ command: ['set', 'video', 'yes'] });
            console.log('✓ Enabled video track');
          } catch (e) {
            console.warn('Could not enable video track:', e);
          }
        } catch (cmdError) {
          console.error('loadfile command failed:', cmdError);
          throw cmdError;
        }

        // Wait for video to load and initialize video output
        console.log('Waiting for video to load and initialize video output...');
        let videoLoaded = false;
        let attempts = 0;
        const maxAttempts = 30;

        while (!videoLoaded && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 200));
          try {
            const path = await getMpvProperty('path');
            const videoFormat = await getMpvProperty('video-format');
            const width = await getMpvProperty('width');
            const height = await getMpvProperty('height');
            const duration = await getMpvProperty('duration');

            // Log progress every 5 attempts
            if (attempts % 5 === 0) {
              console.log(`Video loading check (attempt ${attempts}/${maxAttempts}):`, {
                path: path ? 'loaded' : 'null',
                videoFormat,
                width,
                height,
                duration,
              });
            }

            // Check if video is loaded - need video format AND dimensions
            if (videoFormat && width && width > 0 && height && height > 0) {
              videoLoaded = true;
              console.log('✓ Video loaded and video output initialized:', { videoFormat, width, height, duration });
              break;
            }
          } catch (e) {
            console.warn('Error checking video status:', e);
          }
          attempts++;
        }

        if (!videoLoaded) {
          console.error('❌ Video failed to load after', maxAttempts, 'attempts');
          // Get final status
          try {
            const path = await getMpvProperty('path');
            const videoFormat = await getMpvProperty('video-format');
            const videoCodec = await getMpvProperty('video-codec');
            console.error('Final video status:', { path, videoFormat, videoCodec });
          } catch (e) {
            console.error('Could not get final video status:', e);
          }
        }

        // Get stored playback time
        const id = videoId || videoUrl;
        const storedTime = getStoredPlaybackTime(id);

        if (storedTime > 0 && videoLoaded) {
          // Smart Resume: If stored time is near the end (within 5 seconds or 95%), start from beginning
          const isNearEnd = storedTime >= duration - 5 || (duration > 0 && storedTime / duration > 0.95);

          if (isNearEnd) {
            console.log('Stored time is near end, assuming finished. Starting at 0.');
            savePlaybackTime(id, 0); // Reset stored time
            // Don't seek (starts at 0 by default) or explicitly seek to 0 if needed
          } else {
            try {
              console.log('Seeking to stored time:', storedTime);
              await setMpvProperty('time-pos', storedTime);
              console.log('✓ Seek successful');
            } catch (seekError) {
              console.error('Seek failed:', seekError);
            }
          }
        }

        // Set up property observation for progress tracking
        console.log('Setting up property observation...');
        try {
          const unlisten = await observeMpvProperties(
            ['pause', 'time-pos', 'duration', 'eof-reached'],
            async (properties) => {
              if (!isMounted) return;

              const id = videoId || videoUrl;
              const currentTime = properties['time-pos'] || 0;
              const duration = properties['duration'] || 0;
              const isPaused = properties['pause'] || false;

              // Save to localStorage for quick access
              if (currentTime > 0) {
                savePlaybackTime(id, currentTime);
              }

              if (!isPaused && currentTime > 0) {
                if (!saveIntervalRef.current) {
                  saveIntervalRef.current = setInterval(async () => {
                    if (isMounted) {
                      try {
                        const time = await getMpvProperty('time-pos');
                        const dur = await getMpvProperty('duration');
                        if (time && time > 0) {
                          saveVideoProgress(id, videoUrl, dur || 0, time);
                        }
                      } catch (e) {
                        console.warn('Error saving progress:', e);
                      }
                    }
                  }, 5000);
                }
              } else {
                // Save immediately on pause
                if (currentTime > 0 && duration > 0) {
                  saveVideoProgress(id, videoUrl, duration, currentTime);
                }
                if (saveIntervalRef.current) {
                  clearInterval(saveIntervalRef.current);
                  saveIntervalRef.current = null;
                }
              }

              // Check for EOF
              const isEof = properties['eof-reached'];
              if (isEof && !eofHandledRef.current) {
                console.log('EOF reached, resetting playback time and triggering onEnded');
                eofHandledRef.current = true;

                // Reset stored time so it starts from beginning next time
                savePlaybackTime(id, 0);
                saveVideoProgress(id, videoUrl, duration, 0);

                if (onEndedRef.current) {
                  onEndedRef.current();
                }
              }
            }
          );
          unlistenRef.current = unlisten;
          console.log('✓ Property observation set up successfully');
        } catch (obsError) {
          console.error('Property observation setup failed:', obsError);
        }

        // Start playing
        try {
          console.log('Starting playback...');
          await setMpvProperty('pause', false);
          console.log('✓ Playback started');

          // Wait for video to start rendering
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Check if video is actually rendering
          try {
            const vo = await getMpvProperty('video-out');
            const width = await getMpvProperty('width');
            const height = await getMpvProperty('height');
            const videoFormat = await getMpvProperty('video-format');
            const wid = await getMpvProperty('wid');

            console.log('Video output info:', { vo, width, height, videoFormat, wid });

            if (!vo || !width || !height) {
              console.warn('⚠️ Video output may not be initialized yet');
              console.warn('This is normal for IPC plugin - mpv window should be embedded');
            } else {
              console.log(`✓ Video rendering: ${width}x${height} using ${vo}`);
            }
          } catch (infoError) {
            console.warn('Could not query video output info:', infoError);
          }
        } catch (playError) {
          console.error('Failed to start playback:', playError);
          throw playError;
        }

      } catch (err) {
        console.error('Failed to initialize mpv player:', err);
        if (isMounted) {
          setError(`Failed to load video: ${err.message || err}`);
        }
      }
    };

    initializePlayer();

    return () => {
      isMounted = false;
      initAttemptedRef.current = false;

      // Cleanup: save final progress
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }

      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }

      // Save final progress before destroying
      const saveFinalProgress = async () => {
        try {
          const id = videoId || videoUrl;
          const currentTime = await getMpvProperty('time-pos');
          const duration = await getMpvProperty('duration');
          if (currentTime && duration && currentTime > 0 && duration > 0) {
            savePlaybackTime(id, currentTime);
            saveVideoProgress(id, videoUrl, duration, currentTime);
          }
        } catch (e) {
          // Ignore errors during cleanup
        }
      };

      saveFinalProgress().then(() => {
        // Destroy mpv instance
        destroyMpv().catch(console.error);
        console.log('Player cleanup completed');
      });
    };
  }, [videoUrl, videoId, playerId]);

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black text-white">
        <p>{error}</p>
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black text-white">
        <p>No video file selected</p>
      </div>
    );
  }

  // mpv renders via IPC plugin - embeds mpv's own window into Tauri window
  return (
    <div
      ref={containerRef}
      id={`mpv-player-${playerId}`}
      className="w-full h-full bg-black flex items-center justify-center"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: '100%',
        minHeight: '100%',
      }}
    >
      {!isInitialized && (
        <div className="text-white">
          <p>Initializing player...</p>
        </div>
      )}
      {/* mpv window is embedded by IPC plugin */}
    </div>
  );
};

export default NativeVideoPlayer;
