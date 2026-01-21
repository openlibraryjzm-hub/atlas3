# Atlas 3: Layer 2 - The Mock Browser

## Overview
Layer 2 of Atlas 3 is a fully functional web browser environment designed to run alongside the main application (Layer 1). It allows users to browse the web (e.g., Google, YouTube) without leaving the Atlas environment, supporting distinct use cases like managing playlists while browsing.

## Architecture
The browser is implemented as a standalone WPF UserControl to maintain separation of concerns from the main window logic.
*   **Component**: `Atlas3.Controls.BrowserOverlay`
*   **Hosting**: It is hosted in `MainWindow.xaml`'s `BrowserLayer` Grid (Column 1).
*   **Underlying Tech**: Microsoft WebView2 (Edge Chromium).

### Display Modes
The browser layer supports dynamic resizing and positioning managed by `MainWindow.xaml.cs`:
1.  **Full Mode**: Browser occupies the entire window; Layer 1 (App) is collapsed.
2.  **Split Mode**: Browser occupies the right 50% of the window; Layer 1 is squashed to the left 50%.
3.  **Hide Mode**: Browser is collapsed; Layer 1 occupies the entire window.

### Key Features
1.  **Tabbed Browsing**:
    *   Uses a standard WPF `TabControl`.
    *   Each tab hosts its own independent `WebView2` instance.
    *   Tabs show the current page title dynamically.
    *   **New Tab UX**: A dedicated right-most **“+” tab** creates new tabs (instead of a toolbar button).
    *   **Close Tab UX**: Each tab header contains its own close **“x”** button (instead of a global “close tab” button).
2.  **"Browser-as-a-Page" Integration**:
    *   The browser is integrated into the Layer 1 navigation flow.
    *   **Activation**: Clicking the `Monitor icon` in `TopNavigation.jsx` triggers `Split Mode`, hides Layer 1 side menus (Playlists/Videos), and sets the browser visibility state.
    *   **Deactivation**: Interacting with any Layer 1 navigation (e.g., clicking 'Playlists', 'Videos', or 'History' tabs) automatically sends a signal to hide the browser and restore the full video app view.
3.  **Hide Browser (Top-Right)**:
    *   The browser toolbar contains a top-right **“×”** button to **hide Layer 2**.
    *   Implementation detail: `BrowserOverlay` raises a `HideRequested` event, and `MainWindow` responds by switching to **Hide Mode**.
4.  **Deferred Initialization (Crucial)**:
    *   WebView2 **cannot** initialize correctly if it is created while invisible (Collapsed).
    *   **Solution**: The `BrowserOverlay` listens for `IsVisibleChanged`. It only spawns the initial tab/WebView when the layer is visibly toggled on by the user.

## File Structure

### `Controls/BrowserOverlay.xaml`
The visual layout of the browser.
*   **Toolbar (Row 0)**: Contains navigation buttons and the address bar.
*   **TabControl (Row 1)**: The container for browser tabs.

### `Controls/BrowserOverlay.xaml.cs`
The code-behind logic.
*   **`AddNewTab(string url)`**: Creates a new TabItem, initializes a WebView2 with the shared environment, and sets up event listeners.
*   **`UpdateNavButtons()`**: Checks `CoreWebView2.CanGoBack` / `CanGoForward` to toggle button states.
*   **`BrowserOverlay_IsVisibleChanged`**: The entry point that triggers the first tab creation.

## "Memory" and Persistence (Current vs Planned)
**Current implementation**: Tabs use the default WebView2 environment (`EnsureCoreWebView2Async(null)`), which is the simplest/stablest baseline during the port.

**Planned enhancement**: If we want Chrome-like persistence (cookies/logins/cache), move tabs to a shared user data folder such as `browser_profile/` under the app directory via a shared `CoreWebView2Environment`.

## Future Roadmap (Agent Onboarding)
*   **Extensions**: To add Chrome-like extensions, you will interact with `CoreWebView2.Profile.AddBrowserExtensionAsync`.
*   **Script Injection**: Use `CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync` to inject JS into every page (e.g., for ad-blocking or custom controls).
*   **Downloads**: Hook into `CoreWebView2.DownloadStarting` to manage file downloads customly.
