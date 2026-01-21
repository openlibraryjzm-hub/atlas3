using System;
using System.Collections.Generic;
using System.Linq;
using Microsoft.Data.Sqlite;
using Atlas3.Models;

namespace Atlas3.Services
{
    public class DatabaseService
    {
        private readonly string _connectionString;

        public DatabaseService(string dbPath)
        {
            _connectionString = $"Data Source={dbPath}";
            // In a real scenario, we might want to call InitSchema() here to ensure migrations
            // For now, we assume the DB is largely ready or we can port InitSchema later
        }

        private SqliteConnection GetConnection()
        {
            return new SqliteConnection(_connectionString);
        }

        // ==========================================
        //  Playlist Methods
        // ==========================================

        public List<Playlist> GetAllPlaylists()
        {
            var list = new List<Playlist>();
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT id, name, description, created_at, updated_at, custom_ascii, custom_thumbnail_url FROM playlists ORDER BY created_at DESC";
            
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                list.Add(new Playlist
                {
                    Id = reader.GetInt64(0),
                    Name = reader.GetString(1),
                    Description = reader.IsDBNull(2) ? null : reader.GetString(2),
                    CreatedAt = reader.GetString(3),
                    UpdatedAt = reader.GetString(4),
                    CustomAscii = reader.IsDBNull(5) ? null : reader.GetString(5),
                    CustomThumbnailUrl = reader.IsDBNull(6) ? null : reader.GetString(6)
                });
            }
            return list;
        }

        public long CreatePlaylist(string name, string? description)
        {
            using var conn = GetConnection();
            conn.Open();
            var now = DateTime.UtcNow.ToString("O");
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO playlists (name, description, created_at, updated_at) 
                VALUES ($name, $desc, $now, $now);
                SELECT last_insert_rowid();";
            
            cmd.Parameters.AddWithValue("$name", name);
            cmd.Parameters.AddWithValue("$desc", (object?)description ?? DBNull.Value);
            cmd.Parameters.AddWithValue("$now", now);

            return (long)cmd.ExecuteScalar()!;
        }

