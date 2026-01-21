// Helper to send messages to C#
const invokeCSharp = (command, payload = {}) => {
  return new Promise((resolve, reject) => {
    // Check if we are in WebView2
    if (window.chrome?.webview) {
      const requestId = crypto.randomUUID();

      // Define limits
      const timeout = 30000; // 30s timeout

      const handleResponse = (event) => {
        const message = event.data;
        if (message.requestId === requestId) {
          window.chrome.webview.removeEventListener('message', handleResponse);
          if (message.success) {
            resolve(message.data);
          } else {
            console.error('C# Error:', message.error);
            reject(new Error(message.error || 'Unknown C# Error'));
          }
        }
      };

      window.chrome.webview.addEventListener('message', handleResponse);

      window.chrome.webview.postMessage({
        command: command,
        payload: payload,
        requestId: requestId
      });

      // Cleanup on timeout
      setTimeout(() => {
        window.chrome.webview.removeEventListener('message', handleResponse);
        // Don't reject for now, some ops might take long, just log warning
        console.warn(`Command ${command} timed out after ${timeout}ms`);
      }, timeout);

    } else {
      console.warn(`Mocking C# call: ${command}`, payload);
      resolve(null);
    }
  });
};

/**
 * Playlist API - All database operations for playlists
 */

// Playlist operations
export const createPlaylist = async (name, description = null) => {
  return await invokeCSharp('create_playlist', { name, description });
};

export const getAllPlaylists = async () => {
  try {
    const result = await invokeCSharp('get_all_playlists');
    console.log('getAllPlaylists API result:', result);
    return result || [];
  } catch (error) {
    console.error('Error in getAllPlaylists API:', error);
    throw error;
  }
};

export const getAllPlaylistMetadata = async () => {
  try {
    const result = await invokeCSharp('get_all_playlist_metadata');
    return result || [];
  } catch (error) {
    // console.error('Error in getAllPlaylistMetadata API:', error); // reduce noise
    throw error;
  }
};

export const getPlaylist = async (id) => {
  return await invokeCSharp('get_playlist', { id });
};

export const updatePlaylist = async (id, name = null, description = null, customAscii = null, customThumbnailUrl = null) => {
  return await invokeCSharp('update_playlist', { id, name, description, customAscii, customThumbnailUrl });
};

export const deletePlaylist = async (id) => {
  return await invokeCSharp('delete_playlist', { id });
};

export const deletePlaylistByName = async (name) => {
  return await invokeCSharp('delete_playlist_by_name', { name });
};

// Playlist item operations
export const addVideoToPlaylist = async (playlistId, videoUrl, videoId, title, thumbnailUrl, author, viewCount, publishedAt, isLocal = false) => {
  try {
    const id = await invokeCSharp('add_video_to_playlist', {
      playlist_id: playlistId, // Snake case for C# DTO compatibility matching Rust
      video_url: videoUrl,
      video_id: videoId,
      title,
      thumbnail_url: thumbnailUrl,
      is_local: isLocal,
      author,
      view_count: viewCount,
      published_at: publishedAt
    });
    return id;
  } catch (error) {
    console.error('Failed to add video to playlist:', error);
    throw error;
  }
};

export const getPlaylistItems = async (playlistId) => {
  try {
    const result = await invokeCSharp('get_playlist_items', { playlist_id: playlistId });
    console.log('getPlaylistItems API result:', result);
    return result || [];
  } catch (error) {
    console.error('Error in getPlaylistItems API:', error);
    throw error;
  }
};

export const getPlaylistsForVideoIds = async (videoIds) => {
  try {
    const result = await invokeCSharp('get_playlists_for_video_ids', { videoIds });
    console.log('getPlaylistsForVideoIds API result:', result);
    return result || {};
  } catch (error) {
    console.error('Error in getPlaylistsForVideoIds API:', error);
    throw error;
  }
};

export const removeVideoFromPlaylist = async (playlistId, itemId) => {
  return await invokeCSharp('remove_video_from_playlist', {
    playlistId,
    itemId,
  });
};

export const reorderPlaylistItem = async (playlistId, itemId, newPosition) => {
  return await invokeCSharp('reorder_playlist_item', {
    playlistId,
    itemId,
    newPosition,
  });
};

// Folder assignment operations
export const assignVideoToFolder = async (playlistId, itemId, folderColor) => {
  return await invokeCSharp('assign_video_to_folder', {
    playlistId,
    itemId,
    folderColor,
  });
};

export const unassignVideoFromFolder = async (playlistId, itemId, folderColor) => {
  return await invokeCSharp('unassign_video_from_folder', {
    playlistId,
    itemId,
    folderColor,
  });
};

export const getVideosInFolder = async (playlistId, folderColor) => {
  return await invokeCSharp('get_videos_in_folder', {
    playlistId,
    folderColor,
  });
};

export const getVideoFolderAssignments = async (playlistId, itemId) => {
  return await invokeCSharp('get_video_folder_assignments', {
    playlistId,
    itemId,
  });
};

export const getAllFolderAssignments = async (playlistId) => {
  try {
    const result = await invokeCSharp('get_all_folder_assignments', { playlistId });
    return result || {};
  } catch (error) {
    console.error('Error in getAllFolderAssignments API:', error);
    throw error;
  }
};

export const getAllFoldersWithVideos = async () => {
  return await invokeCSharp('get_all_folders_with_videos');
};

export const getFoldersForPlaylist = async (playlistId) => {
  try {
    const result = await invokeCSharp('get_folders_for_playlist', { playlistId });
    return result || [];
  } catch (error) {
    console.error('Error in getFoldersForPlaylist API:', error);
    throw error;
  }
};

// Stuck folders operations
export const toggleStuckFolder = async (playlistId, folderColor) => {
  return await invokeCSharp('toggle_stuck_folder', { playlistId, folderColor });
};

