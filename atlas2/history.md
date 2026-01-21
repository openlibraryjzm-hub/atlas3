###5: History

The History system tracks user viewing behavior through watch history and progress tracking. This enables features like resume playback, watch status categorization, and viewing history.

**Related Documentation:**
- **Database Schema**: See `database-schema.md` for `watch_history` table structure and query patterns
- **API Layer**: See `api-bridge.md` for watch history commands (`addToWatchHistory`, `getWatchHistory`, `clearWatchHistory`)
- **Video Player**: See `videoplayer.md` for how videos are added to history during playback
- **State Management**: See `state-management.md` for history-related state (tracked in `playlistStore` via video playback)

---

#### ### 5.1 Watch-time Tracking

**1: User-Perspective Description**

Users experience watch-time tracking automatically in the background:

- **Automatic History Recording**: When a video starts playing, it's automatically added to watch history. 
  - **Deduplication**: If the video is already in history, the old entry is removed and the new one added to the top.
  - **Data Captured**:
    - Video URL and ID
    - Video title (if available from playlist)
    - Thumbnail URL (if available from playlist)
    - Timestamp of when playback started

- **Progress Tracking**: While videos play, progress is tracked:
  - **Every 5 seconds** while playing: Current time and progress percentage saved
  - **On pause/stop**: Final time and progress saved immediately
  - **On video change**: Final time saved before switching videos
  - **Progress percentage**: Calculated as `(current_time / duration) * 100`
  - **Resume playback**: When video loads, automatically seeks to last saved position

- **Watch Status Categories**: Videos are categorized based on progress:
  - **Unwatched**: 0% progress
  - **Partially Watched**: >0% and <85% progress
  - **Watched (Sticky)**: ≥85% progress, or previously marked as fully watched. Stays "Watched" even if re-played from start.

- **History Page Display**: Users see watch history in History page (see Section 4.1.3):
  - Last 100 watched videos presented in a **vertical list**
  - Horizontal cards with large titles
  - Relative timestamps (e.g., "2 hours ago", "Just now")
  - Click to replay videos

- **Sorting and Filtering by Watch Status**: On Videos page, users can:
  - **Sort by Progress**: Order videos by their watch percentage.
  - **Show Unwatched**: Toggle to explicitly show/hide unwatched videos.
  - **Hide Watched**: Toggle to hide fully watched videos.

- **No User Interaction Required**: All tracking happens automatically, no manual actions needed

**2: File Manifest**

**UI/Components:**
- `src/components/YouTubePlayer.jsx`: Player component that tracks progress and triggers history recording
- `src/components/HistoryPage.jsx`: Displays watch history (see Section 4.1.3)
- `src/components/VideosPage.jsx`: Uses progress data for sorting (see Section 4.1.2)
- `src/App.jsx`: Triggers watch history recording when video changes

**State Management:**
- `src/App.jsx` (local state):
  - `dbInitialized`: Boolean for database initialization status
- `src/components/YouTubePlayer.jsx` (local state):
  - `saveIntervalRef`: Interval reference for periodic saves
  - `durationRef`: Video duration reference
- `src/components/VideosPage.jsx` (local state):
  - `watchedVideoIds`: Set of video IDs with ≥85% progress
  - `videoProgress`: Map of video ID to progress percentage

**API/Bridge:**
- `src/api/playlistApi.js`:
  - `addToWatchHistory(videoUrl, videoId, title, thumbnailUrl)` - Adds entry to watch history
  - `getWatchHistory(limit)` - Gets watch history (last N videos)
  - `clearWatchHistory()` - Clears all watch history
  - `getWatchedVideoIds()` - Gets video IDs with ≥85% progress
  - `updateVideoProgress(videoId, videoUrl, duration, currentTime)` - Updates progress
  - `getVideoProgress(videoId)` - Gets progress for specific video
  - `getAllVideoProgress()` - Gets all video progress data

**Backend:**
- `src-tauri/src/commands.rs`: Tauri command handlers
  - `add_to_watch_history` - Adds history entry
  - `get_watch_history` - Gets history entries
  - `clear_watch_history` - Clears history
  - `get_watched_video_ids` - Gets watched video IDs
  - `update_video_progress` - Updates progress
  - `get_video_progress` - Gets progress for video
  - `get_all_video_progress` - Gets all progress
- `src-tauri/src/database.rs`: SQLite operations
- Database tables:
  - `watch_history`: History entries (id, video_url, video_id, title, thumbnail_url, watched_at)
  - `video_progress`: Progress tracking (id, video_id, video_url, duration, last_progress, progress_percentage, last_updated, has_fully_watched)

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **Watch History Recording Flow:**
   - Video URL changes → `useEffect` in `App.jsx` (line 148) triggers
   - Checks if valid video → Skips default fallback URL
   - Extracts video ID → `extractVideoId(currentVideoUrl)`
   - Gets video metadata → From `currentPlaylistItems[currentVideoIndex]`
   - Extracts title and thumbnail → From playlist item if available
   - Calls `addToWatchHistory(videoUrl, videoId, title, thumbnailUrl)` → API call
   - Backend inserts record → `INSERT INTO watch_history` with current timestamp
   - Returns new record ID → Stored in database

