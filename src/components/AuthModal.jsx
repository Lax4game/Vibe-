import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiMail, FiLock, FiUser, FiImage, FiUpload } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isAuthModalOpen) return null;

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Ảnh quá lớn, vui lòng chọn ảnh dưới 5MB');
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Vui lòng nhập email và mật khẩu');
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        if (!name) {
          toast.error('Vui lòng nhập tên hiển thị');
          setIsLoading(false);
          return;
        }
        await registerWithEmail(email, password, name, avatarFile);
      }
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Email này đã được sử dụng');
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        toast.error('Tài khoản chưa tồn tại. Đang chuyển sang đăng ký...');
        setIsLogin(false); // Chuyển sang form đăng ký
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Sai email hoặc mật khẩu');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Mật khẩu quá yếu (cần ít nhất 6 ký tự)');
      } else {
        toast.error('Có lỗi xảy ra, vui lòng thử lại sau');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    await loginWithGoogle();
    setIsLoading(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeAuthModal}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl glass-card p-6 shadow-2xl bg-surface-900/90 max-h-[90vh] overflow-y-auto custom-scrollbar"
        >
          {/* Close Button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <FiX className="text-xl" />
          </button>

          {/* Header */}
          <div className="text-center mb-6 mt-2">
            <h2 className="text-2xl font-display font-bold text-white mb-2">
              {isLogin ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}
            </h2>
            <p className="text-sm text-zinc-400">
              {isLogin 
                ? 'Đăng nhập để lưu nhạc và đồng bộ yêu thích' 
                : 'Tham gia ZenMuzik để trải nghiệm âm nhạc tốt nhất'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                {/* Avatar Upload */}
                <div className="flex flex-col items-center gap-3 mb-2">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-20 h-20 rounded-full overflow-hidden bg-white/5 border border-white/10 cursor-pointer group flex items-center justify-center transition-all hover:bg-white/10 hover:border-brand-500"
                  >
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <FiUser className="text-3xl text-zinc-500 group-hover:text-brand-400 transition-colors" />
                    )}
                    
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <FiUpload className="text-white text-xl" />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden" 
                  />
                  <span className="text-xs text-zinc-400">Tải ảnh đại diện (không bắt buộc)</span>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                    <FiUser />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tên hiển thị"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 focus:bg-white/[0.06] focus:border-brand-500 focus:outline-none transition-all"
                  />
                </div>
              </>
            )}

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                <FiMail />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 focus:bg-white/[0.06] focus:border-brand-500 focus:outline-none transition-all"
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                <FiLock />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-zinc-500 focus:bg-white/[0.06] focus:border-brand-500 focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 mt-2 rounded-xl bg-brand-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 hover:bg-brand-400 transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                isLogin ? 'Đăng nhập' : 'Đăng ký'
              )}
            </button>
          </form>

          <div className="relative flex items-center my-6">
            <div className="flex-grow border-t border-white/[0.08]"></div>
            <span className="flex-shrink-0 mx-4 text-xs text-zinc-500 uppercase tracking-widest">hoặc</span>
            <div className="flex-grow border-t border-white/[0.08]"></div>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-semibold flex items-center justify-center gap-3 hover:bg-white/[0.08] transition-colors"
          >
            <FcGoogle className="text-2xl" />
            Tiếp tục với Google
          </button>

          {/* Toggle Login/Register */}
          <p className="mt-6 text-center text-sm text-zinc-400">
            {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-brand-400 hover:text-brand-300 font-medium hover:underline focus:outline-none"
            >
              {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
