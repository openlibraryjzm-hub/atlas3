import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getWatchHistory } from '../api/playlistApi';
import { getThumbnailUrl } from '../utils/youtubeUtils';
import { useLayoutStore } from '../store/layoutStore';
import Card from './Card';
import CardThumbnail from './CardThumbnail';
import CardContent from './CardContent';
import PageBanner from './PageBanner';

const HistoryPage = ({ onVideoSelect, onSecondPlayerSelect }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { inspectMode } = useLayoutStore();

  // Helper to get inspect label
  const getInspectTitle = (label) => inspectMode ? label : undefined;

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const historyData = await getWatchHistory(100);
      setHistory(historyData || []);
    } catch (error) {
      console.error('Failed to load watch history:', error);
      alert(`Failed to load watch history: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (video) => {
    if (onVideoSelect) {
      onVideoSelect(video.video_url);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

      // For older dates, show actual date
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-slate-400">Loading history...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <p className="text-slate-400">No watch history yet</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-transparent">
      <div className="flex-1 overflow-y-auto p-6">
        <PageBanner
          title="History"
          description="Your recently watched videos."
          color={null}
          isEditable={false}
        />
        <div className="flex flex-col space-y-3 max-w-5xl mx-auto">
          {history.map((item) => {
            const thumbnailUrl = item.thumbnail_url || getThumbnailUrl(item.video_id, 'medium');

            return (
              <Card
                key={item.id}
                onClick={() => handleVideoClick(item)}
                className="flex flex-row gap-5 p-3 bg-slate-800/40 hover:bg-slate-800/80 rounded-xl transition-all group w-full border border-transparent hover:border-slate-700/50"
                title={getInspectTitle(`History video: ${item.title || 'Untitled'}`)}
                variant="minimal"
              >
                {/* Left: Thumbnail */}
                <div className="w-64 shrink-0 aspect-video rounded-lg overflow-hidden relative shadow-md group-hover:shadow-xl transition-all">
                  <CardThumbnail
                    src={thumbnailUrl}
                    alt={item.title || 'Video thumbnail'}
                    overlay={
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-3 pointer-events-auto bg-black/40 backdrop-blur-[2px] absolute inset-0 justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVideoClick(item);
                          }}
                          className="bg-sky-500 hover:bg-sky-400 rounded-full p-3 transition-all active:scale-90 shadow-lg hover:scale-110"
                          style={{ color: '#052F4A' }}
                          title={getInspectTitle('Play video') || 'Play video'}
                        >
                          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                        </button>
                      </div>
                    }
                  />
                </div>

                {/* Right: Info */}
                <div className="flex flex-col justify-center flex-1 min-w-0 py-2">
                  <h3 className="text-lg font-bold mb-2 line-clamp-2 leading-tight transition-colors"
                    style={{ color: '#052F4A' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#38bdf8'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#052F4A'}>
                    {item.title || 'Untitled Video'}
                  </h3>
                  <div className="flex items-center text-sm text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5 bg-slate-900/50 px-2 py-1 rounded-md border border-slate-700/50">
                      <Clock size={14} className="text-sky-500/80" />
                      {formatDate(item.watched_at)}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;

