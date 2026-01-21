use crate::models::{Playlist, PlaylistItem, VideoProgress, WatchHistory};
use chrono::Utc;
use rusqlite::{params, Connection, Result};
use std::collections::HashMap;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(db_path: Option<&str>) -> Result<Self> {
        // Use provided path or default to app data directory
        let path = db_path.unwrap_or("playlists.db");
        let conn = Connection::open(path)?;

        let db = Database { conn };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<()> {
        // Create playlists table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS playlists (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                created_at TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                custom_thumbnail_url TEXT
            )",
            [],
        )?;

        // Create playlist_items table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS playlist_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                playlist_id INTEGER NOT NULL,
                video_url TEXT NOT NULL,
                video_id TEXT NOT NULL,
                title TEXT,
                thumbnail_url TEXT,
                position INTEGER NOT NULL,
                thumbnail_url TEXT,
                position INTEGER NOT NULL,
                added_at TEXT NOT NULL,
                is_local INTEGER NOT NULL DEFAULT 0,
                author TEXT,
                view_count TEXT,
                published_at TEXT,
                FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // Create index for faster lookups
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON playlist_items(playlist_id)",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_playlist_items_position ON playlist_items(playlist_id, position)",
            [],
        )?;

        // Create video_folder_assignments table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS video_folder_assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                playlist_id INTEGER NOT NULL,
                item_id INTEGER NOT NULL,
                folder_color TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES playlist_items(id) ON DELETE CASCADE,
                UNIQUE(playlist_id, item_id, folder_color)
            )",
            [],
        )?;

        // Create index for folder lookups
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_folder_assignments_playlist_color ON video_folder_assignments(playlist_id, folder_color)",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_folder_assignments_item ON video_folder_assignments(item_id)",
            [],
        )?;

        // Create watch_history table
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS watch_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_url TEXT NOT NULL,
                video_id TEXT NOT NULL,
                title TEXT,
                thumbnail_url TEXT,
                watched_at TEXT NOT NULL
            )",
            [],
        )?;

        // Create index for faster history lookups
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_watch_history_watched_at ON watch_history(watched_at DESC)",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_watch_history_video_id ON watch_history(video_id)",
            [],
        )?;

        // Create video_progress table to track playback progress
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS video_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                video_id TEXT NOT NULL UNIQUE,
                video_url TEXT NOT NULL,
                duration REAL,
                last_progress REAL NOT NULL DEFAULT 0,
                progress_percentage REAL NOT NULL DEFAULT 0,
                last_updated TEXT NOT NULL
            )",
            [],
        )?;

        // Create index for faster progress lookups
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_video_progress_video_id ON video_progress(video_id)",
            [],
        )?;

        // Create stuck_folders table to track folders that should remain visible
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS stuck_folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                playlist_id INTEGER NOT NULL,
                folder_color TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
                UNIQUE(playlist_id, folder_color)
            )",
            [],
        )?;

        // Create index for faster stuck folder lookups
        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_stuck_folders_playlist_color ON stuck_folders(playlist_id, folder_color)",
            [],
        )?;

        // Create folder_metadata table for custom folder names/descriptions
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS folder_metadata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                playlist_id INTEGER NOT NULL,
                folder_color TEXT NOT NULL,
                custom_name TEXT,
                description TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
                UNIQUE(playlist_id, folder_color)
            )",
            [],
        )?;

        self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_folder_metadata_playlist_color ON folder_metadata(playlist_id, folder_color)",
            [],
        )?;

        // Migration: Add is_local column to playlist_items if it doesn't exist
        // SQLite doesn't support IF NOT EXISTS for ALTER TABLE, so we check if column exists
        let mut stmt = self.conn.prepare("PRAGMA table_info(playlist_items)")?;
        let columns: Vec<String> = stmt
            .query_map([], |row| Ok(row.get::<_, String>(1)?))?
            .collect::<Result<Vec<_>, _>>()?;

        if !columns.contains(&"is_local".to_string()) {
            self.conn.execute(
                "ALTER TABLE playlist_items ADD COLUMN is_local INTEGER NOT NULL DEFAULT 0",
                [],
            )?;
        }

        // Migration: Add author and view_count columns
        if !columns.contains(&"author".to_string()) {
            self.conn
                .execute("ALTER TABLE playlist_items ADD COLUMN author TEXT", [])?;
        }

        if !columns.contains(&"view_count".to_string()) {
            self.conn
                .execute("ALTER TABLE playlist_items ADD COLUMN view_count TEXT", [])?;
        }

        if !columns.contains(&"published_at".to_string()) {
            self.conn
                .execute("ALTER TABLE playlist_items ADD COLUMN published_at TEXT", [])?;
        }

        // Migration: Add Video Progress columns
        let mut vp_stmt = self.conn.prepare("PRAGMA table_info(video_progress)")?;
        let vp_columns: Vec<String> = vp_stmt
            .query_map([], |row| Ok(row.get::<_, String>(1)?))?
            .collect::<Result<Vec<_>, _>>()?;

        if !vp_columns.contains(&"has_fully_watched".to_string()) {
            self.conn
                .execute("ALTER TABLE video_progress ADD COLUMN has_fully_watched INTEGER NOT NULL DEFAULT 0", [])?;
        }

        // Migration: Add custom_ascii to playlists
        let mut pl_stmt = self.conn.prepare("PRAGMA table_info(playlists)")?;
        let pl_columns: Vec<String> = pl_stmt
            .query_map([], |row| Ok(row.get::<_, String>(1)?))?
            .collect::<Result<Vec<_>, _>>()?;

        if !pl_columns.contains(&"custom_ascii".to_string()) {
            self.conn
                .execute("ALTER TABLE playlists ADD COLUMN custom_ascii TEXT", [])?;
        }

        // Migration: Add custom_ascii to folder_metadata
        let mut fm_stmt = self.conn.prepare("PRAGMA table_info(folder_metadata)")?;
        let fm_columns: Vec<String> = fm_stmt
            .query_map([], |row| Ok(row.get::<_, String>(1)?))?
            .collect::<Result<Vec<_>, _>>()?;

        if !fm_columns.contains(&"custom_ascii".to_string()) {
            self.conn.execute(
                "ALTER TABLE folder_metadata ADD COLUMN custom_ascii TEXT",
                [],
            )?;
        }

        // Migration: Add custom_thumbnail_url to playlists
        if !pl_columns.contains(&"custom_thumbnail_url".to_string()) {
            self.conn
                .execute("ALTER TABLE playlists ADD COLUMN custom_thumbnail_url TEXT", [])?;
        }

        Ok(())
    }

    // Playlist operations
    pub fn create_playlist(&self, name: &str, description: Option<&str>) -> Result<i64> {
        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO playlists (name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
            params![name, description, now, now],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_all_playlists(&self) -> Result<Vec<Playlist>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, created_at, updated_at, custom_ascii, custom_thumbnail_url FROM playlists ORDER BY created_at DESC"
        )?;

        let playlists = stmt
            .query_map([], |row| {
                Ok(Playlist {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    custom_ascii: row.get(5)?,
                    custom_thumbnail_url: row.get(6)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(playlists)
    }

    pub fn get_all_playlist_metadata(&self) -> Result<Vec<crate::models::PlaylistMetadata>> {
        // 1. Get all playlists IDs
        let mut stmt = self.conn.prepare("SELECT id FROM playlists")?;
        let playlist_ids: Vec<i64> = stmt.query_map([], |row| row.get(0))?.collect::<Result<Vec<_>, _>>()?;

        let mut metadata_list = Vec::new();

        // Prepare statements
        let mut count_stmt = self.conn.prepare("SELECT COUNT(*) FROM playlist_items WHERE playlist_id = ?1")?;
        
        // First video (position 0 or min)
        let mut first_video_stmt = self.conn.prepare(
             "SELECT id, playlist_id, video_url, video_id, title, thumbnail_url, position, added_at, is_local, author, view_count, published_at 
              FROM playlist_items 
              WHERE playlist_id = ?1 
              ORDER BY position ASC 
              LIMIT 1"
        )?;

        // Recent video logic: join video_progress and order by last_updated desc
        let mut recent_video_stmt = self.conn.prepare(
             "SELECT pi.id, pi.playlist_id, pi.video_url, pi.video_id, pi.title, pi.thumbnail_url, pi.position, pi.added_at, pi.is_local, pi.author, pi.view_count, pi.published_at 
              FROM playlist_items pi
              INNER JOIN video_progress vp ON pi.video_id = vp.video_id
              WHERE pi.playlist_id = ?1
              ORDER BY vp.last_updated DESC
              LIMIT 1"
        )?;

        for pid in playlist_ids {
            let count: i32 = count_stmt.query_row(params![pid], |row| row.get(0)).unwrap_or(0);
            
            let first_video = match first_video_stmt.query_row(params![pid], |row| {
                 Ok(PlaylistItem {
                    id: row.get(0)?,
                    playlist_id: row.get(1)?,
                    video_url: row.get(2)?,
                    video_id: row.get(3)?,
                    title: row.get(4)?,
                    thumbnail_url: row.get(5)?,
                    position: row.get(6)?,
                    added_at: row.get(7)?,
                    is_local: row.get::<_, i32>(8)? != 0,
                    author: row.get(9).unwrap_or(None),
                    view_count: row.get(10).unwrap_or(None),
                    published_at: row.get(11).unwrap_or(None),
                })
            }) {
                Ok(v) => Some(v),
                Err(rusqlite::Error::QueryReturnedNoRows) => None,
                Err(e) => return Err(e),
            };

            let recent_video = match recent_video_stmt.query_row(params![pid], |row| {
                 Ok(PlaylistItem {
                    id: row.get(0)?,
                    playlist_id: row.get(1)?,
                    video_url: row.get(2)?,
                    video_id: row.get(3)?,
                    title: row.get(4)?,
                    thumbnail_url: row.get(5)?,
                    position: row.get(6)?,
                    added_at: row.get(7)?,
                    is_local: row.get::<_, i32>(8)? != 0,
                    author: row.get(9).unwrap_or(None),
                    view_count: row.get(10).unwrap_or(None),
                    published_at: row.get(11).unwrap_or(None),
                })
            }) {
                Ok(v) => Some(v),
                Err(rusqlite::Error::QueryReturnedNoRows) => None,
                Err(e) => return Err(e),
            };

            metadata_list.push(crate::models::PlaylistMetadata {
                playlist_id: pid,
                count,
                first_video,
                recent_video,
            });
        }
        
        Ok(metadata_list)
    }

    pub fn get_playlist(&self, id: i64) -> Result<Option<Playlist>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, created_at, updated_at, custom_ascii, custom_thumbnail_url FROM playlists WHERE id = ?1",
        )?;

        match stmt.query_row(params![id], |row| {
            Ok(Playlist {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
                custom_ascii: row.get(5)?,
                custom_thumbnail_url: row.get(6)?,
            })
        }) {
            Ok(playlist) => Ok(Some(playlist)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn update_playlist(
        &self,
        id: i64,
        name: Option<&str>,
        description: Option<&str>,
        custom_ascii: Option<&str>,
        custom_thumbnail_url: Option<&str>,
    ) -> Result<bool> {
        let now = Utc::now().to_rfc3339();

        if let Some(name) = name {
            let mut query = "UPDATE playlists SET name = ?1, updated_at = ?2".to_string();
            let mut params: Vec<Box<dyn rusqlite::ToSql>> =
                vec![Box::new(name), Box::new(now.clone())];
            let mut idx = 3;

            if let Some(desc) = description {
                query.push_str(&format!(", description = ?{}", idx));
                params.push(Box::new(desc));
                idx += 1;
            }

            if let Some(ascii) = custom_ascii {
                query.push_str(&format!(", custom_ascii = ?{}", idx));
                params.push(Box::new(ascii));
                idx += 1;
            }

            if let Some(thumb) = custom_thumbnail_url {
                query.push_str(&format!(", custom_thumbnail_url = ?{}", idx));
                params.push(Box::new(thumb));
                idx += 1;
            }

            query.push_str(&format!(" WHERE id = ?{}", idx));
            params.push(Box::new(id));

            // Execute dynamic query. Use as_ref() to convert params to &[&dyn ToSql]
            let params_refs: Vec<&dyn rusqlite::ToSql> =
                params.iter().map(|p| p.as_ref()).collect();
            let rows = self.conn.execute(&query, params_refs.as_slice())?;
            return Ok(rows > 0);
        } else if let Some(desc) = description {
            // Update only description
            let mut query = "UPDATE playlists SET description = ?1, updated_at = ?2".to_string();
            let mut params: Vec<Box<dyn rusqlite::ToSql>> =
                vec![Box::new(desc), Box::new(now.clone())];
            let mut idx = 3;

            if let Some(ascii) = custom_ascii {
                query.push_str(&format!(", custom_ascii = ?{}", idx));
                params.push(Box::new(ascii));
                idx += 1;
            }

            if let Some(thumb) = custom_thumbnail_url {
                query.push_str(&format!(", custom_thumbnail_url = ?{}", idx));
                params.push(Box::new(thumb));
                idx += 1;
            }

            query.push_str(&format!(" WHERE id = ?{}", idx));
            params.push(Box::new(id));

            let params_refs: Vec<&dyn rusqlite::ToSql> =
                params.iter().map(|p| p.as_ref()).collect();
            let rows = self.conn.execute(&query, params_refs.as_slice())?;
            return Ok(rows > 0);
        } else if let Some(ascii) = custom_ascii {
            // Update custom_ascii
            let mut query = "UPDATE playlists SET custom_ascii = ?1, updated_at = ?2".to_string();
            let mut params: Vec<Box<dyn rusqlite::ToSql>> =
                vec![Box::new(ascii), Box::new(now.clone())];
            let mut idx = 3;

            if let Some(thumb) = custom_thumbnail_url {
                query.push_str(&format!(", custom_thumbnail_url = ?{}", idx));
                params.push(Box::new(thumb));
                idx += 1;
            }
            
            query.push_str(&format!(" WHERE id = ?{}", idx));
            params.push(Box::new(id));

            let params_refs: Vec<&dyn rusqlite::ToSql> =
                params.iter().map(|p| p.as_ref()).collect();
            let rows = self.conn.execute(&query, params_refs.as_slice())?;
            return Ok(rows > 0);
        } else if let Some(thumb) = custom_thumbnail_url {
             let rows = self.conn.execute(
                "UPDATE playlists SET custom_thumbnail_url = ?1, updated_at = ?2 WHERE id = ?3",
                params![thumb, now, id],
            )?;
            return Ok(rows > 0);
        }

        Ok(false)
    }

    pub fn delete_playlist(&self, id: i64) -> Result<bool> {
        let rows = self
            .conn
            .execute("DELETE FROM playlists WHERE id = ?1", params![id])?;
        Ok(rows > 0)
    }

    pub fn delete_playlist_by_name(&self, name: &str) -> Result<bool> {
        let rows = self
            .conn
            .execute("DELETE FROM playlists WHERE name = ?1", params![name])?;
        Ok(rows > 0)
    }

    // Playlist item operations
    pub fn add_video_to_playlist(
        &self,
        playlist_id: i64,
        video_url: &str,
        video_id: &str,
        title: Option<&str>,
        thumbnail_url: Option<&str>,
        is_local: bool,
        author: Option<&str>,
        view_count: Option<&str>,
        published_at: Option<&str>,
    ) -> Result<i64> {
        // Get the next position (max position + 1)
        let position: i32 = self.conn.query_row(
            "SELECT COALESCE(MAX(position), 0) + 1 FROM playlist_items WHERE playlist_id = ?1",
            params![playlist_id],
            |row| row.get(0),
        )?;

        let now = Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO playlist_items (playlist_id, video_url, video_id, title, thumbnail_url, position, added_at, is_local, author, view_count, published_at) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![playlist_id, video_url, video_id, title, thumbnail_url, position, now, if is_local { 1 } else { 0 }, author, view_count, published_at],
        )?;

        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_playlist_items(&self, playlist_id: i64) -> Result<Vec<PlaylistItem>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, playlist_id, video_url, video_id, title, thumbnail_url, position, added_at, is_local, author, view_count, published_at 
             FROM playlist_items 
             WHERE playlist_id = ?1 
             ORDER BY position ASC"
        )?;

        let items = stmt
            .query_map(params![playlist_id], |row| {
                Ok(PlaylistItem {
                    id: row.get(0)?,
                    playlist_id: row.get(1)?,
                    video_url: row.get(2)?,
                    video_id: row.get(3)?,
                    title: row.get(4)?,
                    thumbnail_url: row.get(5)?,
                    position: row.get(6)?,
                    added_at: row.get(7)?,
                    is_local: row.get::<_, i32>(8)? != 0,
                    author: row.get(9).unwrap_or(None),
                    view_count: row.get(10).unwrap_or(None),
                    published_at: row.get(11).unwrap_or(None),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(items)
    }

    pub fn remove_video_from_playlist(&self, playlist_id: i64, item_id: i64) -> Result<bool> {
        // Get the position of the item being removed
        let removed_position: Option<i32> = match self.conn.query_row(
            "SELECT position FROM playlist_items WHERE id = ?1 AND playlist_id = ?2",
            params![item_id, playlist_id],
            |row| row.get(0),
        ) {
            Ok(pos) => Ok(Some(pos)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }?;

        if removed_position.is_none() {
            return Ok(false);
        }

        // Delete the item
        self.conn.execute(
            "DELETE FROM playlist_items WHERE id = ?1 AND playlist_id = ?2",
            params![item_id, playlist_id],
        )?;

        // Update positions of remaining items
        self.conn.execute(
            "UPDATE playlist_items SET position = position - 1 
             WHERE playlist_id = ?1 AND position > ?2",
            params![playlist_id, removed_position.unwrap()],
        )?;

        Ok(true)
    }

    pub fn reorder_playlist_item(
        &self,
        playlist_id: i64,
        item_id: i64,
        new_position: i32,
    ) -> Result<bool> {
        // Get current position
        let current_position: Option<i32> = match self.conn.query_row(
            "SELECT position FROM playlist_items WHERE id = ?1 AND playlist_id = ?2",
            params![item_id, playlist_id],
            |row| row.get(0),
        ) {
            Ok(pos) => Ok(Some(pos)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }?;

        if current_position.is_none() {
            return Ok(false);
        }

        let current_pos = current_position.unwrap();
        if current_pos == new_position {
            return Ok(true);
        }

        // Update positions
        if new_position > current_pos {
            // Moving down: shift items up
            self.conn.execute(
                "UPDATE playlist_items SET position = position - 1 
                 WHERE playlist_id = ?1 AND position > ?2 AND position <= ?3",
                params![playlist_id, current_pos, new_position],
            )?;
        } else {
            // Moving up: shift items down
            self.conn.execute(
                "UPDATE playlist_items SET position = position + 1 
                 WHERE playlist_id = ?1 AND position >= ?2 AND position < ?3",
                params![playlist_id, new_position, current_pos],
            )?;
        }

        // Update the item's position
        self.conn.execute(
            "UPDATE playlist_items SET position = ?1 WHERE id = ?2 AND playlist_id = ?3",
            params![new_position, item_id, playlist_id],
        )?;

        Ok(true)
    }

    // Folder assignment operations
    pub fn assign_video_to_folder(
        &self,
        playlist_id: i64,
        item_id: i64,
        folder_color: &str,
    ) -> Result<i64> {
        let now = Utc::now().to_rfc3339();

        // First, check if assignment already exists
        let exists: bool = self.conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM video_folder_assignments WHERE playlist_id = ?1 AND item_id = ?2 AND folder_color = ?3)",
            params![playlist_id, item_id, folder_color],
            |row| row.get(0),
        )?;

        if exists {
            // Return existing assignment id
            let id: i64 = self.conn.query_row(
                "SELECT id FROM video_folder_assignments WHERE playlist_id = ?1 AND item_id = ?2 AND folder_color = ?3",
                params![playlist_id, item_id, folder_color],
                |row| row.get(0),
            )?;
            return Ok(id);
        }

        // Insert new assignment
        self.conn.execute(
            "INSERT INTO video_folder_assignments (playlist_id, item_id, folder_color, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![playlist_id, item_id, folder_color, now],
        )?;

        Ok(self.conn.last_insert_rowid())
    }

    pub fn unassign_video_from_folder(
        &self,
        playlist_id: i64,
        item_id: i64,
        folder_color: &str,
    ) -> Result<bool> {
        let rows = self.conn.execute(
            "DELETE FROM video_folder_assignments WHERE playlist_id = ?1 AND item_id = ?2 AND folder_color = ?3",
            params![playlist_id, item_id, folder_color],
        )?;
        Ok(rows > 0)
    }

    pub fn get_videos_in_folder(
        &self,
        playlist_id: i64,
        folder_color: &str,
    ) -> Result<Vec<PlaylistItem>> {
        let mut stmt = self.conn.prepare(
            "SELECT pi.id, pi.playlist_id, pi.video_url, pi.video_id, pi.title, pi.thumbnail_url, pi.position, pi.added_at, pi.is_local, pi.author, pi.view_count, pi.published_at
             FROM playlist_items pi
             INNER JOIN video_folder_assignments vfa ON pi.id = vfa.item_id
             WHERE vfa.playlist_id = ?1 AND vfa.folder_color = ?2
             ORDER BY pi.position ASC"
        )?;

        let items = stmt
            .query_map(params![playlist_id, folder_color], |row| {
                Ok(PlaylistItem {
                    id: row.get(0)?,
                    playlist_id: row.get(1)?,
                    video_url: row.get(2)?,
                    video_id: row.get(3)?,
                    title: row.get(4)?,
                    thumbnail_url: row.get(5)?,
                    position: row.get(6)?,
                    added_at: row.get(7)?,
                    is_local: row.get::<_, i32>(8)? != 0,
                    author: row.get(9).unwrap_or(None),
                    view_count: row.get(10).unwrap_or(None),
                    published_at: row.get(11).unwrap_or(None),
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(items)
    }

    pub fn get_video_folder_assignments(
        &self,
        playlist_id: i64,
        item_id: i64,
    ) -> Result<Vec<String>> {
        let mut stmt = self.conn.prepare(
            "SELECT folder_color FROM video_folder_assignments WHERE playlist_id = ?1 AND item_id = ?2"
        )?;

        let colors = stmt
            .query_map(params![playlist_id, item_id], |row| {
                Ok(row.get::<_, String>(0)?)
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(colors)
    }

    pub fn get_all_folder_assignments_for_playlist(
        &self,
        playlist_id: i64,
    ) -> Result<HashMap<String, Vec<String>>> {
        let mut stmt = self.conn.prepare(
            "SELECT item_id, folder_color 
             FROM video_folder_assignments 
             WHERE playlist_id = ?1"
        )?;

        let mut assignments: HashMap<String, Vec<String>> = HashMap::new();

        let rows = stmt.query_map(params![playlist_id], |row| {
            Ok((
                row.get::<_, i64>(0)?, // item_id
                row.get::<_, String>(1)?, // folder_color
            ))
        })?;

        for row_result in rows {
            let (item_id, folder_color) = row_result?;
            assignments
                .entry(item_id.to_string())
                .or_insert_with(Vec::new)
                .push(folder_color);
        }

        Ok(assignments)
    }

    pub fn get_all_folders_with_videos(&self) -> Result<Vec<crate::models::FolderWithVideos>> {
        // Query to get all folders that have at least one video, grouped by playlist and folder color
        // Returns playlist info, folder color, video count, and first video
        let mut stmt = self.conn.prepare(
            "SELECT 
                vfa.playlist_id,
                p.name as playlist_name,
                vfa.folder_color,
                COUNT(DISTINCT vfa.item_id) as video_count,
                MIN(pi.position) as min_position
             FROM video_folder_assignments vfa
             INNER JOIN playlists p ON vfa.playlist_id = p.id
             INNER JOIN playlist_items pi ON vfa.item_id = pi.id
             GROUP BY vfa.playlist_id, vfa.folder_color
             ORDER BY p.name, vfa.folder_color",
        )?;

        let mut folders = Vec::new();
        let rows = stmt.query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,         // playlist_id
                row.get::<_, String>(1)?,      // playlist_name
                row.get::<_, String>(2)?,      // folder_color
                row.get::<_, i32>(3)?,         // video_count
                row.get::<_, Option<i32>>(4)?, // min_position
            ))
        })?;

        for row_result in rows {
            let (playlist_id, playlist_name, folder_color, video_count, min_position) = row_result?;

            // Get the first video (lowest position) for this folder
            let first_video = if let Some(pos) = min_position {
                // Get the first video in this folder (by position, then by id for consistency)
                let mut video_stmt = self.conn.prepare(
                    "SELECT pi.id, pi.playlist_id, pi.video_url, pi.video_id, pi.title, pi.thumbnail_url, pi.position, pi.added_at, pi.is_local, pi.author, pi.view_count, pi.published_at
                     FROM playlist_items pi
                     INNER JOIN video_folder_assignments vfa ON pi.id = vfa.item_id
                     WHERE vfa.playlist_id = ?1 AND vfa.folder_color = ?2 AND pi.position = ?3
                     ORDER BY pi.position ASC, pi.id ASC
                     LIMIT 1"
                )?;

                match video_stmt.query_row(params![playlist_id, folder_color, pos], |row| {
                    Ok(PlaylistItem {
                        id: row.get(0)?,
                        playlist_id: row.get(1)?,
                        video_url: row.get(2)?,
                        video_id: row.get(3)?,
                        title: row.get(4)?,
                        thumbnail_url: row.get(5)?,
                        position: row.get(6)?,
                        added_at: row.get(7)?,
                        is_local: row.get::<_, i32>(8)? != 0,
                        author: row.get(9).unwrap_or(None),
                        view_count: row.get(10).unwrap_or(None),
                        published_at: row.get(11).unwrap_or(None),
                    })
                }) {
                    Ok(video) => Some(video),
                    Err(_) => None,
                }
            } else {
                None
            };

            folders.push(crate::models::FolderWithVideos {
                playlist_id,
                playlist_name,
                folder_color,
                video_count,
                first_video,
            });
        }

        Ok(folders)
    }

    pub fn get_folders_for_playlist(
        &self,
        playlist_id: i64,
    ) -> Result<Vec<crate::models::FolderWithVideos>> {
        // Query to get folders for a specific playlist that have at least one video
        let mut stmt = self.conn.prepare(
            "SELECT 
                vfa.playlist_id,
                p.name as playlist_name,
                vfa.folder_color,
                COUNT(DISTINCT vfa.item_id) as video_count,
                MIN(pi.position) as min_position
             FROM video_folder_assignments vfa
             INNER JOIN playlists p ON vfa.playlist_id = p.id
             INNER JOIN playlist_items pi ON vfa.item_id = pi.id
             WHERE vfa.playlist_id = ?1
             GROUP BY vfa.playlist_id, vfa.folder_color
             ORDER BY vfa.folder_color",
        )?;

        let mut folders = Vec::new();
        let rows = stmt.query_map(params![playlist_id], |row| {
            Ok((
                row.get::<_, i64>(0)?,         // playlist_id
                row.get::<_, String>(1)?,      // playlist_name
                row.get::<_, String>(2)?,      // folder_color
                row.get::<_, i32>(3)?,         // video_count
                row.get::<_, Option<i32>>(4)?, // min_position
            ))
        })?;

        for row_result in rows {
            let (playlist_id, playlist_name, folder_color, video_count, min_position) = row_result?;

            // Get the first video (lowest position) for this folder
            let first_video = if let Some(pos) = min_position {
                let mut video_stmt = self.conn.prepare(
                    "SELECT pi.id, pi.playlist_id, pi.video_url, pi.video_id, pi.title, pi.thumbnail_url, pi.position, pi.added_at, pi.is_local, pi.author, pi.view_count, pi.published_at
                     FROM playlist_items pi
                     INNER JOIN video_folder_assignments vfa ON pi.id = vfa.item_id
                     WHERE vfa.playlist_id = ?1 AND vfa.folder_color = ?2 AND pi.position = ?3
                     ORDER BY pi.position ASC, pi.id ASC
                     LIMIT 1"
                )?;

                match video_stmt.query_row(params![playlist_id, folder_color, pos], |row| {
                    Ok(PlaylistItem {
                        id: row.get(0)?,
                        playlist_id: row.get(1)?,
                        video_url: row.get(2)?,
                        video_id: row.get(3)?,
                        title: row.get(4)?,
                        thumbnail_url: row.get(5)?,
                        position: row.get(6)?,
                        added_at: row.get(7)?,
                        is_local: row.get::<_, i32>(8)? != 0,
                        author: row.get(9).unwrap_or(None),
                        view_count: row.get(10).unwrap_or(None),
                        published_at: row.get(11).unwrap_or(None),
                    })
                }) {
                    Ok(video) => Some(video),
                    Err(_) => None,
                }
            } else {
                None
            };

            folders.push(crate::models::FolderWithVideos {
                playlist_id,
                playlist_name,
                folder_color,
                video_count,
                first_video,
            });
        }

        Ok(folders)
    }

    // Watch history operations
    pub fn add_to_watch_history(
        &self,
        video_url: &str,
        video_id: &str,
        title: Option<&str>,
        thumbnail_url: Option<&str>,
    ) -> Result<i64> {
        let now = Utc::now().to_rfc3339();

        // First delete any existing entry for this video to avoid duplicates and move to top
        self.conn.execute(
            "DELETE FROM watch_history WHERE video_id = ?1",
            params![video_id],
        )?;

        self.conn.execute(
            "INSERT INTO watch_history (video_url, video_id, title, thumbnail_url, watched_at) 
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![video_url, video_id, title, thumbnail_url, now],
        )?;
        Ok(self.conn.last_insert_rowid())
    }

    // Stuck folders operations
    pub fn toggle_stuck_folder(&self, playlist_id: i64, folder_color: &str) -> Result<bool> {
        // Check if folder is already stuck
        let is_stuck = self.conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM stuck_folders WHERE playlist_id = ?1 AND folder_color = ?2)",
            params![playlist_id, folder_color],
            |row| row.get(0),
        )?;

        if is_stuck {
            // Unstick: remove from stuck_folders
            self.conn.execute(
                "DELETE FROM stuck_folders WHERE playlist_id = ?1 AND folder_color = ?2",
                params![playlist_id, folder_color],
            )?;
        }

        // Stick: insert into stuck_folders
        self.conn.execute(
            "INSERT INTO stuck_folders (playlist_id, folder_color, created_at) VALUES (?1, ?2, ?3)",
            params![playlist_id, folder_color, Utc::now().to_rfc3339()],
        )?;

        Ok(true)
    }

    pub fn is_folder_stuck(&self, playlist_id: i64, folder_color: &str) -> Result<bool> {
        self.conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM stuck_folders WHERE playlist_id = ?1 AND folder_color = ?2)",
            params![playlist_id, folder_color],
            |row| row.get(0),
        )
    }

    pub fn get_all_stuck_folders(&self) -> Result<Vec<(i64, String)>> {
        let mut stmt = self.conn.prepare(
            "SELECT playlist_id, folder_color FROM stuck_folders"
        )?;

        let folder_iter = stmt.query_map([], |row| {
            Ok((row.get(0)?, row.get(1)?))
        })?;

        folder_iter.collect()
    }

    // Folder Metadata operations
    pub fn get_folder_metadata(
        &self,
        playlist_id: i64,
        folder_color: &str,
    ) -> Result<Option<(String, String, Option<String>)>> {
        let mut stmt = self.conn.prepare(
            "SELECT custom_name, description, custom_ascii FROM folder_metadata WHERE playlist_id = ?1 AND folder_color = ?2"
        )?;

        match stmt.query_row(params![playlist_id, folder_color], |row| {
            Ok((row.get(0)?, row.get(1)?, row.get(2)?))
        }) {
            Ok(data) => Ok(Some(data)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn set_folder_metadata(
        &self,
        playlist_id: i64,
        folder_color: &str,
        name: Option<&str>,
        description: Option<&str>,
        custom_ascii: Option<&str>,
    ) -> Result<bool> {
        let now = Utc::now().to_rfc3339();

        // Check if exists
        let exists: bool = self.conn.query_row(
            "SELECT EXISTS(SELECT 1 FROM folder_metadata WHERE playlist_id = ?1 AND folder_color = ?2)",
            params![playlist_id, folder_color],
            |row| row.get(0),
        )?;

        if exists {
            let mut query = "UPDATE folder_metadata SET updated_at = ?1".to_string();
            let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(now.clone())];
            let mut idx = 2;

            if let Some(n) = name {
                query.push_str(&format!(", custom_name = ?{}", idx));
                params.push(Box::new(n));
                idx += 1;
            }

            if let Some(d) = description {
                query.push_str(&format!(", description = ?{}", idx));
                params.push(Box::new(d));
                idx += 1;
            }

            if let Some(a) = custom_ascii {
                query.push_str(&format!(", custom_ascii = ?{}", idx));
                params.push(Box::new(a));
                idx += 1;
            }

            query.push_str(&format!(" WHERE playlist_id = ?{} AND folder_color = ?{}", idx, idx + 1));
            params.push(Box::new(playlist_id));
            params.push(Box::new(folder_color));

             let params_refs: Vec<&dyn rusqlite::ToSql> =
                params.iter().map(|p| p.as_ref()).collect();
            
            let rows = self.conn.execute(&query, params_refs.as_slice())?;
            Ok(rows > 0)
        } else {
            self.conn.execute(
                "INSERT INTO folder_metadata (playlist_id, folder_color, custom_name, description, custom_ascii, created_at, updated_at) 
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    playlist_id, 
                    folder_color, 
                    name, 
                    description, 
                    custom_ascii,
                    now, 
                    now
                ],
            )?;
            Ok(true)
        }
    }

    // Video distribution operation
    pub fn get_playlists_for_video_ids(
        &self,
        video_ids: &[String],
    ) -> Result<HashMap<String, Vec<String>>> {
        if video_ids.is_empty() {
            return Ok(HashMap::new());
        }

        // Build the query dynamically based on the number of IDs
        let placeholders: Vec<String> = video_ids.iter().map(|_| "?".to_string()).collect();
        let query = format!(
            "SELECT pi.video_id, p.name 
             FROM playlist_items pi
             INNER JOIN playlists p ON pi.playlist_id = p.id
             WHERE pi.video_id IN ({})",
            placeholders.join(",")
        );

        let mut stmt = self.conn.prepare(&query)?;
        
        // Bind parameters
        let params: Vec<&dyn rusqlite::ToSql> = video_ids.iter().map(|id| id as &dyn rusqlite::ToSql).collect();
        
        // Execute and group results
        let mut result = HashMap::new();
        let rows = stmt.query_map(&*params, |row| {
             Ok((
                row.get::<_, String>(0)?, // video_id
                row.get::<_, String>(1)?, // playlist_name
             ))
        })?;

        for row_result in rows {
            let (video_id, playlist_name) = row_result?;
            result
                .entry(video_id)
                .or_insert_with(Vec::new)
                .push(playlist_name);
        }

        Ok(result)
    }




    pub fn get_watch_history(&self, limit: i32) -> Result<Vec<WatchHistory>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, video_url, video_id, title, thumbnail_url, watched_at 
             FROM watch_history 
             ORDER BY watched_at DESC 
             LIMIT ?1",
        )?;

        let history = stmt
            .query_map(params![limit], |row| {
                Ok(WatchHistory {
                    id: row.get(0)?,
                    video_url: row.get(1)?,
                    video_id: row.get(2)?,
                    title: row.get(3)?,
                    thumbnail_url: row.get(4)?,
                    watched_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(history)
    }

    pub fn clear_watch_history(&self) -> Result<bool> {
        self.conn.execute("DELETE FROM watch_history", [])?;
        Ok(true)
    }

    pub fn get_watched_video_ids(&self) -> Result<Vec<String>> {
        // Only return video IDs that have >= 85% progress
        let mut stmt = self.conn.prepare(
            "SELECT DISTINCT video_id FROM video_progress WHERE progress_percentage >= 85.0",
        )?;

        let video_ids = stmt
            .query_map([], |row| Ok(row.get::<_, String>(0)?))?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(video_ids)
    }



    // Video progress operations
    pub fn update_video_progress(
        &self,
        video_id: &str,
        video_url: &str,
        duration: Option<f64>,
        current_time: f64,
    ) -> Result<i64> {
        let now = Utc::now().to_rfc3339();

        // Check if record exists and get existing data
        let (existing_duration, already_fully_watched): (Option<f64>, bool) = self
            .conn
            .query_row(
                "SELECT duration, has_fully_watched FROM video_progress WHERE video_id = ?1",
                params![video_id],
                |row| {
                    let d: Option<f64> = row.get(0)?;
                    let w: i32 = row.get(1).unwrap_or(0);
                    Ok((d, w != 0))
                },
            )
            .unwrap_or((None, false)); // Default if not found

        // Use provided duration, or keep existing if not provided
        let final_duration = duration.or(existing_duration);

        // Calculate progress percentage
        let progress_percentage = if let Some(dur) = final_duration {
            if dur > 0.0 {
                (current_time / dur * 100.0).min(100.0).max(0.0)
            } else {
                0.0
            }
        } else {
            // If we don't have duration, we can't calculate percentage accurately
            0.0
        };

        // Determine fully watched status (sticky)
        let has_fully_watched = already_fully_watched || progress_percentage >= 85.0;

        // Use INSERT OR REPLACE to update existing or create new
        self.conn.execute(
            "INSERT OR REPLACE INTO video_progress 
             (video_id, video_url, duration, last_progress, progress_percentage, last_updated, has_fully_watched)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                video_id,
                video_url,
                final_duration,
                current_time,
                progress_percentage,
                now,
                if has_fully_watched { 1 } else { 0 }
            ],
        )?;

        Ok(self.conn.last_insert_rowid())
    }

    pub fn get_video_progress(&self, video_id: &str) -> Result<Option<VideoProgress>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, video_id, video_url, duration, last_progress, progress_percentage, last_updated, has_fully_watched 
             FROM video_progress 
             WHERE video_id = ?1"
        )?;

        match stmt.query_row(params![video_id], |row| {
            Ok(VideoProgress {
                id: row.get(0)?,
                video_id: row.get(1)?,
                video_url: row.get(2)?,
                duration: row.get(3)?,
                last_progress: row.get(4)?,
                progress_percentage: row.get(5)?,
                last_updated: row.get(6)?,
                has_fully_watched: row.get::<_, i32>(7).unwrap_or(0) != 0,
            })
        }) {
            Ok(progress) => Ok(Some(progress)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e),
        }
    }

    pub fn get_all_video_progress(&self) -> Result<Vec<VideoProgress>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, video_id, video_url, duration, last_progress, progress_percentage, last_updated, has_fully_watched 
             FROM video_progress"
        )?;

        let progress = stmt
            .query_map([], |row| {
                Ok(VideoProgress {
                    id: row.get(0)?,
                    video_id: row.get(1)?,
                    video_url: row.get(2)?,
                    duration: row.get(3)?,
                    last_progress: row.get(4)?,
                    progress_percentage: row.get(5)?,
                    last_updated: row.get(6)?,
                    has_fully_watched: row.get::<_, i32>(7).unwrap_or(0) != 0,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(progress)
    }
}
