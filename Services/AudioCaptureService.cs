using System;
using System.Collections.Generic;
using System.Diagnostics;
using NAudio.Wave;

namespace Atlas3.Services;

public sealed class AudioChunkEventArgs : EventArgs
{
    public AudioChunkEventArgs(float[] samples, int sampleRate)
    {
        Samples = samples;
        SampleRate = sampleRate;
    }

    public float[] Samples { get; }
    public int SampleRate { get; }
}

/// <summary>
/// System-wide audio capture for the visualizer (WASAPI loopback).
/// Emits mono float samples in the range [-1, 1].
/// </summary>
public sealed class AudioCaptureService : IDisposable
{
    private readonly object _gate = new();
    private WasapiLoopbackCapture? _capture;
    private WaveFormat? _format;

    private readonly List<float> _pendingMono = new(capacity: 8192);
    private readonly Stopwatch _clock = Stopwatch.StartNew();
    private long _lastEmitMs = 0;

    // Match the visualizer cadence; it renders at 60fps, but audio can be pushed at ~40fps.
    private const int EmitIntervalMs = 25;
    private const int MaxEmitSamples = 8192; // safety cap (mono samples)

    public event EventHandler<AudioChunkEventArgs>? AudioChunkAvailable;

    public bool IsRunning
    {
        get
        {
            lock (_gate) return _capture != null;
        }
    }

    public void Start()
    {
        lock (_gate)
        {
            if (_capture != null) return;

            var capture = new WasapiLoopbackCapture();
            _capture = capture;
            _format = capture.WaveFormat;

            _pendingMono.Clear();
            _lastEmitMs = 0;

            capture.DataAvailable += OnDataAvailable;
            capture.RecordingStopped += OnRecordingStopped;
            capture.StartRecording();
        }
    }

    public void Stop()
    {
        WasapiLoopbackCapture? capture;
        lock (_gate)
        {
            capture = _capture;
        }

        // StopRecording will trigger RecordingStopped where we cleanup.
        try { capture?.StopRecording(); } catch { /* ignore */ }
    }

    private void OnRecordingStopped(object? sender, StoppedEventArgs e)
    {
        Cleanup();
    }

    private void OnDataAvailable(object? sender, WaveInEventArgs e)
    {
        WasapiLoopbackCapture? capture;
        WaveFormat? format;
        lock (_gate)
        {
            capture = _capture;
            format = _format;
        }

        if (capture == null || format == null) return;
        if (e.BytesRecorded <= 0) return;

        try
        {
            var mono = ConvertToMonoFloat(e.Buffer, e.BytesRecorded, format);
            if (mono.Length == 0) return;

            float[]? chunkToEmit = null;
            int sampleRateToEmit = format.SampleRate;

            // Accumulate and emit at a steady cadence (reduces WebView message spam).
            lock (_gate)
            {
                _pendingMono.AddRange(mono);

                // Safety: keep only the most recent samples if we fell behind.
                if (_pendingMono.Count > MaxEmitSamples * 2)
                {
                    _pendingMono.RemoveRange(0, _pendingMono.Count - (MaxEmitSamples * 2));
                }

                var nowMs = _clock.ElapsedMilliseconds;
                if (nowMs - _lastEmitMs < EmitIntervalMs) return;
                _lastEmitMs = nowMs;

                var emitCount = Math.Min(_pendingMono.Count, MaxEmitSamples);
                if (emitCount <= 0) return;

                // Emit the most recent chunk to keep the visualizer "live".
                var start = Math.Max(0, _pendingMono.Count - emitCount);
                chunkToEmit = _pendingMono.GetRange(start, emitCount).ToArray();

                // Keep some overlap for the next frame, but avoid unbounded growth.
                // Retain last 4096 samples as overlap.
                const int retain = 4096;
                if (_pendingMono.Count > retain)
                {
                    _pendingMono.RemoveRange(0, _pendingMono.Count - retain);
                }
            }

            if (chunkToEmit != null)
            {
                AudioChunkAvailable?.Invoke(this, new AudioChunkEventArgs(chunkToEmit, sampleRateToEmit));
            }
        }
        catch
        {
            // Avoid crashing the app due to capture format edge cases.
            // If needed, we can surface this via Debug output later.
        }
    }

    private static float[] ConvertToMonoFloat(byte[] buffer, int bytesRecorded, WaveFormat format)
    {
        var channels = Math.Max(1, format.Channels);
        var blockAlign = Math.Max(1, format.BlockAlign);
        var frames = bytesRecorded / blockAlign;
        if (frames <= 0) return Array.Empty<float>();

        // Convert interleaved samples -> mono.
        if (format.Encoding == WaveFormatEncoding.IeeeFloat && format.BitsPerSample == 32)
        {
            var sampleCount = frames * channels;
            var interleaved = new float[sampleCount];
            Buffer.BlockCopy(buffer, 0, interleaved, 0, sampleCount * sizeof(float));

            if (channels == 1) return interleaved;

            var mono = new float[frames];
            var idx = 0;
            for (var f = 0; f < frames; f++)
            {
                float sum = 0;
                for (var c = 0; c < channels; c++)
                {
                    sum += interleaved[idx++];
                }
                mono[f] = sum / channels;
            }
            return mono;
        }

        if (format.Encoding == WaveFormatEncoding.Pcm && format.BitsPerSample == 16)
        {
            var mono = new float[frames];
            var offset = 0;
            for (var f = 0; f < frames; f++)
            {
                float sum = 0;
                for (var c = 0; c < channels; c++)
                {
                    var sample = BitConverter.ToInt16(buffer, offset);
                    offset += 2;
                    sum += sample / 32768f;
                }
                mono[f] = sum / channels;
            }
            return mono;
        }

        // Unsupported format (rare on modern Windows loopback, but possible).
        return Array.Empty<float>();
    }

    private void Cleanup()
    {
        lock (_gate)
        {
            if (_capture != null)
            {
                try
                {
                    _capture.DataAvailable -= OnDataAvailable;
                    _capture.RecordingStopped -= OnRecordingStopped;
                }
                catch { /* ignore */ }

                try { _capture.Dispose(); } catch { /* ignore */ }
                _capture = null;
            }

            _format = null;
            _pendingMono.Clear();
        }
    }

    public void Dispose()
    {
        Stop();
        Cleanup();
    }
}

