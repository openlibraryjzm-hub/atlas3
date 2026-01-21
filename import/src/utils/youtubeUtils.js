/**
 * Extracts video ID from YouTube URL
 * Supports formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - VIDEO_ID (if already just an ID)
 */
export const extractVideoId = (url) => {
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

/**
 * Gets YouTube thumbnail URL from video ID
 */
export const getThumbnailUrl = (videoId, quality = 'default') => {
  if (!videoId) return null;
  
  const qualities = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    standard: 'sddefault',
    max: 'maxresdefault',
  };
  
  const qualityKey = qualities[quality] || qualities.default;
  return `https://img.youtube.com/vi/${videoId}/${qualityKey}.jpg`;
};

/**
 * Extracts playlist ID from YouTube playlist URL
 * Supports formats:
 * - https://www.youtube.com/playlist?list=PLAYLIST_ID
 * - https://youtube.com/playlist?list=PLAYLIST_ID
 */
export const extractPlaylistId = (url) => {
  if (!url) return null;
  
  // Extract from playlist URL
  const playlistMatch = url.match(/[?&]list=([^&]+)/);
  if (playlistMatch) return playlistMatch[1];
  
  // If it's already just an ID
  if (!url.includes('youtube.com') && !url.includes('youtu.be') && !url.includes('?')) {
    return url;
  }
  
  return null;
};

/**
 * Fetches YouTube playlist metadata using oEmbed API
 * Note: This is a fallback - for full metadata, YouTube Data API v3 is recommended
 */
export const fetchPlaylistMetadata = async (playlistId) => {
  try {
    // YouTube oEmbed doesn't support playlists directly, so we'll use a workaround
    // For now, we'll return basic info that can be extracted from the URL
    // In production, you'd want to use YouTube Data API v3 with an API key
    
    // Alternative: Fetch the playlist page and parse metadata
    const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    
    // Since we can't easily scrape in browser due to CORS, we'll return minimal metadata
    // The actual implementation would need a backend proxy or YouTube Data API
    return {
      playlistId,
      url: playlistUrl,
      // These would be fetched via API in production
      title: null,
      description: null,
      thumbnailUrl: null,
      videoCount: null,
    };
  } catch (error) {
    console.error('Failed to fetch playlist metadata:', error);
    return null;
  }
};

/**
 * Fetches video metadata from YouTube oEmbed API
 * This works for individual videos
 */
export const fetchVideoMetadata = async (videoId) => {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
    
    const response = await fetch(oembedUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch video metadata');
    }
    
    const data = await response.json();
    return {
      videoId,
      title: data.title,
      thumbnailUrl: data.thumbnail_url,
      author: data.author_name,
      authorUrl: data.author_url,
    };
  } catch (error) {
    console.error('Failed to fetch video metadata:', error);
    return null;
  }
};

