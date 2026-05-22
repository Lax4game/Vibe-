/**
 * Library Page - Thư viện bài hát yêu thích & Nhạc ngoại tuyến
 * 
 * GIẢI THÍCH CHO GIÁM KHẢO:
 * - Trang này giờ có 2 tab: "Yêu thích" (Cloud) và "Tải xuống" (Local).
 * - "Yêu thích": Lấy từ Firestore, cần đăng nhập.
 * - "Tải xuống": Lấy từ IndexedDB (offlineDB), không cần đăng nhập.
 * - Sử dụng Framer Motion layoutId để tạo hiệu ứng chuyển tab mượt mà.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { offlineDB } from '../services/db';
import SongCard from '../components/SongCard';
import UploadModal from '../components/UploadModal';
import { FiHeart, FiLogIn, FiDownload, FiUploadCloud, FiMusic, FiPlus } from 'react-icons/fi';

export default function LibraryPage() {
  const { user, favorites, personalSongs, openAuthModal } = useAuth();
  const [activeTab, setActiveTab] = useState('favorites'); // 'favorites' | 'downloads' | 'personal'
  const [downloads, setDownloads] = useState([]);
  const [isLoadingDownloads, setIsLoadingDownloads] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null); // Track đang được chỉnh sửa

  // Tải danh sách offline khi chuyển sang tab downloads
  useEffect(() => {
    if (activeTab === 'downloads') {
      setIsLoadingDownloads(true);
      offlineDB.getAllTracksMeta()
        .then(setDownloads)
        .catch(console.error)
        .finally(() => setIsLoadingDownloads(false));
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:gap-4"
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
            Thư viện của bạn
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            {activeTab === 'favorites' && `${favorites?.length || 0} bài hát yêu thích`}
            {activeTab === 'downloads' && `${downloads?.length || 0} bài hát đã tải`}
            {activeTab === 'personal' && `${personalSongs?.length || 0} bài hát đã tải lên`}
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Nút Tải lên (Chỉ hiện ở tab Cá nhân hoặc luôn hiện nếu muốn) */}
          {user && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setEditingTrack(null);
                setIsUploadOpen(true);
              }}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-brand-500/20 transition-all"
            >
              <FiPlus />
              Tải nhạc lên
            </motion.button>
          )}

        {/* Tab Switcher (Premium UI) */}
        <div className="flex items-center gap-1 p-1 bg-surface-900/50 backdrop-blur-md rounded-xl border border-white/[0.08] w-fit overflow-x-auto no-scrollbar">
          {['favorites', 'personal', 'downloads'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="relative px-3 sm:px-5 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
            >
              <span className={`relative z-10 flex items-center gap-2 ${activeTab === tab ? 'text-white' : 'text-zinc-400 hover:text-zinc-300'}`}>
                {tab === 'favorites' && <FiHeart />}
                {tab === 'personal' && <FiUploadCloud />}
                {tab === 'downloads' && <FiDownload />}
                
                {tab === 'favorites' && 'Yêu thích'}
                {tab === 'personal' && 'Cá nhân'}
                {tab === 'downloads' && 'Đã tải'}
              </span>
              {activeTab === tab && (
                <motion.div
                  layoutId="library-tab-indicator"
                  className="absolute inset-0 bg-white/[0.12] rounded-lg"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </motion.div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'favorites' && (
            <FavoritesTab 
              user={user} 
              favorites={favorites} 
              openAuthModal={openAuthModal} 
            />
          )}

          {activeTab === 'personal' && (
            <PersonalTab 
              user={user} 
              personalSongs={personalSongs} 
              openAuthModal={openAuthModal}
              onUploadClick={() => {
                setEditingTrack(null);
                setIsUploadOpen(true);
              }}
              onEditClick={(track) => {
                setEditingTrack(track);
                setIsUploadOpen(true);
              }}
            />
          )}

          {activeTab === 'downloads' && (
            <DownloadsTab 
              downloads={downloads} 
              isLoading={isLoadingDownloads} 
            />
          )}
        </motion.div>
      </AnimatePresence>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => {
          setIsUploadOpen(false);
          setEditingTrack(null);
        }} 
        editData={editingTrack}
      />
    </div>
  );
}

// --- Sub-components ---

function FavoritesTab({ user, favorites, openAuthModal }) {
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center mb-6">
          <FiLogIn className="text-3xl text-brand-400" />
        </div>
        <h2 className="text-xl font-display font-bold text-white mb-2">Đăng nhập để xem thư viện</h2>
        <p className="text-zinc-400 text-sm mb-6 max-w-sm">
          Đăng nhập để lưu bài hát yêu thích và đồng bộ giữa các thiết bị.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={openAuthModal}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm shadow-lg shadow-brand-500/30"
        >
          <FiLogIn />
          Đăng nhập ngay
        </motion.button>
      </div>
    );
  }

  if (favorites?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center mb-6">
          <FiHeart className="text-3xl text-brand-400" />
        </div>
        <h2 className="text-xl font-display font-bold text-white mb-2">Thư viện đang trống</h2>
        <p className="text-zinc-400 text-sm max-w-sm">Nhấn ❤️ trên bài hát để thêm vào thư viện yêu thích của bạn.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {favorites?.map((song, index) => (
        <motion.div key={song.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
          <SongCard song={song} playlist={favorites} />
        </motion.div>
      ))}
    </div>
  );
}

function DownloadsTab({ downloads, isLoading }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="aspect-square bg-white/[0.04] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (downloads?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center mb-6">
          <FiDownload className="text-3xl text-brand-400" />
        </div>
        <h2 className="text-xl font-display font-bold text-white mb-2">Chưa tải bài hát nào</h2>
        <p className="text-zinc-400 text-sm max-w-sm">Nhấn nút tải xuống trên thanh phát nhạc để lưu bài hát và nghe khi không có mạng.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {downloads?.map((song, index) => (
        <motion.div key={song.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
          <SongCard song={song} playlist={downloads} />
        </motion.div>
      ))}
    </div>
  );
}

function PersonalTab({ user, personalSongs, openAuthModal, onUploadClick, onEditClick }) {
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center mb-6">
          <FiUploadCloud className="text-3xl text-brand-400" />
        </div>
        <h2 className="text-xl font-display font-bold text-white mb-2">Đăng nhập để xem thư viện cá nhân</h2>
        <p className="text-zinc-400 text-sm mb-6 max-w-sm">Tải lên và lưu trữ kho nhạc riêng của bạn trên đám mây.</p>
        <button onClick={openAuthModal} className="px-6 py-3 rounded-xl bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-500/30">
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  if (personalSongs?.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-brand-500/10 flex items-center justify-center mb-6">
          <FiMusic className="text-3xl text-brand-400" />
        </div>
        <h2 className="text-xl font-display font-bold text-white mb-2">Chưa có nhạc tải lên</h2>
        <p className="text-zinc-400 text-sm mb-6 max-w-sm">Hãy là người đầu tiên làm phong phú thư viện cá nhân của mình!</p>
        <button onClick={onUploadClick} className="px-6 py-3 rounded-xl bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-500/30">
          Tải lên ngay
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {personalSongs?.map((song, index) => (
        <motion.div key={song.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
          <SongCard song={song} playlist={personalSongs} onEdit={onEditClick} />
        </motion.div>
      ))}
    </div>
  );
}
