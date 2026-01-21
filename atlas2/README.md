# Atlas Documentation Index

> ⚠️ **CRITICAL ARCHITECTURE UPDATE (JAN 2026)**
>
> **This project is currently being ported to C# / WPF / WebView2.**
>
> *   **Frontend**: Remains **React v19** (served via WebView2).
> *   **Backend**: The Rust/Tauri backend (`src-tauri`) is being **REPLACED** by a C# .NET 8 backend.
> *   **Documentation Status**: The documents in this `atlas` folder describe the *intended behavior, UI logic, and data structures*. However, any references to **Rust**, **Tauri Commands**, or **Traits** should be treated as **Logic References** for the C# implementation, not valid code for the active project.
> *   **Data Layer**: SQLite remains the database engine, but is now accessed via `System.Data.SQLite` or `Microsoft.Data.Sqlite` instead of `rusqlite`.

This directory contains comprehensive documentation for the YouTube TV v2 (yttv2) project, organized by feature and technical domain.

---

## Overview

**yttv2** is a desktop application originally built with Tauri, now hosted within a **C# WPF WebView2 Window**. The app provides a modern, grid-based interface for browsing playlists and videos, with full SQLite database integration.

## Tech Stack

### Frontend (Active)
- **React 19.1.0** - UI framework
- **Vite 7.0.4** - Build tool and dev server
- **Tailwind CSS 4.1.18** - Utility-first CSS framework
- **Zustand 5.0.9** - Lightweight state management
- **GSAP 3.14.2** - Animation library
- **WebView2** - Hosting Runtime

### Backend (C# .NET 8)
- **C# / WPF** - Application Host & Window Manager
- **WebView2 (Edge)** - Frontend Bridge
- **Microsoft.Data.Sqlite** - Database Engine (Ported from `rusqlite`)
- **NAudio** - Audio Visualization (Ported from `cpal`)
- **ASP.NET Core / HttpListener** - Local Video Streaming (Ported from `axum`)

**Host window note (WPF port):** the app runs in a borderless WPF window; window controls (min/max/close + drag-to-move) are implemented in the Layer 1 banner UI and forwarded to the host via WebView2 messaging.

### Legacy Reference (Rust/Tauri)
*The following are present in the repo but serve only as logic references:*
- **Tauri 2**
- **Rust**
- **Tokio / Axum**

---

## Project Structure

