# Database Schema

This document provides a complete reference for the SQLite database schema, including all tables, relationships, indexes, and constraints.

**Related Documentation:**
- **API Layer**: See `api-bridge.md` for commands that interact with these tables
- **State Management**: See `state-management.md` for how stores sync with database data
- **Feature Docs**: All feature documents reference these tables for data persistence:
  - `playlists`, `playlist_items` → `playlist&tab.md`
  - `video_folder_assignments` → `playlist&tab.md` Section 2.2
  - `watch_history` → `history.md`
  - `video_progress` → `videoplayer.md`
  - `stuck_folders` → `playlist&tab.md` Section 2.2
  - `folder_metadata` → `playlist&tab.md` Section 2.2

## Overview

The application uses **SQLite** (via `rusqlite 0.32`) as the embedded database. The database file is located at `playlists.db` in the project root. All database operations are performed through Tauri commands from the Rust backend.

## Database Initialization

The database is initialized in `src-tauri/src/database.rs` in the `init_schema()` method. Schema creation uses `CREATE TABLE IF NOT EXISTS` to allow safe re-initialization.

## Tables

### 1. `playlists`

**Purpose**: Stores playlist metadata

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    custom_ascii TEXT,
    custom_thumbnail_url TEXT
)
```

**Columns:**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT) - Unique playlist identifier
- `name` (TEXT NOT NULL) - Playlist name (required)
- `description` (TEXT) - Optional playlist description
- `created_at` (TEXT NOT NULL) - ISO 8601 timestamp (RFC3339 format)
- `created_at` (TEXT NOT NULL) - ISO 8601 timestamp (RFC3339 format)
- `updated_at` (TEXT NOT NULL) - ISO 8601 timestamp (RFC3339 format)
- `custom_ascii` (TEXT) - Optional custom ASCII art banner for the playlist
- `custom_thumbnail_url` (TEXT) - Optional URL for a custom playlist cover image. If present, this overrides the default behavior of using the first video's thumbnail.

**Indexes**: None (primary key is automatically indexed)

**Relationships**:
- Referenced by `playlist_items.playlist_id` (ON DELETE CASCADE)
- Referenced by `video_folder_assignments.playlist_id` (ON DELETE CASCADE)
- Referenced by `stuck_folders.playlist_id` (ON DELETE CASCADE)

**Cascade Behavior**: When a playlist is deleted, all related records are automatically deleted:
- All playlist items
- All folder assignments
- All stuck folder records

---

### 2. `playlist_items`

**Purpose**: Stores videos within playlists

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS playlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    video_url TEXT NOT NULL,
    video_id TEXT NOT NULL,
    title TEXT,
    thumbnail_url TEXT,
    author TEXT,
    view_count TEXT,
    position INTEGER NOT NULL,
    added_at TEXT NOT NULL,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
)
```

**Columns:**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT) - Unique item identifier
- `playlist_id` (INTEGER NOT NULL) - Foreign key to `playlists.id`
- `video_url` (TEXT NOT NULL) - Full YouTube URL (e.g., `https://www.youtube.com/watch?v=abc123`)
- `video_id` (TEXT NOT NULL) - Extracted YouTube video ID (e.g., `abc123`)
- `title` (TEXT) - Optional video title
- `thumbnail_url` (TEXT) - Optional thumbnail URL
- `author` (TEXT) - Channel name/author (e.g. "Google Developers")
- `view_count` (TEXT) - Video view count (e.g. "103405")
- `position` (INTEGER NOT NULL) - Order position in playlist (0-indexed)
- `added_at` (TEXT NOT NULL) - ISO 8601 timestamp (RFC3339 format)
- `is_local` (INTEGER NOT NULL DEFAULT 0) - Boolean (0 or 1), 1 if video is a local file
- `author` (TEXT) - Channel name/author
- `view_count` (TEXT) - Video view count
- `published_at` (TEXT) - ISO 8601 timestamp of video publication

**Indexes:**
- `idx_playlist_items_playlist_id` - On `playlist_id` for faster playlist lookups
- `idx_playlist_items_position` - On `(playlist_id, position)` for ordered retrieval

**Relationships**:
- Foreign key to `playlists.id` (ON DELETE CASCADE)
- Referenced by `video_folder_assignments.item_id` (ON DELETE CASCADE)

**Cascade Behavior**: When a playlist is deleted, all its items are automatically deleted. When an item is deleted, all its folder assignments are automatically deleted.

---

### 3. `video_folder_assignments`

