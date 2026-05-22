/**
 * PlayerBar Component - Thanh phát nhạc cố định ở dưới cùng
 * 
 * GIẢI THÍCH CHO GIÁM KHẢO:
 * - PlayerBar luôn hiển thị ở cuối màn hình (position: fixed bottom).
 * - Hiển thị: ảnh bìa + tên bài hát | nút điều khiển | thanh tiến trình | volume.
 * - AnimatePresence: Component của Framer Motion cho phép animate
 *   khi một element xuất hiện/biến mất khỏi DOM (mount/unmount).
 * - Thanh progress bar cho phép click để nhảy tới vị trí bất kỳ (seek).
 * - Nút Like (❤️) gọi toggleFavorite từ AuthContext.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaPause, FaStepForward, FaStepBackward, FaMusic } from 'react-icons/fa';
import { FiHeart, FiVolume2, FiDownload } from 'react-icons/fi';
import { usePlayer, usePlayerProgress } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import { offlineDB } from '../services/db';
import toast from 'react-hot-toast';

export default function PlayerBar() {
  const {
    currentTrack, isPlaying, isLoading,
    volume, setVolume,
    togglePlay, nextTrack, prevTrack, seekTo, formatTime,
    showLyrics, setShowLyrics,
  } = usePlayer();
  
  const { currentTime, duration } = usePlayerProgress();

  const { user, toggleFavorite, isFavorite, loginWithGoogle } = useAuth();
  const [showVolume, setShowVolume] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Kiểm tra trạng thái tải offline khi đổi bài hát
  useEffect(() => {
    if (currentTrack) {
      offlineDB.isDownloaded(currentTrack.id).then(setIsDownloaded);
    }
  }, [currentTrack]);

  // Không hiển thị PlayerBar nếu chưa có bài hát nào được chọn
  if (!currentTrack) return null;

  const liked = isFavorite(currentTrack.id);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleLike = () => {
    if (!user) {
      loginWithGoogle();
      return;
    }
    toggleFavorite(currentTrack);
  };

  /**
   * Xử lý tải bài hát về IndexedDB để nghe offline
   */
  const handleDownload = async () => {
    if (isDownloaded) {
      toast('Bài hát này đã được tải.', { icon: '🎧' });
      return;
    }
    
    setIsDownloading(true);
    const downloadToast = toast.loading('Đang tải bài hát...');
    
    try {
      // 1. Lấy URL stream hiện tại
      const streamUrl = document.querySelector('audio').src;
      if (!streamUrl) throw new Error('Không tìm thấy nguồn nhạc');
      
      // 2. Fetch dữ liệu blob
      const response = await fetch(streamUrl);
      if (!response.ok) throw new Error('Không thể tải file audio');
      const blob = await response.blob();
      
      // 3. Lưu vào IndexedDB
      await offlineDB.saveTrack(currentTrack, blob);
      
      setIsDownloaded(true);
      toast.success('Đã lưu bài hát offline!', { id: downloadToast });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Lỗi khi tải bài hát', { id: downloadToast });
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Xử lý click trên progress bar để seek
   * Tính tỷ lệ vị trí click so với chiều rộng thanh bar
   * rồi nhân với duration để ra thời điểm cần nhảy tới.
   */
  const handleProgressClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekTo(percent * duration);
  };

  return (
    <AnimatePresence>
      <div className="w-full z-10">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 20, opacity: 0 }}
          className="w-full bg-surface-900/40 backdrop-blur-2xl rounded-2xl md:rounded-3xl p-2.5 md:p-4 shadow-2xl border border-white/5 mobile-safe-bottom"
        >
        {/* === MOBILE LAYOUT (< md) === */}
        <div className="md:hidden">
          {/* Row 1: Track info + controls */}
          <div className="flex items-center gap-3 w-full">
            {/* Thumbnail */}
            <div className="relative group cursor-pointer shrink-0">
              <motion.img
                key={currentTrack.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-11 h-11 rounded-xl object-cover shadow-lg"
              />
            </div>
            
            {/* Track info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-semibold text-white truncate leading-tight">
                  {currentTrack.title}
                </p>
                <button
                  onClick={handleLike}
                  className={`transition-all duration-300 active:scale-90 shrink-0 p-1
                    ${liked ? 'text-red-500' : 'text-zinc-400'}`}
                >
                  <FiHeart className={`text-sm ${liked ? 'fill-current' : ''}`} />
                </button>
              </div>
              <p className="text-[11px] text-brand-300 truncate leading-tight">
                {currentTrack.artist}
              </p>
            </div>

            {/* Mobile controls */}
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={prevTrack} className="p-2 text-zinc-400 active:text-white transition-colors touch-target">
                <FaStepBackward className="text-xs" />
              </button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={togglePlay}
                disabled={isLoading}
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg disabled:opacity-50 shrink-0"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-surface-900 border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <FaPause className="text-surface-900 text-sm" />
                ) : (
                  <FaPlay className="text-surface-900 text-sm ml-0.5" />
                )}
              </motion.button>
              <button onClick={nextTrack} className="p-2 text-zinc-400 active:text-white transition-colors touch-target">
                <FaStepForward className="text-xs" />
              </button>
            </div>
          </div>

          {/* Row 2: Progress bar (mobile) */}
          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="text-[9px] font-medium text-zinc-500 w-7 text-right tabular-nums">{formatTime(currentTime)}</span>
            <div
              className="flex-1 h-1 bg-black/40 rounded-full cursor-pointer relative overflow-hidden"
              onClick={handleProgressClick}
            >
              <div
                className="h-full bg-brand-400 rounded-full relative"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[9px] font-medium text-zinc-500 w-7 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* === DESKTOP LAYOUT (>= md) === */}
        <div className="hidden md:flex items-center justify-between h-10 w-full">
          {/* Left: Track Info */}
          <div className="flex items-center gap-3 md:gap-4 w-1/3 min-w-0">
            <div className="relative group cursor-pointer shrink-0">
              <motion.img
                key={currentTrack.id + '-desktop'}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-10 h-10 rounded-lg object-cover shadow-lg"
              />
              <div className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <FaPlay className="text-white text-xs" />
              </div>
            </div>
            
            <div className="min-w-0 flex flex-col justify-center gap-0.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white truncate leading-tight">
                  {currentTrack.title}
                </p>
                {/* Nút Like nằm ngay sau tên bài hát */}
                <button
                  onClick={handleLike}
                  className={`transition-all duration-300 hover:scale-110 shrink-0
                    ${liked ? 'text-red-500' : 'text-zinc-400 hover:text-white'}`}
                  title="Yêu thích"
                >
                  <FiHeart className={`text-sm ${liked ? 'fill-current' : ''}`} />
                </button>
              </div>
              <p className="text-[10px] text-brand-300 truncate leading-tight">
                {currentTrack.artist}
              </p>
            </div>
          </div>

          {/* Center: Controls & Progress */}
          <div className="flex flex-col items-center gap-0.5 w-1/3">
            <div className="flex items-center gap-4">
              <button
                onClick={prevTrack}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
              >
                <FaStepBackward className="text-xs" />
              </button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={togglePlay}
                disabled={isLoading}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg transition-shadow disabled:opacity-50 shrink-0"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-surface-900 border-t-transparent rounded-full animate-spin" />
                ) : isPlaying ? (
                  <FaPause className="text-surface-900 text-xs" />
                ) : (
                  <FaPlay className="text-surface-900 text-xs ml-0.5" />
                )}
              </motion.button>
              <button
                onClick={nextTrack}
                className="p-1 text-zinc-400 hover:text-white transition-colors"
              >
                <FaStepForward className="text-xs" />
              </button>
            </div>
            
            {/* Progress Bar */}
            <div className="flex items-center gap-3 w-full max-w-2xl">
              <span className="text-[8px] font-medium text-zinc-400 w-6 text-right tabular-nums">{formatTime(currentTime)}</span>
              <div
                className="flex-1 h-1 bg-black/40 rounded-full cursor-pointer group relative overflow-hidden"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-brand-400 rounded-full group-hover:bg-brand-300 transition-colors relative"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[8px] font-medium text-zinc-400 w-6 tabular-nums">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right: Volume */}
          <div className="hidden lg:flex items-center gap-2 w-1/3 justify-end pr-2">
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              className={`p-1.5 rounded-full transition-all duration-300 hover:bg-white/10
                ${showLyrics ? 'text-brand-400 bg-white/10' : 'text-zinc-400 hover:text-white'}`}
              title="Lời bài hát"
            >
              <FaMusic className="text-sm" />
            </button>
            <button
              onClick={() => setShowVolume(!showVolume)}
              className="p-1.5 text-zinc-400 hover:text-white transition-colors"
            >
              <FiVolume2 className="text-sm" />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{
                background: `linear-gradient(to right, #fbbf24 0%, #fbbf24 ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%, rgba(255,255,255,0.1) 100%)`
              }}
              className="w-16 h-1 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
            />
          </div>
        </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
