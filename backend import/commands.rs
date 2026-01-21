use crate::audio_capture::AudioCapture;
use crate::database::Database;
use crate::models::*;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

// Playlist commands
#[tauri::command]
pub fn create_playlist(
    db: State<Mutex<Database>>,
    name: String,
    description: Option<String>,
) -> Result<i64, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.create_playlist(&name, description.as_deref())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_playlists(db: State<Mutex<Database>>) -> Result<Vec<Playlist>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_all_playlists().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_playlist_metadata(
    db: State<Mutex<Database>>,
) -> Result<Vec<PlaylistMetadata>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_all_playlist_metadata().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_playlist(db: State<Mutex<Database>>, id: i64) -> Result<Option<Playlist>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_playlist(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn update_playlist(
    db: State<Mutex<Database>>,
    id: i64,
    name: Option<String>,
    description: Option<String>,
    custom_ascii: Option<String>,
    custom_thumbnail_url: Option<String>,
) -> Result<bool, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.update_playlist(
        id,
        name.as_deref(),
        description.as_deref(),
        custom_ascii.as_deref(),
        custom_thumbnail_url.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_playlist(db: State<Mutex<Database>>, id: i64) -> Result<bool, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.delete_playlist(id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_playlist_by_name(db: State<Mutex<Database>>, name: String) -> Result<bool, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.delete_playlist_by_name(&name).map_err(|e| e.to_string())
}

// Playlist item commands
#[tauri::command]
pub fn add_video_to_playlist(
    db: State<Mutex<Database>>,
    playlist_id: i64,
    video_url: String,
    video_id: String,
    title: Option<String>,
    thumbnail_url: Option<String>,
    is_local: Option<bool>,
    author: Option<String>,
    view_count: Option<String>,
    published_at: Option<String>,
) -> Result<i64, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.add_video_to_playlist(
        playlist_id,
        &video_url,
        &video_id,
        title.as_deref(),
        thumbnail_url.as_deref(),
        is_local.unwrap_or(false),
        author.as_deref(),
        view_count.as_deref(),
        published_at.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_playlist_items(
    db: State<Mutex<Database>>,
    playlist_id: i64,
) -> Result<Vec<PlaylistItem>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_playlist_items(playlist_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_playlists_for_video_ids(
    db: State<Mutex<Database>>,
    video_ids: Vec<String>,
) -> Result<std::collections::HashMap<String, Vec<String>>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_playlists_for_video_ids(&video_ids)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn remove_video_from_playlist(
    db: State<Mutex<Database>>,
    playlist_id: i64,
    item_id: i64,
) -> Result<bool, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.remove_video_from_playlist(playlist_id, item_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reorder_playlist_item(
    db: State<Mutex<Database>>,
    playlist_id: i64,
    item_id: i64,
    new_position: i32,
) -> Result<bool, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.reorder_playlist_item(playlist_id, item_id, new_position)
        .map_err(|e| e.to_string())
}

// Folder assignment commands
#[tauri::command]
pub fn assign_video_to_folder(
    db: State<Mutex<Database>>,
    playlist_id: i64,
    item_id: i64,
    folder_color: String,
) -> Result<i64, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.assign_video_to_folder(playlist_id, item_id, &folder_color)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unassign_video_from_folder(
    db: State<Mutex<Database>>,
    playlist_id: i64,
    item_id: i64,
    folder_color: String,
) -> Result<bool, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.unassign_video_from_folder(playlist_id, item_id, &folder_color)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_videos_in_folder(
    db: State<Mutex<Database>>,
    playlist_id: i64,
    folder_color: String,
) -> Result<Vec<PlaylistItem>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_videos_in_folder(playlist_id, &folder_color)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_folder_assignments(
    db: State<Mutex<Database>>,
    playlist_id: i64,
) -> Result<std::collections::HashMap<String, Vec<String>>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_all_folder_assignments_for_playlist(playlist_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_video_folder_assignments(
    db: State<Mutex<Database>>,
    playlist_id: i64,
    item_id: i64,
) -> Result<Vec<String>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_video_folder_assignments(playlist_id, item_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_folders_with_videos(
    db: State<Mutex<Database>>,
) -> Result<Vec<FolderWithVideos>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_all_folders_with_videos().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_folders_for_playlist(
    db: State<Mutex<Database>>,
    playlist_id: i64,
) -> Result<Vec<FolderWithVideos>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_folders_for_playlist(playlist_id)
        .map_err(|e| e.to_string())
}

// Stuck folders commands
#[tauri::command]
pub fn toggle_stuck_folder(
    db: State<Mutex<Database>>,
    playlist_id: i64,
    folder_color: String,
) -> Result<bool, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.toggle_stuck_folder(playlist_id, &folder_color)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn is_folder_stuck(
    db: State<Mutex<Database>>,
    playlist_id: i64,
    folder_color: String,
) -> Result<bool, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.is_folder_stuck(playlist_id, &folder_color)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_stuck_folders(db: State<Mutex<Database>>) -> Result<Vec<(i64, String)>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_all_stuck_folders().map_err(|e| e.to_string())
}

// Folder Metadata commands
#[tauri::command]
pub fn get_folder_metadata(
    db: State<Mutex<Database>>,
    playlist_id: i64,
    folder_color: String,
) -> Result<Option<(String, String, Option<String>)>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_folder_metadata(playlist_id, &folder_color)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_folder_metadata(
    db: State<Mutex<Database>>,
    playlist_id: i64,
    folder_color: String,
    name: Option<String>,
    description: Option<String>,
    custom_ascii: Option<String>,
) -> Result<bool, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.set_folder_metadata(
        playlist_id,
        &folder_color,
        name.as_deref(),
        description.as_deref(),
        custom_ascii.as_deref(),
    )
    .map_err(|e| e.to_string())
}

// Watch history commands
#[tauri::command]
pub fn add_to_watch_history(
    db: State<Mutex<Database>>,
    video_url: String,
    video_id: String,
    title: Option<String>,
    thumbnail_url: Option<String>,
) -> Result<i64, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.add_to_watch_history(
        &video_url,
        &video_id,
        title.as_deref(),
        thumbnail_url.as_deref(),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_watch_history(
    db: State<Mutex<Database>>,
    limit: i32,
) -> Result<Vec<crate::models::WatchHistory>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_watch_history(limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_watch_history(db: State<Mutex<Database>>) -> Result<bool, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.clear_watch_history().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_watched_video_ids(db: State<Mutex<Database>>) -> Result<Vec<String>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_watched_video_ids().map_err(|e| e.to_string())
}

// Video progress commands
#[tauri::command]
pub fn update_video_progress(
    db: State<Mutex<Database>>,
    video_id: String,
    video_url: String,
    duration: Option<f64>,
    current_time: f64,
) -> Result<i64, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.update_video_progress(&video_id, &video_url, duration, current_time)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_video_progress(
    db: State<Mutex<Database>>,
    video_id: String,
) -> Result<Option<crate::models::VideoProgress>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_video_progress(&video_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_all_video_progress(
    db: State<Mutex<Database>>,
) -> Result<Vec<crate::models::VideoProgress>, String> {
    let db = db.lock().map_err(|e| e.to_string())?;
    db.get_all_video_progress().map_err(|e| e.to_string())
}

// Local video file commands
#[tauri::command]
pub async fn select_video_files(app: tauri::AppHandle) -> Result<Option<Vec<String>>, String> {
    use tauri::async_runtime;
    use tauri_plugin_dialog::DialogExt;

    let (tx, mut rx) = async_runtime::channel(1);

    app.dialog()
        .file()
        .add_filter(
            "Video Files",
            &[
                "mp4", "mkv", "avi", "mov", "webm", "flv", "wmv", "m4v", "mpg", "mpeg",
            ],
        )
        .pick_files(move |file_paths| {
            let _ = tx.try_send(file_paths);
        });

    let file_paths = rx
        .recv()
        .await
        .ok_or_else(|| "Failed to receive file paths".to_string())?;

    match file_paths {
        Some(paths) => {
            let path_strings: Vec<String> = paths.into_iter().map(|p| p.to_string()).collect();
            Ok(Some(path_strings))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn read_video_file(file_path: String) -> Result<Vec<u8>, String> {
    use std::fs;

    // Read the file as binary data
    fs::read(&file_path).map_err(|e| format!("Failed to read video file: {}", e))
}

#[tauri::command]
pub fn get_video_stream_url(file_path: String, app: tauri::AppHandle) -> Result<String, String> {
    use crate::streaming_server::StreamingServer;
    use std::sync::Arc;

    // All videos use streaming server for consistent range request support
    let server = app
        .try_state::<Arc<StreamingServer>>()
        .ok_or("Streaming server not initialized")?;

    // Get streaming URL for the file
    let stream_url = server.get_stream_url(&file_path);
    Ok(stream_url)
}

// Audio capture commands
static AUDIO_CAPTURE: Mutex<Option<AudioCapture>> = Mutex::new(None);

#[tauri::command]
pub fn test_audio_command() -> String {
    eprintln!("[TEST] test_audio_command called from frontend!");
    println!("[TEST] test_audio_command called from frontend (stdout)!");
    "Test command works!".to_string()
}

#[tauri::command]
pub fn start_audio_capture(app: AppHandle) -> Result<(), String> {
    eprintln!("[Commands] start_audio_capture called!");
    let mut capture = AUDIO_CAPTURE
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    if capture.is_none() {
        eprintln!("[Commands] Creating new AudioCapture instance");
        *capture = Some(AudioCapture::new());
    } else {
        eprintln!("[Commands] AudioCapture instance already exists");
    }

    eprintln!("[Commands] Starting audio capture...");
    let result = capture
        .as_mut()
        .ok_or("Failed to create audio capture")?
        .start(app)
        .map_err(|e| format!("Failed to start audio capture: {}", e));

    match &result {
        Ok(_) => eprintln!("[Commands] start_audio_capture succeeded"),
        Err(e) => eprintln!("[Commands] start_audio_capture failed: {}", e),
    }

    result
}

#[tauri::command]
pub fn stop_audio_capture() -> Result<(), String> {
    eprintln!("[Commands] stop_audio_capture called!");
    let mut capture = AUDIO_CAPTURE
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    if let Some(ref mut cap) = capture.as_mut() {
        eprintln!("[Commands] Stopping audio capture...");
        let result = cap
            .stop()
            .map_err(|e| format!("Failed to stop audio capture: {}", e));
        match &result {
            Ok(_) => eprintln!("[Commands] stop_audio_capture succeeded"),
            Err(e) => eprintln!("[Commands] stop_audio_capture failed: {}", e),
        }
        result
    } else {
        eprintln!("[Commands] stop_audio_capture: Audio capture not running");
        Err("Audio capture not running".to_string())
    }
}
