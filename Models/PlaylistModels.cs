using System;
using System.Text.Json.Serialization;

namespace Atlas3.Models
{
    public class Playlist
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("custom_ascii")]
        public string? CustomAscii { get; set; }

        [JsonPropertyName("custom_thumbnail_url")]
        public string? CustomThumbnailUrl { get; set; }

        [JsonPropertyName("created_at")]
        public string CreatedAt { get; set; } = "";

        [JsonPropertyName("updated_at")]
        public string UpdatedAt { get; set; } = "";
    }

    public class PlaylistItem
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("playlist_id")]
        public long PlaylistId { get; set; }

        [JsonPropertyName("video_url")]
        public string VideoUrl { get; set; } = "";

        [JsonPropertyName("video_id")]
        public string VideoId { get; set; } = "";

        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("thumbnail_url")]
        public string? ThumbnailUrl { get; set; }

        [JsonPropertyName("position")]
        public int Position { get; set; }

        [JsonPropertyName("added_at")]
        public string AddedAt { get; set; } = "";

        [JsonPropertyName("is_local")]
        public bool IsLocal { get; set; }

        [JsonPropertyName("author")]
        public string? Author { get; set; }

        [JsonPropertyName("view_count")]
        public string? ViewCount { get; set; }

        [JsonPropertyName("published_at")]
        public string? PublishedAt { get; set; }
    }

    public class PlaylistMetadata
    {
        [JsonPropertyName("playlist_id")]
        public long PlaylistId { get; set; }

        [JsonPropertyName("count")]
        public int Count { get; set; }

        [JsonPropertyName("first_video")]
        public PlaylistItem? FirstVideo { get; set; }

        [JsonPropertyName("recent_video")]
        public PlaylistItem? RecentVideo { get; set; }
    }
}
