mod audio_capture;
mod commands;
mod database;
mod models;
mod streaming_server;

use database::Database;
use std::sync::{Arc, Mutex};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_mpv::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            // Initialize database - use app data directory to avoid triggering rebuilds
            // In dev mode, store outside src-tauri/ to prevent file watcher from restarting app
            let db_path = if cfg!(debug_assertions) {
                // Development: store in project root (outside src-tauri/)
                Some("../playlists.db")
            } else {
                // Production: use app data directory
                // TODO: Use app.path() with path plugin for production
                None
            };

            let db = Database::new(db_path.as_deref()).expect("Failed to initialize database");

            app.manage(Mutex::new(db));

            // Start streaming server for local video files
            let streaming_server = Arc::new(streaming_server::StreamingServer::new(1422));
            app.manage(Arc::clone(&streaming_server));

            // Spawn server in background using Tauri's async runtime
            let server_for_task = Arc::clone(&streaming_server);
            tauri::async_runtime::spawn(async move {
                if let Err(e) = server_for_task.start().await {
                    eprintln!("Failed to start streaming server: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_playlist,
            commands::get_all_playlists,
            commands::get_all_playlist_metadata,
            commands::get_playlist,
            commands::update_playlist,
            commands::delete_playlist,
            commands::delete_playlist_by_name,
            commands::add_video_to_playlist,
            commands::get_playlist_items,
            commands::get_playlists_for_video_ids,
            commands::remove_video_from_playlist,
            commands::reorder_playlist_item,
            commands::assign_video_to_folder,
            commands::unassign_video_from_folder,
            commands::get_videos_in_folder,
            commands::get_all_folder_assignments,
            commands::get_video_folder_assignments,
            commands::get_all_folders_with_videos,
            commands::get_folders_for_playlist,
            commands::toggle_stuck_folder,
            commands::is_folder_stuck,
            commands::get_all_stuck_folders,
            commands::get_folder_metadata,
            commands::set_folder_metadata,
            commands::add_to_watch_history,
            commands::get_watch_history,
            commands::clear_watch_history,
            commands::get_watched_video_ids,
            commands::update_video_progress,
            commands::get_video_progress,
            commands::get_all_video_progress,
            commands::select_video_files,
            commands::read_video_file,
            commands::get_video_stream_url,
            commands::start_audio_capture,
            commands::stop_audio_capture,
            commands::test_audio_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
