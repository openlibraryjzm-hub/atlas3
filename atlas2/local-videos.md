###7: Local Video Playback

The Local Video Playback system allows users to play video files from their local computer in the main player. The system supports various video formats and integrates seamlessly with the existing playlist and progress tracking infrastructure.

**Related Documentation:**
- **Video Player**: See `videoplayer.md` for main player architecture and progress tracking
- **Import/Export**: See `importexport.md` for file upload patterns (JSON import uses similar file handling)
- **Database Schema**: See `database-schema.md` for `playlist_items` table structure and `is_local` field
- **API Layer**: See `api-bridge.md` for `add_video_to_playlist` command with `is_local` parameter
- **State Management**: See `state-management.md` for `playlistStore` (current video index, playback state)

**Note**: The system uses a **simplified architecture**:
- **Native mpv Player**: Uses `tauri-plugin-libmpv` for full codec support (including HEVC/H.265) via FFmpeg
  - Handles large files natively by streaming directly from disk (no memory overload issues)
  - Uses direct file paths - no HTTP server needed
  - Supports all formats/codecs supported by FFmpeg
- **Streaming Server**: HTTP server (Axum) on port 1422 - **only used by HTML5 fallback player**
  - Required for `LocalVideoPlayer` component (browser-compatible formats only)
  - Provides HTTP range request support for HTML5 video element
  - Not needed for native mpv player (mpv streams from disk natively)

**Architecture Decision**: mpv handles large files efficiently by streaming directly from disk, eliminating the need for a streaming server for the native player. The streaming server is only maintained for the HTML5 fallback player (`LocalVideoPlayer`) which requires HTTP URLs for range requests.

---

#### ### 7.1 Local Video Player

**1: User-Perspective Description**

Users see local video files playing in the main player area, just like YouTube videos:

- **Player Display**: Native mpv player embedded in the main player slot
  - Takes up the entire main player area (varies by view mode: full/half/quarter)
  - Black background when loading or if video invalid
  - Native mpv controls (play/pause, volume, fullscreen, seek, etc.)
  - Renders directly to window (native rendering, not HTML5)

- **Automatic Playback**: Videos start playing automatically when loaded
  - Autoplay enabled via mpv `pause` property
  - Seeks to last saved position if available (resume playback)

- **Progress Tracking**: Progress is automatically saved (same as YouTube videos):
  - Every 5 seconds while playing (via mpv property observation)
  - On pause/stop
  - On video change
  - On component unmount

- **Resume Playback**: When a video loads, it automatically seeks to the last watched position
  - Uses localStorage for quick access (`playback_time_{videoId}`)
  - Falls back to database if localStorage unavailable
  - Uses mpv `time-pos` property to seek

- **Video Source**: Local player displays video from `currentPlaylistItems[currentVideoIndex]` when `is_local` is true
  - Controlled by `PlayerController` navigation
  - Updates when user navigates playlists/videos
  - File paths stored in `video_url` field (absolute file system paths)
  - Native mpv player uses direct file paths (no HTTP server needed)
  - HTML5 fallback player uses streaming server URLs for range request support

- **Format & Codec Support**: Full codec support via mpv/FFmpeg:
  - **Working**: MP4 (H.264/MPEG-4 AVC), WebM (VP8)
  - **Native Support**: All formats/codecs supported by FFmpeg including:
    - MKV with HEVC/H.265 (Mpeg-H Part 2)
    - MP4, WebM, MKV, AVI, MOV, FLV, WMV, M4V, MPG, MPEG
    - All audio codecs (AAC, DTS, AC3, etc.)
  - **Memory Efficient**: Streams from disk, handles files of any size (GB+) with minimal RAM usage

**2: File Manifest**

**UI/Components:**
- `src/components/NativeVideoPlayer.jsx`: Native mpv player component using tauri-plugin-libmpv-api
- `src/components/LocalVideoPlayer.jsx`: Fallback HTML5 video player (for browser-compatible formats)
- `src/LayoutShell.jsx`: Layout component that positions main player (shared with YouTube player)
- `src/App.jsx`: Orchestrates player selection (routes to NativeVideoPlayer or YouTubePlayer based on `is_local` flag)

