/**
 * Audio processing utilities for converting PCM audio data to frequency analysis
 */

/**
 * Convert PCM f32 samples to AudioBuffer and create AnalyserNode
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {Float32Array} samples - PCM audio samples (-1.0 to 1.0)
 * @param {number} sampleRate - Sample rate in Hz
 * @returns {AudioBuffer} AudioBuffer ready for analysis
 */
export function createAudioBufferFromSamples(audioContext, samples, sampleRate) {
  const buffer = audioContext.createBuffer(1, samples.length, sampleRate);
  buffer.getChannelData(0).set(samples);
  return buffer;
}

/**
 * Create an AnalyserNode with FFT configuration
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {number} fftSize - FFT size (2048 for high resolution)
 * @param {number} smoothingTimeConstant - Smoothing (0-1, 0 = no smoothing)
 * @returns {AnalyserNode} Configured analyser node
 */
export function createAnalyser(audioContext, fftSize = 2048, smoothingTimeConstant = 0) {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = fftSize;
  analyser.smoothingTimeConstant = smoothingTimeConstant;
  return analyser;
}

/**
 * Process audio buffer through analyser and get frequency data
 * @param {AudioContext} audioContext - Web Audio API context
 * @param {AnalyserNode} analyser - Analyser node
 * @param {AudioBuffer} buffer - Audio buffer to analyze
 * @returns {Uint8Array} Frequency data (0-255)
 */
export function getFrequencyData(audioContext, analyser, buffer) {
  // Create a source from the buffer
  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  // Connect to analyser
  source.connect(analyser);
  analyser.connect(audioContext.destination);

  // Get frequency data
  const frequencyBinCount = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(frequencyBinCount);
  analyser.getByteFrequencyData(dataArray);

  // Clean up
  source.disconnect();
  analyser.disconnect();

  return dataArray;
}

/**
 * Map frequency data to bar values (for 113 bars)
 * @param {Uint8Array} frequencyData - Raw frequency data from analyser
 * @param {number} barCount - Number of bars (113)
 * @param {number} freqMin - Minimum frequency (60 Hz)
 * @param {number} freqMax - Maximum frequency (11000 Hz)
 * @param {number} sampleRate - Sample rate (typically 44100 or 48000)
 * @returns {Uint8Array} Bar values (0-255)
 */
export function mapFrequencyToBars(frequencyData, barCount, freqMin, freqMax, sampleRate) {
  const frequencyBinCount = frequencyData.length;
  const nyquist = sampleRate / 2;
  const barValues = new Uint8Array(barCount);

  // Calculate frequency range per bin
  const freqPerBin = nyquist / frequencyBinCount;

  for (let i = 0; i < barCount; i++) {
    // Map bar index to frequency range (Logarithmic Scale)
    // Formula: f = min * (max/min)^(i/N)
    const logMin = Math.pow(freqMax / freqMin, i / barCount);
    const logMax = Math.pow(freqMax / freqMin, (i + 1) / barCount);

    const barFreqMin = freqMin * logMin;
    const barFreqMax = freqMin * logMax;

    // Find corresponding bins
    const startBin = Math.floor(barFreqMin / freqPerBin);
    const endBin = Math.ceil(barFreqMax / freqPerBin);

    // Average or max value in this range
    let sum = 0;
    let count = 0;

    // Ensure we at least check one bin (if band is narrower than bin width)
    // Actually our start/end logic covers this: 
    // If start is 2.6 (2) and end is 2.8 (3), loop runs for 2.
    // If start is 2.1 (2) and end is 2.2 (3), loop runs for 2.
    // The only case it might fail is if start/end are exact integers?
    // e.g. 2.0 to 2.0 (impossible since min < max)

    // Safety check to ensure we don't go out of bounds
    const safeEndBin = Math.min(endBin, frequencyBinCount);
    const safeStartBin = Math.min(startBin, safeEndBin - 1);

    // Special case: if range is valid but loop wouldn't run (unlikely with floor/ceil)
    // But let's just run the loop
    for (let bin = Math.max(0, safeStartBin); bin < safeEndBin; bin++) {
      sum += frequencyData[bin];
      count++;
    }

    barValues[i] = count > 0 ? Math.round(sum / count) : 0;
  }

  return barValues;
}

/**
 * Apply smoothing to bar values (neighbor averaging)
 * @param {Uint8Array} barValues - Current bar values
 * @param {Uint8Array} previousValues - Previous frame values (for smoothing)
 * @param {number} smoothing - Smoothing factor (0-1)
 * @returns {Uint8Array} Smoothed bar values
 */
export function smoothBarValues(barValues, previousValues, smoothing) {
  if (smoothing === 0 || !previousValues) {
    return barValues;
  }

  const smoothed = new Uint8Array(barValues.length);
  for (let i = 0; i < barValues.length; i++) {
    const prev = previousValues[i] || 0;
    smoothed[i] = Math.round(barValues[i] * (1 - smoothing) + prev * smoothing);
  }

  return smoothed;
}