```
yttv2/
├── src/                          # Frontend React application
│   ├── api/                      # API layer for Tauri commands
│   │   └── playlistApi.js       # All playlist/video database operations
│   ├── components/               # React components
│   │   ├── PlayerController.jsx  # Top controller (orb + rectangles UI) - Advanced version with preview navigation, colored shuffle, likes, folder badges
│   │   ├── YouTubePlayer.jsx     # YouTube iframe player component
│   │   ├── NativeVideoPlayer.jsx # Native mpv player for local videos
│   │   ├── LocalVideoPlayer.jsx  # HTML5 fallback player (browser-compatible formats)
│   │   ├── TopNavigation.jsx     # Navigation tabs (Playlists/Videos/History)
│   │   ├── PlaylistsPage.jsx     # Main playlists grid view

│   │   ├── VideosPage.jsx        # Videos grid view for current playlist
│   │   ├── HistoryPage.jsx       # Watch history display (last 100 videos)
│   │   ├── LikesPage.jsx         # Liked videos grid view
│   │   ├── PinsPage.jsx          # Pinned videos grid view
│   │   ├── PlaylistList.jsx      # Sidebar playlist list component
│   │   ├── PlaylistView.jsx      # Individual playlist video grid
│   │   ├── PlaylistUploader.jsx  # Config Playlist Modal (Unified Add/Import/JSON)
│   │   ├── PlaylistsButton.jsx   # Toggle button for sidebar
│   │   ├── Card.jsx              # Base card component
│   │   ├── CardThumbnail.jsx     # Thumbnail display component
│   │   ├── CardContent.jsx       # Card content (title, subtitle, metadata)
│   │   ├── CardActions.jsx       # Quick actions and menu management
│   │   ├── CardMenu.jsx          # Enhanced 3-dot menu with submenu support
│   │   ├── VideoCard.jsx         # Video card implementation
│   │   ├── FolderCard.jsx        # Colored folder card component
│   │   ├── FolderSelector.jsx    # 16-color folder selector
│   │   ├── BulkTagColorGrid.jsx  # Bulk tagging color grid
│   │   ├── StarColorPicker.jsx   # Star color picker menu (hover menu for folder assignment)
│   │   ├── TabBar.jsx            # Tab navigation component
│   │   ├── AddPlaylistToTabModal.jsx  # Modal for adding playlists to tabs
│   │   ├── TabPresetsDropdown.jsx     # Tab preset selector
│   │   ├── BulkPlaylistImporter.jsx   # Bulk import modal with 17 fields
│   │   ├── PlaylistFolderSelector.jsx  # Universal playlist/folder selector
│   │   ├── PlaylistSelectionModal.jsx  # Modal for selecting playlist (Move/Copy actions)
│   │   ├── StickyVideoCarousel.jsx     # Carousel/Grid for stickied videos
│   │   ├── PageBanner.jsx              # Banner with metadata and animated diagonal pattern
│   │   ├── EditPlaylistModal.jsx       # Modal for editing playlist/folder metadata
│   │   ├── SettingsPage.jsx            # Application configuration (Appearance, Visualizer, Orb, Profile)
│   │   ├── SupportPage.jsx             # Tabbed Support Hub (Code, Dev, Community, Resources)
│   │   ├── LikesPage.jsx               # Liked videos with distribution graph and pagination
│   │   ├── PieGraph.jsx                # Animated SVG pie chart for likes distribution
│   │   └── DebugRuler.jsx              # Ruler overlay component (non-functional - see debug.md)
│   ├── store/                    # Zustand state management
│   │   ├── configStore.js        # Theme and Profile configuration
│   │   ├── layoutStore.js        # View mode, menu state, debug/inspect/ruler/dev toolbar toggles
│   │   ├── navigationStore.js    # Current page (playlists/videos/history)
│   │   ├── playlistStore.js      # Current playlist items, video index
│   │   ├── folderStore.js        # Folder state, bulk tagging, show folders
│   │   ├── tabStore.js           # Tab state management
│   │   ├── tabPresetStore.js     # Tab preset state management
│   │   ├── pinStore.js           # Pin state management (persisted)
│   │   └── stickyStore.js        # Sticky video state management (persisted)
│   ├── utils/                    # Utility functions
│   │   ├── youtubeUtils.js       # YouTube URL parsing, thumbnails, API
│   │   ├── initDatabase.js       # Database initialization (no test data)
│   │   └── folderColors.js       # Folder color utilities
│   ├── LayoutShell.jsx           # Main layout component (grid system)
│   ├── LayoutShell.css           # Layout styles
│   ├── App.jsx                   # Root component, app orchestration
│   ├── App.css                   # App-level styles
│   └── main.jsx                  # React entry point
│
├── src-tauri/                    # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs               # Entry point (calls lib.rs)
│   │   ├── lib.rs                # Tauri app setup, command registration
│   │   ├── commands.rs           # Tauri command handlers (invoke from JS)
│   │   ├── database.rs           # SQLite database operations
│   │   ├── models.rs             # Rust data structures
│   │   └── streaming_server.rs   # HTTP streaming server for local videos
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri configuration
│   └── lib/                      # mpv DLLs (Windows: libmpv-wrapper.dll, libmpv-2.dll)
│
├── atlas/                        # Comprehensive documentation
│   ├── README.md                 # This file - documentation index
│   ├── advanced-player-controller.md
│   ├── playlist&tab.md
│   ├── importexport.md
│   ├── ui.md
│   ├── history.md
│   ├── videoplayer.md
│   ├── local-videos.md
│   ├── audio-visualizer.md
│   ├── debug.md
│   ├── state-management.md
│   ├── database-schema.md
│   ├── api-bridge.md
│   └── navigation-routing.md
│
├── dev-logs/                     # Development change logs
│   ├── README.md                 # Dev logs guide
│   ├── TEMPLATE.md               # Dev log template
│   └── [YYYY-MM-DD-feature-name].md  # Individual dev logs
│
├── playlists.db                  # SQLite database file (project root)
├── package.json                  # Node.js dependencies
├── vite.config.js                # Vite configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── projectcontext.md             # Detailed project context
└── keylist.md                    # Feature documentation structure
```

