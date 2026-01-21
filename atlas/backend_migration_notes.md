# Backend Migration Notes: Rust to C#

**Status:** Completed ✅
**Date:** 2026-01-21
**Objective:** Port the entire backend logic from Tauri (Rust) to C# (.NET 10) to support the new WebView2 architecture.

## 🏆 Overview (The Victory Lap)
The backend migration was a complete success. We have successfully replicated the entire database and command handling logic of the legacy Rust application within a modern C# WPF environment. The React frontend now communicates seamlessly with the C# backend, preserving all existing user data (playlists, history, folders).

## 🏗️ Architecture

### 1. Database Layer (`DatabaseService.cs`)
*   **Technology:** `Microsoft.Data.Sqlite`
*   **Strategy:** Direct port of Rust's `rusqlite` logic.
*   **Key Implementations:**
    *   **Playlists:** Full CRUD operations for creating, updating, and deleting playlists.
    *   **Playlist Items:** Logic for adding videos, removing them, and most importantly, **reordering** them efficiently.
    *   **Folders:** The complex "Colored Folder" system, including video assignments, aggregation queries, and "Stuck Folder" logic.
    *   **History & Progress:** Video progress tracking (resume playback) and watch history management.
    *   **Metadata:** Storage for custom folder names and descriptions.

### 2. The Bridge (`AppBridge.cs`)
*   **Mechanism:** `WebView2.CoreWebView2.WebMessageReceived`
*   **Role:** Acts as the "Switchboard", routing JSON messages from the React frontend to the appropriate C# service method.
*   **Improvements:** 
    *   Robust error handling with `try/catch` blocks around individual commands.
    *   Safe parameter extraction helpers (`GetLong`, `GetString`) to prevent crashes on malformed inputs.
    *   Scoped variable handling to prevent variable name collisions in the switch statement.

### 3. Data Models (`Models/*.cs`)
*   **Strategy:** Created C# POCO classes that mirror the Rust structs 1:1.
*   **Serialization:** Used `System.Text.Json.Serialization` attributes (`[JsonPropertyName("snake_case")]`) to ensure the React frontend receives the exact field names it expects, eliminating the need for frontend refactoring.

## 🛠️ Implemented Features

### Playlists
*   `get_all_playlists`: lists all available playlists.
*   `create_playlist` / `delete_playlist`: Management.
*   `update_playlist`: Renaming and metadata updates.

### Video Management
*   `get_playlist_items`: Fetches videos for a specific playlist.
*   `add_video_to_playlist`: Supports both remote URLs and local file paths.
*   `reorder_playlist_item`: A critical feature allowing drag-and-drop reordering in the UI.
*   `get_playlists_for_video_ids`: Used to show "This video is in X playlists" indicators.

### Folders (The "Colored Folders" System)
*   Fully implemented the logic for assigning videos to Red, Green, Blue, etc., folders.
*   **Aggregation:** `get_all_folders_with_videos` performs complex SQL joins to return folder summaries (video counts, first video thumbnail) efficiently.
*   **Stuck Folders:** Implementation of the "Pin" feature for folders.

### Watch History
*   `update_video_progress`: Tracks resume points and "fully watched" status (85% rule).
*   `get_watch_history`: Returns the timeline of watched videos.
*   `get_watched_video_ids`: Efficiently returns IDs for UI "Watched" badges.

## 📝 Technical Notes & Learnings

*   **Concurrency:** SQLite write operations (like reordering) are wrapped in Transactions to ensure data integrity.
*   **Dependency Injection:** Services are injected into `MainWindow` and `AppBridge`, promoting a clean architecture.
*   **Scope Management:** C# Switch statements share scope across cases. We adopted block scoping `{ ... }` for complex cases to avoid variable collisions (e.g., `vid`).
*   **JSON Handling:** Moving from `TryGetWebMessageAsString` to `WebMessageAsJson` significantly improved robustness for complex payloads.

## 🔮 Next Steps
With the backend fully operational, the focus shifts to:
1.  **Phase 4 (Media Player):** Integrating `libmpv` for high-performance video playback.
2.  **Audio Visualizer:** Finalizing the `NAudio` implementation (already in progress).
