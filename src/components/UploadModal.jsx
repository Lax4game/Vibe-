import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiUploadCloud, FiMusic, FiImage, FiCheck, FiLoader, FiSave } from 'react-icons/fi';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function UploadModal({ isOpen, onClose, editData = null }) {
  const { savePersonalSong, updatePersonalSong } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    thumbnail: '',
  });
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Reset/Fill form khi mở modal
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setFormData({
          title: editData.title || '',
          artist: editData.artist || '',
          thumbnail: editData.thumbnail || '',
        });
      } else {
        setFormData({ title: '', artist: '', thumbnail: '' });
        setAudioFile(null);
        setImageFile(null);
      }
    }
  }, [isOpen, editData]);

  const CLOUD_NAME = "dqxlgs24e";
  const UPLOAD_PRESET = "COFFEE SHOP";

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!editData && !audioFile) return toast.error('Vui lòng chọn file nhạc!');
    if (!formData.title) return toast.error('Vui lòng nhập tên bài hát!');

    setLoading(true);
    setUploadProgress(10);

    try {
      let audioUrl = editData?.url || '';
      
      // 1. Upload Audio (Chỉ khi chọn file mới)
      if (audioFile) {
        const audioData = new FormData();
        audioData.append('file', audioFile);
        audioData.append('upload_preset', UPLOAD_PRESET);
        audioData.append('resource_type', 'video');

        setUploadProgress(20);
        const audioRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
          method: 'POST',
          body: audioData
        });
        if (!audioRes.ok) throw new Error('Lỗi tải nhạc lên Cloudinary');
        const audioJson = await audioRes.json();
        audioUrl = audioJson.secure_url;
      }
      
      setUploadProgress(60);

      // 2. Upload Image
      let thumbnailUrl = formData.thumbnail || editData?.thumbnail || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&h=300&fit=crop';
      
      if (imageFile) {
        const imageData = new FormData();
        imageData.append('file', imageFile);
        imageData.append('upload_preset', UPLOAD_PRESET);
        
        const imageRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: imageData
        });
        if (imageRes.ok) {
          const imageJson = await imageRes.json();
          thumbnailUrl = imageJson.secure_url;
        }
      }

      setUploadProgress(90);

      // 3. Save/Update to Firestore
      const songData = {
        title: formData.title,
        artist: formData.artist || 'Unknown Artist',
        thumbnail: thumbnailUrl,
        url: audioUrl,
        isPersonal: true,
        searchKey: `${formData.title} ${formData.artist}`.toLowerCase()
      };

      if (editData) {
        await updatePersonalSong(editData.id, songData);
      } else {
        await savePersonalSong({
          ...songData,
          id: `personal_${Date.now()}`
        });
      }
      setUploadProgress(100);
      onClose();
      // Reset form
      setFormData({ title: '', artist: '', thumbnail: '' });
      setAudioFile(null);
      setImageFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error.message || 'Tải lên thất bại!');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
          >
            {/* Progress Bar */}
            {loading && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-white/5 overflow-hidden z-20">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  className="h-full bg-brand-500"
                />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-display font-bold text-white flex items-center gap-2">
                  <FiUploadCloud className="text-brand-400" />
                  {editData ? 'Chỉnh sửa bài hát' : 'Tải lên nhạc của bạn'}
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-400">
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleUpload} className="space-y-4">
                {/* Audio Upload Area */}
                <div className="relative">
                  <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                    audioFile ? 'border-brand-500/50 bg-brand-500/5' : 'border-white/10 hover:border-white/20 bg-white/5'
                  }`}>
                    <input 
                      type="file" 
                      accept="audio/*" 
                      className="hidden" 
                      onChange={(e) => setAudioFile(e.target.files[0])}
                    />
                    {audioFile ? (
                      <div className="flex flex-col items-center text-brand-400">
                        <FiCheck className="text-2xl mb-1" />
                        <span className="text-xs font-medium truncate max-w-[200px]">{audioFile.name}</span>
                      </div>
                    ) : editData ? (
                      <div className="flex flex-col items-center text-brand-400">
                        <FiMusic className="text-2xl mb-1" />
                        <span className="text-xs font-medium">Đã có file (Click để thay đổi)</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-zinc-400">
                        <FiMusic className="text-2xl mb-2" />
                        <span className="text-xs font-medium">Chọn file MP3, M4A...</span>
                      </div>
                    )}
                  </label>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1.5 block">Tên bài hát</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ví dụ: Nơi Này Có Anh"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1.5 block">Nghệ sĩ</label>
                    <input
                      type="text"
                      value={formData.artist}
                      onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                      placeholder="Sơn Tùng M-TP"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500/50 transition-all"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                     <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1.5 block">Ảnh bìa</label>
                        <label className="flex items-center justify-center w-full h-[46px] bg-white/5 border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-all">
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files[0])} />
                           <FiImage className={imageFile ? "text-brand-400" : "text-zinc-500"} />
                           <span className="ml-2 text-xs text-zinc-400">{imageFile ? "Đã chọn" : "Tải ảnh"}</span>
                        </label>
                     </div>
                     <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-1.5 block">Link ảnh (tùy chọn)</label>
                        <input
                          type="text"
                          value={formData.thumbnail}
                          onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                          placeholder="https://..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-[13px] text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500/50 transition-all"
                        />
                     </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-brand-500 hover:bg-brand-400 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin" />
                      {editData ? 'Đang cập nhật...' : 'Đang tải lên...'} {uploadProgress}%
                    </>
                  ) : (
                    <>
                      {editData ? <FiSave /> : <FiCheck />}
                      {editData ? 'Cập nhật thông tin' : 'Hoàn tất tải lên'}
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