**State Management:**
- `src/store/playlistStore.js`:
  - `currentPlaylistItems`: Array of videos in current playlist (includes `is_local` flag)
  - `currentVideoIndex`: Index of currently playing video
  - `currentPlaylistId`: ID of current playlist
- `src/App.jsx` (local state):
  - `currentVideoUrl`: Computed from `currentPlaylistItems[currentVideoIndex]`
  - `isCurrentVideoLocal`: Computed from `currentPlaylistItems[currentVideoIndex].is_local`
  - `currentVideoId`: Computed from `currentPlaylistItems[currentVideoIndex].video_id`
- `src/components/NativeVideoPlayer.jsx` (local state):
  - `isInitialized`: Boolean indicating if mpv is initialized
  - `error`: Error message if video fails to load
  - `containerRef`: Reference to container div (mpv renders to window)
  - `saveIntervalRef`: Reference to progress saving interval
  - `unlistenRef`: Reference to mpv property observation cleanup function

**API/Bridge:**
- `tauri-plugin-libmpv-api`: Native mpv player API
  - `init()` - Initialize mpv instance
  - `command('loadfile', [path])` - Load video file
  - `setProperty(name, value)` - Set mpv properties (pause, time-pos, volume, etc.)
  - `getProperty(name, type)` - Get mpv properties (time-pos, duration, pause, etc.)
  - `observeProperties(properties, callback)` - Observe property changes for progress tracking
  - `destroy()` - Cleanup mpv instance
- `src/api/playlistApi.js`:
  - `updateVideoProgress(videoId, videoUrl, duration, currentTime)` - Saves progress to database (shared with YouTube)
- `src-tauri/src/commands.rs`:
  - `get_video_stream_url(filePath)` - Returns HTTP streaming URL from streaming server

**Backend:**
- `src-tauri/src/commands.rs`: Tauri command handlers (shared with YouTube)
  - `get_video_stream_url()` - Returns streaming server URL for file
- `src-tauri/src/streaming_server.rs`: HTTP streaming server implementation
  - `StreamingServer` struct - Manages file registry and HTTP server
  - `stream_file()` handler - Handles HTTP range requests for video streaming
  - Runs on port 1422 (localhost)
  - Uses Axum web framework with CORS support
- `src-tauri/src/lib.rs`: Tauri app setup
  - Initializes streaming server on app startup
  - Registers `tauri-plugin-libmpv` plugin
  - Spawns streaming server in background task
- `src-tauri/src/database.rs`: SQLite operations (shared with YouTube)
- Database tables:
  - `playlist_items`: Stores video data with `is_local` flag
  - `video_progress`: Progress tracking (shared with YouTube videos)
- `localStorage`: Quick access cache for resume playback (shared with YouTube)
- `src-tauri/lib/`: Contains mpv DLLs (libmpv-wrapper.dll, libmpv-2.dll) for Windows

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **Player Initialization Flow:**
   - Component mounts → `useEffect` (NativeVideoPlayer.jsx) initializes mpv
   - Checks if `videoUrl` exists → If not, shows "No video file selected"
   - Initializes mpv → `init()` from tauri-plugin-libmpv-api
   - Gets file path → Removes `file://` prefix if present
   - Loads video → `command('loadfile', [filePath])` loads video into mpv
   - Gets stored playback time → `getStoredPlaybackTime(id)` from localStorage
   - Seeks to stored time → `setProperty('time-pos', storedTime)` if > 0
   - Starts playback → `setProperty('pause', false)` begins autoplay
   - Sets up property observation → `observeProperties()` for progress tracking