## Quick Reference: Where to Find What

### By Feature Area

| Feature | Primary Document | Related Documents |
|---------|-----------------|-------------------|
| **Player Controller** | `advanced-player-controller.md` | `navigation-routing.md`, `state-management.md` |
| **Settings, Signature & Borders** | `ui.md` | `state-management.md` (configStore) |
| **Support Hub** | `ui.md` | `navigation-routing.md`, `playlistStore.js` |
| **Playlists & Tabs** | `playlist&tab.md` | `database-schema.md`, `api-bridge.md`, `state-management.md` |
| **Import/Export** | `importexport.md` | `api-bridge.md`, `database-schema.md` |
| **UI Components** | `ui.md` | `state-management.md`, `navigation-routing.md` |
| **Watch History** | `history.md` | `database-schema.md`, `api-bridge.md`, `state-management.md` |
| **Video Player** | `videoplayer.md` | `database-schema.md`, `api-bridge.md`, `state-management.md` |
| **Local Videos** | `local-videos.md` | `videoplayer.md`, `database-schema.md`, `api-bridge.md`, `importexport.md` |
| **Audio Visualizer** | `audio-visualizer.md` | `advanced-player-controller.md`, `api-bridge.md` |
| **Banners (ASCII & Unified)** | `banner.md` | `ui.md`, `state-management.md` |
| **Debug/Testing** | `debug.md` | `ui.md` (inspect mode, debug bounds) |

### By Technical Domain

| Domain | Document | Related Documents |
|--------|----------|-------------------|
| **State Management** | `state-management.md` | All feature docs (stores used throughout) |
| **Database** | `database-schema.md` | `api-bridge.md`, all feature docs (data persistence) |
| **API Layer** | `api-bridge.md` | `database-schema.md`, all feature docs (data operations) |
| **Navigation** | `navigation-routing.md` | `advanced-player-controller.md`, `ui.md`, `state-management.md` |

## Document Descriptions

### Feature Documentation

#### `advanced-player-controller.md`
**Covers**: Central orb, menu rectangles, playlist/video navigation, preview system, folder management, dual player system, likes playlist
**Key Topics**: Orb customization, preview navigation, colored shuffle, quick assign, pin system
**Cross-References**: See `navigation-routing.md` for navigation flows, `state-management.md` for store usage

#### `playlist&tab.md`
**Covers**: Playlist management, tab system, tab presets, colored folders, sticky folders
**Key Topics**: Playlist CRUD, tab organization, folder assignments, bulk tagging
**Cross-References**: See `database-schema.md` for table structures, `api-bridge.md` for commands

#### `importexport.md`
**Covers**: YouTube import, JSON import/export, bulk import
**Key Topics**: YouTube Data API v3, JSON format, local references, folder assignments in exports
**Cross-References**: See `api-bridge.md` for import commands, `database-schema.md` for data structure

#### `ui.md`
**Covers**: Side menu, page layouts, card components, grid systems, star color picker menu, **Support Hub**, **Custom Player Borders**, **Custom ASCII Banners**
**Key Topics**: PlaylistsPage, VideosPage, **HistoryPage (List Layout)**, **SupportPage (Tabs & Split View)**, Card architecture, folder selector
**Cross-References**: See `state-management.md` for page routing, `navigation-routing.md` for navigation flows

#### `history.md`
**Covers**: Watch history tracking, history page display
**Key Topics**: Last 100 videos, deduplication, **list layout**, history cards
**Cross-References**: See `database-schema.md` for watch_history table, `api-bridge.md` for history commands

#### `videoplayer.md`
**Covers**: YouTube iframe player, progress tracking, dual player system
**Key Topics**: YouTube IFrame API, progress persistence, watch status (unwatched/partially watched/watched)
**Cross-References**: See `database-schema.md` for video_progress table, `api-bridge.md` for progress commands

#### `local-videos.md`
**Covers**: Local video file playback, file upload, HTML5 video player
**Key Topics**: Local file paths, file selection dialog, progress tracking for local videos, player routing
**Cross-References**: See `videoplayer.md` for player architecture, `database-schema.md` for is_local field, `api-bridge.md` for file commands

