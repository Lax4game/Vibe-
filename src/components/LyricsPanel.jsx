import { motion, AnimatePresence } from 'framer-motion';
import { IoClose } from 'react-icons/io5';
import { FiPlay, FiPause, FiSkipBack, FiSkipForward, FiHeart, FiClock, FiCheck, FiPlus, FiMinus } from 'react-icons/fi';
import { usePlayer, usePlayerProgress } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useRef, useCallback, useState } from 'react';
import toast from 'react-hot-toast';

export default function LyricsPanel() {
  const { 
    currentTrack, lyrics, showLyrics, setShowLyrics,
    isPlaying, togglePlay, nextTrack, prevTrack, seekTo, formatTime
  } = usePlayer();
  const { currentTime, duration } = usePlayerProgress();
  const { toggleFavorite, isFavorite, lyricsOffsets, saveLyricsOffset } = useAuth();
  
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const prevIndexRef = useRef(-1);
  const [isSpeedOpen, setIsSpeedOpen] = useState(false);

  // Lấy offset đã lưu cho bài này (mặc định 0s)
  const currentOffset = lyricsOffsets[currentTrack?.id] ?? 0;
  const [tempOffset, setTempOffset] = useState(currentOffset);

  // Cập nhật tempOffset khi đổi bài hoặc load dữ liệu xong
  useEffect(() => {
    setTempOffset(currentOffset);
  }, [currentOffset, currentTrack?.id]);

  // Tính activeIndex ổn định
  const computeIndex = useCallback(() => {
    const t = currentTime + currentOffset;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (t >= lyrics[i].time) return i;
    }
    return -1;
  }, [currentTime, lyrics, currentOffset]);

  useEffect(() => {
    const newIdx = computeIndex();
    if (newIdx !== prevIndexRef.current) {
      prevIndexRef.current = newIdx;
      setActiveIndex(newIdx);
    }
  }, [computeIndex]);

  // Kiểm tra nhạc dạo
  const isIntro = lyrics.length > 0 && (currentTime + currentOffset) < lyrics[0].time;

  // Cuộn mượt tới dòng active
  useEffect(() => {
    if (activeIndex < 0 || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(`[data-idx="${activeIndex}"]`);
    if (!el) return;
    const container = scrollRef.current;
    const target = el.offsetTop - container.offsetHeight / 2 + el.offsetHeight / 2;
    container.scrollTo({ top: target, behavior: 'smooth' });
  }, [activeIndex]);

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    seekTo(pct * duration);
  };

  const handleSaveOffset = () => {
    saveLyricsOffset(currentTrack.id, parseFloat(tempOffset));
    setIsSpeedOpen(false);
  };

  const adjustOffset = (amount) => {
    setTempOffset(prev => (parseFloat(prev) + amount).toFixed(1));
  };

  if (!showLyrics) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-12 overflow-hidden"
      >
        {/* Dynamic Background — Nâng cấp độ đậm và rực màu */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-black">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTrack?.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5 }}
              className="absolute inset-0"
            >
              {/* Lớp 1: Ảnh gốc siêu rực (Saturate cực cao) */}
              <div 
                className="absolute inset-0 bg-cover bg-center scale-150 saturate-[250%] brightness-[0.4]"
                style={{ 
                  backgroundImage: `url(${currentTrack?.thumbnail})`,
                  filter: 'blur(100px)'
                }}
              />

              {/* Lớp 2: Khối màu động lấy trực tiếp từ ảnh bìa để đảm bảo đúng màu bài hát */}
              <motion.div
                animate={{
                  x: [0, 60, -60, 0],
                  y: [0, -40, 40, 0],
                  rotate: [0, 90, 180, 270, 360],
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="absolute -top-1/4 -left-1/4 w-full h-full opacity-60 mix-blend-screen"
                style={{
                  backgroundImage: `radial-gradient(circle, transparent 0%, black 100%), url(${currentTrack?.thumbnail})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(80px) saturate(200%)'
                }}
              />

              <motion.div
                animate={{
                  x: [0, -80, 80, 0],
                  y: [0, 60, -60, 0],
                  rotate: [360, 270, 180, 90, 0],
                }}
                transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
                className="absolute -bottom-1/4 -right-1/4 w-full h-full opacity-40 mix-blend-overlay"
                style={{
                  backgroundImage: `url(${currentTrack?.thumbnail})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  filter: 'blur(100px) saturate(200%)'
                }}
              />

              {/* Lớp 3: Gradient đen sâu ở các cạnh để làm nổi bật màu ở giữa */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
              
              {/* Lớp cuối: Noise để khử banding màu */}
              <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nút đóng */}
        <button
          onClick={() => setShowLyrics(false)}
          className="absolute top-3 right-3 sm:top-6 sm:right-6 lg:top-12 lg:right-12 p-2 sm:p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-50 shadow-xl"
        >
          <IoClose size={28} />
        </button>

        {/* Speed Lyrics Control (Góc trái dưới) */}
        <div 
          className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 lg:bottom-12 lg:left-12 z-50 flex items-center"
          onMouseLeave={() => setIsSpeedOpen(false)}
        >
          <div className="relative flex items-center">
            {/* Nút đồng hồ chính - Luôn đứng yên */}
            <button
              onMouseEnter={() => setIsSpeedOpen(true)}
              className={`w-12 h-12 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center transition-all shadow-lg z-10
                ${isSpeedOpen ? 'bg-brand-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
            >
              <FiClock size={22} />
            </button>

            {/* Bảng điều khiển - Hiện ra bên cạnh sát hơn để tránh mất hover */}
            <AnimatePresence>
              {isSpeedOpen && (
                <motion.div
                  initial={{ opacity: 0, x: 10, scale: 0.95 }}
                  animate={{ x: 54, opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: 10, scale: 0.95 }}
                  className="absolute left-0 bg-zinc-900/95 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-4 whitespace-nowrap pl-6 -ml-4"
                  style={{ originX: 0 }}
                >
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Đồng bộ lời nhạc (s)</span>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); adjustOffset(-0.1); }} className="sync-btn"><FiMinus /></button>
                      <input 
                        type="number" 
                        step="0.1"
                        value={tempOffset}
                        onChange={(e) => setTempOffset(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="sync-input bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white w-16 text-center text-sm font-mono focus:outline-none focus:border-brand-500"
                      />
                      <button onClick={(e) => { e.stopPropagation(); adjustOffset(0.1); }} className="sync-btn"><FiPlus /></button>
                    </div>
                  </div>
                  
                  <div className="h-10 w-[1px] bg-white/10 mx-1" />

                  <button
                    onClick={(e) => { e.stopPropagation(); handleSaveOffset(); }}
                    className="w-10 h-10 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-400 transition-all shadow-lg shadow-brand-500/20"
                    title="Lưu cài đặt"
                  >
                    <FiCheck size={20} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 sm:gap-8 lg:gap-20 items-center z-10 mx-auto">
          {/* Trái: Album Art, Info & Controls */}
          <div className="flex flex-col items-center text-center gap-4 sm:gap-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6, ease: 'circOut' }}
              className="w-40 h-40 sm:w-64 sm:h-64 lg:w-96 lg:h-96 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.8)] border border-white/10"
            >
              <img
                src={currentTrack?.thumbnail}
                alt={currentTrack?.title}
                className="w-full h-full object-cover"
              />
            </motion.div>

            {/* Container giới hạn theo chiều ngang của ảnh (w-96 ~ 384px) */}
            <div className="w-full max-w-[160px] sm:max-w-[256px] lg:max-w-[384px] space-y-3 sm:space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0 text-left">
                  <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white mb-0.5 sm:mb-1 font-display truncate">
                    {currentTrack?.title}
                  </h2>
                  <p className="text-sm sm:text-lg text-brand-400 font-medium truncate">{currentTrack?.artist}</p>
                </div>
                <button 
                  onClick={() => toggleFavorite(currentTrack)}
                  className="p-3 rounded-full bg-white/5 border border-white/10 text-white/60 hover:text-brand-500 hover:bg-white/10 transition-all shrink-0"
                >
                  <FiHeart className={`text-xl ${isFavorite(currentTrack?.id) ? 'fill-brand-500 text-brand-500' : ''}`} />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div 
                  className="relative w-full h-1.5 bg-white/10 rounded-full cursor-pointer group"
                  onClick={handleSeek}
                >
                  <motion.div 
                    className="absolute inset-y-0 left-0 bg-brand-500 rounded-full"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-medium text-white/40 font-mono">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Playback Controls - Căn giữa hoàn toàn */}
              <div className="flex items-center justify-center gap-6">
                <button 
                  onClick={prevTrack}
                  className="p-2 text-white/60 hover:text-white transition-colors"
                >
                  <FiSkipBack size={24} />
                </button>
                <button 
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl"
                >
                  {isPlaying ? <FiPause size={26} /> : <FiPlay size={26} className="ml-1" />}
                </button>
                <button 
                  onClick={nextTrack}
                  className="p-2 text-white/60 hover:text-white transition-colors"
                >
                  <FiSkipForward size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Phải: Lyrics — dùng CSS transition thuần, KHÔNG dùng framer-motion per-line */}
          <div
            className="h-[35vh] sm:h-[55vh] lg:h-[75vh] overflow-y-auto px-2 sm:px-4 lg:px-8 no-scrollbar relative"
            ref={scrollRef}
          >
            <div className="py-[15vh] sm:py-[25vh] lg:py-[35vh]">
              {lyrics.length > 0 ? (
                <>
                  {/* Nhạc dạo */}
                  <div
                    className={`lyric-line py-6 flex items-center gap-3 font-display ${
                      isIntro ? 'lyric-active text-brand-400' : 'text-zinc-600'
                    }`}
                  >
                    <span className="flex gap-1 items-end h-6">
                      <motion.span
                        animate={isIntro ? { height: [10, 22, 10] } : { height: 10 }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="w-1 bg-current rounded-full"
                      />
                      <motion.span
                        animate={isIntro ? { height: [10, 28, 10] } : { height: 10 }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                        className="w-1 bg-current rounded-full"
                      />
                      <motion.span
                        animate={isIntro ? { height: [10, 18, 10] } : { height: 10 }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                        className="w-1 bg-current rounded-full"
                      />
                    </span>
                    ♫ Nhạc dạo ♫
                  </div>

                  {lyrics.map((line, index) => {
                    const isActive = activeIndex === index;
                    const isNear = !isActive && Math.abs(activeIndex - index) <= 2;
                    return (
                      <div
                        key={index}
                        data-idx={index}
                        className={`lyric-line py-4 cursor-pointer font-display leading-snug ${
                          isActive ? 'lyric-active' : isNear ? 'lyric-near' : ''
                        }`}
                      >
                        {line.text}
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-2xl italic font-display">
                  Chưa có lời bài hát cho ca khúc này...
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