2. **Progress Tracking Flow (During Playback):**
   - Video starts playing → `onStateChange` event fires (YouTubePlayer.jsx line 119)
   - If state is `PLAYING` → Sets up interval (line 122)
   - Every 5 seconds → Interval callback executes:
     - Gets current time → `playerRef.current.getCurrentTime()`
     - Gets duration → `durationRef.current || playerRef.current.getDuration()`
     - Saves to localStorage → `savePlaybackTime(id, currentTime)` (quick access)
     - Saves to database → `saveVideoProgress(id, videoUrl, duration, currentTime)`
   - Backend calculates progress → `(current_time / duration) * 100`
   - Backend updates record → `INSERT OR REPLACE INTO video_progress`
   - Progress percentage stored → Used for watch status categorization

3. **Progress Tracking Flow (On Pause/Stop):**
   - Video paused/stopped → `onStateChange` event fires
   - If state is not `PLAYING` → Clears interval (line 154)
   - Immediately saves progress → Gets current time and duration
   - Saves to localStorage → `savePlaybackTime(id, currentTime)`
   - Saves to database → `saveVideoProgress(id, videoUrl, duration, currentTime)`
   - Final progress recorded → Ensures no data loss on pause

4. **Resume Playback Flow:**
   - Video loads → `onReady` event fires (YouTubePlayer.jsx line 103)
   - Gets stored time → `getStoredPlaybackTime(id)` from localStorage
   - If stored time > 0 → `event.target.seekTo(storedTime, true)` (line 116)
   - Video starts at last position → User continues where they left off
   - Duration retrieved → `event.target.getDuration()` stored in `durationRef`

5. **Progress Calculation Flow:**
   - Backend receives update → `update_video_progress` command (database.rs line 725)
   - Checks for existing duration → Queries `video_progress` table
   - Uses provided duration or existing → `duration.or(existing_duration)`
   - Calculates percentage → `(current_time / duration) * 100` (line 747)
   - Clamps to 0-100% → `.min(100.0).max(0.0)`
   - If no duration → Stores 0% temporarily, updates when duration available
   - Updates record → `INSERT OR REPLACE` with new progress

6. **Watch Status Categorization Flow:**
   - VideosPage loads → `useEffect` (line 70) loads progress data
   - Calls `getWatchedVideoIds()` → Gets video IDs with ≥85% progress
   - Stores in Set → `setWatchedVideoIds(new Set(watchedIds))`
   - Calls `getAllVideoProgress()` → Gets all progress percentages
   - Stores in Map → `setVideoProgress(progressMap)`
   - Sorting uses progress → `getVideoWatchStatus()` (line 399) categorizes:
     - 0% → Unwatched
     - >0% and <85% → Partially Watched
     - ≥85% → Watched
   - Grid updates → Shows sorted videos

7. **History Retrieval Flow:**
   - HistoryPage loads → `loadHistory()` (HistoryPage.jsx line 21)
   - Calls `getWatchHistory(100)` → Gets last 100 entries
   - Backend queries → `SELECT * FROM watch_history ORDER BY watched_at DESC LIMIT 100`
   - Returns array → Sorted by most recent first
   - Displays in grid → Cards show title, thumbnail, relative timestamp

8. **Cleanup Flow:**
   - Video component unmounts → Cleanup function (YouTubePlayer.jsx line 163)
   - Gets final time → `playerRef.current.getCurrentTime()`
   - Saves to localStorage → `savePlaybackTime(id, currentTime)`
   - Saves to database → `saveVideoProgress(id, videoUrl, duration, currentTime)`
   - Clears interval → `clearInterval(saveIntervalRef.current)`
   - Destroys player → `playerRef.current.destroy()`

**Source of Truth:**
- Database `watch_history` table - Source of Truth for watch history (ordered by `watched_at DESC`)
- Database `video_progress` table - Source of Truth for progress data (one record per video_id)
- `localStorage` (`playback_time_{videoId}`) - Quick access cache for resume playback (non-authoritative)

**State Dependencies:**
- When `currentVideoUrl` changes → Watch history entry created → New record in database
- When video plays → Progress saved every 5 seconds → `progress_percentage` updated
- When video pauses → Progress saved immediately → Final position recorded
- When video unmounts → Final progress saved → No data loss
- When progress updates → `videoProgress` Map updated → Sorting may change
- When `watchedVideoIds` Set updates → Watch status categorization changes → Sorting updates
- When history page loads → History retrieved → Grid displays last 100 videos
- When video loads → Stored time retrieved → Video seeks to last position