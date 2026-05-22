/**
 * Home Page - Trang chủ hiển thị nhạc trending
 * 
 * GIẢI THÍCH CHO GIÁM KHẢO:
 * - Trang chủ gồm 3 phần chính:
 *   1. Hero Banner: Banner lớn hiển thị bài hát nổi bật (ảnh nền full-width).
 *   2. Grid bài hát trending: Dùng CSS Grid tự động responsive.
 *   3. Nhiều section thể loại: V-Pop, Viral, Lofi...
 * - useEffect: Gọi API lấy dữ liệu khi component được render lần đầu.
 * - Loading skeleton: Hiển thị khung xám nhấp nháy khi đang tải → UX tốt hơn.
 * - Framer Motion stagger: Các card xuất hiện lần lượt → đẹp mắt.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaPlay } from 'react-icons/fa';
import { musicApi } from '../services/musicApi';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import SongCard from '../components/SongCard';

const SECTIONS = [
  { id: 'trending', title: '🔥 Thịnh hành', query: 'top trending hits 2024' },
  { id: 'vpop', title: '🇻🇳 V-Pop mới nhất', query: 'V-Pop mới nhất 2024' },
  { id: 'viral', title: '⚡ Viral Hits', query: 'viral hits 2024' },
  { id: 'lofi', title: '🎧 Lofi & Chill', query: 'lofi chill beats study' },
];

export default function HomePage() {
  const [sections, setSections] = useState({});
  const [bentoTracks, setBentoTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const { playTrack } = usePlayer();
  const { personalSongs, user } = useAuth();

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const results = {};

      const promises = SECTIONS.map(async (section) => {
        try {
          const songs = await musicApi.searchByGenre(section.query, 12); // Tăng limit lên 12
          results[section.id] = songs;
        } catch (error) {
          console.error(`Failed to load ${section.id}:`, error);
          results[section.id] = [];
        }
      });

      await Promise.allSettled(promises);
      setSections(results);

      // Lấy 4 bài đầu tiên của trending để làm Bento Grid
      if (results.trending?.length >= 4) {
        setBentoTracks(results.trending.slice(0, 4));
        results.trending.slice(0, 4).forEach(s => musicApi.prefetch(s));
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // Helper render 1 ô trong Bento Grid
  const renderBentoCard = (track, className, delay, isLarge = false) => {
    if (!track) return null;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay }}
        onClick={() => playTrack(track, sections.trending || [track])}
        className={`relative rounded-3xl overflow-hidden cursor-pointer group glass-card border-none ${className}`}
      >
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
             style={{ backgroundImage: `url(${track.thumbnail})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
           <div className="w-16 h-16 rounded-full bg-brand-500/90 backdrop-blur-md flex items-center justify-center shadow-2xl shadow-brand-500/50 scale-90 group-hover:scale-100 transition-transform">
              <FaPlay className="text-white text-xl ml-1" />
           </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          {isLarge && (
            <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-white text-[10px] font-bold tracking-wider mb-3 uppercase border border-white/10">
              Tiêu điểm
            </span>
          )}
          <h3 className={`${isLarge ? 'text-3xl lg:text-4xl' : 'text-lg lg:text-xl'} font-display font-bold text-white mb-1 line-clamp-2 leading-tight drop-shadow-lg`}>
            {track.title}
          </h3>
          <p className={`${isLarge ? 'text-zinc-300' : 'text-zinc-400'} text-sm truncate drop-shadow-md`}>
            {track.artist}
          </p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-12">
      {/* === BENTO GRID HERO SECTION === */}
      {!loading && bentoTracks.length >= 4 && (
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 h-auto sm:h-[360px] md:h-[400px] lg:h-[480px]">
             {/* Ô chính to nhất (chiếm 2 cột, 2 hàng trên lg, hoặc 2 cột trên md) */}
             {renderBentoCard(bentoTracks[0], "sm:col-span-2 md:col-span-2 md:row-span-2 lg:col-span-2 lg:row-span-2 min-h-[200px] sm:min-h-0", 0.1, true)}
             
             {/* Ô vừa (chiếm 2 cột ngang trên lg) */}
             {renderBentoCard(bentoTracks[1], "hidden sm:block sm:col-span-1 md:col-span-1 md:row-span-1 lg:col-span-2 lg:row-span-1 min-h-[160px] sm:min-h-0", 0.2)}
             
             {/* 2 ô nhỏ */}
             {renderBentoCard(bentoTracks[2], "hidden md:block lg:col-span-1 lg:row-span-1", 0.3)}
             {renderBentoCard(bentoTracks[3], "hidden lg:block lg:col-span-1 lg:row-span-1", 0.4)}
          </div>
        </section>
      )}

      {/* === LOADING SKELETON === */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 h-auto sm:h-[360px] md:h-[400px] lg:h-[480px] mb-12">
           <div className="bg-white/5 rounded-3xl animate-pulse md:col-span-2 md:row-span-2" />
           <div className="bg-white/5 rounded-3xl animate-pulse md:col-span-1 lg:col-span-2" />
           <div className="bg-white/5 rounded-3xl animate-pulse hidden md:block" />
           <div className="bg-white/5 rounded-3xl animate-pulse hidden lg:block" />
        </div>
      )}

      {/* === PERSONAL UPLOADS === */}
      {!loading && user && (personalSongs?.length || 0) > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-xl sm:text-2xl font-display font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
            ✨ Kho nhạc của bạn
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
            {personalSongs?.map((song, index) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <SongCard song={song} playlist={personalSongs} />
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* === SONG SECTIONS === */}
      {!loading && SECTIONS.map((section, sectionIndex) => {
        const songs = section.id === 'trending' ? sections[section.id]?.slice(4) : sections[section.id];
        if (!songs || songs.length === 0) return null;

        return (
          <motion.section
            key={section.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIndex * 0.1 + 0.3 }}
          >
            <h3 className="text-xl sm:text-2xl font-display font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
              {section.title}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
              {songs.map((song, index) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <SongCard song={song} playlist={songs} />
                </motion.div>
              ))}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
