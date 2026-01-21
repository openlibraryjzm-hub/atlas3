# Atlas 3: The Triple-Layer Architecture Guide

## 1. Core Philosophy: "The Stack of Papers"
Atlas 3 moves away from managing multiple native windows or fighting with framework limitations. Instead, it treats the application as a single cohesive C# WPF Window containing three distinct, superimposed "layers" (like a stack of transparencies).

**The C# Host is the Boss.** It controls visibility, layout, and Z-ordering. The layers do not fight; they obey.

**Important UI constraint:** WebView2 is a heavyweight HWND (“airspace”). This means WPF cannot reliably draw a truly transparent overlay on top of it. Any “title bar” UI that must visually overlay web content should be implemented *inside the WebView* (Layer 1) and forwarded to the host via the bridge.

---

## 2. The Three Layers

### Layer 1: The Application (Base)
*   **Role:** The main interface, library, and controller.
*   **Tech:** WebView2.
*   **Content:** This will house the ported React/Tauri application.
*   **Behavior:** 
    *   Always at the bottom of the stack (`Grid.Row="0"`).
    *   In **Normal Mode**, it spans the full width.
    *   In **Split Mode**, it is "squashed" to the Left Column (50% width). **Crucially**, the React frontend is programmed to hide its own side menus (Playlists/Videos Grid) in this state, ensuring Layer 1 only displays the active player/navigation, effectively treating the browser as the primary "page".
    *   **Window Controls**: Minimize/Maximize/Close and “drag to move window” are implemented in the **Layer 1 banner UI** and dispatched to the C# host via WebView2 messaging (not via a WPF overlay).

### Layer 2: The Browser (Middle)
*   **Documentation:** [Detailed Guide](browser_layer.md)
*   **Role:** A lightweight, mock-Chrome web browser for browsing the internet within the app.
*   **Tech:** WebView2 (separate instances per Tab) wrapped in a WPF `TabControl`.
*   **Optimization:** **NO CefSharp.** We use WebView2 for its lightweight footprint and shared Edge runtime.
*   **Seamless Integration**: The browser acts as a toggleable "page". Clicking any main app navigation tab (e.g., Playlists) automatically triggers a hide signal to Layer 2 and restores the Layer 1 UI to its normal full-width view.
*   **Modes:**
    *   **Hidden:** Completely collapsed when not in use.
    *   **Split Screen:** Occupies the Right Column (50%). Layer 1 is visible on the left.
    *   **Full Screen:** Occupies the full window, hiding Layer 1 completely to avoid rendering overhead/airspace issues.

### Layer 3: The Media Overlay (Top)
*   **Role:** High-performance video playback (Cinema Mode, Picture-in-Picture).
*   **Tech:** `Mpv.NET` (libmpv wrapper).
*   **Behavior:**
    *   Always sits on top (`Panel.ZIndex="999"`).
    *   Can mask the entire screen or just a section.
    *   Used to override/replace default web players (e.g., YouTube embeds) with a native, hardware-accelerated player.

---

## 3. Key Technical Decisions

### The "Airspace" Solution
WebView2 and Mpv.NET are "heavyweight" native controls (HWNDs). They inherently want to draw over everything.
*   **Problem:** You cannot easily stack semi-transparent WPF controls over them.
*   **Solution:** We manage strict **Visibility States**.
    *   When Layer 3 (MPV) is up, we hide underneath layers if necessary.
    *   When Layer 2 (Browser) is Full Screen, we `Collapse` Layer 1.
    *   **Split Screen Fix:** We do **NOT** overlap Layer 2 on Layer 1. We use a Grid with 2 Columns. Layer 1 gets Col 0, Layer 2 gets Col 1. This prevents "Z-Fighting" and flickering.

### Borderless Host Window Notes
The host window is borderless (`WindowStyle=None`) for a modern look. In practice, Windows/DWM may still present a thin OS border/shadow in some states. This is acceptable for now in exchange for stability (resize hit-testing + taskbar-aware maximize).

### C# Backend transition
*   **Old Architecture:** Rust Backend + Tauri Frontend.
*   **New Architecture:** C# Backend (WPF) + React Frontend (WebView2).
*   **Why:** Allows seamless integration of the Triple Layers. All database (SQLite) and system operations will be handled by standard .NET libraries (`Microsoft.Data.Sqlite`), removing the need for inter-process communication with a separate Rust binary.

---

## 4. Current State (Foundational Prototype)
*   ✅ **Layering Works:** Toggles between App, Browser, and Red Screen (MPV placeholder) validated.
*   ✅ **Browser Tabs:** Dynamic creation/destruction of WebView2 tabs working.
*   ✅ **Split Screen:** Instant 50/50 snapping using Column definitions works perfectly.
*   ⚠️ **MPV:** Currently a red placeholder grid. Needs `libmpv.dll` integration.
