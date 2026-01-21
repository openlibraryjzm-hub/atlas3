# API Bridge

This document provides a comprehensive guide to the frontend-backend communication layer, including Tauri command patterns, API organization, and error handling.

**Related Documentation:**
- **Database Schema**: See `database-schema.md` for table structures that commands interact with
- **State Management**: See `state-management.md` for how API calls update store state
- **Feature Docs**: All feature documents use these API functions:
  - Playlist operations → `playlist&tab.md`
  - Import/Export → `importexport.md`
  - History → `history.md`
  - Video Progress → `videoplayer.md`

## Overview

The application uses **Tauri** for frontend-backend communication. The frontend (React) communicates with the backend (Rust) through Tauri commands invoked via `invoke()` from `@tauri-apps/api/core`. All database operations and backend logic are encapsulated in Rust commands.

## Architecture

### Communication Flow

```
React Component
    ↓
playlistApi.js (API layer)
    ↓
invoke('command_name', { params })
    ↓
Tauri Bridge (auto-converts snake_case ↔ camelCase)
    ↓
Rust Command Handler (commands.rs)
    ↓
Database Operations (database.rs)
    ↓
SQLite Database
```

### API Layer Structure

The API layer is organized in `src/api/playlistApi.js` with functions grouped by domain:

1. **Playlist Operations** - CRUD for playlists
2. **Playlist Item Operations** - Managing videos in playlists
3. **Folder Assignment Operations** - Folder color assignments
4. **Sticky Folder Operations** - Stuck folder management
5. **Watch History Operations** - History tracking
6. **Video Progress Operations** - Progress tracking
7. **Import/Export Operations** - Playlist import/export

## Parameter Naming Conventions

### Tauri v2 Auto-Conversion

Tauri v2 automatically converts between naming conventions:
- **Rust side**: Uses `snake_case` (e.g., `playlist_id`, `video_url`)
- **JavaScript side**: Uses `camelCase` (e.g., `playlistId`, `videoUrl`)
- **Conversion**: Automatic, bidirectional

### Example

**Rust Command:**
```rust
#[tauri::command]
pub fn add_video_to_playlist(
    db: State<Mutex<Database>>,
    playlist_id: i64,  // snake_case
    video_url: String,
    video_id: String,
    title: Option<String>,
    thumbnail_url: Option<String>,
) -> Result<i64, String>
```

**JavaScript Call:**
```javascript
await invoke('add_video_to_playlist', {
  playlistId: 1,      // camelCase - auto-converted to playlist_id
  videoUrl: '...',    // camelCase - auto-converted to video_url
  videoId: 'abc123',  // camelCase - auto-converted to video_id
  title: 'Video Title',
  thumbnailUrl: '...'
});
```

## Command Categories

### 1. Playlist Commands

**Purpose**: Manage playlist metadata

**Commands:**
- `create_playlist(name, description?)` → Returns `playlist_id` (i64)
- `get_all_playlists()` → Returns `Array<Playlist>`
- `get_playlist(id)` → Returns `Playlist | null`
- `update_playlist(id, name?, description?, custom_ascii?)` → Returns `boolean`
- `delete_playlist(id)` → Returns `boolean`
- `delete_playlist_by_name(name)` → Returns `boolean`
- `get_all_playlist_metadata()` → Returns `Array<PlaylistMetadata>` (count, thumbnail, recent video)

**API Functions** (`playlistApi.js`):
- `createPlaylist(name, description)`
- `getAllPlaylists()`
- `getPlaylist(id)`
- `updatePlaylist(id, name, description, customAscii)`
- `deletePlaylist(id)`
- `deletePlaylistByName(name)`

**Error Handling**: All functions wrap `invoke()` in try/catch, log errors, and re-throw

---

### 2. Playlist Item Commands

**Purpose**: Manage videos within playlists

**Commands:**
- `add_video_to_playlist(playlist_id, video_url, video_id, title?, thumbnail_url?)` → Returns `item_id` (i64)
- `get_playlist_items(playlist_id)` → Returns `Array<PlaylistItem>`
- `remove_video_from_playlist(playlist_id, item_id)` → Returns `boolean`
- `reorder_playlist_item(playlist_id, item_id, new_position)` → Returns `boolean`
- `check_if_video_in_playlist(playlist_id, video_id)` → Returns `boolean`

**API Functions**:
- `addVideoToPlaylist(playlistId, videoUrl, videoId, title, thumbnailUrl)`
- `getPlaylistItems(playlistId)`
- `removeVideoFromPlaylist(playlistId, itemId)`
- `reorderPlaylistItem(playlistId, itemId, newPosition)`
- `checkIfVideoInPlaylist(playlistId, videoId)`

