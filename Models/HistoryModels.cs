using System;
using System.Text.Json.Serialization;

namespace Atlas3.Models
{
    public class VideoProgress
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("video_id")]
        public string VideoId { get; set; } = "";

        [JsonPropertyName("video_url")]
        public string VideoUrl { get; set; } = "";

        [JsonPropertyName("duration")]
        public double? Duration { get; set; }

        [JsonPropertyName("last_progress")]
        public double LastProgress { get; set; }

        [JsonPropertyName("progress_percentage")]
        public double ProgressPercentage { get; set; }

        [JsonPropertyName("last_updated")]
        public string LastUpdated { get; set; } = "";

        [JsonPropertyName("has_fully_watched")]
        public bool HasFullyWatched { get; set; }
    }

    public class WatchHistory
    {
        [JsonPropertyName("id")]
        public long Id { get; set; }

        [JsonPropertyName("video_url")]
        public string VideoUrl { get; set; } = "";

        [JsonPropertyName("video_id")]
        public string VideoId { get; set; } = "";

        [JsonPropertyName("title")]
        public string? Title { get; set; }

        [JsonPropertyName("thumbnail_url")]
        public string? ThumbnailUrl { get; set; }

        [JsonPropertyName("watched_at")]
        public string WatchedAt { get; set; } = "";
    }
}
