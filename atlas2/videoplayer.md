###6: Video Player

The Video Player system provides dual YouTube player support infrastructure, allowing users to watch two videos simultaneously. The main player is the primary playback area, while the secondary player appears as an overlay in the bottom-left quarter of the main player area.

**Note**: As of 2026-01-08, the second player functionality is currently disabled. The mode toggle is locked to player 1 (main player only), and the amber "2" button has been removed from video hover overlays. The infrastructure remains in the codebase but is not accessible to users.

**Related Documentation:**
- **Database Schema**: See `database-schema.md` for `video_progress` table structure and watch status categories
- **API Layer**: See `api-bridge.md` for video progress commands (`updateVideoProgress`, `getVideoProgress`, `getAllVideoProgress`)
- **History**: See `history.md` for watch history tracking (videos added to history during playback)
- **State Management**: See `state-management.md` for `playlistStore` (current video index, playback state)
- **Player Controller**: See `advanced-player-controller.md` for video navigation controls and dual player management

**Note**: Progress tracking now includes a "Sticky" fully watched status. Once a video is marked as fully watched (≥85%), it remains fully watched even if re-watched from the beginning, unless manually reset.

---

#### ### 6.1 Main Player

**1: User-Perspective Description**

Users see the main YouTube player as the primary video playback area:

- **Player Display**: Full YouTube iframe player embedded in the main player slot
  - Takes up the entire main player area (varies by view mode: full/half/quarter)
  - Black background when loading or if video invalid
  - Standard YouTube player controls (play/pause, volume, fullscreen, etc.)

- **Automatic Playback**: Videos start playing automatically when loaded
  - Autoplay enabled via `autoplay: 1` player parameter
  - **Playlist Autoplay**: When a video ends, the player automatically advances to the next video in the playlist (orchestrated by `App.jsx`).

- **Progress Tracking**: Progress is automatically saved (see Section 5.1):
  - Every 5 seconds while playing
  - On pause/stop
  - On video change
  - On component unmount

- **Smart Resume**: When a video loads, it checks the last watched position:
  - **Resume**: If in the middle of the video, it seeks to the last saved position.
  - **Reset (Smart Resume)**: If the saved position is near the end (within 5-10s or >95% duration), it resets to the beginning (0:00). This prevents videos from getting "stuck" at the end.
  - Uses localStorage for quick access (`playback_time_{videoId}`) with database fallback.

- **Player Controls**: Standard YouTube player controls accessible via iframe:
  - Play/pause button
  - Volume control
  - Progress bar with seek
  - Fullscreen button
  - Settings menu
  - Quality selection

- **Video Source**: Main player displays video from `currentPlaylistItems[currentVideoIndex]`
  - Controlled by `PlayerController` navigation
  - Updates when user navigates playlists/videos
  - (**Mode Switcher removed**: Control is exclusively for main player now)

**2: File Manifest**

**UI/Components:**
- `src/components/YouTubePlayer.jsx`: Main YouTube player component (shared by both players)
- `src/components/NativeVideoPlayer.jsx`: MPV-based native player for local files
- `src/components/LocalVideoPlayer.jsx`: HTML5 video player for standard local files
- `src/LayoutShell.jsx`: Layout component that positions main player
- `src/App.jsx`: Orchestrates video URL, state, and **autoplay logic** (`handleVideoEnded`)

**State Management:**
- `src/store/playlistStore.js`:
  - `currentPlaylistItems`: Array of videos in current playlist
  - `currentVideoIndex`: Index of currently playing video
  - `currentPlaylistId`: ID of current playlist
- `src/App.jsx` (local state):
  - `currentVideoUrl`: Computed from `currentPlaylistItems[currentVideoIndex]`
- `src/components/YouTubePlayer.jsx` (local state):
  - `apiReady`: Boolean for YouTube IFrame API readiness
  - `playerRef`: Reference to YouTube player instance
  - `saveIntervalRef`: Interval reference for periodic progress saves
  - `durationRef`: Video duration reference

**API/Bridge:**
- YouTube IFrame API: External API loaded from `https://www.youtube.com/iframe_api`
- `src/api/playlistApi.js`:
  - `updateVideoProgress(videoId, videoUrl, duration, currentTime)` - Saves progress to database

