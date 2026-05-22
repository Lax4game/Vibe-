/**
 * Auth Context - Quản lý trạng thái xác thực người dùng
 * 
 * GIẢI THÍCH CHO GIÁM KHẢO:
 * - React Context API là cơ chế chia sẻ dữ liệu giữa các component
 *   mà không cần truyền props qua nhiều tầng (prop drilling).
 * - AuthContext lưu trữ: thông tin user đang đăng nhập, danh sách yêu thích.
 * - onAuthStateChanged: Listener của Firebase, tự động gọi callback
 *   mỗi khi trạng thái đăng nhập thay đổi (login/logout/refresh).
 * - Favorites được lưu trên Firestore (cloud) → đồng bộ giữa các thiết bị.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage, googleProvider } from '../services/firebase';
import toast from 'react-hot-toast';

// Tạo Context
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState([]);
  const [personalSongs, setPersonalSongs] = useState([]); // { id, title, artist, thumbnail, audioUrl }
  const [lyricsOffsets, setLyricsOffsets] = useState({}); // { songId: offsetValue }
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false); // Quản lý trạng thái Modal

  // Lắng nghe thay đổi trạng thái xác thực
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setIsAuthModalOpen(false); // Tự động đóng modal khi đăng nhập thành công
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setFavorites(data.favoriteSongs || []);
            setPersonalSongs(data.personalSongs || []);
            setLyricsOffsets(data.lyricsOffsets || {});
          }
        } catch (error) {
          console.error('Error loading user data:', error);
        }
      } else {
        setFavorites([]);
        setPersonalSongs([]);
        setLyricsOffsets({});
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // 1. Đăng nhập Google
  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Đăng nhập Google thất bại');
    }
  };

  // 2. Đăng ký Email/Password + Avatar
  const registerWithEmail = async (email, password, displayName, avatarFile) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      let finalPhotoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || email)}&background=7c6bf2&color=fff`;

      if (avatarFile) {
        try {
          // --- CLOUDINARY UPLOAD CONFIG ---
          const CLOUD_NAME = "dqxlgs24e";
          const UPLOAD_PRESET = "COFFEE SHOP";

          const formData = new FormData();
          formData.append("file", avatarFile);
          formData.append("upload_preset", UPLOAD_PRESET);

          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: formData,
          });

          if (!res.ok) throw new Error("Upload Cloudinary thất bại");

          const data = await res.json();
          finalPhotoURL = data.secure_url;
        } catch (uploadError) {
          console.error("Lỗi upload avatar lên Cloudinary:", uploadError);
          toast.error("Không thể tải lên ảnh đại diện, đang dùng ảnh mặc định.");
        }
      }

      // Cập nhật profile (tên và avatar)
      await updateProfile(userCredential.user, {
        displayName: displayName || email.split('@')[0],
        photoURL: finalPhotoURL
      });
      // Force user state update with new profile info
      setUser({ ...userCredential.user });
      toast.success('Đăng ký thành công!');
    } catch (error) {
      console.error('Register failed:', error);
      throw error;
    }
  };

  // 3. Đăng nhập Email/Password
  const loginWithEmail = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Đăng nhập thành công!');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Đã đăng xuất');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const saveLyricsOffset = async (songId, offset) => {
    if (!auth.currentUser) {
      toast.error('Vui lòng đăng nhập để lưu cài đặt');
      return;
    }

    const newOffsets = { ...lyricsOffsets, [songId]: offset };
    setLyricsOffsets(newOffsets);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { lyricsOffsets: newOffsets }, { merge: true });
    } catch (error) {
      console.error('Error saving offset:', error);
    }
  };

  const savePersonalSong = async (songData) => {
    if (!auth.currentUser) return;

    const newPersonalSongs = [...personalSongs, songData];
    setPersonalSongs(newPersonalSongs);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { personalSongs: newPersonalSongs }, { merge: true });
      toast.success('Đã lưu bài hát vào thư viện cá nhân!');
    } catch (error) {
      console.error('Error saving personal song:', error);
      toast.error('Không thể lưu bài hát!');
    }
  };

  // 5. Xóa bài hát cá nhân
  const deletePersonalSong = async (songId) => {
    if (!auth.currentUser) return;

    const newPersonalSongs = personalSongs.filter(s => s.id !== songId);
    setPersonalSongs(newPersonalSongs);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { personalSongs: newPersonalSongs }, { merge: true });
      toast.success('Đã xóa bài hát khỏi thư viện!');
    } catch (error) {
      console.error('Error deleting personal song:', error);
      toast.error('Xóa thất bại!');
      setPersonalSongs(personalSongs); // Revert
    }
  };

  // 6. Cập nhật thông tin bài hát cá nhân
  const updatePersonalSong = async (songId, updatedData) => {
    if (!auth.currentUser) return;

    const newPersonalSongs = personalSongs.map(s => 
      s.id === songId ? { ...s, ...updatedData } : s
    );
    setPersonalSongs(newPersonalSongs);

    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, { personalSongs: newPersonalSongs }, { merge: true });
      toast.success('Đã cập nhật thông tin bài hát!');
    } catch (error) {
      console.error('Error updating personal song:', error);
      toast.error('Cập nhật thất bại!');
      setPersonalSongs(personalSongs); // Revert
    }
  };

  const toggleFavorite = async (track) => {
    if (!user) {
      openAuthModal();
      return false;
    }

    // Làm sạch dữ liệu để đảm bảo đồng bộ 100% giữa Local và Firestore
    const sanitizedTrack = {
      id: String(track.id),
      title: track.title || "Unknown Title",
      artist: track.artist || "Unknown Artist",
      thumbnail: track.thumbnail || "",
      searchKey: track.searchKey || `${track.title} ${track.artist}`
    };

    const isLiked = favorites.some(s => s.id === sanitizedTrack.id);
    const userRef = doc(db, 'users', user.uid);

    if (isLiked) {
      setFavorites(prev => prev.filter(s => s.id !== sanitizedTrack.id));
    } else {
      setFavorites(prev => [...prev, sanitizedTrack]);
    }

    const newFavorites = isLiked
      ? favorites.filter(s => s.id !== sanitizedTrack.id)
      : [...favorites, sanitizedTrack];

    try {
      await setDoc(userRef, { favoriteSongs: newFavorites }, { merge: true });
      return true;
    } catch (error) {
      console.error('Firestore Error:', error);
      // Revert local state nếu Firestore thất bại
      setFavorites(favorites);
      toast.error(`Lỗi: ${error.code || 'Không thể cập nhật danh sách'}`);
      return false;
    }
  };

  const isFavorite = (trackId) => favorites.some(s => String(s.id) === String(trackId));

  // 4. Cập nhật Avatar (Cloudinary)
  const updateUserAvatar = async (file) => {
    if (!user) return;
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

      if (!res.ok) throw new Error("Upload Cloudinary thất bại");

      const data = await res.json();
      const newPhotoURL = data.secure_url;

      await updateProfile(auth.currentUser, { photoURL: newPhotoURL });
      setUser({ ...auth.currentUser });
      toast.success('Cập nhật ảnh đại diện thành công!');
      return newPhotoURL;
    } catch (error) {
      console.error('Update avatar failed:', error);
      toast.error('Cập nhật ảnh đại diện thất bại');
      throw error;
    }
  };

  // 5. Cập nhật Mật khẩu
  const updateUserPassword = async (currentPassword, newPassword) => {
    if (!user || !user.email) return;
    try {
      // Re-authenticate user first (security requirement)
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);
      toast.success('Đổi mật khẩu thành công!');
    } catch (error) {
      console.error('Update password failed:', error);
      if (error.code === 'auth/wrong-password') {
        toast.error('Mật khẩu hiện tại không đúng');
      } else {
        toast.error('Đổi mật khẩu thất bại, vui lòng thử lại');
      }
      throw error;
    }
  };

  const value = {
    user,
    loading,
    favorites,
    personalSongs,
    lyricsOffsets,
    isAuthModalOpen,
    openAuthModal,
    closeAuthModal,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    logout,
    toggleFavorite,
    isFavorite,
    updateUserAvatar,
    updateUserPassword,
    saveLyricsOffset,
    savePersonalSong,
    deletePersonalSong,
    updatePersonalSong
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom Hook - Cách tiện lợi để truy cập AuthContext
 * Thay vì viết: const ctx = useContext(AuthContext)
 * Chỉ cần: const { user, loginWithGoogle } = useAuth()
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
