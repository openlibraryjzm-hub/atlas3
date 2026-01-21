import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { addVideoToPlaylist } from '../api/playlistApi';

const LocalVideoUploader = ({ playlistId, onUploadComplete, onCancel }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });

  const handleFileSelect = async () => {
    try {
      // Use Tauri command to select video files
      const result = await invoke('select_video_files');
      
      if (result && Array.isArray(result) && result.length > 0) {
        setSelectedFiles(result);
        setError(null);
      } else if (result === null) {
        // User cancelled
        return;
      } else {
        setError('No files selected');
      }
    } catch (err) {
      console.error('Failed to select files:', err);
      setError('Failed to select files. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one video file');
      return;
    }

    if (!playlistId) {
      setError('No playlist selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setProgress({ current: 0, total: selectedFiles.length, message: 'Adding videos...' });

      let successCount = 0;
      for (let i = 0; i < selectedFiles.length; i++) {
        const filePath = selectedFiles[i];
        
        try {
          // Extract filename from path
          const pathParts = filePath.split(/[/\\]/);
          const fileName = pathParts[pathParts.length - 1];
          
          // Create a unique video ID from file path
          const videoId = `local_${filePath.replace(/[^a-zA-Z0-9]/g, '_')}`;
          
          // Use file path directly (Tauri will handle file:// conversion)
          const videoUrl = filePath;
          
          // Add to playlist with is_local flag
          await addVideoToPlaylist(
            playlistId,
            videoUrl,
            videoId,
            fileName, // Use filename as title
            null, // No thumbnail for local files
            true // is_local = true
          );
          
          successCount++;
          setProgress({ 
            current: i + 1, 
            total: selectedFiles.length, 
            message: `Added ${successCount}/${selectedFiles.length} videos...` 
          });
        } catch (fileError) {
          console.error(`Failed to add file ${filePath}:`, fileError);
        }
      }

      setProgress({ 
        current: selectedFiles.length, 
        total: selectedFiles.length, 
        message: `Successfully added ${successCount} video(s)!` 
      });

      // Callback after short delay to show success message
      setTimeout(() => {
        if (onUploadComplete) {
          onUploadComplete();
        }
      }, 1000);

    } catch (error) {
      console.error('Failed to upload local videos:', error);
      const errorMessage = error?.message || error?.toString() || 'Failed to upload videos';
      setError(errorMessage);
      setProgress({ current: 0, total: 0, message: '' });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-slate-800 rounded-lg border border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Add Local Videos</h2>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* File Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Select Video Files
          </label>
          <button
            type="button"
            onClick={handleFileSelect}
            disabled={loading}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Select Video Files
          </button>
          {selectedFiles.length > 0 && (
            <div className="mt-2 p-3 bg-slate-700 rounded-lg">
              <p className="text-sm text-slate-300 mb-2">
                {selectedFiles.length} file(s) selected:
              </p>
              <ul className="text-xs text-slate-400 space-y-1 max-h-32 overflow-y-auto">
                {selectedFiles.map((filePath, index) => {
                  const pathParts = filePath.split(/[/\\]/);
                  const fileName = pathParts[pathParts.length - 1];
                  return <li key={index}>{fileName}</li>;
                })}
              </ul>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-400">
            Supported formats: MP4, MKV, AVI, MOV, WebM, FLV, WMV, M4V, MPG, MPEG
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Progress */}
        {loading && progress.total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>{progress.message}</span>
              <span>{progress.current}/{progress.total}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-sky-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="button"
          onClick={handleUpload}
          disabled={loading || selectedFiles.length === 0}
          className="w-full px-4 py-2 bg-sky-500 text-white rounded-lg font-medium hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding Videos...' : `Add ${selectedFiles.length > 0 ? `${selectedFiles.length} ` : ''}Video(s) to Playlist`}
        </button>
      </div>
    </div>
  );
};

export default LocalVideoUploader;