#### `audio-visualizer.md`
**Covers**: System-wide audio visualization, cpal backend integration, FFT processing
**Key Topics**: Rust audio capture, thread safety, frequency mapping, performance tuning
**Cross-References**: See `advanced-player-controller.md` for UI integration, `api-bridge.md` for commands

#### `banner.md`
**Covers**: Unified Banner System, PageBanner component, Sticky Toolbar integration
**Key Topics**: Visual stitching, intelligent background scaling, horizontal scroll animation, future refactoring plans
**Cross-References**: See `ui.md` for layout integration

#### `debug.md`
**Covers**: Debug bounds, inspect mode, layout debugging, ruler overlay (non-functional)
**Key Topics**: Visual debugging, element labels, layout regions, measurement tools
**Cross-References**: See `ui.md` for layout structure, `state-management.md` for debug state

### Technical Documentation

#### `state-management.md`
**Covers**: All 7 Zustand stores, state flow patterns, persistence strategies
**Key Topics**: Store architecture, state dependencies, localStorage vs database persistence
**Cross-References**: Referenced by all feature docs (stores are used throughout)

#### `database-schema.md`
**Covers**: Complete SQLite schema, all 6 tables, relationships, indexes
**Key Topics**: Table structures, foreign keys, query patterns, data types
**Cross-References**: Referenced by all feature docs (data persistence), `api-bridge.md` (commands use schema)

#### `api-bridge.md`
**Covers**: Tauri command layer, API function organization, error handling
**Key Topics**: Command categories, parameter naming (snake_case ↔ camelCase), type conversions
**Cross-References**: Referenced by all feature docs (data operations), `database-schema.md` (commands use schema)

#### `navigation-routing.md`
**Covers**: Page navigation, playlist navigation, video navigation, preview navigation, folder filtering
**Key Topics**: Navigation flows, state preservation, entry points, navigation modes
**Cross-References**: See `advanced-player-controller.md` for player navigation, `ui.md` for page routing

## Cross-Reference Guide

### When Working On...

**Folder Assignments:**
- Primary: `playlist&tab.md` (Section 2.2)
- Database: `database-schema.md` (video_folder_assignments table)
- API: `api-bridge.md` (Folder Assignment Commands)
- State: `state-management.md` (folderStore)

**Video Progress:**
- Primary: `videoplayer.md` (Section 6.2)
- Database: `database-schema.md` (video_progress table)
- API: `api-bridge.md` (Video Progress Commands)
- State: `state-management.md` (playlistStore - video index)

**Preview Navigation:**
- Primary: `advanced-player-controller.md` (Section 1.4)
- Navigation: `navigation-routing.md` (Preview Navigation section)
- State: `state-management.md` (playlistStore - preview state)

**Tab System:**
- Primary: `playlist&tab.md` (Section 2.3)
- State: `state-management.md` (tabStore, tabPresetStore)
- Database: None (localStorage only)

**Import/Export:**
- Primary: `importexport.md`
- API: `api-bridge.md` (Import/Export Commands)
- Database: `database-schema.md` (playlists, playlist_items, video_folder_assignments tables)

**Card Components:**
- Primary: `ui.md` (Section 4.1.1.1, 4.1.2.1)
- Usage: All feature docs use cards (playlists, videos, history)

**Navigation Flows:**
- Primary: `navigation-routing.md`
- UI: `ui.md` (page routing)
- Controller: `advanced-player-controller.md` (playlist/video navigation)

## Document Structure

Each feature document follows this structure:
1. **User-Perspective Description** - What users see and interact with
2. **File Manifest** - All responsible files (UI/Components, State Management, API/Bridge, Backend)
3. **Logic & State Chain** - Trigger → Action → Persistence flow, Source of Truth, State Dependencies

Each technical document follows this structure:
1. **Overview** - Purpose and scope
2. **Architecture** - System design and patterns
3. **Details** - Comprehensive reference
4. **Patterns** - Common usage patterns
5. **Troubleshooting** - Common issues and solutions

## Missing Documentation

The following features are mentioned in `projectcontext.md` but not yet fully documented:

- **Layout Shell**: Detailed layout system documentation (covered in `ui.md` but could be expanded)

## Known Issues / Non-Functional Features

