import React, { useState, useEffect } from 'react';
import { createPlaylist, addVideoToPlaylist, assignVideoToFolder, getPlaylistItems, getVideosInFolder, getAllPlaylists } from '../api/playlistApi';
import { extractPlaylistId } from '../utils/youtubeUtils';
import { FOLDER_COLORS } from '../utils/folderColors';
import PlaylistFolderSelector from './PlaylistFolderSelector';

const BulkPlaylistImporter = ({ onImportComplete, onCancel }) => {
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [playlistLinks, setPlaylistLinks] = useState({
    all: '', // No folder assignment
    ...FOLDER_COLORS.reduce((acc, color) => {
      acc[color.id] = '';
      return acc;
    }, {}),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSelector, setShowSelector] = useState(false);
  const [selectorField, setSelectorField] = useState(null); // 'all' or color id
  const [importMode, setImportMode] = useState('new'); // 'new' or 'existing'
  const [existingPlaylists, setExistingPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    message: '',
    currentPlaylist: '',
    videosProcessed: 0,
    totalVideos: 0,
  });

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    try {
      const playlists = await getAllPlaylists();
      setExistingPlaylists(playlists);
    } catch (err) {
      console.error('Failed to load playlists:', err);
    }
  };

  // Parse links from text - split by newlines, commas, or spaces
  // Returns both YouTube URLs and local references (local:playlist:id or local:folder:playlistId:color)
  const parseLinks = (text) => {
    if (!text || !text.trim()) return [];

    // Split by newlines first, then by commas, then by spaces
    // Also handle cases where links might be on the same line separated by various delimiters
    const links = text
      .split(/\n/)
      .flatMap(line => {
        // Try splitting by comma first (most common separator)
        if (line.includes(',')) {
          return line.split(',').map(part => part.trim());
        }
        // Then try splitting by semicolon
        if (line.includes(';')) {
          return line.split(';').map(part => part.trim());
        }
        // Then try splitting by pipe
        if (line.includes('|')) {
          return line.split('|').map(part => part.trim());
        }
        // Finally, split by whitespace
        return line.split(/\s+/).map(part => part.trim());
      })
      .filter(link => {
        if (!link) return false;
        // Accept YouTube URLs
        const isYouTube = (
          link.includes('youtube.com/playlist') ||
          link.includes('youtu.be') ||
          (link.includes('youtube.com/watch') && link.includes('list='))
        );
        // Accept local references
        const isLocal = link.startsWith('local:playlist:') || link.startsWith('local:folder:');
        return isYouTube || isLocal;
      })
      // Remove duplicates
      .filter((link, index, self) => self.indexOf(link) === index);

    return links;
  };

  // Fetch videos from a YouTube playlist URL
  const fetchPlaylistVideos = async (playlistUrl) => {
    const API_KEY = 'AIzaSyBYPwv0a-rRbTrvMA9nF4Wa1ryC0b6l7xw';

    // Extract playlist ID from URL
    const playlistId = extractPlaylistId(playlistUrl);
    if (!playlistId) {
      throw new Error(`Invalid YouTube playlist URL: ${playlistUrl}`);
    }

    // Fetch playlist metadata (for display purposes)
    const playlistDetailsUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${API_KEY}`;
    const playlistResponse = await fetch(playlistDetailsUrl);

    if (!playlistResponse.ok) {
      throw new Error('Failed to fetch playlist details from YouTube API');
    }

    const playlistData = await playlistResponse.json();
    if (!playlistData.items || playlistData.items.length === 0) {
      throw new Error('Playlist not found or is private');
    }

    const playlistInfo = playlistData.items[0].snippet;
    const sourcePlaylistName = playlistInfo.title;

    // Fetch all videos in the playlist
    let nextPageToken = null;
    let allVideos = [];

    do {
      const videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      const videosResponse = await fetch(videosUrl);

      if (!videosResponse.ok) {
        throw new Error('Failed to fetch playlist videos from YouTube API');
      }

      const videosData = await videosResponse.json();
      if (videosData.items) {
        allVideos = allVideos.concat(videosData.items);
      }

      nextPageToken = videosData.nextPageToken;
    } while (nextPageToken);

    if (allVideos.length === 0) {
      throw new Error('No videos found in this playlist');
    }

    // Convert to our format
    const videos = allVideos
      .filter(item => item.snippet.resourceId && item.snippet.resourceId.kind === 'youtube#video')
      .map(item => {
        const videoSnippet = item.snippet;
        const videoId = videoSnippet.resourceId.videoId;
        return {
          videoId,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          title: videoSnippet.title || null,
          thumbnailUrl: videoSnippet.thumbnails?.medium?.url || videoSnippet.thumbnails?.default?.url || null,
        };
      });

    return { sourcePlaylistName, videos };
  };

  // Fetch videos from a local playlist
  const fetchLocalPlaylistVideos = async (playlistId) => {
    try {
      const items = await getPlaylistItems(parseInt(playlistId));
      const videos = items.map(item => ({
        videoId: item.video_id,
        videoUrl: item.video_url,
        title: item.title,
        thumbnailUrl: item.thumbnail_url,
      }));
      return { sourcePlaylistName: `Local Playlist ${playlistId}`, videos };
    } catch (error) {
      throw new Error(`Failed to fetch local playlist ${playlistId}: ${error.message}`);
    }
  };

  // Fetch videos from a local folder
  const fetchLocalFolderVideos = async (playlistId, folderColor) => {
    try {
      const items = await getVideosInFolder(parseInt(playlistId), folderColor);
      const videos = items.map(item => ({
        videoId: item.video_id,
        videoUrl: item.video_url,
        title: item.title,
        thumbnailUrl: item.thumbnail_url,
      }));
      return { sourcePlaylistName: `Local ${folderColor} Folder`, videos };
    } catch (error) {
      throw new Error(`Failed to fetch local folder ${folderColor} from playlist ${playlistId}: ${error.message}`);
    }
  };

  const handleBulkImport = async () => {
    try {
      if (importMode === 'new' && !playlistName.trim()) {
        setError('Please enter a name for the destination playlist.');
        return;
      }
      if (importMode === 'existing' && !selectedPlaylistId) {
        setError('Please select a destination playlist.');
        return;
      }

      setLoading(true);
      setError(null);

      // Collect all playlists to import with their folder assignments
      const playlistsToImport = [];

      // Add playlists from "all" field (no folder assignment)
      const allLinks = parseLinks(playlistLinks.all);
      allLinks.forEach(link => {
        playlistsToImport.push({ url: link, folderColor: null });
      });

      // Add playlists from each folder color field
      FOLDER_COLORS.forEach(color => {
        const links = parseLinks(playlistLinks[color.id]);
        links.forEach(link => {
          playlistsToImport.push({ url: link, folderColor: color.id });
        });
      });

      if (playlistsToImport.length === 0) {
        setError('No valid playlist links found. Please enter at least one YouTube playlist URL or add existing playlists/folders.');
        setLoading(false);
        return;
      }

      let dbPlaylistId;
      let targetName = playlistName.trim();

      if (importMode === 'new') {
        // Create the single destination playlist
        setProgress({
          current: 0,
          total: playlistsToImport.length,
          message: 'Creating destination playlist...',
          currentPlaylist: '',
          videosProcessed: 0,
          totalVideos: 0,
        });

        dbPlaylistId = await createPlaylist(
          playlistName.trim(),
          playlistDescription.trim() || null
        );
      } else {
        // Use existing playlist
        if (!selectedPlaylistId) {
          setError('Please select a destination playlist.');
          setLoading(false);
          return;
        }
        dbPlaylistId = parseInt(selectedPlaylistId);
        const selected = existingPlaylists.find(p => p.id === dbPlaylistId);
        targetName = selected ? selected.name : 'Unknown Playlist';
      }

      // Fetch all videos from all playlists
      let allVideosWithFolders = [];
      let totalVideos = 0;
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (let i = 0; i < playlistsToImport.length; i++) {
        const { url, folderColor } = playlistsToImport[i];

        try {
          setProgress({
            current: i + 1,
            total: playlistsToImport.length,
            message: `Fetching videos from ${i + 1}/${playlistsToImport.length}...`,
            currentPlaylist: url,
            videosProcessed: totalVideos,
            totalVideos: 0,
          });

          let sourcePlaylistName, videos;

          // Check if it's a local reference
          if (url.startsWith('local:playlist:')) {
            const playlistId = url.replace('local:playlist:', '');
            const result = await fetchLocalPlaylistVideos(playlistId);
            sourcePlaylistName = result.sourcePlaylistName;
            videos = result.videos;
          } else if (url.startsWith('local:folder:')) {
            const parts = url.replace('local:folder:', '').split(':');
            const playlistId = parts[0];
            const folderColorFromUrl = parts[1];
            const result = await fetchLocalFolderVideos(playlistId, folderColorFromUrl);
            sourcePlaylistName = result.sourcePlaylistName;
            videos = result.videos;
            // Use the folder color from the URL, not the field (folder already has a color)
            // But if the field also has a color, we might want to use that instead
            // For now, use the folder's color
          } else {
            // It's a YouTube URL
            const result = await fetchPlaylistVideos(url);
            sourcePlaylistName = result.sourcePlaylistName;
            videos = result.videos;
          }

          successCount++;

          // Add folder color to each video
          // Use the field's folder color (which field the item was placed in)
          videos.forEach(video => {
            allVideosWithFolders.push({
              ...video,
              folderColor: folderColor, // Use the field's color assignment
              sourcePlaylist: sourcePlaylistName,
            });
          });

          totalVideos += videos.length;

          setProgress({
            current: i + 1,
            total: playlistsToImport.length,
            message: `Fetched ${videos.length} videos from "${sourcePlaylistName}"`,
            currentPlaylist: sourcePlaylistName,
            videosProcessed: totalVideos,
            totalVideos: totalVideos,
          });
        } catch (playlistError) {
          errorCount++;
          const errorMsg = `Failed to fetch ${url}: ${playlistError.message}`;
          errors.push(errorMsg);
          console.error(errorMsg, playlistError);
        }
      }

      if (allVideosWithFolders.length === 0) {
        throw new Error('No videos were successfully fetched from any playlists.');
      }

      // Add all videos to the destination playlist
      setProgress({
        current: playlistsToImport.length,
        total: playlistsToImport.length,
        message: `Adding ${allVideosWithFolders.length} videos to playlist...`,
        currentPlaylist: playlistName,
        videosProcessed: 0,
        totalVideos: allVideosWithFolders.length,
      });

      let videosAdded = 0;
      let foldersAssigned = 0;

      for (let i = 0; i < allVideosWithFolders.length; i++) {
        const video = allVideosWithFolders[i];

        try {
          const itemId = await addVideoToPlaylist(
            dbPlaylistId,
            video.videoUrl,
            video.videoId,
            video.title,
            video.thumbnailUrl
          );
          videosAdded++;

          // Assign to folder if specified
          if (video.folderColor) {
            try {
              await assignVideoToFolder(dbPlaylistId, itemId, video.folderColor);
              foldersAssigned++;
            } catch (folderError) {
              console.error(`Failed to assign folder ${video.folderColor} to video:`, folderError);
            }
          }

          setProgress({
            current: playlistsToImport.length,
            total: playlistsToImport.length,
            message: `Adding videos... ${videosAdded}/${allVideosWithFolders.length}`,
            currentPlaylist: playlistName,
            videosProcessed: videosAdded,
            totalVideos: allVideosWithFolders.length,
          });
        } catch (videoError) {
          console.error(`Failed to add video ${i + 1}:`, videoError);
        }
      }

      // Show final results
      setProgress({
        current: playlistsToImport.length,
        total: playlistsToImport.length,
        message: `Import complete! ${videosAdded} videos added to "${playlistName}"${foldersAssigned > 0 ? `, ${foldersAssigned} assigned to folders` : ''}${errorCount > 0 ? `, ${errorCount} playlists failed` : ''}`,
        currentPlaylist: playlistName,
        videosProcessed: videosAdded,
        totalVideos: allVideosWithFolders.length,
      });

      if (errors.length > 0) {
        setError(`Some playlists failed to import:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ''}`);
      }

      // Callback after short delay
      setTimeout(() => {
        if (onImportComplete) {
          onImportComplete();
        }
      }, 2000);

    } catch (error) {
      console.error('Failed to bulk import playlists:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to import playlists';
      setError(errorMessage);
      setLoading(false);
      setProgress({ current: 0, total: 0, message: '', currentPlaylist: '', videosProcessed: 0, totalVideos: 0 });
    }
  };

  const handleLinkChange = (field, value) => {
    setPlaylistLinks(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const getLinkCount = (field) => {
    return parseLinks(playlistLinks[field]).length;
  };

  const handleAddButtonClick = (field) => {
    setSelectorField(field);
    setShowSelector(true);
  };

  const handleSelectorSelect = (selectedItems) => {
    if (selectorField && selectedItems.length > 0) {
      const currentValue = playlistLinks[selectorField] || '';
      const newItems = selectedItems.join('\n');
      const updatedValue = currentValue ? `${currentValue}\n${newItems}` : newItems;
      handleLinkChange(selectorField, updatedValue);
    }
    setShowSelector(false);
    setSelectorField(null);
  };

  const handleSelectorCancel = () => {
    setShowSelector(false);
    setSelectorField(null);
  };

  return (
    <>
      {showSelector && (
        <PlaylistFolderSelector
          onSelect={handleSelectorSelect}
          onCancel={handleSelectorCancel}
        />
      )}
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-6xl max-h-[90vh] flex flex-col my-8">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700 flex-shrink-0">
            <h2 className="text-2xl font-semibold text-white">Bulk Import Playlists</h2>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-slate-400 hover:text-white transition-colors"
                disabled={loading}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4 text-sm text-slate-400">
              All playlists will be combined into a single playlist. Paste YouTube playlist URLs in the fields below.
              Links can be separated by newlines, commas, or spaces. Videos from playlists in folder-specific fields will be automatically assigned to that folder.
            </div>

            {/* Import Mode Selector */}
            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => setImportMode('new')}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${importMode === 'new'
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                Create New Playlist
              </button>
              <button
                type="button"
                onClick={() => setImportMode('existing')}
                disabled={loading}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${importMode === 'existing'
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
              >
                Add to Existing Playlist
              </button>
            </div>

            {/* Playlist Name/Selection */}
            <div className="mb-6 space-y-3">
              {importMode === 'new' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Playlist Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={playlistName}
                      onChange={(e) => setPlaylistName(e.target.value)}
                      placeholder="Enter playlist name..."
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-sky-500 focus:outline-none"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={playlistDescription}
                      onChange={(e) => setPlaylistDescription(e.target.value)}
                      placeholder="Enter playlist description..."
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-sky-500 focus:outline-none resize-none"
                      disabled={loading}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Select Playlist <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedPlaylistId}
                    onChange={(e) => setSelectedPlaylistId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-sky-500 focus:outline-none appearance-none"
                    disabled={loading}
                  >
                    <option value="">Select a playlist...</option>
                    {existingPlaylists.map(playlist => (
                      <option key={playlist.id} value={playlist.id}>
                        {playlist.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg">
                <p className="text-red-400 text-sm whitespace-pre-wrap">{error}</p>
              </div>
            )}

            {/* Progress */}
            {loading && (progress.total > 0 || progress.totalVideos > 0) && (
              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>{progress.message}</span>
                  {progress.totalVideos > 0 ? (
                    <span>{progress.videosProcessed}/{progress.totalVideos} videos</span>
                  ) : (
                    <span>{progress.current}/{progress.total} playlists</span>
                  )}
                </div>
                {progress.currentPlaylist && (
                  <div className="text-xs text-slate-400 truncate">
                    {progress.totalVideos > 0 ? 'Adding to:' : 'Fetching from:'} {progress.currentPlaylist}
                  </div>
                )}
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: progress.totalVideos > 0
                        ? `${(progress.videosProcessed / progress.totalVideos) * 100}%`
                        : `${(progress.current / progress.total) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Input Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* "All" field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-300">
                    All (No Folder)
                    <span className="ml-2 text-xs text-slate-500">
                      ({getLinkCount('all')} link{getLinkCount('all') !== 1 ? 's' : ''})
                    </span>
                  </label>
                  <button
                    onClick={() => handleAddButtonClick('all')}
                    disabled={loading}
                    className="flex items-center justify-center w-7 h-7 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Add existing playlists/folders"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <textarea
                  value={playlistLinks.all}
                  onChange={(e) => handleLinkChange('all', e.target.value)}
                  placeholder="Paste playlist URLs here or click + to add existing..."
                  rows={6}
                  className="w-full px-3 py-2 bg-slate-900 text-white rounded-lg border border-slate-600 focus:border-sky-500 focus:outline-none font-mono text-xs resize-none"
                  disabled={loading}
                />
              </div>

              {/* Folder color fields */}
              {FOLDER_COLORS.map((color) => (
                <div key={color.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-300">
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: color.hex }}
                      />
                      {color.name}
                      <span className="ml-2 text-xs text-slate-500">
                        ({getLinkCount(color.id)} link{getLinkCount(color.id) !== 1 ? 's' : ''})
                      </span>
                    </label>
                    <button
                      onClick={() => handleAddButtonClick(color.id)}
                      disabled={loading}
                      className="flex items-center justify-center w-7 h-7 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add existing playlists/folders"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                  <textarea
                    value={playlistLinks[color.id]}
                    onChange={(e) => handleLinkChange(color.id, e.target.value)}
                    placeholder="Paste playlist URLs here or click + to add existing..."
                    rows={6}
                    className="w-full px-3 py-2 bg-slate-900 text-white rounded-lg border border-slate-600 focus:border-sky-500 focus:outline-none font-mono text-xs resize-none"
                    style={{ borderColor: playlistLinks[color.id] ? color.hex : undefined }}
                    disabled={loading}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700 flex-shrink-0">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkImport}
              disabled={loading}
              className="px-6 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Importing...' : 'Import All Playlists'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default BulkPlaylistImporter;