**Backend:**
- `src-tauri/src/commands.rs`: Tauri command handlers
- `src-tauri/src/database.rs`: SQLite operations
- Database tables:
  - `video_progress`: Progress tracking (see Section 5.1)
- `localStorage`: Quick access cache for resume playback

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **Player Initialization Flow:**
   - Component mounts → `useEffect` (YouTubePlayer.jsx line 71) loads YouTube IFrame API
   - Checks if API already loaded → `window.YT && window.YT.Player`
   - If not loaded → Creates script tag → Loads `https://www.youtube.com/iframe_api`
   - Sets up callback → `window.onYouTubeIframeAPIReady` → Sets `apiReady: true`
   - When API ready and video ID available → `useEffect` (line 90) initializes player
   - Creates unique player ID → `youtube-player-${playerId}-${videoId}` (e.g., `youtube-player-main-abc123`)
   - Gets stored playback time → `getStoredPlaybackTime(id)` from localStorage
   - **Smart Resume Check**: Checks if time is near end (within threshold) → Resets to 0 if true
   - Creates player instance → `new window.YT.Player(uniquePlayerId, {...})`
   - Sets autoplay → `autoplay: 1` in playerVars
   - Sets start time → `start: Math.floor(storedTime)` (or 0 if reset)

2. **Video Load Flow:**
   - `currentVideoUrl` changes → `App.jsx` passes new URL to `YouTubePlayer`
   - Component re-renders → `useEffect` (line 90) detects `id` change
   - Old player destroyed → Cleanup function saves final progress
   - New player initialized → Creates new YouTube player instance
   - Video loads → `onReady` event fires (line 103)
   - Gets duration → `event.target.getDuration()` stored in `durationRef`
   - Seeks to stored time → `event.target.seekTo(storedTime, true)` if > 0 (and not reset by Smart Resume)
   - Video starts playing → Autoplay begins playback

3. **Progress Tracking Flow:**
   - Video starts playing → `onStateChange` event fires (line 119)
   - If state is `PLAYING` → Sets up interval (line 122)
   - Every 5 seconds → Interval callback:
     - Gets current time → `playerRef.current.getCurrentTime()`
     - Gets duration → `durationRef.current || playerRef.current.getDuration()`
     - Saves to localStorage → `savePlaybackTime(id, currentTime)` (quick access)
     - Saves to database → `saveVideoProgress(id, videoUrl, duration, currentTime)`
     - **Sticky Status**: Backend calculates `has_fully_watched`. If currently ≥85% OR previously fully watched, status remains persistent.
   - If state is paused/stopped → Clears interval, saves immediately
   - On unmount → Cleanup function saves final progress

4. **Autoplay Flow (Video End):**
   - Video ends → `onStateChange` detects `ENDED` state
   - Calls `onEnded` prop (passed from `App.jsx`)
   - `App.jsx` `handleVideoEnded` checks for next video
   - Calls `nextVideo()` in `playlistStore`
   - Updates `currentVideoIndex` → New video loads

5. **Smart Resume Flow:**
   - Video loads → `getStoredPlaybackTime(id)` called
   - Checks duration vs stored time
   - If `storedTime > duration - threshold` (e.g. 10s or 95%)
   - Sets start time to 0
   - Updates localStorage with 0
   - Playback starts from beginning

6. **Video URL Update Flow:**
   - User navigates video → `currentVideoIndex` changes in `playlistStore`
   - `currentVideoUrl` recalculated → `useMemo` in `App.jsx` (line 131)
   - New URL passed to player → `YouTubePlayer` receives new `videoUrl` prop
   - Component detects change → `useEffect` dependency array includes `videoUrl`
   - Old player cleanup → Saves final progress, destroys player
   - New player initialization → Creates new instance with new video

**Source of Truth:**
- `playlistStore.currentPlaylistItems` - Source of Truth for video list
- `playlistStore.currentVideoIndex` - Source of Truth for current video position
- `App.jsx` computed `currentVideoUrl` - Derived from playlist store
- Database `video_progress` table - Source of Truth for progress data
- `localStorage` (`playback_time_{videoId}`) - Quick access cache for resume

