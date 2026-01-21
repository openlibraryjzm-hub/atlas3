import React, { useEffect, useRef, useState } from 'react';
import { updateVideoProgress } from '../api/playlistApi';
import { invoke } from '@tauri-apps/api/core';

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

const LocalVideoPlayer = ({ videoUrl, videoId, playerId = 'default', onEnded, ...props }) => {
  const videoRef = useRef(null);
  const saveIntervalRef = useRef(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [error, setError] = useState(null);

  // Get streaming URL for local video file
  useEffect(() => {
    if (!videoUrl) {
      setVideoSrc(null);
      return;
    }

    // Check if it's a web URL
    if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
      setVideoSrc(videoUrl);
      setError(null);
      return;
    }

    // It's a local file path - get streaming URL from server
    const getStreamingUrl = async () => {
      try {
        let filePath = videoUrl;

        // Remove file:// prefix if present
        if (filePath.startsWith('file://')) {
          filePath = filePath.replace(/^file:\/\/+/, '');
        }

        console.log('Getting streaming URL for local video file:', filePath);

        // Get streaming URL from Tauri command
        const streamUrl = await invoke('get_video_stream_url', { filePath });

        console.log('Streaming URL:', streamUrl);
        setVideoSrc(streamUrl);
        setError(null);
      } catch (err) {
        console.error('Failed to get streaming URL:', err);
        console.error('Original videoUrl:', videoUrl);
        setError(`Failed to load video file: ${err.message || err}`);
        setVideoSrc(null);
      }
    };

    getStreamingUrl();
  }, [videoUrl]);

  // Initialize player and restore playback position
  useEffect(() => {
    if (!videoRef.current || !videoSrc) return;

    const video = videoRef.current;
    const id = videoId || videoUrl;

    // Restore playback position
    const storedTime = getStoredPlaybackTime(id);
    if (storedTime > 0) {
      video.currentTime = storedTime;
    }

    // Set up progress tracking
    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const duration = video.duration;

      // Save to localStorage for quick access
      savePlaybackTime(id, currentTime);

      // Save to database every 5 seconds (throttled)
      if (!saveIntervalRef.current) {
        saveIntervalRef.current = setInterval(() => {
          if (video && !video.paused) {
            saveVideoProgress(id, videoUrl, duration, video.currentTime);
          }
        }, 5000);
      }
    };

    const handlePlay = () => {
      // Start interval when playing
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
      }
      saveIntervalRef.current = setInterval(() => {
        if (video && !video.paused) {
          const currentTime = video.currentTime;
          const duration = video.duration;
          savePlaybackTime(id, currentTime);
          saveVideoProgress(id, videoUrl, duration, currentTime);
        }
      }, 5000);
    };

    const handlePause = () => {
      // Save immediately on pause
      if (video) {
        const currentTime = video.currentTime;
        const duration = video.duration;
        savePlaybackTime(id, currentTime);
        saveVideoProgress(id, videoUrl, duration, currentTime);
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };

    const handleLoadedMetadata = () => {
      // Seek to stored time when metadata is loaded
      if (storedTime > 0) {
        const duration = video.duration;
        // Smart Resume: If stored time is near the end (within 5 seconds or 95%), start from beginning
        const isNearEnd = storedTime >= duration - 5 || (duration > 0 && storedTime / duration > 0.95);

        if (isNearEnd) {
          video.currentTime = 0;
          savePlaybackTime(id, 0);
        } else {
          video.currentTime = storedTime;
        }
      }
    };

    const handleEnded = () => {
      // Reset progress
      savePlaybackTime(id, 0);
      saveVideoProgress(id, videoUrl, video.duration, 0);

      if (onEnded) {
        onEnded();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);

    // Autoplay
    video.play().catch(err => {
      console.error('Autoplay failed:', err);
    });

    return () => {
      // Cleanup: save final progress
      if (video) {
        try {
          const currentTime = video.currentTime;
          const duration = video.duration;
          savePlaybackTime(id, currentTime);
          saveVideoProgress(id, videoUrl, duration, currentTime);
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
    };
  }, [videoSrc, videoId, videoUrl]);

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black text-white">
        <p>{error}</p>
      </div>
    );
  }

  if (!videoSrc) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black text-white">
        <p>No video file selected</p>
      </div>
    );
  }

  // Add error handler for video element
  const handleVideoError = (e) => {
    const video = e.target;
    console.error('Video error:', {
      error: video.error,
      code: video.error?.code,
      message: video.error?.message,
      networkState: video.networkState,
      readyState: video.readyState,
      src: videoSrc
    });

    if (video.error) {
      let errorMsg = 'Failed to load video';
      switch (video.error.code) {
        case video.error.MEDIA_ERR_ABORTED:
          errorMsg = 'Video loading aborted';
          break;
        case video.error.MEDIA_ERR_NETWORK:
          errorMsg = 'Network error while loading video';
          break;
        case video.error.MEDIA_ERR_DECODE:
          errorMsg = 'Video decoding error - format may not be supported';
          break;
        case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMsg = 'Video format not supported or source not found';
          break;
      }
      setError(errorMsg);
    }
  };

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full"
        controls
        autoPlay
        onError={handleVideoError}
        crossOrigin="anonymous"
        preload="metadata"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
        }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default LocalVideoPlayer;

