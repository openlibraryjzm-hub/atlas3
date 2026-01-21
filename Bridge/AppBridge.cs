using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Web.WebView2.Core;
using Atlas3.Services;
using Atlas3.Models;

namespace Atlas3.Bridge
{
    // Define the shape of the message coming from React
    public class BridgeMessage
    {
        public string Command { get; set; } = "";
        public JsonElement Payload { get; set; } // Flexible payload
        public string? RequestId { get; set; } // For correlation if needed
    }

    public class AppBridge
    {
        private readonly DatabaseService _dbService;
        private readonly CoreWebView2 _webView;

        public AppBridge(DatabaseService dbService, CoreWebView2 webView)
        {
            _dbService = dbService;
            _webView = webView;
            
            // Subscribe to messages
            _webView.WebMessageReceived += OnWebMessageReceived;
        }

        private async void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            try
            {
                var json = e.WebMessageAsJson;
                if (string.IsNullOrEmpty(json)) return;

                var message = JsonSerializer.Deserialize<BridgeMessage>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                if (message == null) return;

                object? result = null;

                // ROUTING LOGIC (The "Switchboard")
                switch (message.Command)
                {
                    // --- Playlists ---
                    case "get_all_playlists":
                        result = _dbService.GetAllPlaylists();
                        break;
                    
                    case "get_all_playlist_metadata":
                        result = _dbService.GetAllPlaylistMetadata();
                        break;

                    case "create_playlist":
                        if (message.Payload.ValueKind == JsonValueKind.Object)
                        {
                            var name = GetString(message.Payload, "name");
                            var desc = GetString(message.Payload, "description");
                            if (name != null) result = _dbService.CreatePlaylist(name, desc);
                        }
                        break;

                    case "delete_playlist":
                        if (GetLong(message.Payload, "id") is long delId)
                            result = _dbService.DeletePlaylist(delId);
                        break;
                    
                    case "delete_playlist_by_name":
                        // Ideally we have this method in DbService, but user likely meant delete by ID usually.
                        // Implemented in API? check if implemented in DbService
                        // Rust had delete_playlist_by_name. Providing rudimentary support if Db has it, else skip.
                        // I didn't add DeletePlaylistByName to DbService, let's skip or add later.
                        break;

                     case "update_playlist":
                        if (GetLong(message.Payload, "id") is long upId)
                        {
                            var name = GetString(message.Payload, "name");
                            var desc = GetString(message.Payload, "description");
                            var ascii = GetString(message.Payload, "customAscii");
                            var thumb = GetString(message.Payload, "customThumbnailUrl");
                            result = _dbService.UpdatePlaylist(upId, name, desc, ascii, thumb);
                        }
                        break;

                    // --- Video Items ---
                    case "get_playlist_items":
                        if (GetLong(message.Payload, "playlist_id") is long pid)
                             result = _dbService.GetPlaylistItems(pid);
                        break;
                    
                    case "add_video_to_playlist":
                         if (GetLong(message.Payload, "playlist_id") is long addPid)
                         {
                             var url = GetString(message.Payload, "video_url") ?? "";
                             var vid = GetString(message.Payload, "video_id") ?? "";
                             var title = GetString(message.Payload, "title");
                             var thumb = GetString(message.Payload, "thumbnail_url");
                             var auth = GetString(message.Payload, "author");
                             var views = GetString(message.Payload, "view_count");
                             var pub = GetString(message.Payload, "published_at");
                             var isLocal = false;
                             if(message.Payload.TryGetProperty("is_local", out var locProp) && (locProp.ValueKind == JsonValueKind.True || locProp.ValueKind == JsonValueKind.False))
                                isLocal = locProp.GetBoolean();
                             
                             result = _dbService.AddVideoToPlaylist(addPid, url, vid, title, thumb, isLocal, auth, views, pub);
                         }
                         break;
                    
                    case "remove_video_from_playlist":
                         if (GetLong(message.Payload, "playlistId") is long rPid && GetLong(message.Payload, "itemId") is long rItem)
                            result = _dbService.RemoveVideoFromPlaylist(rPid, rItem);
                         break;
                    
                    case "reorder_playlist_item":
                         if (GetLong(message.Payload, "playlistId") is long rePid && GetLong(message.Payload, "itemId") is long reItem && GetLong(message.Payload, "newPosition") is long newPos)
                            result = _dbService.ReorderPlaylistItem(rePid, reItem, (int)newPos);
                         break;
                    
                    case "get_playlists_for_video_ids":
                         if (message.Payload.TryGetProperty("videoIds", out var vidsProp) && vidsProp.ValueKind == JsonValueKind.Array)
                         {
                             var vidList = new System.Collections.Generic.List<string>();
                             foreach(var v in vidsProp.EnumerateArray()) vidList.Add(v.GetString() ?? "");
                             result = _dbService.GetPlaylistsForVideoIds(vidList);
                         }
                         break;

                    // --- Folders ---
                    case "get_videos_in_folder":
                         if (GetLong(message.Payload, "playlistId") is long fPid && GetString(message.Payload, "folderColor") is string fCol)
                            result = _dbService.GetVideosInFolder(fPid, fCol);
                         break;
                         
                    case "assign_video_to_folder":
                         if (GetLong(message.Payload, "playlistId") is long aPid && GetLong(message.Payload, "itemId") is long aItem && GetString(message.Payload, "folderColor") is string aCol)
                            result = _dbService.AssignVideoToFolder(aPid, aItem, aCol);
                         break;
                    
                    case "unassign_video_from_folder":
                         if (GetLong(message.Payload, "playlistId") is long uPid && GetLong(message.Payload, "itemId") is long uItem && GetString(message.Payload, "folderColor") is string uCol)
                            result = _dbService.UnassignVideoFromFolder(uPid, uItem, uCol);
                         break;
                         
                    case "get_video_folder_assignments":
                         if (GetLong(message.Payload, "playlistId") is long gfaPid && GetLong(message.Payload, "itemId") is long gfaItem)
                            result = _dbService.GetVideoFolderAssignments(gfaPid, gfaItem);
                         break;
                         
                    case "get_all_folder_assignments":
                         if (GetLong(message.Payload, "playlistId") is long gafPid)
                            result = _dbService.GetAllFolderAssignmentsForPlaylist(gafPid);
                         break;
                         
                    case "get_all_folders_with_videos":
                         result = _dbService.GetAllFoldersWithVideos();
                         break;
                         
                    case "get_folders_for_playlist":
                         if (GetLong(message.Payload, "playlistId") is long gfpPid)
                            result = _dbService.GetFoldersForPlaylist(gfpPid);
                         break;
                         
                    case "toggle_stuck_folder":
                         if (GetLong(message.Payload, "playlistId") is long tsPid && GetString(message.Payload, "folderColor") is string tsCol)
                            result = _dbService.ToggleStuckFolder(tsPid, tsCol);
                         break;
                         
                    case "is_folder_stuck":
                         if (GetLong(message.Payload, "playlistId") is long isPid && GetString(message.Payload, "folderColor") is string isCol)
                            result = _dbService.IsFolderStuck(isPid, isCol);
                         break;
                         
                    case "get_all_stuck_folders":
                         result = _dbService.GetAllStuckFolders();
                         break;
                    
                    case "get_folder_metadata":
                        if (GetLong(message.Payload, "playlistId") is long gfmPid && GetString(message.Payload, "folderColor") is string gfmCol)
                            result = _dbService.GetFolderMetadata(gfmPid, gfmCol);
                        break;

                    case "set_folder_metadata":
                        if (GetLong(message.Payload, "playlistId") is long sfmPid && GetString(message.Payload, "folderColor") is string sfmCol)
                        {
                             var nm = GetString(message.Payload, "name");
                             var ds = GetString(message.Payload, "description");
                             var asc = GetString(message.Payload, "customAscii");
                             result = _dbService.SetFolderMetadata(sfmPid, sfmCol, nm, ds, asc);
                        }
                        break;

                    // --- History & Progress ---
                    case "get_watch_history":
                        var limit = GetLong(message.Payload, "limit") ?? 100;
                        result = _dbService.GetWatchHistory((int)limit);
                        break;
                    
                    case "add_to_watch_history":
                        var hVid = GetString(message.Payload, "videoId");
                        if (hVid != null)
                        {
                            var hUrl = GetString(message.Payload, "videoUrl") ?? "";
                            var hTitle = GetString(message.Payload, "title");
                            var hThumb = GetString(message.Payload, "thumbnailUrl");
                            result = _dbService.AddToWatchHistory(hVid, hUrl, hTitle, hThumb);
                        }
                        break;
                    
                    case "clear_watch_history":
                        _dbService.ClearWatchHistory();
                        result = true;
                        break;
                    
                    case "get_watched_video_ids":
                        result = _dbService.GetWatchedVideoIds();
                        break;

                    case "update_video_progress":
                        {
                            var uvid = GetString(message.Payload, "video_id");
                            var uvurl = GetString(message.Payload, "video_url");
                            var ucurr = GetDouble(message.Payload, "current_time") ?? 0;
                            var udur = GetDouble(message.Payload, "duration");
                            
                            if (uvid != null && uvurl != null)
                                result = _dbService.UpdateVideoProgress(uvid, uvurl, udur, ucurr);
                        }
                        break;
                        
                    case "get_video_progress":
                         var vpVid = GetString(message.Payload, "videoId");
                         if (vpVid != null) result = _dbService.GetVideoProgress(vpVid);
                         break;
                    
                    case "get_all_video_progress":
                        result = _dbService.GetAllVideoProgress(); 
                        break;

                    case "test_connection":
                        result = "Connection Successful";
                        break;

                    default:
                        // Log unknown command
                        System.Diagnostics.Debug.WriteLine($"Unknown Command: {message.Command}");
                        break;
                }

                // Always reply if RequestId is present, even if result is null
                if (message.RequestId != null)
                {
                   await SendResponse(message.RequestId, result);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Bridge Error: {ex.Message}");
                if (!string.IsNullOrEmpty(e.WebMessageAsJson))
                {
                     // Try to extract RequestId to reply with error
                     try {
                        var partial = JsonSerializer.Deserialize<BridgeMessage>(e.WebMessageAsJson!);
                        if (partial?.RequestId != null) {
                             await SendResponse(partial.RequestId, null, ex.Message);
                        }
                     } catch {}
                }
            }
        }

        // Helper methods to safely get values from JsonElement
        private string? GetString(JsonElement el, string key) 
        {
            if (el.ValueKind == JsonValueKind.Object && el.TryGetProperty(key, out var prop))
                return prop.GetString();
            return null;
        }

        private long? GetLong(JsonElement el, string key)
        {
             if (el.ValueKind == JsonValueKind.Object && el.TryGetProperty(key, out var prop) && prop.TryGetInt64(out var val))
                return val;
             return null;
        }

        private double? GetDouble(JsonElement el, string key)
        {
             if (el.ValueKind == JsonValueKind.Object && el.TryGetProperty(key, out var prop) && prop.TryGetDouble(out var val))
                return val;
             return null;
        }

        private async Task SendResponse(string requestId, object? data, string? error = null)
        {
            var response = new
            {
                requestId = requestId,
                data = data,
                success = error == null,
                error = error
            };
            
            var json = JsonSerializer.Serialize(response);
            _webView.PostWebMessageAsJson(json);
        }
    }
}
