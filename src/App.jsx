/**
 * App.jsx - Component gốc (Root Component)
 * 
 * GIẢI THÍCH CHO GIÁM KHẢO:
 * - Đây là file lắp ráp toàn bộ ứng dụng:
 *   1. BrowserRouter: Bật routing (điều hướng SPA - Single Page Application).
 *   2. AuthProvider: Cung cấp trạng thái auth cho toàn bộ cây component.
 *   3. PlayerProvider: Cung cấp trạng thái player cho toàn bộ cây component.
 * - Layout: Sidebar (trái) + Main Content (giữa) + PlayerBar (dưới cùng).
 * - Routes: Định nghĩa đường dẫn URL ↔ Component trang.
 * - Kiến trúc "Provider Pattern": Bọc nhiều Context lồng nhau,
 *   component con ở bất kỳ độ sâu nào cũng truy cập được dữ liệu.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { ChatProvider } from './contexts/ChatContext';
import Sidebar from './components/Sidebar';
import PlayerBar from './components/PlayerBar';
import MobileNav from './components/MobileNav';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import LyricsPanel from './components/LyricsPanel';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import LibraryPage from './pages/LibraryPage';
import AiAssistantPage from './pages/AiAssistantPage';
import ChatBot from './components/ChatBot';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <ChatProvider>
          {/* Cấu hình Toaster cho thông báo */}
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: '#27272a', // zinc-800
                color: '#fff',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
              }
            }}
          />
          
          {/* Layout chính */}
          <div className="flex h-[100dvh] bg-transparent p-1 sm:p-2 lg:p-4 gap-2 sm:gap-3 lg:gap-4 overflow-hidden">
            
            {/* Sidebar (Trái) - Chiều cao đầy đủ */}
            <div className="hidden lg:block w-64 flex-shrink-0 h-full">
               <Sidebar />
            </div>

            {/* Vùng bên phải (Main + Player) */}
            <div className="flex-1 flex flex-col gap-3 lg:gap-4 min-w-0 overflow-hidden">
              {/* Main Content Area (Trên) */}
              <main className="flex-1 overflow-y-auto rounded-2xl sm:rounded-3xl glass-card border-none shadow-2xl relative scroll-smooth bg-surface-900/20">
                <div className="absolute inset-0 bg-gradient-to-b from-brand-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 p-3 sm:p-4 lg:p-8 pb-32 lg:pb-8">
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/library" element={<LibraryPage />} />
                    <Route path="/ai" element={<AiAssistantPage />} />

                  </Routes>
                </div>
              </main>

              {/* Player Bar (Dưới) - Đối diện với phần tài khoản của Sidebar */}
              <PlayerBar />
            </div>
          </div>

          {/* Mobile Bottom Navigation (chỉ hiện trên Mobile < 1024px) */}
          <MobileNav />

          {/* Auth Modal (Hiển thị khi cần đăng nhập/đăng ký) */}
          <AuthModal />
          
          {/* Settings Modal (Đổi ảnh nền) */}
          <SettingsModal />

          <LyricsPanel />
          <ChatBot />

          </ChatProvider>
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