**Purpose**: Stores folder color assignments for videos

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS video_folder_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    folder_color TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES playlist_items(id) ON DELETE CASCADE,
    UNIQUE(playlist_id, item_id, folder_color)
)
```

**Columns:**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT) - Unique assignment identifier
- `playlist_id` (INTEGER NOT NULL) - Foreign key to `playlists.id`
- `item_id` (INTEGER NOT NULL) - Foreign key to `playlist_items.id`
- `folder_color` (TEXT NOT NULL) - Folder color ID (e.g., "red", "blue", "sky")
- `created_at` (TEXT NOT NULL) - ISO 8601 timestamp (RFC3339 format)

**Indexes:**
- `idx_folder_assignments_playlist_color` - On `(playlist_id, folder_color)` for folder lookups
- `idx_folder_assignments_item` - On `item_id` for video lookups

**Unique Constraint**: `(playlist_id, item_id, folder_color)` - Prevents duplicate assignments of the same video to the same folder color

**Relationships**:
- Foreign key to `playlists.id` (ON DELETE CASCADE)
- Foreign key to `playlist_items.id` (ON DELETE CASCADE)

**Cascade Behavior**: When a playlist or playlist item is deleted, all folder assignments are automatically deleted.

**Folder Colors**: Valid values are the 16 folder color IDs: "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink"

---

### 4. `watch_history`

**Purpose**: Stores watch history records (last 100 videos)

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS watch_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_url TEXT NOT NULL,
    video_id TEXT NOT NULL,
    title TEXT,
    thumbnail_url TEXT,
    watched_at TEXT NOT NULL
)
```

**Columns:**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT) - Unique history record identifier
- `video_url` (TEXT NOT NULL) - Full YouTube URL
- `video_id` (TEXT NOT NULL) - Extracted YouTube video ID
- `title` (TEXT) - Optional video title
- `thumbnail_url` (TEXT) - Optional thumbnail URL
- `watched_at` (TEXT NOT NULL) - ISO 8601 timestamp (RFC3339 format) of when video was watched

**Indexes:**
- `idx_watch_history_watched_at` - On `watched_at DESC` for chronological retrieval
- `idx_watch_history_video_id` - On `video_id` for video lookups

**Relationships**: None (standalone table)

**Query Pattern**: History is typically queried with `ORDER BY watched_at DESC LIMIT 100` to get most recent videos first.

---

### 5. `video_progress`

**Purpose**: Tracks video playback progress and watch status

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS video_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id TEXT NOT NULL UNIQUE,
    video_url TEXT NOT NULL,
    duration REAL,
    last_progress REAL NOT NULL DEFAULT 0,
    progress_percentage REAL NOT NULL DEFAULT 0,
    progress_percentage REAL NOT NULL DEFAULT 0,
    last_updated TEXT NOT NULL,
    has_fully_watched INTEGER NOT NULL DEFAULT 0
)
```

**Columns:**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT) - Unique progress record identifier
- `video_id` (TEXT NOT NULL UNIQUE) - YouTube video ID (unique per video)
- `video_url` (TEXT NOT NULL) - Full YouTube URL
- `duration` (REAL) - Video duration in seconds (nullable, updated when available)
- `last_progress` (REAL NOT NULL DEFAULT 0) - Last playback position in seconds
- `progress_percentage` (REAL NOT NULL DEFAULT 0) - Progress percentage (0-100), calculated as `(last_progress / duration) * 100`
- `last_updated` (TEXT NOT NULL) - ISO 8601 timestamp (RFC3339 format) of last update
- `has_fully_watched` (INTEGER NOT NULL DEFAULT 0) - Boolean (0 or 1), 1 if video has ever reached ≥85% progress (sticky)

**Indexes:**
- `idx_video_progress_video_id` - On `video_id` for fast lookups

**Unique Constraint**: `video_id` - One progress record per video (uses INSERT OR REPLACE for updates)

**Relationships**: None (standalone table, keyed by video_id, not playlist_item.id)

**Watch Status Categories**:
- **Unwatched**: `progress_percentage = 0`
- **Partially Watched**: `0 < progress_percentage < 85`
- **Watched**: `progress_percentage >= 85` OR `has_fully_watched = 1`

---

### 6. `stuck_folders`

**Purpose**: Tracks folders that should remain visible regardless of parent playlist state

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS stuck_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    folder_color TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    UNIQUE(playlist_id, folder_color)
)
```

**Columns:**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT) - Unique stuck folder identifier
- `playlist_id` (INTEGER NOT NULL) - Foreign key to `playlists.id`
- `folder_color` (TEXT NOT NULL) - Folder color ID (e.g., "red", "blue")
- `created_at` (TEXT NOT NULL) - ISO 8601 timestamp (RFC3339 format)

**Indexes:**
- `idx_stuck_folders_playlist_color` - On `(playlist_id, folder_color)` for fast lookups

**Unique Constraint**: `(playlist_id, folder_color)` - Prevents duplicate stuck folder records

**Relationships**:
- Foreign key to `playlists.id` (ON DELETE CASCADE)

**Cascade Behavior**: When a playlist is deleted, all its stuck folder records are automatically deleted.

---

### 7. `folder_metadata`

