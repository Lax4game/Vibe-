import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const PREDEFINED_BACKGROUNDS = [
  { id: 'default', name: 'Mặc định (Đen tĩnh)', url: '' },
  { id: 'lofi', name: 'Lo-Fi Chill (GIF)', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHpueG54OHZueHhubnhueG54OHZueHhubnhueG54OHZueHhubngmZXA9djFfaW50ZXJuYWxfZ2lmX2J5X2lkJmN0PWc/L1VRSK0pSRyXG/giphy.gif' },
  { id: 'space', name: 'Vũ trụ (Trôi chậm)', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHpueG54OHZueHhubnhueG54OHZueHhubnhueG54OHZueHhubngmZXA9djFfaW50ZXJuYWxfZ2lmX2J5X2lkJmN0PWc/3o7TKVUn7iM8FMEU24/giphy.gif' },
  { id: 'abstract', name: 'Trừu tượng', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop' }
];

export function ThemeProvider({ children }) {
  const [backgroundUrl, setBackgroundUrl] = useState(() => {
    return localStorage.getItem('zenmuzik_bg') || '';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('zenmuzik_bg', backgroundUrl);
  }, [backgroundUrl]);

  return (
    <ThemeContext.Provider value={{ 
      backgroundUrl, 
      setBackgroundUrl,
      isSettingsOpen,
      setIsSettingsOpen
    }}>
      {/* Lớp nền dưới cùng */}
      {backgroundUrl && (
        <div 
          className="fixed inset-0 z-0 w-full h-full bg-cover bg-center bg-no-repeat transition-all duration-1000 pointer-events-none"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        />
      )}
      
      {/* Lớp Overlay làm mờ/tối bớt ảnh nền để chữ vẫn dễ đọc (Wow effect) */}
      {backgroundUrl && (
        <div className="fixed inset-0 z-10 bg-surface-950/60 backdrop-blur-[2px] transition-all duration-1000 pointer-events-none" />
      )}

      {/* Ứng dụng chính nổi lên trên */}
      <div className="relative z-20 w-full h-full">
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