        public Playlist? GetPlaylist(long id)
        {
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT id, name, description, created_at, updated_at, custom_ascii, custom_thumbnail_url FROM playlists WHERE id = $id";
            cmd.Parameters.AddWithValue("$id", id);

            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                return new Playlist
                {
                    Id = reader.GetInt64(0),
                    Name = reader.GetString(1),
                    Description = reader.IsDBNull(2) ? null : reader.GetString(2),
                    CreatedAt = reader.GetString(3),
                    UpdatedAt = reader.GetString(4),
                    CustomAscii = reader.IsDBNull(5) ? null : reader.GetString(5),
                    CustomThumbnailUrl = reader.IsDBNull(6) ? null : reader.GetString(6)
                };
            }
            return null;
        }

        public bool UpdatePlaylist(long id, string? name, string? description, string? customAscii, string? customThumbnailUrl)
        {
            using var conn = GetConnection();
            conn.Open();
            var now = DateTime.UtcNow.ToString("O");
            var updates = new List<string> { "updated_at = $now" };
            using var cmd = conn.CreateCommand();
            cmd.Parameters.AddWithValue("$id", id);
            cmd.Parameters.AddWithValue("$now", now);

            if (name != null) { updates.Add("name = $name"); cmd.Parameters.AddWithValue("$name", name); }
            if (description != null) { updates.Add("description = $desc"); cmd.Parameters.AddWithValue("$desc", description); }
            if (customAscii != null) { updates.Add("custom_ascii = $ascii"); cmd.Parameters.AddWithValue("$ascii", customAscii); }
            if (customThumbnailUrl != null) { updates.Add("custom_thumbnail_url = $thumb"); cmd.Parameters.AddWithValue("$thumb", customThumbnailUrl); }

            cmd.CommandText = $"UPDATE playlists SET {string.Join(", ", updates)} WHERE id = $id";
            return cmd.ExecuteNonQuery() > 0;
        }

        public bool DeletePlaylist(long id)
        {
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM playlists WHERE id = $id";
            cmd.Parameters.AddWithValue("$id", id);
            return cmd.ExecuteNonQuery() > 0;
        }

        // ==========================================
        //  Playlist Item Methods
        // ==========================================

        public List<PlaylistItem> GetPlaylistItems(long playlistId)
        {
            var list = new List<PlaylistItem>();
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT id, playlist_id, video_url, video_id, title, thumbnail_url, position, added_at, is_local, author, view_count, published_at 
                FROM playlist_items 
                WHERE playlist_id = $pid 
                ORDER BY position ASC";
            cmd.Parameters.AddWithValue("$pid", playlistId);

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                list.Add(MapPlaylistItem(reader));
            }
            return list;
        }

        public long AddVideoToPlaylist(long playlistId, string videoUrl, string videoId, string? title, string? thumbnailUrl, bool isLocal, string? author, string? viewCount, string? publishedAt)
        {
            using var conn = GetConnection();
            conn.Open();
            
            // Get next position
            using var posCmd = conn.CreateCommand();
            posCmd.CommandText = "SELECT COALESCE(MAX(position), 0) + 1 FROM playlist_items WHERE playlist_id = $pid";
            posCmd.Parameters.AddWithValue("$pid", playlistId);
            var position = Convert.ToInt32(posCmd.ExecuteScalar());

            var now = DateTime.UtcNow.ToString("O");
            
            using var insertCmd = conn.CreateCommand();
            insertCmd.CommandText = @"
                INSERT INTO playlist_items (playlist_id, video_url, video_id, title, thumbnail_url, position, added_at, is_local, author, view_count, published_at) 
                VALUES ($pid, $url, $vid, $title, $thumb, $pos, $now, $local, $auth, $views, $pub);
                SELECT last_insert_rowid();";

            insertCmd.Parameters.AddWithValue("$pid", playlistId);
            insertCmd.Parameters.AddWithValue("$url", videoUrl);
            insertCmd.Parameters.AddWithValue("$vid", videoId);
            insertCmd.Parameters.AddWithValue("$title", (object?)title ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("$thumb", (object?)thumbnailUrl ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("$pos", position);
            insertCmd.Parameters.AddWithValue("$now", now);
            insertCmd.Parameters.AddWithValue("$local", isLocal ? 1 : 0);
            insertCmd.Parameters.AddWithValue("$auth", (object?)author ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("$views", (object?)viewCount ?? DBNull.Value);
            insertCmd.Parameters.AddWithValue("$pub", (object?)publishedAt ?? DBNull.Value);

            return (long)insertCmd.ExecuteScalar()!;
        }

        public bool RemoveVideoFromPlaylist(long playlistId, long itemId)
        {
            using var conn = GetConnection();
            conn.Open();
            using var trans = conn.BeginTransaction();
            try
            {
                // Get position
                var getPosCmd = conn.CreateCommand();
                getPosCmd.Transaction = trans;
                getPosCmd.CommandText = "SELECT position FROM playlist_items WHERE id = $iid AND playlist_id = $pid";
                getPosCmd.Parameters.AddWithValue("$iid", itemId);
                getPosCmd.Parameters.AddWithValue("$pid", playlistId);
                var result = getPosCmd.ExecuteScalar();
                
                if (result == null || result == DBNull.Value) return false;
                var position = Convert.ToInt32(result);

                // Delete
                var delCmd = conn.CreateCommand();
                delCmd.Transaction = trans;
                delCmd.CommandText = "DELETE FROM playlist_items WHERE id = $iid AND playlist_id = $pid";
                delCmd.Parameters.AddWithValue("$iid", itemId);
                delCmd.Parameters.AddWithValue("$pid", playlistId);
                delCmd.ExecuteNonQuery();

                // Shift others
                var updateCmd = conn.CreateCommand();
                updateCmd.Transaction = trans;
                updateCmd.CommandText = "UPDATE playlist_items SET position = position - 1 WHERE playlist_id = $pid AND position > $pos";
                updateCmd.Parameters.AddWithValue("$pid", playlistId);
                updateCmd.Parameters.AddWithValue("$pos", position);
                updateCmd.ExecuteNonQuery();

                trans.Commit();
                return true;
            }
            catch
            {
                trans.Rollback();
                throw;
            }
        }


        public bool ReorderPlaylistItem(long playlistId, long itemId, int newPosition)
        {
            using var conn = GetConnection();
            conn.Open();
            using var trans = conn.BeginTransaction();
            try
            {
                var getPosCmd = conn.CreateCommand();
                getPosCmd.Transaction = trans;
                getPosCmd.CommandText = "SELECT position FROM playlist_items WHERE id = $iid AND playlist_id = $pid";
                getPosCmd.Parameters.AddWithValue("$iid", itemId);
                getPosCmd.Parameters.AddWithValue("$pid", playlistId);
                var result = getPosCmd.ExecuteScalar();
                if (result == null || result == DBNull.Value) return false;
                var currentPos = Convert.ToInt32(result);

                if (currentPos == newPosition) return true;

                var shiftCmd = conn.CreateCommand();
                shiftCmd.Transaction = trans;
                if (newPosition > currentPos)
                {
                    // Moving down
                    shiftCmd.CommandText = "UPDATE playlist_items SET position = position - 1 WHERE playlist_id = $pid AND position > $old AND position <= $new";
                }
                else
                {
                    // Moving up
                    shiftCmd.CommandText = "UPDATE playlist_items SET position = position + 1 WHERE playlist_id = $pid AND position >= $new AND position < $old";
                }
                shiftCmd.Parameters.AddWithValue("$pid", playlistId);
                shiftCmd.Parameters.AddWithValue("$old", currentPos);
                shiftCmd.Parameters.AddWithValue("$new", newPosition);
                shiftCmd.ExecuteNonQuery();

                var updateCmd = conn.CreateCommand();
                updateCmd.Transaction = trans;
                updateCmd.CommandText = "UPDATE playlist_items SET position = $new WHERE id = $iid AND playlist_id = $pid";
                updateCmd.Parameters.AddWithValue("$new", newPosition);
                updateCmd.Parameters.AddWithValue("$iid", itemId);
                updateCmd.Parameters.AddWithValue("$pid", playlistId);
                updateCmd.ExecuteNonQuery();

                trans.Commit();
                return true;
            }
            catch
            {
                trans.Rollback();
                throw;
            }
        }

        // ==========================================
        //  Video Distribution
        // ==========================================
        
        public Dictionary<string, List<string>> GetPlaylistsForVideoIds(List<string> videoIds)
        {
            var result = new Dictionary<string, List<string>>();
            if (videoIds == null || videoIds.Count == 0) return result;

            using var conn = GetConnection();
            conn.Open();
            
            // Build dynamic IN clause
            var placeholders = string.Join(",", videoIds.Select((_, i) => $"$id{i}"));
            using var cmd = conn.CreateCommand();
            cmd.CommandText = $@"
                SELECT pi.video_id, p.name 
                FROM playlist_items pi
                INNER JOIN playlists p ON pi.playlist_id = p.id
                WHERE pi.video_id IN ({placeholders})";
            
            for(int i=0; i<videoIds.Count; i++)
            {
                cmd.Parameters.AddWithValue($"$id{i}", videoIds[i]);
            }

            using var reader = cmd.ExecuteReader();
            while(reader.Read())
            {
                var vid = reader.GetString(0);
                var pname = reader.GetString(1);
                if (!result.ContainsKey(vid)) result[vid] = new List<string>();
                result[vid].Add(pname);
            }
            return result;
        }

        // ==========================================
        //  Folder Methods
        // ==========================================

        public long AssignVideoToFolder(long playlistId, long itemId, string folderColor)
        {
            using var conn = GetConnection();
            conn.Open();
            var now = DateTime.UtcNow.ToString("O");

            // Check if exists
            using (var checkCmd = conn.CreateCommand())
            {
                checkCmd.CommandText = "SELECT id FROM video_folder_assignments WHERE playlist_id = $pid AND item_id = $iid AND folder_color = $color";
                checkCmd.Parameters.AddWithValue("$pid", playlistId);
                checkCmd.Parameters.AddWithValue("$iid", itemId);
                checkCmd.Parameters.AddWithValue("$color", folderColor);
                var existing = checkCmd.ExecuteScalar();
                if (existing != null && existing != DBNull.Value) return Convert.ToInt64(existing);
            }

            // Insert
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO video_folder_assignments (playlist_id, item_id, folder_color, created_at)
                VALUES ($pid, $iid, $color, $now);
                SELECT last_insert_rowid();";
            cmd.Parameters.AddWithValue("$pid", playlistId);
            cmd.Parameters.AddWithValue("$iid", itemId);
            cmd.Parameters.AddWithValue("$color", folderColor);
            cmd.Parameters.AddWithValue("$now", now);

            return (long)cmd.ExecuteScalar()!;
        }

        public bool UnassignVideoFromFolder(long playlistId, long itemId, string folderColor)
        {
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM video_folder_assignments WHERE playlist_id = $pid AND item_id = $iid AND folder_color = $color";
            cmd.Parameters.AddWithValue("$pid", playlistId);
            cmd.Parameters.AddWithValue("$iid", itemId);
            cmd.Parameters.AddWithValue("$color", folderColor);
            return cmd.ExecuteNonQuery() > 0;
        }

        public List<PlaylistItem> GetVideosInFolder(long playlistId, string folderColor)
        {
            var list = new List<PlaylistItem>();
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT pi.id, pi.playlist_id, pi.video_url, pi.video_id, pi.title, pi.thumbnail_url, pi.position, pi.added_at, pi.is_local, pi.author, pi.view_count, pi.published_at 
                FROM playlist_items pi
                INNER JOIN video_folder_assignments vfa ON pi.id = vfa.item_id
                WHERE vfa.playlist_id = $pid AND vfa.folder_color = $color
                ORDER BY pi.position ASC";
            cmd.Parameters.AddWithValue("$pid", playlistId);
            cmd.Parameters.AddWithValue("$color", folderColor);

            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                list.Add(MapPlaylistItem(reader));
            }
            return list;
        }

        public List<string> GetVideoFolderAssignments(long playlistId, long itemId)
        {
            var list = new List<string>();
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT folder_color FROM video_folder_assignments WHERE playlist_id = $pid AND item_id = $iid";
            cmd.Parameters.AddWithValue("$pid", playlistId);
            cmd.Parameters.AddWithValue("$iid", itemId);
            using var reader = cmd.ExecuteReader();
            while(reader.Read())
            {
                list.Add(reader.GetString(0));
            }
            return list;
        }
        
        public Dictionary<string, List<string>> GetAllFolderAssignmentsForPlaylist(long playlistId)
        {
             var dict = new Dictionary<string, List<string>>();
             using var conn = GetConnection();
             conn.Open();
             using var cmd = conn.CreateCommand();
             cmd.CommandText = "SELECT item_id, folder_color FROM video_folder_assignments WHERE playlist_id = $pid";
             cmd.Parameters.AddWithValue("$pid", playlistId);
             
             using var reader = cmd.ExecuteReader();
             while(reader.Read())
             {
                 var itemId = reader.GetInt64(0).ToString();
                 var color = reader.GetString(1);
                 if (!dict.ContainsKey(itemId)) dict[itemId] = new List<string>();
                 dict[itemId].Add(color);
             }
             return dict;
        }

        public List<FolderWithVideos> GetAllFoldersWithVideos()
        {
            var folders = new List<FolderWithVideos>();
            using var conn = GetConnection();
            conn.Open();

            // 1. Get raw folder data
            var rawFolders = new List<dynamic>(); // Using dynamic for intermediate storage
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = @"
                    SELECT 
                        vfa.playlist_id,
                        p.name as playlist_name,
                        vfa.folder_color,
                        COUNT(DISTINCT vfa.item_id) as video_count,
                        MIN(pi.position) as min_position
                    FROM video_folder_assignments vfa
                    INNER JOIN playlists p ON vfa.playlist_id = p.id
                    INNER JOIN playlist_items pi ON vfa.item_id = pi.id
                    GROUP BY vfa.playlist_id, vfa.folder_color
                    ORDER BY p.name, vfa.folder_color";
                
                using var reader = cmd.ExecuteReader();
                while(reader.Read())
                {
                    rawFolders.Add(new {
                        PlaylistId = reader.GetInt64(0),
                        PlaylistName = reader.GetString(1),
                        FolderColor = reader.GetString(2),
                        VideoCount = reader.GetInt32(3),
                        MinPosition = reader.IsDBNull(4) ? (int?)null : reader.GetInt32(4)
                    });
                }
            }

            // 2. Fetch first video for each
            foreach(var f in rawFolders)
            {
                PlaylistItem? firstVideo = null;
                if (f.MinPosition != null)
                {
                    using var vidCmd = conn.CreateCommand();
                    vidCmd.CommandText = @"
                        SELECT pi.id, pi.playlist_id, pi.video_url, pi.video_id, pi.title, pi.thumbnail_url, pi.position, pi.added_at, pi.is_local, pi.author, pi.view_count, pi.published_at 
                        FROM playlist_items pi
                        INNER JOIN video_folder_assignments vfa ON pi.id = vfa.item_id
                        WHERE vfa.playlist_id = $pid AND vfa.folder_color = $color AND pi.position = $pos
                        ORDER BY pi.position ASC, pi.id ASC LIMIT 1";
                    
                    vidCmd.Parameters.AddWithValue("$pid", (long)f.PlaylistId);
                    vidCmd.Parameters.AddWithValue("$color", (string)f.FolderColor);
                    vidCmd.Parameters.AddWithValue("$pos", (int)f.MinPosition);

                    using var r = vidCmd.ExecuteReader();
                    if (r.Read()) firstVideo = MapPlaylistItem(r);
                }

                folders.Add(new FolderWithVideos
                {
                    PlaylistId = f.PlaylistId,
                    PlaylistName = f.PlaylistName,
                    FolderColor = f.FolderColor,
                    VideoCount = f.VideoCount,
                    FirstVideo = firstVideo
                });
            }
            return folders;
        }

        public List<FolderWithVideos> GetFoldersForPlaylist(long playlistId)
        {
            var folders = new List<FolderWithVideos>();
            using var conn = GetConnection();
            conn.Open();

             var rawFolders = new List<dynamic>();
             using (var cmd = conn.CreateCommand())
             {
                 cmd.CommandText = @"
                    SELECT 
                        vfa.playlist_id,
                        p.name as playlist_name,
                        vfa.folder_color,
                        COUNT(DISTINCT vfa.item_id) as video_count,
                        MIN(pi.position) as min_position
                    FROM video_folder_assignments vfa
                    INNER JOIN playlists p ON vfa.playlist_id = p.id
                    INNER JOIN playlist_items pi ON vfa.item_id = pi.id
                    WHERE vfa.playlist_id = $pid
                    GROUP BY vfa.playlist_id, vfa.folder_color
                    ORDER BY vfa.folder_color";
                 cmd.Parameters.AddWithValue("$pid", playlistId);

                 using var reader = cmd.ExecuteReader();
                 while(reader.Read())
                 {
                     rawFolders.Add(new {
                         PlaylistId = reader.GetInt64(0),
                         PlaylistName = reader.GetString(1),
                         FolderColor = reader.GetString(2),
                         VideoCount = reader.GetInt32(3),
                         MinPosition = reader.IsDBNull(4) ? (int?)null : reader.GetInt32(4)
                     });
                 }
             }

             foreach(var f in rawFolders)
             {
                 PlaylistItem? firstVideo = null;
                 if (f.MinPosition != null)
                 {
                     using var vidCmd = conn.CreateCommand();
                     vidCmd.CommandText = @"
                        SELECT pi.id, pi.playlist_id, pi.video_url, pi.video_id, pi.title, pi.thumbnail_url, pi.position, pi.added_at, pi.is_local, pi.author, pi.view_count, pi.published_at 
                        FROM playlist_items pi
                        INNER JOIN video_folder_assignments vfa ON pi.id = vfa.item_id
                        WHERE vfa.playlist_id = $pid AND vfa.folder_color = $color AND pi.position = $pos
                        ORDER BY pi.position ASC, pi.id ASC LIMIT 1";
                     vidCmd.Parameters.AddWithValue("$pid", (long)f.PlaylistId);
                     vidCmd.Parameters.AddWithValue("$color", (string)f.FolderColor);
                     vidCmd.Parameters.AddWithValue("$pos", (int)f.MinPosition);

                     using var r = vidCmd.ExecuteReader();
                     if (r.Read()) firstVideo = MapPlaylistItem(r);
                 }

                 folders.Add(new FolderWithVideos
                 {
                     PlaylistId = f.PlaylistId,
                     PlaylistName = f.PlaylistName,
                     FolderColor = f.FolderColor,
                     VideoCount = f.VideoCount,
                     FirstVideo = firstVideo
                 });
             }
             return folders;
        }

        // ==========================================
        //  Stuck Folders & Metadata
        // ==========================================

        public bool ToggleStuckFolder(long playlistId, string folderColor)
        {
            using var conn = GetConnection();
            conn.Open();
            // Check
            bool exists = false;
            using(var cmd = conn.CreateCommand()) {
                cmd.CommandText = "SELECT COUNT(*) FROM stuck_folders WHERE playlist_id = $pid AND folder_color = $color";
                cmd.Parameters.AddWithValue("$pid", playlistId);
                cmd.Parameters.AddWithValue("$color", folderColor);
                exists = Convert.ToInt64(cmd.ExecuteScalar()) > 0;
            }

            using(var cmd = conn.CreateCommand()) {
                if (exists) {
                    cmd.CommandText = "DELETE FROM stuck_folders WHERE playlist_id = $pid AND folder_color = $color";
                } else {
                     cmd.CommandText = "INSERT INTO stuck_folders (playlist_id, folder_color, created_at) VALUES ($pid, $color, $now)";
                     cmd.Parameters.AddWithValue("$now", DateTime.UtcNow.ToString("O"));
                }
                cmd.Parameters.AddWithValue("$pid", playlistId);
                cmd.Parameters.AddWithValue("$color", folderColor);
                cmd.ExecuteNonQuery();
            }
            return true;
        }

        public bool IsFolderStuck(long playlistId, string folderColor)
        {
             using var conn = GetConnection();
             conn.Open();
             using var cmd = conn.CreateCommand();
             cmd.CommandText = "SELECT COUNT(*) FROM stuck_folders WHERE playlist_id = $pid AND folder_color = $color";
             cmd.Parameters.AddWithValue("$pid", playlistId);
             cmd.Parameters.AddWithValue("$color", folderColor);
             return Convert.ToInt64(cmd.ExecuteScalar()) > 0;
        }

        public List<string[]> GetAllStuckFolders()
        {
            var list = new List<string[]>();
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT playlist_id, folder_color FROM stuck_folders";
            using var reader = cmd.ExecuteReader();
            while(reader.Read())
            {
                list.Add(new string[] { reader.GetInt64(0).ToString(), reader.GetString(1) });
            }
            return list;
        }

        public string[]? GetFolderMetadata(long playlistId, string folderColor)
        {
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT custom_name, description, custom_ascii FROM folder_metadata WHERE playlist_id = $pid AND folder_color = $color";
            cmd.Parameters.AddWithValue("$pid", playlistId);
            cmd.Parameters.AddWithValue("$color", folderColor);
            
            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                return new string[] {
                    reader.IsDBNull(0) ? "" : reader.GetString(0),
                    reader.IsDBNull(1) ? "" : reader.GetString(1),
                    reader.IsDBNull(2) ? "" : reader.GetString(2)
                };
            }
            return null;
        }
        
        public bool SetFolderMetadata(long playlistId, string folderColor, string? name, string? description, string? customAscii)
        {
            using var conn = GetConnection();
            conn.Open();
            var now = DateTime.UtcNow.ToString("O");

            // Check if exists
            bool exists = false;
            using(var checkCmd = conn.CreateCommand())
            {
                checkCmd.CommandText = "SELECT COUNT(*) FROM folder_metadata WHERE playlist_id = $pid AND folder_color = $color";
                checkCmd.Parameters.AddWithValue("$pid", playlistId);
                checkCmd.Parameters.AddWithValue("$color", folderColor);
                exists = Convert.ToInt64(checkCmd.ExecuteScalar()) > 0;
            }

            using(var cmd = conn.CreateCommand())
            {
                if (exists)
                {
                    var updates = new List<string> { "updated_at = $now" };
                    cmd.Parameters.AddWithValue("$now", now);
                    
                    if (name != null) { updates.Add("custom_name = $name"); cmd.Parameters.AddWithValue("$name", name); }
                    if (description != null) { updates.Add("description = $desc"); cmd.Parameters.AddWithValue("$desc", description); }
                    if (customAscii != null) { updates.Add("custom_ascii = $ascii"); cmd.Parameters.AddWithValue("$ascii", customAscii); }
                    
                    cmd.CommandText = $"UPDATE folder_metadata SET {string.Join(", ", updates)} WHERE playlist_id = $pid AND folder_color = $color";
                }
                else
                {
                    cmd.CommandText = @"
                        INSERT INTO folder_metadata (playlist_id, folder_color, custom_name, description, custom_ascii, created_at, updated_at) 
                        VALUES ($pid, $color, $name, $desc, $ascii, $now, $now)";
                    cmd.Parameters.AddWithValue("$name", (object?)name ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("$desc", (object?)description ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("$ascii", (object?)customAscii ?? DBNull.Value);
                    cmd.Parameters.AddWithValue("$now", now);
                }
                cmd.Parameters.AddWithValue("$pid", playlistId);
                cmd.Parameters.AddWithValue("$color", folderColor);
                
                return cmd.ExecuteNonQuery() > 0;
            }
        }
        
        // ==========================================
        //  Metadata Complex Queries
        // ==========================================

        public List<PlaylistMetadata> GetAllPlaylistMetadata()
        {
            // This replicates the complex aggregation logic from Rust
            var metadataList = new List<PlaylistMetadata>();
            var playlists = GetAllPlaylists(); // Get IDs

            using var conn = GetConnection();
            conn.Open();

            foreach (var pl in playlists)
            {
                // Count
                using var countCmd = conn.CreateCommand();
                countCmd.CommandText = "SELECT COUNT(*) FROM playlist_items WHERE playlist_id = $pid";
                countCmd.Parameters.AddWithValue("$pid", pl.Id);
                var count = Convert.ToInt32(countCmd.ExecuteScalar());

                // First Video
                PlaylistItem? firstVideo = null;
                using var firstCmd = conn.CreateCommand();
                firstCmd.CommandText = @"
                    SELECT id, playlist_id, video_url, video_id, title, thumbnail_url, position, added_at, is_local, author, view_count, published_at 
                    FROM playlist_items 
                    WHERE playlist_id = $pid 
                    ORDER BY position ASC LIMIT 1";
                firstCmd.Parameters.AddWithValue("$pid", pl.Id);
                using (var r = firstCmd.ExecuteReader())
                {
                    if (r.Read()) firstVideo = MapPlaylistItem(r);
                }

                // Recent Video (joined with progress)
                PlaylistItem? recentVideo = null;
                using var recentCmd = conn.CreateCommand();
                recentCmd.CommandText = @"
                    SELECT pi.id, pi.playlist_id, pi.video_url, pi.video_id, pi.title, pi.thumbnail_url, pi.position, pi.added_at, pi.is_local, pi.author, pi.view_count, pi.published_at 
                    FROM playlist_items pi
                    INNER JOIN video_progress vp ON pi.video_id = vp.video_id
                    WHERE pi.playlist_id = $pid
                    ORDER BY vp.last_updated DESC
                    LIMIT 1";
                recentCmd.Parameters.AddWithValue("$pid", pl.Id);
                using (var r = recentCmd.ExecuteReader())
                {
                    if (r.Read()) recentVideo = MapPlaylistItem(r);
                }

                metadataList.Add(new PlaylistMetadata
                {
                    PlaylistId = pl.Id,
                    Count = count,
                    FirstVideo = firstVideo,
                    RecentVideo = recentVideo
                });
            }

            return metadataList;
        }

        // ==========================================
        //  Watch History & Progress
        // ==========================================

        public long AddToWatchHistory(string videoId, string videoUrl, string? title, string? thumbnailUrl)
        {
             using var conn = GetConnection();
             conn.Open();
             var now = DateTime.UtcNow.ToString("O");

             // Delete existing
             using(var delCmd = conn.CreateCommand())
             {
                 delCmd.CommandText = "DELETE FROM watch_history WHERE video_id = $vid";
                 delCmd.Parameters.AddWithValue("$vid", videoId);
                 delCmd.ExecuteNonQuery();
             }

             // Insert
             using(var cmd = conn.CreateCommand())
             {
                 cmd.CommandText = "INSERT INTO watch_history (video_url, video_id, title, thumbnail_url, watched_at) VALUES ($url, $vid, $title, $thumb, $now); SELECT last_insert_rowid();";
                 cmd.Parameters.AddWithValue("$url", videoUrl);
                 cmd.Parameters.AddWithValue("$vid", videoId);
                 cmd.Parameters.AddWithValue("$title", (object?)title ?? DBNull.Value);
                 cmd.Parameters.AddWithValue("$thumb", (object?)thumbnailUrl ?? DBNull.Value);
                 cmd.Parameters.AddWithValue("$now", now);
                 return (long)cmd.ExecuteScalar()!;
             }
        }

        public List<WatchHistory> GetWatchHistory(int limit)
        {
            var list = new List<WatchHistory>();
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT id, video_url, video_id, title, thumbnail_url, watched_at FROM watch_history ORDER BY watched_at DESC LIMIT $limit";
            cmd.Parameters.AddWithValue("$limit", limit);
            
            using var reader = cmd.ExecuteReader();
            while(reader.Read())
            {
                list.Add(new WatchHistory
                {
                    Id = reader.GetInt64(0),
                    VideoUrl = reader.GetString(1),
                    VideoId = reader.GetString(2),
                    Title = reader.IsDBNull(3) ? null : reader.GetString(3),
                    ThumbnailUrl = reader.IsDBNull(4) ? null : reader.GetString(4),
                    WatchedAt = reader.GetString(5)
                });
            }
            return list;
        }

        public void ClearWatchHistory()
        {
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "DELETE FROM watch_history";
            cmd.ExecuteNonQuery();
        }

        public List<string> GetWatchedVideoIds()
        {
            var list = new List<string>();
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT DISTINCT video_id FROM video_progress WHERE progress_percentage >= 85.0";
            using var reader = cmd.ExecuteReader();
            while(reader.Read()) list.Add(reader.GetString(0));
            return list;
        }
        
        public List<VideoProgress> GetAllVideoProgress()
        {
            var list = new List<VideoProgress>();
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT id, video_id, video_url, duration, last_progress, progress_percentage, last_updated, has_fully_watched FROM video_progress";
            
            using var reader = cmd.ExecuteReader();
            while(reader.Read())
            {
                list.Add(new VideoProgress
                {
                    Id = reader.GetInt64(0),
                    VideoId = reader.GetString(1),
                    VideoUrl = reader.GetString(2),
                    Duration = reader.IsDBNull(3) ? (double?)null : reader.GetDouble(3),
                    LastProgress = reader.GetDouble(4),
                    ProgressPercentage = reader.GetDouble(5),
                    LastUpdated = reader.GetString(6),
                    HasFullyWatched = reader.GetInt32(7) != 0
                });
            }
            return list;
        }

        public VideoProgress? GetVideoProgress(string videoId)
        {
            using var conn = GetConnection();
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT id, video_id, video_url, duration, last_progress, progress_percentage, last_updated, has_fully_watched FROM video_progress WHERE video_id = $vid";
            cmd.Parameters.AddWithValue("$vid", videoId);

            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                return new VideoProgress
                {
                    Id = reader.GetInt64(0),
                    VideoId = reader.GetString(1),
                    VideoUrl = reader.GetString(2),
                    Duration = reader.IsDBNull(3) ? (double?)null : reader.GetDouble(3),
                    LastProgress = reader.GetDouble(4),
                    ProgressPercentage = reader.GetDouble(5),
                    LastUpdated = reader.GetString(6),
                    HasFullyWatched = reader.GetInt32(7) != 0
                };
            }
            return null;
        }

        public long UpdateVideoProgress(string videoId, string videoUrl, double? duration, double currentTime)
        {
            using var conn = GetConnection();
            conn.Open();
            var now = DateTime.UtcNow.ToString("O");

            // Check existing
            double? existingDur = null;
            bool alreadyFullyWatched = false;
            
            using (var checkCmd = conn.CreateCommand())
            {
                checkCmd.CommandText = "SELECT duration, has_fully_watched FROM video_progress WHERE video_id = $vid";
                checkCmd.Parameters.AddWithValue("$vid", videoId);
                using var reader = checkCmd.ExecuteReader();
                if (reader.Read())
                {
                    if (!reader.IsDBNull(0)) existingDur = reader.GetDouble(0);
                    alreadyFullyWatched = reader.GetInt32(1) != 0;
                }
            }

            var finalDuration = duration ?? existingDur;
            double progressPercent = 0;
            if (finalDuration.HasValue && finalDuration.Value > 0)
            {
                progressPercent = (currentTime / finalDuration.Value * 100.0);
                if (progressPercent > 100) progressPercent = 100;
                if (progressPercent < 0) progressPercent = 0;
            }

            bool hasFullyWatched = alreadyFullyWatched || progressPercent >= 85.0;

            using var upsertCmd = conn.CreateCommand();
            upsertCmd.CommandText = @"
                INSERT OR REPLACE INTO video_progress 
                (video_id, video_url, duration, last_progress, progress_percentage, last_updated, has_fully_watched)
                VALUES ($vid, $url, $dur, $curr, $pct, $now, $watched);
                SELECT last_insert_rowid();";
            
            upsertCmd.Parameters.AddWithValue("$vid", videoId);
            upsertCmd.Parameters.AddWithValue("$url", videoUrl);
            upsertCmd.Parameters.AddWithValue("$dur", (object?)finalDuration ?? DBNull.Value);
            upsertCmd.Parameters.AddWithValue("$curr", currentTime);
            upsertCmd.Parameters.AddWithValue("$pct", progressPercent);
            upsertCmd.Parameters.AddWithValue("$now", now);
            upsertCmd.Parameters.AddWithValue("$watched", hasFullyWatched ? 1 : 0);

            return (long)upsertCmd.ExecuteScalar()!;
        }

        // ==========================================
        //  Helpers
        // ==========================================

        private PlaylistItem MapPlaylistItem(SqliteDataReader reader)
        {
            return new PlaylistItem
            {
                Id = reader.GetInt64(0),
                PlaylistId = reader.GetInt64(1),
                VideoUrl = reader.GetString(2),
                VideoId = reader.GetString(3),
                Title = reader.IsDBNull(4) ? null : reader.GetString(4),
                ThumbnailUrl = reader.IsDBNull(5) ? null : reader.GetString(5),
                Position = reader.GetInt32(6),
                AddedAt = reader.GetString(7),
                IsLocal = reader.GetInt32(8) != 0,
                Author = reader.IsDBNull(9) ? null : reader.GetString(9),
                ViewCount = reader.IsDBNull(10) ? null : reader.GetString(10),
                PublishedAt = reader.IsDBNull(11) ? null : reader.GetString(11)
            };
        }
    }
}