The following features exist in the codebase but are currently non-functional:
- **Ruler Overlay**: Measurement tool for main player area (see `debug.md` section 7.3)
  - Toggle button works and state management is functional
  - Component renders but ruler visualization does not appear
  - Infrastructure exists but requires debugging
- **Advanced Player Controller Layout**:
  - **Status: RESOLVED**. The top menu layout has been restored with fixed dimensions and absolute positioning.
  - Minor visual tuning may still be desired, but the critical regression is fixed.

## Theme Documentation

For detailed information about the application's theme system and recent color changes, see:
- **`THEME_CHANGES.md`** (project root): Comprehensive documentation of theme changes, color palette, and implementation details

## Usage Tips

1. **Start with feature docs** for user-facing functionality
2. **Reference technical docs** when you need implementation details
3. **Use cross-references** to navigate between related topics
4. **Check this index** when unsure which document contains information

## Session Updates (Jan 12, 2026) -> Fix Playlist Navigation & Title Sync

### Key Fixes Implemented:

1.  **Playlist Title Synchronization**:
    -   **Problem**: Title in Top Playlist Menu would "freeze" on a previewed playlist title when navigating away from the Videos page, or break when playing from a new context.
    -   **Fix**: Modified `PlayerController.jsx` to **strictly prioritize the active player's playlist title**. It now ignores `previewPlaylistId` for the top menu title display. The menu only updates when `currentPlaylistId` or `secondPlayerPlaylistId` changes.
    -   **Commit Logic**: Added "Commit Preview" logic to `VideosPage.jsx`. When clicking a video in a previewed playlist, it now explicitly calls `setPlaylistItems` with the *title included*, promoting the preview to the active state.

2.  **Navigation Loop Fix ("First 5 Playlists")**:
    -   **Problem**: Using the Next/Prev chevrons in the top menu would loop within the first few playlists.
    -   **Root Cause**: `currentNavigationIndex` in `playlistStore.js` was resetting to `-1` due to context lookup failures (likely type mismatch or missing folder references).
    -   **Fix**: Stabilized `setNavigationItems` logic in `playlistStore` and improved context matching. The index now correctly persists, preventing the reset-to-zero behavior.

3.  **Robust Metadata Fallback**:
    -   Added `currentPlaylistTitle` to `playlistStore` state. This acts as a "sticky" fallback, ensuring valid title text is displayed even during async loading states where the full playlist object might be momentarily unavailable.

### Learnings:
-   **Preview vs. Active Context**: It is critical to strictly separate "Browsing/Preview" state from "Active Playback" state in the UI. The Top Player Menu is a global control for the *active* audio/video context and should not reflect transient browsing actions until they are committed to playback.
-   **Store Reactivity**: Explicitly passing metadata (like titles) during state transitions (`setPlaylistItems`) prevents UI flickers and "Unknown" states better than relying solely on derived state from async fetches.

## Session Updates (Jan 12, 2026 - Part 2) -> Refine Player Controls & UI

### Key Features Summary:

1.  **Play Button Enhancements**:
    *   **Functionality**: Added right-click to reverse cycle colored folders and double right-click to reset filter to "All Videos".
    *   **Placement**: Swapped positions with the Grid button. Play button is now right of the chevrons, Grid button is centered between them.
    *   **visuals**: Aligned "All Videos" state with the neutral specific style (slate border/icon).

2.  **Pin Button Dual-Action**:
    *   **Logic**: Implemented short-click for "Normal Pin" and long-click (>600ms) for "Priority Pin".
    *   **Visuals**:
        *   Default/Inactive: Slate border/icon (matches Shuffle).
        *   Normal Pin: Black border, blue filled icon.
        *   Priority Pin: Amber border, amber filled icon.

3.  **New "Tooltip" Control**:
    *   Added an interactive **Info (i)** button to the action bar.
    *   Toggles a popup menu providing quick reference for mouse interaction shortcuts (Left/Right/Double/Long clicks).

4.  **Visual Unification**:
    *   **Like & Star Buttons**: Updated default (inactive) states to use uniform Slate colors (`#334155` border, `#475569` icon), replacing ad-hoc colors. All bottom-row action buttons now share a consistent design language.

