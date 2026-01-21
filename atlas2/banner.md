# Unified Banner System

## Overview
The Unified Banner System creates a seamless visual experience where a custom banner image appears to span across two separate UI components: the top `PageBanner` and the `Sticky Toolbar` (which appears when scrolling). 

Instead of treating them as separate images, the system "stitches" them together visually and animates them in unison, creating a premium, cohesive look.

## Core Concepts

### 1. Visual Stitching
The goal is for the sticky toolbar to look like it is revealing the bottom portion of the same image used in the top banner.
-   **Top Component (`PageBanner`)**: Displays the top portion of the image (Fixed height: `220px`).
-   **Bottom Component (`Sticky Toolbar`)**: Displays the bottom portion of the image, with a vertical offset equal to the height of the `PageBanner`.

### 2. Intelligent Scaling
To ensure the image covers the entire combined height (Banner + Toolbar) without excessive zooming or cropping, we calculate a custom `background-size`.
-   **Logic**: The system loads the image to get its natural dimensions. It then compares the image's aspect ratio to the container's aspect ratio (where "container height" = Banner Height + Toolbar Height Buffer).
-   **Result**: It derives a `bannerBgSize` string (e.g., `100% auto` or `auto 450px`) that ensures the image creates a continuous surface.

### 3. GPU-Accelerated Animation
Both components animate the background image horizontally using hardware acceleration.
-   **Mechanism**: A dedicated `UnifiedBannerBackground` component wraps the image.
-   **Performance**: Uses `transform: translate3d()` to animate on the compositor thread, ensuring 60fps performance without main-thread jank.
-   **Technique**: The component renders two copies of the image pattern side-by-side in a 200% width container and slides the container to create a seamless infinite loop.

## Implementation Details

### Components Involved
-   `src/components/UnifiedBannerBackground.jsx` (New re-usable GPU background component)
-   `src/components/PageBanner.jsx` (Top display)
-   `src/components/VideosPage.jsx` (Sticky Toolbar implementation)
-   `src/components/PlaylistsPage.jsx` (Sticky Toolbar implementation)

### State Flow
1.  **`PageBanner` calculates**:
    -   Measures rendered height and calculates optimal `bannerBgSize` based on image aspect ratio.
    -   Updates `bannerHeight` and `bannerBgSize` in `useConfigStore`.
2.  **Global Store (Omnipresent)**:
    -   Values are persisted in `useConfigStore`.
    -   This eliminates "pop-in" on page load since dimensions are already known.
3.  **Components Render**:
    -   **Sticky Toolbar** reads directly from `useConfigStore`.
    -   **Top Banner**: `<UnifiedBannerBackground yOffset="top" ... />`
    -   **Sticky Toolbar**: `<UnifiedBannerBackground yOffset={-bannerHeight} ... />`

### UnifiedBannerBackground Architecture
The core component (`src/components/UnifiedBannerBackground.jsx`) uses a specific DOM structure to enable smooth looping:

```jsx
<div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    {/* Container: 200% width, slides -50% (one viewport width) over 120s */}
    <div className="absolute top-0 left-0 h-full w-[200%] flex animate-gpu-scroll">
        {/* Copy 1: Initial View */}
        <div className="w-1/2 h-full" style={{ backgroundImage: ..., backgroundSize: ... }} />
        {/* Copy 2: Seamless Loop Partner */}
        <div className="w-1/2 h-full" style={{ backgroundImage: ..., backgroundSize: ... }} />
    </div>
</div>
```

**Animation CSS (`App.css`):**
```css
@keyframes gpu-scroll {
  0% { transform: translate3d(0, 0, 0); }
  100% { transform: translate3d(-50%, 0, 0); }
}

.animate-gpu-scroll {
  animation: gpu-scroll 120s linear infinite;
  will-change: transform;
}
```

## Usage
To enable this feature, a `customPageBannerImage` prop must be passed to the `PageBanner`. The system handles the rest automatically.

### Common Issues & Debugging
-   **"Grey Gap"**: Usually means `backgroundPositionY` offset is incorrect or `bannerHeight` measurement is stale.
-   ** misalignment**: Ensure `bannerBgSize` is identical in both components.
-   **No Animation**: Ensure `backgroundPositionX` is explicitly set to `0px` in inline styles, otherwise the shorthand `backgroundPosition` might override the animation.

## Future Plans: Global Layer Alignment

The current "Stitched" approach (two separate `UnifiedBannerBackground` instances) has solved the performance stutter. However, because they are separate React components, there may still be a slight "pop-in" delay on the Sticky Toolbar's background during initial page load or rapid state changes.

**Optimization (Optional)**: Move to a **Master Parallax Layer** architecture.
-   **Goal**: Solve alignment/pop-in completely.
-   **Method**: Render a single global `<UnifiedBannerBackground />` behind the entire app shell, and simply make the `PageBanner` and `Sticky Toolbar` transparent windows.
-   **Status**: Low priority. The current GPU-accelerated stitching provides an excellent 60fps experience.

### Benefit
-   **Zero Pop-in**: Image loads with the app shell.
-   **Zero Stutter**: Animation runs on the GPU.
-   **Perfect Alignment**: It is literally one image, physically located in one place.
