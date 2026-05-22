import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiImage, FiUpload, FiCheck, FiUser, FiLock, FiCamera } from 'react-icons/fi';
import { useTheme, PREDEFINED_BACKGROUNDS } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function SettingsModal() {
  const { isSettingsOpen, setIsSettingsOpen, backgroundUrl, setBackgroundUrl } = useTheme();
  const { user, updateUserAvatar, updateUserPassword } = useAuth();
  
  const [activeTab, setActiveTab] = useState('appearance'); // 'appearance' | 'account'
  
  const [customUrl, setCustomUrl] = useState('');
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  
  // Password state
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  const bgInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  if (!isSettingsOpen) return null;

  const handleClose = () => setIsSettingsOpen(false);

  // Appearance Actions
  const handleSelectPredefined = (url) => {
    setBackgroundUrl(url);
    toast.success('Đã áp dụng ảnh nền mới!');
  };

  const handleApplyCustomUrl = () => {
    if (!customUrl.trim()) return;
    setBackgroundUrl(customUrl);
    toast.success('Đã áp dụng ảnh nền tuỳ chỉnh!');
    setCustomUrl('');
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Ảnh quá 5MB');
    
    setIsUploadingBg(true);
    try {
      const CLOUD_NAME = "dqxlgs24e"; 
      const UPLOAD_PRESET = "COFFEE SHOP"; 
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setBackgroundUrl(data.secure_url);
      toast.success('Đã thay đổi ảnh nền!');
    } catch (error) {
      toast.error("Lỗi upload ảnh nền");
    } finally {
      setIsUploadingBg(false);
    }
  };

  // Account Actions
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUpdatingAvatar(true);
    try {
      await updateUserAvatar(file);
    } catch (err) {
      // toast already handled in context
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (pwdNew !== pwdConfirm) return toast.error('Mật khẩu xác nhận không khớp');
    if (pwdNew.length < 6) return toast.error('Mật khẩu mới phải ít nhất 6 ký tự');

    setIsUpdatingPwd(true);
    try {
      await updateUserPassword(pwdCurrent, pwdNew);
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
    } catch (err) {
      // error handled in context
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl glass-card shadow-2xl bg-surface-900/90 max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-surface-900/80 backdrop-blur-xl z-10">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-display font-bold text-white">Cài đặt</h2>
              <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
                <button
                  onClick={() => setActiveTab('appearance')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'appearance' ? 'bg-brand-500 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Giao diện
                </button>
                <button
                  onClick={() => setActiveTab('account')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'account' ? 'bg-brand-500 text-white shadow-lg' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Tài khoản
                </button>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <FiX className="text-xl" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar">
            {activeTab === 'appearance' ? (
              <div className="space-y-8">
                {/* Predefined Backgrounds */}
                <div>
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FiImage className="text-brand-400" /> Nền có sẵn
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {PREDEFINED_BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => handleSelectPredefined(bg.url)}
                        className="group relative rounded-2xl overflow-hidden aspect-video border-2 transition-all duration-300 bg-surface-950"
                        style={{
                          borderColor: backgroundUrl === bg.url ? 'var(--color-brand-500)' : 'transparent'
                        }}
                      >
                        {bg.url ? (
                          <img 
                            src={bg.url} 
                            alt="" // Để trống alt ở đây vì đã có label overlay bên dưới, tránh hiện chữ 2 lần khi lỗi
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML += '<div class="absolute inset-0 flex items-center justify-center text-[10px] text-zinc-600">Link ảnh bị lỗi</div>';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-surface-950 flex items-center justify-center text-xs text-zinc-500">Màu đen tĩnh</div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-left">
                          <span className="text-xs font-medium text-white">{bg.name}</span>
                        </div>
                        {backgroundUrl === bg.url && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                            <FiCheck className="text-white text-xs" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-full h-px bg-white/10"></div>

                {/* Custom Background */}
                <div>
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FiUpload className="text-brand-400" /> Nền tuỳ chỉnh
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="shrink-0">
                      <input type="file" ref={bgInputRef} onChange={handleBgUpload} accept="image/*" className="hidden" />
                      <button
                        onClick={() => bgInputRef.current?.click()}
                        disabled={isUploadingBg}
                        className="flex flex-col items-center justify-center w-32 h-32 rounded-2xl border-2 border-dashed border-white/20 hover:border-brand-500 hover:bg-white/5 transition-all group disabled:opacity-50"
                      >
                        {isUploadingBg ? <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /> : (
                          <>
                            <FiUpload className="text-2xl text-zinc-400 group-hover:text-brand-400 mb-2" />
                            <span className="text-xs font-medium text-zinc-400 group-hover:text-white">Tải ảnh lên</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="flex-1 space-y-3">
                      <p className="text-xs text-zinc-400">Hoặc dán đường dẫn (URL) ảnh vào đây:</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 focus:border-brand-500 focus:outline-none transition-all text-sm"
                        />
                        <button onClick={handleApplyCustomUrl} className="px-6 py-3 rounded-xl bg-brand-500 text-white font-semibold text-sm hover:bg-brand-400 transition-colors">Áp dụng</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Avatar Section */}
                <div>
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                    <FiUser className="text-brand-400" /> Ảnh đại diện
                  </h3>
                  
                  {user ? (
                    <div className="flex items-center gap-8">
                      <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                        <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-white/10 group-hover:ring-brand-500/50 transition-all">
                          <img 
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=7c6bf2&color=fff`} 
                            alt={user.displayName} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'U')}&background=7c6bf2&color=fff`;
                            }}
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <FiCamera className="text-2xl text-white" />
                        </div>
                        {isUpdatingAvatar && (
                          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        <input type="file" ref={avatarInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-white mb-1">{user.displayName || 'Thành viên'}</h4>
                        <p className="text-zinc-400 text-sm mb-4">{user.email}</p>
                        <button 
                          onClick={() => avatarInputRef.current?.click()}
                          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs font-semibold hover:bg-white/10 transition-all"
                        >
                          Thay đổi ảnh
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-zinc-400">Vui lòng đăng nhập để quản lý tài khoản</p>
                    </div>
                  )}
                </div>

                <div className="w-full h-px bg-white/10"></div>

                {/* Password Section */}
                <div>
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                    <FiLock className="text-brand-400" /> Bảo mật & Mật khẩu
                  </h3>

                  {user?.providerData?.[0]?.providerId === 'password' ? (
                    <form onSubmit={handlePasswordSubmit} className="max-w-md space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2 ml-1">Mật khẩu hiện tại</label>
                        <input
                          type="password"
                          required
                          value={pwdCurrent}
                          onChange={(e) => setPwdCurrent(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-brand-500 focus:outline-none transition-all text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 ml-1">Mật khẩu mới</label>
                          <input
                            type="password"
                            required
                            value={pwdNew}
                            onChange={(e) => setPwdNew(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-brand-500 focus:outline-none transition-all text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-zinc-400 mb-2 ml-1">Xác nhận mật khẩu</label>
                          <input
                            type="password"
                            required
                            value={pwdConfirm}
                            onChange={(e) => setPwdConfirm(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white focus:border-brand-500 focus:outline-none transition-all text-sm"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isUpdatingPwd}
                        className="w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-sm shadow-lg shadow-brand-500/20 hover:bg-brand-400 transition-all disabled:opacity-50 mt-2"
                      >
                        {isUpdatingPwd ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                      </button>
                    </form>
                  ) : (
                    <div className="p-6 bg-brand-500/10 rounded-2xl border border-brand-500/20">
                      <p className="text-sm text-brand-300">
                        Bạn đang đăng nhập bằng Google. Mật khẩu được quản lý bởi tài khoản Google của bạn.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