**State Dependencies:**
- When `currentVideoIndex` changes → `currentVideoUrl` recalculates → Player receives new video
- When `currentPlaylistItems` changes → Video list updates → Navigation works with new list
- When video plays → Progress saved every 5 seconds → Database updated
- When video pauses → Progress saved immediately → Final position recorded
- When video unmounts → Final progress saved → No data loss
- When video loads → Stored time retrieved → Video seeks to last position

---

#### ### 6.2 Secondary Player

**1: User-Perspective Description**

Users see a secondary YouTube player as an overlay in the bottom-left quarter of the main player area:

- **Player Position**: Bottom-left quarter of main player area
  - Positioned absolutely: `bottom: 0, left: 0`
  - Size: 50% width, 50% height of main player
  - Z-index: 10 (above main player content, below controls)
  - Only visible in full and half view modes (hidden in quarter mode)

- **Player Display**: Same YouTube iframe player as main player
  - Black background when loading or if video invalid
  - Standard YouTube player controls
  - Independent playback from main player

- **Video Selection** (DISABLED): Second player selection is currently disabled:
  - **Amber "2" Button**: Removed from video card hover overlays (VideosPage, HistoryPage)
  - Second player cannot be accessed via UI
  - Infrastructure remains in codebase but is not accessible

- **Independent Playback**: Second player operates independently:
  - Can play different video than main player
  - Can be paused while main player plays
  - Has its own progress tracking
  - Has its own resume playback

- **Mode Switcher**: Users can switch active player via mode switcher button in PlayerController:
  - Button is disabled and locked to "1" (main player only)
  - All controls always route to main player
  - Video info display always shows main player's video info

- **Playlist Context**: Second player maintains its own playlist context:
  - `secondPlayerPlaylistId`: ID of playlist containing current video
  - `secondPlayerPlaylistItems`: Array of videos in that playlist
  - `secondPlayerVideoIndex`: Index of current video in playlist
  - Navigation (next/prev) works within second player's playlist

- **Visual Indicator**: In debug mode, second player area shows amber border and label

**2: File Manifest**

**UI/Components:**
- `src/components/YouTubePlayer.jsx`: Shared player component (uses `playerId="second"`)
- `src/LayoutShell.jsx`: Positions second player as overlay (lines 133-176)
- `src/App.jsx`: Manages second player state and video selection
- `src/components/VideoCard.jsx`: (Second player button removed from hover overlay)
- `src/components/VideosPage.jsx`: (Second player handler prop still exists but not used)
- `src/components/HistoryPage.jsx`: (Second player handler prop still exists but not used)
- `src/components/PlayerController.jsx`: Mode switcher and control routing

**State Management:**
- `src/App.jsx` (local state):
  - `secondPlayerVideoUrl`: Current video URL for second player
  - `secondPlayerVideoIndex`: Index of current video in second player's playlist
  - `secondPlayerPlaylistId`: ID of playlist containing second player's video
  - `secondPlayerPlaylistItems`: Array of videos in second player's playlist
  - `activePlayer`: 1 (main) or 2 (second) - controls which player is active
- `src/components/PlayerController.jsx` (props):
  - `activePlayer`: Current active player (1 or 2)
  - `onActivePlayerChange`: Callback to update active player
  - `secondPlayerVideoUrl`: Second player's video URL
  - `secondPlayerVideoIndex`: Second player's video index
  - `onSecondPlayerVideoIndexChange`: Callback to update second player index
  - `secondPlayerPlaylistId`: Second player's playlist ID
  - `secondPlayerPlaylistItems`: Second player's playlist items

**API/Bridge:**
- YouTube IFrame API: Same as main player
- `src/api/playlistApi.js`:
  - `getAllPlaylists()` - Searches all playlists to find video
  - `getPlaylistItems(playlistId)` - Gets videos in playlist
  - `updateVideoProgress(videoId, videoUrl, duration, currentTime)` - Saves progress (shared with main player)

