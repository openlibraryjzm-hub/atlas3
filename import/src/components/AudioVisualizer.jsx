import React, { useEffect, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { mapFrequencyToBars, smoothBarValues } from '../utils/audioProcessor';
import { fft, util } from 'fft-js';
import { useConfigStore } from '../store/configStore';

/**
 * AudioVisualizer - Circular audio visualizer matching Rainmeter VisBubble widget
 * 
 * Exact settings from Rainmeter:
 * - 113 bars in full circle (360°)
 * - Starts at 270° (bottom), rotates clockwise
 * - Bars extend outward
 * - White color, 4px width
 * - 76px base radius + 76px max extension
 * - FFT 2048, 60Hz-11kHz range
 * - 40 FPS (25ms updates)
 */
const AudioVisualizer = ({
  enabled = false,
  orbSize = 154,
  barCount = 113,
  barWidth = 4,
  radius = 76,
  radiusY = 76,
  maxBarLength = 76,
  minBarLength = 7,
  colors = [255, 255, 255, 255], // White RGBA
  smoothing = 0.75,
  preAmpGain = 4.0,
  angleTotal = Math.PI * 2, // 360°
  angleStart = -Math.PI / 2, // 270° (bottom)
  clockwise = true,
  inward = false,
  fftSize = 2048,
  freqMin = 60,
  freqMax = 11000,
  sensitivity = 64,
  updateRate = 16, // 16ms = ~60 FPS
}) => {
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const barValuesRef = useRef(null);
  const previousBarValuesRef = useRef(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const sampleRateRef = useRef(48000); // Default, will be updated from audio data
  const audioDataQueueRef = useRef([]); // Queue for audio samples
  const processingIntervalRef = useRef(null);
  const lastProcessTimeRef = useRef(0);
  const isCapturingRef = useRef(false); // Track capture state for cleanup
  const { visualizerGradient } = useConfigStore();

  // Initialize sample rate (will be updated from audio data)
  useEffect(() => {
    if (!enabled) return;
    // Sample rate will be updated when we receive audio data
    // Default to 48000 Hz (common for Windows audio)
    sampleRateRef.current = 48000;
  }, [enabled]);

  // Start/stop audio capture
  useEffect(() => {
    let mounted = true;

    const manageCapture = async () => {
      if (!enabled) {
        // Stop capture
        if (isCapturingRef.current) {
          console.log('[AudioVisualizer] Stopping audio capture...');
          try {
            await invoke('stop_audio_capture');
            if (mounted) {
              isCapturingRef.current = false;
              setIsCapturing(false);
            }
          } catch (error) {
            console.error('[AudioVisualizer] Error stopping capture:', error);
          }
        }
        return;
      }

      // Always try to stop first to ensure clean state
      if (isCapturingRef.current) {
        console.log('[AudioVisualizer] Stopping existing capture before restart...');
        try {
          await invoke('stop_audio_capture');
        } catch (error) {
          // Ignore errors if not running
          console.log('[AudioVisualizer] Stop error (may be expected):', error);
        }
        isCapturingRef.current = false;
        setIsCapturing(false);
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Start capture
      if (!mounted) return;

      try {
        console.log('[AudioVisualizer] Starting audio capture...');

        // Test command invocation first
        try {
          const testResult = await invoke('test_audio_command');
          console.log('[AudioVisualizer] Test command result:', testResult);
        } catch (testError) {
          console.error('[AudioVisualizer] Test command failed:', testError);
        }

        await invoke('start_audio_capture');
        if (mounted) {
          isCapturingRef.current = true;
          setIsCapturing(true);
          console.log('[AudioVisualizer] Audio capture started successfully');
        }
      } catch (error) {
        console.error('[AudioVisualizer] Failed to start audio capture:', error);
        if (mounted) {
          isCapturingRef.current = false;
          setIsCapturing(false);
        }
      }
    };

    manageCapture();

    return () => {
      mounted = false;
      if (isCapturingRef.current) {
        console.log('[AudioVisualizer] Stopping audio capture (cleanup)...');
        invoke('stop_audio_capture').catch(console.error);
        isCapturingRef.current = false;
        setIsCapturing(false);
      }
    };
  }, [enabled]);

  // Listen to audio data events and process
  useEffect(() => {
    if (!enabled) return;

    let unlisten = null;
    let eventCount = 0;

    const setupListener = async () => {
      try {
        console.log('[AudioVisualizer] Setting up audio data listener...');
        unlisten = await listen('audio-data', (event) => {
          // Log first event to confirm listener is working
          if (eventCount === 0) {
            console.log('[AudioVisualizer] ✅ FIRST AUDIO EVENT RECEIVED!', {
              payloadType: typeof event.payload,
              isArray: Array.isArray(event.payload),
              length: event.payload?.length,
              payload: event.payload?.slice ? event.payload.slice(0, 5) : event.payload
            });
          }

          const samples = event.payload; // Array of f32 samples

          if (!samples || !Array.isArray(samples) || samples.length === 0) {
            console.warn('[AudioVisualizer] Invalid samples:', samples);
            return;
          }

          eventCount++;
          if (eventCount === 1 || eventCount % 100 === 0) {
            const maxSample = Math.max(...samples.map(s => Math.abs(s)));
            console.log('[AudioVisualizer] Received', eventCount, 'audio events,', samples.length, 'samples, max:', maxSample.toFixed(4), 'queue size:', audioDataQueueRef.current.length);
          }

          // Add samples to queue
          audioDataQueueRef.current.push(...samples);

          // Keep queue size reasonable (last 2 seconds of audio at 48kHz = 96000 samples)
          const maxQueueSize = 96000;
          if (audioDataQueueRef.current.length > maxQueueSize) {
            audioDataQueueRef.current = audioDataQueueRef.current.slice(-maxQueueSize);
          }
        });
        console.log('[AudioVisualizer] Audio listener set up successfully, waiting for events...');

        // Set a timeout to warn if no events are received
        setTimeout(() => {
          if (eventCount === 0) {
            console.warn('[AudioVisualizer] ⚠️ No audio events received after 2 seconds. Check Rust console for audio capture logs.');
          }
        }, 2000);
      } catch (error) {
        console.error('[AudioVisualizer] Failed to set up audio listener:', error);
      }
    };

    setupListener();

    // Process audio queue periodically using direct FFT computation
    const processAudio = () => {
      const now = Date.now();
      if (now - lastProcessTimeRef.current < updateRate) {
        return;
      }
      lastProcessTimeRef.current = now;

      // Need at least fftSize samples to process
      if (audioDataQueueRef.current.length < fftSize) {
        return;
      }

      try {
        // SLIDING WINDOW: Peek at the LATEST fftSize samples (don't consume/splice)
        // This allows us to update at 60FPS even if we only have enough new data for 25FPS
        const samplesToProcess = audioDataQueueRef.current.slice(-fftSize);

        // Apply window function (Hanning window) to reduce spectral leakage
        const windowed = new Float32Array(fftSize);
        for (let i = 0; i < fftSize; i++) {
          const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / (fftSize - 1)));
          windowed[i] = samplesToProcess[i] * window;
        }

        // Compute FFT using fft-js
        const phasors = fft(Array.from(windowed));

        // Get magnitudes using utility function
        const magnitudes = util.fftMag(phasors);

        // Convert to frequency data (0-255 range)
        // Only use first half (Nyquist frequency)
        const frequencyBinCount = fftSize / 2;
        const frequencyData = new Uint8Array(frequencyBinCount);

        for (let i = 0; i < frequencyBinCount; i++) {
          // preAmpGain adjustment (default 4.0)
          // 200 was previous implicit gain (100 in code * 2 roughly?).
          // Let's rely on the prop. Code had 100.
          // Let's use preAmpGain * 25 as a baseline scaler?
          // If preAmpGain is 4.0, we want ~100x multiplier?
          // Magnitude from fft-js is usually small.
          // Let's try: magnitude * 100 * (preAmpGain / 4.0) ?
          // Or just magnitude * 25 * preAmpGain
          const normalized = Math.min(255, Math.round(magnitudes[i] * 25 * preAmpGain));
          frequencyData[i] = normalized;
        }

        // Map to bars
        const barValues = mapFrequencyToBars(
          frequencyData,
          barCount,
          freqMin,
          freqMax,
          sampleRateRef.current
        );

        // Apply smoothing if enabled
        const smoothed = smoothBarValues(
          barValues,
          previousBarValuesRef.current,
          smoothing
        );

        // Apply sensitivity
        const adjusted = new Uint8Array(smoothed.length);
        for (let i = 0; i < smoothed.length; i++) {
          const val = Math.min(255, Math.round(smoothed[i] * (sensitivity / 64)));
          adjusted[i] = val;
        }

        barValuesRef.current = adjusted;
        previousBarValuesRef.current = smoothed;
      } catch (e) {
        console.error('[AudioVisualizer] Error processing audio:', e);
      }
    };

    // Process audio every updateRate ms
    processingIntervalRef.current = setInterval(processAudio, updateRate);

    // CLEANUP QUEUE periodically prevents memory leaks
    const cleanupInterval = setInterval(() => {
      const maxQueueSize = 16384; // Keep enough for overlap
      if (audioDataQueueRef.current.length > maxQueueSize) {
        audioDataQueueRef.current = audioDataQueueRef.current.slice(-maxQueueSize);
      }
    }, 1000);

    return () => {
      if (unlisten) {
        unlisten();
      }
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
      clearInterval(cleanupInterval);
    };
  }, [enabled, barCount, freqMin, freqMax, sensitivity, smoothing, fftSize, updateRate, preAmpGain]);

  // Rendering loop
  useEffect(() => {
    if (!enabled || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size
    const totalRadius = radius + maxBarLength;
    const canvasSize = totalRadius * 2 + 20; // Extra padding
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const centerX = canvasSize / 2;
    const centerY = canvasSize / 2;

    // Parse color
    const parseColor = (color) => {
      if (Array.isArray(color)) {
        const [r, g, b, a = 255] = color;
        return `rgba(${r},${g},${b},${a / 255})`;
      }
      return color;
    };

    const strokeColor = parseColor(colors);

    // Parse color components for gradient
    const getGradientColors = (colorInput) => {
      let r = 255, g = 255, b = 255, a = 1.0;
      if (Array.isArray(colorInput)) {
        r = colorInput[0];
        g = colorInput[1];
        b = colorInput[2];
        a = (colorInput[3] !== undefined ? colorInput[3] : 255) / 255;
      }
      return {
        base: `rgba(${r},${g},${b},${a})`,
        tip: `rgba(${r},${g},${b},0.1)` // Stronger fade at tip
      };
    };

    const gradientColors = getGradientColors(colors);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!barValuesRef.current) {
        // Draw test pattern when no data (so visualizer is visible)
        ctx.lineWidth = barWidth;
        for (let i = 0; i < barCount; i++) {
          const barIndex = clockwise ? i : (barCount - 1 - i);
          const angle = angleStart + (angleTotal / barCount) * barIndex;
          const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

          // Draw minimum length bar so it's visible
          const baseX = centerX + radius * Math.cos(normalizedAngle);
          const baseY = centerY + radiusY * Math.sin(normalizedAngle);
          const endX = baseX + minBarLength * Math.cos(normalizedAngle);
          const endY = baseY + minBarLength * Math.sin(normalizedAngle);

          // Apply Gradient conditionally
          if (visualizerGradient) {
            // Create Gradient based on MAX length (Distance Zones)
            // This ensures transparency is a function of distance from center, not bar length
            const fixedEndX = baseX + maxBarLength * Math.cos(normalizedAngle);
            const fixedEndY = baseY + maxBarLength * Math.sin(normalizedAngle);

            const gradient = ctx.createLinearGradient(baseX, baseY, fixedEndX, fixedEndY);
            gradient.addColorStop(0, gradientColors.base);
            gradient.addColorStop(0.2, gradientColors.base); // Solid up to 20% of max reach
            gradient.addColorStop(1, gradientColors.tip);   // Fade to transparent at max reach

            ctx.strokeStyle = gradient;
          } else {
            ctx.strokeStyle = strokeColor;
          }
          ctx.beginPath();
          ctx.moveTo(baseX, baseY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }

      const barValues = barValuesRef.current;

      // Draw each bar
      for (let i = 0; i < barCount; i++) {
        // Calculate angle
        const barIndex = clockwise ? i : (barCount - 1 - i);
        const angle = angleStart + (angleTotal / barCount) * barIndex;
        const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

        // Get bar value (0-255)
        const value = barValues[i] || 0;
        const normalizedValue = value / 255; // 0-1

        // Calculate bar length
        const barLength = minBarLength + (normalizedValue * (maxBarLength - minBarLength));

        // Base position (at radius)
        const baseX = centerX + radius * Math.cos(normalizedAngle);
        const baseY = centerY + radiusY * Math.sin(normalizedAngle);

        // End position (extended)
        const endX = baseX + barLength * Math.cos(normalizedAngle);
        const endY = baseY + barLength * Math.sin(normalizedAngle);

        // Apply Gradient conditionally
        if (visualizerGradient) {
          // Create Gradient based on MAX length (Distance Zones)
          const fixedEndX = baseX + maxBarLength * Math.cos(normalizedAngle);
          const fixedEndY = baseY + maxBarLength * Math.sin(normalizedAngle);

          const gradient = ctx.createLinearGradient(baseX, baseY, fixedEndX, fixedEndY);
          gradient.addColorStop(0, gradientColors.base);
          gradient.addColorStop(0.2, gradientColors.base); // Solid up to 20% of max reach
          gradient.addColorStop(1, gradientColors.tip);   // Fade to transparent at max reach

          ctx.strokeStyle = gradient;
        } else {
          ctx.strokeStyle = strokeColor;
        }
        ctx.lineWidth = barWidth;
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }

      // Schedule next frame
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, barCount, barWidth, radius, radiusY, maxBarLength, minBarLength, colors, angleTotal, angleStart, clockwise, visualizerGradient]);

  if (!enabled) {
    return null;
  }

  const totalRadius = radius + maxBarLength;
  const canvasSize = totalRadius * 2 + 20;

  return (
    <canvas
      ref={canvasRef}
      className="absolute pointer-events-none"
      style={{
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 5, // Below orb buttons (z-50) but above background
        width: `${canvasSize}px`,
        height: `${canvasSize}px`,
      }}
    />
  );
};

export default AudioVisualizer;