### Learnings:
*   **Visual Hierarchy**: Using a consistent "neutral" style for inactive states allows active states (Colored Play, Pinned, Liked) to pop more effectively.
*   **Interaction Density**: Dual-action buttons (click vs. long-press) and right-click contexts allow for high functionality density without cluttering the UI with extra buttons.






## Session Updates (Jan 12, 2026 - Part 2) -> Refine Player Controls & UI

### Key Features Summary:
1.  **Play Button Enhancements**:
    *   **Functionality**: Added right-click to reverse cycle colored folders and double right-click to reset filter to 'All Videos'.
    *   **Placement**: Swapped positions with the Grid button.
    *   **Visuals**: Aligned 'All Videos' state with standard slate style.
2. **Pin and Tooltip**: Added dual-action pin and new Info button.

## Session Updates (Jan 12, 2026 - Part 3) -> Polishing Player Controller UI

### Key Features Summary:
1.  **Refined Video Menu Spacing**:
    *   **Spacing Parity**: Adjusted the Video Menu's navigation controls (Chevron Left, Grid, Chevron Right) to match the exact spacing of the Playlist Menu (28px gaps).
    *   **Mirrored Layout**: Re-implemented the video navigation capsule to structurally mirror the playlist navigation capsule for consistency.
2.  **Custom Icons**:
    *   **Curvy Film Strip**: Replaced the standard 3x3 Grid icon with a custom SVG "curvy film strip" icon to represent the Grid View in a more dynamic/chaotic way.
3.  **Action Button Layout**:
    *   **Equal Spacing**: Evenly distributed the Star, Shuffle, Pin, and Like buttons between the Play Button (Left Anchor) and Info Button (Right Anchor).
    *   **Far Right Menu**: Moved the 3-dot "More Menu" button to the far right edge (280px offset) to separate it from the primary action cluster.

## Session Updates (Jan 13, 2026) -> Playlist Card Hover Actions

### Key Features Implemented:

1.  **Refined Playlist Card UI**:
    -   **Action Repositioning**: Moved the **Play** and **Preview** hover buttons from the thumbnail overlay to the right side of the **Playlist Title Bar**.
    -   **Visual Cleanup**: Removed the large, center-overlaid buttons to provide a clearer view of the thumbnail art.
    -   **Title Bar Integration**: Converted the title bar into a flex container to house the new icon-only controls (Play, Shuffle, Preview) which appear on hover.

2.  **New Interaction Capabilities**:
    -   **Shuffle Button**: Added a dedicated **Shuffle** icon button to the immediate right of the Play button. It instantly shuffles the playlist/folder items and starts playback.
    -   **Right-Click to Play Cover**:
        -   **Behavior**: Right-clicking the Play button now scans the playlist to find the video matching the current card thumbnail (the "Cover Video").
        -   **Use Case**: Allows users to instantly jump to the "Featured" video represented by the cover art, rather than starting from the top of the list.
        -   **Fallback**: Standard left-click behavior (play from start) remains unchanged.

3.  **Cross-Component Consistency**:

## Session Updates (Jan 13, 2026 - Part 2) -> Performance Optimization & Skeletons

### Key Features Implemented:
1.  **Batch Data Fetching (Backend)**:
    -   Implemented `get_all_folder_assignments` and `get_all_playlist_metadata` Tauri commands.
    -   Reduced N+1 database queries to single batch operations for Videos and Playlists pages.

2.  **Optimistic UI (Frontend)**:
    -   **Skeleton Loading**: Created `VideoCardSkeleton` and `PlaylistCardSkeleton` components with `shimmer` animation.
    -   Integrated skeletons into `VideosPage` and `PlaylistsPage` to eliminate "pop-in" and provide instant perceived loading.

3.  **Result**:
    -   Eliminated UI stutter during page transitions.
    -   Grid layouts load progressively and smoothly.

## Session Updates (Jan 14, 2026) -> Video Card Interaction Refinement

### Key Changes:
1.  **Video Card Cleanup**:
    -   **Removed Hover Buttons**: Removed the Play button, Priority Pin button, and Pin/Bookmark button from the video thumbnail hover overlay to reduce visual clutter.
    -   **Cleaned Up State**: Removed unused state logic and event handlers associated with these buttons (`isPriority`, `handlePinClick`, etc.).
    -   **Updated Documentation**: Reflected these changes in `atlas/ui.md`.