**Position Management**: `add_video_to_playlist` automatically assigns the next position (max position + 1)

---

### 3. Folder Assignment Commands

**Purpose**: Manage folder color assignments for videos

**Commands:**
- `assign_video_to_folder(playlist_id, item_id, folder_color)` → Returns `i64` (assignment ID)
- `unassign_video_from_folder(playlist_id, item_id, folder_color)` → Returns `boolean`
- `get_videos_in_folder(playlist_id, folder_color)` → Returns `Array<PlaylistItem>`
- `get_video_folder_assignments(playlist_id, item_id)` → Returns `Array<String>` (folder colors)
- `get_all_folder_assignments(playlist_id)` → Returns `Map<String, Array<String>>` (Batch fetch)
- `get_folders_for_playlist(playlist_id)` → Returns `Array<String>` (folder colors)
- `get_all_folders_with_videos()` → Returns `Array<FolderWithVideos>`
- `get_playlists_for_video_ids(video_ids)` → Returns `Map<String, Array<String>>` (video_id -> playlist_names)

**API Functions**:
- `assignVideoToFolder(playlistId, itemId, folderColor)`
- `unassignVideoFromFolder(playlistId, itemId, folderColor)`
- `getVideosInFolder(playlistId, folderColor)`
- `getVideoFolderAssignments(playlistId, itemId)`
- `getFoldersForPlaylist(playlistId)`
- `getAllFoldersWithVideos()`
- `getPlaylistsForVideoIds(videoIds)`

**Folder Colors**: Valid values are the 16 folder color IDs (see `folderColors.js`)

---

### 4. Sticky Folder Commands

**Purpose**: Manage folders that remain visible regardless of parent playlist state

**Commands:**
- `toggle_stuck_folder(playlist_id, folder_color)` → Returns `boolean` (new stuck status)
- `is_folder_stuck(playlist_id, folder_color)` → Returns `boolean`
- `get_all_stuck_folders()` → Returns `Array<[playlist_id, folder_color]>`
- `set_folder_metadata(playlist_id, folder_color, name?, description?, custom_ascii?)` → Returns `boolean`
- `get_folder_metadata(playlist_id, folder_color)` → Returns `Option<(String, String, Option<String>)>`

**API Functions**:
- `toggleStuckFolder(playlistId, folderColor)`
- `isFolderStuck(playlistId, folderColor)`
- `getAllStuckFolders()`
- `setFolderMetadata(playlistId, folderColor, name, description, customAscii)`
- `getFolderMetadata(playlistId, folderColor)`

**Toggle Behavior**: If folder is stuck, unsticks it. If not stuck, sticks it.

---

### 5. Watch History Commands

**Purpose**: Track video watch history

**Commands:**
- `add_to_watch_history(video_url, video_id, title?, thumbnail_url?)` → Returns `i64` (history ID)
- `get_watch_history(limit)` → Returns `Array<WatchHistory>` (ordered by `watched_at DESC`)
- `clear_watch_history()` → Returns `boolean`
- `get_watched_video_ids()` → Returns `Array<String>` (video IDs with ≥85% progress)

**API Functions**:
- `addToWatchHistory(videoUrl, videoId, title, thumbnailUrl)`
- `getWatchHistory(limit)`
- `clearWatchHistory()`
- `getWatchedVideoIds()`

**History Limit**: Typically queries last 100 videos (`get_watch_history(100)`)

---

### 6. Video Progress Commands

**Purpose**: Track video playback progress

**Commands:**
- `update_video_progress(video_id, video_url, duration?, current_time)` → Returns `i64` (progress ID)
- `get_video_progress(video_id)` → Returns `VideoProgress | null`
- `get_all_video_progress()` → Returns `Array<VideoProgress>`

**API Functions**:
- `updateVideoProgress(videoId, videoUrl, duration, currentTime)`
- `getVideoProgress(videoId)`
- `getAllVideoProgress()`
 
**VideoProgress Object**: `{ videoId, videoUrl, duration, lastProgress, progressPercentage, lastUpdated, hasFullyWatched }`
**Note**: `hasFullyWatched` is a sticky boolean flag (true if video ever reached ≥85%).

**Progress Calculation**: Backend calculates `progress_percentage = (current_time / duration) * 100`, clamped to 0-100

**Update Strategy**: Uses `INSERT OR REPLACE` to update existing records or create new ones

---