2. **Video Load Flow:**
   - `currentVideoUrl` changes → `App.jsx` checks `isCurrentVideoLocal`
   - If local → Routes to `NativeVideoPlayer` component
   - If YouTube → Routes to `YouTubePlayer` component
   - Component re-renders → `useEffect` detects `videoUrl` change
   - Old video cleanup → Cleanup function saves final progress, calls `destroy()`
   - New video initialized → `init()` creates new mpv instance
   - Loads new video → `command('loadfile', [newFilePath])`
   - Seeks to stored time → `setProperty('time-pos', storedTime)` if > 0
   - Video starts playing → `setProperty('pause', false)` begins autoplay

3. **Progress Tracking Flow:**
   - Property observation active → `observeProperties()` monitors mpv state
   - Every property change → Callback fires with updated values
   - Gets current time → `getProperty('time-pos', 'double')`
   - Gets duration → `getProperty('duration', 'double')`
   - Gets pause state → `getProperty('pause', 'flag')`
   - If playing → Sets up interval (every 5 seconds):
     - Saves to localStorage → `savePlaybackTime(id, currentTime)`
     - Saves to database → `saveVideoProgress(id, videoUrl, duration, currentTime)`
   - If paused → Saves immediately, clears interval
   - On unmount → Cleanup function saves final progress, destroys mpv

4. **Resume Playback Flow:**
   - Video loads → `command('loadfile')` completes
   - Gets stored time → `getStoredPlaybackTime(id)` from localStorage
   - If stored time > 0 → `setProperty('time-pos', storedTime)`
   - mpv seeks to position → User continues where they left off
   - If no stored time → Video starts from beginning

5. **Streaming Server Flow (HTML5 Fallback Only):**
   - File path received → `get_video_stream_url(filePath)` command called (only for `LocalVideoPlayer`)
   - Streaming server registers file → Creates hash-based file ID
   - Returns HTTP URL → `http://127.0.0.1:1422/stream/{file_id}`
   - Browser/player requests video → HTTP GET with optional Range header
   - Server handles range request → Reads specific byte range from file
   - Returns partial content → 206 Partial Content response with Content-Range header
   - Enables efficient seeking → No need to load entire file into memory
   - **Note**: Native mpv player bypasses this entirely, using direct file paths

**Source of Truth:**
- `playlistStore.currentPlaylistItems` - Source of Truth for video list (includes `is_local` flag)
- `playlistStore.currentVideoIndex` - Source of Truth for current video position
- `App.jsx` computed `currentVideoUrl` - Derived from playlist store
- `App.jsx` computed `isCurrentVideoLocal` - Derived from playlist store
- Database `playlist_items` table - Source of Truth for video data (including file paths)
- Database `video_progress` table - Source of Truth for progress data (shared with YouTube)
- `localStorage` (`playback_time_{videoId}`) - Quick access cache for resume

**State Dependencies:**
- When `currentVideoIndex` changes → `currentVideoUrl` recalculates → Player receives new video
- When `isCurrentVideoLocal` is true → Routes to `NativeVideoPlayer`, false → Routes to `YouTubePlayer`
- When `currentPlaylistItems` changes → Video list updates → Navigation works with new list
- When video plays → Progress saved every 5 seconds → Database updated
- When video pauses → Progress saved immediately → Final position recorded
- When video unmounts → Final progress saved → No data loss
- When video loads → Stored time retrieved → Video seeks to last position

---

#### ### 7.2 Local Video Upload

**1: User-Perspective Description**

Users can add local video files to playlists through a dedicated upload interface:

- **Upload Modal**: Full-screen or modal interface for selecting and adding local videos
  - "Select Video Files" button opens file picker
  - File picker filters to video formats: MP4, MKV, AVI, MOV, WebM, FLV, WMV, M4V, MPG, MPEG
  - Supports multiple file selection

- **File Selection**: Tauri file dialog opens when "Select Video Files" is clicked
  - Native OS file picker
  - Multiple files can be selected at once
  - Selected files displayed in list below button

- **Progress Display** (during upload):
  - Progress message: Current step (e.g., "Adding videos...", "Added 3/5 videos...")
  - Progress counter: `current/total` format
  - Progress bar: Blue bar showing percentage completion
  - Updates in real-time as videos are processed

