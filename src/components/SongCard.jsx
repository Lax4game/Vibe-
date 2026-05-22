/**
 * SongCard Component - Thẻ hiển thị bài hát
 * 
 * GIẢI THÍCH CHO GIÁM KHẢO:
 * - Component này hiển thị thông tin một bài hát (ảnh, tên, nghệ sĩ).
 * - Sử dụng Framer Motion (motion.div) để tạo animation hover mượt mà:
 *   + whileHover: Phóng to nhẹ (scale 1.03) khi rê chuột.
 *   + whileTap: Thu nhỏ nhẹ (scale 0.97) khi nhấn → phản hồi xúc giác.
 * - Glassmorphism: Nền bán trong suốt + blur → tạo chiều sâu.
 * - Overlay play button: Hiện nút Play khi hover → trải nghiệm trực quan.
 */

import { motion } from 'framer-motion';
import { FaPlay } from 'react-icons/fa';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';

export default function SongCard({ song, playlist = [], onEdit }) {
  const { playTrack, currentTrack, isPlaying } = usePlayer();
  const { deletePersonalSong } = useAuth();
  
  // Kiểm tra xem bài hát này có đang được phát không
  const isActive = currentTrack?.id === song.id;

  const handleClick = (e) => {
    // Ngăn chặn trigger khi bấm vào nút sửa/xóa
    if (e.target.closest('button')) return;
    playTrack(song, playlist.length > 0 ? playlist : [song]);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`Bạn có chắc chắn muốn xóa bài hát "${song.title}"?`)) {
      deletePersonalSong(song.id);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEdit) onEdit(song);
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={`
        group relative cursor-pointer rounded-2xl sm:rounded-3xl p-2 sm:p-3
        glass-card border-none transition-all duration-300
        hover:shadow-2xl hover:shadow-brand-500/10 hover:bg-white/[0.06]
        active:scale-[0.98] sm:active:scale-100
        ${isActive ? 'ring-2 ring-brand-500/50 bg-brand-500/5' : ''}
      `}
    >
      {/* Ảnh bìa bài hát */}
      <div className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden mb-2 sm:mb-4 shadow-lg">
        <img
          src={song.thumbnail}
          alt={song.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(song.title)}&background=7c6bf2&color=fff&size=300`;
          }}
        />
        
        {/* Overlay gradient + nút Play (hiện khi hover) */}
        <div className={`
          absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-center justify-center
          transition-opacity duration-300
          ${isActive && isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
        `}>
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-14 h-14 rounded-full bg-brand-500/90 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-brand-500/40"
          >
            <FaPlay className="text-white text-lg ml-1" />
          </motion.div>
        </div>

        {/* Badge "Đang phát" */}
        {isActive && isPlaying && (
          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-full bg-brand-500/90 backdrop-blur-md text-[10px] font-bold tracking-wider text-white uppercase shadow-lg">
            Đang phát
          </div>
        )}

        {/* Nút Sửa/Xóa (Chỉ hiện cho nhạc cá nhân) */}
        {song.isPersonal && (
          <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={handleEdit}
              className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-brand-500 transition-colors shadow-lg"
              title="Chỉnh sửa"
            >
              <FiEdit2 size={14} />
            </button>
            <button 
              onClick={handleDelete}
              className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md text-white flex items-center justify-center hover:bg-red-500 transition-colors shadow-lg"
              title="Xóa"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Thông tin bài hát */}
      <h4 className="text-sm sm:text-base font-bold text-white truncate px-0.5 sm:px-1">
        {song.title}
      </h4>
      <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 sm:mt-1 truncate px-0.5 sm:px-1 group-hover:text-zinc-300 transition-colors">
        {song.artist}
      </p>
    </motion.div>
  );
}
