using System;
using System.Text.Json.Serialization;

namespace Atlas3.Models
{
    public class FolderWithVideos
    {
        [JsonPropertyName("playlist_id")]
        public long PlaylistId { get; set; }

        [JsonPropertyName("playlist_name")]
        public string PlaylistName { get; set; } = "";

        [JsonPropertyName("folder_color")]
        public string FolderColor { get; set; } = "";

        [JsonPropertyName("video_count")]
        public int VideoCount { get; set; }

        [JsonPropertyName("first_video")]
        public PlaylistItem? FirstVideo { get; set; }
    }

    public class VideoFolderAssignment
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("playlist_id")]
        public long PlaylistId { get; set; }

        [JsonPropertyName("item_id")]
        public long ItemId { get; set; }

        [JsonPropertyName("folder_color")]
        public string FolderColor { get; set; } = "";

        [JsonPropertyName("created_at")]
        public string CreatedAt { get; set; } = "";
    }
}
