use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use std::sync::mpsc::{channel, Sender};
use std::thread;
use tauri::{AppHandle, Emitter};

pub struct AudioCapture {
    stop_tx: Option<Sender<()>>,
}

impl AudioCapture {
    pub fn new() -> Self {
        Self { stop_tx: None }
    }

    pub fn start(&mut self, app: AppHandle) -> Result<(), String> {
        eprintln!("[AudioCapture] start() called");

        if self.stop_tx.is_some() {
            eprintln!("[AudioCapture] Stream already running, stopping first");
            self.stop()?;
        }

        let (res_tx, res_rx) = channel();
        let (stop_tx, stop_rx) = channel();

        self.stop_tx = Some(stop_tx);

        // spawn a thread to handle the stream
        thread::spawn(move || {
            let init_result = (|| -> Result<cpal::Stream, String> {
                let host = cpal::default_host();
                eprintln!("[AudioCapture] Host: {}", host.id().name());

                let device = host
                    .default_output_device()
                    .ok_or("No output device available")?;
                eprintln!(
                    "[AudioCapture] Device: {}",
                    device.name().unwrap_or("unknown".to_string())
                );

                let config = device
                    .default_output_config()
                    .map_err(|e| format!("Failed to get default output config: {}", e))?;
                eprintln!("[AudioCapture] Config: {:?}", config);

                let channels = config.channels();
                eprintln!("[AudioCapture] Channels: {}", channels);

                let err_fn = |err| eprintln!("[AudioCapture] Stream error: {}", err);

                eprintln!("[AudioCapture] Building input stream (loopback)...");

                let stream = match config.sample_format() {
                    cpal::SampleFormat::F32 => {
                        let app = app.clone();
                        device.build_input_stream(
                            &config.into(),
                            move |data: &[f32], _: &_| process_f32(data, channels, &app),
                            err_fn,
                            None,
                        )
                    }
                    cpal::SampleFormat::I16 => {
                        let app = app.clone();
                        device.build_input_stream(
                            &config.into(),
                            move |data: &[i16], _: &_| process_i16(data, channels, &app),
                            err_fn,
                            None,
                        )
                    }
                    cpal::SampleFormat::U16 => {
                        let app = app.clone();
                        device.build_input_stream(
                            &config.into(),
                            move |data: &[u16], _: &_| process_u16(data, channels, &app),
                            err_fn,
                            None,
                        )
                    }
                    sample_format => {
                        return Err(format!("Unsupported sample format: {:?}", sample_format))
                    }
                }
                .map_err(|e| format!("Failed to build input stream: {}", e))?;

                stream
                    .play()
                    .map_err(|e| format!("Failed to play stream: {}", e))?;

                Ok(stream)
            })();

            match init_result {
                Ok(stream) => {
                    // Send success to main thread
                    if let Err(_) = res_tx.send(Ok(())) {
                        eprintln!("[AudioCapture] Failed to send success signal");
                        return;
                    }

                    eprintln!(
                        "[AudioCapture] Stream started successfully, waiting for stop signal..."
                    );

                    // Wait for stop signal
                    let _ = stop_rx.recv();

                    eprintln!("[AudioCapture] Stop signal received, pausing stream...");
                    stream.pause().ok();
                }
                Err(e) => {
                    // Send error to main thread
                    if let Err(_) = res_tx.send(Err(e)) {
                        eprintln!("[AudioCapture] Failed to send error signal");
                    }
                }
            }
        });

        // Wait for result from thread
        match res_rx.recv() {
            Ok(result) => result,
            Err(_) => Err("Failed to receive initialization result from thread".to_string()),
        }
    }

    pub fn stop(&mut self) -> Result<(), String> {
        if let Some(tx) = self.stop_tx.take() {
            eprintln!("[AudioCapture] Sending stop signal...");
            tx.send(())
                .map_err(|e| format!("Failed to send stop signal: {}", e))?;
            eprintln!("[AudioCapture] Stop signal sent");
        }
        Ok(())
    }
}

fn process_f32(data: &[f32], channels: u16, app: &AppHandle) {
    if channels == 0 {
        return;
    }
    let channels = channels as usize;

    // Debug logging
    use std::sync::atomic::{AtomicUsize, Ordering};
    static CALLBACK_COUNT: AtomicUsize = AtomicUsize::new(0);
    let count = CALLBACK_COUNT.fetch_add(1, Ordering::Relaxed);

    let mut max_amp = 0.0f32;
    for &sample in data {
        if sample.abs() > max_amp {
            max_amp = sample.abs();
        }
    }

    if count % 200 == 0 {
        // eprintln!("[AudioCapture] Callback stats...");
    }

    // Check if we can just emit directly if mono
    if channels == 1 {
        if let Err(_e) = app.emit("audio-data", data) {
            // ignore
        }
        return;
    }

    // Downmix
    let mut samples: Vec<f32> = Vec::with_capacity(data.len() / channels);
    for frame in data.chunks(channels) {
        let mut sum = 0.0;
        for &sample in frame {
            sum += sample;
        }
        samples.push(sum / channels as f32);
    }

    if !samples.is_empty() {
        if let Err(e) = app.emit("audio-data", &samples) {
            if count % 50 == 0 {
                eprintln!("[AudioCapture] Emit error: {}", e);
            }
        }
    }
}

fn process_i16(data: &[i16], channels: u16, app: &AppHandle) {
    if channels == 0 {
        return;
    }
    let channels = channels as usize;

    let mut samples: Vec<f32> = Vec::with_capacity(data.len() / channels);
    for frame in data.chunks(channels) {
        let mut sum = 0.0;
        for &sample in frame {
            sum += sample as f32 / 32768.0;
        }
        samples.push(sum / channels as f32);
    }

    if !samples.is_empty() {
        let _ = app.emit("audio-data", &samples);
    }
}

fn process_u16(data: &[u16], channels: u16, app: &AppHandle) {
    if channels == 0 {
        return;
    }
    let channels = channels as usize;

    let mut samples: Vec<f32> = Vec::with_capacity(data.len() / channels);
    for frame in data.chunks(channels) {
        let mut sum = 0.0;
        for &sample in frame {
            // u16 is 0..65535, center at 32768
            sum += (sample as f32 - 32768.0) / 32768.0;
        }
        samples.push(sum / channels as f32);
    }

    if !samples.is_empty() {
        let _ = app.emit("audio-data", &samples);
    }
}

impl Default for AudioCapture {
    fn default() -> Self {
        Self::new()
    }
}