**Purpose**: Stores custom names and descriptions for colored folders within playlists

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS folder_metadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    folder_color TEXT NOT NULL,
    custom_name TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    custom_ascii TEXT,
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    UNIQUE(playlist_id, folder_color)
)
```

**Columns:**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT) - Unique metadata record identifier
- `playlist_id` (INTEGER NOT NULL) - Foreign key to `playlists.id`
- `folder_color` (TEXT NOT NULL) - Folder color ID (e.g., "red", "blue")
- `custom_name` (TEXT) - User-defined name for the folder
- `description` (TEXT) - User-defined description for the folder
- `custom_ascii` (TEXT) - Optional custom ASCII art banner for the folder
- `created_at` (TEXT NOT NULL) - ISO 8601 timestamp (RFC3339 format)
- `updated_at` (TEXT NOT NULL) - ISO 8601 timestamp (RFC3339 format)

**Indexes:**
- `idx_folder_metadata_playlist_color` - On `(playlist_id, folder_color)` for fast lookups

**Unique Constraint**: `(playlist_id, folder_color)` - One metadata record per folder per playlist

**Relationships**:
- Foreign key to `playlists.id` (ON DELETE CASCADE)

**Cascade Behavior**: When a playlist is deleted, its folder metadata is automatically deleted.

---

## Relationships Diagram

```
playlists (1) ──< (many) playlist_items
    │
    ├──< (many) video_folder_assignments
    │       └──< (many) playlist_items
    │
    └──< (many) stuck_folders
    │
    └──< (many) folder_metadata

watch_history (standalone)
video_progress (standalone, keyed by video_id)
```

## Foreign Key Constraints

All foreign keys use `ON DELETE CASCADE`, meaning:
- Deleting a playlist deletes all its items, folder assignments, and stuck folders
- Deleting a playlist item deletes all its folder assignments
- This ensures referential integrity without orphaned records

## Indexes Summary

| Index Name | Table | Columns | Purpose |
|------------|-------|---------|---------|
| `idx_playlist_items_playlist_id` | `playlist_items` | `playlist_id` | Fast playlist item lookups |
| `idx_playlist_items_position` | `playlist_items` | `(playlist_id, position)` | Ordered retrieval |
| `idx_folder_assignments_playlist_color` | `video_folder_assignments` | `(playlist_id, folder_color)` | Folder video lookups |
| `idx_folder_assignments_item` | `video_folder_assignments` | `item_id` | Video assignment lookups |
| `idx_watch_history_watched_at` | `watch_history` | `watched_at DESC` | Chronological retrieval |
| `idx_watch_history_video_id` | `watch_history` | `video_id` | Video history lookups |
| `idx_video_progress_video_id` | `video_progress` | `video_id` | Progress lookups |
| `idx_stuck_folders_playlist_color` | `stuck_folders` | `(playlist_id, folder_color)` | Stuck folder lookups |
| `idx_folder_metadata_playlist_color` | `folder_metadata` | `(playlist_id, folder_color)` | Folder metadata lookups |

## Data Types

- **INTEGER**: Auto-incrementing IDs, positions, counts
- **TEXT**: Strings (URLs, IDs, names, descriptions, timestamps)
- **REAL**: Floating-point numbers (durations, progress percentages)

## Timestamp Format

All timestamps use **ISO 8601 format (RFC3339)**:
- Format: `YYYY-MM-DDTHH:MM:SS.sssZ` (e.g., `2024-01-15T14:30:45.123Z`)
- Generated using `chrono::Utc::now().to_rfc3339()` in Rust
- Stored as TEXT in database

## Common Query Patterns

### Get All Playlists
```sql
SELECT * FROM playlists ORDER BY created_at DESC
```

### Get Playlist Items (Ordered)
```sql
SELECT * FROM playlist_items 
WHERE playlist_id = ? 
ORDER BY position ASC
```

### Get Videos in Folder
```sql
SELECT pi.* FROM playlist_items pi
INNER JOIN video_folder_assignments vfa 
  ON pi.id = vfa.item_id 
  AND pi.playlist_id = vfa.playlist_id
WHERE vfa.playlist_id = ? 
  AND vfa.folder_color = ?
ORDER BY pi.position ASC
```

### Get Video Folder Assignments
```sql
SELECT folder_color FROM video_folder_assignments
WHERE playlist_id = ? AND item_id = ?
```

### Get Watch History (Last 100)
```sql
SELECT * FROM watch_history 
ORDER BY watched_at DESC 
LIMIT 100
```

### Get Watched Video IDs (≥85% progress)
```sql
SELECT DISTINCT video_id FROM video_progress 
SELECT DISTINCT video_id FROM video_progress 
WHERE progress_percentage >= 85.0 OR has_fully_watched = 1
```

### Get Video Progress
```sql
SELECT * FROM video_progress 
WHERE video_id = ?
```

### Update Video Progress (INSERT OR REPLACE)
```sql
INSERT OR REPLACE INTO video_progress 
(video_id, video_url, duration, last_progress, progress_percentage, last_updated, has_fully_watched)
VALUES (?, ?, ?, ?, ?, ?, ?)
```

## Database File Location

- **Path**: `playlists.db` (project root)
- **Reason**: Moved from `src-tauri/` to prevent Tauri file watcher rebuilds
- **Initialization**: Created automatically on first app launch
- **Backup**: Not automatically backed up (user should export playlists for backup)

## Migration Strategy

Currently, the database uses `CREATE TABLE IF NOT EXISTS`, which means:
- Tables are created if they don't exist
- Existing tables are not modified
- **No migration system** - schema changes require manual migration or database recreation

**Future Consideration**: If schema changes are needed, implement a migration system using version tracking.