### 7. Local Video File Commands

**Purpose**: Local video file handling and streaming server integration

**Commands:**
- `select_video_files()` → Returns `Array<String> | null` (file paths)
- `read_video_file(file_path)` → Returns `Array<u8>` (binary file data, legacy)
- `get_video_stream_url(file_path)` → Returns `String` (HTTP streaming URL)

**API Functions**:
- `selectVideoFiles()` - Opens file picker, returns selected file paths
- `readVideoFile(filePath)` - Reads video file as binary data (legacy, not used with streaming server)
- `getVideoStreamUrl(filePath)` - Returns HTTP URL from streaming server for efficient playback

**Streaming Server Architecture**:
- **Server**: Axum HTTP server running on `127.0.0.1:1422` (localhost)
- **Endpoint**: `/stream/:file_id` - Streams video files with HTTP range request support
- **File Registry**: Maps file IDs (hashed file paths) to actual file system paths
- **Range Requests**: Supports HTTP Range headers for efficient seeking in large files
- **Memory Efficient**: Streams files in chunks, doesn't load entire file into memory
- **CORS**: Permissive CORS enabled for localhost access
- **Initialization**: Server starts automatically on app startup (see `lib.rs`)

**Usage Pattern**:
1. User selects video file → `select_video_files()` returns file path
2. File added to playlist → Path stored in `video_url` field with `is_local=1`
3. Video playback initiated → `get_video_stream_url(file_path)` command called
4. Streaming URL returned → `http://127.0.0.1:1422/stream/{file_id}`
5. Player requests video → HTTP GET with optional Range header for seeking
6. Server streams chunks → Efficient memory usage, supports files of any size (GB+)

**File ID Generation**: Uses hash of file path to create unique ID, stored in in-memory registry

---

### 8. Import/Export Commands

**Purpose**: Playlist import/export functionality

**Commands:**
- `import_playlist_from_json(json_data)` → Returns `playlist_id` (i64)
- (Export handled client-side via `exportPlaylist()` function)

**API Functions**:
- `importPlaylistFromJson(jsonData)` - Creates playlist, adds videos, restores folder assignments

**Export**: Handled entirely client-side - `exportPlaylist()` function in `playlistApi.js`:
1. Gets playlist data via `getPlaylist()`
2. Gets videos via `getPlaylistItems()`
3. Gets folder assignments via `getVideoFolderAssignments()` for each video
4. Creates JSON object
5. Downloads as file via Blob API

---

---
 
+### 9. Browser Control Commands
+
+**Purpose**: Control the visibility and layout mode of the Layer 2 Browser.
+
+**Commands:**
+- `set_browser_mode(mode)` → Triggers `BrowserModeChanged` event in C# backend.
+
+**API Functions** (`playlistApi.js`):
+- `setBrowserMode(mode)`: Sends a mode command (`'split'`, `'full'`, or `'hide'`) to the C# host to resize/toggle the browser overlay.
+
+**Usage Pattern**:
+- **Split Screen**: `setBrowserMode('split')` is used when the user clicks the Monitor icon to browse alongside the video player.
+- **Hiding**: `setBrowserMode('hide')` is called automatically during Layer 1 navigation to ensure the browser disappears when switching to app-specific pages.
+
+---
+
 ## Error Handling Patterns

### Frontend Error Handling

**Pattern 1: Try/Catch with Logging**
```javascript
export const getAllPlaylists = async () => {
  try {
    const result = await invoke('get_all_playlists');
    return result || [];
  } catch (error) {
    console.error('Error in getAllPlaylists API:', error);
    throw error; // Re-throw for component handling
  }
};
```

**Pattern 2: Silent Failure (Non-Critical Operations)**
```javascript
const saveVideoProgress = async (videoId, videoUrl, duration, currentTime) => {
  try {
    await updateVideoProgress(videoId, videoUrl, duration, currentTime);
  } catch (error) {
    console.error('Failed to save video progress to database:', error);
    // Don't throw - this is non-critical
  }
};
```

### Backend Error Handling

**Pattern: Result Type with Error Conversion**
```rust
#[tauri::command]
pub fn get_all_playlists(db: State<Mutex<Database>>) -> Result<Vec<Playlist>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_all_playlists().map_err(|e| e.to_string())
}
```

**Error Flow**:
1. Database operation returns `Result<T, rusqlite::Error>`
2. `.map_err(|e| e.to_string())` converts to `String`
3. Tauri returns `Result<T, String>` to frontend
4. Frontend receives error as string message

---

## Command Registration

