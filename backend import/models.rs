use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Playlist {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub custom_ascii: Option<String>,
    pub custom_thumbnail_url: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlaylistItem {
    pub id: i64,
    pub playlist_id: i64,
    pub video_url: String,
    pub video_id: String,
    pub title: Option<String>,
    pub thumbnail_url: Option<String>,
    pub position: i32,
    pub added_at: String,
    pub is_local: bool,
    pub author: Option<String>,
    pub view_count: Option<String>,
    pub published_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePlaylistRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdatePlaylistRequest {
    pub id: i64,
    pub name: Option<String>,
    pub description: Option<String>,
    pub custom_ascii: Option<String>,
    pub custom_thumbnail_url: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddVideoToPlaylistRequest {
    pub playlist_id: i64,
    pub video_url: String,
    pub video_id: String,
    pub title: Option<String>,
    pub thumbnail_url: Option<String>,
    pub author: Option<String>,
    pub view_count: Option<String>,
    pub published_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReorderPlaylistItemRequest {
    pub playlist_id: i64,
    pub item_id: i64,
    pub new_position: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoFolderAssignment {
    pub id: i64,
    pub playlist_id: i64,
    pub item_id: i64,
    pub folder_color: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FolderWithVideos {
    pub playlist_id: i64,
    pub playlist_name: String,
    pub folder_color: String,
    pub video_count: i32,
    pub first_video: Option<PlaylistItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WatchHistory {
    pub id: i64,
    pub video_url: String,
    pub video_id: String,
    pub title: Option<String>,
    pub thumbnail_url: Option<String>,
    pub watched_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VideoProgress {
    pub id: i64,
    pub video_id: String,
    pub video_url: String,
    pub duration: Option<f64>,
    pub last_progress: f64,
    pub progress_percentage: f64,
    pub last_updated: String,
    #[serde(default)]
    pub has_fully_watched: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PlaylistMetadata {
    pub playlist_id: i64,
    pub count: i32,
    pub first_video: Option<PlaylistItem>,
    pub recent_video: Option<PlaylistItem>,
}
