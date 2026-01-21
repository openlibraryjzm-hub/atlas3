# Audio Visualizer Documentation

**Purpose**: This document details the implementation, architecture, and usage of the system-wide audio visualizer integrated into the Video Player Controller.

---

## 1. Overview

The Audio Visualizer creates a circular, audio-reactive visualization around the central Orb menu. It mimics the aesthetic of the Rainmeter "VisBubble" widget.

### Key Features
*   **System-Wide Audio Capture**: Captures *all* audio playing on the computer (YouTube, Spotify, Games, etc.), not just audio from the app.
*   **Rainmeter Aesthetic**: 113 bars, white, outward-facing, circular layout (270° start).
*   **Thread-Safe Backend**: Uses a dedicated audio thread to prevent UI freezing.
*   **Zero-Latency Loopback**: Uses `WASAPI Loopback` via the `cpal` crate.
*   **Overflows Controller**: Visualizer bars extend beyond the controller area, overlapping the video player for an immersive effect.
*   **Orb Border Integration**: The visualizer radius is tightly tuned (77px) to act as the border of the 154px Orb, replacing the static CSS border.
*   **Distance-Based Transparency**: Features a gradient opacity system where bars are solid at the base (near the Orb) and fade to transparency as they extend outward, creating a cohesive overlap with UI elements.
*   **Toggleable**: Can be turned on/off via the User Interface.

---

## 2. Architecture

The system uses a "push" architecture where the Rust backend captures audio and blindly pushes it to the Frontend via Tauri Events.

### 2.1 Backend (Rust)
*   **Library**: `cpal` (Cross-Platform Audio Library) v0.15.
*   **Capture Mode**: Shared Mode Loopback (Default Output Device).
*   **Data Flow**:
    1.  `AudioCapture` struct spawns a dedicated capture thread.
    2.  `cpal` triggers a callback with raw audio samples (typically Stereo `f32`).
    3.  Callback **downmixes to Mono** (averages Left/Right channels) to save bandwidth.
    4.  Mono samples are moved to a `Vec<f32>` and emitted to Frontend via `app.emit("audio-data", payload)`.
*   **Thread Safety**: Uses `std::sync::mpsc` channels to handle Start/Stop signals without blocking.

### 2.2 Frontend (React)
*   **Component**: `src/components/AudioVisualizer.jsx`
*   **Rendering**: HTML5 `<canvas>` (High performance 2D Context).
*   **Processing Pipeline**:
    1.  **Queueing**: Receives raw chunks from Rust and adds them to a ring buffer (`audioDataQueueRef`).
    2.  **Framing**: Uses a sliding window (peeks at last 2048 samples) with ~60% overlap effectively.
    3.  **FFT**: Computes Fast Fourier Transform using `fft-js`.
    4.  **Mapping**: Maps frequency bins to 113 visual bars (Logarithmic scale matches human hearing).
    5.  **Smoothing**: Applies temporal smoothing to prevent jitter.
    6.  **Drawing**: Clears and redraws the canvas 60 times per second (16ms).

---

## 3. Usage & Controls

### 3.1 Enabling the Visualizer
The visualizer is **disabled by default** to save CPU resources.

1.  Navigate to the Video Player.
2.  Click the **3-Dot Menu** button (Top Right of the Orb).
3.  Click **"Show Audio Visualizer"**.
4.  The bars will appear around the central Orb.

### 3.2 Troubleshooting
*   **No Bars**:
    *   Ensure system volume is not zero.
    *   Ensure something is actually playing audio on the *Default Output Device*.
    *   Check the terminal for `[AudioCapture]` logs.
*   **"Device in Use" Error**:
    *   Restart the application. The new backend handles device conflicts better, but OS-level locks can still occur.

---

## 4. Tuning Recommendations

The visualizer's "feel" is highly dependent on math constants in `AudioVisualizer.jsx`.

### **Current Recommendations (Jan 2026)**
If the visualizer looks too "jittery" or "weird" compared to Rainmeter, adjust these values in `AudioVisualizer.jsx`:

1.  **Smoothing (`smoothing`)**
    *   **Recommendation**: **`0.6`** - `0.8`
    *   **Effect**: A value of `0.0` is raw data (strobe light effect). A value of `0.9` is extremely slow/syrupy. `0.6` provides the best balance of responsiveness and "smoothness".

2.  **Pre-Amp Gain (`preAmpGain`)**
    *   **Recommendation**: **`4.0`**
    *   **Effect**: Multiplies the raw audio signal. If bars are too short/invisible, increase this. If bars are always hitting the max length (clipping), decrease this.

3.  **Sensitivity (`sensitivity`)**
    *   **Recommendation**: **`64`** (Default)
    *   **Effect**: Controls the overall height scaling after FFT processing.

4.  **Visualizer Gradient (`visualizerGradient`)**
    *   **Description**: Toggles the distance-based transparency fade.
    *   **Setting**: Configurable in Settings -> Visualizer -> Visualizer Effects.
    *   **Effect**: When enabled (default), bars fade from solid (at base) to transparent (at tip). When disabled, bars are solid white throughout.

---

## 5. File Manifest

### Backend
*   `src-tauri/src/audio_capture.rs`: Core capture logic.
*   `src-tauri/src/commands.rs`: `start_audio_capture` / `stop_audio_capture` commands.
*   `src-tauri/Cargo.toml`: `cpal` dependency.

### Frontend
*   `src/components/AudioVisualizer.jsx`: React component & Canvas renderer.
*   `src/components/PlayerController.jsx`: Host component (Orb wrapper).
*   `src/utils/audioProcessor.js`: Math helpers for FFT mapping.