Commands are registered in `src-tauri/src/lib.rs`:

```rust
.invoke_handler(tauri::generate_handler![
    // Playlist commands
    create_playlist,
    get_all_playlists,
    get_playlist,
    update_playlist,
    delete_playlist,
    delete_playlist_by_name,
    // ... all other commands
])
```

**Registration Order**: Commands can be registered in any order, but grouping by category improves readability.

---

## Database State Management

### Mutex Pattern

All database operations use a `Mutex<Database>` state:

```rust
#[tauri::command]
pub fn get_all_playlists(db: State<Mutex<Database>>) -> Result<Vec<Playlist>, String> {
    let db = db.lock().map_err(|e| e.to_string())?; // Lock mutex
    db.get_all_playlists().map_err(|e| e.to_string()) // Use database
    // Mutex automatically unlocks when db goes out of scope
}
```

**Why Mutex**: SQLite connections are not thread-safe. The mutex ensures only one operation accesses the database at a time.

---

## API Function Organization

### File Structure (`src/api/playlistApi.js`)

Functions are organized in sections with comments:

```javascript
// Playlist operations
export const createPlaylist = async (name, description = null) => { ... }
export const getAllPlaylists = async () => { ... }
// ...

// Playlist item operations
export const addVideoToPlaylist = async (...) => { ... }
// ...

// Folder assignment operations
export const assignVideoToFolder = async (...) => { ... }
// ...
```

### Function Naming

- **Consistent**: All functions use camelCase
- **Descriptive**: Function names clearly indicate operation (e.g., `getAllPlaylists`, `assignVideoToFolder`)
- **Async**: All functions are async and return Promises

---

## Common Patterns

### Pattern 1: Get with Fallback

```javascript
export const getAllPlaylists = async () => {
  try {
    const result = await invoke('get_all_playlists');
    return result || []; // Fallback to empty array
  } catch (error) {
    console.error('Error in getAllPlaylists API:', error);
    throw error;
  }
};
```

### Pattern 2: Optional Parameters

```javascript
export const createPlaylist = async (name, description = null) => {
  return await invoke('create_playlist', { name, description });
};
```

### Pattern 3: Error Logging

```javascript
export const getPlaylistItems = async (playlistId) => {
  try {
    const result = await invoke('get_playlist_items', { playlistId });
    console.log('getPlaylistItems API result:', result);
    return result || [];
  } catch (error) {
    console.error('Error in getPlaylistItems API:', error);
    throw error;
  }
};
```

---

## Type Conversions

### Rust → JavaScript

| Rust Type | JavaScript Type | Notes |
|-----------|----------------|-------|
| `i64` | `number` | Integer |
| `String` | `string` | UTF-8 string |
| `Option<String>` | `string \| null` | Nullable string |
| `Vec<T>` | `Array<T>` | Array |
| `Result<T, String>` | `T` (success) or throws error | Promise rejection on error |

### JavaScript → Rust

| JavaScript Type | Rust Type | Notes |
|----------------|-----------|-------|
| `number` | `i64` | Integer (may truncate floats) |
| `string` | `String` | UTF-8 string |
| `null` / `undefined` | `Option<T>` | None if null/undefined |
| `Array<T>` | `Vec<T>` | Array |
| Promise rejection | `Result<T, String>` | Error string |

---

## Best Practices

1. **Always use API layer** - Don't call `invoke()` directly from components, use `playlistApi.js` functions
2. **Handle errors** - Wrap API calls in try/catch, log errors, provide user feedback
3. **Use optional parameters** - Mark optional parameters with `?` in function signatures
4. **Provide fallbacks** - Return empty arrays/objects instead of null when appropriate
5. **Log for debugging** - Use `console.log` for successful operations, `console.error` for errors
6. **Non-critical operations** - Don't throw errors for non-critical operations (e.g., progress tracking)

---

## Troubleshooting

### Command Not Found
- Check if command is registered in `lib.rs` `generate_handler![]` macro
- Check command name spelling (must match exactly)
- Check if Tauri app is rebuilt after adding new commands

### Parameter Mismatch
- Check parameter names match (snake_case ↔ camelCase conversion)
- Check parameter types match (i64 ↔ number, String ↔ string)
- Check optional parameters (Option<T> ↔ null/undefined)

### Database Locked
- Check if previous operation is still in progress
- Check for unclosed database connections
- Check mutex locking/unlocking

### Error Messages
- Backend errors are converted to strings via `.map_err(|e| e.to_string())`
- Check browser console for error messages
- Check Rust console output for detailed error information