- **Error Display**: Red error box appears if upload fails, showing error message

- **Submit Button**: "Add X Video(s) to Playlist" button (disabled during upload, shows "Adding Videos..." when loading)

- **Close Button**: X button in top-right corner (disabled during upload)

**2: File Manifest**

**UI/Components:**
- `src/components/LocalVideoUploader.jsx`: Main upload modal component

**State Management:**
- `src/components/LocalVideoUploader.jsx` (local state):
  - `selectedFiles`: Array of selected file paths (strings)
  - `loading`: Boolean for upload in progress
  - `error`: Error message string (null if no error)
  - `progress`: Object with `{ current, total, message }` for progress tracking

**API/Bridge:**
- `src/api/playlistApi.js`:
  - `addVideoToPlaylist(playlistId, videoUrl, videoId, title, thumbnailUrl, isLocal)` - Adds video to playlist with `isLocal=true`
- `src-tauri/src/commands.rs`:
  - `select_video_files()` - Opens Tauri file dialog, returns array of selected file paths

**Backend:**
- `src-tauri/src/commands.rs`: Tauri command handlers
- `src-tauri/src/database.rs`: SQLite operations
- Database tables:
  - `playlists`: Playlist metadata
  - `playlist_items`: Videos in playlists (with `is_local` flag)

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **File Selection Flow:**
   - User clicks "Select Video Files" → `handleFileSelect()` (line 15)
   - Calls Tauri command → `invoke('select_video_files')`
   - Tauri opens file dialog → Native OS file picker appears
   - User selects files → Dialog returns array of file paths
   - Updates state → `setSelectedFiles(filePaths)`
   - UI updates → Selected files displayed in list

2. **Upload Flow:**
   - User clicks "Add Video(s) to Playlist" → `handleUpload()` (line 40)
   - Validates selection → Checks if files selected and playlist ID exists
   - Sets loading state → `setLoading(true)`, clears error
   - Loops through files → For each file path:
     - Extracts filename → `pathParts[pathParts.length - 1]`
     - Creates video ID → `local_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`
     - Adds to playlist → `addVideoToPlaylist(playlistId, videoUrl, videoId, fileName, null, true)`
     - Updates progress → Shows "Added X/total videos..."
   - Shows success message → "Successfully added X video(s)!"
   - Calls `onUploadComplete()` callback → Closes modal, refreshes playlist list

3. **Database Storage Flow:**
   - `addVideoToPlaylist` called with `isLocal=true` → Tauri command receives parameters
   - Database insert → `INSERT INTO playlist_items (..., is_local) VALUES (..., 1)`
   - Video stored → File path in `video_url`, `is_local=1` in database
   - Returns item ID → Frontend receives confirmation

4. **Error Handling:**
   - File selection cancelled → Returns `null`, no error shown
   - No files selected → Shows error, stops upload
   - Playlist ID missing → Shows error, stops upload
   - File add failures → Logged to console, upload continues with remaining files
   - Final error summary → Shows error message if any failures

**Source of Truth:**
- Database `playlists` table - Source of Truth for playlist data
- Database `playlist_items` table - Source of Truth for video data (including local file paths)
- Tauri file dialog - Source of Truth for user-selected file paths

**State Dependencies:**
- When files selected → `selectedFiles` updated → File list displayed, submit button enabled
- When upload starts → `loading: true` → Submit button disabled, progress bar appears
- When progress updates → Progress bar width recalculates → Visual feedback updates
- When upload completes → `onUploadComplete()` called → PlaylistsPage refreshes, new videos appear in grid
- When error occurs → `error` state set → Red error box appears, upload stops

---

## Integration with Existing Systems

### Player Routing

The system automatically routes to the appropriate player based on the `is_local` flag:

- **Local Videos** (`is_local = true`): Uses `NativeVideoPlayer` component (mpv-based)
- **YouTube Videos** (`is_local = false` or missing): Uses `YouTubePlayer` component