export const isFolderStuck = async (playlistId, folderColor) => {
  return await invokeCSharp('is_folder_stuck', { playlistId, folderColor });
};

export const getAllStuckFolders = async () => {
  try {
    const result = await invokeCSharp('get_all_stuck_folders');
    return result || [];
  } catch (error) {
    console.error('Error in getAllStuckFolders API:', error);
    throw error;
  }
};

// Folder Metadata operations
export const getFolderMetadata = async (playlistId, folderColor) => {
  try {
    const result = await invokeCSharp('get_folder_metadata', { playlistId, folderColor });
    return result || null; // Returns [name, description] or null
  } catch (error) {
    console.error('Error in getFolderMetadata API:', error);
    throw error;
  }
};

export const setFolderMetadata = async (playlistId, folderColor, name, description, customAscii) => {
  try {
    return await invokeCSharp('set_folder_metadata', { playlistId, folderColor, name, description, customAscii });
  } catch (error) {
    console.error('Error in setFolderMetadata API:', error);
    throw error;
  }
};

/**
 * Export playlist to JSON format
 * Includes playlist data, all videos, and folder assignments
 */
export const exportPlaylist = async (playlistId) => {
  try {
    // Get playlist data
    const playlist = await getPlaylist(playlistId);
    if (!playlist) {
      throw new Error('Playlist not found');
    }

    // Get all videos in playlist
    const videos = await getPlaylistItems(playlistId);

    // Get folder assignments for each video
    const videosWithFolders = await Promise.all(
      videos.map(async (video) => {
        const folderAssignments = await getVideoFolderAssignments(playlistId, video.id);
        return {
          video_url: video.video_url,
          video_id: video.video_id,
          title: video.title,
          thumbnail_url: video.thumbnail_url,
          position: video.position,
          folder_assignments: Array.isArray(folderAssignments) ? folderAssignments : [],
        };
      })
    );

    // Create export object
    const exportData = {
      version: '1.0',
      playlist: {
        name: playlist.name,
        description: playlist.description,
        created_at: playlist.created_at,
        updated_at: playlist.updated_at,
      },
      videos: videosWithFolders,
    };

    return exportData;
  } catch (error) {
    console.error('Failed to export playlist:', error);
    throw error;
  }
};

/**
 * Import playlist from JSON format
 * Creates playlist, adds videos, and restores folder assignments
 */
export const importPlaylistFromJson = async (jsonData) => {
  try {
    // Validate JSON structure
    if (!jsonData.playlist || !jsonData.videos) {
      throw new Error('Invalid JSON format: missing playlist or videos');
    }

    // Create playlist
    const playlistId = await createPlaylist(
      jsonData.playlist.name || 'Imported Playlist',
      jsonData.playlist.description || null
    );

    // Add videos and restore folder assignments
    const results = {
      playlistId,
      videosAdded: 0,
      foldersAssigned: 0,
      errors: [],
    };

    for (let i = 0; i < jsonData.videos.length; i++) {
      const video = jsonData.videos[i];
      try {
        // Add video to playlist
        const itemId = await addVideoToPlaylist(
          playlistId,
          video.video_url || `https://www.youtube.com/watch?v=${video.video_id}`,
          video.video_id,
          video.title || null,
          video.thumbnail_url || null
        );

        results.videosAdded++;

        // Restore folder assignments
        if (video.folder_assignments && Array.isArray(video.folder_assignments)) {
          for (const folderColor of video.folder_assignments) {
            try {
              await assignVideoToFolder(playlistId, itemId, folderColor);
              results.foldersAssigned++;
            } catch (folderError) {
              console.error(`Failed to assign folder ${folderColor} to video:`, folderError);
              results.errors.push(`Failed to assign folder ${folderColor} to video ${i + 1}`);
            }
          }
        }
      } catch (videoError) {
        console.error(`Failed to add video ${i + 1}:`, videoError);
        results.errors.push(`Failed to add video ${i + 1}: ${videoError.message}`);
      }
    }

    return results;
  } catch (error) {
    console.error('Failed to import playlist:', error);
    throw error;
  }
};

// Watch history operations
export const addToWatchHistory = async (videoUrl, videoId, title = null, thumbnailUrl = null) => {
  return await invokeCSharp('add_to_watch_history', {
    videoUrl,
    videoId,
    title,
    thumbnailUrl,
  });
};

export const getWatchHistory = async (limit = 100) => {
  try {
    const result = await invokeCSharp('get_watch_history', { limit });
    return result || [];
  } catch (error) {
    console.error('Error in getWatchHistory API:', error);
    throw error;
  }
};

export const clearWatchHistory = async () => {
  return await invokeCSharp('clear_watch_history');
};

export const getWatchedVideoIds = async () => {
  try {
    const result = await invokeCSharp('get_watched_video_ids');
    return result || [];
  } catch (error) {
    console.error('Error in getWatchedVideoIds API:', error);
    throw error;
  }
};

// Video progress operations
export const updateVideoProgress = async (videoId, videoUrl, duration = null, currentTime) => {
  return await invokeCSharp('update_video_progress', {
    video_id: videoId,
    video_url: videoUrl,
    duration,
    current_time: currentTime, // snake_case mapping
  });
};

export const getVideoProgress = async (videoId) => {
  try {
    const result = await invokeCSharp('get_video_progress', { videoId });
    return result;
  } catch (error) {
    console.error('Error in getVideoProgress API:', error);
    throw error;
  }
};

export const getAllVideoProgress = async () => {
  try {
    const result = await invokeCSharp('get_all_video_progress');
    return result || [];
  } catch (error) {
    console.error('Error in getAllVideoProgress API:', error);
    throw error;
  }
};