**Backend:**
- `src-tauri/src/commands.rs`: Tauri command handlers (shared with main player)
- `src-tauri/src/database.rs`: SQLite operations (shared with main player)
- Database tables: Same as main player (shared progress tracking)

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **Second Player Selection Flow:**
   - User clicks amber "2" button → `onSecondPlayerSelect(videoUrl)` (VideoCard.jsx line 132)
   - Handler in `App.jsx` → `handleSecondPlayerSelect(videoUrl)` (line 250)
   - Sets video URL → `setSecondPlayerVideoUrl(videoUrl)`
   - Searches for video in playlists:
     - First checks current playlist → `currentPlaylistItems.findIndex()`
     - If not found → Loops through all playlists → `getAllPlaylists()`
     - For each playlist → `getPlaylistItems(playlist.id)`
     - Finds video index → `items.findIndex(item => item.video_url === videoUrl)`
     - When found → Sets second player's playlist context:
       - `setSecondPlayerVideoIndex(index)`
       - `setSecondPlayerPlaylistId(playlist.id)`
       - `setSecondPlayerPlaylistItems(items)`
   - Second player renders → `LayoutShell` conditionally renders if `secondPlayerVideoUrl` exists
   - Player initializes → Creates YouTube player with `playerId="second"`

2. **Second Player Navigation Flow:**
   - User navigates (next/prev) in mode 2 → `handleNextVideo()` or `handlePrevVideo()` in PlayerController
   - Checks active player → `if (!isModeLeft)` (mode 2)
   - Uses second player's playlist → `secondPlayerPlaylistItems`
   - Updates index → `onSecondPlayerVideoIndexChange(newIndex)`
   - Updates video URL → `setSecondPlayerVideoUrl(newVideoUrl)`
   - Player updates → New video loads in second player

3. **Mode Switching Flow:**
   - User clicks mode switcher → `handleModeToggle()` (PlayerController.jsx line 215)
   - Toggles `isModeLeft` → `setIsModeLeft(!isModeLeft)`
   - Updates parent → `onActivePlayerChange(newMode ? 1 : 2)`
   - `App.jsx` updates → `setActivePlayer(newMode ? 1 : 2)`
   - Controls route to active player → All handlers check `isModeLeft` or `activePlayer`
   - Video info updates → Shows active player's video info

4. **Second Player Progress Tracking Flow:**
   - Second player uses same `YouTubePlayer` component → Same progress tracking logic
   - Unique player ID → `youtube-player-second-${videoId}` prevents conflicts
   - Progress saved independently → Uses same `updateVideoProgress` API
   - Resume playback works → Uses same localStorage key pattern
   - Progress stored separately → Database tracks progress per video_id (shared with main player)

5. **Second Player Playlist Context Maintenance:**
   - When video selected → System finds containing playlist → Sets playlist context
   - When navigating → Uses `secondPlayerPlaylistItems` → Maintains context
   - When video not in current playlist → Searches all playlists → Updates context
   - Context persists → Until new video selected from different playlist

6. **Second Player Rendering Flow:**
   - `App.jsx` checks `secondPlayerVideoUrl` → Conditionally renders player
   - `LayoutShell` receives `secondPlayer` prop → Renders in bottom-left quarter
   - Only visible in full/half modes → Hidden in quarter mode (line 134)
   - Positioned absolutely → Overlays main player content
   - Z-index 10 → Above main player, below controls

7. **Second Player Cleanup Flow:**
   - When video URL cleared → `setSecondPlayerVideoUrl(null)`
   - Player unmounts → Cleanup function saves final progress
   - Player destroyed → `playerRef.current.destroy()`
   - Interval cleared → `clearInterval(saveIntervalRef.current)`

**Source of Truth:**
- `App.jsx` `secondPlayerVideoUrl` - Source of Truth for second player's current video
- `App.jsx` `secondPlayerPlaylistId` - Source of Truth for second player's playlist
- `App.jsx` `secondPlayerPlaylistItems` - Source of Truth for second player's video list
- `App.jsx` `secondPlayerVideoIndex` - Source of Truth for second player's position
- `App.jsx` `activePlayer` - Source of Truth for which player is active
- Database `video_progress` table - Shared progress tracking (same as main player)

**State Dependencies:**
- When `secondPlayerVideoUrl` set → Second player renders → Video loads
- When `secondPlayerVideoUrl` cleared → Second player unmounts → Player destroyed
- When `secondPlayerVideoIndex` changes → Video URL updates → New video loads
- When `secondPlayerPlaylistItems` changes → Navigation uses new list → Context updates
- When `activePlayer` changes → Controls route to active player → Video info switches
- When mode 2 active → All controls affect second player → Main player unaffected
- When second player video plays → Progress saved independently → Database updated