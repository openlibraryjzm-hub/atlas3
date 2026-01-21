use axum::{
    body::Body,
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Router,
};
use futures::StreamExt;
use std::{
    collections::hash_map::DefaultHasher,
    collections::HashMap,
    hash::{Hash, Hasher},
    path::{Path as StdPath, PathBuf},
    sync::{Arc, Mutex},
};
use tokio::fs::File;
use tokio::io::{AsyncReadExt, AsyncSeekExt, SeekFrom};
use tokio_util::io::ReaderStream;
use tower::ServiceBuilder;
use tower_http::cors::CorsLayer;

// Store file paths with unique IDs for streaming
type FileRegistry = Arc<Mutex<HashMap<String, PathBuf>>>;

pub struct StreamingServer {
    port: u16,
    file_registry: FileRegistry,
}

impl StreamingServer {
    pub fn new(port: u16) -> Self {
        Self {
            port,
            file_registry: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn get_file_registry(&self) -> FileRegistry {
        Arc::clone(&self.file_registry)
    }

    pub async fn start(self: Arc<Self>) -> Result<(), Box<dyn std::error::Error>> {
        let file_registry = Arc::clone(&self.file_registry);
        let port = self.port;

        // Create router with streaming endpoint
        let app = Router::new()
            .route("/stream/:file_id", get(stream_file))
            .layer(
                ServiceBuilder::new()
                    .layer(CorsLayer::permissive()) // Allow CORS for localhost
                    .into_inner(),
            )
            .with_state(file_registry);

        // Start server
        let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port)).await?;
        println!("Streaming server started on http://127.0.0.1:{}", port);

        axum::serve(listener, app).await?;
        Ok(())
    }

    pub fn register_file(&self, file_path: PathBuf) -> String {
        let mut registry = self.file_registry.lock().unwrap();
        // Use a hash of the path as the file ID
        let mut hasher = DefaultHasher::new();
        file_path.to_string_lossy().hash(&mut hasher);
        let file_id = format!("{:x}", hasher.finish());
        registry.insert(file_id.clone(), file_path);
        file_id
    }

    pub fn get_stream_url(&self, file_path: &str) -> String {
        let path_buf = PathBuf::from(file_path);
        let file_id = self.register_file(path_buf);
        format!("http://127.0.0.1:{}/stream/{}", self.port, file_id)
    }
}

async fn stream_file(
    Path(file_id): Path<String>,
    headers: HeaderMap,
    State(file_registry): State<FileRegistry>,
) -> Result<Response, StatusCode> {
    // Get file path from registry
    let file_path = {
        let registry = file_registry.lock().unwrap();
        registry.get(&file_id).cloned()
    };

    let file_path = file_path.ok_or(StatusCode::NOT_FOUND)?;

    // Open file
    let mut file = File::open(&file_path)
        .await
        .map_err(|_| StatusCode::NOT_FOUND)?;

    // Get file size
    let file_size = file
        .metadata()
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .len();

    // Handle range requests for seeking
    let range_header = headers.get(header::RANGE);

    if let Some(range_value) = range_header {
        if let Ok(range_str) = range_value.to_str() {
            if let Some(range) = parse_range(range_str, file_size) {
                let (start, end) = range;
                let content_length = end - start + 1;

                // Seek to start position
                file.seek(SeekFrom::Start(start))
                    .await
                    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

                // Read the requested range
                let mut buffer = vec![0u8; content_length as usize];
                file.read_exact(&mut buffer)
                    .await
                    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

                // Determine content type from file extension
                let content_type = get_content_type(&file_path);

                return Ok(Response::builder()
                    .status(StatusCode::PARTIAL_CONTENT)
                    .header(header::CONTENT_TYPE, content_type)
                    .header(header::CONTENT_LENGTH, content_length)
                    .header(
                        header::CONTENT_RANGE,
                        format!("bytes {}-{}/{}", start, end, file_size),
                    )
                    .header(header::ACCEPT_RANGES, "bytes")
                    .body(Body::from(buffer))
                    .unwrap()
                    .into_response());
            }
        }
    }

    // No range request - stream the entire file
    // Use streaming body to avoid loading large files into memory
    // The browser will make range requests for seeking, but needs full file access for initial metadata
    let content_type = get_content_type(&file_path);

    // Create a streaming body from the file
    // Convert ReaderStream to a stream of Result<bytes::Bytes, Error>
    let stream = ReaderStream::new(file);
    let body_stream = stream.map(|result| {
        result
            .map(|chunk| bytes::Bytes::from(chunk))
            .map_err(|err| std::io::Error::new(std::io::ErrorKind::Other, err))
    });

    // Use Body::from_stream (available in axum 0.7)
    let body = Body::from_stream(body_stream);

    Ok(Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, content_type)
        .header(header::CONTENT_LENGTH, file_size)
        .header(header::ACCEPT_RANGES, "bytes")
        .body(body)
        .unwrap()
        .into_response())
}

fn parse_range(range_str: &str, file_size: u64) -> Option<(u64, u64)> {
    // Parse "bytes=start-end" format
    if let Some(range_part) = range_str.strip_prefix("bytes=") {
        if let Some((start_str, end_str)) = range_part.split_once('-') {
            let start = start_str.parse::<u64>().ok()?;
            let end = if end_str.is_empty() {
                file_size - 1
            } else {
                end_str.parse::<u64>().ok()?
            };
            if start <= end && end < file_size {
                return Some((start, end));
            }
        }
    }
    None
}

fn get_content_type(path: &StdPath) -> &'static str {
    match path.extension().and_then(|ext| ext.to_str()) {
        Some("mp4") => "video/mp4",
        Some("webm") => "video/webm",
        Some("mkv") => "video/x-matroska",
        Some("mov") => "video/quicktime",
        Some("avi") => "video/x-msvideo",
        Some("wmv") => "video/x-ms-wmv",
        Some("flv") => "video/x-flv",
        Some("m4v") => "video/x-m4v",
        Some("mpg") | Some("mpeg") => "video/mpeg",
        _ => "video/mp4", // default
    }
}