Routing logic in `App.jsx`:
```javascript
isCurrentVideoLocal ? (
  <NativeVideoPlayer videoUrl={currentVideoUrl} videoId={currentVideoId} playerId="main" />
) : (
  <YouTubePlayer videoUrl={currentVideoUrl} playerId="main" />
)
```

### Streaming Server Architecture (HTML5 Fallback Only)

The streaming server provides HTTP range request support **only for the HTML5 fallback player** (`LocalVideoPlayer`):

- **Server**: Axum HTTP server running on `127.0.0.1:1422`
- **Endpoint**: `/stream/:file_id` - Streams video files with range request support
- **File Registry**: Maps file IDs (hashed paths) to actual file paths
- **Range Requests**: Supports HTTP Range headers for efficient seeking
- **Memory Efficient**: Streams files in chunks, doesn't load entire file into memory
- **CORS**: Permissive CORS enabled for localhost access
- **Usage**: Only used by `LocalVideoPlayer` component (browser-compatible formats)

**How it works:**
1. File path registered → Hash-based ID created and stored in registry
2. HTTP URL returned → `http://127.0.0.1:1422/stream/{file_id}`
3. HTML5 player requests video → Browser makes HTTP GET request with Range header
4. Range request handled → Server reads specific byte range from file
5. Partial content returned → 206 status with Content-Range header
6. Efficient seeking → HTML5 player can seek without loading entire file

**Note**: The native mpv player (`NativeVideoPlayer`) does **not** use the streaming server. It loads files directly from disk using file paths, and mpv handles large files efficiently by streaming natively.

### Progress Tracking

Local videos use the same progress tracking system as YouTube videos:
- Same database table (`video_progress`)
- Same localStorage keys (`playback_time_{videoId}`)
- Same save intervals (every 5 seconds)
- Same resume playback behavior

### Playlist Integration

Local videos appear in playlists alongside YouTube videos:
- Same grid display (VideosPage, PlaylistsPage)
- Same navigation controls (next/prev in PlayerController)
- Same folder assignment system
- Same watch history tracking

## Implementation Status

### Current Implementation (2026-01-08)

**✅ Implemented:**
- Streaming server (Axum HTTP server on port 1422)
- Native mpv player component (`NativeVideoPlayer.jsx`)
- HTTP range request support for efficient seeking
- Progress tracking via mpv property observation
- Resume playback support
- Codec support via mpv/FFmpeg (all formats)

**✅ Fixed:**
- DLL loading on Windows: Automatic DLL copying in `build.rs`
  - DLLs are automatically copied to `target/debug/` or `target/release/` during build
  - Production builds bundle DLLs via `tauri.conf.json` resources
  - No manual copying required

**📋 Pending:**
- Window handle configuration for mpv rendering (if needed)
- Fallback to HTML5 player if mpv fails to initialize

### Codec Support Status

| Format | Codec | Status | Player |
|--------|-------|--------|--------|
| MP4 | H.264/MPEG-4 AVC | ✅ Working | Native mpv (direct file path) |
| WebM | VP8 | ✅ Working | Native mpv (direct file path) |
| MKV | HEVC/H.265 | ✅ Working | Native mpv (direct file path) |
| All formats | All FFmpeg codecs | ✅ Supported | Native mpv (direct file path) |
| MP4/WebM | Browser-compatible | ✅ Working | HTML5 fallback (via streaming server) |

**Browser Limitations:**
- HEVC/H.265 codec is **not supported** by most browsers (Chrome, Firefox, Edge on Windows)
- Only Safari on macOS/iOS supports HEVC with hardware acceleration
- This is why native mpv player is essential for full codec support

## Future Enhancements

### File Management

Future enhancements may include:
- Copy files to app data directory (for portability)
- File validation and format checking
- Thumbnail generation for local videos
- File path validation and error handling for moved/deleted files
- Automatic codec detection and player selection
- Unified player for YouTube (mpv can stream YouTube URLs via yt-dlp)

