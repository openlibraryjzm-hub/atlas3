import { createPlaylist, addVideoToPlaylist, getAllPlaylists, getPlaylistItems } from '../api/playlistApi';
import { extractVideoId } from './youtubeUtils';

/**
 * Test video URLs for populating playlists
 */
const TEST_VIDEOS = [
  'https://www.youtube.com/watch?v=oG7jKUHsLfY',
  'https://www.youtube.com/watch?v=TnlPtaPxXfc',
  'https://www.youtube.com/watch?v=V1bFr2SWP1I',
];

/**
 * Add test videos to a playlist
 */
export const addTestVideosToPlaylist = async (playlistId) => {
  try {
    console.log('Adding test videos to playlist:', playlistId);
    let addedCount = 0;
    
    for (const videoUrl of TEST_VIDEOS) {
      const videoId = extractVideoId(videoUrl);
      if (videoId) {
        await addVideoToPlaylist(playlistId, videoUrl, videoId, null, null);
        addedCount++;
        console.log(`Added video: ${videoUrl}`);
      }
    }
    
    console.log(`Successfully added ${addedCount} videos to playlist ${playlistId}`);
    return addedCount;
  } catch (error) {
    console.error('Failed to add test videos to playlist:', error);
    throw error;
  }
};

/**
 * Initialize database - just ensures database is ready
 * No test data is created automatically
 */
export const initializeTestData = async () => {
  try {
    // Just check if database is accessible by fetching playlists
    const existingPlaylists = await getAllPlaylists();
    console.log(`Database initialized. Found ${existingPlaylists.length} existing playlist(s)`);
    return existingPlaylists.length > 0 ? existingPlaylists[0].id : null;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};


